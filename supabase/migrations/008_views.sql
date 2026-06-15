-- ============================================================
-- notes_public: exposes notes to anon users, hides file_url
-- for paid notes (only free notes expose the file URL)
-- ============================================================
CREATE VIEW public.notes_public WITH (security_invoker='on') AS
 SELECT id,
    title,
    description,
    preview_image_url,
    is_free,
        CASE
            WHEN is_free THEN file_url
            ELSE NULL::text
        END AS file_url,
    price,
    teacher_id,
    subcategory_id,
    school_name,
    created_at,
    updated_at,
    deleted_at
   FROM public.notes;

-- ============================================================
-- note_reports_admin: full reports view (includes reporter_email)
-- ============================================================
CREATE VIEW public.note_reports_admin WITH (security_invoker='true') AS
 SELECT id,
    note_id,
    reason,
    description,
    reporter_email,
    status,
    created_at,
    reviewed_at,
    admin_notes,
    appeal_text,
    appeal_date
   FROM public.note_reports;

-- ============================================================
-- note_reports_for_teacher: reports view (excludes reporter_email)
-- ============================================================
CREATE VIEW public.note_reports_for_teacher WITH (security_invoker='true') AS
 SELECT id,
    note_id,
    reason,
    description,
    status,
    created_at,
    reviewed_at,
    admin_notes,
    appeal_text,
    appeal_date
   FROM public.note_reports;
