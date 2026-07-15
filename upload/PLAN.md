# PLAN.md — AutoFinDocs: Intelligent Document Finance Platform

## Implementation Plan

---

## 1. Project Overview

**AutoFinDocs** is a production-grade, modular finance automation platform that:

- Ingests documents (PDFs, images, emails) and extracts structured financial data using LLM
- **Android companion app** handles scanning + on-device OCR (Google ML Kit); server receives pre-extracted text
- Web/email uploads use lightweight Tesseract as OCR fallback (no heavy OCR on server)
- Classifies documents (GST Invoice, Receipt, E-Bill, Credit/Debit Note, PO, Challan)
- Automates approval workflows using LangGraph stateful multi-step pipelines
- Provides a full CRM for vendors and customers
- Performs 3-way matching (Invoice ↔ PO ↔ Delivery Challan)
- Offers GSTR reconciliation and tax compliance tools
- Delivers an advanced analytics dashboard with spend trends and automation ROI
- Includes an AI Copilot for natural language queries
- Is device-aware: full desktop experience, limited mobile with APK recommendation

---

## 2. Phased Implementation Roadmap

### Phase 1 — Foundation (Days 1–3)

**Goal**: Project scaffolding, database models, auth, basic API, and a working Streamlit shell.

| # | Task | Files | Details |
|---|---|---|---|
| 1.1 | Project setup | `pyproject.toml`, `requirements/`, `.env.example`, `.gitignore` | Pin all dependency versions. Create virtual env. |
| 1.2 | Config & Database | `backend/config.py`, `backend/database.py` | Pydantic Settings, async SQLAlchemy engine + Supabase pooler connection (port 6543), session factory. |
| 1.3 | Base model mixin | `backend/models/base.py` | `id` (UUID), `created_at`, `updated_at`, `is_deleted`, `created_by`, `updated_by`. |
| 1.4 | User model + Auth | `backend/models/user.py`, `backend/services/auth_service.py`, `backend/utils/security.py` | User with roles (admin, manager, accountant, viewer). JWT creation + verification. bcrypt hashing. |
| 1.5 | Auth API | `backend/api/v1/auth.py` | POST `/register`, POST `/login`, GET `/me`, POST `/refresh`. |
| 1.6 | FastAPI app factory | `backend/main.py` | CORS, exception handlers, router includes, lifespan events. |
| 1.7 | Alembic setup | `alembic/` | Initial migration with User table. |
| 1.8 | Streamlit shell | `frontend/app.py`, `frontend/auth.py`, `frontend/api_client.py` | Login page, session management, sidebar navigation, custom CSS injection. |
| 1.9 | Device detection | `frontend/device_detect.py`, `frontend/components/mobile_banner.py` | JS injection for screen size, user-agent parsing, mobile redirect banner. |

**Deliverable**: Running backend + frontend with working login/signup and a skeleton multipage dashboard.

---

### Phase 2 — Document Processing Core (Days 4–7)

**Goal**: Upload (from Android or web), OCR (skip or Tesseract), classify, extract, and store documents.

| # | Task | Files | Details |
|---|---|---|---|
| 2.1 | Document + Invoice models | `backend/models/document.py`, `backend/models/invoice.py`, `backend/models/line_item.py` | Document adds `source` field (android/web/email), `ocr_text`, `ocr_confidence`. Invoice (all GST fields, totals). LineItem (description, HSN, qty, rate, tax, amount). |
| 2.2 | Storage service | `backend/services/storage_service.py` | Abstract interface: `save_file()`, `get_file()`, `delete_file()`. Implementations: LocalStorage, SupabaseStorage (using supabase-py SDK, 1 GB free). |
| 2.3 | OCR service (lightweight) | `backend/services/ocr_service.py` | **Dual-mode**: If `source=="android"` and `ocr_text` provided → skip OCR entirely. Otherwise → Tesseract (pytesseract) fallback for web/email uploads (~50 MB RAM). PDF → image via pdf2image, then Tesseract. NO PaddleOCR. |
| 2.4 | Classification service | `backend/services/classification_service.py` | Two-stage: (1) Keyword-based fast classifier, (2) LLM fallback for ambiguous docs. Categories: GST_INVOICE, RECEIPT, EBILL, CREDIT_NOTE, DEBIT_NOTE, PURCHASE_ORDER, DELIVERY_CHALLAN, UNKNOWN. |
| 2.5 | Extraction service | `backend/services/extraction_service.py` | LangChain structured output. Extract: vendor_name, GSTIN, invoice_number, date, due_date, line_items[], taxes (CGST/SGST/IGST), total, bank_details. Different prompts per document type. |
| 2.6 | LangGraph document pipeline | `backend/workflows/document_pipeline.py`, `backend/workflows/nodes/` | Graph: Upload → **Conditional OCR** (skip if Android) → Classify → Extract → Validate → DuplicateCheck → FraudCheck → Route → Store. Conditional edges based on source, classification & confidence. |
| 2.7 | Celery task for pipeline | `backend/tasks/document_tasks.py`, `backend/tasks/celery_app.py` | `process_document.delay(document_id)` — runs the full LangGraph pipeline in background. |
| 2.8 | Document API | `backend/api/v1/documents.py`, `backend/api/v1/invoices.py` | POST `/upload` accepts multipart file + optional `ocr_text`, `ocr_confidence`, `source` (android/web), `device_info` fields. GET `/documents`, GET `/documents/{id}`, GET `/invoices`. |
| 2.9 | Streamlit: Document Upload | `frontend/pages/02_📄_Documents.py` | Drag-and-drop upload, processing status tracker, document detail view with extracted data, OCR text preview. Source badge (Android/Web/Email). |

**Deliverable**: End-to-end: Android scan → OCR on phone → Send text + image → Classify → Extract fields → View in dashboard. Web upload also works with Tesseract fallback.

---

### Phase 3 — Duplicate & Fraud Detection + Approval Workflow (Days 8–10)

| # | Task | Files | Details |
|---|---|---|---|
| 3.1 | Duplicate detection service | `backend/services/duplicate_service.py` | Hash-based (file hash) + semantic (invoice_number + vendor + amount + date). Configurable similarity threshold. |
| 3.2 | Fraud/Anomaly detection | `backend/services/fraud_service.py` | Rule-based checks: amount outliers (z-score), mismatched GSTIN format, future dates, round-number invoices, velocity checks (too many invoices from same vendor in short time). LLM-assisted anomaly scoring. |
| 3.3 | Approval model | `backend/models/approval.py` | ApprovalRequest (document_id, status, current_step, assigned_to, approved_by, comments). ApprovalRule (condition_field, operator, threshold, approver_role, step_order). |
| 3.4 | LangGraph approval workflow | `backend/workflows/approval_workflow.py` | States: PENDING → REVIEW → APPROVED / REJECTED / ESCALATED. Conditional routing based on amount thresholds and fraud scores. Multi-step with configurable hierarchy. |
| 3.5 | Approval API | `backend/api/v1/` (extend) | POST `/approve/{id}`, POST `/reject/{id}`, GET `/pending-approvals`. |
| 3.6 | Streamlit: Approval Queue | `frontend/components/approval_card.py`, page integration | Approval queue with cards, one-click approve/reject, comment fields, escalation. |

**Deliverable**: Documents auto-routed through approval chains. Duplicates flagged. Anomalies scored and highlighted.

---

### Phase 4 — CRM + Vendor/Customer Management (Days 11–13)

| # | Task | Files | Details |
|---|---|---|---|
| 4.1 | Vendor & Customer models | `backend/models/vendor.py`, `backend/models/customer.py`, `backend/models/crm.py` | Vendor (name, GSTIN, PAN, address, bank_details, payment_terms, performance_score). Customer (similar). CRM: ContactHistory, Tags, Notes. |
| 4.2 | CRM service | `backend/services/crm_service.py` | CRUD + contact history tracking, tag management, notes, vendor performance scoring (on-time delivery %, invoice accuracy, dispute rate). |
| 4.3 | CRM API | `backend/api/v1/vendors.py`, `backend/api/v1/customers.py`, `backend/api/v1/crm.py` | Full CRUD, search, filter, bulk update, tag operations. |
| 4.4 | Streamlit: CRM pages | `frontend/pages/04_🏢_Vendors.py`, `frontend/pages/05_👥_Customers.py`, `frontend/pages/11_👤_CRM.py` | Vendor/Customer list with search + filters, detail view with contact history timeline, performance scorecard, tag management. |

**Deliverable**: Full CRM with vendor scoring, contact history, and relationship management.

---

### Phase 5 — Purchase Orders + 3-Way Matching (Days 14–16)

| # | Task | Files | Details |
|---|---|---|---|
| 5.1 | PO & Challan models | `backend/models/purchase_order.py`, `backend/models/delivery_challan.py`, `backend/models/matching.py` | PO (po_number, vendor, items, total, status). Challan (challan_number, po_ref, items_received). MatchResult (invoice_id, po_id, challan_id, match_status, discrepancies). |
| 5.2 | 3-way matching service | `backend/services/matching_service.py` | Match logic: Invoice.items ↔ PO.items (qty, rate, description) ↔ Challan.items_received (qty). Tolerance-based matching (configurable % threshold). Discrepancy report generation. |
| 5.3 | LangGraph matching workflow | `backend/workflows/matching_workflow.py` | Graph: Fetch PO → Fetch Challan → Compare Line Items → Compute Discrepancies → Auto-match or Flag → Generate Report. |
| 5.4 | Matching API | `backend/api/v1/matching.py`, `backend/api/v1/purchase_orders.py` | POST `/match/{invoice_id}`, GET `/match-results`, GET `/purchase-orders`. |
| 5.5 | Streamlit: Matching page | `frontend/pages/07_🔗_Matching.py` | Side-by-side comparison view (Invoice vs PO vs Challan), color-coded discrepancies, one-click match/dispute. |

