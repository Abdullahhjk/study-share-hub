# Security Fixes & Download Code System

## 1. Download Code System (Feature)

### Database changes

```sql
ALTER TABLE public.note_requests
  ADD COLUMN download_code TEXT UNIQUE,
  ADD COLUMN download_code_used_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN download_code_used_ip TEXT DEFAULT NULL;

CREATE SEQUENCE public.download_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_download_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_letters TEXT; v_suffix TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.download_code IS NULL THEN
    v_letters := upper(substr(md5(random()::text || clock_timestamp()::text || NEW.id::text), 1, 4));
    v_suffix := lpad((nextval('public.download_code_seq') % 100)::text, 2, '0');
    NEW.download_code := v_letters || '_' || v_suffix;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_generate_download_code
  BEFORE UPDATE ON public.note_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_download_code();
```

### Files added/edited

- **`supabase/functions/redeem-download-code/index.ts`** — edge function that validates `code` + `requestId`, returns short-lived signed URLs from the private notes path, and on `action=consume` marks the code as used (single-use).
- **`src/pages/Download.tsx`** — `/download?code=XXXX_00&requestId=REQ-...` page. Previews each note in a sandboxed iframe, then a single Download button triggers all downloads, invalidates the code, and auto-closes the tab.
- **`src/App.tsx`** — registers the `/download` route.
- **`src/components/dashboard/RequestManagement.tsx`** — teacher view shows the generated code under the status, plus "(used)" once consumed.
- **`src/pages/StudentDashboard.tsx`** — adds a ** Download Notes** button on completed orders while the code is unused, and a "Downloaded on …" badge once spent.

How it works:

1. Teacher marks request **Completed** → trigger generates `XXXX_NN` code.
2. Both teacher and student see the code on their dashboards.
3. Student clicks **Download Notes** → opens `/download?code=…&requestId=…`.
4. Edge function returns signed URLs (raw paths never exposed to the client).
5. On click of "Download All", `action=consume` is called, `download_code_used_at` is set; subsequent visits return `410 Gone`.

## 2. Security Fixes

| Finding                                                          | Fix                                                                                                                                                              | Location                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `note_reports.reporter_email` exposed to teachers                | Revoked column SELECT from `authenticated`/`anon`; admin-only access via service role and `note_reports_admin` view                                              | migration                                                                                 |
| Access codes publicly readable                                   | Dropped public SELECT; added owner+admin policy and `validate_access_code()` / `list_protected_teachers()` SECURITY DEFINER helpers                              | migration + `src/components/AccessCodeDialog.tsx` will use the function via PostgREST RPC |
| Paid note `file_url` exposed to anon                             | New `notes_public` view that nulls `file_url` for paid notes; downloads now happen exclusively through the signed-URL edge function                              | migration                                                                                 |
| `note_requests` open INSERT (spam)                               | Documented as accepted risk (students are unauthenticated by design — see Memory `student-access-pattern`); throttle planned via reCAPTCHA in a future iteration | —                                                                                         |
| `notes` storage bucket allowed any auth user to overwrite/delete | New policies require `auth.uid() = (storage.foldername(name))[1]` (the folder prefix is the teacher id, see Memory `storage-organization-pattern`)               | migration                                                                                 |
| `user_roles` had no INSERT policy                                | Added admin-only INSERT policy                                                                                                                                   | migration                                                                                 |
| `receipts` bucket public                                         | Bucket flipped to private; SELECT restricted to admins or the request's teacher; INSERT remains open so unauthenticated students can submit receipts             | migration                                                                                 |

### Full migration SQL

See `supabase/migrations/*` (latest three timestamped files contain all of the above).

### Build/runtime fixes done in passing

- Added `notes.deleted_at` column and `deleted_avatars` table referenced throughout the app but missing from the schema.
- Cast affected queries to `any` until the auto-generated `src/integrations/supabase/types.ts` refreshes.
- Fixed `UserManual.tsx` reference to a non-existent `renderAdminGuide()`.

## 3. Remaining linter warnings (non-blocking)

The migration linter still reports the standard warnings about views being visible in the GraphQL schema and the `WITH CHECK (true)` on `note_requests` INSERT. Both are intentional for the public-browsing design and are documented above.
