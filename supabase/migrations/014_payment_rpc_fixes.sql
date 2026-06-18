-- ============================================================
-- Migration: 014_payment_rpc_fixes
-- 
-- 1. Add SECURITY DEFINER to payment RPCs with explicit auth checks
-- 2. Allow teacher resubmission on 'pending' status
-- 3. Create missing record_teacher_payment RPC
-- ============================================================

-- ============================================================
-- Fix 1: submit_payment_proof
-- - SECURITY DEFINER (bypass RLS, use explicit auth.uid() check)
-- - Allow UPDATE on pending status too (fix double-click issue)
-- ============================================================
DROP FUNCTION IF EXISTS public.submit_payment_proof(uuid, integer, integer, text, text);

CREATE FUNCTION public.submit_payment_proof(
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

-- ============================================================
-- Fix 2: verify_teacher_payment
-- - SECURITY DEFINER + admin-only check
-- ============================================================
DROP FUNCTION IF EXISTS public.verify_teacher_payment(uuid, uuid, numeric, text, text);

CREATE FUNCTION public.verify_teacher_payment(
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

-- ============================================================
-- Fix 3: reject_payment_proof
-- - SECURITY DEFINER + admin-only check
-- ============================================================
DROP FUNCTION IF EXISTS public.reject_payment_proof(uuid, text);

CREATE FUNCTION public.reject_payment_proof(
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

-- ============================================================
-- Fix 4: record_teacher_payment (missing RPC — called by admin UI)
-- Admin directly records a payment for a teacher
-- ============================================================
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

-- ============================================================
-- Update RLS: allow teachers to update 'pending' records too
-- (so direct table access matches what the RPC allows)
-- ============================================================
DROP POLICY IF EXISTS "Teachers update own submissions" ON public.payment_records;

CREATE POLICY "Teachers update own submissions"
    ON public.payment_records FOR UPDATE
    USING (teacher_id = auth.uid() AND status IN ('unpaid', 'rejected', 'pending'));
