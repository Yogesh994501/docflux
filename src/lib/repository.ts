/**
 * Repository layer — single data-access interface with TWO backends.
 *
 * - If SUPABASE_URL + SUPABASE_ANON_KEY are set → uses Supabase (PostgreSQL
 *   via PostgREST, using @supabase/supabase-js).
 * - Otherwise → uses Prisma + local SQLite.
 *
 * All API routes call these functions, never the underlying client directly.
 * This keeps the app provider-agnostic and switchable via env vars alone.
 */

import { db as prisma } from './db'
import { createSupabaseBackend, type SupabaseRepo } from './supabase-backend'

// ─── Types (shared across backends) ───────────────────────────────────────────

export interface DocumentRow {
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
  vendor: VendorRow | null
  uploadedAt: string
  processedAt: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  auditLogs?: AuditLogRow[]
}

export interface VendorRow {
  id: string
  name: string
  gstin: string | null
  pan: string | null
  email: string | null
  phone: string | null
  address: string | null
  category: string | null
  createdAt: string
  updatedAt: string
  documentCount?: number
  totalSpend?: number
}

export interface AuditLogRow {
  id: string
  documentId: string
  action: string
  details: string | null
  actor: string | null
  timestamp: string
}

export interface CopilotMessageRow {
  id: string
  role: string
  content: string
  createdAt: string
}

export interface DocListParams {
  page: number
  pageSize: number
  status?: string | null
  documentType?: string | null
  fraudRisk?: string | null
  search?: string | null
  userId?: string | null
}

// ─── Backend detection ────────────────────────────────────────────────────────

export function isSupabaseEnabled(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

export function getDatabaseProvider(): 'supabase' | 'sqlite' {
  return isSupabaseEnabled() ? 'supabase' : 'sqlite'
}

// ─── Prisma backend ───────────────────────────────────────────────────────────

async function prismaListDocuments(params: DocListParams): Promise<{ items: DocumentRow[]; total: number }> {
  const where: Record<string, unknown> = {}
  if (params.userId) where.userId = params.userId
  if (params.status) where.status = params.status
  if (params.documentType) where.documentType = params.documentType
  if (params.fraudRisk) where.fraudRisk = params.fraudRisk
  if (params.search) {
    where.OR = [
      { fileName: { contains: params.search } },
      { ocrText: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { vendor: true },
    }),
    prisma.document.count({ where }),
  ])

  return {
    items: rows.map(mapPrismaDoc),
    total,
  }
}

function mapPrismaDoc(d: any): DocumentRow {
  return {
    id: d.id,
    fileName: d.fileName,
    fileType: d.fileType,
    fileSize: d.fileSize,
    storagePath: d.storagePath,
    thumbnailPath: d.thumbnailPath,
    documentType: d.documentType,
    source: d.source,
    status: d.status,
    ocrText: d.ocrText,
    ocrConfidence: d.ocrConfidence,
    ocrLanguage: d.ocrLanguage,
    extractedData: d.extractedData,
    fraudRisk: d.fraudRisk,
    approvalComments: d.approvalComments,
    approvedBy: d.approvedBy,
    vendorId: d.vendorId,
    vendor: d.vendor ? mapPrismaVendor(d.vendor) : null,
    uploadedAt: d.uploadedAt.toISOString(),
    processedAt: d.processedAt?.toISOString() ?? null,
    approvedAt: d.approvedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

function mapPrismaVendor(v: any): VendorRow {
  return {
    id: v.id,
    name: v.name,
    gstin: v.gstin,
    pan: v.pan,
    email: v.email,
    phone: v.phone,
    address: v.address,
    category: v.category,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}

function mapPrismaAudit(a: any): AuditLogRow {
  return {
    id: a.id,
    documentId: a.documentId,
    action: a.action,
    details: a.details,
    actor: a.actor,
    timestamp: a.timestamp.toISOString(),
  }
}

async function prismaGetDocument(id: string, userId?: string): Promise<DocumentRow | null> {
  const d = await prisma.document.findUnique({
    where: { id },
    include: {
      vendor: true,
      auditLogs: { orderBy: { timestamp: 'asc' } },
    },
  })
  if (!d) return null
  if (userId && d.userId !== userId) return null // scope check
  const row = mapPrismaDoc(d)
  row.auditLogs = (d.auditLogs ?? []).map(mapPrismaAudit)
  return row
}

async function prismaCreateDocument(data: Partial<DocumentRow> & { fileName: string; fileType: string; fileSize: number; storagePath: string; source: string; status: string; userId: string }): Promise<DocumentRow> {
  const d = await prisma.document.create({
    data: {
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      storagePath: data.storagePath,
      thumbnailPath: data.thumbnailPath ?? null,
      documentType: data.documentType ?? null,
      source: data.source,
      status: data.status,
      userId: data.userId,
    },
  })
  return mapPrismaDoc(d)
}

async function prismaUpdateDocument(id: string, data: Record<string, unknown>): Promise<DocumentRow | null> {
  const d = await prisma.document.update({ where: { id }, data, include: { vendor: true } })
  return mapPrismaDoc(d)
}

async function prismaDeleteDocument(id: string): Promise<void> {
  await prisma.document.delete({ where: { id } })
}

async function prismaCreateAuditLog(data: { documentId: string; action: string; details?: string | null; actor?: string | null }): Promise<void> {
  await prisma.auditLog.create({ data })
}

async function prismaListVendors(search?: string, userId?: string): Promise<VendorRow[]> {
  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { gstin: { contains: search } },
      { email: { contains: search } },
    ]
  }
  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { documents: true } } },
  })
  // Enrich with total spend
  const enriched: VendorRow[] = []
  for (const v of vendors) {
    const docs = await prisma.document.findMany({
      where: { vendorId: v.id },
      select: { extractedData: true },
    })
    let totalSpend = 0
    for (const d of docs) {
      if (d.extractedData) {
        try {
          const data = JSON.parse(d.extractedData)
          const amt = parseFloat(String(data.totalAmount ?? '0').replace(/[^0-9.]/g, ''))
          if (!isNaN(amt)) totalSpend += amt
        } catch { /* ignore */ }
      }
    }
    enriched.push({
      ...mapPrismaVendor(v),
      documentCount: (v as any)._count?.documents ?? 0,
      totalSpend,
    })
  }
  return enriched
}

