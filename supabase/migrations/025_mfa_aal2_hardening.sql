-- ============================================================
-- 025 MFA (AAL2) hardening for admin write paths
-- ============================================================
-- The access-token JWT carries an `aal` claim ("aal1" after primary
-- auth, "aal2" after a TOTP factor is verified for the session).
-- GoTrue issues a NEW access token once MFA completes, so the claim
-- reflects the true session state and can never be faked client-side.
--
-- Postgres RLS can read it via auth.jwt(), so we require AAL2 on every
-- admin-role WRITE performed through the client SDK. SELECT stays open:
-- an admin who has signed in but NOT yet completed MFA must still be
-- able to load their role to be routed to the MFA prompt.
--
-- The same requirement is enforced server-side in the admin edge
-- functions (supabase/functions/_shared/authz.ts). These policies close
-- the direct-client-SDK gap that bypasses the edge functions.
-- ============================================================

-- True when the current request's JWT comes from an AAL2 session.
CREATE OR REPLACE FUNCTION public.session_at_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- ------------------------------------------------------------
-- user_roles: the privilege table itself. All admin writes now
-- require MFA in addition to the admin/coadmin role check.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'))
    AND public.session_at_aal2()
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'))
    AND public.session_at_aal2()
  );

DROP POLICY IF EXISTS "No direct inserts to user_roles" ON public.user_roles;
CREATE POLICY "No direct inserts to user_roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'))
    AND public.session_at_aal2()
  );

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coadmin'))
    AND public.session_at_aal2()
  );

-- ------------------------------------------------------------
-- Admin-only write paths (no owner/teacher overlap) — all now
-- require AAL2. Public SELECT policies remain untouched.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Admins manage banks" ON public.approved_banks;
CREATE POLICY "Admins manage banks"
  ON public.approved_banks
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins write fx rates" ON public.fx_rates;
CREATE POLICY "Admins write fx rates"
  ON public.fx_rates
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins manage blocks" ON public.blocked_clients;
CREATE POLICY "Admins manage blocks"
  ON public.blocked_clients
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins manage build reports" ON public.build_reports;
CREATE POLICY "Admins manage build reports"
  ON public.build_reports
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins manage subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins manage subscribers"
  ON public.newsletter_subscribers
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins write upcoming" ON public.upcoming_features;
CREATE POLICY "Admins write upcoming"
  ON public.upcoming_features
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins insert payment_records" ON public.payment_records;
CREATE POLICY "Admins insert payment_records"
  ON public.payment_records FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins update payment_records" ON public.payment_records;
CREATE POLICY "Admins update payment_records"
  ON public.payment_records FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());

DROP POLICY IF EXISTS "Admins delete payment_records" ON public.payment_records;
CREATE POLICY "Admins delete payment_records"
  ON public.payment_records FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') AND public.session_at_aal2());