**Deliverable**: Automated 3-way matching with visual discrepancy reports.

---

### Phase 6 — GST Compliance & Tax (Days 17–19)

| # | Task | Files | Details |
|---|---|---|---|
| 6.1 | GST models | `backend/models/gst.py` | GSTReturn (return_type GSTR1/GSTR2B/GSTR3B, period, data_json). GSTReconciliation (invoice_id, portal_entry_id, match_status, discrepancy_type). |
| 6.2 | GST service | `backend/services/gst_service.py` | GSTR-1 generation from sales invoices. GSTR-2B reconciliation (upload portal data → match against booked invoices). ITC mismatch detection. HSN summary generation. |
| 6.3 | GST API | `backend/api/v1/gst.py` | POST `/gst/reconcile`, GET `/gst/gstr1-summary`, GET `/gst/itc-mismatches`, POST `/gst/upload-portal-data`. |
| 6.4 | Streamlit: GST page | `frontend/pages/08_💰_GST_Compliance.py` | Period selector, reconciliation results table, ITC mismatch highlights, GSTR summary cards, export for filing. |

**Deliverable**: GSTR-1 generation, GSTR-2B reconciliation, ITC mismatch detection.

---

### Phase 7 — Import/Export + Master Data + Bulk Ops (Days 20–22)

| # | Task | Files | Details |
|---|---|---|---|
| 7.1 | Import/Export service | `backend/services/import_export_service.py` | Excel/CSV import with column mapping UI. Export with configurable columns, filters, formatting. Support: invoices, vendors, customers, CRM data. Use openpyxl + pandas. |
| 7.2 | Master data models | `backend/models/master_data.py` | GLCode (code, description, category). ApprovalHierarchy (role, min_amount, max_amount, step). CustomRule (name, condition_json, action_json). TaxRate, CostCenter, Department. |
| 7.3 | Master data API | `backend/api/v1/master_data.py`, `backend/api/v1/bulk_ops.py`, `backend/api/v1/import_export.py` | CRUD for GL codes, approval hierarchies, custom rules. Bulk update/delete. Import/export endpoints. |
| 7.4 | Streamlit: Settings & Master Data | `frontend/pages/12_⚙️_Settings.py` | GL code management table, approval hierarchy builder, custom rule editor, import/export UI with preview. |

**Deliverable**: Full master data management, bulk operations, and Excel/CSV import-export.

---

### Phase 8 — Analytics + AI Copilot (Days 23–26)

| # | Task | Files | Details |
|---|---|---|---|
| 8.1 | Analytics service | `backend/services/analytics_service.py` | Spend trends (monthly/quarterly/yearly). Vendor analysis (top vendors, spending distribution). Automation ROI (time saved, error reduction). Document processing metrics. Aging analysis. |
| 8.2 | Analytics API | `backend/api/v1/analytics.py` | GET `/analytics/spend-trends`, `/vendor-analysis`, `/automation-roi`, `/processing-metrics`. Date range + dimension filters. |
| 8.3 | Streamlit: Analytics Dashboard | `frontend/pages/09_📈_Analytics.py`, `frontend/components/charts.py` | Plotly charts: line (trends), bar (vendor spend), pie (category distribution), funnel (processing stages), KPI metric cards. Date range selector. |
| 8.4 | AI Copilot service | `backend/services/copilot_service.py` | Natural language → SQL/API query translation. LangChain agent with tools: query_invoices, query_vendors, get_analytics, explain_document. Conversation memory per user. |
| 8.5 | Copilot API | `backend/api/v1/copilot.py` | POST `/copilot/query` (text → structured response + data). GET `/copilot/history`. |
| 8.6 | Streamlit: AI Copilot | `frontend/pages/10_🤖_AI_Copilot.py` | Chat interface, auto-generated charts from queries, suggested questions, conversation history. |

**Deliverable**: Full analytics dashboard with interactive charts and a natural language AI copilot.

---

### Phase 9 — Audit Trail + User Management + Email Ingestion (Days 27–29)

| # | Task | Files | Details |
|---|---|---|---|
| 9.1 | Audit model & service | `backend/models/audit.py`, `backend/services/audit_service.py` | AuditLog (entity_type, entity_id, action, old_value_json, new_value_json, user_id, timestamp, ip_address). Auto-capture on all model changes via SQLAlchemy event listeners. |
| 9.2 | User management API | `backend/api/v1/users.py` | CRUD users, role assignment, activate/deactivate, password reset, activity log. |
| 9.3 | Email ingestion | `backend/services/email_service.py`, `backend/tasks/email_tasks.py` | IMAP polling (configurable interval). Extract attachments (PDF/image). Auto-create document records. Celery periodic task. |
| 9.4 | Streamlit: Audit + Users | `frontend/pages/13_📋_Audit_Trail.py`, `frontend/pages/14_👥_User_Management.py` | Searchable audit log with entity links. User management table with role dropdown. |
| 9.5 | Reports service | `backend/services/`, `backend/api/v1/reports.py` | Configurable report builder: aging report, vendor statement, tax summary, processing summary. PDF export via reportlab. |

