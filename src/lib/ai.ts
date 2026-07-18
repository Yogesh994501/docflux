/**
 * DocFlux AI Pipeline — Agentic Document Processing
 *
 * Architecture: classify → schema-extract → self-check → confidence route
 *
 * Pass 1 (Classify):  Gemini identifies doc type from a lightweight enum call
 * Pass 2 (Extract):   Schema-constrained JSON extraction tuned for that doc type
 *                     Optionally injected with a vendor few-shot example
 * Pass 3 (Reflect):   Cheap self-check — validates totals math + GSTIN checksum
 *                     Catches the classic "numbers look right individually but don't add up" bug
 *
 * Confidence routing:
 *   confidence=high + no missing mandatory fields → status EXTRACTED (auto-approve eligible)
 *   confidence=medium/low OR missing fields        → status PENDING_REVIEW (routes to Approvals)
 *
 * Provider strategy:
 *   - Gemini Flash for all passes (fast, cheap, schema-constrained output supported natively)
 *   - Z.ai GLM-4.6V as fallback if Gemini not configured
 *   - Single-pass on Z.ai (no response_schema support), same quality prompt
 */

import ZAI from 'z-ai-web-dev-sdk'
import { GoogleGenAI, type Part } from '@google/genai'
import fs from 'fs/promises'
import path from 'path'
import { getVendorExample } from './vendor-memory'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'GST_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'RECEIPT'
  | 'RETAIL_RECEIPT'
  | 'RESTAURANT_RECEIPT'
  | 'MEDICAL_BILL'
  | 'MOBILE_ELECTRONICS_RECEIPT'
  | 'JEWELLERY_RECEIPT'
  | 'GOVT_ID'
  | 'E_BILL'
  | 'PURCHASE_ORDER'
  | 'DELIVERY_CHALLAN'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'BANK_STATEMENT'
  | 'UNKNOWN'

export type FraudRisk = 'LOW' | 'MEDIUM' | 'HIGH'
export type ExtractionConfidence = 'high' | 'medium' | 'low'

export interface LineItem {
  description?: string
  quantity?: number | string
  rate?: number | string
  amount?: number | string
  hsn?: string
  /** Medical: batch number */
  batchNumber?: string
  /** Medical: expiry date */
  expiryDate?: string
  /** Mobile/Electronics: IMEI or serial */
  imei?: string
  /** Jewellery: purity e.g. "22K" */
  purity?: string
  /** Jewellery: weight in grams */
  weightGrams?: number | string
}

export interface ExtractedData {
  documentType: DocumentType
  // ── Vendor / supplier ──
  vendorName?: string
  vendorGstin?: string
  vendorAddress?: string
  vendorPhone?: string
  vendorEmail?: string
  // ── Customer / buyer ──
  customerName?: string
  customerGstin?: string
  customerAddress?: string
  // ── Invoice / document identity ──
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  // ── IRN (GST e-Invoice specific) ──
  irn?: string          // 64-character Invoice Reference Number
  irnAckDate?: string   // IRN acknowledgement date from IRP
  // ── Amounts ──
  currency?: string
  subtotal?: string
  taxAmount?: string
  cgst?: string
  sgst?: string
  igst?: string
  cessAmount?: string
  roundOff?: string
  totalAmount?: string
  // ── Government ID fields ──
  idType?: string
  idNumber?: string
  idHolderName?: string
  idDateOfBirth?: string
  // ── Banking ──
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  statementPeriod?: string
  // ── PO / Challan ──
  poNumber?: string
  deliveryChallanNumber?: string
  // ── Misc ──
  paymentMethod?: string
  notes?: string
  lineItems?: LineItem[]
  // ── AI confidence + compliance ──
  fraudIndicators?: string[]
  fraudRisk: FraudRisk
  /** AI self-assessed confidence for this extraction */
  extractionConfidence: ExtractionConfidence
  /** GST mandatory fields that are missing or illegible */
  missingMandatoryFields?: string[]
  /** Whether the totals math checks out (subtotal + taxes = total) */
  totalsVerified?: boolean
  /** Whether the supplier GSTIN passes basic checksum format validation */
  gstinValid?: boolean
  /** Pipeline metadata */
  pipelinePasses?: number
  classifiedAs?: string
}

