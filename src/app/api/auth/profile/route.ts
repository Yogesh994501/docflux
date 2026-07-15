import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const updates: { name?: string; avatarUrl?: string | null } = {}
    if (typeof body.name === 'string') updates.name = body.name
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl
    const user = await auth.updateProfile(updates)
    return NextResponse.json(ok({ user }))
  } catch (e) {
    console.error('[PATCH /api/auth/profile]', e)
    return NextResponse.json(err((e as Error).message || 'Profile update failed'), { status: 400 })
  }
}
