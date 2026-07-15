// Shared constants and types for AutoFinDocs

export const DOCUMENT_TYPES = [
  { value: 'GST_INVOICE', label: 'GST Invoice', color: 'emerald' },
  { value: 'RECEIPT', label: 'Receipt', color: 'sky' },
  { value: 'GOVT_ID', label: 'Government ID', color: 'violet' },
  { value: 'E_BILL', label: 'Utility Bill', color: 'amber' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order', color: 'cyan' },
  { value: 'DELIVERY_CHALLAN', label: 'Delivery Challan', color: 'rose' },
  { value: 'CREDIT_NOTE', label: 'Credit Note', color: 'orange' },
  { value: 'DEBIT_NOTE', label: 'Debit Note', color: 'pink' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement', color: 'teal' },
  { value: 'UNKNOWN', label: 'Unknown', color: 'slate' },
] as const

export const DOCUMENT_STATUSES = [
  { value: 'UPLOADED', label: 'Uploaded', color: 'slate' },
  { value: 'PROCESSING', label: 'Processing', color: 'sky' },
  { value: 'EXTRACTED', label: 'Extracted', color: 'emerald' },
  { value: 'APPROVED', label: 'Approved', color: 'emerald' },
  { value: 'REJECTED', label: 'Rejected', color: 'rose' },
  { value: 'FAILED', label: 'Failed', color: 'red' },
] as const

export const FRAUD_RISKS = [
  { value: 'LOW', label: 'Low', color: 'emerald' },
  { value: 'MEDIUM', label: 'Medium', color: 'amber' },
  { value: 'HIGH', label: 'High', color: 'rose' },
] as const

export type ColorName =
  | 'emerald' | 'sky' | 'violet' | 'amber' | 'cyan' | 'rose'
  | 'orange' | 'pink' | 'teal' | 'slate' | 'red'

export function getDocTypeMeta(type: string | null | undefined) {
  return DOCUMENT_TYPES.find((t) => t.value === type) ?? DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1]
}

export function getStatusMeta(status: string | null | undefined) {
  return DOCUMENT_STATUSES.find((s) => s.value === status) ?? DOCUMENT_STATUSES[0]
}

export function getFraudRiskMeta(risk: string | null | undefined) {
  return FRAUD_RISKS.find((r) => r.value === risk) ?? FRAUD_RISKS[0]
}

// Tailwind class maps so we can use dynamic colors safely (no purging issues)
export const COLOR_CLASSES: Record<ColorName, { badge: string; dot: string; text: string }> = {
  emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  sky:     { badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', text: 'text-sky-600' },
  violet:  { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', text: 'text-violet-600' },
  amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', text: 'text-amber-600' },
  cyan:    { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', text: 'text-cyan-600' },
  rose:    { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', text: 'text-rose-600' },
  orange:  { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', text: 'text-orange-600' },
  pink:    { badge: 'bg-pink-50 text-pink-700 border-pink-200', dot: 'bg-pink-500', text: 'text-pink-600' },
  teal:    { badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', text: 'text-teal-600' },
  slate:   { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500', text: 'text-slate-600' },
  red:     { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', text: 'text-red-600' },
}

// Standard API response shape
export function ok<T>(data: T) {
  return { status: 'success' as const, data }
}
export function err(detail: string) {
  return { status: 'error' as const, detail }
}
