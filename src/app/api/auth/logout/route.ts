import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ok } from '@/lib/constants'

export async function POST() {
  try {
    await auth.logout()
    return NextResponse.json(ok({ loggedOut: true }))
  } catch (e) {
    console.error('[POST /api/auth/logout]', e)
    return NextResponse.json(ok({ loggedOut: true }))
  }
}
