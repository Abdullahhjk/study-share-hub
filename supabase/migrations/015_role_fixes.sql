-- ============================================================
-- Migration 015: Role Fixes
-- 1. Add 'coadmin' to app_role enum
-- 2. Update has_role() to recognize coadmin as admin-equivalent
-- 3. Add RLS restrictions for deleted/blocked/rejected roles
-- 4. Add admin UPDATE policy on note_requests
-- 5. Revoke has_role from anon (prevent user enumeration)
-- ============================================================

-- ============================================================
-- 1. Add 'coadmin' to app_role enum
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coadmin';

-- ============================================================
-- 2. Replace has_role() — coadmin matches admin checks
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'coadmin')
      )
  )
$$;

-- ============================================================
-- 3. RLS restrictions for deleted/blocked/rejected users
--    These profiles cannot read notes (they're locked out)
-- ============================================================

-- Blocked/deleted/rejected users cannot SELECT from notes
DROP POLICY IF EXISTS "Blocked users cannot read notes" ON public.notes;
CREATE POLICY "Blocked users cannot read notes"
  ON public.notes FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'coadmin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'pending')
      OR auth.uid() = teacher_id  -- own notes always visible
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('blocked', 'deleted', 'rejected')
    )
  );

-- Blocked/deleted/rejected users cannot UPDATE notes
DROP POLICY IF EXISTS "Blocked users cannot update notes" ON public.notes;
CREATE POLICY "Blocked users cannot update notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (
    auth.uid() = teacher_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('blocked', 'deleted', 'rejected')
    )
  );

-- ============================================================
-- 4. Add admin UPDATE policy on note_requests
--    Admins/coadmins need to mark requests completed/rejected
-- ============================================================
DROP POLICY IF EXISTS "Admins can update note_requests" ON public.note_requests;
CREATE POLICY "Admins can update note_requests"
  ON public.note_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Revoke has_role() from anon to prevent user enumeration
-- ============================================================
REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM anon;

-- ============================================================
-- Done
-- ============================================================
