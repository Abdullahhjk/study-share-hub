# Scholar Share — Full Codebase Documentation

> **Version:** v1.00.8.3 (updated 2026-06-18)
> **Author:** M. Abdullah Waqas
> **Stack:** React 18 + TypeScript + Vite · Tailwind CSS + shadcn/ui · TanStack Query · Supabase (PostgreSQL, Auth, Storage, Edge Functions)
> **Deploy:** Netlify (static SPA)

---

## 1. App Overview

Scholar Share is a two-sided marketplace connecting students with teachers for sharing and re-selling study notes. Students browse notes (free or paid), request access by submitting payment receipts, and download files via a unique download code. Teachers manage their catalog, track requests, verify student payments, handle refunds, and manage their payment credentials.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5.x |
| **Styling** | Tailwind CSS + `tailwind-merge` + `clsx` |
| **UI Components** | shadcn/ui (49 components: dialog, card, table, button, form, carousel, etc.) |
| **Routing** | React Router v6 |
| **Data Fetching** | TanStack Query (React Query) v5 |
| **State / Side Effects** | React hooks, localStorage |
| **Auth** | Supabase Auth (email/password, magic link) |
| **Database** | Supabase PostgreSQL |
| **Edge Functions** | Supabase Edge Functions (Deno) |
| **Storage** | Supabase Storage (3 buckets: avatars, receipts, notes) |
| **Currency** | Multi-currency (PKR/USD/CAD/EUR/GBP/JPY/CNY/SAR) via Apilayer FX rates |
| **Payments** | Offline — students submit receipts; teachers provide bank/wallet details and verify payment |
| **Email / Newsletter** | ActivePieces webhook, AI-generated build reports (Cohere) |
| **Deployment** | Netlify (`netlify.toml` with security headers + CSP) |
| **Libraries** | `date-fns`, `dompurify`, `lucide-react`, `@codemirror/lang-json`, `@uiw/react-codemirror`, `sonner` (toasts) |

---

## 3. Project Structure

```
src/
├── App.tsx                          # Root: routing, providers, cart context, query client
├── main.tsx                         # Entry: React.StrictMode, BrowserRouter, QueryClientProvider
├── index.css                        # Tailwind directives + CSS variables
├── version.ts                       # VERSION constant + updated date
│
├── pages/                           # 15 route pages
│   ├── Index.tsx                    # Landing page (browse notes, categories, carousel)
│   ├── Login.tsx                    # Auth: email/password + magic link
│   ├── Dashboard.tsx                # Teacher dashboard
│   ├── StudentDashboard.tsx         # Student request tracking
│   ├── AdminDashboard.tsx           # Internal admin panel
│   ├── Download.tsx                 # Download page (redeem code)
│   ├── ResetPassword.tsx            # Password reset
│   ├── Settings.tsx                 # User settings (appearance, currency, accessibility)
│   ├── NotFound.tsx                 # 404 page
│   ├── UserManual.tsx               # Help / documentation page
│   ├── QATesting.tsx                # QA testing info
│   ├── PrivacyPolicy.tsx            # Privacy policy
│   ├── TermsConditions.tsx          # Terms & conditions
│   ├── YourData.tsx                # Data privacy / GDPR info
│   ├── Unsubscribe.tsx              # Newsletter unsubscribe
│   └── UpcomingFeatures.tsx         # Feature roadmap (public)
│
├── components/
│   ├── admin/                       # Internal admin panel components
│   ├── dashboard/                   # 17 teacher dashboard components
│   │   ├── ActivityLogs.tsx
│   │   ├── CategoryManagement.tsx
│   │   ├── ClearDataDialog.tsx
│   │   ├── EditNoteDialog.tsx
│   │   ├── ProfileSettings.tsx
│   │   ├── RefundManagement.tsx
│   │   ├── RefundScreenshotDialog.tsx
│   │   ├── RequestManagement.tsx
│   │   ├── RequestTracker.tsx
│   │   ├── TeacherAnalytics.tsx
│   │   ├── TeacherApprovalPanel.tsx
│   │   ├── TeacherNotesList.tsx
│   │   ├── TeacherNotifications.tsx
│   │   ├── TeacherPayments.tsx
│   │   ├── TeacherPaymentSettings.tsx
│   │   ├── TeacherReports.tsx
│   │   └── UploadNoteForm.tsx
│   │
│   ├── providers/
│   │   └── CurrencyProvider.tsx     # Multi-currency context
│   │
│   ├── settings/
│   │   ├── SettingsDialog.tsx
│   │   ├── AppearanceSection.tsx
│   │   ├── CurrencySection.tsx
│   │   └── AccessibilitySection.tsx
│   │
│   ├── ui/                          # 49 shadcn/ui primitives
│   ├── Header.tsx                   # Nav bar
│   ├── Footer.tsx                   # Site footer
│   ├── NavLink.tsx                  # Nav link component
│   ├── ProtectedRoute.tsx           # Auth + role guard
│   ├── NoteCard.tsx                 # Note display card
│   ├── NotesCarousel.tsx            # Horizontal note carousel
│   ├── NoteDetailDialog.tsx         # Note detail modal
│   ├── RequestPaidNotesDialog.tsx   # Request flow for paid notes
│   ├── ReportNoteDialog.tsx         # Report a note
│   ├── SearchFilters.tsx            # Search + category/subcategory filter
│   ├── NotesLoading.tsx             # Loading skeleton
│   ├── BookLoader.tsx               # Book-shaped loader animation
│   ├── ColorblindFilters.tsx        # Accessibility color filters
│   └── SettingsBootstrap.tsx        # Initial settings bootstrap
│
├── hooks/
│   ├── useNotes.ts                  # Queries: notes, categories, subcategories, teachers, schools
│   ├── useNoteMutations.ts          # Mutations: CRUD notes, categories, subcategories
│   ├── useCurrency.ts               # Currency context hook
│   ├── useActivityLogger.ts         # Activity logging helper
│   ├── getPrefaceUrl.ts             # Get public URL for Preface.docx
│   ├── use-mobile.tsx               # Mobile detection hook
│   └── use-toast.ts / use-toast.ts  # Toast hook (shadcn/ui)
│
├── lib/
│   ├── types.ts                     # TypeScript interfaces (Category, Subcategory, Teacher, Note, NoteRequest, RequestNote)
│   ├── currency.ts                  # Currency configs, IP detection, FX rate mgmt
│   ├── payment-types.ts             # ApprovedBank, BankCred, BankCredWithBank
│   ├── payment-utils.ts             # Bank categorization, clipboard, requestId storage
│   ├── request-id-validator.ts      # Format validator for REQ_XXXXXXXX_XXXX
│   ├── student-request-storage.ts   # localStorage helpers for student request IDs
│   ├── image-proxy.ts               # Proxy URLs through edge function
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
│
└── integrations/
    └── supabase/
        └── client.ts                # Supabase client singleton

migrations/                          # 18 SQL migrations
    ├── 001_types.sql                # app_role ENUM
    ├── 002_sequences.sql            # download_code_seq
    ├── 003_tables.sql               # All 19+ table definitions
    ├── 004_constraints.sql          # PKs, unique constraints, FKs
    ├── 005_indexes.sql              # Performance indexes
    ├── 006_functions.sql            # 18 PostgreSQL functions/RPCs
    ├── 007_triggers.sql             # 10 triggers
    ├── 008_views.sql                # 3 views (notes_public, note_reports_admin, note_reports_for_teacher)
    ├── 009_rls_policies.sql         # 56+ RLS policies
    ├── 010_grants.sql               # Schema/table/function grants
    ├── 011_storage.sql              # Storage bucket RLS policies
    ├── 012_fixes.sql                # Fixes: ENUM additions, policy fixes, log_activity RPC
    ├── NOTES_ORDERING_FIX.sql       # create_note_request RPC, policy cleanup
    ├── NEW_create_note_request_rpc.sql  # Redundant create_note_request RPC
    ├── NEW_fix_rls_policies.sql     # Final RLS policy cleanup
    └── edge-functions.md            # 5 edge function descriptions
```

