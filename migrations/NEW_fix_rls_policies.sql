-- ============================================================
-- NEW: Fix RLS policies for note_requests and request_notes
--
-- Problems fixed:
--   1. Multiple conflicting INSERT policies on note_requests
--      (009_rls_policies.sql + 012_fixes.sql + 20260602000001)
--   2. Multiple conflicting INSERT policies on request_notes
--      (009_rls_policies.sql + 012_fixes.sql)
--   3. Removed 10-minute window on request_notes insert —
--      once the RPC creates the row, the follow-up insert
--      happens immediately. The window adds no value and can
--      cause race conditions.
-- ============================================================

-- ============================================================
-- 1. Clean up note_requests INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Students can create valid note requests" ON public.note_requests;
DROP POLICY IF EXISTS "Authenticated users can create note requests" ON public.note_requests;
DROP POLICY IF EXISTS "Anyone can create note requests" ON public.note_requests;

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

-- ============================================================
-- 2. Clean up request_notes INSERT policies
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
-- 3. Clean up note_requests SELECT policies
-- ============================================================
DROP POLICY IF EXISTS "Teachers can view their own requests" ON public.note_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.note_requests;

CREATE POLICY "Teachers can view their own requests"
  ON public.note_requests FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all requests"
  ON public.note_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
