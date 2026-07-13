/**
 * AI library — OCR + structured field extraction via VLM (z-ai-web-dev-sdk)
 *
 * Strategy: a single VLM call reads the uploaded document image and returns BOTH
 *   1) raw OCR text (preserving layout)
 *   2) structured JSON fields (vendor, gstin, amounts, line items, ...)
 *
 * This replaces the Tesseract + LLM combo from the original AutoFinDocs spec and
 * works for receipts, government IDs, GST invoices, purchase orders, delivery
 * challans, e-bills, credit/debit notes, bank statements, etc.
 */

import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs/promises'
import path from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'GST_INVOICE'
  | 'RECEIPT'
  | 'GOVT_ID'
  | 'E_BILL'
  | 'PURCHASE_ORDER'
  | 'DELIVERY_CHALLAN'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'BANK_STATEMENT'
  | 'UNKNOWN'

export type FraudRisk = 'LOW' | 'MEDIUM' | 'HIGH'

export interface LineItem {
  description?: string
  quantity?: number | string
  rate?: number | string
  amount?: number | string
  hsn?: string // HSN/SAC code (India)
}

export interface ExtractedData {
  documentType: DocumentType
  // Parties
  vendorName?: string
  vendorGstin?: string
  vendorAddress?: string
  vendorPhone?: string
  vendorEmail?: string
  customerName?: string
  customerGstin?: string
  customerAddress?: string
  // Identifiers
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  // Money (all as strings to preserve formatting / currency symbols)
  currency?: string
  subtotal?: string
  taxAmount?: string
  cgst?: string
  sgst?: string
  igst?: string
  totalAmount?: string
  // For government IDs
  idType?: string // PAN | AADHAAR | PASSPORT | DRIVING_LICENSE | VOTER_ID
  idNumber?: string
  idHolderName?: string
  idDateOfBirth?: string
  // For bank statements
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  statementPeriod?: string
  // Line items
  lineItems?: LineItem[]
  // Misc
  poNumber?: string
  deliveryChallanNumber?: string
  paymentMethod?: string
  notes?: string
  // Quality signals
  fraudIndicators?: string[]
  fraudRisk: FraudRisk
}

export interface OcrResult {
  ocrText: string
  confidence: number
  extracted: ExtractedData
}

// ─── VLM instance caching ────────────────────────────────────────────────────

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert document analysis AI specialized in Indian and international financial documents.

Analyze the attached document image carefully. You must:

1. **OCR**: Transcribe ALL visible text exactly as it appears, preserving layout, line breaks, and column structure. Include every header, label, value, and footer.

2. **Classify** the document into exactly one of:
   - GST_INVOICE (tax invoice with GSTIN)
   - RECEIPT (simple payment receipt, no GST)
   - GOVT_ID (PAN card, Aadhaar, passport, driving license, voter ID)
   - E_BILL (electricity/water/gas/telecom bill)
   - PURCHASE_ORDER (PO from buyer to supplier)
   - DELIVERY_CHALLAN (goods delivery note)
   - CREDIT_NOTE
   - DEBIT_NOTE
   - BANK_STATEMENT
   - UNKNOWN (if none of the above)

3. **Extract** structured fields. Only include a field if you can clearly read it. Use empty string or omit if not present.

4. **Fraud risk assessment**: Look for red flags like:
   - Mismatched GSTIN format (Indian GSTIN = 15 chars: 2 state code + 10 PAN + 1 entity + 1 Z + 1 checksum)
   - Inconsistent totals (subtotal + tax ≠ total)
   - Missing mandatory fields for the doc type
   - Suspicious vendor names or generic placeholders
   - Hand-written alterations on a printed doc
   Rate as LOW, MEDIUM, or HIGH.

Return your answer as STRICT JSON with this exact structure (no markdown, no code fences, no commentary):

{
  "ocrText": "<full transcribed text, preserving layout with \\n>",
  "confidence": <0.0-1.0 number, your overall confidence>,
  "extracted": {
    "documentType": "<one of the types above>",
    "vendorName": "",
    "vendorGstin": "",
    "vendorAddress": "",
    "vendorPhone": "",
    "vendorEmail": "",
    "customerName": "",
    "customerGstin": "",
    "customerAddress": "",
    "invoiceNumber": "",
    "invoiceDate": "",
    "dueDate": "",
    "currency": "INR",
    "subtotal": "",
    "taxAmount": "",
    "cgst": "",
    "sgst": "",
    "igst": "",
    "totalAmount": "",
    "idType": "",
    "idNumber": "",
    "idHolderName": "",
    "idDateOfBirth": "",
    "bankName": "",
    "accountNumber": "",
    "ifscCode": "",
    "statementPeriod": "",
    "poNumber": "",
    "deliveryChallanNumber": "",
    "paymentMethod": "",
    "notes": "",
    "lineItems": [
      {"description":"","quantity":"","rate":"","amount":"","hsn":""}
    ],
    "fraudIndicators": [],
    "fraudRisk": "LOW"
  }
}`

// ─── Image → base64 helper ────────────────────────────────────────────────────

async function fileToBase64(filePath: string, mimeType: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  return `data:${mimeType};base64,${buf.toString('base64')}`
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.bmp':
      return 'image/bmp'
    case '.pdf':
      return 'application/pdf'
    default:
      return 'image/jpeg'
  }
}

// ─── Main OCR + extraction function ───────────────────────────────────────────

export async function processDocument(
  filePath: string,
  fileName: string,
): Promise<OcrResult> {
  const mimeType = getMimeType(fileName)
  const dataUrl = await fileToBase64(filePath, mimeType)

  const zai = await getZai()

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices[0]?.message?.content ?? ''

  // The model may wrap JSON in markdown fences despite instructions — strip them.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: OcrResult
  try {
    parsed = JSON.parse(cleaned) as OcrResult
  } catch {
    // Fallback: keep raw text as OCR, mark as unknown
    parsed = {
      ocrText: raw,
      confidence: 0.3,
      extracted: {
        documentType: 'UNKNOWN',
        fraudRisk: 'MEDIUM',
        fraudIndicators: ['Model returned non-JSON response'],
      },
    }
  }

  // Safety defaults
  if (!parsed.extracted) {
    parsed.extracted = { documentType: 'UNKNOWN', fraudRisk: 'MEDIUM' }
  }
  if (!parsed.extracted.documentType) parsed.extracted.documentType = 'UNKNOWN'
  if (!parsed.extracted.fraudRisk) parsed.extracted.fraudRisk = 'LOW'
  if (typeof parsed.confidence !== 'number') parsed.confidence = 0.8

  return parsed
}

// ─── Copilot chat (LLM) ───────────────────────────────────────────────────────

export async function copilotChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const zai = await getZai()

  const systemPrompt = `You are AutoFinDocs Copilot, an AI assistant for a finance document automation platform.
You help users understand their uploaded documents (invoices, receipts, government IDs, POs, etc.),
explain GST/tax concepts, suggest workflow actions, and summarize document data.

Be concise, professional, and helpful. Use bullet points and short paragraphs.
If asked about a specific document and you don't have its data in the conversation context,
tell the user to open the document first or ask a general question.`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      ...messages,
    ],
    thinking: { type: 'disabled' },
  })

  return completion.choices[0]?.message?.content ?? ''
}