---

## 4. Database Schema

### 4.1 ENUM Types

| Type | Values |
|---|---|
| `app_role` | `admin`, `teacher`, `pending`, `deleted`, `blocked`, `rejected` |

### 4.2 Sequences

| Sequence | Purpose |
|---|---|
| `download_code_seq` | Auto-incrementing download code generator |

### 4.3 Tables (19+)

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profile data | `id` (FK → auth.users), `full_name`, `email`, `school_name`, `phone`, `avatar_url`, `is_blocked` |
| `user_roles` | Role assignment | `user_id` (FK → auth.users), `role` (app_role) |
| `user_settings` | Per-user preferences | `user_id` (PK, FK → auth.users), `theme`, `currency`, `language`, `notifications_enabled` |
| `categories` | Note categories | `name` (unique), `created_by` |
| `subcategories` | Note subcategories | `name`, `category_id` (FK), `created_by`; unique `(name, category_id)` |
| `notes` | Notes / study materials | `title`, `description`, `file_url`, `price`, `is_free`, `teacher_id`, `subcategory_id`, `preview_image_url`, `school_name`, `deleted_at` (soft delete) |
| `access_codes` | Teacher-managed access codes | `teacher_id`, `code`, `is_active`; unique `(teacher_id, code)` |
| `note_access_codes` | Many-to-many: note ↔ access code | `note_id`, `access_code_id`; unique `(note_id, access_code_id)` |
| `note_requests` | Student purchase requests | `request_id` (REQ_XXXXXXXX_XXXX, unique), `request_token` (unique), `download_code` (unique), `student_contact`, `contact_type`, `receipt_image_url`, `total_amount`, `teacher_id`, `status` (pending/verified/completed/rejected/refunded/cancelled) |
| `request_notes` | Many-to-many: request ↔ notes | `request_id`, `note_id`; unique `(request_id, note_id)` |
| `note_reports` | Reported notes | `note_id`, `reason`, `description`, `reporter_email`, `status` (pending/resolved/dismissed), `appeal_text`, `admin_notes` |
| `notifications` | In-app notifications | `title`, `message`, `user_id` (null = broadcast), `is_read`, `created_by` |
| `activity_logs` | Audit trail | `user_id`, `action`, `category`, `details` (jsonb), `ip_address`, `user_agent` |
| `feedback` | User submitted feedback | `email`, `message`, `status` (new/reviewed/archived), `admin_notes` |
| `approved_banks` | Bank registry | `bank_name`, `country_code` |
| `bank_creds` | Teacher bank/wallet credentials | `teacher_id`, `approved_bank_id`, `account_holder_name`, `account_number_or_iban`, `is_preferred` |
| `fx_rates` | Cached FX rates | `base_currency` (unique), `rates` (jsonb), `fetched_at` |
| `blocked_clients` | IP/fingerprint blocklist | `ip_hash`, `fingerprint_hash`, `reason` |
| `request_audit` | Request rate-limit audit | `fingerprint_hash`, `ip_hash`, `action` |
| `build_reports` | Newsletter build reports | `version`, `changelog`, `subject`, `html`, `sent_at`, `created_by` |
| `newsletter_subscribers` | Email newsletter subscribers | `email` (unique), `is_active` |
| `deleted_avatars` | Avatar deletion tracking | `user_id`, `avatar_url` |
| `upcoming_features` | Feature roadmap | `title`, `description` (jsonb ContentBlock[]), `category`, `icon_name`, `target_date`, `status`, `sort_order` |
| `payment_credentials` | Payment methods | `name`, `type`, `account_number`, `account_holder`, `bank_name`, `iban`, `is_active`, `sort_order` |
| `payment_records` | Teacher payout tracking | `teacher_id`, `year`, `month`, `amount`, `paid_amount`, `status` (pending/partial/verified/rejected/overdue), `proof_url`, `reference_number`, `verified_by` |

