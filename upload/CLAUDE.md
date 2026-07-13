# CLAUDE.md — Intelligent Document Finance Platform

## Project Identity

**Name**: AutoFinDocs — Intelligent Document Finance Platform  
**Type**: Full-stack web application for enterprise finance document automation  
**Primary Language**: Python 3.11+  
**Repository Root**: `c:\D-Drive\project_ww1`

---

## Tech Stack

| Layer | Technology | Free Tier |
|---|---|---|
| **Backend API** | FastAPI 0.110+ | Render free web service |
| **Database** | PostgreSQL 15 (Supabase) | Supabase Free (500 MB, 2 projects) |
| **ORM** | SQLAlchemy 2.0 (async) + Alembic migrations | — |
| **Auth** | JWT (python-jose) + bcrypt, RBAC | — |
| **Task Queue** | Celery 5.x + Redis broker | Upstash Redis Free (10K cmds/day) |
| **OCR (Primary)** | Google ML Kit on Android (on-device) | Free (runs on phone) |
| **OCR (Web Fallback)** | Tesseract (pytesseract) — lightweight | Free, ~50 MB RAM |
| **AI/LLM** | LangChain 0.2+ + LangGraph | — |
| **LLM Provider** | Configurable (OpenAI / Gemini / Ollama) | — |
| **Frontend** | Streamlit 1.35+ with custom CSS | Streamlit Community Cloud (free) |
| **Android App** | Kotlin + Jetpack Compose + ML Kit | — |
| **Deployment** | Render (API) + Streamlit Cloud (UI) | All free tier |
| **Email Ingestion** | imaplib / aiosmtplib | — |
| **File Storage** | Supabase Storage (1 GB free) | Supabase Free |
| **Monitoring** | Structlog + Sentry (optional) | Sentry free (5K events/mo) |

---

## Architecture Overview

```
📱 Android App (Kotlin)              🖥️ Streamlit Frontend (Streamlit Cloud)
  ├── Camera + ML Kit OCR              ├── Custom CSS, Device-aware, Role-based
  ├── Sends: ocr_text + image          ├── Full dashboard for desktop users
  └──────────┬─────────────────────────└──────────────┬────────────────────────
             │ POST /upload                           │ HTTPS / REST
             │ {ocr_text, file, source:"android"}      │
┌────────────▼─────────────────────────────────────────▼──────────────────────┐
│                    FastAPI Backend (Render Free Tier)                        │
│                    ~200-300 MB RAM — NO heavy OCR on server                  │
│                                                                             │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐               │
│  │ Auth     │ │ Documents │ │ CRM      │ │ Analytics        │               │
│  │ Module   │ │ Module    │ │ Module   │ │ Module           │               │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘               │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐               │
│  │ Matching │ │ GST/Tax   │ │ Master   │ │ AI Copilot       │               │
│  │ Module   │ │ Module    │ │ Data     │ │ Module           │               │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘               │
│                                                                             │
│  OCR Logic:                                                                 │
│  ├── source=="android" → SKIP OCR (use provided ocr_text)                   │
│  └── source=="web"     → Tesseract fallback (~50 MB, lightweight)           │
│                                                                             │
└────────┬────────────┬────────────┬──────────────────────────────────────────┘
         │            │            │
  ┌──────▼──────┐ ┌───▼──────┐ ┌───▼──────────────────────────────┐
  │ Supabase    │ │ Upstash  │ │ Celery Worker (in-process)      │
  │ PostgreSQL  │ │ Redis    │ │ (LLM calls, Email, background)  │
  │ + Storage   │ │ (free)   │ │ NO heavy OCR — server stays     │
  └─────────────┘ └──────────┘ │ lightweight (~200 MB total)     │
                               └─────────────────────────────────┘
```

### OCR Architecture (Phone-First)

| Source | OCR Engine | Where it Runs | Server Load |
|---|---|---|---|
| **Android app** | Google ML Kit V2 (on-device) | Phone | **Zero** — text arrives pre-extracted |
| **Web upload** (PDF/image) | Tesseract (pytesseract) | Server (Celery worker) | **~50 MB** RAM, lightweight |
| **Email ingestion** | Tesseract (pytesseract) | Server (Celery worker) | **~50 MB** RAM, lightweight |

### Free Tier Limits to Be Aware Of

| Service | Free Tier Limits | Workarounds |
|---|---|---|
| **Supabase DB** | 500 MB storage, 2 projects, 50K rows soft limit | Archive old docs, paginate aggressively |
| **Supabase Storage** | 1 GB, 50 MB file size limit | Compress uploads, purge processed originals |
| **Upstash Redis** | 10K commands/day, 256 MB | Batch Celery tasks, use DB-backed queue as fallback |
| **Render Web** | 750 hrs/mo, spins down after 15 min idle | Add a keep-alive ping cron (UptimeRobot free) |
| **Render Worker** | Same as web — 1 free service total | Run worker as background thread in same process (dev) |
| **Streamlit Cloud** | 1 GB RAM, public apps, 1 private app | Optimize memory, lazy-load data |

---

## Folder Structure

```
project_ww1/
├── CLAUDE.md                         # This file
├── PLAN.md                           # Detailed implementation plan
├── render.yaml                       # Render blueprint (API only)
├── Procfile                          # Render process command
├── .env.example
├── .gitignore
├── pyproject.toml                    # Poetry / pip project config
├── requirements/
│   ├── base.txt
│   ├── api.txt
│   ├── worker.txt
│   └── frontend.txt
│
├── alembic/                          # Database migrations
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
│
├── backend/                          # FastAPI backend
│   ├── __init__.py
│   ├── main.py                       # FastAPI app factory
│   ├── config.py                     # Pydantic Settings
│   ├── database.py                   # SQLAlchemy engine + session
│   ├── dependencies.py               # Shared FastAPI deps
│   │
│   ├── models/                       # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── base.py                   # DeclarativeBase + mixins
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── invoice.py
│   │   ├── line_item.py
│   │   ├── vendor.py
│   │   ├── customer.py
│   │   ├── purchase_order.py
│   │   ├── delivery_challan.py
│   │   ├── matching.py
│   │   ├── approval.py
│   │   ├── gst.py
│   │   ├── master_data.py
│   │   ├── audit.py
│   │   └── crm.py
│   │
│   ├── schemas/                      # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── document.py
│   │   ├── invoice.py
│   │   ├── vendor.py
│   │   ├── customer.py
│   │   ├── analytics.py
│   │   ├── matching.py
│   │   ├── gst.py
│   │   └── crm.py
│   │
│   ├── api/                          # API route modules
│   │   ├── __init__.py
│   │   ├── router.py                 # Root APIRouter aggregator
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   ├── invoices.py
│   │   │   ├── vendors.py
│   │   │   ├── customers.py
│   │   │   ├── purchase_orders.py
│   │   │   ├── matching.py
│   │   │   ├── gst.py
│   │   │   ├── analytics.py
│   │   │   ├── crm.py
│   │   │   ├── master_data.py
│   │   │   ├── bulk_ops.py
│   │   │   ├── reports.py
│   │   │   ├── copilot.py
│   │   │   ├── import_export.py
│   │   │   └── users.py
│   │   └── deps.py                   # Route-level dependencies
│   │
│   ├── services/                     # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── document_service.py
│   │   ├── ocr_service.py
│   │   ├── classification_service.py
│   │   ├── extraction_service.py
│   │   ├── duplicate_service.py
│   │   ├── fraud_service.py
│   │   ├── matching_service.py
│   │   ├── gst_service.py
│   │   ├── approval_service.py
│   │   ├── crm_service.py
│   │   ├── analytics_service.py
│   │   ├── copilot_service.py
│   │   ├── email_service.py
│   │   ├── import_export_service.py
│   │   ├── audit_service.py
│   │   └── storage_service.py
│   │
│   ├── workflows/                    # LangGraph workflows
│   │   ├── __init__.py
│   │   ├── document_pipeline.py      # Main doc processing graph
│   │   ├── approval_workflow.py      # Auto-approval state machine
│   │   ├── matching_workflow.py      # 3-way match graph
│   │   └── nodes/                    # Individual graph nodes
│   │       ├── __init__.py
│   │       ├── ocr_node.py
│   │       ├── classify_node.py
│   │       ├── extract_node.py
│   │       ├── validate_node.py
│   │       ├── duplicate_check_node.py
│   │       ├── fraud_check_node.py
│   │       ├── route_node.py
│   │       └── approve_node.py
│   │
│   ├── tasks/                        # Celery task definitions
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   ├── document_tasks.py
│   │   ├── email_tasks.py
│   │   ├── report_tasks.py
│   │   └── analytics_tasks.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── security.py               # JWT, hashing
│       ├── pagination.py
│       ├── file_utils.py
│       ├── date_utils.py
│       └── constants.py
│
├── frontend/                         # Streamlit application
│   ├── app.py                        # Main entrypoint
│   ├── config.py                     # Frontend config
│   ├── api_client.py                 # HTTP client for backend
│   ├── auth.py                       # Login / session management
│   ├── device_detect.py              # Screen size / UA detection
│   │
│   ├── pages/                        # Streamlit multipage app
│   │   ├── 01_📊_Dashboard.py
│   │   ├── 02_📄_Documents.py
│   │   ├── 03_🧾_Invoices.py
│   │   ├── 04_🏢_Vendors.py
│   │   ├── 05_👥_Customers.py
│   │   ├── 06_📦_Purchase_Orders.py
│   │   ├── 07_🔗_Matching.py
│   │   ├── 08_💰_GST_Compliance.py
│   │   ├── 09_📈_Analytics.py
│   │   ├── 10_🤖_AI_Copilot.py
│   │   ├── 11_👤_CRM.py
│   │   ├── 12_⚙️_Settings.py
│   │   ├── 13_📋_Audit_Trail.py
│   │   └── 14_👥_User_Management.py
│   │
│   ├── components/                   # Reusable Streamlit components
│   │   ├── __init__.py
│   │   ├── sidebar.py
│   │   ├── header.py
│   │   ├── data_table.py
│   │   ├── charts.py
│   │   ├── file_uploader.py
│   │   ├── approval_card.py
│   │   ├── metric_card.py
│   │   └── mobile_banner.py
│   │
│   └── static/
│       ├── styles/
│       │   ├── main.css              # Global custom CSS
│       │   ├── dark_theme.css
│       │   └── components.css
│       ├── images/
│       │   └── logo.png
│       └── js/
│           └── device_detect.js
│
├── tests/
│   ├── conftest.py
│   ├── test_api/
│   │   ├── test_auth.py
│   │   ├── test_documents.py
│   │   ├── test_invoices.py
│   │   └── test_matching.py
│   ├── test_services/
│   │   ├── test_ocr_service.py
│   │   ├── test_classification.py
│   │   └── test_matching_service.py
│   ├── test_workflows/
│   │   └── test_document_pipeline.py
│   └── test_frontend/
│       └── test_api_client.py
│
└── scripts/
    ├── seed_db.py                    # Seed demo data
    ├── run_dev.sh                    # Dev startup script
    └── migrate.sh                    # Run Alembic migrations
```

