# AutoFinDocs — Intelligent Document OCR & Parsing Platform (Next.js)

Project: A web platform for OCR text extraction and structured parsing of receipts,
government docs, GST invoices, purchase orders, delivery challans, e-bills, etc.

Adapted from the AutoFinDocs spec (originally Python FastAPI + Streamlit + Android)
to **Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + z-ai-web-dev-sdk**.

AI backbone:
- **VLM skill** — vision model reads uploaded document images and returns BOTH raw OCR
  text AND structured JSON fields in a single call (replaces Tesseract + LLM combo).
- **LLM skill** — powers the AI Copilot chat for natural-language queries over docs.

---
Task ID: 0
Agent: orchestrator
Task: Project bootstrap and planning

Work Log:
- Read all 4 uploaded docs (android_prompt, CLAUDE, instruction, PLAN).
- Loaded VLM and LLM skills.
- Inspected existing Next.js scaffold (shadcn/ui components already installed).
- Defined Prisma schema plan: Document, Vendor, AuditLog, CopilotMessage.
- Designed single-page app with sidebar sections (Dashboard, Upload, Documents,
  Approvals, Vendors, Analytics, Copilot).

Stage Summary:
- Architecture decided: Next.js App Router single `/` route with section-based UI.
- AI strategy: VLM does OCR + extraction in one shot; LLM powers Copilot.
- Ready to build schema, backend APIs, then frontend.

---
Task ID: 1-15
Agent: orchestrator (full build)
Task: Build complete AutoFinDocs OCR & document parsing platform in Next.js

Work Log:
- Defined Prisma schema: Document, Vendor, AuditLog, CopilotMessage (SQLite).
- Built AI lib (src/lib/ai.ts): single VLM call returns OCR text + structured JSON
  for invoices, receipts, govt IDs, POs, challans, e-bills, bank statements, etc.
  Includes fraud-risk assessment. LLM helper powers Copilot chat.
- Built 8 backend API routes: documents (CRUD + upload/OCR/approve/reject/reprocess),
  analytics (KPIs + charts), vendors (CRUD), copilot (chat + history), seed.
- Built emerald/teal themed UI: sidebar nav, sticky footer, light/dark mode.
- Built 7 sections: Dashboard (KPIs + Recharts), Upload (drag-drop + live OCR queue),
  Documents (filterable grid), Approvals (card queue with approve/reject), Vendors CRM,
  Analytics (6 chart types), AI Copilot (LLM chat with suggestions).
- Built Document Detail modal: image + extracted fields side-by-side, editable fields,
  re-extract, approve/reject, OCR text tab, audit trail tab.
- Seeded 5 vendors + 6 demo documents (with hand-crafted SVG previews for each doc type).
- Verified end-to-end with Agent Browser:
  * Dashboard renders KPIs + charts + recent docs ✓
  * Document detail modal shows extracted fields + line items ✓
  * Approve action removes doc from queue + toast ✓
  * AI Copilot returns accurate GSTIN explanation (LLM) ✓
  * LIVE upload + VLM OCR: extracted "TechNova Solutions Pvt Ltd", "TN-2024-0451",
    "₹92,040", line items — 95% confidence ✓
  * Sticky footer verified (sticks on short pages, pushes down on long) ✓
  * No console errors, lint clean ✓

Stage Summary:
- Platform is fully functional and browser-verified.
- AI backbone: VLM (glm-4.6v) does OCR + structured extraction in one call;
  LLM powers Copilot. Both via z-ai-web-dev-sdk, backend-only.
- Live OCR pipeline confirmed working: upload PNG → 95% confidence → correct
  vendor/invoice/amounts/line-items extraction.
- 7 document types supported: GST Invoice, Receipt, Government ID (PAN/Aadhaar),
  Utility Bill, Purchase Order, Delivery Challan, Credit/Debit Note, Bank Statement.

---
Task ID: 16-22
Agent: orchestrator (v2 overhaul)
Task: Gemini OCR, Supabase conditional DB, Apple-premium UI, Framer Motion, React Bits, hamburger left, asset guide

Work Log:
- Created .env + .env.example with Gemini + Supabase config.
- Installed @google/genai + @supabase/supabase-js.
- Refactored AI lib (src/lib/ai.ts): dual OCR providers — Google Gemini 2.5 Flash
  (OCR_PROVIDER=gemini + GEMINI_API_KEY) with automatic Z.ai GLM-4.6V fallback.
  getActiveProvider() exposes which engine is running.
- Built repository layer (src/lib/repository.ts + supabase-backend.ts):
  if SUPABASE_URL + SUPABASE_ANON_KEY set → Supabase (PostgreSQL via PostgREST);
  else → Prisma/SQLite. All API routes refactored to use repo.* functions.
  Provided supabase-schema.sql for table creation.
- Added /api/status route exposing database + ocr provider (shown in sidebar + header).
- Redesigned globals.css: Apple-premium theme (near-white bg, soft layered shadows,
  glassmorphism .glass/.sidebar-glass, refined oklch palette, letter-spacing tuning).
- Built React-Bits-style motion primitives (motion-primitives.tsx): AnimatedCounter,
  SpotlightCard (mouse-follow glow), FadeInUp, StaggerContainer/Item, TiltCard (3D),
  AuroraText (animated gradient), PageTransition, ScaleIn.
- Redesigned sidebar: glassmorphic, staggered nav entrance, layoutId active indicator,
  System panel (DB + OCR engine live status), animated theme toggle.
- Redesigned app shell: hamburger moved to LEFT side, glass sticky header + footer,
  live status pills, AnimatePresence section transitions.
- Redesigned Dashboard: AuroraText hero, 4 SpotlightCard KPIs with AnimatedCounter,
  staggered entrance, fraud-risk animated bars, premium charts.
- Redesigned Upload, Documents, Approvals, Vendors, Analytics, Copilot — all premium
  with SpotlightCards, Framer Motion, consistent rounded-2xl aesthetic.
- Removed hardcoded data: all sections pull from API (status, analytics, vendors, docs).
- Wrote ASSETS.md guide: document samples (SVG→PNG, AI gen, real scans), UI imagery,
  video recording via Agent Browser, Framer Motion component reference, OCR engine table.
- Verified with Agent Browser:
  * Dashboard renders with animated counters + AuroraText ✓
  * Sidebar System panel shows "Database: sqlite, OCR Engine: GLM-4.6V" ✓
  * Mobile hamburger on LEFT (menuLeft:16, leftmost) ✓
  * Section transitions animate (Analytics, Copilot) ✓
  * No console errors ✓
  * Live OCR upload: GST Invoice extracted, 95% confidence, correct fields ✓
  * Lint clean ✓

Stage Summary:
- Two OCR engines: Gemini 2.5 Flash (primary, env-driven) + Z.ai GLM-4.6V (fallback).
- Two databases: Supabase Postgres (if env set) + SQLite (default) — switchable via .env.
- Apple-premium UI: glassmorphism, soft shadows, staggered Framer Motion animations,
  React-Bits-style components (SpotlightCard, AnimatedCounter, TiltCard, AuroraText).
- Hamburger on left, status pills in header + sidebar, animated everything.
- All data dynamic from API. ASSETS.md guides asset creation.
