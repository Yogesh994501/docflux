'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVendorsQuery, useCreateVendorMutation, formatCurrency } from '@/lib/queries'
import { Building2, Search, Plus, Mail, Phone, MapPin, FileText, IndianRupee, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { SpotlightCard, FadeInUp, StaggerContainer, StaggerItem, AnimatedCounter } from '@/components/motion-primitives'

export function VendorsSection() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useVendorsQuery(search || undefined)
  const vendors = data?.items ?? []
  const totalSpend = vendors.reduce((a, v) => a + (v.totalSpend ?? 0), 0)
  const totalDocs = vendors.reduce((a, v) => a + (v.documentCount ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FadeInUp>
          <SpotlightCard className="flex items-center gap-3 p-4 h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground"><Building2 className="h-5 w-5" /></div>
            <div><div className="text-2xl font-semibold tracking-tight tabular-nums"><AnimatedCounter value={vendors.length} /></div><div className="text-xs text-muted-foreground">Vendors</div></div>
          </SpotlightCard>
        </FadeInUp>
        <FadeInUp delay={0.05}>
          <SpotlightCard className="flex items-center gap-3 p-4 h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy-800/10 text-brand-navy-800"><FileText className="h-5 w-5" /></div>
            <div><div className="text-2xl font-semibold tracking-tight tabular-nums"><AnimatedCounter value={totalDocs} /></div><div className="text-xs text-muted-foreground">Linked documents</div></div>
          </SpotlightCard>
        </FadeInUp>
        <FadeInUp delay={0.1}>
          <SpotlightCard className="flex items-center gap-3 p-4 h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-terracotta-tint text-brand-terracotta"><IndianRupee className="h-5 w-5" /></div>
            <div><div className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={totalSpend} format={formatCurrency} /></div><div className="text-xs text-muted-foreground">Total spend</div></div>
          </SpotlightCard>
        </FadeInUp>
      </div>

      <FadeInUp delay={0.15}>
        <SpotlightCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search vendors by name, GSTIN, or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl pl-9" />
            </div>
            <Button onClick={() => setShowCreate(true)} className="rounded-xl"><Plus className="mr-1.5 h-4 w-4" /> Add vendor</Button>
          </div>
        </SpotlightCard>
      </FadeInUp>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : vendors.length === 0 ? (
        <SpotlightCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-2xl bg-muted p-4"><Building2 className="h-8 w-8 text-muted-foreground" /></div>
          <div><div className="text-sm font-medium">No vendors yet</div><div className="text-xs text-muted-foreground">Vendors are created automatically when you upload invoices, or add one manually</div></div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-xl"><Plus className="mr-1.5 h-4 w-4" /> Add your first vendor</Button>
        </SpotlightCard>
      ) : (
        <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <StaggerItem key={v.id}>
              <SpotlightCard className="flex flex-col p-4 h-full">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" title={v.name}>{v.name}</div>
                    {v.gstin && <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{v.gstin}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {v.category && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{v.category}</span>}
                    {(v.documentCount ?? 0) >= 3 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-terracotta-tint border border-brand-terracotta/20 px-2 py-0.5 text-[10px] font-semibold text-brand-terracotta">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Layout learned
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {v.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate">{v.email}</span></div>}
                  {v.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> <span>{v.phone}</span></div>}
                  {v.address && <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> <span className="line-clamp-2">{v.address}</span></div>}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
                  <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Documents</div><div className="text-sm font-semibold tabular-nums">{v.documentCount ?? 0}</div></div>
                  <div className="text-right"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Spend</div><div className="text-sm font-semibold tabular-nums">{formatCurrency(v.totalSpend ?? 0)}</div></div>
                </div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <CreateVendorDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

function CreateVendorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateVendorMutation()
  const [form, setForm] = useState({ name: '', gstin: '', pan: '', email: '', phone: '', address: '', category: 'supplier' })
  const submit = () => {
    if (!form.name) { toast.error('Name is required'); return }
    create.mutate(form, { onSuccess: () => { toast.success('Vendor created'); onOpenChange(false); setForm({ name: '', gstin: '', pan: '', email: '', phone: '', address: '', category: 'supplier' }) }, onError: (e) => toast.error('Create failed: ' + e.message) })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle className="tracking-tight">Add Vendor / Customer</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Pvt Ltd" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="27AABCT1332L1ZJ" className="font-mono text-xs" /></div>
            <div><Label>PAN</Label><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} placeholder="AABCT1332L" className="font-mono text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="billing@acme.in" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 22 4567 8901" /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="14, IT Park, Pune 411057" /></div>
          <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create vendor'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
