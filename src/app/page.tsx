'use client'

import { AppShell } from '@/components/app-shell'
import { DashboardSection } from '@/components/sections/dashboard'
import { UploadSection } from '@/components/sections/upload'
import { DocumentsSection } from '@/components/sections/documents'
import { ApprovalsSection } from '@/components/sections/approvals'
import { VendorsSection } from '@/components/sections/vendors'
import { AnalyticsSection } from '@/components/sections/analytics'
import { CopilotSection } from '@/components/sections/copilot'
import { DocumentDetailModal } from '@/components/document-detail-modal'
import { useAppStore } from '@/lib/store'

export default function Home() {
  const section = useAppStore((s) => s.section)

  return (
    <AppShell>
      {section === 'dashboard' && <DashboardSection />}
      {section === 'upload' && <UploadSection />}
      {section === 'documents' && <DocumentsSection />}
      {section === 'approvals' && <ApprovalsSection />}
      {section === 'vendors' && <VendorsSection />}
      {section === 'analytics' && <AnalyticsSection />}
      {section === 'copilot' && <CopilotSection />}

      {/* Global detail modal — any section can open it */}
      <DocumentDetailModal />
    </AppShell>
  )
}
