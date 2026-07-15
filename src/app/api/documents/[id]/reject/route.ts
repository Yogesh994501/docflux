import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth.requireUser()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const comments = (body.comments as string) || ''

    const doc = await repo.getDocument(id, user.id)
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    const updated = await repo.updateDocument(id, {
      status: 'REJECTED',
      approvalComments: comments,
      approvedBy: user.email,
      approvedAt: new Date().toISOString(),
    })

    await repo.createAuditLog({
      documentId: id,
      action: 'REJECTED',
      details: JSON.stringify({ comments }),
      actor: user.email,
    })

    return NextResponse.json(ok(updated))
  } catch (e) {
    console.error('[POST reject]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to reject document'), { status })
  }
}
