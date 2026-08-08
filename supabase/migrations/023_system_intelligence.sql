-- ============================================================
-- 023 (REVERT) — Reverse the System Intelligence migration.
--
-- Drops every function 023 created, restores REPLICA IDENTITY
-- and the realtime publication, then drops the 023 tables.
-- Idempotent: safe to run even if 023 was only partially applied.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop 023 functions (any signature/overload)
-- ------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'sys_admin_check','sys_db_overview','sys_table_stats','sys_index_stats',
      'sys_storage_stats','sys_user_stats','sys_activity_stats','sys_ai_stats',
      'sys_error_stats','sys_cron_jobs','sys_top_queries','sys_inventory',
      'sys_record_snapshot','log_system_event'
    )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || r.sig;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. Restore REPLICA IDENTITY (023 set these to FULL)
-- ------------------------------------------------------------
ALTER TABLE public.activity_logs REPLICA IDENTITY DEFAULT;
ALTER TABLE public.request_audit REPLICA IDENTITY DEFAULT;
ALTER TABLE public.system_events REPLICA IDENTITY DEFAULT;

-- ------------------------------------------------------------
-- 3. Remove tables from the realtime publication
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.system_events;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

-- ------------------------------------------------------------
-- 4. Drop the tables created by 023
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.sys_snapshots;
DROP TABLE IF EXISTS public.system_events;
