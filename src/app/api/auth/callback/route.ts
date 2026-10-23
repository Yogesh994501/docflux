import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setSessionCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error || errorDescription) {
    console.error('[OAuth Callback Error]', error, errorDescription)
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorDescription || error || 'Authentication failed')}`)
  }

  if (code && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    const { data, error: exchangeError } = await sb.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.session) {
      console.error('[OAuth Code Exchange Error]', exchangeError)
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(exchangeError?.message || 'Failed to exchange authorization code')}`)
    }

    await setSessionCookie(data.session.access_token)
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/`)
}
