-- ============================================================
-- 029 Teacher verification via details (document optional)
-- ============================================================
-- Teachers can now prove their teaching identity WITHOUT a document:
--   method = 'document' -> existing flow (upload a document)
--   method = 'details'  -> fill in a form describing how/where they teach
--                          (tuition center, home tuition, YouTube, etc.)
-- Most real teachers (tuition/online) don't have employment documents.

-- ------------------------------------------------------------
-- 1. Table changes
-- ------------------------------------------------------------
ALTER TABLE public.teacher_verification_requests
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'document' CHECK (method IN ('document', 'details')),
  ALTER COLUMN document_type DROP NOT NULL,
  ALTER COLUMN document_url DROP NOT NULL,
  ALTER COLUMN document_name DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS teaching_mode text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS subjects_taught text,
  ADD COLUMN IF NOT EXISTS years_experience text,
  ADD COLUMN IF NOT EXISTS details text;

-- ------------------------------------------------------------
-- 2. submit_teacher_verification supports both methods
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_teacher_verification(
  p_document_type text DEFAULT NULL,
  p_document_url text DEFAULT NULL,
  p_document_name text DEFAULT NULL,
  p_method text DEFAULT 'document',
  p_teaching_mode text DEFAULT NULL,
  p_institution_name text DEFAULT NULL,
  p_subjects_taught text DEFAULT NULL,
  p_years_experience text DEFAULT NULL,
  p_details text DEFAULT NULL
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

  IF p_method IS NULL OR p_method NOT IN ('document', 'details') THEN
    RAISE EXCEPTION 'invalid verification method';
  END IF;

  IF p_method = 'details' THEN
    IF p_details IS NULL OR length(trim(p_details)) < 20 THEN
      RAISE EXCEPTION 'please describe your teaching in at least a few sentences';
    END IF;
  ELSE
    IF p_document_type IS NULL OR p_document_url IS NULL OR p_document_url = '' THEN
      RAISE EXCEPTION 'a document is required';
    END IF;

    IF p_document_type NOT IN ('institution_id', 'appointment_letter', 'faculty_staff_id', 'teaching_license', 'employment_letter') THEN
      RAISE EXCEPTION 'invalid document type';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teacher_verification_requests
    WHERE teacher_id = v_teacher_id AND status IN ('pending_review', 'verified')
  ) INTO v_has_active;

  IF v_has_active THEN
    RAISE EXCEPTION 'you already have an active verification request';
  END IF;

  INSERT INTO public.teacher_verification_requests (
    teacher_id, document_type, document_url, document_name,
    method, teaching_mode, institution_name, subjects_taught, years_experience, details
  )
  VALUES (
    v_teacher_id,
    CASE WHEN p_method = 'document' THEN p_document_type ELSE NULL END,
    CASE WHEN p_method = 'document' THEN p_document_url ELSE NULL END,
    CASE WHEN p_method = 'document' THEN p_document_name ELSE NULL END,
    p_method, p_teaching_mode, p_institution_name, p_subjects_taught, p_years_experience, p_details
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
