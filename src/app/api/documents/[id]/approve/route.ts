import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'
import { storeVendorExample } from '@/lib/vendor-memory'

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
      status: 'APPROVED',
      approvalComments: comments,
      approvedBy: user.email,
      approvedAt: new Date().toISOString(),
    })

    await repo.createAuditLog({
      documentId: id,
      action: 'APPROVED',
      details: JSON.stringify({ comments }),
      actor: user.email,
    })

    // ── Vendor memory: store this approved extraction as a few-shot example ──
    // This is what powers the "Layout learned" badge and improves accuracy on
    // repeat vendors. We only cache APPROVED documents — human-verified correct.
    if (doc.extractedData) {
      try {
        const extracted = JSON.parse(doc.extractedData)
        const gstin = extracted.vendorGstin?.trim() || undefined
        const name = extracted.vendorName?.trim() || undefined
        if (gstin || name) {
          await storeVendorExample(gstin, name, doc.extractedData)
          console.log(`[VendorMemory] Cached approved extraction for vendor: ${name ?? gstin}`)
        }
      } catch {
        // Non-blocking — don't fail the approval if cache write fails
      }
    }

    return NextResponse.json(ok(updated))
  } catch (e) {
    console.error('[POST approve]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to approve document'), { status })
  }
}