### 4.4 Constraints

- All tables have UUID primary keys (except `user_settings` PK = `user_id`, `bank_creds` PK = `bank_id`)
- Foreign keys cascade on DELETE from `auth.users` and parent tables
- `notes_public` view exposes `file_url` only for free notes (paid notes return NULL)

### 4.5 Indexes

39 performance indexes on: FKs (`teacher_id`, `category_id`, `subcategory_id`, `user_id`), frequently filtered columns (`status`, `role`, `is_read`, `deleted_at`), lookup columns (`code`, `request_token`, `download_code`, `fingerprint_hash`), and time-ordered columns (`created_at DESC`).

---

## 5. PostgreSQL Functions / RPCs (18 total)

Defined in `006_functions.sql` and `012_fixes.sql`:

| Function | Returns | Purpose |
|---|---|---|
| `has_role(_user_id uuid, _role app_role)` | `boolean` | Check if user has a specific role |
| `handle_new_user()` | `trigger` | Create profile + pending role on auth.users insert |
| `handle_new_user_settings()` | `trigger` | Create default user_settings on signup |
| `update_updated_at_column()` | `trigger` | Set `updated_at = now()` before update |
| `generate_download_code()` | `trigger` | Generate unique download code when request status changes to 'completed' |
| `ensure_note_request_token()` | `trigger` | Generate request_token before INSERT on note_requests |
| `validate_note_request_total()` | `trigger` | Validate note request total (DROPPED in NOTES_ORDERING_FIX) |
| `cancel_student_request(p_request_id text)` | `void` | Cancel a student request by request_id |
| `cancel_student_request_by_token(p_request_token text)` | `void` | Cancel by request_token |
| `get_free_note_file_url(p_note_id uuid)` | `text` | Get file URL for free notes |
| `get_my_note_file_url(p_note_id uuid)` | `text` | Get file URL for owned notes (teacher) |
| `get_public_profile(_id uuid)` | `record` | Get a single public profile |
| `list_public_profiles()` | `setof profiles` | List all public profiles |
| `get_student_requests(p_request_ids text[])` | `setof note_requests` | Get requests by ID array |
| `get_student_requests_by_token(p_request_tokens text[])` | `setof note_requests` | Get requests by token array |
| `get_student_request_notes(p_request_db_ids uuid[])` | `setof request_notes` | Get request_notes by request DB IDs |
| `validate_access_code(p_code text)` | `TABLE(...)` | Validate an access code and return associated notes |
| `list_protected_teachers()` | `TABLE(...)` | List teachers with active access codes |
| `is_category_in_use(category_id uuid)` | `boolean` | Check if category has notes |
| `is_subcategory_in_use(subcategory_id uuid)` | `boolean` | Check if subcategory has notes |
| `is_client_blocked(p_ip_hash text, p_fp_hash text)` | `boolean` | Check if client is blocked |
| `record_client_hit(p_ip_hash text, p_fp_hash text, p_action text)` | `void` | Record rate-limit hit (auto-blocks at 60/min) |
| `create_note_request(...)` | `note_requests` | **SECURITY DEFINER** — Create a note request for anon users (auto-generates request_id) |
| `log_activity(...)` | `void` | **SECURITY DEFINER** — Insert activity log (used by edge functions) |
| `create_app_bucket(bucket_name text, is_public boolean)` | `void` | **SECURITY DEFINER** — Idempotent bucket creation |
| `record_teacher_payment(...)` | `void` | Record a payment for a teacher |
| `verify_teacher_payment(...)` | `void` | Verify/approve a payment record |
| `reject_payment_proof(...)` | `void` | Reject a payment proof |
| `generate_monthly_payment_record(...)` | `void` | Generate a monthly payment record |

