'use client'

import { useState, useCallback, useRef } from 'react'
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
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  ScanLine,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { SpotlightCard, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion-primitives'
import { OcrProcessingOverlay } from '@/components/ocr-processing-overlay'

interface UploadItem {
  id: string
  file: File
  previewUrl: string
  status: 'uploading' | 'done' | 'error'
  doc?: DocumentItem
  error?: string
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,application/pdf'

export function UploadSection() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMut = useUploadMutation()
  const { openDetail, setSection } = useAppStore()

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files)
      for (const file of arr) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10 MB`)
          continue
        }
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        const item: UploadItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, previewUrl, status: 'uploading' }
        setItems((prev) => [item, ...prev])

        uploadMut.mutate(file, {
          onSuccess: (doc) => {
            setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: 'done', doc } : it)))
            toast.success(`"${file.name}" processed — ${doc.documentType ?? 'UNKNOWN'}`)
          },
          onError: (e) => {
            setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: 'error', error: e.message } : it)))
            toast.error(`Failed to process "${file.name}"`)
          },
        })
      }
    },
    [uploadMut],
  )

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files) }, [handleFiles])

  const removeItem = (id: string) => {
    setItems((prev) => { const item = prev.find((it) => it.id === id); if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl); return prev.filter((it) => it.id !== id) })
  }

  // The most recent uploading item — drives the full-screen OCR overlay
  const activeItem = items.find((it) => it.status === 'uploading')

  return (
    <div className="space-y-6">
      {/* Full-screen Strands OCR engagement overlay */}
      <AnimatePresence>
        {activeItem && (
          <OcrProcessingOverlay
            fileName={activeItem.file.name}
            fileSize={activeItem.file.size}
            previewUrl={activeItem.previewUrl}
            fileType={activeItem.file.type}
          />
        )}
      </AnimatePresence>
      {/* Hero dropzone */}
      <FadeInUp>
        <div className="grid md:grid-cols-5 gap-8 items-center">
          <SpotlightCard className="p-0 overflow-hidden md:col-span-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl p-10 text-center transition-all sm:p-16 ${dragOver ? 'bg-brand-cream' : ''}`}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }} />
              <motion.div
                animate={{ y: dragOver ? -4 : 0 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-[14px] bg-brand-terracotta-tint text-brand-terracotta shadow-sm"
              >
                <UploadCloud className="h-7 w-7" />
              </motion.div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              Drop documents here, or <span className="underline decoration-foreground/30 underline-offset-4">browse</span>
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
              Upload receipts, GST invoices, government IDs, utility bills, purchase orders, delivery challans, bank statements — AI extracts text & fields instantly.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
              {['JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'PDF'].map((f) => (
                <span key={f} className="rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{f}</span>
              ))}
              <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">Max 10 MB</span>
            </div>
            </div>
          </SpotlightCard>
          <div className="hidden md:block md:col-span-2 relative h-full min-h-[250px]">
            <img 
              src="/brand/mobile-capture.jpeg" 
              alt="Mobile scanning" 
              className="absolute inset-0 w-full h-full object-cover rounded-[14px] shadow-editorial"
            />
          </div>
        </div>
      </FadeInUp>

      {/* How it works */}
      <StaggerContainer className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ScanLine, title: '1 · Upload', desc: 'Drop an image or PDF of any document' },
          { icon: Sparkles, title: '2 · AI OCR + Parse', desc: 'Vision model reads text & extracts fields' },
          { icon: CheckCircle2, title: '3 · Review & Approve', desc: 'Verify data, then approve or reject' },
        ].map((s) => (
          <StaggerItem key={s.title}>
            <SpotlightCard className="p-4 h-full">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-navy-900 border border-brand-cream-border">
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold font-serif text-brand-navy-900">{s.title}</div>
                  <div className="text-xs text-brand-navy-700">{s.desc}</div>
                </div>
              </div>
            </SpotlightCard>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Upload queue */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <SpotlightCard className="p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold">Processing Queue</div>
                  <div className="text-xs text-muted-foreground">
                    {items.filter((i) => i.status === 'uploading').length} in progress · {items.filter((i) => i.status === 'done').length} completed · {items.filter((i) => i.status === 'error').length} failed
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl)); setItems([]) }} className="rounded-lg">
                  Clear all
                </Button>
              </div>
              <div className="divide-y divide-border/40">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <UploadRow item={item} onRemove={removeItem} onOpen={openDetail} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA to documents */}
      {items.length === 0 && (
        <FadeInUp delay={0.3}>
          <div className="flex items-center justify-center">
            <Button variant="outline" size="sm" onClick={() => setSection('documents')} className="rounded-lg">
              View all documents <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </FadeInUp>
      )}
    </div>
  )
}

function UploadRow({ item, onRemove, onOpen }: { item: UploadItem; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  const ext = item.doc ? parseExtractedData(item.doc.extractedData) : null
  return (
    <div className="flex gap-4 p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><FileText className="h-6 w-6" /></div>
        )}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-4 w-4 animate-spin text-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
          {item.status === 'done' && item.doc && (
            <div className="flex shrink-0 gap-1">
              <DocTypeBadge type={item.doc.documentType} />
              {item.doc.fraudRisk && item.doc.fraudRisk !== 'LOW' && <FraudRiskBadge risk={item.doc.fraudRisk} />}
            </div>
          )}
        </div>
        <div className="mt-1 text-xs">
          {item.status === 'uploading' && <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Running OCR & extracting fields…</span>}
          {item.status === 'done' && item.doc && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Processed · {item.doc.ocrConfidence ? `${(item.doc.ocrConfidence * 100).toFixed(0)}% confidence` : ''} · {formatRelativeTime(item.doc.uploadedAt)}
            </span>
          )}
          {item.status === 'error' && <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><XCircle className="h-3 w-3" /> {item.error ?? 'Failed'}</span>}
        </div>
        {item.status === 'done' && item.doc && ext && (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            {ext.vendorName && <div><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{ext.vendorName}</span></div>}
            {ext.invoiceNumber && <div><span className="text-muted-foreground">Invoice:</span> <span className="font-medium">{ext.invoiceNumber}</span></div>}
            {ext.totalAmount && <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{ext.currency ?? '₹'}{ext.totalAmount}</span></div>}
            {ext.idNumber && <div><span className="text-muted-foreground">{ext.idType ?? 'ID'}:</span> <span className="font-medium">{ext.idNumber}</span></div>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1">
        {item.status === 'done' && item.doc && (
          <Button size="sm" variant="outline" onClick={() => onOpen(item.doc!.id)} className="rounded-lg">View</Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)} className="h-8 w-8 rounded-lg"><X className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}
