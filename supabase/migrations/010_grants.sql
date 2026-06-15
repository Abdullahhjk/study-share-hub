-- ============================================================
-- Schema privileges
-- ============================================================
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================================
-- Table privileges (RLS enforces row-level access)
-- ============================================================
GRANT ALL ON TABLE public.access_codes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.approved_banks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bank_creds TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.blocked_clients TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.build_reports TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.deleted_avatars TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.feedback TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.fx_rates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.newsletter_subscribers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.note_access_codes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.note_reports TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.note_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.request_audit TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.request_notes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subcategories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.upcoming_features TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_roles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_settings TO anon, authenticated, service_role;

-- ============================================================
-- View privileges
-- ============================================================
GRANT ALL ON TABLE public.notes_public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.note_reports_admin TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.note_reports_for_teacher TO anon, authenticated, service_role;

-- ============================================================
-- Sequence privileges
-- ============================================================
GRANT ALL ON SEQUENCE public.download_code_seq TO anon, authenticated, service_role;

-- ============================================================
-- Function privileges
-- ============================================================
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.handle_new_user_settings() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.generate_download_code() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.ensure_note_request_token() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.validate_note_request_total() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.cancel_student_request(p_request_id text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.cancel_student_request_by_token(p_request_token text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_free_note_file_url(p_note_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_my_note_file_url(p_note_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_public_profile(_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_public_profiles() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_student_requests(p_request_ids text[]) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_student_requests_by_token(p_request_tokens text[]) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_student_request_notes(p_request_db_ids uuid[]) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.validate_access_code(p_code text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_protected_teachers() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.is_category_in_use(category_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.is_subcategory_in_use(subcategory_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.is_client_blocked(p_ip_hash text, p_fp_hash text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_client_hit(p_ip_hash text, p_fp_hash text, p_action text) TO anon, authenticated, service_role;

-- ============================================================
-- Default privileges (future objects)
-- ============================================================
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
