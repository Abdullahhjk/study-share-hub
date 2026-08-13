-- Reset apilayer API key usage counts monthly (apilayer free plan = 100 req/month).
-- Without this, update-fx-rates permanently fails once every tracked key hits count 100.

CREATE OR REPLACE FUNCTION public.reset_apilayer_api_track_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.apilayer_api_track
    SET count = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_apilayer_api_track_counts() TO service_role;

SELECT cron.schedule(
    'reset-apilayer-api-track-counts',
    '0 0 1 * *',
    $$SELECT public.reset_apilayer_api_track_counts();$$
);
