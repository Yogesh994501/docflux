'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, User, Loader2, ArrowRight, CheckCircle2, ShieldCheck, Zap, FileCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function AuthScreen() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Surface any errors returned from OAuth redirect flow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) {
        toast.error(decodeURIComponent(err))
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  const handleGoogleSignIn = () => {
    setGoogleLoading(true)
    toast.loading('Redirecting to Google...', { id: 'google-oauth' })
    window.location.href = '/api/auth/google'
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast.success('Welcome back!')
      } else {
        await signup(email, password, name)
        toast.success('Account created — welcome to DocFlux!')
      }
    } catch (err) {
      toast.error((err as Error).message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left pane - Brand */}
      <div className="hidden lg:flex w-1/2 bg-brand-navy-950 items-center justify-center relative flex-col gap-6">
        <div className="absolute inset-0 bg-[url('/brand/document-stack.jpeg')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        {/* Warm terracotta gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-950 via-brand-navy-950/95 to-brand-terracotta/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-5 px-12 text-center">
          {/* Logo image */}
          <div className="flex h-20 w-20 items-center justify-center rounded-[18px] overflow-hidden shadow-xl border border-white/10">
            <img src="/logo.jpeg" alt="DocFlux Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-5xl font-serif font-semibold text-white tracking-wide">DocFlux</h1>
            <p className="mt-2 text-brand-cream/60 text-base">Scan once. DocFlux handles the rest.</p>
          </div>
          {/* Trust proof points */}
          <div className="mt-4 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: Zap, text: '92–97% field extraction accuracy' },
              { icon: FileCheck, text: 'GST e-Invoice validation built-in' },
              { icon: ShieldCheck, text: 'Trusted by Indian finance teams' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-terracotta/20">
                  <Icon className="h-4 w-4 text-brand-terracotta" />
                </div>
                <span className="text-sm text-brand-cream/80">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-brand-cream p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md overflow-hidden rounded-[14px] border border-brand-cream-border bg-white shadow-editorial"
        >
          {/* Header for mobile (hidden on desktop) */}
          <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-4 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] overflow-hidden shadow-sm border border-brand-cream-border">
              <img src="/logo.jpeg" alt="DocFlux Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-brand-navy-900">DocFlux</h1>
              <p className="mt-0.5 text-xs text-brand-navy-700">
                Scan once. DocFlux handles the rest.
              </p>
            </div>
          </div>

          {/* Desktop card title */}
          <div className="hidden lg:block px-8 pt-8 pb-1">
            <h2 className="text-xl font-serif font-semibold text-brand-navy-900">Welcome to DocFlux</h2>
            <p className="mt-1 text-xs text-brand-navy-700">Sign in to manage your documents and invoices</p>
          </div>

          {/* Google 1-Click Sign In Option */}
          <div className="px-8 pt-5 pb-1">
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignIn}
              className="group relative flex w-full items-center justify-center gap-3 rounded-[10px] border border-brand-cream-border bg-white px-4 py-2.5 text-sm font-medium text-brand-navy-900 shadow-sm transition-all hover:bg-brand-cream/60 hover:border-brand-navy-900/30 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-terracotta" />
              ) : (
                <GoogleIcon className="h-4 w-4 shrink-0" />
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-cream-border" />
              </div>
              <span className="relative bg-white px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                or continue with email
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-8 mb-4 grid grid-cols-2 gap-1 rounded-[8px] bg-brand-cream p-1 border border-brand-cream-border">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative rounded-[6px] py-2 text-xs font-medium transition-colors ${
                  mode === m ? 'text-brand-navy-900' : 'text-brand-navy-700 hover:text-brand-navy-900'
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-[6px] bg-white shadow-sm border border-brand-cream-border"
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="relative z-10">
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4 px-8 pb-8">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Label htmlFor="name" className="text-xs text-brand-navy-900 font-medium">Full name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy-700" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      required
                      className="rounded-[8px] pl-9 border-brand-cream-border focus-visible:ring-brand-terracotta"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-xs text-brand-navy-900 font-medium">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy-700" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="rounded-[8px] pl-9 border-brand-cream-border focus-visible:ring-brand-terracotta"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-xs text-brand-navy-900 font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy-700" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  required
                  className="rounded-[8px] pl-9 border-brand-cream-border focus-visible:ring-brand-terracotta"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-[8px] bg-brand-terracotta hover:bg-brand-terracotta/90 text-white cursor-pointer"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Your documents are private and scoped to your account</span>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
