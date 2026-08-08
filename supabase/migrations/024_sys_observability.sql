-- ============================================================
-- 024 (REVERT) — Reverse the System Observatory migration.
--
-- Drops every function 024 created, removes the telemetry table
-- from the realtime publication, then drops the 024 tables.
-- Idempotent: safe to run even if 024 was only partially applied.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop 024 functions (any signature/overload)
-- ------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'sys_record_snapshot','sys_activity_analytics','sys_user_analytics',
      'sys_query_stats','sys_db_performance','sys_storage_analytics',
      'sys_error_analytics','sys_ai_analytics','sys_function_analytics',
      'sys_security_overview','sys_timeline','sys_cron_overview','safe_uid'
    )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || r.sig;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. Remove the telemetry table from the realtime publication
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.edge_function_invocations;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

-- ------------------------------------------------------------
-- 3. Drop the tables created by 024
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.edge_function_invocations;
DROP TABLE IF EXISTS public.sys_db_snapshots;
DROP TABLE IF EXISTS public.sys_table_snapshots;
