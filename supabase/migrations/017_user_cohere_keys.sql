-- Add cohere_api_keys JSONB column to user_settings
-- Each user can store multiple Cohere API keys with usage tracking
-- Format: [{ "key": "...", "label": "...", "request_count": 0, "created_at": "..." }]

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS cohere_api_keys jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Function to increment a user's Cohere API key request count
CREATE OR REPLACE FUNCTION public.increment_user_cohere_key(
  p_key_label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
  keys jsonb;
  key_obj jsonb;
  current_count int;
  idx int;
  found_index int := -1;
BEGIN
  SELECT cohere_api_keys INTO keys
  FROM public.user_settings
  WHERE user_id = uid;

  IF keys IS NULL THEN
    RETURN jsonb_build_object('error', 'No keys found');
  END IF;

  FOR idx IN 0..jsonb_array_length(keys) - 1 LOOP
    key_obj := keys -> idx;
    IF (key_obj ->> 'label') = p_key_label THEN
      found_index := idx;
      EXIT;
    END IF;
  END LOOP;

  IF found_index = -1 THEN
    RETURN jsonb_build_object('error', 'Key label not found');
  END IF;

  key_obj := keys -> found_index;
  current_count := (key_obj ->> 'request_count')::int;
  IF current_count >= 1000 THEN
    RETURN jsonb_build_object('error', 'Key monthly limit reached', 'rate_limited', true);
  END IF;

  key_obj := jsonb_set(key_obj, '{request_count}', to_jsonb(current_count + 1));
  keys := jsonb_set(keys, ARRAY[found_index::text], key_obj);

  UPDATE public.user_settings
  SET cohere_api_keys = keys, updated_at = now()
  WHERE user_id = uid;

  RETURN jsonb_build_object(
    'success', true,
    'new_count', current_count + 1,
    'remaining', 1000 - current_count - 1
  );
END;
$$;

-- Function to reset all users' Cohere key counts (monthly cron)
CREATE OR REPLACE FUNCTION public.reset_user_cohere_key_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_settings
  SET cohere_api_keys = (
    SELECT jsonb_agg(
      jsonb_set(key_obj, '{request_count}', to_jsonb(0))
    )
    FROM jsonb_array_elements(cohere_api_keys) AS key_obj
  ),
  updated_at = now()
  WHERE cohere_api_keys != '[]'::jsonb;
END;
$$;

-- RLS policies: users can only read/write their own settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then create new ones
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all settings (for CohereQuotaTab etc.)
CREATE POLICY "Admins can view all settings"
  ON public.user_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Grant execute on the new functions
GRANT EXECUTE ON FUNCTION public.increment_user_cohere_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_cohere_key_counts() TO service_role;

-- Schedule monthly reset of user key counts (1st of each month at 00:05 UTC)
SELECT cron.schedule(
  'reset-user-cohere-key-counts',
  '5 0 1 * *',
  $$SELECT public.reset_user_cohere_key_counts()$$
);