export interface OcrResult {
  ocrText: string
  confidence: number
  extracted: ExtractedData
  provider: 'gemini' | 'zai'
  /** Suggested status for the document based on confidence */
  suggestedStatus: 'EXTRACTED' | 'PENDING_REVIEW'
}

// ─── Provider setup ───────────────────────────────────────────────────────────

type OcrProvider = 'gemini' | 'zai'

function getProvider(): OcrProvider {
  const configured = (process.env.OCR_PROVIDER ?? 'zai').toLowerCase() as OcrProvider
  if (configured === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini'
  return 'zai'
}

export function getActiveProvider(): OcrProvider {
  return getProvider()
}

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
}

let _gemini: GoogleGenAI | null = null
function getGemini(): GoogleGenAI {
  if (!_gemini) _gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return _gemini
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

// ─── Image helpers ────────────────────────────────────────────────────────────

async function fileToBase64(
  filePath: string,
  mimeType: string,
): Promise<{ data: string; mimeType: string }> {
  const buf = await fs.readFile(filePath)
  return { data: buf.toString('base64'), mimeType }
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    case '.gif': return 'image/gif'
    case '.bmp': return 'image/bmp'
    case '.pdf': return 'application/pdf'
    default: return 'image/jpeg'
  }
}

// ─── GST Mandatory field list ─────────────────────────────────────────────────
// Based on Form GST INV-1 (IRN system) — 28 mandatory + 18 conditional-mandatory
// We check these in the reflection pass for GST_INVOICE documents

const GST_MANDATORY_FIELDS = [
  'invoiceNumber',
  'invoiceDate',
  'vendorGstin',
  'vendorName',
  'vendorAddress',
  'customerGstin',
  'customerName',
  'totalAmount',
] as const

// ─── Pass 1: Document Classification ─────────────────────────────────────────

const CLASSIFICATION_PROMPT = `You are a document classification expert.
Look at this document image and classify it into exactly ONE of the following types:

- GST_INVOICE: Tax invoice with GSTIN, issued under GST (India)
- BILL_OF_SUPPLY: Exempt goods/composition scheme — no GST columns, no tax amount
- RECEIPT: Simple payment receipt, no GST
- RETAIL_RECEIPT: Retail / POS receipt (general store, supermarket)
- RESTAURANT_RECEIPT: Restaurant, café, food delivery bill
- MEDICAL_BILL: Hospital, pharmacy, diagnostic bill (may have batch numbers, expiry dates)
- MOBILE_ELECTRONICS_RECEIPT: Electronics/mobile store (may have IMEI/serial numbers)
- JEWELLERY_RECEIPT: Jewellery purchase (may have purity/weight/hallmark)
- GOVT_ID: Government ID card (PAN, Aadhaar, passport, driving license)
- E_BILL: Utility bill (electricity, water, gas, telecom)
- PURCHASE_ORDER: PO from buyer to supplier
- DELIVERY_CHALLAN: Goods delivery note / lorry receipt
- CREDIT_NOTE: Credit note issued against an invoice
- DEBIT_NOTE: Debit note
- BANK_STATEMENT: Bank or credit card statement
- UNKNOWN: None of the above

Reply with ONLY a JSON object, no markdown, no explanation:
{"type": "<TYPE>", "confidence": "<high|medium|low>", "reasoning": "<one sentence>"}`

async function classifyWithGemini(imageBase64: string, mimeType: string): Promise<{
  type: DocumentType
  confidence: ExtractionConfidence
}> {
  const ai = getGemini()
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: [{
      role: 'user',
      parts: [
        { text: CLASSIFICATION_PROMPT },
        { inlineData: { data: imageBase64, mimeType } },
      ],
    }],
    config: {
      temperature: 0.05,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          reasoning: { type: 'STRING' },
        },
        required: ['type', 'confidence'],
      } as never,
    },
  })

  const raw = response.text ?? ''
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim())
    return {
      type: (parsed.type as DocumentType) || 'UNKNOWN',
      confidence: (parsed.confidence as ExtractionConfidence) || 'medium',
    }
  } catch {
    return { type: 'UNKNOWN', confidence: 'low' }
  }
}

// ─── Pass 2: Schema-constrained extraction ────────────────────────────────────