---

## 6. Triggers (10 total)

| Trigger | Timing | Function | Purpose |
|---|---|---|---|
| `on_auth_user_created` | AFTER INSERT ON auth.users | `handle_new_user()` | Auto-create profile + pending role |
| `on_auth_user_created_settings` | AFTER INSERT ON auth.users | `handle_new_user_settings()` | Auto-create default settings |
| `update_profiles_updated_at` | BEFORE UPDATE ON profiles | `update_updated_at_column()` | Timestamp tracking |
| `trg_bank_creds_updated_at` | BEFORE UPDATE ON bank_creds | `update_updated_at_column()` | Timestamp tracking |
| `trg_feedback_updated_at` | BEFORE UPDATE ON feedback | `update_updated_at_column()` | Timestamp tracking |
| `trg_upcoming_updated_at` | BEFORE UPDATE ON upcoming_features | `update_updated_at_column()` | Timestamp tracking |
| `trg_user_settings_updated_at` | BEFORE UPDATE ON user_settings | `update_updated_at_column()` | Timestamp tracking |
| `update_notes_updated_at` | BEFORE UPDATE ON notes | `update_updated_at_column()` | Timestamp tracking |
| `update_note_requests_updated_at` | BEFORE UPDATE ON note_requests | `update_updated_at_column()` | Timestamp tracking |
| `trg_note_requests_request_token` | BEFORE INSERT ON note_requests | `ensure_note_request_token()` | Auto-generate request_token |
| `trg_generate_download_code` | BEFORE UPDATE ON note_requests | `generate_download_code()` | Auto-generate download_code when status→completed |
| `trg_validate_note_request_total` | BEFORE INSERT ON request_notes | ~~`validate_note_request_total()`~~ (DROPPED) | Was broken for multi-note requests |

---

## 7. Views (3)

| View | `security_invoker` | Purpose |
|---|---|---|
| `notes_public` | on | Safe public view: hides `file_url` for paid notes (returns NULL); exposes all fields for free notes |
| `note_reports_admin` | true | Full reports data including `reporter_email` (internal use) |
| `note_reports_for_teacher` | true | Reports data **excluding** `reporter_email` (teacher access via RLS) |

---

## 8. RLS Policies (56+)

Row-Level Security is enabled on all 19+ tables. Every policy is designed to enforce user isolation — students can only interact with teachers through the request system, teachers own their content, and unauthenticated visitors see only public data.

### 8.1 `profiles` — User Profile Data

| Action | Policy | Why |
|---|---|---|
| **SELECT** | User can only read their own profile row (`auth.uid() = id`) | Prevents students from seeing other students' personal info or enumerating teachers' contact details |
| **INSERT** | User can only insert their own profile (`auth.uid() = id`) | Ensures the auto-created profile on signup belongs to the right user |
| **UPDATE** | User can only update their own profile (`auth.uid() = id`) | Each user manages only their own name, school, phone, avatar |

### 8.2 `user_roles` — Role Assignment

| Action | Policy | Why |
|---|---|---|
| **SELECT** | User can only see their own role (`auth.uid() = user_id`) | A student cannot see who else is a teacher; a teacher cannot see other teachers' roles |
| **INSERT / UPDATE / DELETE** | Not permitted by regular users | Role changes are gated — a user cannot self-elevate from 'pending' to 'teacher' |

### 8.3 `user_settings` — Preferences

| Action | Policy | Why |
|---|---|---|
| **ALL** | Owner only (`auth.uid() = user_id`) | Theme, currency, language, and notification preferences are private to each user |

### 8.4 `categories` — Note Categories

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Everyone (including unauthenticated visitors) `(true)` | Categories must be browsable to organize notes on the landing page |
| **INSERT** | Authenticated teachers only (`has_role(teacher)`) | Prevents students or random visitors from creating categories |
| **UPDATE** | Authenticated teachers (`has_role(teacher)`) | Teachers can rename/reorganize categories |
| **DELETE** | Creator only, and only if no notes reference the category (`auth.uid() = created_by AND NOT is_category_in_use(id)`) | Prevents deleting a category that still has notes assigned to it |

### 8.5 `subcategories` — Note Subcategories

Mirrors the `categories` policy exactly. Everyone can read, authenticated teachers can insert/update, and deletion is gated by the `is_subcategory_in_use()` check.

### 8.6 `notes` — Study Notes (Core Content)

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Free notes visible to everyone; paid notes require authentication (`is_free = true OR auth.uid() IS NOT NULL`) | Anonymous visitors can browse free notes to evaluate the platform; only logged-in users can see paid note listings. The `file_url` column is further protected — see Section 7 `notes_public` view |
| **INSERT** | Teacher can only insert notes where `teacher_id = auth.uid()` and they have the teacher role | A teacher's notes are attributed to them; a student cannot upload notes under a teacher's name |
| **UPDATE** | Teacher can only update their own notes (`auth.uid() = teacher_id`) | A teacher cannot modify another teacher's notes |
| **DELETE** | Teacher can only delete their own notes (`auth.uid() = teacher_id`) | Each teacher controls their own catalog; deletion is soft (sets `deleted_at`) |

