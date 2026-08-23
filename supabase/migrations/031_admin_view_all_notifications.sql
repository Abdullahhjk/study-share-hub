-- ============================================================
-- Migration 031: Restore admin/coadmin SELECT on all notifications
--
-- Migration 030 split the broad "Admins can manage all notifications"
-- (FOR ALL) policy into UPDATE/DELETE policies but omitted that FOR ALL
-- also granted SELECT. This restores full read visibility for
-- admins/coadmins without granting them delete rights.
-- ============================================================

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