---

## Coding Conventions

### Python
- **Style**: PEP 8, enforced via `ruff` linter + `black` formatter.
- **Type hints**: Required on all function signatures. Use `from __future__ import annotations`.
- **Imports**: stdlib → third-party → local, separated by blank lines. Use absolute imports.
- **Docstrings**: Google-style for all public classes and functions.
- **Async**: Use `async def` for all FastAPI route handlers and database operations.
- **Models**: SQLAlchemy 2.0 mapped_column style. Every model inherits from `Base` (with `id`, `created_at`, `updated_at` mixin).
- **Schemas**: Pydantic V2 `model_config = ConfigDict(from_attributes=True)`.
- **Error handling**: Raise `HTTPException` in routes; use custom exception classes in services.

### Database
- **Naming**: Snake_case for tables and columns. Table names are plural (`users`, `documents`, `invoices`).
- **Migrations**: Every schema change goes through Alembic. Never modify DB directly.
- **Soft deletes**: Use `is_deleted` boolean + `deleted_at` timestamp. Never hard-delete business data.
- **Audit**: All mutable models include `created_by`, `updated_by` foreign keys to `users`.

### API Design
- **Versioning**: All routes under `/api/v1/`.
- **Response format**: Wrap in `{"status": "success", "data": ...}` or `{"status": "error", "detail": ...}`.
- **Pagination**: Cursor-based for large datasets, offset for small ones. Default page size = 25.
- **Auth**: Bearer token in `Authorization` header. Dependency injection via `get_current_user`.

### Frontend (Streamlit)
- **Custom CSS**: Injected via `st.markdown(css, unsafe_allow_html=True)` at app init.
- **State**: Use `st.session_state` for auth tokens, filters, and page-level state.
- **API calls**: All through `api_client.py`, never direct DB access.
- **Device awareness**: Check on page load, show mobile banner if on small screen.

