/**
 * Auth library — unified authentication with TWO backends.
 *
 * - If SUPABASE_URL + SUPABASE_ANON_KEY are set → uses Supabase Auth
 *   (email/password, secure sessions, auth.users table, RLS).
 * - Otherwise → uses local SQLite with bcrypt-hashed passwords + JWT sessions
 *   stored in an httpOnly cookie.
 *
 * Exposes a single `auth` object with: signup, login, logout, getSession,
 * getCurrentUser, updateProfile. All API routes call these — no backend-specific
 * code leaks into route handlers.
 */

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from './db'
import { repo, isSupabaseEnabled } from './repository'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  provider: 'supabase' | 'local'
}

export interface AuthSession {
  user: AuthUser
  token: string
}

export const AUTH_COOKIE = 'af_session'
const JWT_SECRET = process.env.JWT_SECRET || 'autofindocs-dev-secret-change-in-prod'
const secretKey = new TextEncoder().encode(JWT_SECRET)

// ─── Backend detection ────────────────────────────────────────────────────────

export function getAuthProvider(): 'supabase' | 'local' {
  return isSupabaseEnabled() ? 'supabase' : 'local'
}

// ─── Local backend (SQLite + bcrypt + JWT) ────────────────────────────────────

async function localSignup(email: string, password: string, name: string): Promise<AuthSession> {
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) throw new Error('An account with this email already exists')

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
    },
  })

  const token = await issueJwt(user.id, user.email, user.name)
  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, provider: 'local' },
    token,
  }
}

async function localLogin(email: string, password: string): Promise<AuthSession> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) throw new Error('Invalid email or password')
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new Error('Invalid email or password')

  const token = await issueJwt(user.id, user.email, user.name)
  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, provider: 'local' },
    token,
  }
}

async function issueJwt(userId: string, email: string, name: string): Promise<string> {
  return new SignJWT({ sub: userId, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey)
}

async function verifyJwt(token: string): Promise<{ sub: string; email: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return { sub: payload.sub as string, email: payload.email as string, name: payload.name as string }
  } catch {
    return null
  }
}

async function localGetCurrentUser(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const payload = await verifyJwt(token)
  if (!payload) return null
  const user = await db.user.findUnique({ where: { id: payload.sub } })
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, provider: 'local' }
}

async function localUpdateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }): Promise<AuthUser> {
  const update: Record<string, unknown> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl
  const user = await db.user.update({ where: { id: userId }, data: update })
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, provider: 'local' }
}

// ─── Supabase backend ─────────────────────────────────────────────────────────

async function supabaseSignup(email: string, password: string, name: string): Promise<AuthSession> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('Check your email to confirm your account before signing in.')
  return {
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name,
      avatarUrl: null,
      provider: 'supabase',
    },
    token: data.session.access_token,
  }
}

async function supabaseLogin(email: string, password: string): Promise<AuthSession> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  // Fetch the profile name
  const { data: profile } = await sb.from('profiles').select('name, avatar_url').eq('id', data.user!.id).maybeSingle()
  return {
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name: profile?.name ?? (data.user!.user_metadata?.name as string) ?? email.split('@')[0],
      avatarUrl: profile?.avatar_url ?? null,
      provider: 'supabase',
    },
    token: data.session.access_token,
  }
}

async function supabaseGetCurrentUser(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await sb.from('profiles').select('name, avatar_url').eq('id', data.user.id).maybeSingle()
  return {
    id: data.user.id,
    email: data.user.email!,
    name: profile?.name ?? (data.user.user_metadata?.name as string) ?? data.user.email!.split('@')[0],
    avatarUrl: profile?.avatar_url ?? null,
    provider: 'supabase',
  }
}

async function supabaseUpdateProfile(token: string, userId: string, data: { name?: string; avatarUrl?: string | null }): Promise<AuthUser> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const update: Record<string, unknown> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl
  const { error } = await sb.from('profiles').update(update).eq('id', userId)
  if (error) throw new Error(error.message)
  const { data: profile } = await sb.from('profiles').select('name, avatar_url, email').eq('id', userId).maybeSingle()
  return {
    id: userId,
    email: profile?.email ?? '',
    name: profile?.name ?? data.name ?? '',
    avatarUrl: profile?.avatar_url ?? null,
    provider: 'supabase',
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(AUTH_COOKIE)
}

async function getToken(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(AUTH_COOKIE)?.value
}

// ─── Unified auth API ─────────────────────────────────────────────────────────

export const auth = {
  provider: getAuthProvider(),

  async signup(email: string, password: string, name: string): Promise<AuthSession> {
    if (password.length < 6) throw new Error('Password must be at least 6 characters')
    if (!email.includes('@')) throw new Error('Please enter a valid email address')
    if (!name.trim()) throw new Error('Please enter your name')
    const session = isSupabaseEnabled()
      ? await supabaseSignup(email, password, name)
      : await localSignup(email, password, name)
    await setSessionCookie(session.token)
    return session
  },

  async login(email: string, password: string): Promise<AuthSession> {
    if (!email.includes('@')) throw new Error('Please enter a valid email address')
    const session = isSupabaseEnabled()
      ? await supabaseLogin(email, password)
      : await localLogin(email, password)
    await setSessionCookie(session.token)
    return session
  },

  async logout(): Promise<void> {
    await clearSessionCookie()
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = await getToken()
    return isSupabaseEnabled()
      ? supabaseGetCurrentUser(token)
      : localGetCurrentUser(token)
  },

  async requireUser(): Promise<AuthUser> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('Unauthorized')
    return user
  },

  async updateProfile(data: { name?: string; avatarUrl?: string | null }): Promise<AuthUser> {
    const user = await this.requireUser()
    if (isSupabaseEnabled()) {
      const token = await getToken()
      return supabaseUpdateProfile(token!, user.id, data)
    }
    return localUpdateProfile(user.id, data)
  },
}

// ─── Helper: get current user's id for DB scoping ─────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const user = await auth.getCurrentUser()
  return user?.id ?? null
}

// Export repo-scoped helpers so route handlers don't repeat boilerplate
export { repo }
