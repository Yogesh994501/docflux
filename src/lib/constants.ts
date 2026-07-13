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
  emerald: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  sky:     { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300', dot: 'bg-sky-500', text: 'text-sky-600' },
  violet:  { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', dot: 'bg-violet-500', text: 'text-violet-600' },
  amber:   { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500', text: 'text-amber-600' },
  cyan:    { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300', dot: 'bg-cyan-500', text: 'text-cyan-600' },
  rose:    { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', dot: 'bg-rose-500', text: 'text-rose-600' },
  orange:  { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', dot: 'bg-orange-500', text: 'text-orange-600' },
  pink:    { badge: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300', dot: 'bg-pink-500', text: 'text-pink-600' },
  teal:    { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300', dot: 'bg-teal-500', text: 'text-teal-600' },
  slate:   { badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-500', text: 'text-slate-600' },
  red:     { badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', dot: 'bg-red-500', text: 'text-red-600' },
}

// Standard API response shape
export function ok<T>(data: T) {
  return { status: 'success' as const, data }
}
export function err(detail: string) {
  return { status: 'error' as const, detail }
}
