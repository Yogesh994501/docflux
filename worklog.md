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

---
Task ID: 23-26
Agent: orchestrator (Strands integration)
Task: Integrate React Bits <Strands/> component — OCR engagement overlay, hamburger menu, dashboard ambient, fluid glass

Work Log:
- Installed ogl dependency (WebGL helper used by Strands).
- Created src/components/strands.tsx — TypeScript port of React Bits Strands
  component with full prop typing (colors, count, speed, amplitude, waviness,
  thickness, glow, taper, spread, hueShift, intensity, saturation, opacity,
  scale, glass, refraction, dispersion, glassSize, className, style).
  Uses ogl Renderer/Program/Mesh/Color/Triangle/RenderTarget with WebGL2
  shaders for flowing light strands + optional refractive glass ball.
- Created src/components/strands.css (container + canvas sizing).
- Built src/components/ocr-processing-overlay.tsx — full-screen fluid glass
  experience shown while OCR runs. Layers:
    * <Strands/> animated background (emerald/teal/violet/amber, 4 strands,
      high glow) keeps user visually engaged during the 5-30s vision call.
    * Dark veil + heavy backdrop blur for legibility.
    * Frosted-glass card with file thumbnail, name, 4-stage progress
      (Uploading → Scanning → OCR → Parsing), rotating status messages
      ("Analyzing document layout…", "Recognizing characters…", etc.),
      and live elapsed timer.
- Wired overlay into UploadSection: triggers when any item has
  status='uploading', disappears on completion.
- Added Strands backdrop inside mobile hamburger Sheet (emerald/teal/violet,
  3 strands, 50% opacity) behind the glass Sidebar for premium fluid feel.
- Added subtle ambient Strands glow (18% opacity, 2 strands, slow) behind
  the Dashboard hero greeting — awwwards-style premium touch.
- Fixed missing Strands import in dashboard.tsx (was the reported error).
- Verified with Agent Browser:
  * Dashboard: 1 WebGL canvas rendering ambient Strands glow ✓
  * OCR overlay: triggered on upload — shows Strands bg + glass card with
    "AI vision OCR in progress", 4-stage progress, "Elapsed 10s",
    "Keep watching — extraction is almost ready" ✓
  * Hamburger menu: Strands canvas renders inside Sheet (canvasInSheet:1) ✓
  * No console errors ✓, lint clean ✓

Stage Summary:
- <Strands/> from React Bits fully integrated (TypeScript port).
- Three deployment sites: OCR engagement overlay, hamburger menu backdrop,
  dashboard ambient hero glow.
- Fluid glass effects: frosted-glass overlay card, glass sidebar with Strands
  behind, premium layered blurs throughout.
- User stays visually captivated during the full OCR pipeline (verified
  end-to-end with a real upload).

---
Task ID: 27-38
Agent: orchestrator (auth + user-scoped DB)
Task: Add auth (login/signup/profile), make DB consistent + user-scoped, conditional Supabase/local

Work Log:
- Installed jose (JWT) + bcryptjs (password hashing) + @types/bcryptjs.
- Updated Prisma schema: added User model (id, email, name, passwordHash,
  avatarUrl, timestamps). Added userId FK to Document, Vendor, CopilotMessage
  with onDelete: Cascade. Reverse relations on User. Force-reset SQLite.
- Updated supabase-schema.sql: profiles table (links to auth.users), user_id
  columns on vendors/documents/copilot_messages, RLS policies scoping every
  table by auth.uid(), auto-profile-creation trigger on auth signup.
- Built src/lib/auth.ts — unified auth with two backends:
  * Supabase Auth (if SUPABASE_URL+ANON_KEY set): signUp/signInWithPassword,
    session via access_token, profiles table for name/avatar.
  * Local (default): bcrypt hash + JWT in httpOnly cookie (30d), jose verify.
  Single `auth` object: signup, login, logout, getCurrentUser, requireUser,
  updateProfile. getAuthProvider() exposes which backend is active.
- Updated repository.ts + supabase-backend.ts: every method now accepts
  userId and scopes queries (listDocuments, getDocument, createDocument,
  listVendors, createVendor, findVendorByGstin/Name, listCopilotMessages,
  createCopilotMessage, clearAll, groupBy). createDocument/createVendor now
  require userId. getDocument returns null if userId mismatches.
