import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { auth } from '@/lib/auth'
import { ok, err } from '@/lib/constants'

export async function GET(_req: NextRequest) {
  try {
    const user = await auth.requireUser()
    const userId = user.id

    const [statusGroups, typeGroups, fraudGroups] = await Promise.all([
      repo.groupBy('status', userId),
      repo.groupBy('documentType', userId),
      repo.groupBy('fraudRisk', userId),
    ])

    const countOf = (groups: { key: string | null; count: number }[], key: string) =>
      groups.find((g) => g.key === key)?.count ?? 0

    const total = statusGroups.reduce((a, g) => a + g.count, 0)

    const vendors = await repo.listVendors(undefined, userId)
    const topVendors = vendors
      .map((v) => ({ name: v.name, count: v.documentCount ?? 0, totalSpend: v.totalSpend ?? 0 }))
      .filter((v) => v.totalSpend > 0)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 8)

    const totalSpend = vendors.reduce((a, v) => a + (v.totalSpend ?? 0), 0)

    const now = new Date()
    const months: { label: string; spend: number; count: number }[] = []
    const { items: allDocs } = await repo.listDocuments({ page: 1, pageSize: 1000, userId })
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthDocs = allDocs.filter((d) => new Date(d.uploadedAt) >= start && new Date(d.uploadedAt) < end)
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
      months.push({ label: start.toLocaleString('en-US', { month: 'short' }), spend, count: monthDocs.length })
    }

    return NextResponse.json(ok({
      counts: {
        total,
        approved: countOf(statusGroups, 'APPROVED'),
        rejected: countOf(statusGroups, 'REJECTED'),
        pending: countOf(statusGroups, 'EXTRACTED'),
        processing: countOf(statusGroups, 'PROCESSING'),
        extracted: countOf(statusGroups, 'EXTRACTED'),
        failed: countOf(statusGroups, 'FAILED'),
      },
      typeDistribution: typeGroups.map((g) => ({ type: g.key ?? 'UNKNOWN', count: g.count })),
      statusDistribution: statusGroups.map((g) => ({ status: g.key ?? 'UNKNOWN', count: g.count })),
      fraudDistribution: fraudGroups.map((g) => ({ risk: g.key ?? 'LOW', count: g.count })),
      topVendors,
      spendTrend: months,
      totalSpend,
    }))
  } catch (e) {
    console.error('[GET /api/analytics]', e)
    const status = (e as Error).message === 'Unauthorized' ? 401 : 500
    return NextResponse.json(err('Failed to fetch analytics'), { status })
  }
}
