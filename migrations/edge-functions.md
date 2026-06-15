# Edge Function Manifest

Each function is a Deno TypeScript module deployed via `supabase functions deploy`.
All use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars.

## admin-delete-user
- **Purpose**: Hard-delete a user from `auth.users` (cascades to public tables via FK `ON DELETE CASCADE`) + their storage objects.
- **Caller**: Authenticated admin (verified via `has_role(auth.uid(), 'admin')`)
- **Auth**: `verify_jwt: false` (validates JWT in-code with service-role client)

## admin-impersonate
- **Purpose**: Generate a one-time magic link for an admin to log in as another user (audited).
- **Caller**: Authenticated admin
- **Writes**: `public.activity_logs` entry with `category='impersonation'`

## cleanup-deleted-notes
- **Purpose**: Cron-style cleanup that removes notes soft-deleted >30 days and their orphaned storage objects.
- **Caller**: Scheduled / admin

## client-gate
- **Purpose**: Edge gateway invoked on app bootstrap. Hashes caller IP + browser fingerprint; calls `public.is_client_blocked()`. If blocked, returns 403. Otherwise calls `public.record_client_hit()` for rate-limit tracking (auto-blocks after 60 req/min).
- **Caller**: anon + authenticated

## redeem-download-code
- **Purpose**: Validates a completed `note_request.download_code`, then returns a short-lived signed URL for each requested note file in the private `notes` bucket. The only sanctioned path to fetch paid note files (`notes.file_url` SELECT is revoked from anon/auth).
- **Caller**: anon (student) — gated by the download code itself

## update-fx-rates
- **Purpose**: Scheduled function that fetches latest FX rates from an external API and upserts into `public.fx_rates`.
- **Caller**: Scheduled cron
