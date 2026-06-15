-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    school_name text,
    avatar_url text,
    is_blocked boolean DEFAULT false NOT NULL,
    blocked_reason text,
    blocked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User roles (many-to-many, supports multiple roles per user)
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);

-- User settings/preferences
CREATE TABLE public.user_settings (
    user_id uuid NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    font_size text DEFAULT 'normal'::text NOT NULL,
    high_contrast boolean DEFAULT false NOT NULL,
    dyslexia_friendly boolean DEFAULT false NOT NULL,
    colorblind_mode boolean DEFAULT false NOT NULL,
    colorblind_type text DEFAULT ''::text NOT NULL,
    appearence text DEFAULT 'system'::text NOT NULL,
    show_dropdown boolean DEFAULT false NOT NULL,
    autoselect_currency boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Note categories
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);

-- Note subcategories
CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);

-- Notes (study materials uploaded by teachers)
CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    preview_image_url text,
    is_free boolean DEFAULT false NOT NULL,
    price numeric(10,2) DEFAULT 0,
    teacher_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    school_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

-- Access codes (teachers can create codes to gate their notes)
CREATE TABLE public.access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Junction: notes <-> access_codes (which codes can access which notes)
CREATE TABLE public.note_access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    access_code_id uuid NOT NULL
);

-- Note purchase/access requests (from students)
CREATE TABLE public.note_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id text NOT NULL,
    student_contact text NOT NULL,
    contact_type text NOT NULL,
    receipt_image_url text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    teacher_id uuid NOT NULL,
    rejection_reason text,
    refund_screenshot_url text,
    download_code text,
    download_code_used_at timestamp with time zone,
    download_code_used_ip text,
    request_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT note_requests_contact_type_check CHECK ((contact_type = ANY (ARRAY['email'::text, 'phone'::text]))),
    CONSTRAINT note_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'completed'::text, 'rejected'::text, 'refunded'::text])))
);

-- Junction: note_requests <-> notes (which notes are in a request)
CREATE TABLE public.request_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    note_id uuid NOT NULL
);

-- Note reports (anyone can report inappropriate notes)
CREATE TABLE public.note_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    reason text NOT NULL,
    description text,
    reporter_email text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    appeal_text text,
    appeal_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone
);

-- Notifications (system-wide or user-specific)
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_dismissed boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Activity/audit log
CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Feedback submissions
CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Approved banks for payment transfers
CREATE TABLE public.approved_banks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    country_code text DEFAULT 'PK'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Teacher bank credentials
CREATE TABLE public.bank_creds (
    bank_id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    approved_bank_id uuid NOT NULL,
    account_holder_name text NOT NULL,
    account_number_or_iban text NOT NULL,
    is_preferred boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign exchange rates
CREATE TABLE public.fx_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_currency text NOT NULL,
    rates jsonb DEFAULT '{}'::jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Blocked clients (rate limiting / abuse prevention)
CREATE TABLE public.blocked_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_hash text,
    fingerprint_hash text,
    reason text DEFAULT 'abuse'::text NOT NULL,
    blocked_until timestamp with time zone,
    blocked_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Request audit (rate-limit tracking)
CREATE TABLE public.request_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_hash text,
    fingerprint_hash text,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Build/version reports (admin releases)
CREATE TABLE public.build_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    changelog text NOT NULL,
    subject text,
    html text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone
);

-- Newsletter subscribers
CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

-- Deleted avatar history
CREATE TABLE public.deleted_avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    avatar_url text NOT NULL,
    storage_path text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    crop_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Upcoming features / roadmap
CREATE TABLE public.upcoming_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description jsonb DEFAULT '[]'::jsonb NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    icon_name text DEFAULT 'Rocket'::text NOT NULL,
    target_date date,
    status text DEFAULT 'planned'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT upcoming_features_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in-development'::text, 'testing'::text])))
);
