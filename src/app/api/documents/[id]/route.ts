import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { ok, err } from '@/lib/constants'
import { unlink } from 'fs/promises'
import path from 'path'

// ─── GET /api/documents/[id] ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const doc = await repo.getDocument(id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })
    return NextResponse.json(ok(doc))
  } catch (e) {
    console.error('[GET /api/documents/:id]', e)
    return NextResponse.json(err('Failed to fetch document'), { status: 500 })
  }
}

// ─── PATCH /api/documents/[id] — edit extracted fields ───────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await repo.getDocument(id)
    if (!existing) return NextResponse.json(err('Document not found'), { status: 404 })

    const updates: Record<string, unknown> = {}
    if (body.documentType !== undefined) updates.documentType = body.documentType
    if (body.fraudRisk !== undefined) updates.fraudRisk = body.fraudRisk
    if (body.vendorId !== undefined) updates.vendorId = body.vendorId || null

    if (body.extractedDataPatch && existing.extractedData) {
      const current = JSON.parse(existing.extractedData)
      const merged = { ...current, ...body.extractedDataPatch }
      updates.extractedData = JSON.stringify(merged)
    } else if (body.extractedDataPatch) {
      updates.extractedData = JSON.stringify(body.extractedDataPatch)
    }

    const updated = await repo.updateDocument(id, updates)

    await repo.createAuditLog({
      documentId: id,
      action: 'EDITED',
      details: JSON.stringify({ fields: Object.keys(updates) }),
      actor: 'user',
    })

    return NextResponse.json(ok(updated))
  } catch (e) {
    console.error('[PATCH /api/documents/:id]', e)
    return NextResponse.json(err('Failed to update document'), { status: 500 })
  }
}

// ─── DELETE /api/documents/[id] ──────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const doc = await repo.getDocument(id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    if (doc.storagePath?.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'public', doc.storagePath)
      try { await unlink(fullPath) } catch { /* ignore */ }
    }

    await repo.deleteDocument(id)
    return NextResponse.json(ok({ id }))
  } catch (e) {
    console.error('[DELETE /api/documents/:id]', e)
    return NextResponse.json(err('Failed to delete document'), { status: 500 })
  }
}
