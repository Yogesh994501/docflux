import { NextResponse } from 'next/server'
import { getDatabaseProvider } from '@/lib/repository'
import { getActiveProvider } from '@/lib/ai'
import { getAuthProvider, isAuthDisabled } from '@/lib/auth'
import { ok } from '@/lib/constants'

// Returns which DB + OCR + Auth provider the app is currently using.
export async function GET() {
  return NextResponse.json(ok({
    database: getDatabaseProvider(),
    ocr: getActiveProvider(),
    auth: getAuthProvider(),
    authDisabled: isAuthDisabled(),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  }))
}
