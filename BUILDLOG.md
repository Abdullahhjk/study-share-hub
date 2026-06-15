# Build Log

## 2026-06-01 — Teacher Payment Methods & Download Code Delivery

### New
- **TeacherPaymentSettings** — full CRUD component for managing bank accounts and mobile wallets
- **lib/payment-types.ts** — TypeScript interfaces for `ApprovedBank`, `BankCred`, `BankCredWithBank`
- **lib/payment-utils.ts** — utilities for mobile wallet detection, clipboard copy, request ID persistence
- Supabase tables: `approved_banks` (curated bank list), `bank_creds` (teacher credentials)

### Changed
- **RequestPaidNotesDialog** — major rework: payment method selector (Select dropdown) replaces static teacher contact; IBAN/account display with copy-to-clipboard; distinguishes mobile wallets vs Islamic banks
- **ProfileSettings** — integrated TeacherPaymentSettings below profile card; icons updated
- **RequestTracker** — status descriptions updated for download-code delivery flow
- **Header** — RequestTracker always visible (removed `hidden sm:block`)
- **Supabase types** — added `approved_banks`, `bank_creds` table types; `bank_ids` JSON field on profiles

## 2026-05-28 — Currency Pricing System Rollout

### New
- **CurrencyProvider** — multi-currency context wrapping the app
- **lib/currency.ts** — currency formatting and conversion utilities
- Supabase types extended with currency-related fields

### Changed
- **EditNoteDialog** — major rework: integrated currency selection, dynamic price display, improved edit flow
- **SettingsDialog** — expanded to host Currency + Appearance sections together
- **NotesLoading** — overhauled loading state UI
- **PaymentsTab** — simplified admin payments view, removed bloat
- **NoteCard / NoteDetailDialog / RequestPaidNotesDialog** — UI consistency updates for currency display
- **Dashboard / Index / StudentDashboard / YourData pages** — wired into currency context
- **OverviewTab / UsersTab** — admin panel alignment
- **version.ts** — bumped