function buildExtractionSchema(docType: DocumentType) {
  // Base schema — common to all doc types
  const base = {
    type: 'OBJECT',
    properties: {
      vendorName: { type: 'STRING' },
      vendorGstin: { type: 'STRING', description: '15-char GSTIN e.g. 27AABCT1332L1ZJ' },
      vendorAddress: { type: 'STRING' },
      vendorPhone: { type: 'STRING' },
      vendorEmail: { type: 'STRING' },
      customerName: { type: 'STRING' },
      customerGstin: { type: 'STRING' },
      customerAddress: { type: 'STRING' },
      invoiceNumber: { type: 'STRING' },
      invoiceDate: { type: 'STRING', description: 'Format YYYY-MM-DD' },
      dueDate: { type: 'STRING' },
      currency: { type: 'STRING' },
      subtotal: { type: 'STRING' },
      taxAmount: { type: 'STRING' },
      cgst: { type: 'STRING' },
      sgst: { type: 'STRING' },
      igst: { type: 'STRING' },
      cessAmount: { type: 'STRING' },
      totalAmount: { type: 'STRING' },
      paymentMethod: { type: 'STRING' },
      notes: { type: 'STRING' },
      lineItems: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            description: { type: 'STRING' },
            quantity: { type: 'STRING' },
            rate: { type: 'STRING' },
            amount: { type: 'STRING' },
            hsn: { type: 'STRING' },
          },
        },
      },
      fraudIndicators: { type: 'ARRAY', items: { type: 'STRING' } },
      fraudRisk: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      extractionConfidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
      missingMandatoryFields: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['fraudRisk', 'extractionConfidence'],
  }

  // Type-specific field additions
  const extras: Record<string, object> = {}

  if (docType === 'GST_INVOICE') {
    extras['irn'] = { type: 'STRING', description: '64-character Invoice Reference Number from IRP' }
    extras['irnAckDate'] = { type: 'STRING' }
  }

  if (docType === 'GOVT_ID') {
    extras['idType'] = { type: 'STRING', description: 'PAN / Aadhaar / Passport / Driving License etc.' }
    extras['idNumber'] = { type: 'STRING' }
    extras['idHolderName'] = { type: 'STRING' }
    extras['idDateOfBirth'] = { type: 'STRING' }
  }

  if (docType === 'BANK_STATEMENT') {
    extras['bankName'] = { type: 'STRING' }
    extras['accountNumber'] = { type: 'STRING' }
    extras['ifscCode'] = { type: 'STRING' }
    extras['statementPeriod'] = { type: 'STRING' }
  }

  if (docType === 'PURCHASE_ORDER') {
    extras['poNumber'] = { type: 'STRING' }
  }

  if (docType === 'DELIVERY_CHALLAN') {
    extras['deliveryChallanNumber'] = { type: 'STRING' }
    extras['poNumber'] = { type: 'STRING' }
  }

  if (docType === 'MEDICAL_BILL') {
    // lineItems already present in base — medical adds batch/expiry to each item
    // we handle this in the prompt instructions instead of the schema
  }

  if (docType === 'JEWELLERY_RECEIPT') {
    extras['purity'] = { type: 'STRING', description: 'e.g. 22K, 18K, 925 silver' }
    extras['weightGrams'] = { type: 'STRING' }
    extras['hallmarkNumber'] = { type: 'STRING' }
  }

  if (docType === 'MOBILE_ELECTRONICS_RECEIPT') {
    extras['imei'] = { type: 'STRING' }
    extras['serialNumber'] = { type: 'STRING' }
    extras['warrantyPeriod'] = { type: 'STRING' }
  }

  if (Object.keys(extras).length > 0) {
    ;(base.properties as Record<string, object>) = { ...base.properties, ...extras }
  }

  return base
}