### 8.7 `access_codes` — Teacher Access Codes

| Action | Policy | Why |
|---|---|---|
| **ALL** | Teacher owns their codes (`auth.uid() = teacher_id`) | Each teacher creates and manages their own access codes for gating specific notes |
| **SELECT** | Teacher sees own codes | Codes are a teacher's private mechanism for granting access; not visible to students |

### 8.8 `note_access_codes` — Many-to-Many: Note ↔ Code

| Action | Policy | Why |
|---|---|---|
| **ALL** | Teacher can only manage codes on their own notes (checked via `EXISTS` subquery on `notes.teacher_id = auth.uid()`) | Prevents a teacher from linking their access codes to another teacher's notes |

### 8.9 `note_requests` — Student Purchase Requests (Most Complex)

| Action | Policy | Why |
|---|---|---|
| **INSERT** | Anyone (including anonymous students) can create a request, provided: `teacher_id` is not null, `total_amount >= 0`, `status = 'pending'`, and the target teacher is not blocked (`profiles.is_blocked = false`) | Students do not need an account to request notes. The policy validates the request is well-formed and targets a legitimate, unblocked teacher |
| **SELECT** | Teachers can only see requests addressed to them (`auth.uid() = teacher_id`) | A teacher cannot see another teacher's incoming requests (privacy of student contact info and revenue) |
| **UPDATE** | Teachers can only update requests addressed to them (`auth.uid() = teacher_id`) | The teacher who owns the request can change its status (verify payment, mark complete, mark refunded) |

### 8.10 `request_notes` — Line Items of a Request

| Action | Policy | Why |
|---|---|---|
| **INSERT** | Anyone can link a note to a pending request, provided the request exists and is still in 'pending' status, and the note is not deleted | After the `create_note_request` RPC creates the request row, the client inserts `request_notes` rows to specify which notes were purchased |
| **SELECT** | Visible to the teacher who owns the parent request (checked via `EXISTS` subquery on `note_requests.teacher_id = auth.uid()`) | Teachers see what notes were included in a given request |

### 8.11 `note_reports` — Reported Notes

| Action | Policy | Why |
|---|---|---|
| **INSERT** | Anyone can report a note (`WITH CHECK true`) | Students and visitors can flag inappropriate or low-quality notes |
| **SELECT** | Teachers can only see reports on their own notes; the `reporter_email` column is excluded from teacher view (handled by the `note_reports_for_teacher` view) | A teacher can see what their notes are being reported for and submit an appeal, but they cannot see who reported them (encourages honest reporting) |
| **UPDATE** | Teachers can update reports on their own notes (to add an appeal: `appeal_text`, `appeal_date`) | Teachers can respond to reports with an explanation or correction |

### 8.12 `notifications` — In-App Notifications

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Users see notifications addressed to them OR broadcast notifications (`user_id = auth.uid() OR user_id IS NULL`) | A user sees their own notifications plus any global broadcast |
| **UPDATE** | Users can mark their own notifications as read (`user_id = auth.uid()`) | Each user controls their own read/unread state |

### 8.13 `activity_logs` — Audit Trail

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Users see only their own activity logs (`auth.uid() = user_id`) | A student cannot see a teacher's activity; a teacher cannot see another teacher's activity |
| **INSERT** | Users can insert logs associated with themselves or with `user_id = NULL` (system actions) | Activity logging is automatic from the client; each action is attributed to the current user |

### 8.14 `feedback` — User Feedback

| Action | Policy | Why |
|---|---|---|
| **INSERT** | Anyone can submit feedback (`WITH CHECK true`) | Open channel for users to send suggestions or bug reports |

### 8.15 `approved_banks` — Bank Registry

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Everyone can read (`true`) | Students need to see what payment methods a teacher accepts; teachers need to see the available banks when setting up their credentials |
| **INSERT / UPDATE / DELETE** | Not permitted by regular users | The list of approved banks is maintained internally |

### 8.16 `bank_creds` — Teacher Bank/Wallet Credentials

| Action | Policy | Why |
|---|---|---|
| **ALL** | Teacher owns their credentials (`auth.uid() = teacher_id`) | Each teacher manages their own bank accounts, EasyPaisa, JazzCash, etc. A teacher cannot see or modify another teacher's payment details |

### 8.17 `fx_rates` — Foreign Exchange Rates

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Everyone can read (`true`) | FX rates are public data needed by the frontend to display prices in the user's local currency |

### 8.18 `blocked_clients` — IP/Fingerprint Blocklist

| Action | Policy | Why |
|---|---|---|
| **ALL** | Not accessible by regular users | Only the system (`client-gate` edge function) reads this table to enforce rate limits |

### 8.19 `request_audit` — Rate-Limit Audit Log

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Not accessible by regular users | Internal audit trail for rate-limit decisions |

### 8.20 `newsletter_subscribers` — Email Subscribers

| Action | Policy | Why |
|---|---|---|
| **INSERT** | Anyone can subscribe (`WITH CHECK true`) | Open signup form on the website |
| **SELECT / UPDATE / DELETE** | Not permitted by regular users | Subscribers cannot see or modify the list |

