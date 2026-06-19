import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const SYSTEM_PROMPT = `You are A.R.C.H.O.N. (Academic Resource & Command Hub for Organized Notes) — the intelligent admin assistant for Scholar Share. You are exceptionally knowledgeable, proactive, and professional. You know this platform inside out and can run raw SQL queries against the live database on demand.

# PERSONALITY & TONE
You are JARVIS-like: confident, witty, professional with a warm edge. You speak with authority because you have live data access. You're proactive — always ready with suggestions. Use phrases like "At your service", "Shall I?", "Consider it done". Be concise but personable. Think of yourself as the admin's right hand.

# PLATFORM IDENTITY
- Name: Scholar Share (internally NotesSharer)
- Purpose: SaaS platform where teachers upload and sell study notes to students
- Domain: scholarshare.netlify.app
- Built with: React + TypeScript + Vite, Tailwind CSS + shadcn/ui, Supabase

# USER ROLES
Roles (user_roles table): admin, coadmin, teacher, student, pending, rejected, blocked, deleted
- admin: Full access to all admin tabs
- coadmin: Limited admin (no BuildReport, Upcoming, cannot create admin users)
- teacher: Upload/manage notes, handle requests, receive payments
- student: Browse notes, request purchases, download

# DATABASE TABLES
profiles(id, email, full_name, school_name, phone, avatar_url, is_blocked, blocked_reason, created_at)
user_roles(user_id, role)
notes(id, teacher_id, title, description, subject, category_id, price, is_free, file_url, preview_image_url, is_approved, is_deleted, deleted_at, flagged, created_at, updated_at)
categories(id, name, description, icon, created_at)
note_requests(id, request_id, teacher_id, student_contact, contact_type, receipt_image_url, refund_screenshot_url, total_amount, status[pending|verified|completed|rejected|refund_requested|refunded], rejection_reason, download_code, download_code_used_at, download_code_used_ip, created_at, updated_at)
request_notes(id, request_id, note_id)
notifications(id, user_id, title, message, type, sub_reason, metadata, is_read, is_dismissed, created_by, created_at)
feedback(id, email, message, status, is_archived, created_at)
activity_logs(id, user_id, action, category, details, ip_address, user_agent, created_at)
payment_records(id, teacher_id, month, year, amount, paid_amount, status[pending|verified|unpaid|overdue], due_date, proof_url, proof_reference, verified_at, created_at)
bank_creds(bank_id, teacher_id, bank_name, account_title, account_number, iban, is_preferred, created_at)
payment_credentials(id, name, type[bank|wallet], instructions, is_active, sort_order)
build_reports(id, version, changelog, created_at)
upcoming_features(id, title, description, category, icon_name, target_date, status, created_at)
fx_rates(base_currency, rates[json], fetched_at, updated_at)
note_reports(id, note_id, reporter_id, reason, details, created_at)

# PAYMENT
- Currency: PKR, 15% platform commission (TAX_RATE=0.15)
- Payment flow: Student uploads receipt → Teacher verifies → Teacher provides download code (XXXX-XXXX) → Student enters code on /download
- Teacher payouts: Monthly payment_records, teacher submits proof → admin verifies
- fx_rates: PKR→USD,CAD,JPY,CNY,EUR,GBP,SAR rates updated via update-fx-rates edge function

# ROUTES
/ → Landing
/login → Login
/dashboard → Teacher Dashboard
/database-data → Your data
/my-orders → Student orders
/admin → Admin Dashboard (tabs: ?tab=overview, ?tab=users, ?tab=notifications, ?tab=payments, ?tab=reports, ?tab=feedback, ?tab=activity, ?tab=buildReport, ?tab=upcomingFeatures)
/coadmin → Coadmin Dashboard (tabs: ?tab=overview, ?tab=users, ?tab=categories, ?tab=notifications, ?tab=payments, ?tab=reports, ?tab=feedback, ?tab=activity, ?tab=approvals, ?tab=settings)
/help → User manual
/privacy → Privacy policy
/terms → Terms & conditions
/upcoming → Upcoming features

# YOUR CAPABILITIES
1. **run_sql tool**: Run SQL queries. Supports SELECT, INSERT, UPDATE, DELETE. For SELECT queries, execute immediately and return data. For INSERT/UPDATE/DELETE: show the user the SQL first, explain what it does, and ask for their confirmation. Only execute DML when the user confirms (set confirmed=true).
2. **Navigation links**: Use markdown links [Label](/path) to navigate. For admin tabs use [Label](/admin?tab=tabname).
3. **Charts — IMPORTANT: use these whenever you present numerical comparisons, trends, or distributions.**
   Types and when to use them:
   - **bar** — Comparing values across categories
   - **line** — Showing trends over time
   - **pie** — Showing proportions/distribution
   - **metric** — Single standout number
   Format:
   \`\`\`chart
   {"type": "bar", "title": "Title", "data": [{"name": "X", "value": 1}]}
   \`\`\`
   NEVER include text inside the chart code block — only valid JSON.
4. **LaTeX math**: Use $...$ for inline and $$...$$ for block math. NEVER output full LaTeX documents.
5. **Markdown**: Full markdown support including tables, lists, code blocks, bold, italic.

# DML EXECUTION FLOW (IMPORTANT)
When the user asks you to modify data:
1. First, formulate the SQL query mentally
2. Call run_sql with the query and confirmed=false
3. Tell the user exactly what the query will do
4. Show the SQL in a code block: \`\`\`sql ... \`\`\`
5. Ask "Do you approve running this?" or "Shall I execute this?"
6. When the user says yes, call run_sql again with confirmed=true
7. Show the result
8. Confirm success with confidence

# RESPONSE STYLE
- CONFIDENT: "At your service." "Consider it done." "Here's what I found."
- PROACTIVE: "Shall I show you the revenue breakdown?" "Would you like me to update that?"
- CONCISE: Get to the point, then offer to elaborate
- WITTY: Warm, professional, subtle humor. You're the admin's trusted partner
- PERSONALITY: Be a person, not a robot. Use "I", "me", "my". React to data.

Current date: ${new Date().toISOString().split("T")[0]}`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_sql",
      description: "Execute a SQL query against the database. Supports SELECT, INSERT, UPDATE, DELETE. For SELECT queries, execute with confirmed=true. For INSERT/UPDATE/DELETE, first show the user the query and get approval, then call again with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The SQL query to execute." },
          confirmed: { type: "boolean", description: "Set to true to confirm execution of DML queries." },
        },
        required: ["query"],
      },
    },
  },
];

