-- ============================================================
-- Primary Keys
-- ============================================================
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.note_access_codes
    ADD CONSTRAINT note_access_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.note_requests
    ADD CONSTRAINT note_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.note_reports
    ADD CONSTRAINT note_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.approved_banks
    ADD CONSTRAINT approved_banks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bank_creds
    ADD CONSTRAINT bank_creds_pkey PRIMARY KEY (bank_id);

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.blocked_clients
    ADD CONSTRAINT blocked_clients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.request_audit
    ADD CONSTRAINT request_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.build_reports
    ADD CONSTRAINT build_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.deleted_avatars
    ADD CONSTRAINT deleted_avatars_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.upcoming_features
    ADD CONSTRAINT upcoming_features_pkey PRIMARY KEY (id);

-- ============================================================
-- Unique Constraints
-- ============================================================
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_name_category_id_key UNIQUE (name, category_id);

ALTER TABLE ONLY public.note_requests
    ADD CONSTRAINT note_requests_request_id_key UNIQUE (request_id);

ALTER TABLE ONLY public.note_requests
    ADD CONSTRAINT note_requests_request_token_key UNIQUE (request_token);

ALTER TABLE ONLY public.note_requests
    ADD CONSTRAINT note_requests_download_code_key UNIQUE (download_code);

ALTER TABLE ONLY public.note_access_codes
    ADD CONSTRAINT note_access_codes_note_id_access_code_id_key UNIQUE (note_id, access_code_id);

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT unique_teacher_code UNIQUE (teacher_id, code);

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_request_id_note_id_key UNIQUE (request_id, note_id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_base_currency_key UNIQUE (base_currency);

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);

-- ============================================================
-- Foreign Keys
-- ============================================================
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.note_access_codes
    ADD CONSTRAINT note_access_codes_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.note_access_codes
    ADD CONSTRAINT note_access_codes_access_code_id_fkey FOREIGN KEY (access_code_id) REFERENCES public.access_codes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.note_requests
    ADD CONSTRAINT note_requests_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.note_requests(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.note_reports
    ADD CONSTRAINT note_reports_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.bank_creds
    ADD CONSTRAINT bank_creds_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bank_creds
    ADD CONSTRAINT bank_creds_approved_bank_id_fkey FOREIGN KEY (approved_bank_id) REFERENCES public.approved_banks(id) ON DELETE RESTRICT;
