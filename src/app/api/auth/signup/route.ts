import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json(err('Email, password, and name are required'), { status: 400 })
    }
    const session = await auth.signup(email, password, name)
    return NextResponse.json(ok({ user: session.user }))
  } catch (e) {
    console.error('[POST /api/auth/signup]', e)
    return NextResponse.json(err((e as Error).message || 'Signup failed'), { status: 400 })
  }
}
