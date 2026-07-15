# instruction.md — Phase-Wise Execution Instructions for Subagents

> **Purpose**: This file provides precise, step-by-step execution instructions for each phase of the AutoFinDocs platform. Each phase is a self-contained unit of work that a subagent can pick up and execute independently, as long as prior phases are completed.

> **Root Directory**: `c:\D-Drive\project_ww1`

> **Critical Rules for ALL Subagents**:
> 1. Read `CLAUDE.md` before starting ANY phase — it defines all conventions.
> 2. Never hard-code credentials. Always use `backend/config.py` (Pydantic Settings from `.env`).
> 3. Use `from __future__ import annotations` in every Python file.
> 4. Use async everywhere in FastAPI (routes, DB sessions, services).
> 5. All financial amounts use `Numeric(15, 2)` — never `Float`.
> 6. Every model inherits from `Base` in `backend/models/base.py`.
> 7. Pydantic schemas use `model_config = ConfigDict(from_attributes=True)`.
> 8. All routes are under `/api/v1/` prefix.
> 9. Wrap API responses: `{"status": "success", "data": ...}` or `{"status": "error", "detail": ...}`.
> 10. Streamlit NEVER imports backend code directly — all communication via `frontend/api_client.py` HTTP calls.

---

## PHASE 1 — Foundation

**Subagent Role**: `Foundation Builder`
**Prerequisites**: Empty workspace
**Outputs**: Working backend + frontend with auth, running locally

### Step 1.1 — Project Scaffolding

Create the following root files:

**`.gitignore`**:
```
__pycache__/
*.pyc
.env
venv/
.venv/
uploads/
*.egg-info/
dist/
build/
.pytest_cache/
.ruff_cache/
htmlcov/
.coverage
```

**`.env.example`** — Copy the environment variables block exactly from `CLAUDE.md` (Supabase + Upstash + JWT + LLM + Storage + Email + App sections).

**`pyproject.toml`**:
```toml
[project]
name = "autofinocs"
version = "0.1.0"
requires-python = ">=3.11"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**`requirements/base.txt`**:
```
python-dotenv==1.1.0
pydantic==2.11.3
pydantic-settings==2.9.1
sqlalchemy[asyncio]==2.0.41
asyncpg==0.30.0
alembic==1.16.2
structlog==25.4.0
```

**`requirements/api.txt`**:
```
-r base.txt
fastapi==0.115.12
uvicorn[standard]==0.34.3
python-jose[cryptography]==3.5.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
httpx==0.28.1
celery[redis]==5.5.2
redis==5.3.0
supabase==2.15.2
```

**`requirements/worker.txt`**:
```
-r base.txt
celery[redis]==5.5.2
redis==5.3.0
paddleocr==2.10.0
paddlepaddle==3.1.0
pdf2image==1.17.0
Pillow==11.2.1
langchain==0.3.25
langchain-core==0.3.59
langgraph==0.4.8
langchain-openai==0.3.18
langchain-google-genai==2.1.5
```

**`requirements/frontend.txt`**:
```
streamlit==1.45.1
httpx==0.28.1
plotly==6.1.2
pandas==2.3.0
streamlit-option-menu==0.4.0
```

### Step 1.2 — Backend Config & Database

**`backend/__init__.py`**: Empty file.

**`backend/config.py`**:
```python
from __future__ import annotations
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autofinocs"

    # Upstash Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440

    # LLM
    LLM_PROVIDER: str = "gemini"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Storage
    STORAGE_BACKEND: str = "local"
    SUPABASE_STORAGE_BUCKET: str = "documents"
    UPLOAD_DIR: str = "./uploads"

    # Email
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_PORT: int = 993
    IMAP_USER: str = ""
    IMAP_PASSWORD: str = ""

    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: list[str] = ["http://localhost:8501"]
    API_BASE_URL: str = "http://localhost:8000"

settings = Settings()
```

**`backend/database.py`**:
- Create async engine using `settings.DATABASE_URL`.
- Create `async_sessionmaker` bound to the engine.
- Create `async def get_db()` async generator that yields sessions.
- Use `pool_size=5`, `max_overflow=10`, `pool_pre_ping=True` for Supabase pooler compatibility.

### Step 1.3 — Base Model Mixin

**`backend/models/__init__.py`**: Import and re-export `Base` from `base.py`.

**`backend/models/base.py`**:
- Create `class Base(DeclarativeBase)` with `type_annotation_map` for common types.
- Create `class TimestampMixin` with:
  - `id`: `Mapped[uuid.UUID]` primary key, `default=uuid.uuid4`
  - `created_at`: `Mapped[datetime]` server_default `func.now()`
  - `updated_at`: `Mapped[datetime]` onupdate `func.now()`
  - `is_deleted`: `Mapped[bool]` default `False`
  - `deleted_at`: `Mapped[datetime | None]`
- All subsequent models inherit from BOTH `TimestampMixin` and `Base`.

### Step 1.4 — User Model + Auth

**`backend/models/user.py`**:
```
Table: users
Columns:
  - id (UUID, PK)
  - email (String(255), unique, indexed, not null)
  - hashed_password (String(255), not null)
  - full_name (String(255))
  - role (String(50), default="viewer")  # admin, manager, accountant, viewer
  - is_active (Boolean, default=True)
  - last_login_at (DateTime, nullable)
  + TimestampMixin columns
