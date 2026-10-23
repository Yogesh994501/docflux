import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSupabaseEnabled } from '@/lib/repository'
import { setSessionCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin

  try {
    if (isSupabaseEnabled()) {
      const sb = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )

      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })

      if (error || !data.url) {
        console.error('[Google OAuth Error]', error)
        return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error?.message || 'Google sign-in initiation failed')}`)
      }

      return NextResponse.redirect(data.url)
    }

    // Local mode fallback: auto-login as Google demo user
    const { db } = await import('@/lib/db')
    const { SignJWT } = await import('jose')
    const JWT_SECRET = process.env.JWT_SECRET || 'autofindocs-dev-secret-change-in-prod'
    const secretKey = new TextEncoder().encode(JWT_SECRET)

    const googleEmail = 'google.user@docflux.ai'
    let user = await db.user.findUnique({ where: { email: googleEmail } })
    if (!user) {
      user = await db.user.create({
        data: {
          email: googleEmail,
          name: 'Google User',
          passwordHash: 'oauth-google',
          avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
        },
      })
    }

    const token = await new SignJWT({ sub: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secretKey)

    await setSessionCookie(token)
    return NextResponse.redirect(`${origin}/`)
  } catch (err) {
    console.error('[Google Route Error]', err)
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent((err as Error).message || 'Google authentication error')}`)
  }
}
