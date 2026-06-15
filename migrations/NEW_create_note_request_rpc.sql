-- ============================================================
-- NEW: create_note_request RPC
-- SECURITY DEFINER so anon users can submit requests without
-- being blocked by RLS policies.
-- Auto-generates request_id and request_token via existing triggers.
-- Returns the full inserted row as a single object.
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
  v_result public.note_requests;
BEGIN
  INSERT INTO public.note_requests (
    student_contact,
    contact_type,
    receipt_image_url,
    total_amount,
    teacher_id,
    status
  ) VALUES (
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

REVOKE ALL ON FUNCTION public.create_note_request FROM public;
GRANT EXECUTE ON FUNCTION public.create_note_request TO anon, authenticated;
