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
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload & Scan', icon: Upload },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
  { id: 'vendors', label: 'Vendors / CRM', icon: Building2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection } = useAppStore()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight">AutoFinDocs</div>
          <div className="text-[11px] text-muted-foreground">OCR & Document Parsing</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-1">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        {NAV.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id)
                onNavigate?.()
              }}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? '' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground')} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </Button>
      </div>
    </div>
  )
}
