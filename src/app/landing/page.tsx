'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileCheck,
  ShieldCheck,
  BarChart3,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  GitMerge,
  ChevronRight,
  Star,
} from 'lucide-react'

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const FEATURES = [
  { icon: FileCheck, title: 'GST e-Invoice Validation', desc: 'Auto-maps scanned fields to all 28 mandatory e-Invoice schema fields. Flags missing IRN or malformed GSTIN instantly.', wide: true },
  { icon: GitMerge, title: '3-Way PO Matching', desc: 'Reconciles Purchase Order ↔ Invoice ↔ Delivery Challan automatically.', wide: false },
  { icon: ShieldCheck, title: 'Fraud Detection', desc: 'AI flags duplicate invoices, suspiciously round amounts, and mismatched vendor details before they post.', wide: false },
  { icon: Building2, title: 'Vendor CRM', desc: 'Auto-discovers suppliers from invoices. Stores GSTIN, PAN, and full spend history per vendor.', wide: false },
  { icon: BarChart3, title: 'Spend Analytics', desc: 'Monthly spend trends, type distribution, and fraud signals — all from your uploaded documents.', wide: false },
  { icon: Sparkles, title: 'AI Copilot', desc: 'Ask about GST compliance, 3-way matching, or fraud detection in plain language. Backed by your actual documents.', wide: true },
]

const TEMPLATES = [
  { name: 'GST e-Invoice', tag: 'Form GST INV-1', badge: '28 mandatory fields', fields: ['IRN (64-digit)', 'Supplier GSTIN', 'Buyer GSTIN', 'Invoice No & Date', 'HSN/SAC Code', 'CGST / SGST / IGST', 'Total Value', 'QR Code', '+ 20 more…'], highlight: true },
  { name: 'Bill of Supply', tag: 'Exempt / Composition', badge: 'No tax fields', fields: ['Supplier GSTIN', 'Bill No & Date', 'Recipient Details', 'Items & Quantity', 'Total Value', 'Narration'], highlight: false },
  { name: 'Retail / POS', tag: 'Industry presets', badge: '7 vertical schemas', fields: ['Retail (General)', 'Restaurant', 'Medical (Batch/Expiry)', 'Mobile (IMEI)', 'Jewellery (Purity/Weight)', 'Kirana', 'Furniture/Hardware'], highlight: false },
]

const STEPS = [
  { num: '01', title: 'Upload or scan', desc: 'Drop any invoice, receipt, or GST document — image or PDF. Our pipeline accepts 6 formats up to 10 MB.', image: '/brand/mobile-capture.jpeg', imageAlt: 'Scanning an invoice with a phone' },
  { num: '02', title: 'Agentic extraction', desc: 'Unlike rigid template parsers, DocFlux uses layout-aware AI that understands unseen vendor formats — no templates needed. 92–97% field accuracy on structured invoices.', image: '/brand/dashboard-hero.jpeg', imageAlt: 'AI extracting document fields' },
  { num: '03', title: 'Approve & export', desc: 'Review AI-extracted fields in the Workbench, approve or reject, then export to your accounting software or ERP.', image: '/brand/team-collab.jpeg', imageAlt: 'Team reviewing extracted documents' },
]

const TESTIMONIALS = [
  { quote: 'We used to spend 3 hours a week manually entering GST invoices. DocFlux cut that to 15 minutes.', name: 'Priya Mehta', role: 'Finance Manager, Pune' },
  { quote: 'The fraud detection caught a duplicate vendor invoice that would have cost us ₹2.4 lakh. Worth every rupee.', name: 'Arjun Sharma', role: 'CFO, Bangalore' },
  { quote: 'Finally, an OCR tool that actually understands Indian GST formats — CGST, SGST, e-Invoice IRN, everything.', name: 'Deepa Nair', role: 'Accounts Executive, Chennai' },
]

