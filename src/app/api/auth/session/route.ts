import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json(err('Token is required'), { status: 400 })
    }

    await setSessionCookie(token)
    return NextResponse.json(ok({ session: true }))
  } catch (e) {
    console.error('[POST /api/auth/session Error]', e)
    return NextResponse.json(err((e as Error).message || 'Failed to save session'), { status: 500 })
  }
}
