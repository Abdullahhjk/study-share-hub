-- ============================================================
-- Table: payment_records
-- Tracks monthly payments teachers owe to the platform
-- Flow: unpaid → pending (teacher submits proof) → verified (admin approves) / rejected (admin rejects)
-- ============================================================
CREATE TABLE public.payment_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    year integer NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    paid_amount numeric NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending', 'verified', 'rejected', 'partial', 'overdue')),

    -- Teacher submission
    submitted_at timestamp with time zone,
    proof_url text,
    proof_reference text,

    -- Admin verification
    verified_at timestamp with time zone,
    verified_by uuid REFERENCES public.profiles(id),
    rejection_reason text,

    -- Metadata
    payment_method text,
    reference_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT unique_teacher_month_year UNIQUE (teacher_id, month, year)
);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE TRIGGER update_payment_records_updated_at
    BEFORE UPDATE ON public.payment_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_payment_records_teacher_id ON public.payment_records(teacher_id);
CREATE INDEX idx_payment_records_status ON public.payment_records(status);
CREATE INDEX idx_payment_records_month_year ON public.payment_records(year, month);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all payment_records"
    ON public.payment_records FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Teachers read own payment_records"
    ON public.payment_records FOR SELECT
    USING (teacher_id = auth.uid());

CREATE POLICY "Teachers insert own submissions"
    ON public.payment_records FOR INSERT
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers update own submissions"
    ON public.payment_records FOR UPDATE
    USING (teacher_id = auth.uid() AND status IN ('unpaid', 'rejected'));

CREATE POLICY "Admins insert payment_records"
    ON public.payment_records FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update payment_records"
    ON public.payment_records FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete payment_records"
    ON public.payment_records FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- Function: get_teacher_outstanding_balance
-- Returns the total unpaid amount for a teacher (past + current)
-- ============================================================
CREATE FUNCTION public.get_teacher_outstanding_balance(p_teacher_id uuid)
RETURNS numeric
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount - paid_amount), 0)
  FROM public.payment_records
  WHERE teacher_id = p_teacher_id
    AND status NOT IN ('verified', 'overdue');
$$;

