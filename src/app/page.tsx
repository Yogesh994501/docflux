'use client'

import { AppShell } from '@/components/app-shell'
import { AuthScreen } from '@/components/auth-screen'
import { DashboardSection } from '@/components/sections/dashboard'
import { UploadSection } from '@/components/sections/upload'
import { DocumentsSection } from '@/components/sections/documents'
import { ApprovalsSection } from '@/components/sections/approvals'
import { VendorsSection } from '@/components/sections/vendors'
import { AnalyticsSection } from '@/components/sections/analytics'
import { CopilotSection } from '@/components/sections/copilot'
import { ProfileSection } from '@/components/sections/profile'
import { DocumentDetailModal } from '@/components/document-detail-modal'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/components/auth-provider'
import { ScanLine } from 'lucide-react'

export default function Home() {
  const section = useAppStore((s) => s.section)
  const { user, loading } = useAuth()

  // Loading state — minimal branded splash
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg animate-pulse">
          <ScanLine className="h-6 w-6" />
        </div>
      </div>
    )
  }

  // Not authenticated — show login/signup
  if (!user) {
    return <AuthScreen />
  }

  return (
    <AppShell>
      {section === 'dashboard' && <DashboardSection />}
      {section === 'upload' && <UploadSection />}
      {section === 'documents' && <DocumentsSection />}
      {section === 'approvals' && <ApprovalsSection />}
      {section === 'vendors' && <VendorsSection />}
      {section === 'analytics' && <AnalyticsSection />}
      {section === 'copilot' && <CopilotSection />}
      {section === 'profile' && <ProfileSection />}

      {/* Global detail modal — any section can open it */}
      <DocumentDetailModal />
    </AppShell>
  )
}
