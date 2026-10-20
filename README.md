# ⚡ DocFlux — Intelligent Financial Document OCR & Compliance Platform

> **DocFlux** is an enterprise-grade, agentic document processing and compliance platform purpose-built for Indian financial documents, GST tax invoices, receipts, and government IDs.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash%20Vision-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

---

## 🌟 Key Features

### 1. 🤖 Multi-Pass Agentic AI OCR Pipeline
Powered by **Google Gemini Flash** (with fallback to **Z.ai Vision**):
* **Pass 1 — Document Classification**: Identifies document type across 15 categories (GST Invoices, Bill of Supply, Medical Bills, Retail Receipts, Govt IDs, POs, Delivery Challans, Utility Bills, etc.).
* **Pass 2 — Schema-Constrained Extraction**: Extracts vendor details, buyer details, dates, IRN, line items (HSN, quantity, rate, amount), CGST/SGST/IGST, and totals directly into validated JSON.
* **Pass 3 — Reflection & Self-Check**: Verifies tax mathematics ($Subtotal + Taxes = Total$) and validates GSTIN checksum format. Automatically routes low-confidence scans to human review.
* **Vendor Memory Few-Shot Learning**: Remembers non-standard vendor layouts to improve future extractions automatically.

### 2. 🛡️ Dual-Database & Dual-Auth Architecture
* **Cloud Mode (Supabase)**: Scalable PostgreSQL, Supabase Auth with Row Level Security (RLS) policies.
* **Local Mode (SQLite & Prisma)**: Zero-configuration local database with bcrypt-hashed passwords and signed JOSE JWT cookies.
* *Seamless auto-switch*: If Supabase credentials are absent or paused, DocFlux automatically operates on SQLite.

### 3. 📊 Interactive UI & Workspaces
* **Live Dashboard**: Real-time spend metrics, monthly invoice trends, and fraud risk breakdown.
* **Upload Queue & Live Scanner**: Batch drag-and-drop with real-time visual OCR scanning animations.
* **Document Explorer & Filter**: Search by invoice number, vendor, document type, status, or date range.
* **Side-by-Side Extraction Workbench**: View document image side-by-side with extracted editable fields, audit trail, and raw OCR text.
* **Approvals Workflow**: One-click approval, rejection, or comment audit trails for finance managers.
* **AI Copilot**: In-app conversational assistant for document queries, Indian GST rules, and PO 3-way matching.
* **Vendors CRM**: Track vendors, compliance statuses, GSTIN/PAN records, and aggregated spend.

---

## 🏗️ Supported Document Types

| Document Category | Key Extracted Fields |
| :--- | :--- |
| **GST Tax Invoices** | Invoice No, Date, IRN, Supplier & Buyer GSTIN, HSN codes, CGST/SGST/IGST, Total |
| **Bill of Supply** | Supplier details, composition scheme status, exempt goods breakdown |
| **Retail & Restaurant Receipts** | Store name, itemized bill, tips, payment method, tax |
| **Medical / Pharmacy Bills** | Patient info, doctor/clinic, drug name, batch number, expiry date |
| **Electronics / Mobile Bills** | Device model, serial number, IMEI number, warranty details |
| **Government IDs** | PAN, Aadhaar, Driving License, Passport identification numbers and DOB |
| **Utility Bills (E-Bills)** | Consumer number, billing cycle, units consumed, due date, late fees |
| **Purchase Orders & Challans** | PO reference, line items, delivery terms, transport vehicle number |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** v20+ or v24+
* **npm**, **pnpm**, or **bun**

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/docflux.git
cd docflux
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (or copy `.env.example`):

```env
# ─── Database ───────────────────────────────────────────────────────────────
# Local SQLite (Default)
DATABASE_URL="file:./db/custom.db"

# Optional: Supabase PostgreSQL (leave empty to use SQLite)
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# ─── AI OCR Provider ───────────────────────────────────────────────────────
# "gemini" (recommended) or "zai"
OCR_PROVIDER="gemini"
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash"

# ─── Auth Configuration ───────────────────────────────────────────────────
# Set to "true" to bypass login/signup during local development/testing
AUTH_DISABLED="false"
JWT_SECRET="your-jwt-secret-string"

# ─── App ────────────────────────────────────────────────────────────────────
NODE_ENV="development"
```

### 3. Database Initialization (Prisma/SQLite)
Generate the Prisma client and push the schema:
```bash
npx prisma generate
npx prisma db push
```

### 4. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Supabase Cloud Setup (Optional)

If you wish to run DocFlux with Supabase cloud database & authentication:

1. Create a project at [Supabase](https://supabase.com/).
2. Run the SQL schema script provided in [`supabase-schema.sql`](./supabase-schema.sql) in your Supabase SQL Editor.
3. Configure your redirect URLs in **Authentication $\rightarrow$ URL Configuration**:
   * **Site URL**: `https://your-domain.vercel.app` (or `http://localhost:3000`)
   * **Redirect URLs**: Add `https://your-domain.vercel.app/**` and `http://localhost:3000/**`
4. *(Optional for Dev)* Under **Authentication $\rightarrow$ Providers $\rightarrow$ Email**, you can toggle off **Confirm email** for instant sign-ins.
5. Populate `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your `.env`.

---

## 📁 Project Structure

```text
docflux/
├── prisma/
│   └── schema.prisma          # SQLite database schema
├── public/
│   └── uploads/               # Uploaded sample and processed document images
├── src/
│   ├── app/
│   │   ├── api/               # Next.js App Router API endpoints
│   │   │   ├── auth/          # Login, signup, me, profile routes
│   │   │   ├── documents/     # Upload, extract, approve, reprocess
│   │   │   ├── copilot/       # Conversational AI assistant endpoint
│   │   │   ├── vendors/       # Vendor CRM management
│   │   │   └── analytics/     # Summary metrics & charts data
│   │   ├── layout.tsx         # Root layout with fonts & theme
│   │   └── page.tsx           # Main single-page application orchestrator
│   ├── components/
│   │   ├── app-shell.tsx      # Navigation header, sidebar, status pill
│   │   ├── document-detail-modal.tsx # Side-by-side OCR review & editor
│   │   ├── sections/          # Modular views (Dashboard, Upload, Approvals, etc.)
│   │   └── ui/                # shadcn/ui accessible components
│   └── lib/
│       ├── ai.ts              # Agentic Gemini 3-pass OCR & Copilot pipeline
│       ├── auth.ts            # Dual auth system (Supabase / local JWT)
│       ├── repository.ts      # Provider-agnostic data repository abstraction
│       └── vendor-memory.ts   # Layout caching and few-shot memory engine
├── .env.example
├── package.json
└── tailwind.config.ts
```

---

## 🧪 Testing

Run built-in automated verification scripts:

* **Test Gemini OCR Locally**:
  ```bash
  node test_gemini_local.js
  ```
* **Test End-to-End Local API Flow**:
  ```bash
  node test_e2e_local.js
  ```
* **Test Production / Vercel API Flow**:
  ```bash
  node test_full_flow.js
  ```

---

## 🔒 Security & Privacy

* **Data Isolation**: All documents, vendors, and audit events are strictly scoped to the authenticated user ID.
* **Row-Level Security**: PostgreSQL tables enforce RLS policies preventing cross-tenant leakage.
* **Safe Credential Handling**: Secrets and API keys are strictly evaluated on server-side Next.js route handlers.

---

## 📄 License
This project is licensed under the MIT License.