**Deliverable**: Complete audit trail, user management, email ingestion, and report generation.

---

### Phase 10 — Free-Tier Deployment & Polish (Days 30–33)

| # | Task | Files | Details |
|---|---|---|---|
| 10.1 | Supabase setup | Supabase dashboard + `.env` | Create project, configure connection pooling (port 6543), create storage bucket `documents`, set RLS policies. |
| 10.2 | Upstash Redis setup | Upstash console + `.env` | Create free Redis database, get `rediss://` connection string for Celery broker. |
| 10.3 | Render deployment | `render.yaml`, `Procfile`, `requirements/` | Deploy FastAPI as Render Web Service (free tier). Connect GitHub repo for auto-deploy. Set env vars. Add UptimeRobot ping to prevent spin-down. |
| 10.4 | Streamlit Cloud deployment | `frontend/`, `.streamlit/config.toml` | Deploy Streamlit app on Streamlit Community Cloud (free). Connect GitHub repo. Set secrets via Streamlit Cloud dashboard. |
| 10.5 | Frontend polish | `frontend/static/styles/` | Professional finance theme: dark sidebar, clean data tables, consistent color palette, loading states, toast notifications, empty states. |
| 10.6 | Dashboard homepage | `frontend/pages/01_📊_Dashboard.py` | KPI cards (total invoices, pending approvals, processing rate, automation savings). Recent activity feed. Quick actions. Status charts. |
| 10.7 | Error handling & logging | Backend-wide | Structured logging (structlog). Global exception handler. Request ID tracing. Rate limiting. |
| 10.8 | Security hardening | Backend-wide | Input sanitization. SQL injection protection (parameterized queries via ORM). CORS tightening. Rate limiting. File upload validation (max 50 MB for Supabase). |
| 10.9 | Documentation | `README.md`, API docs | FastAPI auto-docs (Swagger + ReDoc). README with setup instructions, architecture diagram, free-tier deployment guide. |

**Deliverable**: Production-ready, deployed entirely on free-tier services (Supabase + Render + Streamlit Cloud + Upstash).

### Free-Tier Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT MAP (All Free Tier)                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐     ┌──────────────────────────────┐        │
│  │ Streamlit Community │     │   Render Web Service (Free)  │        │
│  │ Cloud (Frontend)    │────▶│   FastAPI Backend             │        │
│  │                     │     │   + Celery in-process worker  │        │
│  │ • 1 GB RAM          │     │   • 750 hrs/mo               │        │
│  │ • Auto-deploy       │     │   • Auto-deploy from GitHub   │        │
│  │ • Custom domain OK  │     │   • Spins down after 15 min   │        │
│  └─────────────────────┘     └──────────┬───────────────────┘        │
│                                         │                            │
│                    ┌────────────────────┼────────────────┐           │
│                    │                    │                │           │
│              ┌─────▼──────┐    ┌───────▼──────┐  ┌──────▼───────┐   │
│              │ Supabase   │    │ Supabase     │  │ Upstash      │   │
│              │ PostgreSQL │    │ Storage      │  │ Redis        │   │
│              │            │    │              │  │              │   │
│              │ • 500 MB   │    │ • 1 GB       │  │ • 10K cmd/d  │   │
│              │ • Pooler   │    │ • 50 MB/file │  │ • 256 MB     │   │
│              │ • Port 6543│    │ • CDN        │  │ • TLS        │   │
│              └────────────┘    └──────────────┘  └──────────────┘   │
│                                                                      │
│  ┌─────────────────────┐                                             │
│  │ UptimeRobot (Free)  │  Pings Render every 14 min to prevent       │
│  │ Keep-alive monitor  │  cold starts.                               │
│  └─────────────────────┘                                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Overview

### Core Entity Relationships

