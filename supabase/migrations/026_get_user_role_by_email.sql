-- ============================================================
-- Role lookup by email (used by the magic-link login flow)
-- ============================================================
-- user_roles has no `email` column; the client cannot join to
-- auth.users under RLS. This security-definer lookup lets the
-- anonymous magic-link page check whether an account is blocked /
-- deleted / rejected before sending a link.
CREATE OR REPLACE FUNCTION public.get_user_role_by_email(p_email text)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.role
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1
$$;