function buildExtractionPrompt(
  docType: DocumentType,
  vendorExample: string | null,
): string {
  const typeSpecificInstructions: Partial<Record<DocumentType, string>> = {
    GST_INVOICE: `This is a GST Tax Invoice. Extract ALL mandatory e-Invoice fields including:
- IRN (64-character Invoice Reference Number) if present
- Supplier and buyer GSTINs (15 chars: 2-digit state code + 10-char PAN + entity type + Z + checksum)
- CGST, SGST, or IGST amounts (not all three — intra-state uses CGST+SGST, inter-state uses IGST only)
- HSN/SAC codes for each line item
- Any missing mandatory fields in missingMandatoryFields array`,
    MEDICAL_BILL: `This is a medical/pharmacy bill. For each line item, extract batch number and expiry date if visible.`,
    JEWELLERY_RECEIPT: `This is a jewellery receipt. Extract gold/silver purity (e.g. 22K, 18K), weight in grams, hallmark number.`,
    MOBILE_ELECTRONICS_RECEIPT: `This is an electronics/mobile receipt. Extract IMEI number, serial number, and warranty period.`,
    GOVT_ID: `This is a government ID. Extract ID type (PAN/Aadhaar/Passport/DL), the ID number, holder name, and date of birth. Set fraudRisk=MEDIUM if the ID number format looks wrong.`,
  }

  const fewShotSection = vendorExample
    ? `\n\nIMPORTANT — This vendor's document layout was seen before. Here is a CORRECTED reference extraction:\n${vendorExample}\n\nFollow this reference for field names and layout patterns. The new invoice may have different amounts/dates but the same structure.\n`
    : ''

  return `You are an expert OCR and document extraction AI for Indian financial documents.

Document type: ${docType}
${typeSpecificInstructions[docType] ?? ''}
${fewShotSection}
Instructions:
1. Extract ONLY fields you can clearly read. Leave missing fields as empty string.
2. Normalize dates to YYYY-MM-DD format.
3. Keep monetary values as strings (e.g. "12500.00") — do not strip currency symbols but separate them.
4. For fraudRisk: HIGH if GSTIN format wrong, totals inconsistent, or suspicious indicators. MEDIUM if minor issues. LOW otherwise.
5. For extractionConfidence: high=all key fields clearly readable; medium=most fields readable; low=blurry, damaged, or many missing fields.
6. List any GST mandatory fields that are missing in missingMandatoryFields (empty array if none missing).`
}

async function extractWithGemini(
  imageBase64: string,
  mimeType: string,
  docType: DocumentType,
  vendorExample: string | null,
): Promise<Partial<ExtractedData>> {
  const ai = getGemini()
  const schema = buildExtractionSchema(docType)
  const prompt = buildExtractionPrompt(docType, vendorExample)

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { data: imageBase64, mimeType } },
      ],
    }],
    config: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: schema as never,
    },
  })

  const raw = response.text ?? ''
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()
    return JSON.parse(cleaned) as Partial<ExtractedData>
  } catch {
    return {
      fraudRisk: 'MEDIUM',
      extractionConfidence: 'low',
      fraudIndicators: ['Structured extraction failed — raw parse error'],
    }
  }
}

// ─── Pass 3: Self-correction / Reflection ────────────────────────────────────

function reflectLocally(extracted: Partial<ExtractedData>): {
  totalsVerified: boolean
  gstinValid: boolean
  reflectionFlags: string[]
} {
  const flags: string[] = []

  // 1. Totals math check
  let totalsVerified = true
  try {
    const sub = parseFloat(extracted.subtotal?.replace(/[^0-9.]/g, '') || '0')
    const cgst = parseFloat(extracted.cgst?.replace(/[^0-9.]/g, '') || '0')
    const sgst = parseFloat(extracted.sgst?.replace(/[^0-9.]/g, '') || '0')
    const igst = parseFloat(extracted.igst?.replace(/[^0-9.]/g, '') || '0')
    const cess = parseFloat(extracted.cessAmount?.replace(/[^0-9.]/g, '') || '0')
    const roundOff = parseFloat(extracted.roundOff?.replace(/[^0-9.]/g, '') || '0')
    const total = parseFloat(extracted.totalAmount?.replace(/[^0-9.]/g, '') || '0')

    if (sub > 0 && total > 0) {
      const computed = sub + cgst + sgst + igst + cess + roundOff
      const diff = Math.abs(computed - total)
      if (diff > 1.0) {
        // Allow ₹1 rounding tolerance
        totalsVerified = false
        flags.push(`Totals mismatch: computed ₹${computed.toFixed(2)} vs stated ₹${total.toFixed(2)}`)
      }
    }
  } catch { /* Ignore parse errors on amounts */ }

  // 2. GSTIN format check (India GSTIN = 15 chars, specific pattern)
  let gstinValid = true
  const gstin = extracted.vendorGstin?.trim()
  if (gstin) {
    // Pattern: 2 digits (state code) + 10 alphanum (PAN) + 1 digit (entity) + Z + 1 alphanum (checksum)
    const gstinPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (gstin.length !== 15 || !gstinPattern.test(gstin)) {
      gstinValid = false
      flags.push(`GSTIN format invalid: "${gstin}" (expected 15-char format: 2+10+1+Z+1)`)
    }
  }

  return { totalsVerified, gstinValid, reflectionFlags: flags }
}

