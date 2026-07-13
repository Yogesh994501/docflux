import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, err } from '@/lib/constants'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const comments = (body.comments as string) || ''

    const doc = await db.document.findUnique({ where: { id } })
    if (!doc) return NextResponse.json(err('Document not found'), { status: 404 })

    const updated = await db.document.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvalComments: comments,
        approvedBy: 'user',
        approvedAt: new Date(),
      },
    })

    await db.auditLog.create({
      data: {
        documentId: id,
        action: 'APPROVED',
        details: JSON.stringify({ comments }),
        actor: 'user',
      },
    })

    return NextResponse.json(ok(updated))
  } catch (e) {
    console.error('[POST approve]', e)
    return NextResponse.json(err('Failed to approve document'), { status: 500 })
  }
}
