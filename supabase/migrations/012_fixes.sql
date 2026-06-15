-- ============================================================
-- Migration 012: Fixes & Corrections
--
-- 1. Add 'rejected' to app_role ENUM (documented but missing)
-- 2. Fix note_requests.status CHECK to include 'cancelled'
-- 3. Drop broken note_requests INSERT POLICY (request_token IS NULL
--    conflicts with BEFORE INSERT trigger)
-- 4. Restrict anon SELECT on notes to free notes only (paid note
--    file_url must not leak)
-- 5. Add anon INSERT policy for request_notes (broken flow)
-- 6. Add status CHECK constraint to note_reports
-- 7. Add log_activity RPC used by edge functions
-- ============================================================

-- ============================================================
-- 1. Add 'rejected' role (documented in README, auto-delete 7d)
-- ============================================================
-- ALTER TYPE cannot add value inside a transaction block on older PG,
-- but Supabase PG 15+ supports this safely.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rejected';

-- ============================================================
-- 2. Fix note_requests status CHECK — allow 'cancelled'
-- ============================================================
ALTER TABLE public.note_requests DROP CONSTRAINT IF EXISTS note_requests_status_check;
ALTER TABLE public.note_requests ADD CONSTRAINT note_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'verified'::text,
    'completed'::text,
    'rejected'::text,
    'refunded'::text,
    'cancelled'::text
  ]));

-- ============================================================
-- 3. Fix note_requests INSERT policy
--    The old policy required request_token IS NULL, but the
--    BEFORE INSERT trigger ensure_note_request_token() sets it,
--    causing WITH CHECK to always reject the row.
-- ============================================================
DROP POLICY IF EXISTS "Students can create valid note requests" ON public.note_requests;

CREATE POLICY "Students can create valid note requests"
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
-- 4. Restrict anon SELECT on notes
--    Free notes are world-readable. Paid notes require auth
--    (file_url is sensitive). The notes_public view still gates
--    the file_url column, but the table itself must not leak it.
-- ============================================================
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON public.notes;

CREATE POLICY "Notes are viewable by everyone"
  ON public.notes FOR SELECT
  USING (
    is_free = true
    OR auth.uid() IS NOT NULL
  );

-- ============================================================
-- 5. Add anon INSERT policy for request_notes
--    Students submitting a request need to link notes to it.
--    The existing policy required auth.uid() which anon lacks.
-- ============================================================
CREATE POLICY "Students can insert request notes"
  ON public.request_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.note_requests nr
      WHERE nr.id = request_notes.request_id
        AND nr.status = 'pending'
        AND nr.created_at > now() - INTERVAL '10 minutes'
    )
    AND EXISTS (
      SELECT 1
      FROM public.notes n
      WHERE n.id = request_notes.note_id
        AND n.deleted_at IS NULL
    )
  );

-- ============================================================
-- 6. Add status CHECK constraint to note_reports
-- ============================================================
ALTER TABLE public.note_reports DROP CONSTRAINT IF EXISTS note_reports_status_check;
ALTER TABLE public.note_reports ADD CONSTRAINT note_reports_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'resolved'::text,
    'dismissed'::text
  ]));

-- ============================================================
-- 7. Add log_activity RPC (used by admin-delete-user and
--    admin-impersonate edge functions — was missing)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id uuid,
  p_action text,
  p_category text DEFAULT 'general'::text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, category, details, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_category, p_details, p_ip_address, p_user_agent);
END;
$$;

-- ============================================================
-- Create bucket creation helper RPC (for idempotent setup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_app_bucket(bucket_name text, is_public boolean DEFAULT false)
RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'storage'
AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, avif_autodetection)
  VALUES (bucket_name, bucket_name, is_public, false)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

