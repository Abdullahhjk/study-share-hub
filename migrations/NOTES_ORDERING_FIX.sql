-- ============================================================
-- NOTES ORDERING FIX (the request/order system)
--
-- Fixes:
--   1. Drop broken validate_note_request_total trigger + function
--      (only works for single-note requests, breaks multi-note)
--   2. Drop old conflicting policies on note_requests and request_notes
--   3. Fix note_requests contact_type CHECK to allow 'both'
--   4. Create/replace create_note_request RPC with:
--      - Auto-generated request_id (human-readable)
--      - SECURITY DEFINER (works for anon users)
--      - Proper parameter handling
--   5. Create clean RLS policies for anon users
--   6. Grant execute on RPC to anon + authenticated
-- ============================================================

-- ============================================================
-- 1. Drop broken trigger + function
-- ============================================================
DROP TRIGGER IF EXISTS trg_validate_note_request_total ON public.request_notes;
DROP FUNCTION IF EXISTS public.validate_note_request_total();

-- ============================================================
-- 2. Drop old conflicting INSERT policies on note_requests
-- ============================================================
DROP POLICY IF EXISTS "Students can create valid note requests" ON public.note_requests;
DROP POLICY IF EXISTS "Authenticated users can create note requests" ON public.note_requests;
DROP POLICY IF EXISTS "Anyone can create note requests" ON public.note_requests;

-- ============================================================
-- 3. Fix contact_type CHECK to allow 'both'
-- ============================================================
ALTER TABLE public.note_requests DROP CONSTRAINT IF EXISTS note_requests_contact_type_check;
ALTER TABLE public.note_requests ADD CONSTRAINT note_requests_contact_type_check
  CHECK (contact_type = ANY (ARRAY['email'::text, 'phone'::text, 'both'::text]));

-- ============================================================
-- 4. Create/replace the create_note_request RPC
--    Auto-generates request_id (human-readable) so the client
--    doesn't need to provide one. SECURITY DEFINER so it works
--    for both anon and authenticated users.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_note_request(
  p_student_contact text,
  p_contact_type text,
  p_receipt_image_url text,
  p_total_amount numeric,
  p_teacher_id uuid
)
RETURNS public.note_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id text;
  v_result public.note_requests;
  v_rand_string text;
BEGIN
  -- Generate human-readable request_id: REQ_XXXXXXXX_XXXX
  v_rand_string :=
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
    || '_' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

  v_request_id := 'REQ_' || v_rand_string;

  INSERT INTO public.note_requests (
    request_id,
    student_contact,
    contact_type,
    receipt_image_url,
    total_amount,
    teacher_id,
    status
  ) VALUES (
    v_request_id,
    p_student_contact,
    p_contact_type,
    p_receipt_image_url,
    p_total_amount,
    p_teacher_id,
    'pending'
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. Create clean RLS policies on note_requests
-- ============================================================

-- Anyone (including anon) can create a note request
CREATE POLICY "Anyone can create note requests"
  ON public.note_requests FOR INSERT
  WITH CHECK (
    teacher_id IS NOT NULL
    AND total_amount >= 0
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = note_requests.teacher_id
        AND p.is_blocked = false
    )
  );

-- Teachers can view their own requests
DROP POLICY IF EXISTS "Teachers can view their own requests" ON public.note_requests;
CREATE POLICY "Teachers can view their own requests"
  ON public.note_requests FOR SELECT
  USING (auth.uid() = teacher_id);

-- Admins can view all requests
DROP POLICY IF EXISTS "Admins can view all requests" ON public.note_requests;
CREATE POLICY "Admins can view all requests"
  ON public.note_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Teachers can update their own requests
DROP POLICY IF EXISTS "Teachers can update their own requests" ON public.note_requests;
CREATE POLICY "Teachers can update their own requests"
  ON public.note_requests FOR UPDATE
  USING (auth.uid() = teacher_id);

-- ============================================================
-- 6. Create clean RLS policies on request_notes
-- ============================================================
DROP POLICY IF EXISTS "Insert notes only for matching fresh request" ON public.request_notes;
DROP POLICY IF EXISTS "Students can insert request notes" ON public.request_notes;
DROP POLICY IF EXISTS "Anyone can link notes to fresh requests" ON public.request_notes;

CREATE POLICY "Anyone can link notes to requests"
  ON public.request_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.note_requests nr
      WHERE nr.id = request_notes.request_id
        AND nr.status = 'pending'
    )
    AND EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = request_notes.note_id
        AND n.deleted_at IS NULL
    )
  );

-- ============================================================
-- 7. Grant execute on the RPC to anon + authenticated
-- ============================================================
REVOKE ALL ON FUNCTION public.create_note_request FROM public;
GRANT EXECUTE ON FUNCTION public.create_note_request TO anon, authenticated;
