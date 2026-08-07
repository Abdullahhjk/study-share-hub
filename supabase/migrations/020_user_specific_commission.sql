-- ============================================================
-- Use user-specific commission from platform_settings
-- Replaces the hardcoded 15% commission in generate_monthly_payment_record
-- with each teacher's assigned platform_settings.commission
-- (via user_roles.settings_id -> platform_settings.id)
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
    v_commission_rate numeric;
    v_amount numeric;
    v_existing_id uuid;
    v_outstanding numeric;
    v_record_id uuid;
BEGIN
    SELECT ps.commission
    INTO v_commission_rate
    FROM public.user_roles ur
    JOIN public.platform_settings ps ON ps.id = ur.settings_id
    WHERE ur.user_id = p_teacher_id;

    IF v_commission_rate IS NULL THEN
        v_commission_rate := 12.0;
    END IF;

    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_completed_revenue
    FROM public.note_requests
    WHERE teacher_id = p_teacher_id
      AND status = 'completed'
      AND EXTRACT(YEAR FROM created_at) = p_year
      AND EXTRACT(MONTH FROM created_at) = p_month;

    v_amount := v_completed_revenue * (v_commission_rate / 100);

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
