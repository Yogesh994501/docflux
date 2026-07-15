import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { processDocument } from '@/lib/ai'
import { ok, err } from '@/lib/constants'
import path from 'path'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth.requireUser()
    const { id } = await params
    const doc = await repo.getDocument(id, user.id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    await repo.updateDocument(id, { status: 'PROCESSING' })
    await repo.createAuditLog({ documentId: id, action: 'REPROCESSED', actor: user.email })

    const filePath = path.join(process.cwd(), 'public', doc.storagePath)
    const result = await processDocument(filePath, doc.fileName)

    await repo.updateDocument(id, {
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
      details: JSON.stringify({ type: result.extracted.documentType, confidence: result.confidence, reprocessed: true, provider: result.provider }),
      actor: user.email,
    })

    const refreshed = await repo.getDocument(id, user.id)
    return NextResponse.json(ok(refreshed))
  } catch (e) {
    console.error('[POST reprocess]', e)
    const { id } = await params
    try { await repo.updateDocument(id, { status: 'FAILED' }) } catch { /* ignore */ }
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to reprocess document'), { status })
  }
}
