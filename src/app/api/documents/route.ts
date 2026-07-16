import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { processDocument } from '@/lib/ai'
import { ok, err } from '@/lib/constants'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

// ─── GET /api/documents — list (scoped to current user) ──────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await auth.requireUser()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))

    const { items, total } = await repo.listDocuments({
      page,
      pageSize,
      status: searchParams.get('status') || null,
      documentType: searchParams.get('documentType') || null,
      fraudRisk: searchParams.get('fraudRisk') || null,
      search: searchParams.get('search') || null,
      userId: user.id,
    })

    return NextResponse.json(ok({ items, total, page, pageSize }))
  } catch (e) {
    console.error('[GET /api/documents]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to fetch documents'), { status })
  }
}

// ─── POST /api/documents — upload + OCR (owned by current user) ──────────────

export async function POST(req: NextRequest) {
  try {
    const user = await auth.requireUser()
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(err('No file uploaded'), { status: 400 })
    }

    const source = (formData.get('source') as string) || 'web'
    // docTypeHint: optional user-selected type from the Upload section selector
    const docTypeHint = (formData.get('docTypeHint') as string) || 'auto'

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(err('File too large. Max 10 MB.'), { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg')
    const savedName = `${Date.now()}-${randomUUID()}${ext}`
    const savedPath = path.join(uploadDir, savedName)

    const bytes = await file.arrayBuffer()
    await writeFile(savedPath, Buffer.from(bytes))

    const relativePath = `/uploads/${savedName}`

    const doc = await repo.createDocument({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: relativePath,
      thumbnailPath: relativePath,
      source,
      status: 'PROCESSING',
      userId: user.id,
    })

    await repo.createAuditLog({
      documentId: doc.id,
      action: 'UPLOADED',
      details: JSON.stringify({ fileName: file.name, size: file.size, source, userId: user.id }),
    })

    try {
      const result = await processDocument(savedPath, file.name,
        docTypeHint !== 'auto' ? { name: docTypeHint } : undefined,
      )

      await repo.updateDocument(doc.id, {
        ocrText: result.ocrText.slice(0, 200000),
        ocrConfidence: result.confidence,
        ocrLanguage: 'en',
        extractedData: JSON.stringify(result.extracted),
        documentType: result.extracted.documentType,
        fraudRisk: result.extracted.fraudRisk,
        // Smart routing: low confidence / missing fields → PENDING_REVIEW for human review
        status: result.suggestedStatus,
        processedAt: new Date().toISOString(),
      })

      await repo.createAuditLog({
        documentId: doc.id,
        action: 'EXTRACTED',
        details: JSON.stringify({
          type: result.extracted.documentType,
          classifiedAs: result.extracted.classifiedAs,
          confidence: result.confidence,
          extractionConfidence: result.extracted.extractionConfidence,
          fraudRisk: result.extracted.fraudRisk,
          suggestedStatus: result.suggestedStatus,
          missingMandatoryFields: result.extracted.missingMandatoryFields,
          totalsVerified: result.extracted.totalsVerified,
          gstinValid: result.extracted.gstinValid,
          pipelinePasses: result.extracted.pipelinePasses,
          provider: result.provider,
        }),
      })

      // Auto-link / auto-create vendor (scoped to this user)
      const gstin = result.extracted.vendorGstin?.trim()
      const vname = result.extracted.vendorName?.trim()
      if (gstin || vname) {
        let vendor: Awaited<ReturnType<typeof repo.findVendorByGstin>> = null
        if (gstin) vendor = await repo.findVendorByGstin(gstin, user.id)
        if (!vendor && vname) vendor = await repo.findVendorByName(vname, user.id)
        if (vendor) {
          await repo.updateDocument(doc.id, { vendorId: vendor.id })
        } else if (vname && ['GST_INVOICE', 'RECEIPT', 'E_BILL', 'PURCHASE_ORDER'].includes(result.extracted.documentType)) {
          const newVendor = await repo.createVendor({
            name: vname,
            gstin: gstin || null,
            address: result.extracted.vendorAddress || null,
            phone: result.extracted.vendorPhone || null,
            email: result.extracted.vendorEmail || null,
            category: 'supplier',
            userId: user.id,
          })
          await repo.updateDocument(doc.id, { vendorId: newVendor.id })
        }
      }
    } catch (ocrError) {
      console.error('[OCR failed]', ocrError)
      await repo.updateDocument(doc.id, { status: 'FAILED' })
      await repo.createAuditLog({
        documentId: doc.id,
        action: 'OCR_FAILED',
        details: JSON.stringify({ error: (ocrError as Error).message }),
      })
    }

    const final = await repo.getDocument(doc.id, user.id)
    return NextResponse.json(ok(final))
  } catch (e) {
    console.error('[POST /api/documents]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to upload document'), { status })
  }
}