```

**`backend/utils/__init__.py`**: Empty.

**`backend/utils/security.py`**:
- `hash_password(password: str) -> str` — bcrypt via passlib
- `verify_password(plain: str, hashed: str) -> bool`
- `create_access_token(data: dict, expires_delta: timedelta | None) -> str` — python-jose JWT
- `decode_access_token(token: str) -> dict` — raises HTTPException on failure

**`backend/schemas/__init__.py`**: Empty.

**`backend/schemas/auth.py`**:
- `UserRegister(email, password, full_name)`
- `UserLogin(email, password)`
- `UserResponse(id, email, full_name, role, is_active, created_at)` — with `from_attributes=True`
- `TokenResponse(access_token, token_type="bearer")`

**`backend/services/__init__.py`**: Empty.

**`backend/services/auth_service.py`**:
- `async def register_user(db, user_data) -> User`
- `async def authenticate_user(db, email, password) -> User | None`
- `async def get_current_user(db, token) -> User` — decode JWT, fetch user

### Step 1.5 — Auth API

**`backend/api/__init__.py`**: Empty.
**`backend/api/v1/__init__.py`**: Empty.
**`backend/api/deps.py`**:
- `get_current_user` dependency — extracts Bearer token from header, decodes, fetches user from DB.
- `require_role(*roles)` — dependency factory that checks user role.

**`backend/api/v1/auth.py`**:
- `POST /register` — create user, return UserResponse
- `POST /login` — authenticate, return TokenResponse
- `GET /me` — return current user (requires auth)
- `POST /refresh` — issue new token

**`backend/api/router.py`**:
- Create root `APIRouter` with prefix `/api/v1`
- Include `auth.router`

### Step 1.6 — FastAPI App Factory

**`backend/main.py`**:
```python
# Key elements:
# 1. lifespan context manager (startup/shutdown)
# 2. FastAPI app with title="AutoFinDocs API", version="1.0.0"
# 3. CORSMiddleware with settings.CORS_ORIGINS
# 4. Include api router
# 5. Health check endpoint: GET /health -> {"status": "ok"}
# 6. Global exception handler for unhandled errors
```

### Step 1.7 — Alembic Setup

- Run `alembic init alembic` from project root.
- Edit `alembic.ini`: set `sqlalchemy.url` to empty (will be overridden).
- Edit `alembic/env.py`:
  - Import `settings.DATABASE_URL` (convert async URL to sync for Alembic: replace `asyncpg` with `psycopg2` or use `postgresql://`).
  - Import `Base.metadata` from `backend.models.base`.
  - Import ALL model files so they register with metadata.
  - Set `target_metadata = Base.metadata`.
- Generate first migration: `alembic revision --autogenerate -m "create_users_table"`

### Step 1.8 — Streamlit Shell

**`frontend/app.py`**:
```python
# 1. st.set_page_config(page_title="AutoFinDocs", page_icon="📊", layout="wide")
# 2. Load and inject custom CSS from frontend/static/styles/main.css
# 3. Check st.session_state for auth token
# 4. If not authenticated: show login page
# 5. If authenticated: show sidebar navigation + route to pages
```

**`frontend/config.py`**:
```python
API_BASE_URL = "http://localhost:8000"  # Override from env for prod
```

**`frontend/api_client.py`**:
```python
# Centralized HTTP client using httpx
# - get(endpoint, token) -> response
# - post(endpoint, data, token) -> response
# - put(endpoint, data, token) -> response
# - delete(endpoint, token) -> response
# - upload_file(endpoint, file, token) -> response
# All methods:
#   - prepend API_BASE_URL
#   - attach Authorization: Bearer {token} header
#   - handle errors uniformly
```

**`frontend/auth.py`**:
```python
# - login(email, password) -> token or error
# - register(email, password, full_name) -> token or error
# - logout() -> clear session_state
# - is_authenticated() -> bool
# - get_token() -> str
```

**`frontend/static/styles/main.css`**:
- Professional dark-themed finance dashboard CSS.
- Custom sidebar styling (dark background, accent highlights).
- Metric card styling with subtle shadows and rounded corners.
- Data table styling with alternating row colors.
- Override Streamlit default padding and fonts.
- Use Google Font: Inter or Outfit.

Create skeleton page files (empty pages that just show a title):
- `frontend/pages/01_📊_Dashboard.py`
- `frontend/pages/02_📄_Documents.py`
- `frontend/pages/03_🧾_Invoices.py`
- All remaining pages from CLAUDE.md folder structure (04 through 14).

### Step 1.9 — Device Detection

**`frontend/device_detect.py`**:
```python
# Inject JavaScript that detects window.innerWidth and sends it back via
# streamlit-js-eval or st.components.v1.html
# Function: get_screen_width() -> int | None
# Function: is_mobile() -> bool (width < 768)
```

**`frontend/components/__init__.py`**: Empty.

**`frontend/components/mobile_banner.py`**:
```python
# If is_mobile():
#   Show warning banner with:
#   - "For the best experience, use our Android app or desktop browser"
#   - Download APK button (placeholder link)
#   - Limited quick-access options only
```

### Verification — Phase 1

```bash
# 1. Backend starts without errors
uvicorn backend.main:app --reload --port 8000

# 2. Health check returns 200
curl http://localhost:8000/health

# 3. Swagger docs accessible
# Open http://localhost:8000/docs

# 4. Register + Login works
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!","full_name":"Test User"}'

# 5. Frontend starts
streamlit run frontend/app.py --server.port 8501

# 6. Login UI works and shows sidebar after auth
```

---

## PHASE 2 — Document Processing Core

**Subagent Role**: `Document Processing Engineer`
**Prerequisites**: Phase 1 complete (auth, DB, base models)
**Outputs**: Upload → OCR → Classify → Extract → Store pipeline

### Step 2.1 — Document & Invoice Models

**`backend/models/document.py`**:
```
Table: documents
Columns:
  - id (UUID, PK) + TimestampMixin
  - file_name (String(500), not null)
  - file_path (String(1000), not null) — Supabase storage path or local path
  - file_type (String(20)) — pdf, png, jpg, jpeg
  - file_size_bytes (Integer)
  - file_hash (String(64)) — SHA-256 for duplicate detection
  - doc_type (String(50), default="UNKNOWN") — GST_INVOICE, RECEIPT, EBILL, CREDIT_NOTE, DEBIT_NOTE, PURCHASE_ORDER, DELIVERY_CHALLAN, UNKNOWN
  - status (String(30), default="UPLOADED") — UPLOADED, PROCESSING, OCR_COMPLETE, CLASSIFIED, EXTRACTED, VALIDATED, APPROVED, REJECTED, ERROR
  - ocr_text (Text, nullable) — raw OCR output
  - ocr_confidence (Numeric(5,2), nullable)
  - classification_confidence (Numeric(5,2), nullable)
  - error_message (Text, nullable)
  - uploaded_by (UUID, FK → users.id)
  - processing_started_at (DateTime, nullable)
  - processing_completed_at (DateTime, nullable)
```

