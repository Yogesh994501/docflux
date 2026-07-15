'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useDocumentsQuery, formatBytes, formatRelativeTime,
} from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import { DocTypeBadge, StatusBadge, FraudRiskBadge } from '@/components/shared-badges'
import { DOCUMENT_TYPES, DOCUMENT_STATUSES, FRAUD_RISKS } from '@/lib/constants'
import { Search, FileText, ChevronLeft, ChevronRight, X, FileSearch } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { SpotlightCard, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion-primitives'

export function DocumentsSection() {
  const { search, statusFilter, typeFilter, fraudFilter, setSearch, setStatusFilter, setTypeFilter, setFraudFilter, resetFilters, openDetail } = useAppStore()
  const [page, setPage] = useState(1)
  const pageSize = 12
  const { data, isLoading } = useDocumentsQuery({ page, pageSize, search: search || undefined, status: statusFilter, documentType: typeFilter, fraudRisk: fraudFilter })
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = !!(search || statusFilter || typeFilter || fraudFilter)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <FadeInUp>
        <SpotlightCard className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by file name or OCR text…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} className="rounded-xl pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter ?? 'ALL'} onValueChange={(v) => { setPage(1); setTypeFilter(v === 'ALL' ? null : v) }}>
                <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All types</SelectItem>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter ?? 'ALL'} onValueChange={(v) => { setPage(1); setStatusFilter(v === 'ALL' ? null : v) }}>
                <SelectTrigger className="h-9 w-[130px] rounded-xl text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All statuses</SelectItem>
                  {DOCUMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fraudFilter ?? 'ALL'} onValueChange={(v) => { setPage(1); setFraudFilter(v === 'ALL' ? null : v) }}>
                <SelectTrigger className="h-9 w-[120px] rounded-xl text-xs"><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All risk</SelectItem>
                  {FRAUD_RISKS.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasFilters && <Button variant="ghost" size="sm" onClick={() => { resetFilters(); setPage(1) }} className="rounded-lg"><X className="mr-1.5 h-3.5 w-3.5" /> Clear</Button>}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">{total} document{total !== 1 ? 's' : ''}{hasFilters ? ' matching filters' : ' total'}</div>
        </SpotlightCard>
      </FadeInUp>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <SpotlightCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-2xl bg-muted p-4"><FileSearch className="h-8 w-8 text-muted-foreground" /></div>
          <div>
            <div className="text-sm font-medium">{hasFilters ? 'No documents match your filters' : 'No documents yet'}</div>
            <div className="text-xs text-muted-foreground">{hasFilters ? 'Try clearing filters' : 'Upload your first document to see it here'}</div>
          </div>
        </SpotlightCard>
      ) : (
        <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((doc) => (
            <StaggerItem key={doc.id}>
              <motion.button
                onClick={() => openDetail(doc.id)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="group flex w-full flex-col overflow-hidden rounded-2xl premium-card text-left"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {doc.fileType.startsWith('image/') ? (
                    <img src={doc.storagePath} alt={doc.fileName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"><FileText className="h-10 w-10" /><span className="text-[10px]">PDF</span></div>
                  )}
                  <div className="absolute right-2 top-2"><StatusBadge status={doc.status} /></div>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium" title={doc.fileName}>{doc.fileName}</span>
                    <DocTypeBadge type={doc.documentType} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{doc.vendor?.name ?? '—'}</div>
                  {doc.fraudRisk && doc.fraudRisk !== 'LOW' && <div className="mt-2"><FraudRiskBadge risk={doc.fraudRisk} /></div>}
                  <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                    <span>{formatRelativeTime(doc.uploadedAt)}</span>
                    <span>{formatBytes(doc.fileSize)}</span>
                  </div>
                </div>
              </motion.button>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg"><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg">Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
