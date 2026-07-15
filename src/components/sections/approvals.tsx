'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDocumentsQuery, useApproveMutation, useRejectMutation, parseExtractedData, formatRelativeTime, type DocumentItem,
} from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import { DocTypeBadge, FraudRiskBadge } from '@/components/shared-badges'
import { CheckCircle2, XCircle, FileText, Clock, AlertTriangle, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { SpotlightCard, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion-primitives'

export function ApprovalsSection() {
  const { data, isLoading } = useDocumentsQuery({ page: 1, pageSize: 50, status: 'EXTRACTED' })
  const items = data?.items ?? []
  const approve = useApproveMutation()
  const reject = useRejectMutation()
  const { openDetail } = useAppStore()

  const handleApprove = (doc: DocumentItem, comments: string) => {
    approve.mutate({ id: doc.id, comments }, { onSuccess: () => toast.success(`Approved "${doc.fileName}"`), onError: (e) => toast.error('Approve failed: ' + e.message) })
  }
  const handleReject = (doc: DocumentItem, comments: string) => {
    reject.mutate({ id: doc.id, comments }, { onSuccess: () => toast.success(`Rejected "${doc.fileName}"`), onError: (e) => toast.error('Reject failed: ' + e.message) })
  }

  return (
    <div className="space-y-4">
      <FadeInUp>
        <SpotlightCard className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{items.length} document{items.length !== 1 ? 's' : ''} awaiting review</div>
            <div className="text-xs text-muted-foreground">Approve or reject each one — comments are logged to the audit trail</div>
          </div>
        </SpotlightCard>
      </FadeInUp>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <SpotlightCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-2xl bg-emerald-100 p-4 dark:bg-emerald-950"><Inbox className="h-8 w-8 text-emerald-600 dark:text-emerald-400" /></div>
          <div><div className="text-sm font-medium">All caught up!</div><div className="text-xs text-muted-foreground">No documents pending approval</div></div>
        </SpotlightCard>
      ) : (
        <StaggerContainer className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence>
            {items.map((doc) => (
              <StaggerItem key={doc.id}>
                <ApprovalCard doc={doc} approving={approve.isPending} rejecting={reject.isPending} onApprove={(c) => handleApprove(doc, c)} onReject={(c) => handleReject(doc, c)} onOpen={() => openDetail(doc.id)} />
              </StaggerItem>
            ))}
          </AnimatePresence>
        </StaggerContainer>
      )}
    </div>
  )
}

function ApprovalCard({ doc, approving, rejecting, onApprove, onReject, onOpen }: { doc: DocumentItem; approving: boolean; rejecting: boolean; onApprove: (c: string) => void; onReject: (c: string) => void; onOpen: () => void }) {
  const ext = parseExtractedData(doc.extractedData)
  const [comments, setComments] = useState('')
  const [expanded, setExpanded] = useState(false)
  const isHigh = doc.fraudRisk === 'HIGH'

  return (
    <SpotlightCard className={`p-4 ${isHigh ? 'ring-1 ring-rose-200 dark:ring-rose-900' : ''}`}>
      <div className="flex gap-3">
        <button onClick={onOpen} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
          {doc.fileType.startsWith('image/') ? <img src={doc.storagePath} alt={doc.fileName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><FileText className="h-8 w-8" /></div>}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button onClick={onOpen} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium hover:underline" title={doc.fileName}>{doc.fileName}</div>
              <div className="truncate text-xs text-muted-foreground">{ext?.vendorName ?? doc.vendor?.name ?? '—'}</div>
            </button>
            <div className="flex shrink-0 gap-1">
              <DocTypeBadge type={doc.documentType} />
              {doc.fraudRisk && doc.fraudRisk !== 'LOW' && <FraudRiskBadge risk={doc.fraudRisk} />}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {ext?.invoiceNumber && <div><span className="text-muted-foreground">Invoice:</span> <span className="font-medium">{ext.invoiceNumber}</span></div>}
            {ext?.invoiceDate && <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{ext.invoiceDate}</span></div>}
            {ext?.vendorGstin && <div className="col-span-2"><span className="text-muted-foreground">GSTIN:</span> <span className="font-mono text-[11px] font-medium">{ext.vendorGstin}</span></div>}
            {ext?.totalAmount && <div className="col-span-2 mt-0.5"><span className="text-[11px] text-muted-foreground">Total:</span> <span className="text-lg font-semibold tracking-tight">{ext.currency ?? '₹'}{ext.totalAmount}</span></div>}
            {ext?.idNumber && <div className="col-span-2 mt-0.5"><span className="text-[11px] text-muted-foreground">{ext.idType ?? 'ID'}:</span> <span className="text-lg font-semibold tracking-tight">{ext.idNumber}</span></div>}
          </div>
          {ext?.fraudIndicators && ext.fraudIndicators.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3 w-3" /> Flagged</div>
              <ul className="mt-0.5 list-disc pl-4 text-[11px] text-amber-700 dark:text-amber-300">{ext.fraudIndicators.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}
          {expanded && <Textarea className="mt-2 min-h-[50px] rounded-xl text-xs" placeholder="Optional comment…" value={comments} onChange={(e) => setComments(e.target.value)} />}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => onApprove(comments)} disabled={approving || rejecting} className="rounded-lg"><CheckCircle2 className="mr-1.5 h-4 w-4" />{approving ? '…' : 'Approve'}</Button>
            <Button size="sm" variant="destructive" onClick={() => onReject(comments)} disabled={approving || rejecting} className="rounded-lg"><XCircle className="mr-1.5 h-4 w-4" />{rejecting ? '…' : 'Reject'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded((e) => !e)} className="ml-auto rounded-lg">{expanded ? 'Hide' : 'Comment'}</Button>
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">{formatRelativeTime(doc.uploadedAt)}{doc.ocrConfidence ? ` · ${(doc.ocrConfidence * 100).toFixed(0)}% OCR` : ''}</div>
        </div>
      </div>
    </SpotlightCard>
  )
}
