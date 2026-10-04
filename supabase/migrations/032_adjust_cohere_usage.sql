-- Admin override for ARCHON Cohere usage counters (Key Utilization dialog).
-- Applies one signed delta to a single cohere_api_keys row AND to the matching
-- cohere_daily_quota row, atomically.
--
-- Rules (reject, never silently clamp):
--   - cohere_api_keys.request_count must land in 1..1000
--     (0 is rejected on purpose: a 0 row is treated as "Unused" by the admin UI)
--   - cohere_daily_quota.request_count must land in 0..130 (the daily cap the
--     cohere-agent edge function enforces in consumeDailyQuota)
--
-- cohere_daily_quota is created at runtime by the cohere-agent edge function
-- (raw SQL, not a migration), so create it here if the function has never run.
-- This function is SECURITY DEFINER so it is unaffected by that table's RLS.

CREATE TABLE IF NOT EXISTS public.cohere_daily_quota (
    quota_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    request_count INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.adjust_cohere_usage(
    p_key_uuid uuid,
    p_delta integer,
    p_quota_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    key_name text,
    key_before integer,
    key_after integer,
    daily_before integer,
    daily_after integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_key_name text;
    v_key_before integer;
    v_key_after integer;
    v_daily_before integer;
    v_daily_after integer;
BEGIN
    IF p_delta IS NULL OR p_delta = 0 THEN
        RAISE EXCEPTION 'Enter a non-zero whole number of requests.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Admin role required.'
            USING ERRCODE = '42501';
    END IF;

    SELECT k.api_key_name, k.request_count
      INTO v_key_name, v_key_before
      FROM public.cohere_api_keys k
     WHERE k.uuid = p_key_uuid
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Key not found.'
            USING ERRCODE = 'P0002';
    END IF;

    v_key_after := v_key_before + p_delta;

    IF v_key_after > 1000 THEN
        RAISE EXCEPTION
            'Too many requests: % + % = % would pass the 1,000 limit for %. Maximum is +%.',
            v_key_before, p_delta, v_key_after, v_key_name, 1000 - v_key_before
            USING ERRCODE = '22023';
    END IF;

    IF v_key_after < 1 THEN
        RAISE EXCEPTION
            'Too few requests: % + % = % would drop % below 1. Minimum is -%.',
            v_key_before, p_delta, v_key_after, v_key_name, v_key_before - 1
            USING ERRCODE = '22023';
    END IF;

    SELECT q.request_count
      INTO v_daily_before
      FROM public.cohere_daily_quota q
     WHERE q.quota_date = p_quota_date
     FOR UPDATE;

    v_daily_before := COALESCE(v_daily_before, 0);
    v_daily_after := v_daily_before + p_delta;

    IF v_daily_after < 0 THEN
        RAISE EXCEPTION
            'Too few requests: today''s usage is %, so % is not allowed (minimum is -%).',
            v_daily_before, p_delta, v_daily_before
            USING ERRCODE = '22023';
    END IF;

    IF v_daily_after > 130 THEN
        RAISE EXCEPTION
            'Too many requests: today''s usage is %, so % would pass the daily limit of 130 (maximum is +%).',
            v_daily_before, p_delta, 130 - v_daily_before
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.cohere_api_keys
       SET request_count = v_key_after
     WHERE uuid = p_key_uuid;

    INSERT INTO public.cohere_daily_quota (quota_date, request_count)
    VALUES (p_quota_date, v_daily_after)
    ON CONFLICT (quota_date)
    DO UPDATE SET request_count = EXCLUDED.request_count;

    INSERT INTO public.activity_logs (user_id, action, category, details)
    VALUES (
        v_uid,
        'cohere_usage_adjusted',
        'admin',
        jsonb_build_object(
            'key_uuid', p_key_uuid,
            'key_name', v_key_name,
            'delta', p_delta,
            'key_before', v_key_before,
            'key_after', v_key_after,
            'quota_date', p_quota_date,
            'daily_before', v_daily_before,
            'daily_after', v_daily_after
        )
    );

    RETURN QUERY SELECT v_key_name, v_key_before, v_key_after, v_daily_before, v_daily_after;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_cohere_usage(uuid, integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_cohere_usage(uuid, integer, date) TO authenticated;