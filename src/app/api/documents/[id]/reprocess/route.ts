import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processDocument } from '@/lib/ai'
import { ok, err } from '@/lib/constants'
import path from 'path'

// Re-run OCR + extraction on an existing document
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const doc = await db.document.findUnique({ where: { id } })
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    await db.document.update({ where: { id }, data: { status: 'PROCESSING' } })
    await db.auditLog.create({
      data: { documentId: id, action: 'REPROCESSED', actor: 'user' },
    })

    const filePath = path.join(process.cwd(), 'public', doc.storagePath)
    const result = await processDocument(filePath, doc.fileName)

    const updated = await db.document.update({
      where: { id },
      data: {
        ocrText: result.ocrText.slice(0, 200000),
        ocrConfidence: result.confidence,
        extractedData: JSON.stringify(result.extracted),
        documentType: result.extracted.documentType,
        fraudRisk: result.extracted.fraudRisk,
        status: 'EXTRACTED',
        processedAt: new Date(),
      },
      include: { vendor: true, auditLogs: { orderBy: { timestamp: 'asc' } } },
    })

    await db.auditLog.create({
      data: {
        documentId: id,
        action: 'EXTRACTED',
        details: JSON.stringify({
          type: result.extracted.documentType,
          confidence: result.confidence,
          reprocessed: true,
        }),
      },
    })

    return NextResponse.json(ok(updated))
  } catch (e) {
    console.error('[POST reprocess]', e)
    const { id } = await params
    await db.document.updateMany({
      where: { id },
      data: { status: 'FAILED' },
    }).catch(() => {})
    return NextResponse.json(err('Failed to reprocess document'), { status: 500 })
  }
}