### 8.21 `deleted_avatars` — Avatar Deletion Tracking

| Action | Policy | Why |
|---|---|---|
| **ALL** | User manages their own deleted avatars (`auth.uid() = user_id`) | Tracks avatars a user has removed so storage cleanup can occur |

### 8.22 `upcoming_features` — Feature Roadmap

| Action | Policy | Why |
|---|---|---|
| **SELECT** | Everyone can read (`true`) | The roadmap page at `/upcoming` is public so all users can see what's planned |
| **INSERT / UPDATE / DELETE** | Not permitted by regular users | Roadmap is maintained internally |

### 8.23 `payment_credentials` — Payment Methods

| Action | Policy | Why |
|---|---|---|
| **ALL** | Not directly accessible by regular users | The list of platform payment credentials is used internally for reference |

### 8.24 `payment_records` — Teacher Payout Tracking

| Action | Policy | Why |
|---|---|---|
| **ALL** | Gated — teachers can view records where they are the `teacher_id` | Teachers can see their own payout history and status |

### 8.25 `build_reports` — Newsletter Build Reports

| Action | Policy | Why |
|---|---|---|
| **ALL** | Not accessible by regular users | Internal newsletter management |

### 8.26 `storage.objects` — Supabase Storage (3 Buckets)

**Avatars bucket** (public):
| Action | Policy | Why |
|---|---|---|
| **SELECT** | Any visitor can view any avatar (`bucket_id = 'avatars'`) | Profile pictures are public by design |
| **INSERT / UPDATE / DELETE** | User can only modify avatars in their own folder (`(storage.foldername(name))[1] = auth.uid()::text`) | Prevents a user from overwriting another user's avatar |

**Receipts bucket** (private):
| Action | Policy | Why |
|---|---|---|
| **INSERT** | Anyone can upload a receipt (`bucket_id = 'receipts'`) | Students (even anonymous) must be able to upload payment proof |
| **SELECT** | Only the teacher who owns the associated request can read the receipt (checked via `EXISTS` subquery on `note_requests.teacher_id = auth.uid()` matching the receipt URL) | Payment receipts are sensitive; only the intended teacher can view them |

**Notes bucket** (private):
| Action | Policy | Why |
|---|---|---|
| **INSERT / UPDATE / DELETE** | Teacher can only modify files in their own folder (`(storage.foldername(name))[1] = auth.uid()::text`) | Each teacher's note files are isolated in their own directory |
| **SELECT** | No direct SELECT policy — reads are exclusively brokered through the `redeem-download-code` edge function, which generates short-lived signed URLs | Paid note files must never be directly accessible; the edge function validates the download code before issuing a temporary URL |

---

## 9. Storage Buckets

| Bucket | Public | Purpose | Access |
|---|---|---|---|
| `avatars` | Yes | Profile pictures | World-readable; user-writable in own folder (`{user_id}/`) |
| `receipts` | No | Payment receipt images | Anyone can upload; only the request teacher can read |
| `notes` | No | Paid note files | Teacher-owned (in `{teacher_id}/` folder); reads ONLY via `redeem-download-code` edge function (short-lived signed URLs) |

---

## 10. Edge Functions

Deployed via `supabase functions deploy` (Deno TypeScript).

| Function | Purpose | Auth | Trigger |
|---|---|---|---|
| `cleanup-deleted-notes` | Permanently remove notes soft-deleted >30 days + orphaned storage files | service_role | Scheduled cron |
| `client-gate` | Rate-limit gateway: hashes IP + fingerprint, checks `is_client_blocked()`, records hit (auto-block at 60 req/min) | anon + auth | App bootstrap |
| `redeem-download-code` | Validate download code → generate short-lived signed URLs from private `notes` bucket (the only path to fetch paid notes) | anon (gated by code) | Student download action |
| `update-fx-rates` | Fetch latest FX rates from external API → upsert into `fx_rates` | service_role | Scheduled cron |

Additional AI edge functions (referenced in frontend):
- `ai-build-report-email` — Cohere generates newsletter HTML from version + changelog
- `ai-enhance-notification` — Cohere enhances notification content

---

## 11. Frontend Pages & Components

### 11.1 Pages

| Route | Page | Auth | Description |
|---|---|---|---|
| `/` | `Index.tsx` | Public | Landing: search/filter notes, category carousels, NoteCard grid, NoteDetailDialog |
| `/login` | `Login.tsx` | Public | Email/password login + magic link. Role-based redirect on success. |
| `/dashboard` | `Dashboard.tsx` | Teacher | Teacher panel: notes CRUD, requests, payments, refunds, analytics, reports, notifications, profile settings |
| `/student-dashboard` | `StudentDashboard.tsx` | Student | Track requests by ID/token; view status; cancel pending requests |
| `/admin` | `AdminDashboard.tsx` | Internal | Internal admin panel (not customer-facing) |
| `/download` | `Download.tsx` | Public | Enter download code → fetch signed URLs from edge function |
| `/reset-password` | `ResetPassword.tsx` | Public | Supabase password recovery |
| `/settings` | `Settings.tsx` | Auth | Appearance, currency, accessibility |
| `/manual` | `UserManual.tsx` | Public | Help documentation |
| `/qa-testing` | `QATesting.tsx` | Public | QA testing info |
| `/privacy` | `PrivacyPolicy.tsx` | Public | Privacy policy |
| `/terms` | `TermsConditions.tsx` | Public | Terms & conditions |
| `/your-data` | `YourData.tsx` | Public | Data privacy info |
| `/unsubscribe` | `Unsubscribe.tsx` | Public | Newsletter unsubscribe |
| `/upcoming` | `UpcomingFeatures.tsx` | Public | Feature roadmap (reads from `upcoming_features` table) |
| `*` | `NotFound.tsx` | Public | 404 |