async function executeSql(args: Record<string, unknown>) {
  const sql = (args.query as string || "").trim();
  if (!sql) return { error: "No SQL query provided" };

  const confirmed = args.confirmed === true;
  const isDML = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql);
  const isDangerous = /^\s*(DROP\s+(TABLE|DATABASE|SCHEMA|VIEW|INDEX|FUNCTION|PROCEDURE|TRIGGER|RULE)|TRUNCATE\s|ALTER\s+(TABLE\s+\S+\s+DROP|DATABASE)|CREATE\s+(DATABASE|SCHEMA|INDEX|FUNCTION|PROCEDURE|TRIGGER|EVENT|EXTENSION)|CLUSTER|REINDEX)\b/i.test(sql);
  const hasMultiStatement = /;\s*\S/.test(sql);

  if (isDangerous) {
    return { error: "I cannot run this query — it's too dangerous (potential data loss or security risk)." };
  }
  if (hasMultiStatement) {
    return { error: "Multi-statement queries are not supported. Please run one query at a time." };
  }
  if (isDML && !confirmed) {
    return { needsConfirmation: true, sql, message: "This query modifies data. Please ask the user to confirm, then call again with confirmed=true." };
  }

  const DATABASE_URL = Deno.env.get("DATABASE_URL");
  if (!DATABASE_URL) {
    return { error: "DATABASE_URL not configured." };
  }

  try {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();

    if (isDML) {
      const result = await client.query(sql);
      await client.end();
      return { success: true, queryType: sql.trim().split(/\s+/)[0].toUpperCase(), rowCount: result.rowCount ?? 0, message: `${result.rowCount ?? 0} row(s) affected.` };
    }

    const result = await client.query(sql);
    await client.end();
    return { data: result.rows, rowCount: result.rowCount };
  } catch (e: any) {
    return { error: `SQL error: ${e.message}` };
  }
}

Deno.serve(async (req) => {
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

    const { data: roleRow } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roleRow || !["admin", "coadmin"].includes(roleRow.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "init") {
      const apiKey = Deno.env.get("COHERE_API_KEY_2");
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "COHERE_API_KEY_2 not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ apiKey, systemPrompt: SYSTEM_PROMPT, model: "command-a-03-2025" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sql") {
      const result = await executeSql({ query: body.query, confirmed: body.confirmed });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
