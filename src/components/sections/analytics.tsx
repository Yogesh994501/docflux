'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalyticsQuery, formatCurrency } from '@/lib/queries'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
} from 'recharts'
import { TrendingUp, BarChart3, PieChart as PieIcon, Building2, IndianRupee } from 'lucide-react'
import { getDocTypeMeta } from '@/lib/constants'

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#fb923c', '#14b8a6', '#64748b', '#a3e635']

export function AnalyticsSection() {
  const { data: a, isLoading } = useAnalyticsQuery()

  if (isLoading || !a) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    )
  }

  const typeData = a.typeDistribution.map((t) => ({
    name: getDocTypeMeta(t.type).label,
    value: t.count,
    type: t.type,
  }))

  const vendorData = a.topVendors.map((v) => ({
    name: v.name.length > 20 ? v.name.slice(0, 18) + '…' : v.name,
    fullName: v.name,
    spend: v.totalSpend,
    docs: v.count,
  }))

  const totalApproved = a.counts.approved
  const totalProcessed = a.counts.approved + a.counts.rejected
  const approvalRate = totalProcessed > 0 ? (totalApproved / totalProcessed) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IndianRupee className="h-3.5 w-3.5" /> Total Spend Tracked
            </div>
            <div className="mt-1 text-2xl font-bold">{formatCurrency(a.totalSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Approval Rate
            </div>
            <div className="mt-1 text-2xl font-bold">{approvalRate.toFixed(1)}%</div>
            <div className="text-[11px] text-muted-foreground">{totalApproved} of {totalProcessed} processed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Avg Docs / Month
            </div>
            <div className="mt-1 text-2xl font-bold">
              {(a.spendTrend.reduce((s, m) => s + m.count, 0) / Math.max(1, a.spendTrend.length)).toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> Active Vendors
            </div>
            <div className="mt-1 text-2xl font-bold">{a.topVendors.length}</div>
            <div className="text-[11px] text-muted-foreground">with spend recorded</div>
          </CardContent>
        </Card>
      </div>

      {/* Spend trend line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Monthly Spend Trend
          </CardTitle>
          <CardDescription>Total invoice value processed per month (last 6 months)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={a.spendTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(v).replace('₹', '')}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number) => [formatCurrency(v), 'Spend']}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="var(--color-chart-1)"
                strokeWidth={3}
                dot={{ fill: 'var(--color-chart-1)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top vendors bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Top Vendors by Spend
            </CardTitle>
            <CardDescription>Highest-value supplier relationships</CardDescription>
          </CardHeader>
          <CardContent>
            {vendorData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No vendor spend data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vendorData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v).replace('₹', '')}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v: number, _n, p) => [formatCurrency(v), `Spend (${(p.payload as { docs: number }).docs} docs)`]}
                  />
                  <Bar dataKey="spend" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Document type pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-primary" />
              Document Type Distribution
            </CardTitle>
            <CardDescription>What kinds of documents you process</CardDescription>
          </CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No documents yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(e: { name: string; value: number }) => `${e.name}: ${e.value}`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fraud distribution radial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fraud Risk Distribution</CardTitle>
            <CardDescription>AI-flagged risk levels across all documents</CardDescription>
          </CardHeader>
          <CardContent>
            {a.fraudDistribution.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadialBarChart
                  innerRadius="30%"
                  outerRadius="100%"
                  data={a.fraudDistribution.map((f, i) => ({
                    name: f.risk,
                    count: f.count,
                    fill: f.risk === 'HIGH' ? '#f43f5e' : f.risk === 'MEDIUM' ? '#f59e0b' : '#10b981',
                    key: i,
                  }))}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background dataKey="count" cornerRadius={6} />
                  <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <CardDescription>Pipeline state of all documents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={a.statusDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="status" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {a.statusDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
