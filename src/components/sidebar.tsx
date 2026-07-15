'use client'

import { useAppStore, type Section } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Upload,
  FileText,
  CheckCircle2,
  Building2,
  BarChart3,
  Sparkles,
  ScanLine,
  Moon,
  Sun,
  Database,
  Cpu,
  UserCircle,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useStatusQuery } from '@/lib/queries'
import { useAuth } from '@/components/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & insights' },
  { id: 'upload', label: 'Upload & Scan', icon: Upload, desc: 'OCR new documents' },
  { id: 'documents', label: 'Documents', icon: FileText, desc: 'All parsed records' },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2, desc: 'Pending review' },
  { id: 'vendors', label: 'Vendors', icon: Building2, desc: 'Supplier CRM' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Spend & trends' },
  { id: 'copilot', label: 'AI Copilot', icon: Sparkles, desc: 'Ask anything' },
  { id: 'profile', label: 'Profile', icon: UserCircle, desc: 'Account & settings' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection } = useAppStore()
  const { theme, setTheme } = useTheme()
  const { data: status } = useStatusQuery()
  const { user } = useAuth()

  return (
    <div className="flex h-full flex-col sidebar-glass">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm"
        >
          <ScanLine className="h-5 w-5" />
        </motion.div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">AutoFinDocs</div>
          <div className="text-[11px] text-muted-foreground">OCR & Document Parsing</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scroll px-3 py-2 space-y-0.5">
        <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          Workspace
        </div>
        {NAV.map((item, i) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.04 }}
              onClick={() => {
                setSection(item.id)
                onNavigate?.()
              }}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                active
                  ? 'bg-foreground text-background font-medium shadow-sm'
                  : 'text-foreground/70 hover:bg-foreground/[0.05] hover:text-foreground',
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? '' : 'text-muted-foreground group-hover:text-foreground')} />
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate">{item.label}</div>
                <div className={cn('truncate text-[10px]', active ? 'text-background/60' : 'text-muted-foreground/60')}>
                  {item.desc}
                </div>
              </div>
              {active && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-background"
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* User card — click to open profile */}
      {user && (
        <div className="px-3 pb-1">
          <button
            onClick={() => { setSection('profile'); onNavigate?.() }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
              section === 'profile'
                ? 'border-foreground/20 bg-foreground/[0.06]'
                : 'border-border/60 bg-card/50 hover:bg-accent/50',
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-xs font-semibold text-background">
              {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
            </div>
          </button>
        </div>
      )}

      {/* System status */}
      <div className="px-3 py-3">
        <div className="rounded-xl border border-border/60 bg-card/50 p-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            System
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Database className="h-3 w-3" /> Database
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={cn('h-1.5 w-1.5 rounded-full', status?.database === 'supabase' ? 'bg-emerald-500' : 'bg-amber-500')} />
              {status?.database ?? 'sqlite'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="h-3 w-3" /> OCR Engine
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {status?.ocr === 'gemini' ? `Gemini ${status.geminiModel?.replace('gemini-', '')}` : 'GLM-4.6V'}
            </span>
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="border-t border-border/60 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-foreground/60 hover:text-foreground rounded-xl"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <AnimatePresence mode="wait">
            {theme === 'dark' ? (
              <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Sun className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Moon className="h-4 w-4" />
              </motion.span>
            )}
          </AnimatePresence>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </Button>
      </div>
    </div>
  )
}
