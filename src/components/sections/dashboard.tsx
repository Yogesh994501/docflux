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
  Sparkles,
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
} from 'recharts'
import { motion } from 'framer-motion'
import {
  AnimatedCounter,
  SpotlightCard,
  StaggerContainer,
  StaggerItem,
  FadeInUp,
  AuroraText,
} from '@/components/motion-primitives'

const PIE_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#fb923c', '#14b8a6', '#64748b', '#a3e635']

export function DashboardSection() {
  const { data: analytics, isLoading } = useAnalyticsQuery()
  const { setSection, openDetail } = useAppStore()
  const { data: recentDocs } = useDocumentsQuery({ page: 1, pageSize: 6 })

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const c = analytics.counts

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <FadeInUp>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome back. <AuroraText>Here's your pipeline.</AuroraText>
          </h2>
          <p className="text-sm text-muted-foreground">
            {c.total} documents processed · {c.pending} awaiting review · {formatCurrency(analytics.totalSpend)} total spend tracked
          </p>
        </div>
      </FadeInUp>

      {/* KPI cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <SpotlightCard className="p-5 h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={c.total} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{c.processing} processing now</div>
          </SpotlightCard>
        </StaggerItem>

        <StaggerItem>
          <SpotlightCard className="p-5 h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Approved</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={c.approved} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{c.rejected} rejected</div>
          </SpotlightCard>
        </StaggerItem>

        <StaggerItem>
          <SpotlightCard className="p-5 h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={c.extracted} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">awaiting your review</div>
          </SpotlightCard>
        </StaggerItem>

        <StaggerItem>
          <SpotlightCard className="p-5 h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                <IndianRupee className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Spend</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={analytics.totalSpend} format={formatCurrency} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">across all documents</div>
          </SpotlightCard>
        </StaggerItem>
      </StaggerContainer>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FadeInUp delay={0.2} className="lg:col-span-2">
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Volume & Spend
              </CardTitle>
              <CardDescription>Monthly uploads and total invoice value</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics.spendTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-popover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  />
                  <Area type="monotone" dataKey="spend" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#spendGrad)" name="Spend (₹)" />
                  <Area type="monotone" dataKey="count" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#countGrad)" name="Docs" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.3}>
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Document Types</CardTitle>
              <CardDescription>By classification</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.typeDistribution.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No documents yet</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={analytics.typeDistribution} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {analytics.typeDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="var(--color-card)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                    {analytics.typeDistribution.slice(0, 6).map((t, i) => (
                      <div key={t.type} className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{t.type.replace(/_/g, ' ')}</span>
                        <span className="font-medium tabular-nums">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      {/* Recent documents + fraud */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FadeInUp delay={0.4} className="lg:col-span-2">
          <Card className="premium-card rounded-2xl">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Recent Documents</CardTitle>
                <CardDescription>Latest uploads</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSection('documents')} className="rounded-lg">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {(recentDocs?.items ?? []).map((doc, i) => (
                  <motion.button
                    key={doc.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                    onClick={() => openDetail(doc.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all hover:border-border hover:bg-accent/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {doc.fileType.startsWith('image/') ? (
                        <img src={doc.storagePath} alt={doc.fileName} className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{doc.fileName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {doc.vendor?.name ?? 'Unlinked'} · {formatRelativeTime(doc.uploadedAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <DocTypeBadge type={doc.documentType} />
                      <StatusBadge status={doc.status} />
                    </div>
                  </motion.button>
                ))}
                {(!recentDocs?.items || recentDocs.items.length === 0) && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="rounded-2xl bg-muted p-4">
                      <UploadIcon className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">No documents yet</div>
                      <div className="text-xs text-muted-foreground">Upload a receipt, invoice, or government ID to begin</div>
                    </div>
                    <Button size="sm" onClick={() => setSection('upload')} className="rounded-lg">
                      <UploadIcon className="mr-1.5 h-4 w-4" /> Upload document
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.5}>
          <Card className="premium-card rounded-2xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Fraud Risk
              </CardTitle>
              <CardDescription>AI-flagged documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.fraudDistribution.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data</div>
                ) : (
                  analytics.fraudDistribution.map((f, i) => {
                    const total = analytics.fraudDistribution.reduce((a, b) => a + b.count, 0)
                    const pct = total > 0 ? (f.count / total) * 100 : 0
                    const color = f.risk === 'HIGH' ? 'bg-rose-500' : f.risk === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                    return (
                      <motion.div
                        key={f.risk}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{f.risk}</span>
                          <span className="text-muted-foreground tabular-nums">{f.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className={color}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              <div className="mt-6 border-t border-border/60 pt-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Status Breakdown</div>
                <div className="space-y-1.5">
                  {analytics.statusDistribution.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.status}</span>
                      <span className="font-medium tabular-nums">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSection('analytics')}
                className="mt-4 w-full rounded-lg"
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" /> Explore analytics
              </Button>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  )
}