**`backend/models/invoice.py`**:
```
Table: invoices
Columns:
  - id (UUID, PK) + TimestampMixin
  - document_id (UUID, FK → documents.id, unique)
  - vendor_id (UUID, FK → vendors.id, nullable) — linked after vendor match
  - customer_id (UUID, FK → customers.id, nullable)
  - invoice_number (String(100), indexed)
  - invoice_date (Date)
  - due_date (Date, nullable)
  - place_of_supply (String(100), nullable)
  - vendor_name (String(500)) — as extracted from doc
  - vendor_gstin (String(15), nullable)
  - buyer_name (String(500), nullable)
  - buyer_gstin (String(15), nullable)
  - subtotal (Numeric(15,2), default=0)
  - cgst_amount (Numeric(15,2), default=0)
  - sgst_amount (Numeric(15,2), default=0)
  - igst_amount (Numeric(15,2), default=0)
  - cess_amount (Numeric(15,2), default=0)
  - total_tax (Numeric(15,2), default=0)
  - total_amount (Numeric(15,2), default=0)
  - currency (String(3), default="INR")
  - payment_status (String(20), default="UNPAID") — UNPAID, PARTIAL, PAID
  - notes (Text, nullable)
  - raw_extracted_json (JSON, nullable) — full LLM output for debugging
```

**`backend/models/line_item.py`**:
```
Table: line_items
Columns:
  - id (UUID, PK) + TimestampMixin
  - invoice_id (UUID, FK → invoices.id)
  - line_number (Integer)
  - description (String(1000))
  - hsn_sac_code (String(20), nullable)
  - quantity (Numeric(15,3), default=1)
  - unit (String(20), nullable) — pcs, kg, litre, etc.
  - unit_price (Numeric(15,2), default=0)
  - discount_percent (Numeric(5,2), default=0)
  - taxable_value (Numeric(15,2), default=0)
  - cgst_rate (Numeric(5,2), default=0)
  - sgst_rate (Numeric(5,2), default=0)
  - igst_rate (Numeric(5,2), default=0)
  - cgst_amount (Numeric(15,2), default=0)
  - sgst_amount (Numeric(15,2), default=0)
  - igst_amount (Numeric(15,2), default=0)
  - total_amount (Numeric(15,2), default=0)
```

**`backend/schemas/document.py`**:
- `DocumentUploadResponse(id, file_name, status, created_at)`
- `DocumentResponse(full model fields + line_items if invoice)`
- `DocumentListResponse(items: list[DocumentResponse], total: int, page: int)`

**`backend/schemas/invoice.py`**:
- `InvoiceResponse`, `InvoiceDetailResponse(with line_items)`, `LineItemResponse`

Generate Alembic migration: `alembic revision --autogenerate -m "add_documents_invoices_line_items"`

### Step 2.2 — Storage Service

**`backend/services/storage_service.py`**:
```python
# Abstract base:
class StorageBackend(ABC):
    async def save_file(self, file_content: bytes, file_name: str, content_type: str) -> str:
        """Returns the storage path/URL."""
    async def get_file(self, file_path: str) -> bytes:
        ...
    async def delete_file(self, file_path: str) -> bool:
        ...
    async def get_public_url(self, file_path: str) -> str:
        ...

# LocalStorage — saves to settings.UPLOAD_DIR/{uuid}/{filename}
# SupabaseStorage — uses supabase-py client to upload to bucket
#   - Initialize: supabase.create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
#   - Upload: client.storage.from_(bucket).upload(path, file_content)
#   - Download: client.storage.from_(bucket).download(path)
#   - Public URL: client.storage.from_(bucket).get_public_url(path)

# Factory function:
def get_storage_backend() -> StorageBackend:
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseStorage()
    return LocalStorage()
```

### Step 2.3 — OCR Service

**`backend/services/ocr_service.py`**:
```python
# class OCRService:
#     def __init__(self):
#         self.ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
#
#     async def extract_text(self, file_content: bytes, file_type: str) -> OCRResult:
#         """
#         1. If PDF: convert to images using pdf2image (one image per page)
#         2. Run PaddleOCR on each image
#         3. Combine results
#         4. Return OCRResult(text: str, confidence: float, bounding_boxes: list)
#         """
#
#     def _pdf_to_images(self, pdf_bytes: bytes) -> list[Image]:
#         from pdf2image import convert_from_bytes
#         return convert_from_bytes(pdf_bytes, dpi=300)
#
#     def _run_ocr_on_image(self, image) -> tuple[str, float]:
#         result = self.ocr.ocr(np.array(image), cls=True)
#         # Parse result into text + average confidence
#         return text, avg_confidence
```

### Step 2.4 — Classification Service

**`backend/services/classification_service.py`**:
```python
# KEYWORD_MAP = {
#     "GST_INVOICE": ["tax invoice", "gstin", "cgst", "sgst", "igst", "hsn"],
#     "RECEIPT": ["receipt", "received with thanks", "payment received"],
#     "EBILL": ["e-bill", "electronic bill", "utility bill"],
#     "CREDIT_NOTE": ["credit note", "credit memo"],
#     "DEBIT_NOTE": ["debit note", "debit memo"],
#     "PURCHASE_ORDER": ["purchase order", "p.o.", "po number"],
#     "DELIVERY_CHALLAN": ["delivery challan", "challan no", "goods delivered"],
# }
#
# class ClassificationService:
#     async def classify(self, ocr_text: str) -> ClassificationResult:
#         # Stage 1: Keyword matching (fast)
#         result = self._keyword_classify(ocr_text)
#         if result.confidence >= 0.8:
#             return result
#         # Stage 2: LLM fallback (slower, more accurate)
#         return await self._llm_classify(ocr_text)
#
#     def _keyword_classify(self, text: str) -> ClassificationResult:
#         # Count keyword matches per category, return highest
#
#     async def _llm_classify(self, text: str) -> ClassificationResult:
#         # Use LangChain with structured output
#         # Prompt: "Classify this document into one of: [categories]. Return category and confidence."
```

### Step 2.5 — Extraction Service

**`backend/services/extraction_service.py`**:
```python
# Use LangChain with Pydantic structured output parsing.
# Different extraction prompts per document type.
#
# class ExtractionService:
#     async def extract(self, ocr_text: str, doc_type: str) -> dict:
#         prompt_template = self._get_prompt_for_type(doc_type)
#         chain = prompt_template | llm | parser
#         result = await chain.ainvoke({"text": ocr_text})
#         return result
#
#     def _get_prompt_for_type(self, doc_type: str) -> PromptTemplate:
#         # GST_INVOICE prompt extracts: invoice_number, date, vendor_name, vendor_gstin,
#         #   buyer_name, buyer_gstin, line_items[], cgst, sgst, igst, total
#         # PURCHASE_ORDER prompt extracts: po_number, vendor, items, delivery_date
#         # etc.
```

### Step 2.6 — LangGraph Document Pipeline

**`backend/workflows/__init__.py`**: Empty.
**`backend/workflows/nodes/__init__.py`**: Empty.

