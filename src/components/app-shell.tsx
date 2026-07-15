'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScanLine, Menu, Sparkles, Database, Cpu } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useAnalyticsQuery, useStatusQuery, useSeedMutation } from '@/lib/queries'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import Strands from '@/components/strands'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const section = useAppStore((s) => s.section)
  const { data: analytics } = useAnalyticsQuery()
  const { data: status } = useStatusQuery()
  const seed = useSeedMutation()

  const handleSeed = () => {
    seed.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(`Seeded ${data.vendors} vendors and ${data.documents} demo documents`)
      },
      onError: (e) => toast.error('Seed failed: ' + e.message),
    })
  }

  const titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    upload: 'Upload & Scan',
    documents: 'Documents',
    approvals: 'Approvals',
    vendors: 'Vendors',
    analytics: 'Analytics',
    copilot: 'AI Copilot',
    profile: 'Profile & Settings',
  }
  const subtitleMap: Record<string, string> = {
    dashboard: 'Real-time overview of your document pipeline',
    upload: 'Drop any document — AI extracts text and structured fields',
    documents: 'Search, filter, and manage every parsed document',
    approvals: 'Review flagged documents before they post',
    vendors: 'Auto-discovered suppliers and customers',
    analytics: 'Spend trends, type distribution, and fraud signals',
    copilot: 'Ask about GST, invoices, fraud detection and more',
    profile: 'Manage your account and system configuration',
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile top bar — hamburger on the LEFT */}
      <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-border/60 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 overflow-hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              {/* Fluid Strands backdrop inside the hamburger menu */}
              <div className="pointer-events-none absolute inset-0 opacity-50">
                <Strands
                  colors={['#10b981', '#06b6d4', '#8b5cf6']}
                  count={3}
                  speed={0.45}
                  amplitude={0.9}
                  waviness={1.1}
                  thickness={0.55}
                  glow={3}
                  taper={3}
                  spread={1.2}
                  intensity={0.6}
                  saturation={1.4}
                  opacity={0.85}
                  scale={1.6}
                />
              </div>
              <div className="relative z-10 h-full">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
              <ScanLine className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">AutoFinDocs</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {status && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Cpu className="h-2.5 w-2.5" />
              {status.ocr === 'gemini' ? 'Gemini' : 'GLM-4.6V'}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar — fixed, glassmorphic */}
        <aside className="hidden w-[260px] shrink-0 border-r border-border/60 lg:block">
          <div className="sticky top-0 h-screen sidebar-glass">
            <Sidebar />
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop section header — glass, sticky */}
          <header className="glass sticky top-0 z-30 hidden items-center justify-between border-b border-border/60 px-8 py-4 lg:flex">
            <div>
              <motion.h1
                key={section}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[19px] font-semibold tracking-tight"
              >
                {titleMap[section]}
              </motion.h1>
              <motion.p
                key={section + '-sub'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="text-xs text-muted-foreground"
              >
                {subtitleMap[section]}
              </motion.p>
            </div>
            <div className="flex items-center gap-2">
              {/* Live status pills */}
              {status && (
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-[11px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Database className="h-3 w-3" />
                    {status.database}
                  </span>
                  <span className="h-3 w-px bg-border" />
                  <span className="flex items-center gap-1.5 font-medium">
                    <Cpu className="h-3 w-3" />
                    {status.ocr === 'gemini' ? `Gemini ${status.geminiModel?.replace('gemini-', '')}` : 'GLM-4.6V'}
                  </span>
                </div>
              )}
              {(analytics?.counts.total ?? 0) === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeed} disabled={seed.isPending} className="rounded-lg">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  {seed.isPending ? 'Seeding…' : 'Load demo data'}
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sticky footer */}
          <footer className="mt-auto border-t border-border/60 glass px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
              <div className="flex items-center gap-1.5">
                <ScanLine className="h-3.5 w-3.5 text-foreground/60" />
                <span>
                  <span className="font-semibold text-foreground/80">AutoFinDocs</span>
                  {' — '}
                  AI-powered document OCR & parsing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Powered by {status?.ocr === 'gemini' ? 'Google Gemini' : 'Z.ai GLM-4.6V'}
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