```
┌───────────┐       ┌──────────────┐       ┌──────────────┐
│   Users   │───┐   │  Documents   │───┐   │   Invoices   │
│           │   │   │              │   │   │              │
│ id        │   │   │ id           │   │   │ id           │
│ email     │   ├──▶│ uploaded_by  │   ├──▶│ document_id  │
│ role      │   │   │ file_path    │   │   │ vendor_id    │
│ org_id    │   │   │ doc_type     │   │   │ invoice_no   │
└───────────┘   │   │ status       │   │   │ gstin        │
                │   │ ocr_text     │   │   │ total_amount │
                │   │ confidence   │   │   │ tax_amount   │
                │   └──────────────┘   │   │ status       │
                │                      │   └──────┬───────┘
                │   ┌──────────────┐   │          │
                │   │   Vendors    │   │   ┌──────▼───────┐
                │   │              │◀──┼───│  Line Items  │
                │   │ id           │   │   │              │
                │   │ name         │   │   │ invoice_id   │
                │   │ gstin        │   │   │ description  │
                │   │ perf_score   │   │   │ hsn_code     │
                │   └──────────────┘   │   │ quantity     │
                │                      │   │ rate         │
                │   ┌──────────────┐   │   │ tax          │
                │   │Purchase Orders│  │   │ amount       │
                │   │              │   │   └──────────────┘
                │   │ id           │   │
                ├──▶│ created_by   │   │   ┌──────────────┐
                │   │ vendor_id    │   │   │ MatchResult  │
                │   │ po_number    │   │   │              │
                │   │ total        │   ├──▶│ invoice_id   │
                │   └──────┬───────┘   │   │ po_id        │
                │          │           │   │ challan_id   │
                │   ┌──────▼───────┐   │   │ match_status │
                │   │Del. Challans │   │   │ discrepancies│
                │   │              │───┘   └──────────────┘
                │   │ id           │
                │   │ po_id        │
                │   │ items_recv   │       ┌──────────────┐
                │   └──────────────┘       │  Approvals   │
                │                          │              │
                ├─────────────────────────▶│ document_id  │
                │                          │ assigned_to  │
                │                          │ status       │
                │                          │ step         │
                │   ┌──────────────┐       └──────────────┘
                │   │  Audit Log   │
                │   │              │       ┌──────────────┐
                └──▶│ user_id      │       │  Customers   │
                    │ entity_type  │       │              │
                    │ action       │       │ id           │
                    │ old_value    │       │ name         │
                    │ new_value    │       │ gstin        │
                    └──────────────┘       │ contact_info │
                                           └──────────────┘
```

### All Tables

| Table | Description | Key Columns |
|---|---|---|
| `users` | System users | email, hashed_password, role, is_active, org_id |
| `organizations` | Multi-tenant support | name, gstin, address |
| `documents` | Raw uploaded docs | file_path, file_type, file_hash, doc_type, status, ocr_text, ocr_confidence, classification_confidence, uploaded_by |
| `invoices` | Parsed invoice data | document_id, vendor_id, customer_id, invoice_number, invoice_date, due_date, subtotal, cgst, sgst, igst, cess, total_amount, currency, payment_status |
| `line_items` | Invoice line items | invoice_id, description, hsn_sac_code, quantity, unit, unit_price, discount, taxable_value, cgst_rate, sgst_rate, igst_rate, total |
| `vendors` | Vendor master | name, gstin, pan, email, phone, address, bank_name, bank_account, ifsc, payment_terms_days, performance_score, is_verified |
| `customers` | Customer master | name, gstin, pan, email, phone, billing_address, shipping_address |
| `purchase_orders` | Purchase orders | po_number, vendor_id, order_date, expected_delivery, items_json, subtotal, tax, total, status, created_by |
| `po_line_items` | PO line items | po_id, description, hsn_code, quantity, unit, unit_price, total |
| `delivery_challans` | Goods received | challan_number, po_id, vendor_id, received_date, items_received_json, received_by |
| `challan_line_items` | Challan items | challan_id, description, quantity_ordered, quantity_received, quantity_accepted, quantity_rejected, remarks |
| `match_results` | 3-way match | invoice_id, po_id, challan_id, match_status (MATCHED/PARTIAL/UNMATCHED), discrepancy_details_json, matched_at, matched_by |
| `approval_requests` | Approval queue | document_id, status (PENDING/APPROVED/REJECTED/ESCALATED), current_step, assigned_to, approved_by, comments, decided_at |
| `approval_rules` | Approval config | name, condition_field, operator, threshold_value, approver_role, step_order, is_active |
| `gst_returns` | Filed/Generated returns | return_type (GSTR1/GSTR2B/GSTR3B), period (e.g., "2026-06"), data_json, status, generated_at |
| `gst_reconciliation` | Recon results | invoice_id, portal_entry_id, match_status, discrepancy_type, amount_difference, portal_data_json |
| `gl_codes` | Chart of accounts | code, description, category, parent_id, is_active |
| `cost_centers` | Cost centers | code, name, department, is_active |
| `custom_rules` | Automation rules | name, trigger_event, condition_json, action_json, priority, is_active |
| `contact_history` | CRM interactions | entity_type (vendor/customer), entity_id, contact_type (email/call/meeting), subject, notes, contacted_by, contacted_at |
| `tags` | Entity tags | name, color, entity_type |
| `entity_tags` | Tag assignments | tag_id, entity_type, entity_id |
| `notes` | Entity notes | entity_type, entity_id, content, created_by |
| `audit_logs` | Change history | entity_type, entity_id, action (CREATE/UPDATE/DELETE), old_value_json, new_value_json, user_id, ip_address |
| `email_configs` | Email ingestion | imap_host, imap_port, username, encrypted_password, folder, poll_interval_minutes, is_active |
| `processing_queue` | Background jobs | document_id, task_id, status, started_at, completed_at, error_message |

---

## 4. LangGraph Workflow Designs

