-- ============================================================
-- 033 — Remove objects that no code path uses any more.
--
-- Audit method: every object below had zero call sites in the app
-- (src/**, .from() / rpc() / functions.invoke() / functions/v1)
-- and zero references from any remaining DB object (policy, view,
-- trigger or function body).
--
-- Dead tables (only reachable from each other's dead functions):
--   access_codes, note_access_codes  — no UI or RPC reads them
--   blocked_clients, request_audit   — only read/written by
--                                      is_client_blocked + record_client_hit
--   CAR_PROJECT                       — zero references anywhere,
--                                      including the migration history
--
-- Dead functions (no caller in the app, no caller in the database):
--   access-code validation, client-blocking helpers, public-profile
--   directory helpers, token-based student request helpers, teacher
--   payment balance helpers, log_activity.
--
-- Dead views (app reads the base tables directly). Dropping these
-- also revokes the GRANT of note_reports_admin to anon/authenticated
-- that 010_grants.sql:41 handed out.
--
-- Deliberately kept: has_role and is_subcategory_in_use (used by RLS
-- policies in 009), create_app_bucket (reused for future buckets),
-- pgp_armor_headers (absent from the migration history, so its usage
-- could not be proven either way).
-- ============================================================

-- 1. Dead views (dropped before the tables so nothing depends on them)
DROP VIEW IF EXISTS public.note_reports_admin;
DROP VIEW IF EXISTS public.note_reports_for_teacher;
DROP VIEW IF EXISTS public.notes_public;

-- 2. Dead functions — any overload
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure::text AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'validate_access_code',
              'is_client_blocked',
              'record_client_hit',
              'list_protected_teachers',
              'list_public_profiles',
              'get_public_profile',
              'get_student_requests_by_token',
              'cancel_student_request_by_token',
              'get_teacher_outstanding_balance',
              'get_teacher_overdue_months',
              'log_activity'
          )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || r.sig;
    END LOOP;
END $$;

-- 3. Dead tables (CASCADE removes their policies and indexes)
DROP TABLE IF EXISTS public.access_codes CASCADE;
DROP TABLE IF EXISTS public.note_access_codes CASCADE;
DROP TABLE IF EXISTS public.blocked_clients CASCADE;
DROP TABLE IF EXISTS public.request_audit CASCADE;
DROP TABLE IF EXISTS public."CAR_PROJECT" CASCADE;