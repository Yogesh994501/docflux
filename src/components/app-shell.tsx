'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScanLine, Menu, Github, Sparkles } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useAnalyticsQuery } from '@/lib/queries'
import { useSeedMutation } from '@/lib/queries'
import { toast } from 'sonner'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const section = useAppStore((s) => s.section)
  const { data: analytics } = useAnalyticsQuery()
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
    approvals: 'Approvals Queue',
    vendors: 'Vendors / CRM',
    analytics: 'Analytics',
    copilot: 'AI Copilot',
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-4.5 w-4.5" />
          </div>
          <span className="font-bold">AutoFinDocs</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop section header */}
          <header className="hidden items-center justify-between border-b border-border px-8 py-4 lg:flex">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{titleMap[section]}</h1>
              <p className="text-xs text-muted-foreground">
                Intelligent OCR & structured data extraction for receipts, invoices, government IDs and more
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(analytics?.counts.total ?? 0) === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeed} disabled={seed.isPending}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {seed.isPending ? 'Seeding…' : 'Load demo data'}
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  Source
                </a>
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

          {/* Sticky footer */}
          <footer className="mt-auto border-t border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
              <div className="flex items-center gap-1.5">
                <ScanLine className="h-3.5 w-3.5 text-primary" />
                <span>
                  <span className="font-semibold text-foreground">AutoFinDocs</span>
                  {' — '}
                  AI-powered document OCR & parsing
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span>Powered by Z.ai Vision & Language Models</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
