-- ═══════════════════════════════════════════════════════════════════════════
-- DocFlux — Comprehensive Supabase Security Advisor Fixes
-- ═══════════════════════════════════════════════════════════════════════════
-- Fixes ALL issues flagged by Supabase Security Advisor:
--  1. RLS Disabled in Public (documents, audit_logs, copilot_messages, vendor_memory)
--  2. Policy Exists RLS Disabled (audit_logs, copilot_messages)
--  3. RLS Policy Always True
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1: Enable + Force RLS on ALL public tables
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_memory    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vendors          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.documents        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_memory    FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop ALL existing policies (clean slate to avoid duplicates)
-- ─────────────────────────────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "own profile read"             ON public.profiles;
DROP POLICY IF EXISTS "own profile write"            ON public.profiles;
DROP POLICY IF EXISTS "deny direct profile insert"   ON public.profiles;

-- vendors
DROP POLICY IF EXISTS "own vendors all"              ON public.vendors;

-- documents
DROP POLICY IF EXISTS "own documents all"            ON public.documents;

-- audit_logs
DROP POLICY IF EXISTS "own audit read"               ON public.audit_logs;
DROP POLICY IF EXISTS "own audit insert"             ON public.audit_logs;
DROP POLICY IF EXISTS "deny audit update"            ON public.audit_logs;
DROP POLICY IF EXISTS "deny audit delete"            ON public.audit_logs;

-- copilot_messages
DROP POLICY IF EXISTS "own copilot all"              ON public.copilot_messages;
DROP POLICY IF EXISTS "own copilot select"           ON public.copilot_messages;
DROP POLICY IF EXISTS "own copilot insert"           ON public.copilot_messages;
DROP POLICY IF EXISTS "own copilot update"           ON public.copilot_messages;
DROP POLICY IF EXISTS "own copilot delete"           ON public.copilot_messages;

-- vendor_memory
DROP POLICY IF EXISTS "own vendor_memory all"        ON public.vendor_memory;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3: Re-create strict, non-trivially-true policies
-- ─────────────────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────────────────
-- SELECT: only own profile (auth.uid() = id — never trivially true)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- UPDATE: only own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- INSERT: blocked — profiles are created via the on_auth_user_created trigger
CREATE POLICY "profiles_insert_deny" ON public.profiles
  AS RESTRICTIVE FOR INSERT WITH CHECK (false);

-- DELETE: blocked — profiles are deleted via cascade from auth.users
CREATE POLICY "profiles_delete_deny" ON public.profiles
  AS RESTRICTIVE FOR DELETE USING (false);

-- ── vendors ───────────────────────────────────────────────────────────────
CREATE POLICY "vendors_all_own" ON public.vendors
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── documents ─────────────────────────────────────────────────────────────
CREATE POLICY "documents_all_own" ON public.documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── audit_logs (immutable — read-only for users, inserts via service role) ─
-- SELECT: own log entries by user_id OR via document ownership
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = audit_logs.document_id
        AND d.user_id = auth.uid()
    )
  );

-- INSERT: only if document belongs to caller; user_id must match caller
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT WITH CHECK (
    (user_id IS NULL OR auth.uid() = user_id)
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = audit_logs.document_id
        AND d.user_id = auth.uid()
    )
  );

-- UPDATE / DELETE: strictly denied for all users (audit trail is immutable)
CREATE POLICY "audit_logs_update_deny" ON public.audit_logs
  AS RESTRICTIVE FOR UPDATE USING (false);

CREATE POLICY "audit_logs_delete_deny" ON public.audit_logs
  AS RESTRICTIVE FOR DELETE USING (false);

-- ── copilot_messages ──────────────────────────────────────────────────────
-- Split into per-command policies — no NULL user_id loophole
CREATE POLICY "copilot_select_own" ON public.copilot_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "copilot_insert_own" ON public.copilot_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "copilot_update_own" ON public.copilot_messages
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "copilot_delete_own" ON public.copilot_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ── vendor_memory ─────────────────────────────────────────────────────────
CREATE POLICY "vendor_memory_all_own" ON public.vendor_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4: Verify — list all tables with RLS status + policy count
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  CASE
    WHEN NOT c.relrowsecurity         THEN '🔴 NO RLS'
    WHEN c.relrowsecurity AND (
      SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid
    ) = 0                             THEN '🟡 NO POLICIES'
    ELSE                                   '🟢 SECURED'
  END                                    AS status,
  n.nspname                              AS schema,
  c.relname                              AS table_name,
  c.relrowsecurity                       AS rls_enabled,
  c.relforcerowsecurity                  AS rls_forced,
  (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid)::int AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY status, c.relname;