Create individual node files in `backend/workflows/nodes/`:
- **`ocr_node.py`**: `async def ocr_node(state) -> state` — calls OCRService
- **`classify_node.py`**: `async def classify_node(state) -> state` — calls ClassificationService
- **`extract_node.py`**: `async def extract_node(state) -> state` — calls ExtractionService
- **`validate_node.py`**: `async def validate_node(state) -> state` — GSTIN format check (15 chars, regex `\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}`), date validity, amount > 0
- **`duplicate_check_node.py`**: Placeholder — full implementation in Phase 3
- **`fraud_check_node.py`**: Placeholder — full implementation in Phase 3
- **`route_node.py`**: `async def route_node(state) -> state` — determine next action based on classification + confidence

**`backend/workflows/document_pipeline.py`**:
```python
# from langgraph.graph import StateGraph, END
#
# class DocumentState(TypedDict):
#     document_id: str
#     file_content: bytes
#     file_type: str
#     ocr_text: str
#     ocr_confidence: float
#     doc_type: str
#     classification_confidence: float
#     extracted_data: dict
#     validation_errors: list[str]
#     is_duplicate: bool
#     fraud_score: float
#     status: str
#     error: str | None
#
# def build_document_pipeline() -> StateGraph:
#     graph = StateGraph(DocumentState)
#     graph.add_node("ocr", ocr_node)
#     graph.add_node("classify", classify_node)
#     graph.add_node("extract", extract_node)
#     graph.add_node("validate", validate_node)
#     graph.add_node("duplicate_check", duplicate_check_node)
#     graph.add_node("fraud_check", fraud_check_node)
#     graph.add_node("route", route_node)
#
#     graph.set_entry_point("ocr")
#     graph.add_edge("ocr", "classify")
#     graph.add_edge("classify", "extract")
#     graph.add_edge("extract", "validate")
#     graph.add_edge("validate", "duplicate_check")
#     graph.add_edge("duplicate_check", "fraud_check")
#     graph.add_edge("fraud_check", "route")
#     graph.add_edge("route", END)
#
#     return graph.compile()
```

### Step 2.7 — Celery Task

**`backend/tasks/__init__.py`**: Empty.

**`backend/tasks/celery_app.py`**:
```python
from celery import Celery
from backend.config import settings

celery_app = Celery(
    "autofinocs",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)
```

**`backend/tasks/document_tasks.py`**:
```python
# @celery_app.task(bind=True, max_retries=3)
# def process_document(self, document_id: str):
#     """Run the full LangGraph document pipeline."""
#     # 1. Fetch document from DB
#     # 2. Download file from storage
#     # 3. Run pipeline: ocr → classify → extract → validate → duplicate → fraud → route
#     # 4. Save results to DB (update document status, create invoice + line_items)
#     # 5. Handle errors: update document.status = "ERROR", document.error_message
```

### Step 2.8 — Document & Invoice API

**`backend/api/v1/documents.py`**:
- `POST /documents/upload` — accept multipart file, validate type (pdf/png/jpg/jpeg), validate size (<50MB), compute file_hash, save to storage, create DB record, dispatch `process_document.delay(doc_id)`, return DocumentUploadResponse.
- `POST /documents/upload-batch` — accept multiple files, loop above.
- `GET /documents` — paginated list with filters (status, doc_type, date_range). Query params: `page`, `page_size`, `status`, `doc_type`, `search`.
- `GET /documents/{id}` — detail view with related invoice + line_items.
- `DELETE /documents/{id}` — soft delete.
- `GET /documents/{id}/ocr-preview` — return ocr_text.
- `POST /documents/{id}/reprocess` — re-dispatch pipeline.

**`backend/api/v1/invoices.py`**:
- `GET /invoices` — paginated list with filters.
- `GET /invoices/{id}` — detail with line_items.
- `PUT /invoices/{id}` — manual edit of extracted fields.

Update `backend/api/router.py` to include documents and invoices routers.

### Step 2.9 — Streamlit Document Page

**`frontend/pages/02_📄_Documents.py`**:
```python
# 1. Check auth
# 2. Show upload section:
#    - st.file_uploader(accept_multiple_files=True, type=["pdf","png","jpg","jpeg"])
#    - Upload button → calls api_client.upload_file()
#    - Show progress spinner during upload
# 3. Show documents table:
#    - Fetch from GET /documents with pagination
#    - Display: file_name, doc_type, status (with colored badges), uploaded date, confidence
#    - Clickable rows → show detail
# 4. Document detail (st.expander or separate section):
#    - Status badge, OCR text preview
#    - If invoice extracted: show all fields + line items table
#    - Reprocess button
#    - Delete button
```

### Verification — Phase 2

```bash
# 1. Upload a test PDF via Swagger
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@test_invoice.pdf"

# 2. Check document status updates from UPLOADED → PROCESSING → EXTRACTED
curl http://localhost:8000/api/v1/documents/{id}

# 3. Verify invoice + line_items are created
curl http://localhost:8000/api/v1/invoices

# 4. Streamlit shows uploaded documents and extracted data
```

---

## PHASE 3 — Duplicate & Fraud Detection + Approval Workflow

**Subagent Role**: `Security & Workflow Engineer`
**Prerequisites**: Phase 2 complete
**Outputs**: Duplicate flagging, fraud scoring, configurable approval chains

### Step 3.1 — Duplicate Detection

**`backend/services/duplicate_service.py`**:
```python
# class DuplicateService:
#     async def check_duplicate(self, db, document_id: str, file_hash: str,
#                                invoice_data: dict) -> DuplicateResult:
#         # Check 1: Exact file hash match
#         existing = await db.execute(
#             select(Document).where(Document.file_hash == file_hash,
#                                     Document.id != document_id))
#         if existing.scalar_one_or_none():
#             return DuplicateResult(is_duplicate=True, match_type="EXACT_HASH", ...)
#
#         # Check 2: Semantic match (same invoice_number + vendor + amount + date)
#         existing_invoice = await db.execute(
#             select(Invoice).where(
#                 Invoice.invoice_number == invoice_data.get("invoice_number"),
#                 Invoice.vendor_name == invoice_data.get("vendor_name"),
#                 Invoice.total_amount == invoice_data.get("total_amount"),
#                 Invoice.invoice_date == invoice_data.get("invoice_date"),
#                 Invoice.document_id != document_id))
#         if existing_invoice.scalar_one_or_none():
#             return DuplicateResult(is_duplicate=True, match_type="SEMANTIC", ...)
#
#         return DuplicateResult(is_duplicate=False)
```

