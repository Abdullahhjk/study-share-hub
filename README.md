# Scholar Share

An educational marketplace where **teachers** upload and sell study notes, and **students** browse, download free notes instantly, or purchase premium (paid) notes via Bank Accounts. Includes a full admin panel for platform management.

**Version:** v1.00.7.2 | **Author:** M. Abdullah Waqas

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5 (SWC), Tailwind CSS 3, shadcn/ui |
| **State & Data** | TanStack React Query 5, React Hook Form + Zod |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions in Deno) |
| **Routing** | React Router DOM 6 |
| **Charts** | Recharts (Pie, Bar, Line) |
| **Icons** | Lucide React |
| **Dark Mode** | next-themes |
| **Deployment** | Netlify |

## Getting Started

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:8080`.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Production build + 404.html for SPA |
| `npm run build:dev` | Development build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint across all files |
| `npm run deploy` | Deploy to Netlify production |

## User Roles

| Role | Description |
|------|-------------|
| `pending` | Newly registered teacher awaiting admin approval |
| `teacher` | Approved — can upload/manage notes, handle requests |
| `admin` | Full platform access |
| `rejected` | Account denied; auto-deletes in 7 days |
| `deleted` | Account removed |

## Features

### Public Browsing (`/`)
- Browse notes in horizontal carousels organized by Category > Subcategory
- Search by title/description, filter by teacher or school
- Free notes: instant download via Supabase public URL
- Paid notes: cart system (single-teacher constraint) → off-platform payment via Bank Account → receipt upload → teacher verification → one-time download code
- Report inappropriate content (inappropriate, copyright, spam, etc.)

### Teacher Dashboard (`/dashboard`)
**Tabs:** My Notes | Upload | Requests | Refunds | Analytics | Categories | Activity | Notifications | Reports | Approvals (admin) | Settings

- Upload PDF notes + preview image in categories/subcategories
- Manage paid note requests — approve with auto-generated one-time download codes, or reject
- Refund management with screenshot proof
- Revenue analytics with Recharts (status pie, category bar, monthly trends)
- Activity logs, category CRUD, notification inbox, report appeals
- Profile settings (name, phone, school, avatar with history)

### Student Order Tracking (`/my-orders`)
- Track all note requests stored in localStorage (no server-side tracking)
- Statuses: Pending → Completed → Downloaded | Rejected → Refunded | Cancelled
- Approve/cancel, download via one-time codes, export/import via CSV
- Manual Request ID entry or CSV import

### One-Time Secure Download (`/download`)
- Short-lived (10 min) signed Supabase URLs via Edge Function
- One-time use codes — `download_code_used_at` prevents reuse
- Single PDF download or ZIP bundle (JSZip) for multiple notes
- PDF preview via iframe with sidebar navigation

### Admin Dashboard (`/admin`)
**Tabs:** Overview | Users | Notifications | Payments | Reports | Activity | Build ChangeLog

- Platform metrics: total users, notes, requests, gross/net revenue (15% commission)
- User management: edit, impersonate (secure magic link), delete (cascade via Edge Function)
- Notifications: targeted or broadcast, AI-enhanced via Cohere
- Financial breakdown: 15% platform / 85% teacher split, block/unblock teachers
- Note reports management with appeals handling
- AI-generated build report emails via Cohere, newsletter subscriber management

### Data Privacy (`/database-data`)
- GDPR-style viewer: profile, all notes, requests, activity logs, avatar history, trash
- Soft-deleted notes with 30-day recovery window
- Permanent delete or restore from trash

## Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Browse notes | Public |
| `/login` | Login / Signup / Reset password | Public |
| `/dashboard` | Teacher dashboard | Teacher / Admin |
| `/my-orders` | Student order tracker | Public (localStorage) |
| `/admin` | Admin dashboard | Admin only |
| `/database-data` | GDPR data viewer | Authenticated |
| `/download` | One-time download redeem | Public (with code) |
| `/reset-password` | Set new password | Auth link |
| `/help` | User manual | Public |
| `/privacy` | Privacy policy | Public |
| `/terms` | Terms & conditions | Public |
| `/unsubscribe` | Newsletter unsubscribe | Public |
| `*` | 404 | Public |

## Security
- One-time download codes with 10-minute signed URLs
- Supabase Storage bucket policies (no direct file access)
- Admin impersonation via secure Edge Function (no password exposure)
- Full activity logging with IP and user agent
- Private receipt storage in dedicated bucket
- Teacher approval gating — pending users cannot upload

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Root with routing + ThemeProvider
├── index.css                # Tailwind + design system CSS variables
├── lib/                     # Types, utilities (cn helper)
├── hooks/                   # React Query hooks, mutations, utils
├── integrations/supabase/   # Client + DB type generation
├── pages/                   # All route pages
├── components/
│   ├── ui/                  # shadcn/ui primitives (49 components)
│   ├── dashboard/           # Teacher dashboard components
│   └── admin/               # Admin dashboard components
├── animations/              # Lottie animation files
supabase/
├── migrations/              # 10 SQL migrations
└── functions/               # 6 Edge Functions (Deno)
```

## Environment

Copy `.env.example` (or see `.env`) and configure:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Version Bumping

`npm run build` triggers the prebuild script which interactively prompts for a new version string. Written to `version.ts` with a timestamp.

## License

Private project — all rights reserved.
