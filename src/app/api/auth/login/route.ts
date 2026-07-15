import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json(err('Email and password are required'), { status: 400 })
    }
    const session = await auth.login(email, password)
    return NextResponse.json(ok({ user: session.user }))
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return NextResponse.json(err((e as Error).message || 'Login failed'), { status: 401 })
  }
}
