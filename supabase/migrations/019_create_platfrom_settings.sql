DROP TABLE IF EXISTS public.platfrom_settings;

CREATE TABLE public.platform_settings (
    id uuid PRIMARY KEY,
    commission numeric NOT NULL DEFAULT 12.0,
    code text NOT NULL DEFAULT 'PKR',
    min_price numeric NOT NULL DEFAULT 0,
    max_price numeric NOT NULL DEFAULT 100000,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only Admins have full access"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can select settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.platform_settings (id, commission, code, min_price, max_price)
VALUES ('e6759a6f-bf11-4e31-9cec-d389815c2885', 12.0, 'PKR', 0, 100000);

ALTER TABLE public.user_roles
ADD COLUMN settings_id uuid;

UPDATE public.user_roles
SET settings_id = 'e6759a6f-bf11-4e31-9cec-d389815c2885'
WHERE settings_id IS NULL;

ALTER TABLE public.user_roles
ALTER COLUMN settings_id SET NOT NULL;

ALTER TABLE public.user_roles
ALTER COLUMN settings_id SET DEFAULT 'e6759a6f-bf11-4e31-9cec-d389815c2885';

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_settings_id_fkey
FOREIGN KEY (settings_id)
REFERENCES public.platform_settings(id);

CREATE INDEX user_roles_settings_id_idx
ON public.user_roles(settings_id);