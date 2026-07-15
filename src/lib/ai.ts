/**
 * AI library — OCR + structured field extraction
 *
 * Supports TWO vision providers (switchable via OCR_PROVIDER env var):
 *
 * 1. **Google Gemini 2.5 Flash** (OCR_PROVIDER="gemini") — Google's fast
 *    multimodal model. Excellent at document OCR + structured extraction.
 *    Requires GEMINI_API_KEY. Uses @google/genai SDK.
 *
 * 2. **Z.ai GLM-4.6V** (OCR_PROVIDER="zai", default) — Z.ai's vision model,
 *    available via z-ai-web-dev-sdk. No API key needed in this environment.
 *
 * Both providers return the same OcrResult shape so the rest of the app is
 * provider-agnostic.
 *
 * Strategy: a single vision call reads the uploaded document image and returns
 * BOTH raw OCR text AND structured JSON fields (vendor, gstin, amounts, line
 * items, fraud indicators) in one shot.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { GoogleGenAI } from '@google/genai'
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
  hsn?: string
}

export interface ExtractedData {
  documentType: DocumentType
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
  fraudRisk: FraudRisk
}

export interface OcrResult {
  ocrText: string
  confidence: number
  extracted: ExtractedData
  provider: 'gemini' | 'zai'
}

// ─── Provider selection ──────────────────────────────────────────────────────

type OcrProvider = 'gemini' | 'zai'

function getProvider(): OcrProvider {
  const configured = (process.env.OCR_PROVIDER ?? 'zai').toLowerCase() as OcrProvider
  if (configured === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini'
  // Fallback: if gemini requested but no key, use zai
  return 'zai'
}

export function getActiveProvider(): OcrProvider {
  return getProvider()
}

// ─── VLM instances (cached) ──────────────────────────────────────────────────

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create()
  return zaiInstance
}

let geminiInstance: GoogleGenAI | null = null
function getGemini() {
  if (!geminiInstance) {
    geminiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  }
  return geminiInstance
}

// ─── Shared extraction prompt ────────────────────────────────────────────────

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

async function fileToBase64(filePath: string, mimeType: string): Promise<{ data: string; mimeType: string }> {
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

// ─── Gemini Flash OCR ────────────────────────────────────────────────────────

async function processWithGemini(
  filePath: string,
  fileName: string,
): Promise<OcrResult> {
  const mimeType = getMimeType(fileName)
  const { data, mimeType: mt } = await fileToBase64(filePath, mimeType)
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const ai = getGemini()

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT },
          { inlineData: { data, mimeType: mt } },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const raw = response.text ?? ''
  return parseOcrResponse(raw, 'gemini')
}

// ─── Z.ai GLM-4.6V OCR ───────────────────────────────────────────────────────

async function processWithZai(
  filePath: string,
  fileName: string,
): Promise<OcrResult> {
  const mimeType = getMimeType(fileName)
  const { data, mimeType: mt } = await fileToBase64(filePath, mimeType)
  const zai = await getZai()

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mt};base64,${data}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices[0]?.message?.content ?? ''
  return parseOcrResponse(raw, 'zai')
}

// ─── Shared response parser ──────────────────────────────────────────────────

function parseOcrResponse(raw: string, provider: 'gemini' | 'zai'): OcrResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: OcrResult
  try {
    parsed = JSON.parse(cleaned) as OcrResult
  } catch {
    parsed = {
      ocrText: raw,
      confidence: 0.3,
      extracted: {
        documentType: 'UNKNOWN',
        fraudRisk: 'MEDIUM',
        fraudIndicators: ['Model returned non-JSON response'],
      },
      provider,
    }
  }

  if (!parsed.extracted) parsed.extracted = { documentType: 'UNKNOWN', fraudRisk: 'MEDIUM' }
  if (!parsed.extracted.documentType) parsed.extracted.documentType = 'UNKNOWN'
  if (!parsed.extracted.fraudRisk) parsed.extracted.fraudRisk = 'LOW'
  if (typeof parsed.confidence !== 'number') parsed.confidence = 0.8
  parsed.provider = provider
  return parsed
}

// ─── Main OCR + extraction entry point ───────────────────────────────────────

export async function processDocument(
  filePath: string,
  fileName: string,
): Promise<OcrResult> {
  const provider = getProvider()
  if (provider === 'gemini') {
    try {
      return await processWithGemini(filePath, fileName)
    } catch (e) {
      console.error('[Gemini OCR failed, falling back to Z.ai]', e)
      return await processWithZai(filePath, fileName)
    }
  }
  return await processWithZai(filePath, fileName)
}

// ─── Copilot chat (LLM — always Z.ai) ────────────────────────────────────────

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
