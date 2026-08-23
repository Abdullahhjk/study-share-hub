-- ============================================================
-- Migration 030: Notification Markdown + Version Control
-- 1. Add current_version column to notifications
-- 2. Create notification_versions audit table (simple version
--    control for audit and error resolution)
-- 3. Trigger: snapshot old title/message on every content edit
-- 4. RLS: only exact 'admin' role may DELETE notifications;
--    coadmins keep INSERT/UPDATE rights.
-- ============================================================

-- ------------------------------------------------------------
-- 1. current_version column
-- ------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

-- ------------------------------------------------------------
-- 2. notification_versions table
--    Stores superseded snapshots of a notification's content.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  user_id uuid,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, version)
);

CREATE INDEX IF NOT EXISTS idx_notification_versions_notification_id
  ON public.notification_versions USING btree (notification_id);

GRANT SELECT, INSERT ON TABLE public.notification_versions TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3. Versioning trigger
--    On UPDATE of notifications, if title/message/user_id changed,
--    snapshot the OLD content into notification_versions and bump
--    the live row's version counter.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_notification_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _edited_by uuid := auth.uid();
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN

    INSERT INTO public.notification_versions
      (notification_id, version, title, message, user_id, edited_by)
    VALUES
      (OLD.id, OLD.current_version, OLD.title, OLD.message, OLD.user_id, _edited_by);

    NEW.current_version := OLD.current_version + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_notification_version ON public.notifications;

CREATE TRIGGER trg_snapshot_notification_version
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_notification_version();

-- ------------------------------------------------------------
-- 4. RLS on notification_versions
-- ------------------------------------------------------------
ALTER TABLE public.notification_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification versions"
  ON public.notification_versions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 5. Split the broad "Admins can manage all notifications" policy:
--    coadmins must NOT be able to delete notifications.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;

-- Admins AND coadmins can update (edit) notifications.
-- (Regular users keep their own-row update policy from migration 009.)
CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ONLY exact admins can delete notifications (coadmins cannot).
CREATE POLICY "Only exact admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );
