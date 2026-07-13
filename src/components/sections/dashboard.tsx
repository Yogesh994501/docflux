'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAnalyticsQuery,
  useDocumentsQuery,
  formatCurrency,
  formatRelativeTime,
} from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import {
  DocTypeBadge,
  StatusBadge,
  FraudRiskBadge,
} from '@/components/shared-badges'
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Upload as UploadIcon,
  ArrowRight,
  IndianRupee,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

const PIE_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#fb923c', '#14b8a6', '#64748b', '#a3e635']

export function DashboardSection() {
  const { data: analytics, isLoading } = useAnalyticsQuery()
  const { setSection, openDetail } = useAppStore()
  const { data: recentDocs } = useDocumentsQuery({ page: 1, pageSize: 6 })

  if (isLoading || !analytics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  const c = analytics.counts

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<FileText className="h-4.5 w-4.5" />}
          label="Total Documents"
          value={c.total.toLocaleString()}
          sub={`${c.processing} processing`}
          accent="primary"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          label="Approved"
          value={c.approved.toLocaleString()}
          sub={`${c.rejected} rejected`}
          accent="emerald"
        />
        <KpiCard
          icon={<Clock className="h-4.5 w-4.5" />}
          label="Pending Review"
          value={c.extracted.toLocaleString()}
          sub="awaiting approval"
          accent="amber"
        />
        <KpiCard
          icon={<IndianRupee className="h-4.5 w-4.5" />}
          label="Total Spend"
          value={formatCurrency(analytics.totalSpend)}
          sub="across all docs"
          accent="violet"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Spend trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Document Volume & Spend (6 months)
            </CardTitle>
            <CardDescription>Monthly uploads and total invoice value</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.spendTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#spendGrad)"
                  name="Spend (₹)"
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  fill="url(#countGrad)"
                  name="Doc count"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Types</CardTitle>
            <CardDescription>Distribution by classification</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.typeDistribution.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No documents yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.typeDistribution}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {analytics.typeDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-popover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {analytics.typeDistribution.slice(0, 6).map((t, i) => (
                <div key={t.type} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{t.type}</span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent documents + fraud alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Documents</CardTitle>
              <CardDescription>Latest uploads across all types</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSection('documents')}>
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recentDocs?.items ?? []).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => openDetail(doc.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{doc.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.vendor?.name ?? 'Unlinked vendor'} · {formatRelativeTime(doc.uploadedAt)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <DocTypeBadge type={doc.documentType} />
                    <StatusBadge status={doc.status} />
                  </div>
                </button>
              ))}
              {(!recentDocs?.items || recentDocs.items.length === 0) && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <UploadIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">No documents yet</div>
                    <div className="text-xs text-muted-foreground">
                      Upload a receipt, invoice, or government ID to get started
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setSection('upload')}>
                    <UploadIcon className="mr-1.5 h-4 w-4" /> Upload document
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fraud & status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Fraud Risk
            </CardTitle>
            <CardDescription>Documents flagged by AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.fraudDistribution.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data</div>
              ) : (
                analytics.fraudDistribution.map((f) => {
                  const total = analytics.fraudDistribution.reduce((a, b) => a + b.count, 0)
                  const pct = total > 0 ? (f.count / total) * 100 : 0
                  const color =
                    f.risk === 'HIGH' ? 'bg-rose-500' :
                    f.risk === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                  return (
                    <div key={f.risk}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{f.risk}</span>
                        <span className="text-muted-foreground">{f.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-6">
              <CardTitle className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Breakdown
              </CardTitle>
              <div className="space-y-1.5">
                {analytics.statusDistribution.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.status}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: 'primary' | 'emerald' | 'amber' | 'violet'
}) {
  const accentClass = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  }[accent]

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClass}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}
