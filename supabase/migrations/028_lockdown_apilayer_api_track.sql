-- Lock down apilayer_api_track so only admins can read or modify it.
-- Coadmins and regular users are denied at the DB layer (RLS).
-- The edge function update-fx-rates uses the service role, which bypasses RLS,
-- so the scheduled refresh and force-refresh keep working.

-- 1. Drop any pre-existing policies on the table (created ad-hoc before).
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'apilayer_api_track'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.apilayer_api_track', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is on.
ALTER TABLE public.apilayer_api_track ENABLE ROW LEVEL SECURITY;

-- 3. Anon must never touch this table.
REVOKE ALL ON public.apilayer_api_track FROM anon;

-- 4. Admin-only policies.
CREATE POLICY "Admins read apilayer_api_track"
    ON public.apilayer_api_track
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert apilayer_api_track"
    ON public.apilayer_api_track
    FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update apilayer_api_track"
    ON public.apilayer_api_track
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete apilayer_api_track"
    ON public.apilayer_api_track
    FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
