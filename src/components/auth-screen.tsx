'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScanLine, Mail, Lock, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="flex min-h-screen w-full">
      {/* Left pane - Brand */}
      <div className="hidden lg:flex w-1/2 bg-brand-navy-950 items-center justify-center relative flex-col gap-6">
        <div className="absolute inset-0 bg-[url('/brand/document-stack.jpeg')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-brand-terracotta text-white shadow-lg">
            <ScanLine className="h-8 w-8" />
          </div>
          <h1 className="text-5xl font-serif font-semibold text-white tracking-wide">DocFlux</h1>
          <p className="text-brand-navy-700 text-lg">Intelligent OCR & agentic parsing</p>
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
          <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-brand-terracotta text-white shadow-sm">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-brand-navy-900">DocFlux</h1>
              <p className="mt-0.5 text-xs text-brand-navy-700">
                Intelligent OCR & parsing
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-8 mb-5 grid grid-cols-2 gap-1 rounded-[8px] bg-brand-cream p-1 border border-brand-cream-border">
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
              disabled={loading}
              className="w-full rounded-[8px] bg-brand-terracotta hover:bg-brand-terracotta/90 text-white"
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
