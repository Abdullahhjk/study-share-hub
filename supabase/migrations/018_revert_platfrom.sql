-- ============================================================
-- Migration 018: revert platform_settings
--
-- Reverts the platform_settings feature:
--   1. Drops the platform_settings table (and its RLS policies)
--   2. Restores generate_monthly_payment_record to the original
--      hardcoded 15% commission implementation
-- ============================================================

-- ============================================================
-- 1. Drop table (CASCADE also removes its RLS policies)
-- ============================================================
DROP TABLE IF EXISTS public.platform_settings CASCADE;

-- ============================================================
-- 2. Restore original monthly payment function (15% commission)
--    Grants on this function survive CREATE OR REPLACE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_payment_record(
    p_teacher_id uuid,
    p_year integer,
    p_month integer
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_completed_revenue numeric;
    v_commission_rate numeric := 0.15;
    v_amount numeric;
    v_existing_id uuid;
    v_outstanding numeric;
    v_record_id uuid;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_completed_revenue
    FROM public.note_requests
    WHERE teacher_id = p_teacher_id
      AND status = 'completed'
      AND EXTRACT(YEAR FROM created_at) = p_year
      AND EXTRACT(MONTH FROM created_at) = p_month;

    v_amount := v_completed_revenue * v_commission_rate;

    SELECT COALESCE(SUM(amount - paid_amount), 0)
    INTO v_outstanding
    FROM public.payment_records
    WHERE teacher_id = p_teacher_id
      AND status NOT IN ('verified', 'overdue')
      AND (year < p_year OR (year = p_year AND month < p_month));

    v_amount := v_amount + GREATEST(v_outstanding, 0);

    SELECT id INTO v_existing_id
    FROM public.payment_records
    WHERE teacher_id = p_teacher_id
      AND year = p_year
      AND month = p_month;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.payment_records
        SET amount = v_amount,
            updated_at = now()
        WHERE id = v_existing_id;
        v_record_id := v_existing_id;
    ELSE
        INSERT INTO public.payment_records (teacher_id, year, month, amount)
        VALUES (p_teacher_id, p_year, p_month, v_amount)
        RETURNING id INTO v_record_id;
    END IF;

    RETURN v_record_id;
END;
$$;
