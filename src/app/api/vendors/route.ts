import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, err } from '@/lib/constants'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { gstin: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const vendors = await db.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { documents: true } },
      },
    })

    // Attach total spend per vendor
    const enriched = await Promise.all(
      vendors.map(async (v) => {
        const docs = await db.document.findMany({
          where: { vendorId: v.id },
          select: { extractedData: true },
        })
        let totalSpend = 0
        for (const d of docs) {
          if (d.extractedData) {
            try {
              const data = JSON.parse(d.extractedData)
              const amt = parseFloat(String(data.totalAmount ?? '0').replace(/[^0-9.]/g, ''))
              if (!isNaN(amt)) totalSpend += amt
            } catch { /* ignore */ }
          }
        }
        return { ...v, totalSpend }
      }),
    )

    return NextResponse.json(ok({ items: enriched }))
  } catch (e) {
    console.error('[GET /api/vendors]', e)
    return NextResponse.json(err('Failed to fetch vendors'), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, gstin, pan, email, phone, address, category } = body
    if (!name) return NextResponse.json(err('Name is required'), { status: 400 })

    const vendor = await db.vendor.create({
      data: {
        name,
        gstin: gstin || null,
        pan: pan || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        category: category || 'supplier',
      },
    })

    return NextResponse.json(ok(vendor))
  } catch (e) {
    console.error('[POST /api/vendors]', e)
    return NextResponse.json(err('Failed to create vendor'), { status: 500 })
  }
}
