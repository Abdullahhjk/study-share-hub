-- ============================================================
-- 021 Teacher Verification
-- ============================================================
-- Teacher identity verification: teachers submit one accepted
-- document, admins/coadmins review, verified teachers get a badge
-- on their public profile / note cards.
-- Statuses: pending_review -> verified | rejected
--           verified -> expired (on renewal / re-submission)

-- ------------------------------------------------------------
-- 1. profiles: denormalized badge state (drives public reads)
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- ------------------------------------------------------------
-- 2. Verification request log (append-only per submission)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'institution_id',
    'appointment_letter',
    'faculty_staff_id',
    'teaching_license',
    'employment_letter'
  )),
  document_url text NOT NULL,
  document_name text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'verified',
    'rejected',
    'expired'
  )),
  review_feedback text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- At most one active request (pending or verified) per teacher
CREATE UNIQUE INDEX IF NOT EXISTS teacher_verif_one_active_idx
  ON public.teacher_verification_requests (teacher_id)
  WHERE status IN ('pending_review', 'verified');

CREATE INDEX IF NOT EXISTS teacher_verif_status_idx
  ON public.teacher_verification_requests (status);

CREATE INDEX IF NOT EXISTS teacher_verif_status_created_idx
  ON public.teacher_verification_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS teacher_verif_teacher_idx
  ON public.teacher_verification_requests (teacher_id);

ALTER TABLE public.teacher_verification_requests ENABLE ROW LEVEL SECURITY;

-- Teachers submit their own pending request (pending + approved teachers
-- may apply; verification is part of onboarding)
DROP POLICY IF EXISTS "Teachers submit own verification request"
  ON public.teacher_verification_requests;
CREATE POLICY "Teachers submit own verification request"
  ON public.teacher_verification_requests FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND status = 'pending_review'
    AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'pending'))
  );

-- Teachers view their own requests
DROP POLICY IF EXISTS "Teachers view own verification requests"
  ON public.teacher_verification_requests;
CREATE POLICY "Teachers view own verification requests"
  ON public.teacher_verification_requests FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- Admins/coadmins view and review all requests
DROP POLICY IF EXISTS "Admins view all verification requests"
  ON public.teacher_verification_requests;
CREATE POLICY "Admins view all verification requests"
  ON public.teacher_verification_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'));

DROP POLICY IF EXISTS "Admins review verification requests"
  ON public.teacher_verification_requests;
CREATE POLICY "Admins review verification requests"
  ON public.teacher_verification_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'));

-- ------------------------------------------------------------
-- 3. RPCs
-- ------------------------------------------------------------

-- Submit a verification request (teacher only, one active at a time)
CREATE OR REPLACE FUNCTION public.submit_teacher_verification(
  p_document_type text,
  p_document_url text,
  p_document_name text DEFAULT NULL
) RETURNS public.teacher_verification_requests
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_has_active boolean;
  v_row public.teacher_verification_requests;
BEGIN
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT (public.has_role(v_teacher_id, 'teacher') OR public.has_role(v_teacher_id, 'pending')) THEN
    RAISE EXCEPTION 'verification is only available to pending or approved teachers';
  END IF;

  IF p_document_type NOT IN ('institution_id', 'appointment_letter', 'faculty_staff_id', 'teaching_license', 'employment_letter') THEN
    RAISE EXCEPTION 'invalid document type';
  END IF;

  IF p_document_url IS NULL OR p_document_url = '' THEN
    RAISE EXCEPTION 'a document is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teacher_verification_requests
    WHERE teacher_id = v_teacher_id AND status IN ('pending_review', 'verified')
  ) INTO v_has_active;

  IF v_has_active THEN
    RAISE EXCEPTION 'you already have an active verification request';
  END IF;

  INSERT INTO public.teacher_verification_requests (teacher_id, document_type, document_url, document_name)
  VALUES (v_teacher_id, p_document_type, p_document_url, p_document_name)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Review a pending request (admin/coadmin only)
CREATE OR REPLACE FUNCTION public.review_teacher_verification(
  p_request_id uuid,
  p_approve boolean,
  p_feedback text DEFAULT NULL
) RETURNS public.teacher_verification_requests
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_row public.teacher_verification_requests;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin')) THEN
    RAISE EXCEPTION 'only admins can review verification requests';
  END IF;

  SELECT * INTO v_row
  FROM public.teacher_verification_requests
  WHERE id = p_request_id AND status = 'pending_review';

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'request not found or already reviewed';
  END IF;

  IF p_approve THEN
    -- Expire any previous verified badge so renewal keeps history
    UPDATE public.teacher_verification_requests
       SET status = 'expired', updated_at = now()
     WHERE teacher_id = v_row.teacher_id
       AND status = 'verified'
       AND id <> p_request_id;

    UPDATE public.profiles
       SET is_verified = true, verified_at = now()
     WHERE id = v_row.teacher_id;

    UPDATE public.teacher_verification_requests
       SET status = 'verified', reviewed_by = auth.uid(),
           reviewed_at = now(), review_feedback = p_feedback, updated_at = now()
     WHERE id = p_request_id
     RETURNING * INTO v_row;
  ELSE
    UPDATE public.teacher_verification_requests
       SET status = 'rejected', reviewed_by = auth.uid(),
           reviewed_at = now(), review_feedback = p_feedback, updated_at = now()
     WHERE id = p_request_id
     RETURNING * INTO v_row;

    UPDATE public.profiles
       SET is_verified = false
     WHERE id = v_row.teacher_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Expire a verified badge (admin/coadmin only, enables re-submission)
CREATE OR REPLACE FUNCTION public.expire_teacher_verification(
  p_request_id uuid
) RETURNS public.teacher_verification_requests
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_row public.teacher_verification_requests;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin')) THEN
    RAISE EXCEPTION 'only admins can expire verification requests';
  END IF;

  SELECT * INTO v_row
  FROM public.teacher_verification_requests
  WHERE id = p_request_id AND status = 'verified';

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'request not found or not verified';
  END IF;

  UPDATE public.teacher_verification_requests
     SET status = 'expired', reviewed_by = auth.uid(),
         reviewed_at = now(), updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_row;

  UPDATE public.profiles
     SET is_verified = false
   WHERE id = v_row.teacher_id;

  RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 4. Public profile now exposes the verified badge
-- ------------------------------------------------------------
-- Return types changed (is_verified added), so drop first.
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_public_profile(_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, school_name text, is_verified boolean)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT id, full_name, avatar_url, school_name, is_verified
  FROM public.profiles WHERE id = _id;
$$;

DROP FUNCTION IF EXISTS public.list_public_profiles();
CREATE OR REPLACE FUNCTION public.list_public_profiles()
RETURNS TABLE(id uuid, full_name text, avatar_url text, school_name text, is_verified boolean)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT id, full_name, avatar_url, school_name, is_verified
  FROM public.profiles;
$$;

-- ------------------------------------------------------------
-- 5. Storage: private "verification-documents" bucket
-- ------------------------------------------------------------
SELECT public.create_app_bucket('verification-documents', false);

-- Teachers upload into their own folder: verification-documents/<uid>/...
DROP POLICY IF EXISTS "Teachers upload own verification documents" ON storage.objects;
CREATE POLICY "Teachers upload own verification documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Teachers view own verification documents" ON storage.objects;
CREATE POLICY "Teachers view own verification documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins view verification documents" ON storage.objects;
CREATE POLICY "Admins view verification documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'))
  );

DROP POLICY IF EXISTS "Teachers delete own verification documents" ON storage.objects;
CREATE POLICY "Teachers delete own verification documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
