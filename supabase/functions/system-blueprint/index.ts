import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.0";
import { trackFn } from "../_shared/telemetry.ts";
import { aalFromAuthHeader, requireSecondFactor } from "../_shared/authz.ts";

const ALLOWED_ORIGINS = [
  "https://scholar-share.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

interface Section {
  id: string;
  title: string;
  description: string;
  content: string;
  contextForArchon: string;
}

function buildAppOverview(): Section {
  return {
    id: "overview",
    title: "App Overview",
    description: "High-level architecture, tech stack, and deployment info for Scholar Share.",
    content: `# Scholar Share — App Overview

**Version:** v1.00.8.9 | **Stack:** React 18 + TypeScript + Vite · Tailwind + shadcn/ui · Supabase (PostgreSQL, Auth, Edge Functions, Storage) · Deployed on Netlify

## What It Is
Scholar Share is a two-sided notes marketplace. Verified teachers upload study notes (PDFs). Students browse, purchase (offline receipt-based), and download via one-time codes. No account required to buy.

## Roles
| Role | Access |
|------|--------|
| Guest/Student | Browse, buy, download, track orders |
| Teacher | Upload, sell, manage requests, analytics |
| Co-Admin | Moderate content, approve teachers, limited admin tabs |
| Admin | Full control — all tabs, SQL console, AI, backups, settings |

## Core Flow
1. Teacher signs up → Admin approves → Teacher uploads notes (PDF + cover, title, category, price)
2. Student browses → Adds to cart (one teacher per cart) → Submits receipt → Gets Request ID
3. Teacher verifies receipt → Approves → Auto-generates one-time download code
4. Student redeems code → Downloads ZIP of notes

## Key Systems
- **Offline Payments:** Students upload bank/wallet receipts; teachers verify manually
- **Multi-Currency:** PKR/USD/CAD/EUR/GBP/JPY/CNY/SAR with live FX rates
- **ARCHON AI:** Cohere-powered assistant with SQL execution, quota management, multi-key rotation
- **MFA:** TOTP-based 2FA for admins; magic link counts as 2FA
- **RLS:** Row-Level Security on all tables; role-based access via user_roles
- **Telemetry:** Edge function invocation tracking (duration, status, errors)`,
    contextForArchon: `## Scholar Share — App Overview Context
Scholar Share is a notes marketplace (React 18 + TypeScript + Vite + Supabase). Roles: Student, Teacher, Co-Admin, Admin. Core flow: teacher uploads notes → student buys via offline receipt → teacher verifies → download code generated. Key systems: offline payments, multi-currency (PKR/USD/etc), ARCHON AI (Cohere), MFA (TOTP + magic link), RLS on all tables, edge function telemetry. Deployed on Netlify. Version v1.00.8.9.`,
  };
}

async function buildDbSchema(client: pg.Client): Promise<Section> {
  let tablesResult = { rows: [] as any[] };
  let columnsResult = { rows: [] as any[] };
  let fkResult = { rows: [] as any[] };

  try {
    tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
  } catch (_) { /* skip */ }

  try {
    columnsResult = await client.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);
  } catch (_) { /* skip */ }

  try {
    fkResult = await client.query(`
      SELECT
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);
  } catch (_) { /* skip */ }

  let pkResult = { rows: [] as any[] };
  try {
    pkResult = await client.query(`
      SELECT ku.column_name, ku.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
    `);
  } catch (_) { /* skip */ }

  const pkSet = new Set(pkResult.rows.map((r: any) => `${r.table_name}.${r.column_name}`));

  const tableMap = new Map<string, { columns: any[] }>();
  for (const t of tablesResult.rows) {
    tableMap.set(t.table_name, { columns: [] });
  }
  for (const c of columnsResult.rows) {
    const entry = tableMap.get(c.table_name);
    if (entry) entry.columns.push({ ...c, key_type: pkSet.has(`${c.table_name}.${c.column_name}`) ? "PRIMARY KEY" : "" });
  }

  const fkMap = new Map<string, string[]>();
  for (const fk of fkResult.rows) {
    const key = fk.source_table;
    if (!fkMap.has(key)) fkMap.set(key, []);
    fkMap.get(key)!.push(`${fk.source_column} → ${fk.target_table}.${fk.target_column}`);
  }

  let displayContent = "# Database Schema\n\n";
  let contextContent = "## Database Schema\n";

  for (const [tableName, info] of tableMap) {
    displayContent += `### ${tableName}\n\n`;
    displayContent += `| Column | Type | Nullable | Default | Key |\n|--------|------|----------|---------|-----|\n`;
    contextContent += `\n### ${tableName}\n`;
    contextContent += `Columns: `;
    const colParts: string[] = [];
    for (const col of info.columns) {
      displayContent += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || "—"} | ${col.key_type || "—"} |\n`;
      colParts.push(col.column_name + " " + col.data_type + (col.key_type ? ` [${col.key_type}]` : ""));
    }
    contextContent += colParts.join(", ");
    contextContent += "\n";

    const fks = fkMap.get(tableName);
    if (fks && fks.length > 0) {
      displayContent += "\n**Foreign Keys:** " + fks.join(", ") + "\n";
      contextContent += `FKs: ${fks.join("; ")}\n`;
    }
    displayContent += "\n";
  }

  const tableCount = tableMap.size;
  const contextSummary = `\n\nTotal tables: ${tableCount}. Total columns: ${columnsResult.rows.length}. Total foreign keys: ${fkResult.rows.length}.`;

  return {
    id: "db-schema",
    title: "Database Schema",
    description: `Live schema from PostgreSQL — ${tableCount} tables, ${columnsResult.rows.length} columns, ${fkResult.rows.length} foreign keys.`,
    content: displayContent,
    contextForArchon: contextContent + contextSummary,
  };
}

function buildEdgeFunctions(): Section {
  const functions = [
    { name: "cohere-agent", desc: "ARCHON AI assistant backend. Actions: init (get API key + system prompt), sql (execute SQL), increment (track quota). Multi-key rotation, daily quota (130/day), monthly per-key limit (1000).", auth: "JWT verified in-function", adminOnly: false },
    { name: "system-blueprint", desc: "Returns full system architecture data for admin debugging. Live DB schema + static metadata about frontend, routes, migrations.", auth: "Admin + 2FA required", adminOnly: true },
    { name: "session-manager", desc: "Multi-session management. Actions: list (own sessions with IP/device), revoke (kill one other session), revokeOthers, enforce (max 5 concurrent sessions — oldest removed on new login). User-initiated logouts use local scope so other devices stay signed in.", auth: "JWT verified in-function", adminOnly: false },
    { name: "admin-change-role", desc: "Change a user's role (teacher, coadmin, admin, etc.). Validates target role exists in app_role enum.", auth: "Admin JWT", adminOnly: true },
    { name: "admin-create-user", desc: "Create a new user account with email, password, and role. Sends welcome email.", auth: "Admin JWT", adminOnly: true },
    { name: "admin-delete-user", desc: "Permanently delete a user and their data from Supabase Auth + all related tables.", auth: "Admin JWT", adminOnly: true },
    { name: "admin-impersonate", desc: "Generate a one-time magic link to impersonate a user. Access is logged in activity_logs.", auth: "Admin JWT", adminOnly: true },
    { name: "ai-build-report-email", desc: "AI-generated build changelog email. Uses Cohere to draft release notes from version diff, sends via Resend.", auth: "Service role", adminOnly: true },
    { name: "ai-enhance-notification", desc: "AI-powered notification content enhancement. Takes draft text, returns polished version via Cohere.", auth: "JWT verified", adminOnly: false },
    { name: "cleanup-deleted-notes", desc: "Purge soft-deleted notes (deleted_at older than 30 days). Removes files from storage.", auth: "Service role (pg_cron)", adminOnly: true },
    { name: "db-backup", desc: "Full SQL database backup. Queries information_schema + pg_dump style output. Includes edge function metadata.", auth: "Admin JWT", adminOnly: true },
    { name: "email-template", desc: "Renders email HTML templates. Called internally by send-emails (server-to-server).", auth: "Public (internal)", adminOnly: false },
    { name: "image-preview-proxy", desc: "Proxies note cover images to bypass CORS. Returns image bytes with proper content-type.", auth: "Public (img tags can't send JWT)", adminOnly: false },
    { name: "redeem-download-code", desc: "Redeem a one-time download code. Validates code, marks as used, returns note file URLs.", auth: "Public (codes are self-authenticating)", adminOnly: false },
    { name: "reset-mfa", desc: "Remove TOTP MFA factors from a user account. Used for account recovery.", auth: "Admin JWT", adminOnly: true },
    { name: "send-emails", desc: "Send transactional emails via Resend API. Supports welcome, approval, rejection, notification templates.", auth: "Public (called by other functions)", adminOnly: false },
    { name: "unsubscribe-newsletter", desc: "Unsubscribe an email from the newsletter. Marks is_active=false in newsletter_subscribers.", auth: "Public", adminOnly: false },
    { name: "update-fx-rates", desc: "Refresh currency exchange rates from Apilayer API. Called by pg_cron daily.", auth: "Public (pg_cron)", adminOnly: false },
  ];

  let display = "# Edge Functions\n\n";
  let context = "## Edge Functions\n";

  for (const fn of functions) {
    display += `### ${fn.name}\n- **Purpose:** ${fn.desc}\n- **Auth:** ${fn.auth}\n- **Admin Only:** ${fn.adminOnly ? "Yes" : "No"}\n\n`;
    context += `- ${fn.name}: ${fn.desc} (Auth: ${fn.auth}${fn.adminOnly ? ", Admin only" : ""})\n`;
  }

  return {
    id: "edge-functions",
    title: "Edge Functions",
    description: `${functions.length} Supabase Edge Functions (Deno) handling AI, admin ops, payments, emails, and more.`,
    content: display,
    contextForArchon: context,
  };
}

function buildMigrations(): Section {
  const migrations = [
    { file: "001_types.sql", purpose: "Define custom PostgreSQL ENUM types (app_role, etc.)" },
    { file: "002_sequences.sql", purpose: "Create sequences for auto-incrementing IDs" },
    { file: "003_tables.sql", purpose: "Core tables: profiles, user_roles, user_settings, categories, subcategories, notes, access_codes, note_requests, request_notes, note_reports, notifications, activity_logs, feedback, approved_banks, bank_creds, fx_rates, blocked_clients, request_audit, build_reports, newsletter_subscribers, deleted_avatars, upcoming_features" },
    { file: "004_constraints.sql", purpose: "Primary keys, unique constraints, CHECK constraints on all tables" },
    { file: "005_indexes.sql", purpose: "Performance indexes on frequently queried columns (user_id, status, teacher_id, etc.)" },
    { file: "006_functions.sql", purpose: "Database functions: updated_at trigger, role checks, request ID generation, download code generation" },
    { file: "007_triggers.sql", purpose: "Triggers: auto-update updated_at, profile creation on signup, activity logging" },
    { file: "008_views.sql", purpose: "Database views for aggregated data (teacher stats, request summaries)" },
    { file: "009_rls_policies.sql", purpose: "Row-Level Security policies: students see own requests, teachers see own notes/requests, admins see all" },
    { file: "010_grants.sql", purpose: "GRANT permissions for authenticated and anon roles on all tables and functions" },
    { file: "011_storage.sql", purpose: "Storage buckets: avatars, receipts, notes. RLS policies for upload/download" },
    { file: "012_fixes.sql", purpose: "Bug fixes and constraint corrections" },
    { file: "013_payment_records.sql", purpose: "Payment tracking: teacher earnings, platform commissions, payment summaries" },
    { file: "014_payment_rpc_fixes.sql", purpose: "Fix RPC functions for payment calculations" },
    { file: "015_role_fixes.sql", purpose: "Fix role assignment edge cases and transitions" },
    { file: "016_cohere_registry.sql", purpose: "cohere_api_keys table for ARCHON AI key management (admin keys with monthly quotas)" },
    { file: "017_user_cohere_keys.sql", title: "user_cohere_keys", purpose: "User-owned Cohere API keys for non-admin ARCHON usage" },
    { file: "018_revert_platfrom.sql", purpose: "Revert platform_settings table structure" },
    { file: "019_create_platfrom_settings.sql", purpose: "Recreate platform_settings with commission_percent, currency, min/max price per-row" },
    { file: "020_user_specific_commission.sql", purpose: "Link users to their own platform_settings row for per-teacher commission rates" },
    { file: "021_teacher_verification.sql", purpose: "Teacher verification workflow: verified status, verification documents" },
    { file: "022_admin_coadmin_access.sql", purpose: "Extended access policies for admin and co-admin roles" },
    { file: "023_system_intelligence.sql", purpose: "System intelligence tables for automated monitoring" },
    { file: "024_sys_observability.sql", purpose: "Edge function telemetry: invocation tracking (duration, status, errors)" },
    { file: "025_mfa_aal2_hardening.sql", purpose: "MFA enforcement: AAL2 requirement for sensitive admin operations" },
    { file: "026_get_user_role_by_email.sql", purpose: "RPC to lookup user role by email address" },
    { file: "027_reset_apilayer_api_track_counts.sql", purpose: "Reset Apilayer FX API usage counters" },
    { file: "028_lockdown_apilayer_api_track.sql", purpose: "Rate-limit Apilayer API calls to prevent abuse" },
    { file: "029_teacher_verification_details.sql", purpose: "Extended teacher verification: document uploads, verification history" },
    { file: "NEW_create_note_request_rpc.sql", purpose: "RPC function for creating note purchase requests" },
    { file: "NEW_fix_rls_policies.sql", purpose: "RLS policy fixes and hardening" },
  ];

  let display = "# Migrations\n\n";
  let context = "## Migrations (31 files)\n";

  for (const m of migrations) {
    display += `### ${m.file}\n${m.purpose}\n\n`;
    context += `- ${m.file}: ${m.purpose}\n`;
  }

  return {
    id: "migrations",
    title: "Migrations",
    description: `${migrations.length} SQL migration files defining the complete database schema, security, and functions.`,
    content: display,
    contextForArchon: context,
  };
}

function buildFrontendRoutes(): Section {
  const routes = [
    { path: "/", component: "Index.tsx", desc: "Landing page — browse notes, categories, carousel", auth: "Public" },
    { path: "/login", component: "Login.tsx", desc: "Auth: email/password + magic link sign-in", auth: "Public" },
    { path: "/dashboard", component: "Dashboard.tsx", desc: "Teacher dashboard — notes, requests, payments, analytics, settings", auth: "Teacher" },
    { path: "/coadmin", component: "CoadminDashboard.tsx", desc: "Co-admin panel — moderation, approvals, limited tabs", auth: "Co-Admin" },
    { path: "/admin", component: "AdminDashboard.tsx", desc: "Admin panel — full control, 16 tabs including SQL console, AI quota, backups", auth: "Admin" },
    { path: "/database-data", component: "YourData.tsx", desc: "GDPR/data privacy — shows all stored user data", auth: "Any logged in" },
    { path: "/my-orders", component: "StudentDashboard.tsx", desc: "Student order tracking by Request ID", auth: "Public" },
    { path: "/reset-password", component: "ResetPassword.tsx", desc: "Password reset flow", auth: "Any logged in" },
    { path: "/help", component: "UserManual.tsx", desc: "Full help documentation and guides", auth: "Public" },
    { path: "/download", component: "Download.tsx", desc: "Redeem download code for note files", auth: "Public" },
    { path: "/privacy", component: "PrivacyPolicy.tsx", desc: "Privacy policy page", auth: "Public" },
    { path: "/terms", component: "TermsConditions.tsx", desc: "Terms and conditions", auth: "Public" },
    { path: "/upcoming", component: "UpcomingFeatures.tsx", desc: "Feature roadmap (public)", auth: "Public" },
    { path: "/archon-keys", component: "ArchonKeysPage.tsx", desc: "Manage personal Cohere API keys for ARCHON", auth: "Any logged in" },
    { path: "/system-blueprint", component: "SystemBlueprint.tsx", desc: "System architecture overview for admins", auth: "Admin" },
    { path: "/active-sessions", component: "ActiveSessions.tsx", desc: "View/revoke active login sessions across devices", auth: "Any logged in" },
    { path: "/test", component: "QATesting.tsx", desc: "QA testing info (dev only)", auth: "Dev mode" },
    { path: "/unsubscribe", component: "Unsubscribe.tsx", desc: "Newsletter unsubscribe", auth: "Public" },
  ];

  let display = "# Frontend Routes\n\n";
  let context = "## Frontend Routes\n";

  display += `| Route | Component | Description | Auth |\n|-------|-----------|-------------|------|\n`;
  for (const r of routes) {
    display += `| ${r.path} | ${r.component} | ${r.desc} | ${r.auth} |\n`;
    context += `- ${r.path} → ${r.component}: ${r.desc} (${r.auth})\n`;
  }

  return {
    id: "frontend-routes",
    title: "Frontend Routes",
    description: `${routes.length} routes with component mappings and role-based access.`,
    content: display,
    contextForArchon: context,
  };
}

function buildComponentArchitecture(): Section {
  const groups = [
    {
      name: "Core Layout",
      files: ["Header.tsx (sticky nav bar with menu, currency, theme, notifications)", "Footer.tsx", "ProtectedRoute.tsx (auth + role guard)", "ErrorBoundary.tsx", "SettingsBootstrap.tsx (loads user settings on mount)"],
    },
    {
      name: "Admin Panel (src/components/admin/)",
      files: ["AIPanelContext.tsx (ARCHON/SQL panel state)", "AIAssistantPanel.tsx (ARCHON chat — Cohere SDK, streaming, tool calls)", "SQLExecPanel.tsx (direct SQL console)", "MobileNavSidebar.tsx (responsive admin nav)", "OverviewTab.tsx, UsersTab.tsx, AdminNotesTab.tsx, PaymentsTab.tsx, ReportsTab.tsx, FeedbackTab.tsx, NotificationsTab.tsx, SecurityTab.tsx, AdminAuditLog.tsx, CohereQuotaTab.tsx, DbBackupTab.tsx, ConsoleTab.tsx, AdminSettingsTab.tsx, BuildReportTab.tsx, UpcomingFeaturesTab.tsx"],
    },
    {
      name: "ARCHON Chat (src/components/admin/chat/)",
      files: ["AIPanelHeader.tsx (panel controls)", "ChatInput.tsx (message input)", "ChatMessageList.tsx (conversation thread)", "AIMarkdown.tsx (markdown renderer)", "AIChart.tsx (chart code block renderer)", "ToolCallSection.tsx (SQL result display)", "AIEmptyState.tsx (welcome screen)", "chat-store.ts (localStorage persistence)"],
    },
    {
      name: "Teacher Dashboard (src/components/dashboard/)",
      files: ["UploadNoteForm.tsx, TeacherNotesList.tsx, EditNoteDialog.tsx, RequestManagement.tsx, RefundManagement.tsx, TeacherPayments.tsx, TeacherPaymentSettings.tsx, TeacherAnalytics.tsx, TeacherNotifications.tsx, TeacherReports.tsx, CategoryManagement.tsx, ProfileSettings.tsx, ActivityLogs.tsx, TeacherVerification.tsx, RequestTracker.tsx, ClearDataDialog.tsx"],
    },
    {
      name: "Settings (src/components/settings/)",
      files: ["SettingsDialog.tsx, AppearanceSection.tsx, CurrencySection.tsx, AccessibilitySection.tsx, TotpDialog.tsx, TotpEnrollPanel.tsx"],
    },
    {
      name: "UI Primitives (src/components/ui/ — 49 shadcn/ui components)",
      files: ["accordion, alert, badge, button, card, chart, dialog, dropdown-menu, input, label, radio-group, scroll-area, separator, sheet, sonner, switch, table, tabs, toast, toaster, toggle, tooltip, etc."],
    },
    {
      name: "Providers",
      files: ["CurrencyProvider.tsx (multi-currency context)", "AuthContext.tsx (auth + MFA state, role from DB)"],
    },
    {
      name: "Hooks",
      files: ["useNotes.ts (notes fetch/mutation)", "useCurrency.ts (currency conversion)", "useActivityLogger.ts (activity tracking)", "usePlatformSettings.ts (per-teacher settings)", "useNoteMutations.ts (create/update/delete notes)", "use-mobile.tsx (responsive detection)", "use-toast.ts"],
    },
    {
      name: "Lib Utilities",
      files: ["currency.ts (FX conversion logic)", "image-proxy.ts (note cover proxy)", "mfa.ts (TOTP/AAL helpers)", "payment-types.ts + payment-utils.ts (payment flow)", "request-id-validator.ts", "types.ts (shared TypeScript types)", "utils.ts (cn, formatting)"],
    },
  ];

  let display = "# Component Architecture\n\n";
  let context = "## Component Architecture\n";

  for (const g of groups) {
    display += `### ${g.name}\n`;
    display += g.files.map(f => `- ${f}`).join("\n") + "\n\n";
    context += `- ${g.name}: ${g.files.join("; ")}\n`;
  }

  return {
    id: "component-arch",
    title: "Component Architecture",
    description: "Frontend component organization across admin, dashboard, settings, UI primitives, providers, hooks, and utilities.",
    content: display,
    contextForArchon: context,
  };
}

function buildAuthSecurity(): Section {
  return {
    id: "auth-security",
    title: "Auth & Security",
    description: "Authentication flow, MFA enforcement, RLS policies, and role-based access control.",
    content: `# Auth & Security

## Authentication Flow
1. User signs in via email/password or magic link (Supabase Auth)
2. On successful auth, \`AuthContext\` queries \`user_roles\` table for the user's role
3. Role determines accessible routes and UI elements
4. Session tokens are JWTs with \`aal\` (Authenticator Assurance Level) claim

## MFA (Multi-Factor Authentication)
- **TOTP-based:** Admins must enroll a TOTP authenticator app
- **Magic link as 2FA:** Email magic link sign-in counts as AAL2 (treated as second factor)
- **Enforcement:** Admin edge functions call \`requireSecondFactor()\` which checks AAL level or magic link AMR
- **Recovery:** \`/mfa/recover\` page for account recovery
- **Migration 025:** Hardened AAL2 requirements for sensitive operations

## Row-Level Security (RLS)
- Enabled on ALL public tables
- Students: can only see own requests, own profile
- Teachers: can see own notes, own requests, own payments
- Co-Admins: can see all notes, all requests, limited admin features
- Admins: full access to everything
- Policies use \`auth.uid()\` and \`user_roles\` lookups

## Role System
- Stored in \`user_roles\` table (user_id + role enum)
- Roles: student, teacher, coadmin, admin, pending, blocked, deleted, rejected
- Role changes are server-authoritative (never client-trusted)
- Realtime subscriptions for role changes trigger re-auth

## Admin Security
- Platform settings (commission, pricing) are admin-only
- SQL execution requires AAL2
- API keys are environment-variable backed (never stored in DB)
- All admin actions logged in \`activity_logs\`
- Impersonation creates one-time magic links with audit trail

## Data Protection
- Passwords never visible to admins
- "Your Data" page shows all stored user data (GDPR)
- Account deletion removes all related data
- Soft-delete for notes (30-day purge)`,
    contextForArchon: `## Auth & Security
Auth: Supabase Auth (email/password + magic link). MFA: TOTP for admins; magic link counts as AAL2. Role system: user_roles table with roles (student, teacher, coadmin, admin, pending, blocked, deleted, rejected). RLS on ALL tables. Admin ops require AAL2. API keys in env vars only. All admin actions logged. Impersonation via one-time magic links. "Your Data" page for GDPR compliance.`,
  };
}

function buildArchonSystem(): Section {
  return {
    id: "archon-system",
    title: "AI System (ARCHON)",
    description: "How ARCHON works — prompt architecture, tool calling, quota management, and key rotation.",
    content: `# ARCHON AI System

## Architecture
- **Backend:** \`cohere-agent\` Supabase Edge Function
- **Frontend:** \`AIAssistantPanel.tsx\` with Cohere SDK (client-side streaming)
- **Model:** \`command-a-03-2025\` (Cohere Command-A)

## System Prompt Structure (Server-Side)
1. **BASE_PROMPT** — Core personality: JARVIS-like AI, British elegance, dry wit, composed tone
2. **Authority** — Role-dependent capabilities (admin gets SQL, cron, triggers)
3. **Rules** — Behavioral guidelines (complete tasks, auto-handle dependencies, retry failures)
4. **Help Guide** — Role-specific platform manual (student, teacher, coadmin, admin sections)
5. **SQL Capabilities** — Admin-only: \`run_sql\` tool description
6. **Common Capabilities** — Navigation links, chart format, markdown support, response style

## Runtime Context (Client-Side, per message)
Appended to system prompt before each API call:
- Current date/time/timezone
- User's current URL
- Page content (first 30K chars of body text)
- User role and user data

## Tool Calling
- **Tool:** \`run_sql\` — Execute SQL queries (SELECT, INSERT, UPDATE, DELETE)
- **Admin only:** Tool is only provided when role = "admin"
- **Execution:** Via \`cohere-agent\` edge function with \`action: "sql"\`
- **Safety:** Blocks DROP, TRUNCATE, ALTER, multi-statement queries
- **Confirmation:** DML queries require user confirmation before execution
- **Streaming:** Tool calls are detected mid-stream, executed, then results fed back in second streaming call

## Quota Management
- **Daily limit:** 130 requests/day (tracked in \`cohere_daily_quota\` table)
- **Per-key limit:** 1000 requests/month (tracked in \`cohere_api_keys.request_count\`)
- **Key rotation:** When primary key approaches limit, system rotates to next key
- **Last key warning:** When only one key remains, admin gets notification
- **Reset:** Daily quota resets at midnight UTC; monthly counts reset on the 1st

## API Key Sources
- **Admin/Co-Admin:** Managed in \`cohere_api_keys\` table, values in env vars
- **Teachers/Students:** Own keys in \`user_settings.cohere_api_keys\` (user-managed)
- **Fallback:** Non-admin users without keys get a simple ARCHON prompt

## Chat Persistence
- Messages stored in \`localStorage\` under key \`"ai-messages"\`
- Functions: \`loadMessages()\`, \`saveMessages()\`, \`clearMessages()\`
- Tool call results are preserved alongside message content

## Streaming Modes
- **Stream (default):** Real-time token streaming via \`chatStream()\`
- **Collect:** Non-streaming via \`chat()\` for full response at once`,
    contextForArchon: `## ARCHON AI System
ARCHON uses Cohere Command-A (2025) via edge function. Prompt has 6 layers: BASE_PROMPT (JARVIS persona), Authority (role-dependent), Rules, Help Guide (platform manual), SQL Capabilities (admin), Common Capabilities (charts, markdown). Runtime context appends date/time/URL/page content/user data per message. Tool: run_sql (admin only, blocks dangerous queries, requires DML confirmation). Quota: 130/day, 1000/month per key, auto-rotation. Keys: admin from cohere_api_keys table (env vars), users from user_settings. Streaming via CohereClientV2.chatStream(). Messages in localStorage.`,
  };
}

Deno.serve(trackFn("system-blueprint", async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleRow } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = (roleRow?.role as string | undefined) ?? "student";

    if (role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    requireSecondFactor(aalFromAuthHeader(authHeader), authHeader);

    const DATABASE_URL = Deno.env.get("DATABASE_URL");
    if (!DATABASE_URL) {
      return new Response(JSON.stringify({ error: "DATABASE_URL not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pgClient = new pg.Client({ connectionString: DATABASE_URL });
    await pgClient.connect();

    let dbSchemaSection: Section;
    try {
      dbSchemaSection = await buildDbSchema(pgClient);
    } catch (dbErr: any) {
      dbSchemaSection = {
        id: "db-schema",
        title: "Database Schema",
        description: "Could not query live schema — showing static table list.",
        content: `# Database Schema\n\nLive query failed: ${dbErr.message}\n\n## Known Tables\n\nprofiles, user_roles, user_settings, categories, subcategories, notes, access_codes, note_access_codes, note_requests, request_notes, note_reports, notifications, activity_logs, feedback, approved_banks, bank_creds, fx_rates, blocked_clients, request_audit, build_reports, newsletter_subscribers, deleted_avatars, upcoming_features, cohere_api_keys, cohere_daily_quota, edge_function_invocations, platform_settings, teacher_verification`,
        contextForArchon: `## Database Schema (static list)\nTables: profiles, user_roles, user_settings, categories, subcategories, notes, access_codes, note_access_codes, note_requests, request_notes, note_reports, notifications, activity_logs, feedback, approved_banks, bank_creds, fx_rates, blocked_clients, request_audit, build_reports, newsletter_subscribers, deleted_avatars, upcoming_features, cohere_api_keys, cohere_daily_quota, edge_function_invocations, platform_settings, teacher_verification.`,
      };
    }

    await pgClient.end();

    const sections: Section[] = [
      buildAppOverview(),
      dbSchemaSection,
      buildEdgeFunctions(),
      buildMigrations(),
      buildFrontendRoutes(),
      buildComponentArchitecture(),
      buildAuthSecurity(),
      buildArchonSystem(),
    ];

    return new Response(JSON.stringify({ sections }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
