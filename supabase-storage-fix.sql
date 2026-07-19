-- ═══════════════════════════════════════════════════════════════════════════
-- Supabase Storage Security Patch (Fixes Public/Unscoped Access Vulnerability)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Drop the existing permissive policies on the 'uploads' bucket
drop policy if exists "public read uploads" on storage.objects;
drop policy if exists "auth insert uploads" on storage.objects;
drop policy if exists "own delete uploads" on storage.objects;

-- 2. Create STRICT user-scoped policies
-- Only the owner can read their own files
create policy "own read uploads"
  on storage.objects for select
  using (bucket_id = 'uploads' and owner = auth.uid());

-- Only authenticated users can insert, and they are marked as the owner
create policy "own insert uploads"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and auth.uid() is not null);

-- Only the owner can delete their own files
create policy "own delete uploads"
  on storage.objects for delete
  using (bucket_id = 'uploads' and owner = auth.uid());
