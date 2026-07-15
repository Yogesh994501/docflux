'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useAnalyticsQuery, formatCurrency } from '@/lib/queries'
import { SpotlightCard, FadeInUp, AnimatedCounter } from '@/components/motion-primitives'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar, Legend } from 'recharts'
import { TrendingUp, BarChart3, PieChart as PieIcon, Building2, IndianRupee } from 'lucide-react'
import { getDocTypeMeta } from '@/lib/constants'

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#fb923c', '#14b8a6', '#64748b', '#a3e635']

export function AnalyticsSection() {
  const { data: a, isLoading } = useAnalyticsQuery()
  if (isLoading || !a) {
    return <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
  }

  const typeData = a.typeDistribution.map((t) => ({ name: getDocTypeMeta(t.type).label, value: t.count }))
  const vendorData = a.topVendors.map((v) => ({ name: v.name.length > 20 ? v.name.slice(0, 18) + '…' : v.name, spend: v.totalSpend, docs: v.count }))
  const totalApproved = a.counts.approved
  const totalProcessed = a.counts.approved + a.counts.rejected
  const approvalRate = totalProcessed > 0 ? (totalApproved / totalProcessed) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: IndianRupee, label: 'Total Spend', value: a.totalSpend, format: formatCurrency, tint: 'bg-foreground/[0.06] text-foreground' },
          { icon: TrendingUp, label: 'Approval Rate', value: approvalRate, format: (n: number) => `${n.toFixed(1)}%`, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
          { icon: BarChart3, label: 'Avg Docs / Month', value: a.spendTrend.reduce((s, m) => s + m.count, 0) / Math.max(1, a.spendTrend.length), format: (n: number) => n.toFixed(1), tint: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300' },
          { icon: Building2, label: 'Active Vendors', value: a.topVendors.length, format: (n: number) => n.toLocaleString(), tint: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300' },
        ].map((kpi, i) => (
          <FadeInUp key={kpi.label} delay={i * 0.05}>
            <SpotlightCard className="p-4 h-full">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.tint}`}><kpi.icon className="h-4.5 w-4.5" /></div>
              <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums"><AnimatedCounter value={kpi.value} format={kpi.format} /></div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </SpotlightCard>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.2}>
        <SpotlightCard className="p-0">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2 text-base font-semibold"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Monthly Spend Trend</div>
            <div className="text-xs text-muted-foreground">Total invoice value per month (last 6 months)</div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={a.spendTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v).replace('₹', '')} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v), 'Spend']} />
                <Line type="monotone" dataKey="spend" stroke="var(--color-chart-1)" strokeWidth={3} dot={{ fill: 'var(--color-chart-1)', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </FadeInUp>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeInUp delay={0.3}>
          <SpotlightCard className="p-0 h-full">
            <div className="border-b border-border/60 px-5 py-4"><div className="flex items-center gap-2 text-base font-semibold"><Building2 className="h-4 w-4 text-muted-foreground" /> Top Vendors by Spend</div><div className="text-xs text-muted-foreground">Highest-value supplier relationships</div></div>
            <div className="p-4">
              {vendorData.length === 0 ? <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No vendor spend data yet</div> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vendorData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v).replace('₹', '')} />
                    <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={110} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} formatter={(v: number, _n, p) => [formatCurrency(v), `Spend (${(p.payload as { docs: number }).docs} docs)`]} />
                    <Bar dataKey="spend" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SpotlightCard>
        </FadeInUp>

        <FadeInUp delay={0.35}>
          <SpotlightCard className="p-0 h-full">
            <div className="border-b border-border/60 px-5 py-4"><div className="flex items-center gap-2 text-base font-semibold"><PieIcon className="h-4 w-4 text-muted-foreground" /> Document Type Distribution</div><div className="text-xs text-muted-foreground">What you process</div></div>
            <div className="p-4">
              {typeData.length === 0 ? <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No documents yet</div> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: { name: string; value: number }) => `${e.name}: ${e.value}`} labelLine={false} fontSize={10}>
                      {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </SpotlightCard>
        </FadeInUp>

        <FadeInUp delay={0.4}>
          <SpotlightCard className="p-0 h-full">
            <div className="border-b border-border/60 px-5 py-4"><div className="text-base font-semibold">Fraud Risk Distribution</div><div className="text-xs text-muted-foreground">AI-flagged risk levels</div></div>
            <div className="p-4">
              {a.fraudDistribution.length === 0 ? <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No data</div> : (
                <ResponsiveContainer width="100%" height={280}>
                  <RadialBarChart innerRadius="30%" outerRadius="100%" data={a.fraudDistribution.map((f) => ({ name: f.risk, count: f.count, fill: f.risk === 'HIGH' ? '#f43f5e' : f.risk === 'MEDIUM' ? '#f59e0b' : '#10b981' }))} startAngle={90} endAngle={-270}>
                    <RadialBar background dataKey="count" cornerRadius={6} />
                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SpotlightCard>
        </FadeInUp>

        <FadeInUp delay={0.45}>
          <SpotlightCard className="p-0 h-full">
            <div className="border-b border-border/60 px-5 py-4"><div className="text-base font-semibold">Status Breakdown</div><div className="text-xs text-muted-foreground">Pipeline state of all documents</div></div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={a.statusDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="status" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>{a.statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>
        </FadeInUp>
      </div>
    </div>
  )
}
