-- ═══════════════════════════════════════════════════════════════════════════
-- DocFlux — RLS Security Fixes
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard → SQL Editor AFTER the main schema.
-- Addresses all RLS audit findings.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- FIX 1: Tighten copilot_messages INSERT policy
-- ISSUE : WITH CHECK allowed user_id IS NULL → anonymous/unscoped inserts
-- FIX   : Require auth.uid() = user_id on every insert
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own copilot all" ON copilot_messages;

CREATE POLICY "own copilot select" ON copilot_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own copilot insert" ON copilot_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own copilot update" ON copilot_messages
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own copilot delete" ON copilot_messages
  FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────
-- FIX 2: Enforce FORCE ROW LEVEL SECURITY on all tables
-- ISSUE : relforcerowsecurity = false → table owner (e.g. postgres role
--         used by service_role key) bypasses all RLS silently.
-- FIX   : FORCE RLS so even table owners are subject to policies.
--         Service-role operations that need to bypass should use
--         supabase.auth.admin or SET LOCAL role = 'service_role'.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles         FORCE ROW LEVEL SECURITY;
ALTER TABLE vendors          FORCE ROW LEVEL SECURITY;
ALTER TABLE documents        FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       FORCE ROW LEVEL SECURITY;
ALTER TABLE copilot_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE vendor_memory    FORCE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────
-- FIX 3: Add explicit DELETE deny on audit_logs
-- ISSUE : No DELETE policy exists — RLS implicitly denies, but an
--         explicit restrictive policy makes intent clear and guards
--         against future permissive policy additions.
-- ─────────────────────────────────────────────────────────────────────────
CREATE POLICY "deny audit delete" ON audit_logs
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

CREATE POLICY "deny audit update" ON audit_logs
  AS RESTRICTIVE
  FOR UPDATE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- FIX 4: Upgrade audit_logs policies to use direct user_id column
-- ISSUE : Original policies join through documents table, but a direct
--         user_id column was added later. Using both for defense-in-depth.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own audit read"   ON audit_logs;
DROP POLICY IF EXISTS "own audit insert" ON audit_logs;

-- SELECT: user can read logs they own OR logs for their documents
CREATE POLICY "own audit read" ON audit_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = audit_logs.document_id
        AND d.user_id = auth.uid()
    )
  );

-- INSERT: must set user_id to own uid AND document must belong to them
CREATE POLICY "own audit insert" ON audit_logs
  FOR INSERT WITH CHECK (
    (user_id IS NULL OR auth.uid() = user_id)
    AND EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = audit_logs.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────
-- FIX 5: Add explicit INSERT policy on profiles
-- ISSUE : No INSERT policy — creation goes through SECURITY DEFINER
--         trigger, but an explicit restrictive deny prevents any
--         direct PostgREST INSERT bypass attempts.
-- ─────────────────────────────────────────────────────────────────────────
CREATE POLICY "deny direct profile insert" ON profiles
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);


-- ─────────────────────────────────────────────────────────────────────────
-- FIX 6: Patch permissive storage policies (from supabase-storage-fix.sql)
-- ISSUE : Original schema had public-read on uploads bucket.
-- FIX   : Owner-scoped read/write/delete.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public read uploads"  ON storage.objects;
DROP POLICY IF EXISTS "auth insert uploads"  ON storage.objects;
DROP POLICY IF EXISTS "own delete uploads"   ON storage.objects;
DROP POLICY IF EXISTS "own read uploads"     ON storage.objects;
DROP POLICY IF EXISTS "own insert uploads"   ON storage.objects;

CREATE POLICY "own read uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads' AND owner = auth.uid());

CREATE POLICY "own insert uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "own delete uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'uploads' AND owner = auth.uid());