export default function LandingPage() {
  const [_mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans">

      {/* ─── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#EAE6DF]/80 backdrop-blur-xl" style={{ backgroundColor: 'rgba(250,248,245,0.92)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/landing" className="flex items-center gap-2.5">
            <div className="h-8 w-8 overflow-hidden rounded-lg border border-[#EAE6DF]">
              <img src="/brand/logo.jpeg" alt="DocFlux" className="h-full w-full object-cover" />
            </div>
            <span className="font-serif text-lg font-semibold text-[#1B2A41]">DocFlux</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {[['Features', '#features'], ['How it works', '#how-it-works'], ['Templates', '#templates'], ['Sign in', '/']].map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-[#2C3A54] hover:text-[#C1592A] transition-colors">{label}</a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a href="/" className="flex items-center gap-1.5 rounded-full bg-[#C1592A] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#B04D24] transition-all">
              Get started free <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen((p) => !p)} aria-label="Menu">
            <div className="space-y-1.5"><span className="block h-0.5 w-5 bg-[#1B2A41]" /><span className="block h-0.5 w-5 bg-[#1B2A41]" /><span className="block h-0.5 w-3 bg-[#1B2A41]" /></div>
          </button>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16 pb-28">
        <div className="pointer-events-none absolute -top-24 right-0 h-[500px] w-[500px] rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, #C1592A 0%, transparent 70%)' }} />
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Copy */}
            <div>
              <FadeUp>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C1592A]/30 bg-[#FBF1EE] px-4 py-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C1592A]" />
                  <span className="text-xs font-semibold text-[#C1592A]">92–97% field extraction accuracy</span>
                </div>
              </FadeUp>

              <FadeUp delay={0.06}>
                <h1 className="font-serif text-5xl font-semibold leading-[1.1] tracking-tight text-[#1B2A41] lg:text-6xl">
                  Scan once.{' '}
                  <span className="text-[#C1592A]">DocFlux</span>{' '}
                  handles the rest.
                </h1>
              </FadeUp>

              <FadeUp delay={0.12}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#2C3A54]">
                  AI-powered OCR and agentic document parsing built for Indian GST compliance. e-Invoice validation, fraud detection, vendor CRM, and spend analytics — in one platform.
                </p>
              </FadeUp>

              <FadeUp delay={0.18}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a href="/" className="flex items-center gap-2 rounded-full bg-[#C1592A] px-7 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#B04D24] transition-all hover:shadow-lg">
                    Start scanning free <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href="#how-it-works" className="flex items-center gap-1.5 rounded-full border border-[#EAE6DF] bg-white px-7 py-3.5 text-sm font-medium text-[#1B2A41] hover:border-[#C1592A]/30 hover:bg-[#FBF1EE] transition-all">
                    See how it works
                  </a>
                </div>
              </FadeUp>

              <FadeUp delay={0.24}>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#2C3A54]">
                  {[{ icon: FileCheck, text: 'GST e-Invoice validated' }, { icon: ShieldCheck, text: 'Fraud detection built-in' }, { icon: Zap, text: 'No templates required' }].map(({ icon: Icon, text }) => (
                    <span key={text} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-[#C1592A]" />{text}</span>
                  ))}
                </div>
              </FadeUp>
            </div>

            {/* Hero image */}
            <FadeUp delay={0.1}>
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img src="/brand/dashboard-hero.jpeg" alt="DocFlux scanning a document with AI field detection" className="w-full object-cover" style={{ aspectRatio: '4/3' }} />
                <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-[#EAE6DF]/80 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBF1EE]">
                    <CheckCircle2 className="h-4 w-4 text-[#C1592A]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1B2A41]">Extracted successfully</div>
                    <div className="text-[10px] text-[#2C3A54]">GSTIN · IRN · ₹ Amount · Line items</div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ─── Format strip ────────────────────────────────────── */}
      <div className="border-y border-[#EAE6DF] bg-white py-4">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-[#2C3A54]">
            {['GST e-Invoice (IRN)', 'Bill of Supply', 'Retail POS', 'Restaurant', 'Medical (Batch/Expiry)', 'Mobile / Electronics', 'Jewellery'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#C1592A]" />{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── How it works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp>
            <div className="mb-16 text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#C1592A]">How it works</div>
              <h2 className="font-serif text-4xl font-semibold text-[#1B2A41]">From paper to structured data in seconds</h2>
              <p className="mx-auto mt-3 max-w-xl text-[#2C3A54]">Three steps. No template setup. No code.</p>
            </div>
          </FadeUp>

          <div className="space-y-24">
            {STEPS.map((step, i) => (
              <FadeUp key={step.num} delay={0.1}>
                <div className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[grid-template-areas:\'image_text\']' : ''}`}>
                  <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className="mb-2 font-mono text-6xl font-bold text-[#EAE6DF]">{step.num}</div>
                    <h3 className="mb-3 font-serif text-2xl font-semibold text-[#1B2A41]">{step.title}</h3>
                    <p className="leading-relaxed text-[#2C3A54]">{step.desc}</p>
                  </div>
                  <div className={`overflow-hidden rounded-2xl shadow-xl ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <img src={step.image} alt={step.imageAlt} className="w-full object-cover" style={{ aspectRatio: '16/10' }} />
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features bento ──────────────────────────────────── */}
      <section id="features" className="bg-[#1B2A41] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp>
            <div className="mb-14 text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#D76C4D]">Features</div>
              <h2 className="font-serif text-4xl font-semibold text-white">Everything Indian finance teams need</h2>
              <p className="mx-auto mt-3 max-w-xl text-[#8494a8]">Built ground-up for India's GST compliance landscape.</p>
            </div>
          </FadeUp>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <FadeUp key={f.title} delay={i * 0.07}>
                  <div className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#C1592A]/40 hover:bg-white/[0.08]">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#C1592A]/20">
                      <Icon className="h-5 w-5 text-[#D76C4D]" />
                    </div>
                    <h3 className="mb-2 font-serif text-lg font-semibold text-white">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-[#8494a8]">{f.desc}</p>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Template showcase ───────────────────────────────── */}
      <section id="templates" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp>
            <div className="mb-14 text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#C1592A]">Template library</div>
              <h2 className="font-serif text-4xl font-semibold text-[#1B2A41]">Pre-built schemas for every document type</h2>
              <p className="mx-auto mt-3 max-w-xl text-[#2C3A54]">Select a document type on upload — DocFlux tunes the extraction schema automatically.</p>
            </div>
          </FadeUp>

          <div className="grid gap-6 md:grid-cols-3">
            {TEMPLATES.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.08}>
                <div className={`relative flex h-full flex-col rounded-2xl border p-6 ${t.highlight ? 'border-[#C1592A]/40 bg-[#FBF1EE]' : 'border-[#EAE6DF] bg-white'}`}>
                  {t.highlight && (
                    <div className="absolute -top-3 left-6 rounded-full bg-[#C1592A] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">Most used</div>
                  )}
                  <h3 className="mb-1 font-serif text-xl font-semibold text-[#1B2A41]">{t.name}</h3>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#1B2A41]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1B2A41]">{t.tag}</span>
                    <span className="rounded-full bg-[#C1592A]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#C1592A]">{t.badge}</span>
                  </div>
                  <ul className="mt-1 space-y-1.5">
                    {t.fields.map((field) => (
                      <li key={field} className="flex items-center gap-2 text-sm text-[#2C3A54]">
                        <ChevronRight className="h-3 w-3 shrink-0 text-[#C1592A]" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp>
            <div className="mb-14 text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#C1592A]">Social proof</div>
              <h2 className="font-serif text-4xl font-semibold text-[#1B2A41]">Finance teams across India trust DocFlux</h2>
            </div>
          </FadeUp>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.08}>
                <div className="flex h-full flex-col rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-[#C1592A] text-[#C1592A]" />
                    ))}
                  </div>
                  <blockquote className="flex-1 font-serif leading-relaxed text-[#1B2A41]">"{t.quote}"</blockquote>
                  <div className="mt-5 flex items-center gap-3 border-t border-[#EAE6DF] pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B2A41] text-sm font-semibold text-white">
                      {t.name.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1B2A41]">{t.name}</div>
                      <div className="text-xs text-[#2C3A54]">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.2} className="mt-12">
            <div className="overflow-hidden rounded-2xl shadow-xl">
              <img src="/brand/team-collab.jpeg" alt="DocFlux team collaborating" className="w-full object-cover" style={{ maxHeight: '320px', objectPosition: 'center 30%' }} />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─── CTA band ────────────────────────────────────────── */}
      <section className="bg-[#1B2A41] py-20">
        <FadeUp>
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-serif text-4xl font-semibold text-white">Ready to stop manual data entry?</h2>
            <p className="mx-auto mt-4 max-w-xl text-[#8494a8]">Free to start. No credit card required. Upload your first GST invoice in under a minute.</p>
            <a href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#C1592A] px-8 py-4 text-sm font-semibold text-white shadow-lg hover:bg-[#B04D24] transition-all hover:shadow-xl">
              Start scanning free <ArrowRight className="h-4 w-4" />
            </a>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8494a8]">
              {['No templates to set up', 'GST-compliant from day 1', 'Cancel anytime'].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#D76C4D]" />{t}</span>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#EAE6DF] bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 overflow-hidden rounded-lg border border-[#EAE6DF]">
                <img src="/brand/logo.jpeg" alt="DocFlux" className="h-full w-full object-cover" />
              </div>
              <span className="font-serif text-sm font-semibold text-[#1B2A41]">DocFlux</span>
              <span className="text-xs text-[#2C3A54]">— Scan once. DocFlux handles the rest.</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-[#2C3A54]">
              {['Features', 'Templates', 'Privacy', 'Terms'].map((l) => (
                <a key={l} href="#" className="hover:text-[#C1592A] transition-colors">{l}</a>
              ))}
            </div>
            <div className="text-xs text-[#2C3A54]">© 2026 DocFlux. Built for India.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}