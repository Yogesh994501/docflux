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
  UserCircle,
  SplitSquareHorizontal,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { motion } from 'framer-motion'

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload & Scan', icon: Upload },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
  { id: 'vendors', label: 'Vendors', icon: Building2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'extraction', label: 'Extraction Workbench', icon: SplitSquareHorizontal },
  { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: UserCircle },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection } = useAppStore()
  const { user } = useAuth()

  return (
    <div className="flex h-full flex-col bg-brand-navy-950">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center rounded-xl"
        >
          <img src="/logo.jpeg" alt="" className="h-8 w-auto aspect-square object-contain" />
        </motion.div>
        <div className="leading-tight">
          <div className="font-serif font-semibold tracking-wide text-lg text-white">DocFlux</div>
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
                'group relative flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-sm transition-all duration-150',
                active
                  ? 'bg-brand-terracotta-tint border-l-4 border-brand-terracotta text-brand-navy-950 font-medium shadow-sm'
                  : 'text-[#8A95A8] hover:bg-brand-cream/10 hover:text-white',
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-brand-terracotta' : 'text-[#8A95A8] group-hover:text-white')} />
              <div className="min-w-0 flex-1 text-left">
                <div className="font-sans text-sm tracking-wide">{item.label}</div>
              </div>
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
              'flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all border-brand-navy-800 bg-brand-navy-900/50 hover:bg-brand-navy-800 text-white',
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-terracotta text-xs font-semibold text-white">
              {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user.name}</div>
              <div className="truncate text-[10px] text-brand-navy-700/70 text-gray-400">{user.email}</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-navy-700/60" />
          </button>
        </div>
      )}
    </div>
  )
}