- Built 5 auth API routes: /api/auth/signup, /login, /logout, /me, /profile
  (PATCH). Updated /api/status to expose auth provider.
- Refactored ALL data routes to use auth.requireUser() + scope by user.id:
  documents (GET/POST), documents/[id] (GET/PATCH/DELETE), approve, reject,
  reprocess, analytics, vendors (GET/POST), copilot (GET/POST), seed.
  Every audit log now records actor = user.email.
- Built AuthProvider context (src/components/auth-provider.tsx): useAuth hook
  with user, loading, login, signup, logout, updateProfile, refresh. Wired
  into Providers.
- Built AuthScreen (src/components/auth-screen.tsx): premium login/signup
  with Strands fluid background, glassmorphic card, animated tab toggle
  (layoutId), form validation, loading states.
- Built ProfileSection: avatar initials, user info, edit-name form, system
  config panel (DB/OCR/Auth providers), sign-out button.
- Updated page.tsx: gates app on auth (loading splash → AuthScreen if no
  user → AppShell if authenticated). Added ProfileSection route.
- Updated sidebar: added Profile nav item, user card at bottom (click →
  profile), shows name/email/initials.
- Updated app-shell: added 'profile' to title/subtitle maps.
- Updated queries.ts: status type now includes auth field.
- Verified with Agent Browser:
  * Login screen renders with Strands bg ✓
  * Signup "Priya Patel" → logged in, dashboard shows 0 docs ✓
  * Seed (scoped) → 6 docs, ₹3.30 L spend for Priya ✓
  * Profile page: shows user info, system config (sqlite/GLM/local), edit
    form, sign out ✓
  * Logout → redirected to login screen ✓
  * Data isolation: signed up "Arjun Mehta" → sees 0 docs (Priya's data
    private) ✓
  * API: /api/analytics without cookie → 401 ✓
  * Lint clean, no console errors ✓

Stage Summary:
- Full auth: login + signup + profile + logout, two backends (Supabase Auth
  or local JWT+bcrypt), switchable via env.
- DB now consistent & user-scoped: every document/vendor/copilot-message
  belongs to a user. Uploaded documents stored with userId. Queries filtered
  by owner. RLS policies on Supabase.
- New users start with empty dashboard; "Load demo data" seeds their account.
- Data isolation verified: two users cannot see each other's documents.

---
Task ID: 39
Agent: orchestrator (auth bypass for testing)
Task: Disable login/auth for testing without deleting code

Work Log:
- Added AUTH_DISABLED="true" to .env (with explanatory comment).
- Added isAuthDisabled() helper + getOrCreateTestUser() in src/lib/auth.ts.
  Test user: demo@autofindocs.com (auto-created in SQLite if missing, fixed
  UUID for Supabase).
- Updated auth.signup/login/logout/getCurrentUser to short-circuit when
  AUTH_DISABLED=true:
  * signup/login → return test user without creating a real session
  * logout → no-op (stay logged in as test user)
  * getCurrentUser → always return test user
  * requireUser → inherits (returns test user)
  All real auth code (bcrypt, JWT, Supabase Auth, cookie mgmt) is untouched
  and reactivates when AUTH_DISABLED=false.
- Updated /api/status to expose authDisabled flag.
- Updated AuthProvider.logout to re-fetch after logout (so when disabled,
  the test user is restored instead of dropping to login screen).
- Updated Profile section: amber "Test mode — auth disabled" banner with
  instructions to set AUTH_DISABLED=false to re-enable.
- Verified with Agent Browser:
  * App loads straight into dashboard (no login screen) ✓
  * /api/auth/me returns demo@autofindocs.com without cookie ✓
  * /api/status shows authDisabled: true ✓
  * Seed works → 6 docs, ₹3.30 L spend for Demo User ✓
  * Profile shows "Test mode — auth disabled" banner ✓
  * Sign out is a no-op (stays logged in as Demo User) ✓

Stage Summary:
- Auth is disabled for testing via AUTH_DISABLED="true" in .env.
- No code deleted — flip to "false" to re-enable full login/signup/profile.
- App auto-logs-in as Demo User (demo@autofindocs.com); all data is scoped
  to that test account.