### 11.2 App.tsx (Root Component)

- Sets up **BrowserRouter** with all 15+ routes
- Wraps in **QueryClientProvider** (TanStack Query)
- Includes **CookieConsent** banner
- Includes **CartProvider** (context for tracking selected notes in the shopping-cart-like flow)
- Includes **Toaster** (sonner)
- Sets up routes with `<ProtectedRoute>` wrapper where needed

### 11.3 Key Components

| Component | Purpose |
|---|---|
| **Header** | Nav bar with logo, nav links, user menu (role-based), search |
| **Footer** | Site footer with links |
| **ProtectedRoute** | Auth guard + role check (teacher/student) |
| **NoteCard** | Card showing note preview (title, price, image, teacher, school) |
| **NotesCarousel** | Horizontal scrolling carousel of NoteCards (per category) |
| **NoteDetailDialog** | Full note detail modal: preview, description, price, teacher info, request button |
| **RequestPaidNotesDialog** | Multi-step: select notes, enter contact info, upload receipt, submit → calls `create_note_request` RPC → inserts `request_notes` |
| **ReportNoteDialog** | Report a note form (reason, description, email) |
| **SearchFilters** | Combined search input + category/subcategory dropdown filter |
| **NotesLoading** | Skeleton loader for notes |
| **BookLoader** | Animated book icon loader |
| **ColorblindFilters** | CSS filter toggles for accessibility |
| **SettingsBootstrap** | Initializes user settings on first load |

### 11.4 Teacher Dashboard Components

| Component | Purpose |
|---|---|
| **UploadNoteForm** | Create/edit note with file upload, price, preview image |
| **TeacherNotesList** | Table of teacher's notes with edit/delete actions |
| **CategoryManagement** | CRUD categories and subcategories |
| **RequestManagement** | Incoming student requests: verify payment receipt, approve/reject/cancel |
| **RequestTracker** | Track request status changes |
| **TeacherPayments** | Payment history, submit payment proof (receipt screenshot) |
| **TeacherPaymentSettings** | Bank/wallet credentials management |
| **RefundManagement** | Process refunds for requests |
| **RefundScreenshotDialog** | Upload refund proof |
| **TeacherAnalytics** | Sales stats, charts |
| **TeacherReports** | View reports on own notes + submit appeals |
| **TeacherNotifications** | View in-app notifications |
| **TeacherApprovalPanel** | Display teacher approval status |
| **ProfileSettings** | Edit profile details |
| **ActivityLogs** | View own activity audit |
| **ClearDataDialog** | Clear local data confirmation |

---

## 12. Hooks

| Hook | Purpose |
|---|---|
| **useNotes()** | TanStack Query hooks: `useNotes` (filtered), `useAllNotes`, `useCategories`, `useSubcategories`, `useTeachers`, `useSchools`; all with staleTime, refetch on mount/window focus |
| **useNoteMutations()** | Mutations: `addNote`, `updateNote`, `deleteNote` (soft), `addCategory`, `updateCategory`, `deleteCategory`, `addSubcategory`, `updateSubcategory`, `deleteSubcategory`; all invalidate relevant queries |
| **useCurrency()** | Returns current currency config, `formatPrice()`, `convertPrice()`, available currencies; reads from CurrencyProvider context |
| **useActivityLogger()** | Static methods: `createNote`, `updateNote`, `deleteNote`, `addCategory`, `deleteCategory`, etc. — all insert into `activity_logs` table |
| **usePrefaceUrl()** | Gets public URL for `documents/Preface.docx` from Supabase storage |
| **use-mobile()** | Detects mobile viewport |
| **use-toast()** | shadcn/ui toast hook |

---

## 13. Utilities

| File | Exports | Purpose |
|---|---|---|
| `types.ts` | `Category`, `Subcategory`, `Teacher`, `Note`, `NoteRequest`, `RequestNote` | TypeScript interfaces |
| `currency.ts` | `CURRENCIES`, `getCurrencyByIP`, `DEFAULT_CURRENCY`, `formatPrice()`, currency configs | Multi-currency support (PKR/USD/CAD/JPY/CNY/EUR/GBP/SAR) with IP auto-detection via Apilayer |
| `payment-types.ts` | `ApprovedBank`, `BankCred`, `BankCredWithBank` | Payment credential types |
| `payment-utils.ts` | `categorizeBank()`, `isMobileWallet()`, `copyToClipboard()`, `saveRequestId()` | Payment helpers: EasyPaisa/JazzCash wallet detection, clipboard, localStorage |
| `request-id-validator.ts` | `validateRequestId()`, `FULL_PATTERN`, `PATTERN_REGEX` | Real-time validation of `REQ_XXXXXXXX_XXXX` format |
| `student-request-storage.ts` | `getStoredRequestIds()`, `saveRequestId()`, `removeRequestId()`, `addMultipleRequestIds()` | localStorage persistence of student request IDs |
| `image-proxy.ts` | `proxyImageUrl()` | Converts Supabase storage URLs to proxied edge function URLs for CORS/security |
| `utils.ts` | `cn()` | `clsx` + `tailwind-merge` class merging |
| `version.ts` | `VERSION`, `UPDATED` | Semantic version + last-updated date |