-- ============================================================
-- Function: generate_monthly_payment_record
-- Creates/updates a payment record for a teacher for a given month
-- based on 15% commission of their completed request revenue
-- ============================================================
CREATE FUNCTION public.generate_monthly_payment_record(
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

-- ============================================================
-- Function: submit_payment_proof
-- Teacher submits payment proof for a specific month
-- ============================================================
CREATE FUNCTION public.submit_payment_proof(
    p_teacher_id uuid,
    p_year integer,
    p_month integer,
    p_proof_url text DEFAULT NULL,
    p_proof_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_record_id uuid;
BEGIN
    SELECT id INTO v_record_id
    FROM public.payment_records
    WHERE teacher_id = p_teacher_id AND year = p_year AND month = p_month;

    IF v_record_id IS NULL THEN
        INSERT INTO public.payment_records (teacher_id, year, month, amount, status, submitted_at, proof_url, proof_reference)
        VALUES (p_teacher_id, p_year, p_month, 0, 'pending', now(), p_proof_url, p_proof_reference)
        RETURNING id INTO v_record_id;
    ELSE
        UPDATE public.payment_records
        SET status = 'pending',
            submitted_at = now(),
            proof_url = COALESCE(p_proof_url, proof_url),
            proof_reference = COALESCE(p_proof_reference, proof_reference),
            rejection_reason = NULL,
            updated_at = now()
        WHERE id = v_record_id AND status IN ('unpaid', 'rejected');
    END IF;

    RETURN v_record_id;
END;
$$;

-- ============================================================
-- Function: verify_teacher_payment
-- Admin verifies a teacher's payment submission
-- ============================================================
CREATE FUNCTION public.verify_teacher_payment(
    p_record_id uuid,
    p_verified_by uuid,
    p_paid_amount numeric DEFAULT NULL,
    p_reference_number text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_total_amount numeric;
    v_current_paid numeric;
    v_new_paid numeric;
BEGIN
    SELECT amount, paid_amount INTO v_total_amount, v_current_paid
    FROM public.payment_records
    WHERE id = p_record_id;

    v_new_paid := COALESCE(p_paid_amount, v_total_amount - v_current_paid);

    UPDATE public.payment_records
    SET paid_amount = v_current_paid + v_new_paid,
        status = CASE
            WHEN v_current_paid + v_new_paid >= v_total_amount THEN 'verified'
            ELSE 'partial'
        END,
        verified_at = now(),
        verified_by = p_verified_by,
        reference_number = COALESCE(p_reference_number, reference_number),
        notes = CASE WHEN p_notes IS NOT NULL THEN
            COALESCE(notes || E'\n', '') || p_notes
        ELSE notes END,
        updated_at = now()
    WHERE id = p_record_id;
END;
$$;

-- ============================================================
-- Function: reject_payment_proof
-- Admin rejects a teacher's payment submission
-- ============================================================
CREATE FUNCTION public.reject_payment_proof(
    p_record_id uuid,
    p_reason text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.payment_records
    SET status = 'rejected',
        rejection_reason = p_reason,
        updated_at = now()
    WHERE id = p_record_id;
END;
$$;

-- ============================================================
-- Function: get_teacher_overdue_months
-- Returns months where payment is overdue (>10 days since created)
-- ============================================================
CREATE FUNCTION public.get_teacher_overdue_months(p_teacher_id uuid)
RETURNS TABLE(
    record_id uuid,
    year integer,
    month integer,
    amount numeric,
    days_overdue integer
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
    SELECT
        id,
        pr.year,
        pr.month,
        (pr.amount - pr.paid_amount) as amount,
        EXTRACT(DAY FROM now() - pr.created_at)::integer as days_overdue
    FROM public.payment_records pr
    WHERE pr.teacher_id = p_teacher_id
      AND pr.status NOT IN ('verified', 'overdue')
      AND EXTRACT(DAY FROM now() - pr.created_at) > 10
    ORDER BY pr.year DESC, pr.month DESC;
$$;

-- ============================================================
-- ╔══════════════════════════════════════════════════════════╗
-- ║  NEW SECTION — Added on 18-Jun-2026                     ║
-- ║  Run this block separately (idempotent, safe to re-run) ║
-- ╚══════════════════════════════════════════════════════════╝
-- ============================================================
-- Changes:
--   0. ALTER TABLE to add any missing columns (safe, IF NOT EXISTS)
--   1. submit_payment_proof — SECURITY DEFINER + auth.uid() guard + allow 'pending' resubmit
--   2. verify_teacher_payment — SECURITY DEFINER + admin-only check
--   3. reject_payment_proof — SECURITY DEFINER + admin-only check
--   4. record_teacher_payment — NEW function (was missing)
--   5. RLS: teacher UPDATE policy now includes 'pending'
--   6. Storage: teacher can read own payment proof images
-- ============================================================

-- Ensure all columns exist (safe if table was created without them)
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS proof_reference text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS notes text;

-- Fix the status check constraint (older versions may not include all statuses)
ALTER TABLE public.payment_records DROP CONSTRAINT IF EXISTS payment_records_status_check;
ALTER TABLE public.payment_records ADD CONSTRAINT payment_records_status_check
    CHECK (status IN ('unpaid', 'pending', 'verified', 'rejected', 'partial', 'overdue'));

CREATE OR REPLACE FUNCTION public.submit_payment_proof(
    p_teacher_id uuid,
    p_year integer,
    p_month integer,
    p_proof_url text DEFAULT NULL,
    p_proof_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_record_id uuid;
BEGIN
    IF p_teacher_id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied: you can only submit proof for yourself';
    END IF;

    SELECT id INTO v_record_id
    FROM public.payment_records
    WHERE teacher_id = p_teacher_id AND year = p_year AND month = p_month;

    IF v_record_id IS NULL THEN
        INSERT INTO public.payment_records (teacher_id, year, month, amount, status, submitted_at, proof_url, proof_reference)
        VALUES (p_teacher_id, p_year, p_month, 0, 'pending', now(), p_proof_url, p_proof_reference)
        RETURNING id INTO v_record_id;
    ELSE
        UPDATE public.payment_records
        SET status = 'pending',
            submitted_at = now(),
            proof_url = COALESCE(p_proof_url, proof_url),
            proof_reference = COALESCE(p_proof_reference, proof_reference),
            rejection_reason = NULL,
            updated_at = now()
        WHERE id = v_record_id AND status IN ('unpaid', 'rejected', 'pending');
    END IF;

    RETURN v_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_teacher_payment(
    p_record_id uuid,
    p_verified_by uuid,
    p_paid_amount numeric DEFAULT NULL,
    p_reference_number text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_total_amount numeric;
    v_current_paid numeric;
    v_new_paid numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Permission denied: only admins can verify payments';
    END IF;

    SELECT amount, paid_amount INTO v_total_amount, v_current_paid
    FROM public.payment_records
    WHERE id = p_record_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;

    v_new_paid := COALESCE(p_paid_amount, v_total_amount - v_current_paid);

    UPDATE public.payment_records
    SET paid_amount = v_current_paid + v_new_paid,
        status = CASE
            WHEN v_current_paid + v_new_paid >= v_total_amount THEN 'verified'
            ELSE 'partial'
        END,
        verified_at = now(),
        verified_by = p_verified_by,
        reference_number = COALESCE(p_reference_number, reference_number),
        notes = CASE WHEN p_notes IS NOT NULL THEN
            COALESCE(notes || E'\n', '') || p_notes
        ELSE notes END,
        updated_at = now()
    WHERE id = p_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_proof(
    p_record_id uuid,
    p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Permission denied: only admins can reject payments';
    END IF;

    UPDATE public.payment_records
    SET status = 'rejected',
        rejection_reason = p_reason,
        updated_at = now()
    WHERE id = p_record_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_teacher_payment(
    p_teacher_id uuid,
    p_year integer,
    p_month integer,
    p_amount numeric,
    p_method text DEFAULT NULL,
    p_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_record_id uuid;
    v_existing_amount numeric;
    v_existing_paid numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Permission denied: only admins can record payments';
    END IF;

    SELECT id, amount, paid_amount INTO v_record_id, v_existing_amount, v_existing_paid
    FROM public.payment_records
    WHERE teacher_id = p_teacher_id AND year = p_year AND month = p_month;

    IF v_record_id IS NULL THEN
        INSERT INTO public.payment_records (teacher_id, year, month, amount, paid_amount, status, payment_method, reference_number, notes, verified_at, verified_by)
        VALUES (p_teacher_id, p_year, p_month, p_amount, p_amount, 'verified', p_method, p_reference, p_notes, now(), auth.uid())
        RETURNING id INTO v_record_id;
    ELSE
        UPDATE public.payment_records
        SET paid_amount = v_existing_paid + p_amount,
            status = CASE
                WHEN v_existing_paid + p_amount >= v_existing_amount THEN 'verified'
                ELSE 'partial'
            END,
            payment_method = COALESCE(p_method, payment_method),
            reference_number = COALESCE(p_reference, reference_number),
            notes = CASE WHEN p_notes IS NOT NULL THEN
                COALESCE(notes || E'\n', '') || p_notes
            ELSE notes END,
            verified_at = now(),
            verified_by = auth.uid(),
            updated_at = now()
        WHERE id = v_record_id;
    END IF;

    RETURN v_record_id;
END;
$$;

DROP POLICY IF EXISTS "Teachers update own submissions" ON public.payment_records;
CREATE POLICY "Teachers update own submissions"
    ON public.payment_records FOR UPDATE
    USING (teacher_id = auth.uid() AND status IN ('unpaid', 'rejected', 'pending'));

DROP POLICY IF EXISTS "Teachers can view own payment proof images" ON storage.objects;
CREATE POLICY "Teachers can view own payment proof images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================
-- payment_credentials table — editable payment methods shown to teachers
-- Admins manage these via the app; teachers read active ones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('easypaisa', 'jazzcash', 'bank', 'other')),
    account_number text,
    account_holder text,
    bank_name text,
    iban text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment_credentials"
    ON public.payment_credentials FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers read active payment_credentials"
    ON public.payment_credentials FOR SELECT
    USING (is_active = true);

GRANT SELECT ON public.payment_credentials TO authenticated;
GRANT ALL ON public.payment_credentials TO service_role;

-- ============================================================
-- purged_at column for notes — "Delete Forever" sets this instead
-- of hard-deleting. Items stay in DB for 15-day retention.
-- ============================================================
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS purged_at timestamp with time zone;

-- ═══════════════════════════════════════════════════════════
-- END of new section
-- ═══════════════════════════════════════════════════════════