### Step 3.2 — Fraud/Anomaly Detection

**`backend/services/fraud_service.py`**:
```python
# class FraudService:
#     CHECKS = [
#         "gstin_format",      # GSTIN doesn't match regex
#         "future_date",       # Invoice date is in the future
#         "round_amount",      # Total is suspiciously round (e.g., exactly 100000)
#         "amount_outlier",    # Amount > 3 std dev from vendor's average
#         "velocity_check",    # >5 invoices from same vendor in 24h
#         "missing_fields",    # Critical fields missing (invoice_number, date, total)
#     ]
#
#     async def score(self, db, invoice_data: dict, document_id: str) -> FraudResult:
#         flags = []
#         for check in self.CHECKS:
#             result = await getattr(self, f"_check_{check}")(db, invoice_data, document_id)
#             if result:
#                 flags.append(result)
#         score = len(flags) / len(self.CHECKS)  # 0.0 to 1.0
#         risk_level = "HIGH" if score > 0.5 else "MEDIUM" if score > 0.2 else "LOW"
#         return FraudResult(score=score, risk_level=risk_level, flags=flags)
```

### Step 3.3 — Approval Model

**`backend/models/approval.py`**:
```
Table: approval_requests
  - id, document_id (FK), status (PENDING/IN_REVIEW/APPROVED/REJECTED/ESCALATED),
    current_step (Integer), assigned_to (FK users.id, nullable),
    approved_by (FK users.id, nullable), comments (Text), decided_at (DateTime)

Table: approval_rules
  - id, name (String), condition_field (String), operator (String),
    threshold_value (Numeric), approver_role (String), step_order (Integer), is_active (Boolean)
```

### Step 3.4 — LangGraph Approval Workflow

**`backend/workflows/approval_workflow.py`**:
```python
# States: check_rules → auto_approve | assign_reviewer → await_decision → finalize
#
# class ApprovalState(TypedDict):
#     document_id: str
#     invoice_amount: Decimal
#     fraud_score: float
#     fraud_risk_level: str
#     current_step: int
#     assigned_to: str | None
#     decision: str | None  # APPROVED, REJECTED, ESCALATED
#     comments: str
#
# Routing logic:
#   - amount < 10,000 AND fraud_risk == "LOW" → auto_approve
#   - amount 10,000–100,000 OR fraud_risk == "MEDIUM" → assign to manager
#   - amount > 100,000 OR fraud_risk == "HIGH" → assign to director/admin
```

### Step 3.5 — Approval API

Add to existing routes or create `backend/api/v1/approvals.py`:
- `GET /approvals/pending` — list pending for current user's role
- `POST /approvals/{id}/approve` — approve with optional comments
- `POST /approvals/{id}/reject` — reject with required comments
- `POST /approvals/{id}/escalate` — escalate to higher role
- `GET /approvals/rules` — list rules (admin only)
- `POST /approvals/rules` — create rule (admin only)

### Step 3.6 — Streamlit Approval Queue

**`frontend/components/approval_card.py`**:
```python
# def render_approval_card(approval: dict):
#     with st.container():
#         col1, col2, col3 = st.columns([3, 1, 1])
#         # col1: document name, vendor, amount, fraud risk badge
#         # col2: Approve button (green)
#         # col3: Reject button (red)
#         # Expandable: comment field, escalate option
```

Integrate into `frontend/pages/03_🧾_Invoices.py` or create a dedicated approvals section.

### Verification — Phase 3

```bash
# 1. Upload duplicate document → status shows "DUPLICATE_FLAGGED"
# 2. Upload suspicious document → fraud_score > 0, flags listed
# 3. Low-amount invoice auto-approved
# 4. High-amount invoice shows in pending approvals
# 5. Manager can approve/reject from Streamlit
```

---

## PHASE 4 — CRM + Vendor/Customer Management

**Subagent Role**: `CRM Module Developer`
**Prerequisites**: Phase 1 complete (Phase 2–3 optional but recommended)
**Outputs**: Full vendor/customer CRUD with CRM features

### Step 4.1 — Models

**`backend/models/vendor.py`**:
```
Table: vendors
  - id, name, gstin (indexed), pan, email, phone, address_line1, address_line2,
    city, state, pincode, country (default="India"),
    bank_name, bank_account_number, bank_ifsc,
    payment_terms_days (Integer, default=30),
    performance_score (Numeric(5,2), default=0),
    is_verified (Boolean, default=False),
    total_invoices_count (Integer, default=0),
    total_invoice_amount (Numeric(15,2), default=0),
    + TimestampMixin
```

**`backend/models/customer.py`**:
```
Table: customers
  - id, name, gstin, pan, email, phone,
    billing_address, shipping_address, city, state, pincode,
    + TimestampMixin
```

**`backend/models/crm.py`**:
```
Table: contact_history
  - id, entity_type (vendor/customer), entity_id (UUID),
    contact_type (email/call/meeting/note), subject, content (Text),
    contacted_by (FK users.id), contacted_at (DateTime)

Table: tags
  - id, name (unique), color (String(7)), entity_type (String)

Table: entity_tags (junction table)
  - id, tag_id (FK), entity_type, entity_id

Table: notes
  - id, entity_type, entity_id, content (Text), created_by (FK users.id)
```

### Step 4.2 — CRM Service

**`backend/services/crm_service.py`**:
- Vendor CRUD + search/filter (by name, gstin, city, tags)
- Customer CRUD + search/filter
- Contact history: add, list by entity
- Tag management: create, assign, remove, list by entity
- Notes: add, list by entity
- Vendor performance scoring: calculate from invoice history
  - `score = (on_time_delivery_pct * 0.4) + (invoice_accuracy_pct * 0.4) + (100 - dispute_rate_pct) * 0.2`

### Step 4.3 — CRM API

**`backend/api/v1/vendors.py`**:
- Full CRUD: GET (list + search), POST, GET/{id}, PUT/{id}, DELETE/{id}
- `GET /vendors/{id}/invoices` — vendor's invoice history
- `GET /vendors/{id}/performance` — performance breakdown

**`backend/api/v1/customers.py`**: Same pattern.

**`backend/api/v1/crm.py`**:
- `GET/POST /crm/contacts?entity_type=vendor&entity_id={id}`
- `GET/POST /crm/tags`
- `POST /crm/tags/{id}/assign` body: `{entity_type, entity_id}`
- `GET/POST /crm/notes?entity_type=vendor&entity_id={id}`

### Step 4.4 — Streamlit CRM Pages

