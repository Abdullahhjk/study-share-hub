-- ============================================================
-- Helper: update updated_at column
-- ============================================================
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Role check function (used by RLS policies)
-- ============================================================
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================================
-- Auto-create profile + pending role on user signup
-- ============================================================
CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending');

  RETURN NEW;
END;
$$;

-- ============================================================
-- Auto-create user_settings on signup
-- ============================================================
CREATE FUNCTION public.handle_new_user_settings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Generate download code on request completion
-- ============================================================
CREATE FUNCTION public.generate_download_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_letters TEXT;
  v_suffix TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.download_code IS NULL THEN
    v_letters := upper(substr(md5(random()::text || clock_timestamp()::text || NEW.id::text), 1, 4));
    v_suffix := lpad((nextval('public.download_code_seq') % 100)::text, 2, '0');
    NEW.download_code := v_letters || '_' || v_suffix;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Ensure request_token on insert
-- ============================================================
CREATE FUNCTION public.ensure_note_request_token() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.request_token IS NULL OR length(trim(NEW.request_token)) = 0 THEN
    NEW.request_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Validate that request_notes total matches note_requests.total_amount
-- ============================================================
CREATE FUNCTION public.validate_note_request_total() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_expected numeric;
  v_teacher_id uuid;
BEGIN
  SELECT nr.teacher_id INTO v_teacher_id
  FROM public.note_requests nr
  WHERE nr.id = NEW.request_id;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notes n
    WHERE n.id = NEW.note_id
      AND n.teacher_id = v_teacher_id
      AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Selected note does not belong to this teacher';
  END IF;

  SELECT coalesce(sum(n.price), 0)
  INTO v_expected
  FROM public.request_notes rn
  JOIN public.notes n ON n.id = rn.note_id
  WHERE rn.request_id = NEW.request_id;

  SELECT v_expected + coalesce(n.price, 0)
  INTO v_expected
  FROM public.notes n
  WHERE n.id = NEW.note_id;

  IF EXISTS (
    SELECT 1
    FROM public.note_requests nr
    WHERE nr.id = NEW.request_id
      AND nr.total_amount <> v_expected
  ) THEN
    RAISE EXCEPTION 'Request total does not match selected notes';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- RPC: Cancel student request by request_id
