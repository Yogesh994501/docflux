/**
 * Vendor Memory Cache — few-shot extraction examples per vendor
 *
 * Stores the most recent APPROVED extraction result for each vendor
 * (keyed by GSTIN or normalized name). On subsequent uploads from the
 * same vendor, the cached example is injected into the prompt so the
 * model isn't starting cold — this measurably improves field consistency
 * on repeat vendors and is the real mechanism behind the "Layout learned" badge.
 *
 * Storage: in-memory Map (process lifetime) + optional JSON file for
 * persistence across restarts. File path: ./.vendor-memory.json
 * The file is gitignored — it is user-specific runtime state.
 */

import fs from 'fs/promises'
import path from 'path'

export interface VendorExample {
  vendorName: string
  gstin?: string
  /** The corrected ExtractedData JSON (stringified) */
  extractedJson: string
  /** ISO timestamp of when this example was stored */
  storedAt: string
  /** How many times this vendor's cache has been used */
  hitCount: number
}

type CacheKey = string // GSTIN (preferred) or normalized vendor name

const CACHE_FILE = path.join(process.cwd(), '.vendor-memory.json')

// ─── In-memory store ──────────────────────────────────────────────────────────

const memCache = new Map<CacheKey, VendorExample>()
let loaded = false

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(gstin?: string, name?: string): CacheKey | null {
  if (gstin && gstin.trim().length >= 10) return `gstin:${gstin.trim().toUpperCase()}`
  if (name && name.trim().length >= 2) return `name:${name.trim().toLowerCase().replace(/\s+/g, '_')}`
  return null
}

// ─── Load from disk ───────────────────────────────────────────────────────────

async function ensureLoaded() {
  if (loaded) return
  loaded = true
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8')
    const data = JSON.parse(raw) as Record<CacheKey, VendorExample>
    for (const [k, v] of Object.entries(data)) memCache.set(k, v)
    console.log(`[VendorMemory] Loaded ${memCache.size} cached vendor examples from disk`)
  } catch {
    // File doesn't exist yet — normal on first run
  }
}

async function persist() {
  try {
    const obj: Record<string, VendorExample> = {}
    for (const [k, v] of memCache.entries()) obj[k] = v
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (e) {
    console.warn('[VendorMemory] Could not persist cache:', e)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a cached example for this vendor.
 * Returns null if no example exists yet (first scan for this vendor).
 */
export async function getVendorExample(
  gstin?: string,
  name?: string,
): Promise<VendorExample | null> {
  await ensureLoaded()
  const key = normalizeKey(gstin, name)
  if (!key) return null
  const ex = memCache.get(key)
  if (!ex) return null
  // Increment hit count (non-blocking, fire-and-forget)
  ex.hitCount++
  persist().catch(() => {})
  return ex
}

/**
 * Store or update the cached example for a vendor.
 * Call this after a document is APPROVED — that's when we know the extraction is correct.
 */
export async function storeVendorExample(
  gstin: string | undefined,
  name: string | undefined,
  extractedJson: string,
): Promise<void> {
  await ensureLoaded()
  const key = normalizeKey(gstin, name)
  if (!key) return
  const existing = memCache.get(key)
  memCache.set(key, {
    vendorName: name ?? existing?.vendorName ?? 'Unknown',
    gstin,
    extractedJson,
    storedAt: new Date().toISOString(),
    hitCount: existing?.hitCount ?? 0,
  })
  await persist()
  console.log(`[VendorMemory] Stored example for key: ${key}`)
}

/**
 * Check whether a vendor has a cached example (for "Layout learned" badge logic).
 */
export async function hasVendorExample(
  gstin?: string,
  name?: string,
): Promise<boolean> {
  await ensureLoaded()
  const key = normalizeKey(gstin, name)
  if (!key) return false
  return memCache.has(key)
}

/** Returns the total number of cached vendor examples */
export function cacheSize(): number {
  return memCache.size
}