**`frontend/pages/04_🏢_Vendors.py`**:
- Search bar + filters (state, verified status, tags)
- Data table: name, GSTIN, city, performance score (color-coded), invoice count
- Click → vendor detail: contact info, bank details, invoice history, performance chart, tags, notes, contact timeline
- Add/Edit vendor form

**`frontend/pages/05_👥_Customers.py`**: Similar pattern.

**`frontend/pages/11_👤_CRM.py`**:
- Unified CRM view: recent contacts, tags overview, notes feed
- Filter by entity type + entity

### Verification — Phase 4

```bash
# 1. Create vendor via API/UI → appears in list
# 2. Add tags, notes, contact history
# 3. Vendor performance score calculated from invoice data
# 4. Search and filter working
```

---

## PHASE 5 — Purchase Orders + 3-Way Matching

**Subagent Role**: `Matching Engine Developer`
**Prerequisites**: Phase 2 + Phase 4 complete
**Outputs**: PO management + automated 3-way matching

### Step 5.1 — PO & Challan Models

Create `backend/models/purchase_order.py` and `backend/models/delivery_challan.py` and `backend/models/matching.py` as defined in PLAN.md section 3 (All Tables).

### Step 5.2 — Matching Service

**`backend/services/matching_service.py`**:
```python
# class MatchingService:
#     TOLERANCE_PERCENT = 2.0  # configurable
#
#     async def match_invoice(self, db, invoice_id: str) -> MatchResult:
#         invoice = await self._fetch_invoice_with_items(db, invoice_id)
#
#         # Step 1: Find matching PO (by po_number reference in invoice, or vendor + items)
#         po = await self._find_matching_po(db, invoice)
#         if not po:
#             return MatchResult(status="UNMATCHED", reason="No matching PO found")
#
#         # Step 2: Find matching Challan (by PO reference)
#         challan = await self._find_matching_challan(db, po.id)
#         if not challan:
#             return MatchResult(status="PARTIAL_2WAY", ...)
#
#         # Step 3: Compare line items across all three
#         discrepancies = self._compare_line_items(
#             invoice.line_items, po.line_items, challan.line_items)
#
#         # Step 4: Check tolerance
#         if all(d.within_tolerance for d in discrepancies):
#             return MatchResult(status="MATCHED", ...)
#         return MatchResult(status="DISCREPANCY", discrepancies=discrepancies)
```

### Step 5.3 — LangGraph Matching Workflow

**`backend/workflows/matching_workflow.py`** — Implement the graph from PLAN.md section 4.3.

### Step 5.4 — Matching API

**`backend/api/v1/purchase_orders.py`**: CRUD for POs.
**`backend/api/v1/matching.py`**:
- `POST /matching/match/{invoice_id}` — trigger 3-way match
- `GET /matching/results` — list results
- `GET /matching/results/{id}` — detail with discrepancies

### Step 5.5 — Streamlit Matching Page

**`frontend/pages/07_🔗_Matching.py`**:
- Side-by-side 3-column view: Invoice | PO | Challan
- Line item comparison table with color-coded matches (green=match, yellow=tolerance, red=mismatch)
- One-click match confirmation or dispute

### Verification — Phase 5

```bash
# 1. Create PO → Create Challan → Upload Invoice
# 2. Run match → returns MATCHED or DISCREPANCY with details
# 3. Streamlit shows side-by-side comparison
```

---

## PHASE 6 — GST Compliance & Tax

**Subagent Role**: `GST Compliance Developer`
**Prerequisites**: Phase 2 complete
**Outputs**: GSTR-1 generation, GSTR-2B reconciliation, ITC mismatch detection

### Step 6.1–6.4 — Models, Service, API, UI

Follow PLAN.md Phase 6 tasks exactly.

**Key Implementation Details for `backend/services/gst_service.py`**:
```python
# class GSTService:
#     async def generate_gstr1_summary(self, db, period: str) -> GSTR1Summary:
#         """Generate GSTR-1 from sales invoices for the period (e.g., '2026-06')."""
#         # Query invoices where invoice_date falls in period
#         # Group by: B2B (>2.5L), B2C Large, B2C Small, Credit/Debit Notes
#         # Compute: taxable_value, cgst, sgst, igst per rate slab
#
#     async def reconcile_gstr2b(self, db, period: str, portal_data: list[dict]) -> list[ReconResult]:
#         """Match portal GSTR-2B entries against booked purchase invoices."""
#         # For each portal entry:
#         #   Find matching invoice by: vendor_gstin + invoice_number + invoice_date
#         #   Compare: total_amount, tax amounts
#         #   Flag mismatches: MATCHED, AMOUNT_MISMATCH, MISSING_IN_BOOKS, MISSING_IN_PORTAL
#
#     async def detect_itc_mismatches(self, db, period: str) -> list[ITCMismatch]:
#         """Find ITC claimed but not in GSTR-2B."""
```

**`frontend/pages/08_💰_GST_Compliance.py`**:
- Period selector (month/year dropdown)
- GSTR-1 Summary cards (B2B, B2C, total tax)
- GSTR-2B reconciliation table (with mismatch highlighting)
- ITC mismatch report
- Export buttons (CSV/Excel for filing)

---

## PHASE 7 — Import/Export + Master Data + Bulk Ops

**Subagent Role**: `Data Management Developer`
**Prerequisites**: Phase 1 + Phase 4 complete
**Outputs**: Excel/CSV import-export, GL codes, approval hierarchies, custom rules

### Step 7.1 — Import/Export Service

**`backend/services/import_export_service.py`**:
```python
# class ImportExportService:
#     SUPPORTED_ENTITIES = ["invoices", "vendors", "customers"]
#
#     async def import_file(self, db, file_content: bytes, file_type: str,
#                           entity_type: str, column_mapping: dict) -> ImportResult:
#         df = pd.read_excel(BytesIO(file_content)) if file_type == "xlsx" else pd.read_csv(...)
#         df = df.rename(columns=column_mapping)
#         # Validate required columns
#         # Bulk insert with conflict handling
#         return ImportResult(total=len(df), success=n, errors=errors)
#
#     async def export_data(self, db, entity_type: str, filters: dict,
#                           format: str = "xlsx") -> bytes:
#         # Query data with filters
#         # Convert to DataFrame
#         # Export to xlsx (openpyxl) or csv
#         return file_bytes
#
#     async def preview_import(self, file_content, file_type) -> PreviewResult:
#         # Return first 10 rows + column names for mapping UI
```

