import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, err } from '@/lib/constants'

export async function GET(_req: NextRequest) {
  try {
    const [
      total,
      approved,
      rejected,
      pending,
      processing,
      extracted,
      failed,
    ] = await Promise.all([
      db.document.count(),
      db.document.count({ where: { status: 'APPROVED' } }),
      db.document.count({ where: { status: 'REJECTED' } }),
      db.document.count({ where: { status: 'EXTRACTED' } }),
      db.document.count({ where: { status: 'PROCESSING' } }),
      db.document.count({ where: { status: 'EXTRACTED' } }),
      db.document.count({ where: { status: 'FAILED' } }),
    ])

    // Document type distribution
    const typeGroups = await db.document.groupBy({
      by: ['documentType'],
      _count: true,
    })

    // Status distribution
    const statusGroups = await db.document.groupBy({
      by: ['status'],
      _count: true,
    })

    // Fraud risk distribution
    const fraudGroups = await db.document.groupBy({
      by: ['fraudRisk'],
      _count: true,
    })

    // Vendor breakdown (top by doc count + total spend)
    const vendorDocs = await db.document.findMany({
      where: { vendorId: { not: null } },
      select: { vendorId: true, extractedData: true, vendor: { select: { name: true } } },
    })

    const vendorMap = new Map<string, { name: string; count: number; totalSpend: number }>()
    for (const d of vendorDocs) {
      if (!d.vendorId || !d.vendor) continue
      const key = d.vendorId
      const entry = vendorMap.get(key) ?? { name: d.vendor.name, count: 0, totalSpend: 0 }
      entry.count += 1
      // try to parse total amount
      if (d.extractedData) {
        try {
          const data = JSON.parse(d.extractedData)
          const amt = parseFloat(String(data.totalAmount ?? '0').replace(/[^0-9.]/g, ''))
          if (!isNaN(amt)) entry.totalSpend += amt
        } catch { /* ignore */ }
      }
      vendorMap.set(key, entry)
    }
    const topVendors = Array.from(vendorMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 8)

    // Spend trend (last 6 months)
    const now = new Date()
    const months: { label: string; spend: number; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthDocs = await db.document.findMany({
        where: { uploadedAt: { gte: start, lt: end } },
        select: { extractedData: true },
      })
      let spend = 0
      for (const d of monthDocs) {
        if (d.extractedData) {
          try {
            const data = JSON.parse(d.extractedData)
            const amt = parseFloat(String(data.totalAmount ?? '0').replace(/[^0-9.]/g, ''))
            if (!isNaN(amt)) spend += amt
          } catch { /* ignore */ }
        }
      }
      months.push({
        label: start.toLocaleString('en-US', { month: 'short' }),
        spend,
        count: monthDocs.length,
      })
    }

    // Total spend (all time)
    let totalSpend = 0
    for (const v of vendorMap.values()) totalSpend += v.totalSpend

    return NextResponse.json(ok({
      counts: {
        total, approved, rejected, pending, processing, extracted, failed,
      },
      typeDistribution: typeGroups.map((g) => ({
        type: g.documentType ?? 'UNKNOWN',
        count: g._count,
      })),
      statusDistribution: statusGroups.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      fraudDistribution: fraudGroups.map((g) => ({
        risk: g.fraudRisk ?? 'LOW',
        count: g._count,
      })),
      topVendors,
      spendTrend: months,
      totalSpend,
    }))
  } catch (e) {
    console.error('[GET /api/analytics]', e)
    return NextResponse.json(err('Failed to fetch analytics'), { status: 500 })
  }
}