async function prismaCreateVendor(data: { name: string; gstin?: string | null; pan?: string | null; email?: string | null; phone?: string | null; address?: string | null; category?: string | null; userId: string }): Promise<VendorRow> {
  const v = await prisma.vendor.create({ data: data as any })
  return mapPrismaVendor(v)
}

async function prismaFindVendorByGstin(gstin: string, userId?: string): Promise<VendorRow | null> {
  const where: Record<string, unknown> = { gstin }
  if (userId) where.userId = userId
  const v = await prisma.vendor.findFirst({ where })
  return v ? mapPrismaVendor(v) : null
}

async function prismaFindVendorByName(name: string, userId?: string): Promise<VendorRow | null> {
  const where: Record<string, unknown> = { name: { contains: name } }
  if (userId) where.userId = userId
  const v = await prisma.vendor.findFirst({ where })
  return v ? mapPrismaVendor(v) : null
}

async function prismaListCopilotMessages(limit = 50, userId?: string): Promise<CopilotMessageRow[]> {
  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  const rows = await prisma.copilotMessage.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  return rows.map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }))
}

async function prismaCreateCopilotMessage(role: string, content: string, userId?: string): Promise<void> {
  await prisma.copilotMessage.create({ data: { role, content, userId: userId ?? null } })
}

async function prismaClearAll(userId?: string): Promise<void> {
  if (userId) {
    // Clear only the current user's data
    await prisma.auditLog.deleteMany({ where: { document: { userId } } })
    await prisma.document.deleteMany({ where: { userId } })
    await prisma.vendor.deleteMany({ where: { userId } })
    await prisma.copilotMessage.deleteMany({ where: { userId } })
  } else {
    await prisma.auditLog.deleteMany()
    await prisma.document.deleteMany()
    await prisma.vendor.deleteMany()
    await prisma.copilotMessage.deleteMany()
  }
}

async function prismaGroupBy(field: 'documentType' | 'status' | 'fraudRisk', userId?: string): Promise<{ key: string | null; count: number }[]> {
  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  const groups = await (prisma.document as any).groupBy({
    by: [field],
    _count: true,
    where,
  })
  return groups.map((g: any) => ({ key: g[field], count: g._count }))
}

// ─── Unified repository ───────────────────────────────────────────────────────

let supabaseBackend: SupabaseRepo | null = null
function getSupabase(): SupabaseRepo {
  if (!supabaseBackend) supabaseBackend = createSupabaseBackend()
  return supabaseBackend
}

export const repo = {
  provider: getDatabaseProvider(),

  async listDocuments(params: DocListParams) {
    return isSupabaseEnabled()
      ? getSupabase().listDocuments(params)
      : prismaListDocuments(params)
  },

  async getDocument(id: string, userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().getDocument(id, userId)
      : prismaGetDocument(id, userId)
  },

  async createDocument(data: Parameters<typeof prismaCreateDocument>[0]) {
    return isSupabaseEnabled()
      ? getSupabase().createDocument(data)
      : prismaCreateDocument(data)
  },

  async updateDocument(id: string, data: Record<string, unknown>) {
    return isSupabaseEnabled()
      ? getSupabase().updateDocument(id, data)
      : prismaUpdateDocument(id, data)
  },

  async deleteDocument(id: string) {
    return isSupabaseEnabled()
      ? getSupabase().deleteDocument(id)
      : prismaDeleteDocument(id)
  },

  async createAuditLog(data: { documentId: string; action: string; details?: string | null; actor?: string | null }) {
    return isSupabaseEnabled()
      ? getSupabase().createAuditLog(data)
      : prismaCreateAuditLog(data)
  },

  async listVendors(search?: string, userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().listVendors(search, userId)
      : prismaListVendors(search, userId)
  },

  async createVendor(data: Parameters<typeof prismaCreateVendor>[0]) {
    return isSupabaseEnabled()
      ? getSupabase().createVendor(data)
      : prismaCreateVendor(data)
  },

  async findVendorByGstin(gstin: string, userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().findVendorByGstin(gstin, userId)
      : prismaFindVendorByGstin(gstin, userId)
  },

  async findVendorByName(name: string, userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().findVendorByName(name, userId)
      : prismaFindVendorByName(name, userId)
  },

  async listCopilotMessages(limit = 50, userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().listCopilotMessages(limit, userId)
      : prismaListCopilotMessages(limit, userId)
  },

  async createCopilotMessage(role: string, content: string, userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().createCopilotMessage(role, content, userId)
      : prismaCreateCopilotMessage(role, content, userId)
  },

  async clearAll(userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().clearAll(userId)
      : prismaClearAll(userId)
  },

  async groupBy(field: 'documentType' | 'status' | 'fraudRisk', userId?: string) {
    return isSupabaseEnabled()
      ? getSupabase().groupBy(field, userId)
      : prismaGroupBy(field, userId)
  },
}