### Testing
- **Framework**: pytest + pytest-asyncio + httpx (AsyncClient for FastAPI).
- **Coverage target**: 80%+ on services and workflows.
- **Fixtures**: Shared in `conftest.py`. Use factory pattern for model creation.

---

## Environment Variables

```env
# ── Supabase ──
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql+asyncpg://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# ── Upstash Redis ──
REDIS_URL=rediss://default:xxxxx@xxxxx.upstash.io:6379

# ── Auth ──
JWT_SECRET_KEY=change-me-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# ── LLM ──
LLM_PROVIDER=gemini           # openai | gemini | ollama
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434

# ── Storage (Supabase Storage) ──
STORAGE_BACKEND=supabase      # local | supabase
SUPABASE_STORAGE_BUCKET=documents
UPLOAD_DIR=./uploads          # local dev fallback

# ── Email Ingestion ──
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=docs@company.com
IMAP_PASSWORD=...

# ── Sentry (optional) ──
SENTRY_DSN=

# ── App ──
APP_ENV=development           # development | staging | production
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:8501"]
API_BASE_URL=http://localhost:8000   # Render URL in prod
```

---

## Key Commands

```bash
# ── Local Development ──

# 1. Create virtual environment
python -m venv venv && venv\Scripts\activate   # Windows
# source venv/bin/activate                       # Linux/Mac

# 2. Install dependencies
pip install -r requirements/base.txt -r requirements/api.txt -r requirements/frontend.txt

# 3. Run backend API
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 4. Run Celery worker (separate terminal)
celery -A backend.tasks.celery_app worker --loglevel=info

# 5. Run Streamlit frontend (separate terminal)
streamlit run frontend/app.py --server.port 8501

# ── Database Migrations ──
alembic upgrade head
alembic revision --autogenerate -m "description"

# ── Testing ──
pytest tests/ -v --cov=backend

# ── Lint + Format ──
ruff check . && black .

# ── Seed Database ──
python scripts/seed_db.py

# ── Deploy to Render (push to GitHub, auto-deploys) ──
# Backend: Connect GitHub repo → Render Web Service
# Frontend: Connect GitHub repo → Streamlit Community Cloud
```

---

## Git Workflow

- **Main branch**: `main` — always deployable.
- **Feature branches**: `feature/<module>-<description>` (e.g., `feature/ocr-tesseract-fallback`).
- **Commit messages**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **PR requirements**: All tests pass, ruff clean, at least 1 review.

---

## Module Dependency Order (Build Sequence)

1. `config.py` + `database.py` — Foundation  
2. `models/` — All ORM models  
3. `schemas/` — Pydantic schemas  
4. `utils/` — Shared utilities  
5. `services/auth_service.py` — Auth first  
6. `api/v1/auth.py` + `api/v1/users.py` — Auth routes  
7. `services/storage_service.py` + `services/ocr_service.py` — File handling  
8. `workflows/` — LangGraph pipelines  
9. `tasks/` — Celery background tasks  
10. `services/` — Remaining business logic  
11. `api/v1/` — Remaining routes  
12. `frontend/` — Streamlit UI  
13. Render + Streamlit Cloud deployment  

---

## Important Notes

- **Never commit** `.env`, API keys, or credentials.
- **Always use async** database sessions in FastAPI context.
- **LLM calls are expensive** — cache results in DB, use background tasks for heavy processing.
- **OCR is phone-first** — Android app does OCR on-device via ML Kit. Server only runs lightweight Tesseract as fallback for web/email uploads. No PaddleOCR on server.
- **Server stays lightweight** (~200-300 MB RAM) — Render free tier works because heavy OCR is offloaded to the phone.
- **Streamlit** has its own process; it talks to FastAPI over HTTP, never imports backend code directly.
- **All financial amounts** stored as `Numeric(15, 2)` in PostgreSQL. Never use floats for money.
- **Supabase connection pooling** — always use the pooler URL (port `6543`) with `asyncpg`, not the direct connection.
- **Upstash Redis** uses TLS — connection string starts with `rediss://` (double-s).
- **Render free tier** spins down after 15 min idle — first request after sleep takes ~30s. Use UptimeRobot (free) to keep alive.
- **Streamlit Cloud** has 1 GB RAM limit — lazy-load data, use pagination, avoid loading full datasets into memory.
- **Supabase Storage** has 50 MB per file limit — validate on upload.
- **No Docker** — deploy directly via GitHub integration on Render and Streamlit Cloud.
- **Android app** is the primary scanning client. See `android_prompt.md` for the full build spec.
