/**
 * Supabase backend — implements the repository interface against Supabase
 * (PostgreSQL via PostgREST) using @supabase/supabase-js.
 *
 * Table/column names use snake_case (Postgres convention) and are mapped
 * to/from the camelCase DocumentRow shape used by the rest of the app.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  DocumentRow,
  VendorRow,
  AuditLogRow,
  CopilotMessageRow,
  DocListParams,
} from './repository'

export interface SupabaseRepo {
  listDocuments(params: DocListParams): Promise<{ items: DocumentRow[]; total: number }>
  getDocument(id: string, userId?: string): Promise<DocumentRow | null>
  createDocument(data: any): Promise<DocumentRow>
  updateDocument(id: string, data: Record<string, unknown>): Promise<DocumentRow | null>
  deleteDocument(id: string): Promise<void>
  createAuditLog(data: { documentId: string; action: string; details?: string | null; actor?: string | null }): Promise<void>
  listVendors(search?: string, userId?: string): Promise<VendorRow[]>
  createVendor(data: any): Promise<VendorRow>
  findVendorByGstin(gstin: string, userId?: string): Promise<VendorRow | null>
  findVendorByName(name: string, userId?: string): Promise<VendorRow | null>
  listCopilotMessages(limit?: number, userId?: string): Promise<CopilotMessageRow[]>
  createCopilotMessage(role: string, content: string, userId?: string): Promise<void>
  clearAll(userId?: string): Promise<void>
  groupBy(field: 'documentType' | 'status' | 'fraudRisk', userId?: string): Promise<{ key: string | null; count: number }[]>
  getSpendTrendDocs(userId?: string): Promise<{ uploadedAt: string; extractedData: string | null }[]>
}

let client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
  }
  return client
}

// ─── Mappers (snake_case ↔ camelCase) ─────────────────────────────────────────

function mapDoc(row: any, vendor?: any, auditLogs?: any[]): DocumentRow {
  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: Number(row.file_size ?? 0),
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path ?? null,
    documentType: row.document_type ?? null,
    source: row.source,
    status: row.status,
    ocrText: row.ocr_text ?? null,
    ocrConfidence: row.ocr_confidence ?? null,
    ocrLanguage: row.ocr_language ?? null,
    extractedData: row.extracted_data ?? null,
    fraudRisk: row.fraud_risk ?? null,
    approvalComments: row.approval_comments ?? null,
    approvedBy: row.approved_by ?? null,
    vendorId: row.vendor_id ?? null,
    vendor: vendor ? mapVendor(vendor) : null,
    uploadedAt: row.uploaded_at,
    processedAt: row.processed_at ?? null,
    approvedAt: row.approved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    auditLogs: auditLogs?.map(mapAudit),
  }
}

function mapVendor(row: any, documentCount?: number, totalSpend?: number): VendorRow {
  return {
    id: row.id,
    name: row.name,
    gstin: row.gstin ?? null,
    pan: row.pan ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    category: row.category ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documentCount,
    totalSpend,
  }
}

function mapAudit(row: any): AuditLogRow {
  return {
    id: row.id,
    documentId: row.document_id,
    action: row.action,
    details: row.details ?? null,
    actor: row.actor ?? null,
    timestamp: row.timestamp,
  }
}

// ─── Implementation ───────────────────────────────────────────────────────────

export function createSupabaseBackend(): SupabaseRepo {
  return {
    async listDocuments(params) {
      const sb = getClient()
      let query = sb.from('documents').select('*, vendor:vendors(*)', { count: 'exact' })

      if (params.userId) query = query.eq('user_id', params.userId)
      if (params.status) query = query.eq('status', params.status)
      if (params.documentType) query = query.eq('document_type', params.documentType)
      if (params.fraudRisk) query = query.eq('fraud_risk', params.fraudRisk)
      if (params.search) query = query.or(`file_name.ilike.%${params.search}%,ocr_text.ilike.%${params.search}%`)

      const from = (params.page - 1) * params.pageSize
      query = query.order('uploaded_at', { ascending: false }).range(from, from + params.pageSize - 1)

      const { data, count, error } = await query
      if (error) throw new Error(`Supabase listDocuments: ${error.message}`)

      return {
        items: (data ?? []).map((d: any) => mapDoc(d, d.vendor)),
        total: count ?? 0,
      }
    },

    async getDocument(id, userId) {
      const sb = getClient()
      let query = sb
        .from('documents')
        .select('*, vendor:vendors(*), audit_logs(*)')
        .eq('id', id)
        .order('timestamp', { referencedTable: 'audit_logs', ascending: true })
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query.single()
      if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(`Supabase getDocument: ${error.message}`)
      }
      return mapDoc(data, data.vendor, data.audit_logs)
    },

    async createDocument(d) {
      const sb = getClient()
      const insert = {
        id: d.id,
        file_name: d.fileName,
        file_type: d.fileType,
        file_size: d.fileSize,
        storage_path: d.storagePath,
        thumbnail_path: d.thumbnailPath ?? null,
        document_type: d.documentType ?? null,
        source: d.source,
        status: d.status,
        user_id: d.userId,
      }
      const { data, error } = await sb.from('documents').insert(insert).select('*, vendor:vendors(*)').single()
      if (error) throw new Error(`Supabase createDocument: ${error.message}`)
      return mapDoc(data, data.vendor)
    },

    async updateDocument(id, data) {
      const sb = getClient()
      // Convert camelCase keys to snake_case for Supabase
      const snake: Record<string, unknown> = {}
      const map: Record<string, string> = {
        documentType: 'document_type',
        ocrText: 'ocr_text',
        ocrConfidence: 'ocr_confidence',
        ocrLanguage: 'ocr_language',
        extractedData: 'extracted_data',
        fraudRisk: 'fraud_risk',
        approvalComments: 'approval_comments',
        approvedBy: 'approved_by',
        approvedAt: 'approved_at',
        processedAt: 'processed_at',
        vendorId: 'vendor_id',
        status: 'status',
      }
      for (const [k, v] of Object.entries(data)) {
        if (map[k]) snake[map[k]] = v
      }
      const { data: row, error } = await sb.from('documents').update(snake).eq('id', id).select('*, vendor:vendors(*)').single()
      if (error) throw new Error(`Supabase updateDocument: ${error.message}`)
      return mapDoc(row, row.vendor)
    },

    async deleteDocument(id) {
      const sb = getClient()
      const { error } = await sb.from('documents').delete().eq('id', id)
      if (error) throw new Error(`Supabase deleteDocument: ${error.message}`)
    },

    async createAuditLog(a) {
      const sb = getClient()
      const { error } = await sb.from('audit_logs').insert({
        document_id: a.documentId,
        action: a.action,
        details: a.details ?? null,
        actor: a.actor ?? 'system',
      })
      if (error) throw new Error(`Supabase createAuditLog: ${error.message}`)
    },

    async listVendors(search, userId) {
      const sb = getClient()
      let query = sb.from('vendors').select('*, documents(id)')
      if (userId) query = query.eq('user_id', userId)
      if (search) {
        query = query.or(`name.ilike.%${search}%,gstin.ilike.%${search}%,email.ilike.%${search}%`)
      }
      query = query.order('name', { ascending: true })
      const { data, error } = await query
      if (error) throw new Error(`Supabase listVendors: ${error.message}`)

      const enriched: VendorRow[] = []
      for (const v of data ?? []) {
        const docs = v.documents ?? []
        let totalSpend = 0
        const { data: docData } = await sb.from('documents').select('extracted_data').eq('vendor_id', v.id)
        for (const d of docData ?? []) {
          if (d.extracted_data) {
            try {
              const parsed = JSON.parse(d.extracted_data)
              const amt = parseFloat(String(parsed.totalAmount ?? '0').replace(/[^0-9.]/g, ''))
              if (!isNaN(amt)) totalSpend += amt
            } catch { /* ignore */ }
          }
        }
        enriched.push(mapVendor(v, docs.length, totalSpend))
      }
      return enriched
    },

    async createVendor(d) {
      const sb = getClient()
      const { data, error } = await sb.from('vendors').insert({
        name: d.name,
        gstin: d.gstin ?? null,
        pan: d.pan ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        address: d.address ?? null,
        category: d.category ?? 'supplier',
        user_id: d.userId,
      }).select().single()
      if (error) throw new Error(`Supabase createVendor: ${error.message}`)
      return mapVendor(data, 0, 0)
    },

    async findVendorByGstin(gstin, userId) {
      const sb = getClient()
      let query = sb.from('vendors').select('*').eq('gstin', gstin)
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(`Supabase findVendorByGstin: ${error.message}`)
      return data ? mapVendor(data) : null
    },

    async findVendorByName(name, userId) {
      const sb = getClient()
      let query = sb.from('vendors').select('*').ilike('name', `%${name}%`)
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(`Supabase findVendorByName: ${error.message}`)
      return data ? mapVendor(data) : null
    },

    async listCopilotMessages(limit = 50, userId) {
      const sb = getClient()
      let query = sb.from('copilot_messages').select('*').order('created_at', { ascending: true }).limit(limit)
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query
      if (error) throw new Error(`Supabase listCopilotMessages: ${error.message}`)
      return (data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      }))
    },

    async createCopilotMessage(role, content, userId) {
      const sb = getClient()
      const { error } = await sb.from('copilot_messages').insert({ role, content, user_id: userId ?? null })
      if (error) throw new Error(`Supabase createCopilotMessage: ${error.message}`)
    },

    async clearAll(userId) {
      const sb = getClient()
      if (userId) {
        await sb.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await sb.from('documents').delete().eq('user_id', userId)
        await sb.from('vendors').delete().eq('user_id', userId)
        await sb.from('copilot_messages').delete().eq('user_id', userId)
      } else {
        await sb.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await sb.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await sb.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await sb.from('copilot_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
    },

    async groupBy(field: 'documentType' | 'status' | 'fraudRisk', userId?: string) {
      const dbField = field === 'documentType' ? 'document_type' : field === 'fraudRisk' ? 'fraud_risk' : 'status'
      
      let query = getClient().from('documents').select(dbField)
      if (userId) query = query.eq('user_id', userId)
        
      const { data, error } = await query
      if (error) throw error

      const counts: Record<string, number> = {}
      for (const row of data) {
        const val = row[dbField] || 'UNKNOWN'
        counts[val] = (counts[val] || 0) + 1
      }
      return Object.entries(counts).map(([key, count]) => ({ key, count }))
    },

    async getSpendTrendDocs(userId?: string) {
      let query = getClient()
        .from('documents')
        .select('uploaded_at, extracted_data')
        .order('uploaded_at', { ascending: false })
        .limit(1000)
      
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error
      return data.map((d: any) => ({
        uploadedAt: d.uploaded_at,
        extractedData: d.extracted_data
      }))
    }
  }
}