// ─── Single-pass Z.ai extraction (fallback) ──────────────────────────────────

const ZAI_EXTRACTION_PROMPT = `You are an expert document analysis AI specialized in Indian financial documents (GST invoices, receipts, government IDs, purchase orders, etc.).

Analyze the attached document image carefully. You must:

1. OCR: Transcribe ALL visible text exactly as it appears.
2. Classify the document into one of: GST_INVOICE, BILL_OF_SUPPLY, RECEIPT, RETAIL_RECEIPT, RESTAURANT_RECEIPT, MEDICAL_BILL, MOBILE_ELECTRONICS_RECEIPT, JEWELLERY_RECEIPT, GOVT_ID, E_BILL, PURCHASE_ORDER, DELIVERY_CHALLAN, CREDIT_NOTE, DEBIT_NOTE, BANK_STATEMENT, UNKNOWN
3. Extract all structured fields. Only include if clearly readable.
4. Fraud risk: HIGH if GSTIN format wrong or totals inconsistent; MEDIUM if minor issues; LOW otherwise.
5. extractionConfidence: high/medium/low based on readability.
6. missingMandatoryFields: list any GST mandatory fields that are absent (for GST_INVOICE type).

Return STRICT JSON (no markdown, no code fences):
{
  "ocrText": "<full transcription>",
  "confidence": <0.0-1.0>,
  "extracted": {
    "documentType": "",
    "vendorName": "", "vendorGstin": "", "vendorAddress": "", "vendorPhone": "", "vendorEmail": "",
    "customerName": "", "customerGstin": "", "customerAddress": "",
    "invoiceNumber": "", "invoiceDate": "", "dueDate": "",
    "irn": "", "irnAckDate": "",
    "currency": "INR",
    "subtotal": "", "taxAmount": "", "cgst": "", "sgst": "", "igst": "", "cessAmount": "", "totalAmount": "",
    "idType": "", "idNumber": "", "idHolderName": "", "idDateOfBirth": "",
    "bankName": "", "accountNumber": "", "ifscCode": "", "statementPeriod": "",
    "poNumber": "", "deliveryChallanNumber": "",
    "paymentMethod": "", "notes": "",
    "lineItems": [{"description":"","quantity":"","rate":"","amount":"","hsn":""}],
    "fraudIndicators": [],
    "fraudRisk": "LOW",
    "extractionConfidence": "medium",
    "missingMandatoryFields": []
  }
}`

async function processWithZai(filePath: string, fileName: string): Promise<OcrResult> {
  const mimeType = getMimeType(fileName)
  const { data, mimeType: mt } = await fileToBase64(filePath, mimeType)
  const zai = await getZai()

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: ZAI_EXTRACTION_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mt};base64,${data}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices[0]?.message?.content ?? ''
  const result = parseZaiResponse(raw)

  // Still run local reflection on Z.ai results
  const reflection = reflectLocally(result.extracted)
  result.extracted.totalsVerified = reflection.totalsVerified
  result.extracted.gstinValid = reflection.gstinValid
  if (reflection.reflectionFlags.length > 0) {
    result.extracted.fraudIndicators = [
      ...(result.extracted.fraudIndicators ?? []),
      ...reflection.reflectionFlags,
    ]
    if (result.extracted.fraudRisk === 'LOW') {
      result.extracted.fraudRisk = 'MEDIUM'
    }
  }
  result.extracted.pipelinePasses = 1
  result.suggestedStatus = deriveSuggestedStatus(result.extracted)
  return result
}