-- ============================================================
CREATE FUNCTION public.cancel_student_request(p_request_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.note_requests
  SET status = 'cancelled', updated_at = now()
  WHERE request_id = p_request_id AND status = 'pending';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ============================================================
-- RPC: Cancel student request by request_token
-- ============================================================
CREATE FUNCTION public.cancel_student_request_by_token(p_request_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.note_requests
  SET status = 'cancelled', updated_at = now()
  WHERE request_token = p_request_token
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ============================================================
-- RPC: Get free note file URL (only if is_free)
-- ============================================================
CREATE FUNCTION public.get_free_note_file_url(p_note_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT file_url
  FROM public.notes
  WHERE id = p_note_id
    AND is_free = true
    AND deleted_at IS NULL
  LIMIT 1
$$;

-- ============================================================
-- RPC: Get own note file URL (teacher only)
-- ============================================================
CREATE FUNCTION public.get_my_note_file_url(p_note_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT file_url
  FROM public.notes
  WHERE id = p_note_id
    AND teacher_id = auth.uid()
  LIMIT 1
$$;

-- ============================================================
-- RPC: Get public profile
-- ============================================================
CREATE FUNCTION public.get_public_profile(_id uuid) RETURNS TABLE(id uuid, full_name text, avatar_url text, school_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id, full_name, avatar_url, school_name FROM public.profiles WHERE id = _id;
$$;

-- ============================================================
-- RPC: List all public profiles
-- ============================================================
CREATE FUNCTION public.list_public_profiles() RETURNS TABLE(id uuid, full_name text, avatar_url text, school_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id, full_name, avatar_url, school_name FROM public.profiles;
$$;

-- ============================================================
-- RPC: Get student requests by request_id array
-- ============================================================
CREATE FUNCTION public.get_student_requests(p_request_ids text[]) RETURNS TABLE(id uuid, request_id text, status text, total_amount numeric, student_contact text, contact_type text, receipt_image_url text, refund_screenshot_url text, rejection_reason text, teacher_id uuid, teacher_full_name text, teacher_email text, teacher_phone text, created_at timestamp with time zone, updated_at timestamp with time zone, download_code text, download_code_used_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT nr.id, nr.request_id, nr.status, nr.total_amount, nr.student_contact,
         nr.contact_type, nr.receipt_image_url, nr.refund_screenshot_url,
         nr.rejection_reason, nr.teacher_id,
         p.full_name, p.email, p.phone,
         nr.created_at, nr.updated_at,
         nr.download_code, nr.download_code_used_at
  FROM public.note_requests nr
  LEFT JOIN public.profiles p ON p.id = nr.teacher_id
  WHERE nr.request_id = ANY(p_request_ids)
  ORDER BY nr.created_at DESC;
$$;

-- ============================================================
-- RPC: Get student requests by request_token array
-- ============================================================
CREATE FUNCTION public.get_student_requests_by_token(p_request_tokens text[]) RETURNS TABLE(id uuid, request_id text, request_token text, status text, total_amount numeric, student_contact text, contact_type text, receipt_image_url text, refund_screenshot_url text, rejection_reason text, teacher_id uuid, teacher_full_name text, teacher_email text, teacher_phone text, created_at timestamp with time zone, updated_at timestamp with time zone, download_code text, download_code_used_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT nr.id,
         nr.request_id,
         nr.request_token,
         nr.status,
         nr.total_amount,
         nr.student_contact,
         nr.contact_type,
         nr.receipt_image_url,
         nr.refund_screenshot_url,
         nr.rejection_reason,
         nr.teacher_id,
         p.full_name,
         p.email,
         p.phone,
         nr.created_at,
         nr.updated_at,
         nr.download_code,
         nr.download_code_used_at
  FROM public.note_requests nr
  LEFT JOIN public.profiles p ON p.id = nr.teacher_id
  WHERE nr.request_token = ANY(p_request_tokens)
  ORDER BY nr.created_at DESC
$$;

-- ============================================================
-- RPC: Get request notes for given request DB IDs
-- ============================================================
CREATE FUNCTION public.get_student_request_notes(p_request_db_ids uuid[]) RETURNS TABLE(id uuid, request_id uuid, note_id uuid, note_title text, note_price numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT rn.id, rn.request_id, rn.note_id, n.title, n.price
  FROM public.request_notes rn
  LEFT JOIN public.notes n ON n.id = rn.note_id
  WHERE rn.request_id = ANY(p_request_db_ids);
$$;

-- ============================================================
-- RPC: Validate access code (returns teacher_id if valid)
-- ============================================================
CREATE FUNCTION public.validate_access_code(p_code text) RETURNS TABLE(teacher_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT teacher_id FROM public.access_codes WHERE code = p_code LIMIT 1;
$$;

-- ============================================================
-- RPC: List protected teachers (those with access codes)
-- ============================================================
CREATE FUNCTION public.list_protected_teachers() RETURNS TABLE(teacher_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT teacher_id FROM public.access_codes;
$$;

-- ============================================================
-- RPC: Check if category is in use
-- ============================================================
CREATE FUNCTION public.is_category_in_use(category_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subcategories WHERE subcategories.category_id = is_category_in_use.category_id
  )
$$;

-- ============================================================
-- RPC: Check if subcategory is in use
-- ============================================================
CREATE FUNCTION public.is_subcategory_in_use(subcategory_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notes WHERE notes.subcategory_id = is_subcategory_in_use.subcategory_id
  )
$$;

-- ============================================================
-- RPC: Check if client is blocked
-- ============================================================
CREATE FUNCTION public.is_client_blocked(p_ip_hash text, p_fp_hash text) RETURNS TABLE(blocked boolean, reason text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT TRUE, b.reason
  FROM public.blocked_clients b
  WHERE (b.ip_hash = p_ip_hash OR b.fingerprint_hash = p_fp_hash)
    AND (b.blocked_until IS NULL OR b.blocked_until > now())
  ORDER BY b.created_at DESC
  LIMIT 1;
$$;

-- ============================================================
-- RPC: Record client hit (rate-limit tracking)
-- ============================================================
CREATE FUNCTION public.record_client_hit(p_ip_hash text, p_fp_hash text, p_action text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_recent INT;
BEGIN
  INSERT INTO public.request_audit (ip_hash, fingerprint_hash, action)
  VALUES (p_ip_hash, p_fp_hash, p_action);

  SELECT count(*) INTO v_recent
  FROM public.request_audit
  WHERE fingerprint_hash = p_fp_hash
    AND created_at > now() - INTERVAL '60 seconds';

  IF v_recent > 60 THEN
    INSERT INTO public.blocked_clients (ip_hash, fingerprint_hash, reason, blocked_until)
    VALUES (p_ip_hash, p_fp_hash, 'auto: rate limit', now() + INTERVAL '1 hour');
  END IF;

  DELETE FROM public.request_audit WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;
