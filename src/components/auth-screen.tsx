'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScanLine, Mail, Lock, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Strands from '@/components/strands'
import { toast } from 'sonner'

export function AuthScreen() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast.success('Welcome back!')
      } else {
        await signup(email, password, name)
        toast.success('Account created — welcome to AutoFinDocs!')
      }
    } catch (err) {
      toast.error((err as Error).message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Strands fluid background — premium engagement */}
      <div className="absolute inset-0 opacity-60">
        <Strands
          colors={['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']}
          count={4}
          speed={0.5}
          amplitude={1}
          waviness={1.2}
          thickness={0.6}
          glow={3}
          taper={3}
          spread={1.2}
          intensity={0.7}
          saturation={1.5}
          opacity={0.9}
          scale={1.6}
        />
      </div>
      {/* Dark veil for legibility */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[3px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 shadow-2xl"
          style={{
            background: 'color-mix(in oklch, var(--card) 60%, transparent)',
            backdropFilter: 'saturate(180%) blur(28px)',
            WebkitBackdropFilter: 'saturate(180%) blur(28px)',
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg"
            >
              <ScanLine className="h-6 w-6" />
            </motion.div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">AutoFinDocs</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Intelligent OCR & document parsing
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-8 mb-5 grid grid-cols-2 gap-1 rounded-xl bg-foreground/[0.04] p-1">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative rounded-lg py-2 text-xs font-medium transition-colors ${
                  mode === m ? 'text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-lg bg-foreground"
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
                  <Label htmlFor="name" className="text-xs">Full name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      required
                      className="rounded-xl pl-9"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  required
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl"
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
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Your documents are private and scoped to your account</span>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
