'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStatusQuery } from '@/lib/queries'
import {
  User as UserIcon,
  Mail,
  LogOut,
  Save,
  Database,
  Cpu,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SpotlightCard, FadeInUp } from '@/components/motion-primitives'
import { toast } from 'sonner'

export function ProfileSection() {
  const { user, logout, updateProfile } = useAuth()
  const { data: status } = useStatusQuery()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ name })
      toast.success('Profile updated')
    } catch (e) {
      toast.error((e as Error).message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
  }

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile header */}
      <FadeInUp>
        <SpotlightCard className="overflow-hidden p-0 border-brand-cream-border">
          <div className="h-48 w-full">
            <img 
              src="/brand/team-collab.jpeg" 
              alt="Team" 
              className="h-full w-full object-cover object-[center_30%]"
            />
          </div>
          <div className="flex items-center gap-5 p-6 bg-white">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-brand-navy-900 text-xl font-serif text-white shadow-sm border-2 border-white -mt-12 relative z-10">
              {initials}
            </div>
            <div className="min-w-0 flex-1 pt-2">
              <h2 className="truncate text-xl font-serif tracking-wide text-brand-navy-900">{user.name}</h2>
              <p className="truncate text-sm text-brand-navy-700">{user.email}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="flex items-center gap-1 rounded-[4px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Active
                </span>
                <span className="rounded-[4px] bg-brand-cream border border-brand-cream-border px-2 py-0.5 text-[10px] font-medium text-brand-navy-700 capitalize">
                  {user.provider} auth
                </span>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </FadeInUp>

      {/* Edit profile */}
      <FadeInUp delay={0.1}>
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Edit profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="rounded-xl bg-muted/50 pl-9 text-muted-foreground"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button onClick={handleSave} disabled={saving || name === user.name} className="rounded-xl">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </SpotlightCard>
      </FadeInUp>

      {/* System info */}
      <FadeInUp delay={0.2}>
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">System configuration</h3>
          </div>

          {/* Test mode banner */}
          {status?.authDisabled && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs">
                <div className="font-semibold text-amber-700 dark:text-amber-300">Test mode — auth disabled</div>
                <div className="mt-0.5 text-amber-700/80 dark:text-amber-300/80">
                  Login/signup is bypassed. Set <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-900/60">AUTH_DISABLED=false</code> in <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-900/60">.env</code> to re-enable authentication.
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[8px] border border-brand-cream-border bg-brand-cream/50 p-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">Database</div>
                  <div className="text-[11px] text-muted-foreground">Where your documents are stored</div>
                </div>
              </div>
              <span className="rounded-[4px] bg-white border border-brand-cream-border px-2.5 py-0.5 text-xs font-medium capitalize text-brand-navy-900">
                {status?.database ?? 'sqlite'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[8px] border border-brand-cream-border bg-brand-cream/50 p-3">
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">OCR Engine</div>
                  <div className="text-[11px] text-muted-foreground">Vision model reading your docs</div>
                </div>
              </div>
              <span className="rounded-[4px] bg-white border border-brand-cream-border px-2.5 py-0.5 text-xs font-medium text-brand-navy-900">
                {status?.ocr === 'gemini' ? `Gemini ${status.geminiModel?.replace('gemini-', '')}` : 'GLM-4.6V'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[8px] border border-brand-cream-border bg-brand-cream/50 p-3">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">Auth Provider</div>
                  <div className="text-[11px] text-muted-foreground">How accounts & sessions are managed</div>
                </div>
              </div>
              <span className="rounded-[4px] bg-white border border-brand-cream-border px-2.5 py-0.5 text-xs font-medium capitalize text-brand-navy-900">
                {user.provider}
              </span>
            </div>
          </div>
        </SpotlightCard>
      </FadeInUp>

      {/* Danger zone */}
      <FadeInUp delay={0.3}>
        <SpotlightCard className="p-6">
          <h3 className="mb-1 text-sm font-semibold">Session</h3>
          <p className="mb-4 text-xs text-muted-foreground">Sign out from this device</p>
          <Button variant="outline" onClick={handleLogout} className="rounded-xl text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </SpotlightCard>
      </FadeInUp>
    </div>
  )
}