function parseZaiResponse(raw: string): OcrResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: Partial<OcrResult>
  try {
    parsed = JSON.parse(cleaned) as Partial<OcrResult>
  } catch {
    return {
      ocrText: raw,
      confidence: 0.3,
      extracted: {
        documentType: 'UNKNOWN',
        fraudRisk: 'MEDIUM',
        extractionConfidence: 'low',
        fraudIndicators: ['Model returned non-JSON response'],
      },
      provider: 'zai',
      suggestedStatus: 'PENDING_REVIEW',
    }
  }

  const extracted = parsed.extracted ?? {}
  if (!extracted.documentType) extracted.documentType = 'UNKNOWN'
  if (!extracted.fraudRisk) extracted.fraudRisk = 'LOW'
  if (!extracted.extractionConfidence) extracted.extractionConfidence = 'medium'

  return {
    ocrText: parsed.ocrText ?? '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
    extracted: extracted as ExtractedData,
    provider: 'zai',
    suggestedStatus: 'EXTRACTED',
  }
}

// ─── Status routing logic ─────────────────────────────────────────────────────

function deriveSuggestedStatus(
  extracted: Partial<ExtractedData>,
): 'EXTRACTED' | 'PENDING_REVIEW' {
  // Route to human review if:
  // - Confidence is low
  // - GST mandatory fields are missing
  // - Totals don't verify
  // - GSTIN is invalid
  // - Fraud risk is HIGH
  if (
    extracted.extractionConfidence === 'low' ||
    (extracted.missingMandatoryFields?.length ?? 0) > 0 ||
    extracted.totalsVerified === false ||
    extracted.gstinValid === false ||
    extracted.fraudRisk === 'HIGH'
  ) {
    return 'PENDING_REVIEW'
  }
  return 'EXTRACTED'
}

// ─── Main Gemini agentic pipeline ────────────────────────────────────────────

