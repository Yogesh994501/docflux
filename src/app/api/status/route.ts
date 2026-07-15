import { NextResponse } from 'next/server'
import { getDatabaseProvider } from '@/lib/repository'
import { getActiveProvider } from '@/lib/ai'
import { ok } from '@/lib/constants'

// Returns which DB + OCR provider the app is currently using — shown in the UI.
export async function GET() {
  return NextResponse.json(ok({
    database: getDatabaseProvider(),
    ocr: getActiveProvider(),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  }))
}
