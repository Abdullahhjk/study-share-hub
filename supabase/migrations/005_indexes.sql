-- Performance indexes on foreign keys and frequently queried columns
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);
CREATE INDEX idx_activity_logs_category ON public.activity_logs USING btree (category);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_created ON public.request_audit USING btree (created_at);
CREATE INDEX idx_audit_fp ON public.request_audit USING btree (fingerprint_hash, created_at);

CREATE INDEX idx_blocked_ip ON public.blocked_clients USING btree (ip_hash);
CREATE INDEX idx_blocked_fp ON public.blocked_clients USING btree (fingerprint_hash);

CREATE INDEX idx_notes_teacher_id ON public.notes USING btree (teacher_id);
CREATE INDEX idx_notes_subcategory_id ON public.notes USING btree (subcategory_id);
CREATE INDEX idx_notes_deleted_at ON public.notes USING btree (deleted_at);
CREATE INDEX idx_notes_created_at ON public.notes USING btree (created_at DESC);

CREATE INDEX idx_note_requests_teacher_id ON public.note_requests USING btree (teacher_id);
CREATE INDEX idx_note_requests_status ON public.note_requests USING btree (status);
CREATE INDEX idx_note_requests_request_token ON public.note_requests USING btree (request_token);
CREATE INDEX idx_note_requests_download_code ON public.note_requests USING btree (download_code);
CREATE INDEX idx_note_requests_created_at ON public.note_requests USING btree (created_at DESC);

CREATE INDEX idx_request_notes_request_id ON public.request_notes USING btree (request_id);
CREATE INDEX idx_request_notes_note_id ON public.request_notes USING btree (note_id);

CREATE INDEX idx_note_reports_note_id ON public.note_reports USING btree (note_id);
CREATE INDEX idx_note_reports_status ON public.note_reports USING btree (status);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);

CREATE INDEX idx_subcategories_category_id ON public.subcategories USING btree (category_id);

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);

CREATE INDEX idx_access_codes_teacher_id ON public.access_codes USING btree (teacher_id);
CREATE INDEX idx_access_codes_code ON public.access_codes USING btree (code);
