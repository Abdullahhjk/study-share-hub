-- ============================================================
-- Storage Buckets (declared via Supabase API, listed for reference)
-- ============================================================
-- avatars : public  = true   (profile pictures, world-readable)
-- receipts: public  = false  (payment receipt uploads, gated)
-- notes   : public  = false  (paid note files, gated via edge function)

-- NOTE: Buckets must be created via the Supabase Dashboard or
-- Management API — raw INSERT into storage.buckets is not supported.

-- ============================================================
-- storage.objects RLS Policies
-- ============================================================

-- Avatars: world-readable, owner-writable
CREATE POLICY "Users can view all avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Receipts: anyone can upload, only admin/teacher can read
CREATE POLICY "Anyone can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Admins and request teacher can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.note_requests nr
        WHERE nr.teacher_id = auth.uid()
          AND (nr.receipt_image_url LIKE '%' || storage.objects.name
            OR nr.refund_screenshot_url LIKE '%' || storage.objects.name)
      )
    )
  );

-- Notes: teacher-owned, reads brokered by edge function
CREATE POLICY "Teachers can upload own note files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Teachers can update own note files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Teachers can delete own note files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
