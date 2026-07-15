import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ok } from '@/lib/constants'

export async function GET() {
  try {
    const user = await auth.getCurrentUser()
    return NextResponse.json(ok({ user }))
  } catch (e) {
    console.error('[GET /api/auth/me]', e)
    return NextResponse.json(ok({ user: null }))
  }
}