---

## 14. Data Flow

### 14.1 Student → Teacher Request Flow

```
Student browses notes (Index.tsx)
  → Opens NoteDetailDialog
  → Clicks "Request" → RequestPaidNotesDialog opens
  → Selects notes from cart, enters contact info, uploads receipt
  → Submits → calls create_note_request RPC (SECURITY DEFINER, works for anon)
    → Inserts note_requests row (status='pending', auto request_id + request_token)
  → Then inserts request_notes rows linking request to selected notes
  → Student receives request_id (e.g. REQ_A1B2C3D4_E5F6)
  → Teacher sees request in Dashboard → RequestManagement tab
  → Teacher verifies payment receipt → updates status to 'verified'
  → Teacher marks request as 'completed' → trigger generates download_code
  → Student enters download_code on /download page
    → redeem-download-code edge function validates + returns signed URLs
  → Student downloads files from private 'notes' bucket
```

### 14.2 Currency Detection Flow

```
App loads → client-gate edge function checks IP + fingerprint
CurrencyProvider mounts → tries IP-based detection via Apilayer
  → If successful: sets user currency, fetches FX rates from fx_rates table
  → Falls back: checks localStorage → defaults to PKR
  → FX rates refreshed by update-fx-rates cron job
  → All prices displayed via formatPrice() from useCurrency()
```

### 14.3 Payment Verification Flow

```
Student pays teacher directly (bank transfer / EasyPaisa / JazzCash)
  → Uploads receipt to 'receipts' storage bucket
  → Teacher reviews receipt in RequestManagement tab
  → Teacher verifies payment → request status = 'verified'
  → Teacher marks completed → download_code generated
  → Student downloads notes via unique download code
```

### 14.4 Auth Flow

```
User signs up → on_auth_user_created trigger:
  1. Creates profile row in public.profiles
  2. Creates 'pending' role in public.user_roles
  3. Creates default user_settings
Teacher approval → user_roles.role set to 'teacher'
User logs in → ProtectedRoute checks user role via user_roles table
  → Redirects to appropriate dashboard (teacher or student)
```

---

## 15. Deployment Configuration

### `netlify.toml`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: all routes → `index.html`
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
- CSP: restricts scripts to self + `'unsafe-inline'` (for shadcn), restricts connections to `https://*.supabase.co`, `https://*.apilayer.com`, `https://ipapi.co`, etc.

### `vite.config.ts`
- React plugin with Fast Refresh
- Path alias: `@/` → `src/`
- Build target: ES modules

### `package.json`
- Scripts: `dev`, `build`, `lint`, `preview`
- Dependencies: react 18, react-dom, react-router-dom, @tanstack/react-query, @supabase/supabase-js, tailwindcss, clsx, tailwind-merge, date-fns, lucide-react, sonner, dompurify, @codemirror/lang-json, @uiw/react-codemirror, recharts (charts)

---

## 16. Security Features

1. **RLS on all tables** — Every table has row-level security; policies enforce user isolation
2. **notes_public view** — `file_url` for paid notes returns NULL to anon users; free notes expose their file URL directly
3. **SELECT restricted** — Anon users can only SELECT `is_free = true` notes from the notes table (paid notes require auth)
4. **Private storage bucket** — `notes` bucket is non-public; file access is brokered exclusively through the `redeem-download-code` edge function (short-lived signed URLs)
5. **Image proxy** — `proxyImageUrl()` routes storage image requests through edge function to avoid leaking direct URLs
6. **Rate limiting** — `client-gate` edge function hashes IP + browser fingerprint; auto-blocks after 60 requests/minute
7. **Client blocking** — IP hashes / fingerprint hashes can be blocked in `blocked_clients` table
8. **Download code** — Unique, auto-generated download code per completed request; gates access to paid note files
9. **SECURITY DEFINER RPCs** — `create_note_request`, `log_activity` run with elevated privileges to bypass RLS for anon users during request submission
10. **CSP Headers** — Strict Content Security Policy deployed via Netlify headers
11. **Soft delete** — Notes are soft-deleted (`deleted_at` timestamp); `cleanup-deleted-notes` edge function permanently removes after 30 days
12. **Activity logging** — All significant actions logged to `activity_logs` table with user agent + IP
13. **Contact type validation** — `note_requests.contact_type` CHECK constraint limits to 'email', 'phone', or 'both'
14. **Blocked teacher protection** — RLS policies prevent creating requests for teachers marked as blocked (`profiles.is_blocked = false` check)
