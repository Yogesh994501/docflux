-- ═══════════════════════════════════════════════════════════════════════════
-- DocFlux — RLS Diagnostic Audit Query
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard → SQL Editor.
-- Detects tables where Row Level Security (RLS) has NOT been enabled
-- on schemas exposed to PostgREST (public, storage, etc.)
-- ═══════════════════════════════════════════════════════════════════════════


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  1. TABLES MISSING RLS (CRITICAL)                                       │
-- │  Lists every table in PostgREST-exposed schemas that does NOT have      │
-- │  row_security enabled — these are fully open to any authenticated       │
-- │  (or anon) API caller.                                                  │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
    '🔴 MISSING RLS'        AS severity,
    schemaname              AS schema,
    tablename               AS table_name,
    tableowner              AS owner,
    rowsecurity             AS rls_enabled
FROM pg_tables
WHERE schemaname IN ('public', 'storage')          -- schemas exposed to PostgREST
  AND rowsecurity = false
ORDER BY schemaname, tablename;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  2. TABLES WITH RLS ENABLED BUT ZERO POLICIES (HIGH RISK)              │
-- │  RLS is on, but no policies exist → all access is implicitly DENIED    │
-- │  (safe, but likely a misconfiguration — nothing can be read/written).  │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
    '🟡 RLS ON / NO POLICIES' AS severity,
    n.nspname                 AS schema,
    c.relname                 AS table_name,
    c.relrowsecurity          AS rls_enabled,
    0                         AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind = 'r'                               -- ordinary tables only
  AND c.relrowsecurity = true
  AND NOT EXISTS (
      SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
  )
ORDER BY n.nspname, c.relname;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  3. FULL RLS STATUS DASHBOARD                                           │
-- │  Every table in exposed schemas with its RLS status + policy count.     │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
    CASE
        WHEN NOT c.relrowsecurity                    THEN '🔴 NO RLS'
        WHEN c.relrowsecurity AND pol_count = 0      THEN '🟡 NO POLICIES'
        ELSE '🟢 SECURED'
    END                       AS status,
    n.nspname                 AS schema,
    c.relname                 AS table_name,
    c.relrowsecurity          AS rls_enabled,
    c.relforcerowsecurity     AS rls_forced,         -- true = even table owner is subject to RLS
    COALESCE(pol_count, 0)    AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS pol_count
    FROM pg_policy p
    WHERE p.polrelid = c.oid
) policies ON true
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind = 'r'
ORDER BY
    CASE WHEN NOT c.relrowsecurity THEN 0            -- critical first
         WHEN pol_count = 0        THEN 1
         ELSE 2
    END,
    n.nspname, c.relname;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  4. DETAILED POLICY INVENTORY                                           │
-- │  Lists every RLS policy: which table, command, roles, and the           │
-- │  USING / WITH CHECK expressions so you can audit the logic.             │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
    n.nspname                                        AS schema,
    c.relname                                        AS table_name,
    p.polname                                        AS policy_name,
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END                                              AS command,
    CASE p.polpermissive
        WHEN true  THEN 'PERMISSIVE'
        WHEN false THEN 'RESTRICTIVE'
    END                                              AS policy_type,
    ARRAY(
        SELECT rolname FROM pg_roles
        WHERE oid = ANY(p.polroles)
    )                                                AS applies_to_roles,
    pg_get_expr(p.polqual,  p.polrelid, true)        AS using_expr,
    pg_get_expr(p.polwithcheck, p.polrelid, true)    AS with_check_expr
FROM pg_policy p
JOIN pg_class     c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname, p.polname;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  5. PERMISSIVE POLICY WARNINGS                                          │
-- │  Flags tables that ONLY have permissive policies (no restrictive ones). │
-- │  Multiple permissive policies are OR'd — could be overly broad.         │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
    '⚠️  ALL-PERMISSIVE'     AS warning,
    n.nspname                AS schema,
    c.relname                AS table_name,
    COUNT(*)                 AS permissive_policy_count
FROM pg_policy p
JOIN pg_class     c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND p.polpermissive = true
GROUP BY n.nspname, c.relname
HAVING NOT EXISTS (
    SELECT 1 FROM pg_policy p2
    WHERE p2.polrelid = c.oid AND p2.polpermissive = false
)
ORDER BY n.nspname, c.relname;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  6. FORCE-RLS CHECK                                                     │
-- │  Tables where relforcerowsecurity is FALSE — meaning the table OWNER   │
-- │  (and superusers) bypass all RLS policies. If your service_role key     │
-- │  connects as the table owner, this is expected. But flag it anyway.     │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
    'ℹ️  OWNER BYPASSES RLS'  AS info,
    n.nspname                 AS schema,
    c.relname                 AS table_name,
    c.relrowsecurity          AS rls_enabled,
    c.relforcerowsecurity     AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND c.relforcerowsecurity = false
ORDER BY n.nspname, c.relname;