### 4.1 Document Processing Pipeline

```
                    ┌──────────┐
                    │  START   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  Upload  │ Save file, create DB record
                    │  & Store │
                    └────┬─────┘
                         │
                    ┌────▼──────────┐
                    │ Check source  │
                    └────┬──────┬───┘
                         │      │
                  Android │      │ Web/Email
                  (has    │      │ (no OCR text)
                  OCR text)│      │
                         │      ┌▼───────────┐
                         │      │ Tesseract  │ Lightweight
                         │      │ OCR (~50MB)│ fallback
                         │      └────┬──────┘
                         │           │
                    ┌────▼─────────▼┐
                    │  Classify       │ Keyword + LLM classification
                    │  Document       │
                    └────┬──────────┘
                         │
                    ┌────▼─────────┐
                    │   Extract       │ LLM structured extraction
                    │   Fields        │ (type-specific prompts)
                    └────┬─────────┘
                         │
                    ┌────▼─────────┐
                    │  Validate       │ Schema validation
                    │  Data           │ GSTIN format, date ranges, etc.
                    └────┬─────────┘
                         │
              ┌──────────▼──────────┐
              │  Duplicate Check    │ Hash + semantic matching
              └──────────┬──────────┘
                         │
                    ┌────▼─────┐     ┌─────────────┐
                    │ Is Dup?  │─Yes─▶│ Flag & Stop │
                    └────┬─────┘     └─────────────┘
                         │No
              ┌──────────▼──────────┐
              │   Fraud / Anomaly   │ Rule-based + LLM scoring
              │     Detection       │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   Route to          │ Based on type + amount
              │   Approval          │ + fraud score
              └──────────┬──────────┘
                         │
                    ┌────▼─────┐
                    │   END    │ Document processed & queued
                    └──────────┘
```

### 4.2 Approval Workflow

```
              ┌──────────┐
              │  START   │
              └────┬─────┘
                   │
              ┌────▼──────────┐
              │ Check Amount  │
              │ & Fraud Score │
              └────┬──────────┘
                   │
         ┌─────────┼──────────┐
         │         │          │
    Low Risk   Medium Risk  High Risk
    (<10K)     (10K-1L)     (>1L or flagged)
         │         │          │
    ┌────▼───┐ ┌───▼────┐ ┌──▼──────┐
    │ Auto   │ │Manager │ │Director │
    │Approve │ │Review  │ │Review   │
    └────┬───┘ └───┬────┘ └──┬──────┘
         │         │          │
         │    ┌────▼───┐ ┌───▼────┐
         │    │Approved│ │Approved│
         │    │   ?    │ │   ?    │
         │    └─┬───┬──┘ └─┬───┬──┘
         │   Yes│   │No  Yes│   │No
         │      │   │       │   │
         │      │ ┌─▼────┐  │ ┌─▼────┐
         │      │ │Reject│  │ │Reject│
         │      │ └──────┘  │ └──────┘
         │      │           │
         └──────┴───────────┘
                   │
              ┌────▼─────┐
              │ Finalize │ Update status, audit log
              └────┬─────┘
                   │
              ┌────▼─────┐
              │   END    │
              └──────────┘
```

### 4.3 Three-Way Matching Workflow

```
              ┌──────────┐
              │  START   │ Input: Invoice ID
              └────┬─────┘
                   │
              ┌────▼──────────┐
              │ Fetch Invoice │
              │ + Line Items  │
              └────┬──────────┘
                   │
              ┌────▼──────────┐
              │ Find Matching │ By PO number, vendor, or
              │ PO            │ line item similarity
              └────┬──────────┘
                   │
              ┌────▼───┐
              │PO Found│──No──▶ Flag as Unmatched
              └────┬───┘
                   │Yes
              ┌────▼──────────┐
              │ Find Matching │
              │ Challan        │
              └────┬──────────┘
                   │
              ┌────▼───────┐
              │Challan Found│──No──▶ Partial Match (2-way)
              └────┬───────┘
                   │Yes
              ┌────▼──────────────┐
              │ Compare Line Items│
              │ Invoice ↔ PO ↔    │
              │ Challan           │
              └────┬──────────────┘
                   │
              ┌────▼────────────┐
              │ Within          │
              │ Tolerance?      │
              └────┬───────┬────┘
                   │Yes    │No
              ┌────▼────┐ ┌▼────────────┐
              │ MATCHED │ │ Discrepancy │
              │         │ │ Report      │
              └────┬────┘ └─────┬───────┘
                   │            │
              ┌────▼────────────▼──┐
              │  Store Result +    │
              │  Notify            │
              └────────────────────┘
```

---

## 5. Streamlit Dashboard Layout

