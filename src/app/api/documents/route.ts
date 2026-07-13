import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processDocument } from '@/lib/ai'
import { ok, err } from '@/lib/constants'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

// ─── GET /api/documents — list with filters ──────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))
    const status = searchParams.get('status') || undefined
    const documentType = searchParams.get('documentType') || undefined
    const search = searchParams.get('search') || undefined
    const fraudRisk = searchParams.get('fraudRisk') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (documentType) where.documentType = documentType
    if (fraudRisk) where.fraudRisk = fraudRisk
    if (search) {
      where.OR = [
        { fileName: { contains: search } },
        { ocrText: { contains: search } },
      ]
    }

    const [items, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { vendor: true },
      }),
      db.document.count({ where }),
    ])

    return NextResponse.json(ok({ items, total, page, pageSize }))
  } catch (e) {
    console.error('[GET /api/documents]', e)
    return NextResponse.json(err('Failed to fetch documents'), { status: 500 })
  }
}

// ─── POST /api/documents — upload + OCR + extract ────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(err('No file uploaded'), { status: 400 })
    }

    const source = (formData.get('source') as string) || 'web'

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
      'application/pdf',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        err(`Unsupported file type: ${file.type}. Allowed: images (JPEG, PNG, WebP, GIF, BMP) and PDF.`),
        { status: 400 },
      )
    }

    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(err('File too large. Max 10 MB.'), { status: 400 })
    }

    // Persist file to /public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg')
    const savedName = `${Date.now()}-${randomUUID()}${ext}`
    const savedPath = path.join(uploadDir, savedName)

    const bytes = await file.arrayBuffer()
    await writeFile(savedPath, Buffer.from(bytes))

    const relativePath = `/uploads/${savedName}`

    // Create document record in PROCESSING state
    const doc = await db.document.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: relativePath,
        thumbnailPath: relativePath,
        source,
        status: 'PROCESSING',
      },
    })

    await db.auditLog.create({
      data: {
        documentId: doc.id,
        action: 'UPLOADED',
        details: JSON.stringify({ fileName: file.name, size: file.size, source }),
      },
    })

    // Run OCR + extraction (best-effort; failures are recorded but don't 500)
    try {
      const result = await processDocument(savedPath, file.name)

      await db.document.update({
        where: { id: doc.id },
        data: {
          ocrText: result.ocrText.slice(0, 200000), // cap to keep DB sane
          ocrConfidence: result.confidence,
          ocrLanguage: 'en',
          extractedData: JSON.stringify(result.extracted),
          documentType: result.extracted.documentType,
          fraudRisk: result.extracted.fraudRisk,
          status: 'EXTRACTED',
          processedAt: new Date(),
        },
      })

      await db.auditLog.create({
        data: {
          documentId: doc.id,
          action: 'EXTRACTED',
          details: JSON.stringify({
            type: result.extracted.documentType,
            confidence: result.confidence,
            fraudRisk: result.extracted.fraudRisk,
          }),
        },
      })

      // Try to auto-link to a vendor by GSTIN or name
      const gstin = result.extracted.vendorGstin?.trim()
      const name = result.extracted.vendorName?.trim()
      if (gstin || name) {
        let vendor = null
        if (gstin) {
          vendor = await db.vendor.findFirst({ where: { gstin } })
        }
        if (!vendor && name) {
          vendor = await db.vendor.findFirst({ where: { name: { contains: name } } })
        }
        if (vendor) {
          await db.document.update({ where: { id: doc.id }, data: { vendorId: vendor.id } })
        } else if (name) {
          // Auto-create vendor for invoices/bills
          if (['GST_INVOICE', 'RECEIPT', 'E_BILL', 'PURCHASE_ORDER'].includes(result.extracted.documentType)) {
            const newVendor = await db.vendor.create({
              data: {
                name,
                gstin: gstin || null,
                address: result.extracted.vendorAddress || null,
                phone: result.extracted.vendorPhone || null,
                email: result.extracted.vendorEmail || null,
                category: 'supplier',
              },
            })
            await db.document.update({ where: { id: doc.id }, data: { vendorId: newVendor.id } })
          }
        }
      }
    } catch (ocrError) {
      console.error('[OCR failed]', ocrError)
      await db.document.update({
        where: { id: doc.id },
        data: { status: 'FAILED' },
      })
      await db.auditLog.create({
        data: {
          documentId: doc.id,
          action: 'OCR_FAILED',
          details: JSON.stringify({ error: (ocrError as Error).message }),
        },
      })
    }

    const final = await db.document.findUnique({
      where: { id: doc.id },
      include: { vendor: true, auditLogs: { orderBy: { timestamp: 'asc' } } },
    })

    return NextResponse.json(ok(final))
  } catch (e) {
    console.error('[POST /api/documents]', e)
    return NextResponse.json(err('Failed to upload document'), { status: 500 })
  }
}
