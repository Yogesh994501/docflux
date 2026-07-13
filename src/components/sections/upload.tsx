'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  useUploadMutation,
  formatBytes,
  formatRelativeTime,
  parseExtractedData,
  type DocumentItem,
} from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import { DocTypeBadge, StatusBadge, FraudRiskBadge } from '@/components/shared-badges'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
  ScanLine,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface UploadItem {
  id: string
  file: File
  previewUrl: string
  status: 'uploading' | 'processing' | 'done' | 'error'
  doc?: DocumentItem
  error?: string
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,application/pdf'

export function UploadSection() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMut = useUploadMutation()
  const { openDetail } = useAppStore()

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files)
      for (const file of arr) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10 MB`)
          continue
        }
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        const item: UploadItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl,
          status: 'uploading',
        }
        setItems((prev) => [item, ...prev])

        uploadMut.mutate(file, {
          onSuccess: (doc) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'done', doc }
                  : it,
              ),
            )
            toast.success(`"${file.name}" processed — ${doc.documentType ?? 'UNKNOWN'}`)
          },
          onError: (e) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'error', error: e.message }
                  : it,
              ),
            )
            toast.error(`Failed to process "${file.name}"`)
          },
        })
      }
    },
    [uploadMut],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((it) => it.id !== id)
    })
  }

  const clearAll = () => {
    items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl))
    setItems([])
  }

  return (
    <div className="space-y-6">
      {/* Hero dropzone */}
      <Card>
        <CardContent className="p-0">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all sm:p-16 ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UploadCloud className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              Drop documents here, or click to browse
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Upload receipts, GST invoices, government IDs (PAN/Aadhaar), utility bills,
              purchase orders, delivery challans, bank statements and more. AI extracts
              text &amp; structured fields in seconds.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {['JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'PDF'].map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {f}
                </span>
              ))}
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Max 10 MB
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: ScanLine, title: '1. Upload', desc: 'Drop an image or PDF of any document' },
          { icon: Sparkles, title: '2. AI OCR + Parse', desc: 'Vision model reads text & extracts structured fields' },
          { icon: CheckCircle2, title: '3. Review & Approve', desc: 'Verify extracted data, then approve or reject' },
        ].map((s) => (
          <Card key={s.title}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload queue */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Processing Queue</CardTitle>
              <CardDescription>
                {items.filter((i) => i.status === 'uploading').length} in progress ·{' '}
                {items.filter((i) => i.status === 'done').length} completed ·{' '}
                {items.filter((i) => i.status === 'error').length} failed
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <UploadRow key={item.id} item={item} onRemove={removeItem} onOpen={openDetail} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UploadRow({
  item,
  onRemove,
  onOpen,
}: {
  item: UploadItem
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}) {
  const ext = item.doc ? parseExtractedData(item.doc.extractedData) : null

  return (
    <div className="flex gap-4 rounded-lg border border-border p-3">
      {/* Thumbnail */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <FileText className="h-8 w-8" />
          </div>
        )}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
          {item.status === 'done' && item.doc && (
            <div className="flex shrink-0 gap-1.5">
              <DocTypeBadge type={item.doc.documentType} />
              <StatusBadge status={item.doc.status} />
              {item.doc.fraudRisk && item.doc.fraudRisk !== 'LOW' && (
                <FraudRiskBadge risk={item.doc.fraudRisk} />
              )}
            </div>
          )}
        </div>

        {/* Status line */}
        <div className="mt-1 text-xs">
          {item.status === 'uploading' && (
            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running OCR & extracting fields…
            </span>
          )}
          {item.status === 'done' && item.doc && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Processed · confidence {item.doc.ocrConfidence ? `${(item.doc.ocrConfidence * 100).toFixed(0)}%` : '—'} · {formatRelativeTime(item.doc.uploadedAt)}
            </span>
          )}
          {item.status === 'error' && (
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <XCircle className="h-3 w-3" />
              {item.error ?? 'Failed to process'}
            </span>
          )}
        </div>

        {/* Extracted fields preview */}
        {item.status === 'done' && item.doc && ext && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {ext.vendorName && (
              <div>
                <span className="text-muted-foreground">Vendor:</span>{' '}
                <span className="font-medium">{ext.vendorName}</span>
              </div>
            )}
            {ext.invoiceNumber && (
              <div>
                <span className="text-muted-foreground">Invoice #:</span>{' '}
                <span className="font-medium">{ext.invoiceNumber}</span>
              </div>
            )}
            {ext.totalAmount && (
              <div>
                <span className="text-muted-foreground">Total:</span>{' '}
                <span className="font-medium">{ext.currency ?? '₹'}{ext.totalAmount}</span>
              </div>
            )}
            {ext.idNumber && (
              <div>
                <span className="text-muted-foreground">{ext.idType ?? 'ID'}:</span>{' '}
                <span className="font-medium">{ext.idNumber}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-start gap-1">
        {item.status === 'done' && item.doc && (
          <Button size="sm" variant="outline" onClick={() => onOpen(item.doc!.id)}>
            View detail
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
