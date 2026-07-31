-- ═══════════════════════════════════════════════════════════════════════════
-- AutoFinDocs — Supabase Schema (user-scoped)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in the Supabase Dashboard → SQL Editor.
-- Uses Supabase Auth (auth.users) for authentication. Business tables link to
-- auth.users(id) so every document/vendor is scoped to its owner.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── profiles (mirrors auth.users with a display name + avatar) ──────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile when a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Vendors ──────────────────────────────────────────────────────────────────
create table if not exists vendors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  gstin      text,
  pan        text,
  email      text,
  phone      text,
  address    text,
  category   text,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_name   on vendors(name);
create index if not exists idx_vendors_gstin  on vendors(gstin);
create index if not exists idx_vendors_user   on vendors(user_id);

-- ─── Documents ────────────────────────────────────────────────────────────────
create table if not exists documents (
  id                uuid primary key default gen_random_uuid(),
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
  vendor_id         uuid references vendors(id) on delete set null,
  user_id           uuid not null references auth.users(id) on delete cascade,
  uploaded_at       timestamptz not null default now(),
  processed_at      timestamptz,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_documents_status      on documents(status);
create index if not exists idx_documents_type        on documents(document_type);
create index if not exists idx_documents_vendor      on documents(vendor_id);
create index if not exists idx_documents_user        on documents(user_id);
create index if not exists idx_documents_uploaded_at on documents(uploaded_at desc);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  action      text not null,
  details     text,
  actor       text default 'system',
  timestamp   timestamptz not null default now()
);

create index if not exists idx_audit_document on audit_logs(document_id);
create index if not exists idx_audit_action    on audit_logs(action);

-- ─── Copilot Messages ────────────────────────────────────────────────────────
create table if not exists copilot_messages (
  id         uuid primary key default gen_random_uuid(),
  role       text not null,
  content    text not null,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_copilot_created on copilot_messages(created_at);
create index if not exists idx_copilot_user    on copilot_messages(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security — users can only see/modify their own data
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table profiles         enable row level security;
alter table vendors          enable row level security;
alter table documents        enable row level security;
alter table audit_logs       enable row level security;
alter table copilot_messages enable row level security;

-- Force RLS so even table owners (service_role) are subject to policies
alter table profiles         force row level security;
alter table vendors          force row level security;
alter table documents        force row level security;
alter table audit_logs       force row level security;
alter table copilot_messages force row level security;

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Users can see/update only their own profile.
-- INSERT is denied: profiles are created by the handle_new_user() trigger.
create policy "own profile read"  on profiles for select using (auth.uid() = id);
create policy "own profile write" on profiles for update using (auth.uid() = id);
create policy "deny direct profile insert" on profiles as restrictive
  for insert with check (false);

-- ─── Vendors ─────────────────────────────────────────────────────────────────
create policy "own vendors all" on vendors for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Documents ───────────────────────────────────────────────────────────────
create policy "own documents all" on documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Audit Logs (immutable — no UPDATE/DELETE allowed) ───────────────────────
create policy "own audit read" on audit_logs for select
  using (
    auth.uid() = user_id
    or exists (select 1 from documents d where d.id = audit_logs.document_id and d.user_id = auth.uid())
  );
create policy "own audit insert" on audit_logs for insert
  with check (
    (user_id is null or auth.uid() = user_id)
    and exists (select 1 from documents d where d.id = audit_logs.document_id and d.user_id = auth.uid())
  );
create policy "deny audit update" on audit_logs as restrictive for update using (false);
create policy "deny audit delete" on audit_logs as restrictive for delete using (false);

-- ─── Copilot Messages (strict user scoping, no NULL user_id allowed) ─────────
create policy "own copilot select" on copilot_messages for select using (auth.uid() = user_id);
create policy "own copilot insert" on copilot_messages for insert with check (auth.uid() = user_id);
create policy "own copilot update" on copilot_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own copilot delete" on copilot_messages for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_touch  on profiles;
create trigger trg_profiles_touch  before update on profiles  for each row execute function touch_updated_at();
drop trigger if exists trg_documents_touch on documents;
create trigger trg_documents_touch before update on documents for each row execute function touch_updated_at();
drop trigger if exists trg_vendors_touch   on vendors;
create trigger trg_vendors_touch   before update on vendors   for each row execute function touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Schema updates for AI pipeline, denormalized stats & vendor memory
-- ═══════════════════════════════════════════════════════════════════════════

-- Alter documents to add pipeline fields
alter table documents add column if not exists irn text;
alter table documents add column if not exists gstin_valid boolean;
alter table documents add column if not exists totals_verified boolean;
alter table documents add column if not exists missing_fields text;
alter table documents add column if not exists pipeline_passes integer;
create index if not exists idx_documents_irn on documents(irn);

-- Alter vendors to add denormalized counters
alter table vendors add column if not exists total_documents integer not null default 0;
alter table vendors add column if not exists total_spend double precision not null default 0.0;
alter table vendors add column if not exists last_document_at timestamptz;

-- Alter audit_logs to add user scoping
alter table audit_logs add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_audit_user on audit_logs(user_id);

-- Create vendor_memory table for layout learning
create table if not exists vendor_memory (
  id             uuid primary key default gen_random_uuid(),
  cache_key      text not null,
  vendor_name    text not null,
  gstin          text,
  extracted_json text not null,
  hit_count      integer not null default 0,
  stored_at      timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  user_id        uuid references auth.users(id) on delete cascade
);

create unique index if not exists idx_vendor_memory_user_key on vendor_memory(user_id, cache_key);
create index if not exists idx_vendor_memory_user on vendor_memory(user_id);

alter table vendor_memory enable row level security;
alter table vendor_memory force row level security;

create policy "own vendor_memory all" on vendor_memory for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_vendor_memory_touch on vendor_memory;
create trigger trg_vendor_memory_touch before update on vendor_memory for each row execute function touch_updated_at();

-- ─── Storage Bucket ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('uploads', 'uploads', false)
  on conflict do nothing;

-- Owner-scoped storage policies (no public read)
create policy "own read uploads"
  on storage.objects for select
  using (bucket_id = 'uploads' and owner = auth.uid());

create policy "own insert uploads"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and auth.uid() is not null);

create policy "own delete uploads"
  on storage.objects for delete
  using (bucket_id = 'uploads' and owner = auth.uid());

