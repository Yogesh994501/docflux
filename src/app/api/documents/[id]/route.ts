import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'
import { unlink } from 'fs/promises'
import path from 'path'

// ─── GET /api/documents/[id] ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth.requireUser()
    const { id } = await params
    const doc = await repo.getDocument(id, user.id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })
    return NextResponse.json(ok(doc))
  } catch (e) {
    console.error('[GET /api/documents/:id]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to fetch document'), { status })
  }
}

// ─── PATCH /api/documents/[id] — edit extracted fields ───────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth.requireUser()
    const { id } = await params
    const existing = await repo.getDocument(id, user.id)
    if (!existing) return NextResponse.json(err('Document not found'), { status: 404 })
    const body = await req.json()

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
      actor: user.email,
    })

    return NextResponse.json(ok(updated))
  } catch (e) {
    console.error('[PATCH /api/documents/:id]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to update document'), { status })
  }
}

// ─── DELETE /api/documents/[id] ──────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth.requireUser()
    const { id } = await params
    const doc = await repo.getDocument(id, user.id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    if (doc.storagePath?.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'public', doc.storagePath)
      try { await unlink(fullPath) } catch { /* ignore */ }
    }

    await repo.deleteDocument(id)
    return NextResponse.json(ok({ id }))
  } catch (e) {
    console.error('[DELETE /api/documents/:id]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to delete document'), { status })
  }
}