### Desktop Layout (Full View)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐ ┌─────────────────────────────────────────────────┐ │
│ │             │ │  Header: Logo + Search + Notifications + User   │ │
│ │  SIDEBAR    │ ├─────────────────────────────────────────────────┤ │
│ │             │ │                                                 │ │
│ │ 📊 Dashboard│ │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ │
│ │ 📄 Documents│ │  │Total   │ │Pending │ │Process │ │Savings │  │ │
│ │ 🧾 Invoices │ │  │Invoices│ │Approval│ │  Rate  │ │  ROI   │  │ │
│ │ 🏢 Vendors  │ │  │ 1,247  │ │   23   │ │ 94.2%  │ │ ₹4.2L  │  │ │
│ │ 👥 Customers│ │  └────────┘ └────────┘ └────────┘ └────────┘  │ │
│ │ 📦 POs      │ │                                                 │ │
│ │ 🔗 Matching │ │  ┌─────────────────────┐ ┌───────────────────┐  │ │
│ │ 💰 GST      │ │  │                     │ │                   │  │ │
│ │ 📈 Analytics│ │  │  Spend Trend Chart  │ │  Recent Activity  │  │ │
│ │ 🤖 Copilot  │ │  │  (Plotly line)      │ │  Feed             │  │ │
│ │ 👤 CRM      │ │  │                     │ │                   │  │ │
│ │ ⚙️ Settings │ │  └─────────────────────┘ └───────────────────┘  │ │
│ │ 📋 Audit    │ │                                                 │ │
│ │ 👥 Users    │ │  ┌─────────────────────┐ ┌───────────────────┐  │ │
│ │             │ │  │ Vendor Distribution │ │ Processing Queue  │  │ │
│ │ ─────────── │ │  │ (Pie chart)         │ │ Status            │  │ │
│ │ v1.0.0      │ │  │                     │ │                   │  │ │
│ │ Org: Acme   │ │  └─────────────────────┘ └───────────────────┘  │ │
│ └─────────────┘ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Limited View)

```
┌─────────────────────────────┐
│  📱 AutoFinDocs             │
│  ─────────────────────────  │
│                             │
│  ⚠️ For the best experience │
│  use our Android app or     │
│  desktop browser.           │
│                             │
│  [Download APK]             │
│                             │
│  ─────────── OR ──────────  │
│                             │
│  Quick View (Limited):      │
│                             │
│  ┌────────┐ ┌────────┐     │
│  │Invoices│ │Pending │     │
│  │ 1,247  │ │   23   │     │
│  └────────┘ └────────┘     │
│                             │
│  📷 Quick Scan              │
│  📋 Recent Documents        │
│  ✅ Pending Approvals       │
│                             │
└─────────────────────────────┘
```

---

## 6. API Endpoint Summary

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user profile |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/documents/upload` | Upload document (multipart) |
| POST | `/api/v1/documents/upload-batch` | Bulk upload |
| GET | `/api/v1/documents` | List documents (paginated, filtered) |
| GET | `/api/v1/documents/{id}` | Get document detail + extracted data |
| DELETE | `/api/v1/documents/{id}` | Soft delete document |
| GET | `/api/v1/documents/{id}/ocr-preview` | Get OCR text preview |
| POST | `/api/v1/documents/{id}/reprocess` | Re-run OCR + extraction |

### Invoices
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/invoices` | List invoices |
| GET | `/api/v1/invoices/{id}` | Invoice detail with line items |
| PUT | `/api/v1/invoices/{id}` | Update invoice fields |
| GET | `/api/v1/invoices/{id}/history` | Version history |

### Vendors & Customers
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/v1/vendors` | List / Create vendor |
| GET/PUT/DELETE | `/api/v1/vendors/{id}` | CRUD vendor |
| GET | `/api/v1/vendors/{id}/invoices` | Vendor's invoices |
| GET | `/api/v1/vendors/{id}/performance` | Performance score |
| GET/POST | `/api/v1/customers` | List / Create customer |
| GET/PUT/DELETE | `/api/v1/customers/{id}` | CRUD customer |

### CRM
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/v1/crm/contacts` | Contact history |
| GET/POST | `/api/v1/crm/tags` | Tag management |
| POST | `/api/v1/crm/tags/{id}/assign` | Assign tag to entity |
| GET/POST | `/api/v1/crm/notes` | Notes management |

### Purchase Orders & Matching
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/v1/purchase-orders` | List / Create PO |
| GET/PUT | `/api/v1/purchase-orders/{id}` | CRUD PO |
| POST | `/api/v1/matching/match/{invoice_id}` | Run 3-way match |
| GET | `/api/v1/matching/results` | List match results |
| GET | `/api/v1/matching/results/{id}` | Match detail |

### Approvals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/approvals/pending` | Pending approvals |
| POST | `/api/v1/approvals/{id}/approve` | Approve document |
| POST | `/api/v1/approvals/{id}/reject` | Reject document |
| POST | `/api/v1/approvals/{id}/escalate` | Escalate to higher role |
| GET | `/api/v1/approvals/rules` | Get approval rules |
| POST | `/api/v1/approvals/rules` | Create approval rule |

