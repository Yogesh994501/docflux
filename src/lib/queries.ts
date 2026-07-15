import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  description?: string
  quantity?: number | string
  rate?: number | string
  amount?: number | string
  hsn?: string
}

export interface ExtractedData {
  documentType?: string
  vendorName?: string
  vendorGstin?: string
  vendorAddress?: string
  vendorPhone?: string
  vendorEmail?: string
  customerName?: string
  customerGstin?: string
  customerAddress?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  currency?: string
  subtotal?: string
  taxAmount?: string
  cgst?: string
  sgst?: string
  igst?: string
  totalAmount?: string
  idType?: string
  idNumber?: string
  idHolderName?: string
  idDateOfBirth?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  statementPeriod?: string
  poNumber?: string
  deliveryChallanNumber?: string
  paymentMethod?: string
  notes?: string
  lineItems?: LineItem[]
  fraudIndicators?: string[]
  fraudRisk?: string
}

export interface AuditLogEntry {
  id: string
  action: string
  details: string | null
  actor: string | null
  timestamp: string
}

export interface Vendor {
  id: string
  name: string
  gstin: string | null
  pan: string | null
  email: string | null
  phone: string | null
  address: string | null
  category: string | null
  createdAt: string
  _count?: { documents: number }
  totalSpend?: number
}

export interface DocumentItem {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  storagePath: string
  thumbnailPath: string | null
  documentType: string | null
  source: string
  status: string
  ocrText: string | null
  ocrConfidence: number | null
  ocrLanguage: string | null
  extractedData: string | null
  fraudRisk: string | null
  approvalComments: string | null
  approvedBy: string | null
  vendorId: string | null
  vendor: Vendor | null
  uploadedAt: string
  processedAt: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  auditLogs?: AuditLogEntry[]
}

export interface Analytics {
  counts: {
    total: number
    approved: number
    rejected: number
    pending: number
    processing: number
    extracted: number
    failed: number
  }
  typeDistribution: { type: string; count: number }[]
  statusDistribution: { status: string; count: number }[]
  fraudDistribution: { risk: string; count: number }[]
  topVendors: { name: string; count: number; totalSpend: number }[]
  spendTrend: { label: string; spend: number; count: number }[]
  totalSpend: number
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const json = await res.json()
  if (json.status !== 'success') {
    // On 401, the auth provider will pick up the missing session on next me-check
    throw new Error(json.detail ?? 'Request failed')
  }
  return json.data as T
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useDocumentsQuery(params: {
  page: number
  pageSize: number
  status?: string | null
  documentType?: string | null
  fraudRisk?: string | null
  search?: string
}) {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('pageSize', String(params.pageSize))
  if (params.status) qs.set('status', params.status)
  if (params.documentType) qs.set('documentType', params.documentType)
  if (params.fraudRisk) qs.set('fraudRisk', params.fraudRisk)
  if (params.search) qs.set('search', params.search)

  return useQuery({
    queryKey: ['documents', params],
    queryFn: () =>
      http<{ items: DocumentItem[]; total: number; page: number; pageSize: number }>(
        `/api/documents?${qs.toString()}`,
      ),
  })
}

export function useDocumentQuery(id: string | null) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => http<DocumentItem>(`/api/documents/${id}`),
    enabled: !!id,
  })
}

export function useAnalyticsQuery() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => http<Analytics>('/api/analytics'),
  })
}

export function useVendorsQuery(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return useQuery({
    queryKey: ['vendors', search ?? ''],
    queryFn: () => http<{ items: Vendor[] }>(`/api/vendors${qs}`),
  })
}

export function useCopilotHistoryQuery() {
  return useQuery({
    queryKey: ['copilot-history'],
    queryFn: () =>
      http<{ items: { id: string; role: string; content: string; createdAt: string }[] }>(
        '/api/copilot',
      ),
  })
}

export function useStatusQuery() {
  return useQuery({
    queryKey: ['status'],
    queryFn: () =>
      http<{ database: 'supabase' | 'sqlite'; ocr: 'gemini' | 'zai'; auth: 'supabase' | 'local'; authDisabled: boolean; geminiModel: string }>(
        '/api/status',
      ),
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUploadMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('source', 'web')
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.status !== 'success') throw new Error(json.detail ?? 'Upload failed')
      return json.data as DocumentItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useApproveMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) =>
      http<DocumentItem>(`/api/documents/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useRejectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) =>
      http<DocumentItem>(`/api/documents/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useReprocessMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      http<DocumentItem>(`/api/documents/${id}/reprocess`, { method: 'POST' }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useUpdateDocumentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: { documentType?: string; fraudRisk?: string; vendorId?: string | null; extractedDataPatch?: Record<string, unknown> }
    }) =>
      http<DocumentItem>(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useDeleteDocumentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      http<{ id: string }>(`/api/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useSeedMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => http<{ vendors: number; documents: number }>('/api/seed', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}

export function useCreateVendorMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      gstin?: string
      pan?: string
      email?: string
      phone?: string
      address?: string
      category?: string
    }) =>
      http<Vendor>('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useCopilotChatMutation() {
  return useMutation({
    mutationFn: async ({
      messages,
      documentContext,
    }: {
      messages: { role: 'user' | 'assistant'; content: string }[]
      documentContext?: { fileName: string; type: string; extracted: unknown } | null
    }) =>
      http<{ reply: string }>('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, documentContext }),
      }),
  })
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function parseExtractedData(json: string | null | undefined): ExtractedData | null {
  if (!json) return null
  try {
    return JSON.parse(json) as ExtractedData
  } catch {
    return null
  }
}