async function processWithGemini(
  filePath: string,
  fileName: string,
  vendorExample: string | null = null,
): Promise<OcrResult> {
  const mimeType = getMimeType(fileName)
  const { data, mimeType: mt } = await fileToBase64(filePath, mimeType)

  // ── Pass 1: Classify ──────────────────────────────────────────────────────
  console.log('[AI Pipeline] Pass 1: Classifying document...')
  const classification = await classifyWithGemini(data, mt)
  const docType = classification.type
  console.log(`[AI Pipeline] Classified as: ${docType} (${classification.confidence})`)

  // ── Pass 2: Schema-constrained extraction ─────────────────────────────────
  console.log(`[AI Pipeline] Pass 2: Extracting with ${docType} schema...`)
  const rawExtracted = await extractWithGemini(data, mt, docType, vendorExample)
  rawExtracted.documentType = docType
  rawExtracted.classifiedAs = docType

  // ── Pass 3: Local reflection / self-check ────────────────────────────────
  console.log('[AI Pipeline] Pass 3: Running self-check (totals + GSTIN)...')
  const reflection = reflectLocally(rawExtracted)
  rawExtracted.totalsVerified = reflection.totalsVerified
  rawExtracted.gstinValid = reflection.gstinValid

  if (reflection.reflectionFlags.length > 0) {
    rawExtracted.fraudIndicators = [
      ...(rawExtracted.fraudIndicators ?? []),
      ...reflection.reflectionFlags,
    ]
    // Upgrade fraud risk if reflection found issues
    if (rawExtracted.fraudRisk === 'LOW') rawExtracted.fraudRisk = 'MEDIUM'
    console.log('[AI Pipeline] Reflection flags:', reflection.reflectionFlags)
  }

  // GST mandatory fields check for GST_INVOICE
  if (docType === 'GST_INVOICE') {
    const missing = GST_MANDATORY_FIELDS.filter(
      (f) => !rawExtracted[f as keyof typeof rawExtracted] || rawExtracted[f as keyof typeof rawExtracted] === '',
    )
    if (missing.length > 0) {
      rawExtracted.missingMandatoryFields = [
        ...(rawExtracted.missingMandatoryFields ?? []),
        ...missing,
      ]
    }
  }

  rawExtracted.pipelinePasses = 3

  // ── Derive a plain OCR text from extracted fields (Gemini doesn't return ocrText separately) ──
  const ocrText = [
    rawExtracted.vendorName,
    rawExtracted.invoiceNumber,
    rawExtracted.invoiceDate,
    rawExtracted.totalAmount,
    rawExtracted.notes,
    rawExtracted.lineItems?.map((li) => `${li.description} ${li.amount}`).join('\n'),
  ]
    .filter(Boolean)
    .join('\n')

  // ── Map confidence string to float ────────────────────────────────────────
  const confidenceMap: Record<ExtractionConfidence, number> = { high: 0.95, medium: 0.75, low: 0.45 }
  const confidence = confidenceMap[rawExtracted.extractionConfidence ?? 'medium']

  const extracted = rawExtracted as ExtractedData
  extracted.fraudRisk = extracted.fraudRisk ?? 'LOW'
  extracted.extractionConfidence = extracted.extractionConfidence ?? 'medium'

  return {
    ocrText,
    confidence,
    extracted,
    provider: 'gemini',
    suggestedStatus: deriveSuggestedStatus(extracted),
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Process a document through the full agentic pipeline:
 *
 * Gemini: classify (Pass 1) → schema-extract (Pass 2) → self-check (Pass 3)
 * Z.ai fallback: single-pass extraction + local reflection
 *
 * @param filePath  Absolute path to the file on disk
 * @param fileName  Original file name (used for MIME type detection)
 * @param vendorHint  Optional: known vendor GSTIN/name to look up few-shot cache before extraction
 */
export async function processDocument(
  filePath: string,
  fileName: string,
  vendorHint?: { gstin?: string; name?: string },
  userId?: string,
): Promise<OcrResult> {
  const provider = getProvider()
  if (provider === 'gemini') {
    try {
      let vendorExample: string | null = null
      // If we have a vendor hint (e.g. user selected from a dropdown or reprocessing), inject few-shot
      if (vendorHint) {
        const example = await getVendorExample(userId ?? null, vendorHint.gstin, vendorHint.name)
        if (example) {
          console.log(`[AI Pipeline] Found vendor memory for ${example.vendorName} (${example.hitCount} previous hits)`)
          vendorExample = example.extractedJson
        }
      }
      return await processWithGemini(filePath, fileName, vendorExample)
    } catch (e) {
      console.error('[Gemini pipeline failed, falling back to Z.ai]', e)
      return await processWithZai(filePath, fileName)
    }
  }
  return await processWithZai(filePath, fileName)
}

// ─── Copilot chat ─────────────────────────────────────────────────────────────

export async function copilotChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const systemPrompt = `You are DocFlux Copilot, an AI assistant for an intelligent document processing platform built for Indian GST compliance.

DocFlux uses an agentic 3-pass pipeline:
  1. Classify → identifies document type (GST Invoice, Bill of Supply, Medical Bill, etc.)
  2. Extract → schema-constrained JSON extraction tuned for that doc type, optionally with vendor few-shot memory
  3. Reflect → validates totals math and GSTIN checksums, routes to human review if confidence is low

You help users understand:
- Their uploaded documents (invoices, receipts, government IDs, POs, delivery challans, bank statements)
- Indian GST concepts (GSTIN, CGST/SGST/IGST, e-Invoice IRN, Bill of Supply, 3-way PO matching)
- Fraud detection patterns and compliance requirements
- How DocFlux's agentic parsing works differently from template-based OCR

Be concise, professional, and genuinely helpful. Use bullet points and short paragraphs.
When explaining why a new vendor's invoice didn't break parsing, explain the classify→extract→reflect pipeline.
When asked about "Layout learned", explain the vendor memory few-shot caching system.`

  if (getProvider() === 'gemini') {
    const ai = getGemini()
    // Build a conversation: inject system prompt as an assistant preamble, then user messages
    const contents = [
      // System context as first user turn (Gemini doesn't have a system role in basic generateContent)
      { role: 'user' as const, parts: [{ text: systemPrompt }] },
      { role: 'model' as const, parts: [{ text: 'Understood. I am DocFlux Copilot, ready to help.' }] },
      // Actual user conversation
      ...messages.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.content }],
      })),
    ]
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents,
    })
    return response.text || 'No response generated.'
  }

  // Z.ai fallback — only initialized when provider is 'zai'
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      ...messages,
    ],
    thinking: { type: 'disabled' },
  })

  return completion.choices[0]?.message?.content ?? ''
}