### Step 7.2–7.4 — Master Data Models, API, UI

Follow PLAN.md Phase 7 exactly. Key models in `backend/models/master_data.py`:
- `GLCode(code, description, category, parent_id, is_active)`
- `ApprovalHierarchy(role, min_amount, max_amount, step_order)`
- `CustomRule(name, trigger_event, condition_json, action_json, priority, is_active)`
- `TaxRate(name, rate, effective_from, effective_to)`
- `CostCenter(code, name, department, is_active)`

---

## PHASE 8 — Analytics + AI Copilot

**Subagent Role**: `Analytics & AI Developer`
**Prerequisites**: Phase 2 + Phase 4 complete (needs invoice + vendor data)
**Outputs**: Analytics dashboard + natural language AI copilot

### Step 8.1–8.3 — Analytics

**`backend/services/analytics_service.py`**:
```python
# Key queries (all use SQLAlchemy async):
#
# spend_trends(period: monthly/quarterly/yearly, date_range) -> list[{period, total_amount}]
#     SELECT date_trunc('month', invoice_date), SUM(total_amount) GROUP BY 1 ORDER BY 1
#
# vendor_analysis(top_n, date_range) -> list[{vendor, total, invoice_count, avg_amount}]
#     SELECT vendor_name, SUM(total_amount), COUNT(*) GROUP BY vendor_name ORDER BY SUM DESC
#
# automation_roi() -> {docs_processed, manual_time_saved_hours, error_reduction_pct, cost_saved}
#     Based on: processing_queue completion rates, avg processing time
#
# processing_metrics() -> {total, by_status, by_type, avg_processing_time, success_rate}
#
# aging_analysis(as_of_date) -> list[{bucket: "0-30 days", count, total_amount}]
#     Bucket invoices by (as_of_date - due_date) into 0-30, 31-60, 61-90, 90+ days
```

**Streamlit Charts** — use Plotly:
- Line chart: spend trends over time
- Bar chart: top 10 vendors by spend
- Pie chart: document type distribution
- Funnel: processing pipeline stages
- KPI metric cards at top

### Step 8.4–8.6 — AI Copilot

**`backend/services/copilot_service.py`**:
```python
# Use LangChain Agent with tools:
#
# tools = [
#     Tool("query_invoices", description="Search invoices by vendor, date, amount, status"),
#     Tool("query_vendors", description="Search vendors by name, gstin, city"),
#     Tool("get_analytics", description="Get spend trends, vendor analysis, ROI metrics"),
#     Tool("get_document_status", description="Check processing status of a document"),
# ]
#
# Each tool calls the corresponding service and returns structured data.
# Agent has conversation memory (per user, stored in DB or Redis).
#
# Example queries the copilot should handle:
# - "Show me top 5 vendors by spend this quarter"
# - "How many invoices are pending approval?"
# - "What's the total GST paid in June 2026?"
# - "Find all invoices from Vendor X over 50,000"
```

**`frontend/pages/10_🤖_AI_Copilot.py`**:
- Chat interface using `st.chat_message` + `st.chat_input`
- Display structured responses (tables, charts) inline in chat
- Suggested queries as clickable pills
- Conversation history in sidebar

---

## PHASE 9 — Audit Trail + User Management + Email Ingestion

**Subagent Role**: `Platform Operations Developer`
**Prerequisites**: Phase 1 complete
**Outputs**: Audit logs, user CRUD, email ingestion, reports

### Step 9.1 — Audit System

**`backend/models/audit.py`**:
```
Table: audit_logs
  - id (UUID, PK), entity_type (String), entity_id (UUID),
    action (String: CREATE/UPDATE/DELETE),
    old_value_json (JSON, nullable), new_value_json (JSON, nullable),
    user_id (FK users.id), ip_address (String(45)),
    user_agent (String(500), nullable),
    created_at (DateTime, server_default now())
```

**`backend/services/audit_service.py`**:
```python
# class AuditService:
#     async def log(self, db, entity_type, entity_id, action, old_value, new_value, user_id, ip):
#         ...
#
# Auto-capture via SQLAlchemy event listeners:
# @event.listens_for(Session, "after_flush")
# def after_flush(session, flush_context):
#     for obj in session.new:      # CREATE
#     for obj in session.dirty:    # UPDATE (diff old vs new)
#     for obj in session.deleted:  # DELETE
```

### Step 9.2 — User Management

**`backend/api/v1/users.py`**:
- `GET /users` — list all (admin only)
- `GET /users/{id}` — detail
- `PUT /users/{id}/role` — change role (admin only)
- `POST /users/{id}/deactivate` — deactivate (admin only)
- `POST /users/{id}/activate` — reactivate (admin only)
- `POST /users/{id}/reset-password` — password reset (admin only)

### Step 9.3 — Email Ingestion

**`backend/services/email_service.py`**:
```python
# class EmailIngestionService:
#     async def poll_inbox(self):
#         """Connect to IMAP, fetch unread emails with attachments, process each."""
#         import imaplib, email
#         mail = imaplib.IMAP4_SSL(settings.IMAP_HOST, settings.IMAP_PORT)
#         mail.login(settings.IMAP_USER, settings.IMAP_PASSWORD)
#         mail.select("INBOX")
#         _, messages = mail.search(None, "UNSEEN")
#
#         for msg_id in messages[0].split():
#             _, msg_data = mail.fetch(msg_id, "(RFC822)")
#             msg = email.message_from_bytes(msg_data[0][1])
#             for part in msg.walk():
#                 if part.get_content_disposition() == "attachment":
#                     filename = part.get_filename()
#                     if filename and filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
#                         # Save file → create document → dispatch process_document task
#                         ...
#         mail.logout()
```

**`backend/tasks/email_tasks.py`**:
```python
# @celery_app.task
# def poll_email_inbox():
#     """Celery periodic task to poll email inbox."""
#     service = EmailIngestionService()
#     asyncio.run(service.poll_inbox())
#
# # Configure Celery beat schedule:
# celery_app.conf.beat_schedule = {
#     "poll-email-every-5-minutes": {
#         "task": "backend.tasks.email_tasks.poll_email_inbox",
#         "schedule": 300.0,
#     }
# }
```

### Step 9.4 — Streamlit Audit & User Pages

**`frontend/pages/13_📋_Audit_Trail.py`**:
- Search by entity type, action, user, date range
- Table: timestamp, user, action, entity type, entity ID (clickable link)
- Expandable row: show old_value vs new_value diff

