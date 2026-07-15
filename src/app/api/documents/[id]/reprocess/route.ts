import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { processDocument } from '@/lib/ai'
import { ok, err } from '@/lib/constants'
import path from 'path'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const doc = await repo.getDocument(id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    await repo.updateDocument(id, { status: 'PROCESSING' })
    await repo.createAuditLog({
      documentId: id,
      action: 'REPROCESSED',
      actor: 'user',
    })

    const filePath = path.join(process.cwd(), 'public', doc.storagePath)
    const result = await processDocument(filePath, doc.fileName)

    const updated = await repo.updateDocument(id, {
      ocrText: result.ocrText.slice(0, 200000),
      ocrConfidence: result.confidence,
      extractedData: JSON.stringify(result.extracted),
      documentType: result.extracted.documentType,
      fraudRisk: result.extracted.fraudRisk,
      status: 'EXTRACTED',
      processedAt: new Date().toISOString(),
    })

    await repo.createAuditLog({
      documentId: id,
      action: 'EXTRACTED',
      details: JSON.stringify({
        type: result.extracted.documentType,
        confidence: result.confidence,
        reprocessed: true,
        provider: result.provider,
      }),
    })

    const refreshed = await repo.getDocument(id)
    return NextResponse.json(ok(refreshed ?? updated))
  } catch (e) {
    console.error('[POST reprocess]', e)
    const { id } = await params
    try { await repo.updateDocument(id, { status: 'FAILED' }) } catch { /* ignore */ }
    return NextResponse.json(err('Failed to reprocess document'), { status: 500 })
  }
}
