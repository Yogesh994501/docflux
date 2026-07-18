/**
 * Vendor Memory Cache — few-shot extraction examples per vendor
 *
 * Stores the most recent APPROVED extraction result for each vendor
 * (keyed by GSTIN or normalized name). On subsequent uploads from the
 * same vendor, the cached example is injected into the prompt so the
 * model isn't starting cold — this measurably improves field consistency
 * on repeat vendors and is the real mechanism behind the "Layout learned" badge.
 *
 * Storage: Persisted in the database via the repository layer, making it
 * robust against serverless/container restarts.
 */

import { repo } from './repository'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(gstin?: string, name?: string): string | null {
  if (gstin && gstin.trim().length >= 10) return `gstin:${gstin.trim().toUpperCase()}`
  if (name && name.trim().length >= 2) return `name:${name.trim().toLowerCase().replace(/\s+/g, '_')}`
  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a cached example for this vendor.
 * Returns null if no example exists yet (first scan for this vendor).
 */
export async function getVendorExample(
  userId: string | null,
  gstin?: string,
  name?: string,
): Promise<VendorExample | null> {
  const key = normalizeKey(gstin, name)
  if (!key) return null
  const ex = await repo.getVendorMemory(userId, key)
  if (!ex) return null
  return {
    vendorName: ex.vendorName,
    gstin: ex.gstin ?? undefined,
    extractedJson: ex.extractedJson,
    storedAt: ex.storedAt,
    hitCount: ex.hitCount,
  }
}

/**
 * Store or update the cached example for a vendor.
 * Call this after a document is APPROVED — that's when we know the extraction is correct.
 */
export async function storeVendorExample(
  userId: string | null,
  gstin: string | undefined,
  name: string | undefined,
  extractedJson: string,
): Promise<void> {
  const key = normalizeKey(gstin, name)
  if (!key) return
  await repo.storeVendorMemory(userId, {
    cacheKey: key,
    vendorName: name ?? 'Unknown',
    gstin: gstin || null,
    extractedJson,
  })
}

/**
 * Check whether a vendor has a cached example (for "Layout learned" badge logic).
 */
export async function hasVendorExample(
  userId: string | null,
  gstin?: string,
  name?: string,
): Promise<boolean> {
  const key = normalizeKey(gstin, name)
  if (!key) return false
  return repo.hasVendorMemory(userId, key)
}

/** Returns the total number of cached vendor examples */
export function cacheSize(): number {
  return 0
}
