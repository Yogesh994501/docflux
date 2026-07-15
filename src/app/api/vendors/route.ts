import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function GET(req: NextRequest) {
  try {
    const user = await auth.requireUser()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const items = await repo.listVendors(search, user.id)
    return NextResponse.json(ok({ items }))
  } catch (e) {
    console.error('[GET /api/vendors]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to fetch vendors'), { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await auth.requireUser()
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
      userId: user.id,
    })

    return NextResponse.json(ok(vendor))
  } catch (e) {
    console.error('[POST /api/vendors]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to create vendor'), { status })
  }
}