### GST Compliance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/gst/reconcile` | Run reconciliation |
| GET | `/api/v1/gst/gstr1-summary` | GSTR-1 summary |
| GET | `/api/v1/gst/gstr2b-comparison` | GSTR-2B comparison |
| GET | `/api/v1/gst/itc-mismatches` | ITC mismatch report |
| POST | `/api/v1/gst/upload-portal-data` | Upload GST portal data |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/analytics/spend-trends` | Spend over time |
| GET | `/api/v1/analytics/vendor-analysis` | Vendor spending analysis |
| GET | `/api/v1/analytics/automation-roi` | Automation ROI metrics |
| GET | `/api/v1/analytics/processing-metrics` | Doc processing stats |
| GET | `/api/v1/analytics/aging` | Invoice aging report |

### AI Copilot
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/copilot/query` | Natural language query |
| GET | `/api/v1/copilot/history` | Conversation history |
| GET | `/api/v1/copilot/suggestions` | Suggested queries |

### Import / Export
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/import/upload` | Upload Excel/CSV for import |
| POST | `/api/v1/import/preview` | Preview + column mapping |
| POST | `/api/v1/import/execute` | Execute import |
| POST | `/api/v1/export` | Export data (format, filters) |

### Master Data
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/v1/master/gl-codes` | GL code management |
| GET/POST | `/api/v1/master/approval-hierarchies` | Approval config |
| GET/POST | `/api/v1/master/custom-rules` | Custom automation rules |
| GET/POST | `/api/v1/master/tax-rates` | Tax rate config |

### Audit & Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/audit-logs` | Search audit trail |
| GET | `/api/v1/users` | List users (admin) |
| PUT | `/api/v1/users/{id}/role` | Update user role |
| POST | `/api/v1/users/{id}/deactivate` | Deactivate user |

### Bulk Operations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/bulk/approve` | Bulk approve documents |
| POST | `/api/v1/bulk/delete` | Bulk soft delete |
| POST | `/api/v1/bulk/update` | Bulk update fields |
| POST | `/api/v1/bulk/export` | Bulk export |

---

## 7. Security Considerations

- **JWT tokens** with 24h expiry, refresh token rotation
- **RBAC**: Admin > Manager > Accountant > Viewer (cumulative permissions)
- **Password**: bcrypt with 12 rounds minimum
- **File uploads**: Validate MIME type, max size 25MB, virus scan path (optional)
- **SQL injection**: Prevented via SQLAlchemy ORM (parameterized queries only)
- **XSS**: Streamlit sanitizes by default; custom HTML escaped
- **CORS**: Whitelist frontend origin only
- **Rate limiting**: 100 req/min for API, 10 req/min for LLM endpoints
- **Audit**: All state-changing operations logged with user, IP, timestamp
- **Secrets**: Never in code; always via environment variables
- **HTTPS**: Enforced via Render's TLS termination

---

## 8. Performance Targets

| Metric | Target |
|---|---|
| API response (CRUD) | < 200ms p95 |
| Document upload + queue | < 1s |
| OCR processing | < 30s per page |
| LLM extraction | < 15s per document |
| Full pipeline (upload → extracted) | < 60s |
| Dashboard page load | < 3s |
| Concurrent users supported | 50+ |
| Database query (indexed) | < 50ms |

---

## 9. Estimated Timeline

| Phase | Duration | Cumulative |
|---|---|---|
| Phase 1: Foundation | 3 days | Day 3 |
| Phase 2: Document Processing | 4 days | Day 7 |
| Phase 3: Duplicate/Fraud + Approvals | 3 days | Day 10 |
| Phase 4: CRM | 3 days | Day 13 |
| Phase 5: PO + 3-Way Matching | 3 days | Day 16 |
| Phase 6: GST Compliance | 3 days | Day 19 |
| Phase 7: Import/Export + Master Data | 3 days | Day 22 |
| Phase 8: Analytics + AI Copilot | 4 days | Day 26 |
| Phase 9: Audit + Users + Email | 3 days | Day 29 |
| Phase 10: Free-Tier Deploy + Polish | 4 days | Day 33 |

**Total: ~33 working days for full platform.**

---

## 10. Open Questions for User

1. **LLM Provider**: Which LLM do you want as the primary provider? (OpenAI GPT-4o / Google Gemini / Local Ollama)
2. **Multi-tenancy**: Should the platform support multiple organizations, or is it single-org?
3. **Android APK**: Is there an existing Android app, or should the mobile banner just show a placeholder link?
4. **Email ingestion**: Which email providers need to be supported? Gmail-only or generic IMAP?
5. **GST portal integration**: Is this manual CSV upload from the portal, or do you want API integration (requires GSP)?
6. **Existing data**: Do you have existing invoice/vendor data to migrate, or starting fresh?
7. **Supabase region**: Which region for your Supabase project? (Closest to your users for lowest latency)
8. **Celery strategy**: On Render free tier you only get 1 web service. Run Celery worker in-process (via BackgroundTasks + threading) or pay for a separate worker service?