**`frontend/pages/14_👥_User_Management.py`** (admin only):
- User table: name, email, role (dropdown), status, last login
- Add user button → form
- Deactivate/activate toggle

### Step 9.5 — Reports

**`backend/api/v1/reports.py`**:
- `GET /reports/aging` — invoice aging report
- `GET /reports/vendor-statement/{vendor_id}` — vendor statement
- `GET /reports/tax-summary?period=2026-06` — tax summary
- `GET /reports/processing-summary` — document processing report
- All support `?format=json|csv|pdf` query param.

---

## PHASE 10 — Free-Tier Deployment & Polish

**Subagent Role**: `DevOps & Polish Engineer`
**Prerequisites**: All prior phases complete
**Outputs**: Deployed, polished application

### Step 10.1 — Supabase Setup (Manual, document the steps)

Create a file `docs/deployment_guide.md` with:
1. Go to supabase.com → New Project → select region
2. Copy project URL, anon key, service role key
3. Go to Database Settings → Connection Pooling → copy pooler URL (port 6543)
4. Create storage bucket: `documents` (public or private based on need)
5. Set RLS policies if needed

### Step 10.2 — Upstash Setup (Manual, document)

1. Go to upstash.com → Create Redis Database
2. Copy `rediss://` connection string
3. Set as `REDIS_URL` in env

### Step 10.3 — Render Deployment

**`Procfile`**:
```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**`render.yaml`**:
```yaml
services:
  - type: web
    name: autofinocs-api
    env: python
    plan: free
    buildCommand: pip install -r requirements/api.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: PYTHON_VERSION
        value: "3.11.9"
    healthCheckPath: /health
```

### Step 10.4 — Streamlit Cloud Deployment

**`.streamlit/config.toml`**:
```toml
[server]
headless = true
port = 8501

[theme]
primaryColor = "#6366f1"
backgroundColor = "#0f172a"
secondaryBackgroundColor = "#1e293b"
textColor = "#e2e8f0"
font = "sans serif"

[browser]
gatherUsageStats = false
```

Steps:
1. Push to GitHub
2. Go to share.streamlit.io → New App → select repo, branch, `frontend/app.py`
3. Add secrets in Streamlit Cloud dashboard (API_BASE_URL = Render URL)

### Step 10.5 — Frontend Polish

Apply to `frontend/static/styles/main.css`:
- Dark theme with `#0f172a` background, `#1e293b` cards
- Accent: indigo `#6366f1`
- Consistent spacing (1rem, 1.5rem)
- Rounded corners (0.75rem)
- Subtle box-shadows on cards
- Loading skeletons / spinners
- Toast notifications for success/error
- Empty state illustrations
- Responsive grid layout

### Step 10.6 — Dashboard Homepage

**`frontend/pages/01_📊_Dashboard.py`**:
- 4 KPI metric cards in a row: Total Invoices, Pending Approvals, Processing Rate %, Automation Savings ₹
- Spend trend chart (Plotly line, last 12 months)
- Recent activity feed (last 10 actions from audit log)
- Quick action buttons: Upload Document, View Pending, Run Report
- Processing queue status (pie chart by status)
- Top 5 vendors by spend (horizontal bar)

### Verification — Phase 10

```
1. Backend accessible at https://autofinocs-api.onrender.com/health
2. Swagger docs at https://autofinocs-api.onrender.com/docs
3. Frontend at https://autofinocs.streamlit.app
4. Login works end-to-end
5. Upload document → pipeline runs → results visible
6. All pages load without errors
7. Mobile browser shows limited view + APK banner
```

---

## Subagent Assignment Matrix

| Phase | Can Run in Parallel With | Estimated Effort | Subagent Skills Needed |
|---|---|---|---|
| Phase 1 | — (must be first) | 3 days | FastAPI, SQLAlchemy, Streamlit, JWT |
| Phase 2 | — (needs Phase 1) | 4 days | PaddleOCR, LangChain, LangGraph, Celery |
| Phase 3 | — (needs Phase 2) | 3 days | LangGraph, business logic, fraud detection |
| Phase 4 | Phase 2, Phase 3 | 3 days | CRUD, SQLAlchemy, Streamlit |
| Phase 5 | Phase 4 | 3 days | Matching algorithms, LangGraph |
| Phase 6 | Phase 2 | 3 days | GST domain knowledge, pandas |
| Phase 7 | Phase 4 | 3 days | pandas, openpyxl, import/export |
| Phase 8 | Phase 2 + 4 | 4 days | Analytics SQL, LangChain agents, Plotly |
| Phase 9 | Phase 1 | 3 days | SQLAlchemy events, IMAP, admin features |
| Phase 10 | All phases done | 4 days | DevOps, CSS, Render, Supabase |

### Parallel Execution Strategy

```
Timeline:
Day 1-3:   [Phase 1: Foundation] ────────────────────────────►
Day 4-7:   [Phase 2: Doc Processing] ────────────────────────►
Day 4-6:   [Phase 4: CRM] ──────────────► (parallel with Phase 2)
Day 4-6:   [Phase 9: Audit+Users] ──────► (parallel with Phase 2)
Day 7-9:   [Phase 6: GST] ──────────────► (parallel with Phase 3)
Day 8-10:  [Phase 3: Fraud+Approval] ───►
Day 8-10:  [Phase 7: Import/Export] ────► (parallel with Phase 3)
Day 11-13: [Phase 5: 3-Way Match] ──────►
Day 11-14: [Phase 8: Analytics+Copilot] ►
Day 15-18: [Phase 10: Deploy+Polish] ───►

Optimized total: ~18 days with parallel subagents (vs 33 sequential)
```

---

## Error Handling Protocol for All Subagents

1. **If a dependency is missing**: Install it and add to the correct `requirements/*.txt` file.
2. **If a model field is needed from another phase**: Add it with `nullable=True` and a TODO comment.
3. **If an API endpoint conflicts**: Prefix with the module name (e.g., `/crm/contacts` not `/contacts`).
4. **If Supabase connection fails**: Check pooler URL uses port `6543` and `asyncpg` driver.
5. **If Redis/Upstash fails**: Verify `rediss://` (TLS) and the URL is correct.
6. **If tests fail on CI**: Ensure test DB uses SQLite in-memory or test-specific Supabase project.
7. **Always run `alembic revision --autogenerate`** after adding/modifying models.
8. **Always update `backend/api/router.py`** when adding new route modules.
9. **Always update `frontend/api_client.py`** when adding new API endpoints used by the frontend.
