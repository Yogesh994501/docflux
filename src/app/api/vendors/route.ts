import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { ok, err } from '@/lib/constants'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const items = await repo.listVendors(search)
    return NextResponse.json(ok({ items }))
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

    const vendor = await repo.createVendor({
      name,
      gstin: gstin || null,
      pan: pan || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      category: category || 'supplier',
    })

    return NextResponse.json(ok(vendor))
  } catch (e) {
    console.error('[POST /api/vendors]', e)
    return NextResponse.json(err('Failed to create vendor'), { status: 500 })
  }
}
