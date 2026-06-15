-- ============================================================
-- Enable Row Level Security on all tables
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_creds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_features ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- user_roles
-- ============================================================
CREATE POLICY "User roles viewable by owner"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "No direct inserts to user_roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- user_settings
-- ============================================================
CREATE POLICY "Owner reads settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner writes settings"
  ON public.user_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- categories
-- ============================================================
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.has_role(auth.uid(), 'teacher'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

CREATE POLICY "Teachers can update categories"
  ON public.categories FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Creator can delete unused categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = created_by AND NOT public.is_category_in_use(id));

-- ============================================================
-- subcategories
-- ============================================================
CREATE POLICY "Subcategories are viewable by everyone"
  ON public.subcategories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert subcategories"
  ON public.subcategories FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.has_role(auth.uid(), 'teacher'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

CREATE POLICY "Teachers can update subcategories"
  ON public.subcategories FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Creator can delete unused subcategories"
  ON public.subcategories FOR DELETE
  USING (auth.uid() = created_by AND NOT public.is_subcategory_in_use(id));

-- ============================================================
-- notes
-- ============================================================
CREATE POLICY "Notes are viewable by everyone"
  ON public.notes FOR SELECT
  USING (true);

CREATE POLICY "Teachers can insert their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id
    AND (public.has_role(auth.uid(), 'teacher'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

CREATE POLICY "Teachers can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================================
-- access_codes
-- ============================================================
CREATE POLICY "Teachers can manage their own codes"
  ON public.access_codes
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Owners and admins view access codes"
  ON public.access_codes FOR SELECT
  USING (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- note_access_codes
-- ============================================================
CREATE POLICY "Teachers can manage their note access codes"
  ON public.note_access_codes
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_access_codes.note_id
      AND notes.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_access_codes.note_id
      AND notes.teacher_id = auth.uid()
  ));

CREATE POLICY "Owners and admins can view note access codes"
  ON public.note_access_codes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = note_access_codes.note_id
      AND (n.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  ));

-- ============================================================
-- note_requests
-- ============================================================
CREATE POLICY "Teachers can view their own requests"
  ON public.note_requests FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all requests"
  ON public.note_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Teachers can update their own requests"
  ON public.note_requests FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can create valid note requests"
  ON public.note_requests FOR INSERT
  WITH CHECK (
    teacher_id IS NOT NULL
    AND total_amount >= 0
    AND status = 'pending'
    AND request_token IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = note_requests.teacher_id
        AND p.is_blocked = false
    )
  );

-- ============================================================
-- request_notes
-- ============================================================
CREATE POLICY "Request notes viewable with request"
  ON public.request_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.note_requests nr
    WHERE nr.id = request_notes.request_id
      AND nr.teacher_id = auth.uid()
  ));

CREATE POLICY "Insert notes only for matching fresh request"
  ON public.request_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.note_requests nr
    JOIN public.notes n ON n.id = request_notes.note_id
    WHERE nr.id = request_notes.request_id
      AND nr.created_at > now() - INTERVAL '10 minutes'
      AND nr.teacher_id = n.teacher_id
      AND n.deleted_at IS NULL
  ));

-- ============================================================
-- note_reports
-- ============================================================
CREATE POLICY "Anyone can report notes"
  ON public.note_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Teachers can view reports on their notes (no email)"
  ON public.note_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_reports.note_id
      AND notes.teacher_id = auth.uid()
  ));

CREATE POLICY "Admins can view all reports"
  ON public.note_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Teachers can appeal reports on their notes"
  ON public.note_reports FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_reports.note_id
      AND notes.teacher_id = auth.uid()
  ));

CREATE POLICY "Admins can update reports"
  ON public.note_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete reports"
  ON public.note_reports FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- notifications
-- ============================================================
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- activity_logs
-- ============================================================
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- feedback
-- ============================================================
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins read feedback"
  ON public.feedback FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update feedback"
  ON public.feedback FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- approved_banks
-- ============================================================
CREATE POLICY "Everyone reads banks"
  ON public.approved_banks FOR SELECT
  USING (true);

CREATE POLICY "Admins manage banks"
  ON public.approved_banks
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- bank_creds
-- ============================================================
CREATE POLICY "Teachers own bank creds"
  ON public.bank_creds
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Admins read bank creds"
  ON public.bank_creds FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- fx_rates
-- ============================================================
CREATE POLICY "Everyone reads fx rates"
  ON public.fx_rates FOR SELECT
  USING (true);

CREATE POLICY "Admins write fx rates"
  ON public.fx_rates
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- blocked_clients
-- ============================================================
CREATE POLICY "Admins manage blocks"
  ON public.blocked_clients
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- request_audit
-- ============================================================
CREATE POLICY "Admins read audit"
  ON public.request_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- build_reports
-- ============================================================
CREATE POLICY "Admins manage build reports"
  ON public.build_reports
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- newsletter_subscribers
-- ============================================================
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage subscribers"
  ON public.newsletter_subscribers
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- deleted_avatars
-- ============================================================
CREATE POLICY "Users manage own avatars"
  ON public.deleted_avatars
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all avatars"
  ON public.deleted_avatars FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- upcoming_features
-- ============================================================
CREATE POLICY "Everyone reads upcoming"
  ON public.upcoming_features FOR SELECT
  USING (true);

CREATE POLICY "Admins write upcoming"
  ON public.upcoming_features
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
