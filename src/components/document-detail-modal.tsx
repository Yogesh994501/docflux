'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  useDocumentQuery,
  useApproveMutation,
  useRejectMutation,
  useReprocessMutation,
  useDeleteDocumentMutation,
  useUpdateDocumentMutation,
  parseExtractedData,
  formatBytes,
  formatRelativeTime,
  type ExtractedData,
  type DocumentItem,
} from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import {
  DocTypeBadge,
  StatusBadge,
  FraudRiskBadge,
} from '@/components/shared-badges'
import { DOCUMENT_TYPES, FRAUD_RISKS } from '@/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Save,
  FileText,
  Image as ImageIcon,
  History,
  AlertTriangle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function DocumentDetailModal() {
  const { detailDocId, closeDetail } = useAppStore()
  const { data: doc, isLoading } = useDocumentQuery(detailDocId)

  return (
    <Dialog open={!!detailDocId} onOpenChange={(o) => !o && closeDetail()}>
      <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-brand-cream border-brand-cream-border">
        <DialogHeader className="px-6 py-4 border-b border-brand-cream-border bg-white">
          <DialogTitle className="flex items-center gap-3 flex-wrap text-base">
            <FileText className="h-4.5 w-4.5 text-primary" />
            <span className="truncate">{doc?.fileName ?? 'Loading…'}</span>
            {doc && <DocTypeBadge type={doc.documentType} />}
            {doc && <StatusBadge status={doc.status} />}
            {doc && <FraudRiskBadge risk={doc.fraudRisk} />}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {doc &&
              `${formatBytes(doc.fileSize)} · ${doc.fileType} · uploaded ${formatRelativeTime(doc.uploadedAt)}` +
                (doc.ocrConfidence ? ` · OCR confidence ${(doc.ocrConfidence * 100).toFixed(0)}%` : '')}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !doc ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading document…
          </div>
        ) : (
          // Keyed remount: state re-initializes cleanly when switching documents
          <DetailBody key={doc.id} doc={doc} onClose={closeDetail} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailBody({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const approve = useApproveMutation()
  const reject = useRejectMutation()
  const reprocess = useReprocessMutation()
  const del = useDeleteDocumentMutation()
  const update = useUpdateDocumentMutation()

  // Initialise edit state from the doc — runs once per remount (keyed by doc.id)
  const ext = parseExtractedData(doc.extractedData)
  const initialFields: Record<string, string> = {}
  if (ext) {
    for (const [k, v] of Object.entries(ext)) {
      if (typeof v === 'string' || typeof v === 'number') initialFields[k] = String(v ?? '')
    }
  }

  const [comments, setComments] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editedType, setEditedType] = useState<string>(doc.documentType ?? 'UNKNOWN')
  const [editedRisk, setEditedRisk] = useState<string>(doc.fraudRisk ?? 'LOW')
  const [editedFields, setEditedFields] = useState<Record<string, string>>(initialFields)

  const handleApprove = () => {
    approve.mutate(
      { id: doc.id, comments },
      {
        onSuccess: () => { toast.success('Document approved'); onClose() },
        onError: (e) => toast.error('Approve failed: ' + e.message),
      },
    )
  }

  const handleReject = () => {
    reject.mutate(
      { id: doc.id, comments },
      {
        onSuccess: () => { toast.success('Document rejected'); onClose() },
        onError: (e) => toast.error('Reject failed: ' + e.message),
      },
    )
  }

  const handleReprocess = () => {
    reprocess.mutate(doc.id, {
      onSuccess: () => toast.success('Re-extraction complete'),
      onError: (e) => toast.error('Reprocess failed: ' + e.message),
    })
  }

  const handleDelete = () => {
    del.mutate(doc.id, {
      onSuccess: () => { toast.success('Document deleted'); onClose() },
      onError: (e) => toast.error('Delete failed: ' + e.message),
    })
  }

  const handleSaveEdits = () => {
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editedFields)) {
      if (v !== '') patch[k] = v
    }
    update.mutate(
      {
        id: doc.id,
        body: {
          documentType: editedType,
          fraudRisk: editedRisk,
          extractedDataPatch: patch,
        },
      },
      {
        onSuccess: () => { toast.success('Saved'); setEditMode(false) },
        onError: (e) => toast.error('Save failed: ' + e.message),
      },
    )
  }

  return (
    <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden bg-white min-h-0">
      <div className="border-b border-brand-cream-border px-6 py-2 bg-brand-cream/30">
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="ocr" className="text-xs">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> OCR Text
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">
            <History className="mr-1.5 h-3.5 w-3.5" /> Audit Trail
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {/* ── Overview tab ───────────────────────────────────── */}
        <TabsContent value="overview" className="m-0 p-6 flex-1 flex flex-col min-h-0">
          <div className="grid gap-6 lg:grid-cols-2 h-full min-h-0">
            {/* Document image column */}
            <div className="flex flex-col h-full min-h-0">
              <div className="mb-2 text-sm font-serif font-semibold text-brand-navy-900 shrink-0">
                Document Preview
              </div>
              <div className="relative flex-1 overflow-hidden rounded-[14px] border border-brand-cream-border bg-brand-cream/50 shadow-editorial">
                {doc.fileType.startsWith('image/') ? (
                  <img
                    src={doc.storagePath}
                    alt={doc.fileName}
                    className="absolute inset-0 h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <FileText className="h-16 w-16" />
                    <span className="text-sm">PDF document</span>
                    <a
                      href={doc.storagePath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                )}
              </div>

              {ext?.fraudIndicators && ext.fraudIndicators.length > 0 && (
                <div className="mt-4 shrink-0 rounded-[14px] border border-brand-amber/30 bg-brand-amber-tint p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Fraud Indicators
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">
                    {ext.fraudIndicators.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Extracted fields column */}
            <div className="flex flex-col h-full min-h-0">
              <div className="mb-2 flex items-center justify-between shrink-0">
                <span className="text-sm font-serif font-semibold text-brand-navy-900">
                  Extracted Fields
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditMode((m) => !m)}
                    className="h-7 text-xs"
                  >
                    {editMode ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReprocess}
                    disabled={reprocess.isPending}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${reprocess.isPending ? 'animate-spin' : ''}`} />
                    Re-extract
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scroll pr-3 pb-6">
                {editMode ? (
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Document Type</Label>
                        <Select value={editedType} onValueChange={setEditedType}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fraud Risk</Label>
                        <Select value={editedRisk} onValueChange={setEditedRisk}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FRAUD_RISKS.map((r) => (
                              <SelectItem key={r.value} value={r.value} className="text-xs">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(editedFields)
                        .filter(([k]) => !['lineItems', 'fraudIndicators', 'fraudRisk', 'documentType'].includes(k))
                        .map(([k, v]) => (
                          <div key={k}>
                            <Label className="text-xs capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</Label>
                            <Input
                              className="h-8 text-xs"
                              value={v}
                              onChange={(e) =>
                                setEditedFields((prev) => ({ ...prev, [k]: e.target.value }))
                              }
                            />
                          </div>
                        ))}
                    </div>
                    <Button size="sm" onClick={handleSaveEdits} disabled={update.isPending} className="w-full mt-2">
                      <Save className="mr-1.5 h-3.5 w-3.5" /> Save changes
                    </Button>
                  </div>
                ) : (
                  <ExtractedFieldsView ext={ext} />
                )}

                {/* Approval bar */}
                {doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && (
                  <div className="mt-6 rounded-[14px] border border-brand-cream-border bg-white shadow-editorial p-4">
                    <Label className="text-xs font-semibold">Approval comments</Label>
                    <Textarea
                      className="mt-1.5 min-h-[60px] text-sm"
                      placeholder="Optional comment (e.g. verified against PO #123)"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={handleApprove} disabled={approve.isPending} size="sm" className="bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-[8px]">
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        {approve.isPending ? 'Approving…' : 'Approve'}
                      </Button>
                      <Button onClick={handleReject} disabled={reject.isPending} size="sm" variant="outline" className="text-brand-navy-900 border-brand-cream-border hover:bg-brand-cream rounded-[8px]">
                        <XCircle className="mr-1.5 h-4 w-4" />
                        {reject.isPending ? 'Rejecting…' : 'Reject'}
                      </Button>
                      <Button
                        onClick={handleDelete}
                        disabled={del.isPending}
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}

                {(doc.status === 'APPROVED' || doc.status === 'REJECTED') && (
                  <div className="mt-6 rounded-[14px] border border-brand-cream-border bg-brand-cream/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {doc.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {doc.approvedBy ?? '—'}
                        </div>
                        {doc.approvalComments && (
                          <p className="mt-1 text-sm">{doc.approvalComments}</p>
                        )}
                      </div>
                      <Button
                        onClick={handleDelete}
                        disabled={del.isPending}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── OCR tab ───────────────────────────────────────── */}
        <TabsContent value="ocr" className="m-0 p-6 flex-1 overflow-y-auto custom-scroll min-h-0">
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
            {doc.ocrText ?? 'No OCR text available.'}
          </pre>
        </TabsContent>

        {/* ── Audit tab ─────────────────────────────────────── */}
        <TabsContent value="audit" className="m-0 p-6 flex-1 overflow-y-auto custom-scroll min-h-0">
          <div className="space-y-3">
            {(doc.auditLogs ?? []).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{log.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>
                  {log.details && (
                    <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(log.details), null, 2) }
                        catch { return log.details }
                      })()}
                    </pre>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    by {log.actor ?? 'system'}
                  </div>
                </div>
              </div>
            ))}
            {(!doc.auditLogs || doc.auditLogs.length === 0) && (
              <div className="text-sm text-muted-foreground">No audit entries.</div>
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}

function ExtractedFieldsView({ ext }: { ext: ExtractedData | null }) {
  if (!ext) {
    return <div className="text-sm text-muted-foreground">No extracted data.</div>
  }

  const groups: { title: string; fields: [string, string | undefined][] }[] = []

  const isGovtId = ext.documentType === 'GOVT_ID'
  const isBank = ext.documentType === 'BANK_STATEMENT'

  if (isGovtId) {
    groups.push({
      title: 'Identity',
      fields: [
        ['ID Type', ext.idType],
        ['ID Number', ext.idNumber],
        ['Holder Name', ext.idHolderName],
        ['Date of Birth', ext.idDateOfBirth],
      ],
    })
  } else if (isBank) {
    groups.push({
      title: 'Bank Details',
      fields: [
        ['Bank Name', ext.bankName],
        ['Account Number', ext.accountNumber],
        ['IFSC Code', ext.ifscCode],
        ['Statement Period', ext.statementPeriod],
      ],
    })
  } else {
    groups.push({
      title: 'Vendor / Issuer',
      fields: [
        ['Name', ext.vendorName],
        ['GSTIN', ext.vendorGstin],
        ['Address', ext.vendorAddress],
        ['Phone', ext.vendorPhone],
        ['Email', ext.vendorEmail],
      ],
    })
    if (ext.customerName || ext.customerGstin) {
      groups.push({
        title: 'Customer / Bill To',
        fields: [
          ['Name', ext.customerName],
          ['GSTIN', ext.customerGstin],
          ['Address', ext.customerAddress],
        ],
      })
    }
    groups.push({
      title: 'Document Details',
      fields: [
        ['Invoice #', ext.invoiceNumber],
        ['PO Number', ext.poNumber],
        ['Challan #', ext.deliveryChallanNumber],
        ['Invoice Date', ext.invoiceDate],
        ['Due Date', ext.dueDate],
        ['Payment Method', ext.paymentMethod],
      ],
    })
    groups.push({
      title: 'Amounts',
      fields: [
        ['Currency', ext.currency],
        ['Subtotal', ext.subtotal],
        ['Tax', ext.taxAmount],
        ['CGST', ext.cgst],
        ['SGST', ext.sgst],
        ['IGST', ext.igst],
        ['Total', ext.totalAmount],
      ],
    })
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const visible = g.fields.filter(([, v]) => v !== undefined && v !== '')
        if (visible.length === 0) return null
        return (
          <div key={g.title}>
            <div className="mb-2 text-sm font-serif font-semibold text-brand-navy-900">
              {g.title}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[8px] border border-brand-cream-border bg-white shadow-sm p-3">
              {visible.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  <div className="truncate text-sm font-medium" title={value}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {ext.lineItems && ext.lineItems.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Line Items ({ext.lineItems.length})
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Description</th>
                  <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                  <th className="px-2 py-1.5 text-right font-medium">Rate</th>
                  <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ext.lineItems.map((item, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1.5">{item.description}</td>
                    <td className="px-2 py-1.5 text-right">{String(item.quantity ?? '')}</td>
                    <td className="px-2 py-1.5 text-right">{String(item.rate ?? '')}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{String(item.amount ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
