-- ═══════════════════════════════════════════════════════════════════════════
-- AutoFinDocs — Supabase Schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in the Supabase Dashboard → SQL Editor to create the tables
-- needed when using Supabase instead of local SQLite.
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ─── Documents ────────────────────────────────────────────────────────────────
create table if not exists documents (
  id                text primary key default gen_random_uuid()::text,
  file_name         text not null,
  file_type         text not null,
  file_size         bigint not null,
  storage_path      text not null,
  thumbnail_path    text,
  document_type     text,
  source            text not null default 'web',
  status            text not null default 'UPLOADED',
  ocr_text          text,
  ocr_confidence    double precision,
  ocr_language      text default 'en',
  extracted_data    text,
  fraud_risk        text,
  approval_comments text,
  approved_by       text,
  vendor_id         text references vendors(id) on delete set null,
  uploaded_at       timestamptz not null default now(),
  processed_at      timestamptz,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_documents_status       on documents(status);
create index if not exists idx_documents_type         on documents(document_type);
create index if not exists idx_documents_vendor       on documents(vendor_id);
create index if not exists idx_documents_uploaded_at  on documents(uploaded_at desc);

-- ─── Vendors ──────────────────────────────────────────────────────────────────
create table if not exists vendors (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  gstin      text,
  pan        text,
  email      text,
  phone      text,
  address    text,
  category   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_name  on vendors(name);
create index if not exists idx_vendors_gstin on vendors(gstin);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id          text primary key default gen_random_uuid()::text,
  document_id text not null references documents(id) on delete cascade,
  action      text not null,
  details     text,
  actor       text default 'system',
  timestamp   timestamptz not null default now()
);

create index if not exists idx_audit_document on audit_logs(document_id);
create index if not exists idx_audit_action    on audit_logs(action);

-- ─── Copilot Messages ────────────────────────────────────────────────────────
create table if not exists copilot_messages (
  id        text primary key default gen_random_uuid()::text,
  role      text not null,
  content   text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_copilot_created on copilot_messages(created_at);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- For a single-user demo app, allow anon access. Tighten for production.
alter table documents       enable row level security;
alter table vendors         enable row level security;
alter table audit_logs      enable row level security;
alter table copilot_messages enable row level security;

create policy "anon all documents"        on documents        for all using (true) with check (true);
create policy "anon all vendors"          on vendors          for all using (true) with check (true);
create policy "anon all audit_logs"       on audit_logs       for all using (true) with check (true);
create policy "anon all copilot_messages" on copilot_messages for all using (true) with check (true);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_documents_touch on documents;
create trigger trg_documents_touch before update on documents
  for each row execute function touch_updated_at();

drop trigger if exists trg_vendors_touch on vendors;
create trigger trg_vendors_touch before update on vendors
  for each row execute function touch_updated_at();
