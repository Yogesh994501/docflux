'use client'

/**
 * OcrProcessingOverlay — full-screen fluid glass experience shown while a
 * document is being OCR'd. Uses the <Strands /> WebGL component as a
 * captivating animated background so the user stays engaged until extraction
 * completes (typically 5–30s for the vision-model call).
 *
 * Renders a frosted-glass card on top of the strands with:
 *   - the file name + thumbnail
 *   - a 4-stage progress indicator (Uploading → Scanning → OCR → Extracting)
 *   - elapsed timer + rotating status messages
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2, ScanLine, Sparkles, CheckCircle2 } from 'lucide-react'
import Strands from '@/components/strands'

const STAGES = [
  { label: 'Uploading', desc: 'Securing your file', icon: FileText },
  { label: 'Scanning', desc: 'Reading pixels', icon: ScanLine },
  { label: 'OCR', desc: 'Extracting text', icon: Sparkles },
  { label: 'Parsing', desc: 'Structuring fields', icon: CheckCircle2 },
]

const STATUS_MESSAGES = [
  'Analyzing document layout…',
  'Detecting text regions…',
  'Recognizing characters…',
  'Classifying document type…',
  'Extracting vendor & amounts…',
  'Validating GSTIN format…',
  'Computing fraud risk score…',
  'Structuring line items…',
  'Finalizing extraction…',
]

export function OcrProcessingOverlay({
  fileName,
  fileSize,
  previewUrl,
  fileType,
}: {
  fileName: string
  fileSize: number
  previewUrl: string
  fileType: string
}) {
  const [elapsed, setElapsed] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)

  // Elapsed timer
  useEffect(() => {
    const start = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 200)
    return () => clearInterval(t)
  }, [])

  // Cycle through stages (each ~3s) until "Parsing" — then stay
  useEffect(() => {
    if (stageIdx >= STAGES.length - 1) return
    const t = setTimeout(() => setStageIdx((i) => Math.min(i + 1, STAGES.length - 1)), 3200)
    return () => clearTimeout(t)
  }, [stageIdx])

  // Rotate status messages every 1.6s
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length), 1600)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      {/* Strands background — fluid, glowing, keeps user engaged */}
      <div className="absolute inset-0">
        <Strands
          colors={['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']}
          count={4}
          speed={0.7}
          amplitude={1.2}
          waviness={1.4}
          thickness={0.6}
          glow={3.2}
          taper={2.5}
          spread={1.3}
          intensity={0.75}
          saturation={1.6}
          opacity={0.95}
          scale={1.8}
        />
      </div>

      {/* Dark veil for legibility */}
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />

      {/* Fluid glass card */}
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 shadow-2xl"
        style={{
          background: 'color-mix(in oklch, var(--card) 55%, transparent)',
          backdropFilter: 'saturate(180%) blur(28px)',
          WebkitBackdropFilter: 'saturate(180%) blur(28px)',
        }}
      >
        {/* Top: file preview + name */}
        <div className="flex items-center gap-4 p-6 pb-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-black/20">
            {previewUrl && fileType.startsWith('image/') ? (
              <img src={previewUrl} alt={fileName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/80">
                <FileText className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{fileName}</div>
            <div className="text-xs text-white/70">
              {(fileSize / 1024).toFixed(0)} KB · AI vision OCR in progress
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </div>
        </div>

        {/* 4-stage progress */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between">
            {STAGES.map((s, i) => {
              const Icon = s.icon
              const done = i < stageIdx
              const active = i === stageIdx
              return (
                <div key={s.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div
                        className={`h-0.5 flex-1 transition-colors duration-500 ${
                          i <= stageIdx ? 'bg-white/60' : 'bg-white/15'
                        }`}
                      />
                    )}
                    <motion.div
                      animate={{
                        scale: active ? 1.08 : 1,
                        backgroundColor: done
                          ? 'rgba(255,255,255,0.85)'
                          : active
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(255,255,255,0.1)',
                      }}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        active ? 'border-white/60' : 'border-white/10'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-black" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 text-white/50" />
                      )}
                    </motion.div>
                    {i < STAGES.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 transition-colors duration-500 ${
                          i < stageIdx ? 'bg-white/60' : 'bg-white/15'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      active ? 'text-white' : done ? 'text-white/70' : 'text-white/40'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rotating status message */}
        <div className="px-6 py-3">
          <div className="h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={msgIdx}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center text-xs text-white/80"
              >
                {STATUS_MESSAGES[msgIdx]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Elapsed + hint */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5">
          <span className="text-[11px] text-white/60">
            Elapsed <span className="tabular-nums text-white/90">{elapsed}s</span>
          </span>
          <span className="text-[11px] text-white/60">
            Keep watching — extraction is almost ready
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
