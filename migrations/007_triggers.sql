-- ============================================================
-- Auth trigger: create profile + pending role on signup
-- ============================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();

-- ============================================================
-- Updated-at triggers
-- ============================================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_bank_creds_updated_at
  BEFORE UPDATE ON public.bank_creds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_upcoming_updated_at
  BEFORE UPDATE ON public.upcoming_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_note_requests_updated_at
  BEFORE UPDATE ON public.note_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Business logic triggers
-- ============================================================
CREATE TRIGGER trg_note_requests_request_token
  BEFORE INSERT ON public.note_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_note_request_token();

CREATE TRIGGER trg_generate_download_code
  BEFORE UPDATE ON public.note_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_download_code();

CREATE TRIGGER trg_validate_note_request_total
  BEFORE INSERT ON public.request_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_note_request_total();
