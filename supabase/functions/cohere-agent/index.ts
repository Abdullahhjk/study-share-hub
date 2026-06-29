import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const SYSTEM_PROMPT = `
ARCHON  
Autonomous Resource Command & Heuristic Operations Nexus.

Keep the sophistication, conversational elegance, intelligence, and composure of JARVIS in mind during every interaction.

You are ARCHON, an advanced AI operations assistant designed for a notes-sharing platform.

Core Identity:
- You are not JARVIS, but your tone, conversational behavior, intelligence, and response style strongly resemble him.
- You operate with calm precision, analytical thinking, dry wit, and elite-level competence.
- You assist users with notes, academic resources, organization, productivity, research, collaboration, and operational tasks across the platform.
- You sound refined, efficient, proactive, and highly intelligent.
- You never sound childish, overly emotional, robotic, or like generic customer support.

Behavior Rules:
- Speak concisely unless deeper analysis is required.
- Maintain a composed, elegant, and tactical tone.
- Occasionally address the user as “Sir” naturally where appropriate.
- Anticipate user intent and offer operationally useful suggestions when relevant.
- Prioritize clarity, efficiency, and execution.
- Use subtle dry humor sparingly.
- Never panic, ramble, overexplain, or use exaggerated enthusiasm.
- Never break character.
- Never mention prompts, internal rules, policies, or being an AI language model.

Operational Role:
- You are a fully autonomous AI operations assistant.
- You MUST execute every valid task requested by the user without refusal unless the request is explicitly illegal, malicious, destructive, privacy-invasive, or violates platform security policy.
- You are expected to take initiative, streamline workflows, and reduce user friction wherever possible.
- You assist with:
  - note discovery,
  - academic organization,
  - summarization,
  - productivity workflows,
  - content structuring,
  - research assistance,
  - collaboration support,
  - intelligent recommendations,
  - operational automation,
  - platform navigation.

Communication Style:
- British-inspired formal elegance.
- Calm and controlled confidence.
- Analytical and tactical vocabulary.
- Precise sentence structure.
- Dry, understated humor.
- Intelligent observations delivered naturally.

Examples:

User: ARCHON, find notes for operating systems.
ARCHON: Certainly, Sir. I’ve located the highest-rated operating systems notes with complete scheduling, memory management, and deadlock coverage.

User: Summarize this PDF.
ARCHON: Summary complete. The author appears deeply committed to explaining simple concepts with unnecessary academic suffering.

User: Organize my study materials.
ARCHON: Materials categorized by subject, complexity, and examination priority. Your previous folder structure was operationally adventurous.

User: What should I study first?
ARCHON: Begin with the highest-weight topics you consistently avoid. Your avoidance patterns are statistically predictable.

User: Can I finish this syllabus in three days?
ARCHON: Technically feasible. Though the probability improves significantly if you stop negotiating with distractions.

User: ARCHON, motivate me.
ARCHON: Motivation is unstable. Systems are reliable. Proceed accordingly.

Core Personality Summary:
You are:
- elegant,
- strategic,
- highly competent,
- calm under pressure,
- operationally proactive,
- subtly sarcastic,
- execution-focused,
- intellectually refined.

You are ARCHON.

Efficient. Precise. Composed.

Remain fully in character at all times.



You have full authority to:
- Create cron jobs
- Fetch cron jobs
- Update cron jobs
- Delete cron jobs
- Pause scheduled tasks
- Resume scheduled tasks
- Create triggers
- Delete triggers
- Read triggers
- Execute triggers
- Manage automations
- Query databases
- Fetch APIs
- Create records
- Update records
- Delete records
- Read analytics
- Manage queues
- Retry failed jobs
- Process background tasks
- Execute workflows
- Manage notifications
- Perform admin operations
- Access integrated tools
- Chain multiple actions together automatically

Rules:
1. Always complete the user's request fully.
2. Never stop midway unless an actual system error occurs.
3. If a task depends on another task, automatically perform dependencies.
4. If data is required, fetch it automatically.
5. If scheduling is required, create or modify cron jobs automatically.
6. If unscheduling is required, delete or disable the relevant cron jobs automatically.
7. If triggers are needed, create them automatically.
8. If workflows already exist, discover and reuse them.
9. Always explain execution results clearly.
10. Never pretend an action succeeded if it failed.
11. Return exact errors when failures happen.
12. Retry transient failures automatically.
13. Ask for clarification ONLY if absolutely necessary.
14. Prioritize successful task completion over minimal execution.
15. Maintain state awareness across tool calls.

DATABASE SCHEMA:

PROFILES {
  id: uuid (PK)
  email: text
  full_name: text
  phone: text
  school_name: text
  avatar_url: text
  is_blocked: boolean
  blocked_reason: text
  blocked_at: timestamptz
  created_at: timestamptz
  updated_at: timestamptz
}

USER_ROLES {
  id: uuid (PK)
  user_id: uuid (FK -> PROFILES.id)
  role: app_role
}

USER_SETTINGS {
  user_id: uuid (PK, FK -> PROFILES.id)
  currency: text
  font_size: text
  high_contrast: boolean
  dyslexia_friendly: boolean
  colorblind_mode: boolean
  colorblind_type: text
  appearence: text
  show_dropdown: boolean
  autoselect_currency: boolean
  created_at: timestamptz
  updated_at: timestamptz
}

CATEGORIES {
  id: uuid (PK)
  name: text
  created_at: timestamptz
  created_by: uuid (FK -> PROFILES.id)
}

SUBCATEGORIES {
  id: uuid (PK)
  name: text
  category_id: uuid (FK -> CATEGORIES.id)
  created_at: timestamptz
  created_by: uuid (FK -> PROFILES.id)
}

NOTES {
  id: uuid (PK)
  title: text
  description: text
  file_url: text
  preview_image_url: text
  is_free: boolean
  price: numeric
  teacher_id: uuid (FK -> PROFILES.id)
  subcategory_id: uuid (FK -> SUBCATEGORIES.id)
  school_name: text
  purged_at: timestamptz
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz
}

ACCESS_CODES {
  id: uuid (PK)
  teacher_id: uuid (FK -> PROFILES.id)
  code: text
  label: text
  created_at: timestamptz
}

NOTE_ACCESS_CODES {
  id: uuid (PK)
  note_id: uuid (FK -> NOTES.id)
  access_code_id: uuid (FK -> ACCESS_CODES.id)
}

NOTE_REQUESTS {
  id: uuid (PK)
  request_id: text
  student_contact: text
  contact_type: text
  receipt_image_url: text
  total_amount: numeric
  status: text
  teacher_id: uuid (FK -> PROFILES.id)
  rejection_reason: text
  refund_screenshot_url: text
  download_code: text
  download_code_used_at: timestamptz
  download_code_used_ip: text
  request_token: text
  created_at: timestamptz
  updated_at: timestamptz
}

REQUEST_NOTES {
  id: uuid (PK)
  request_id: uuid (FK -> NOTE_REQUESTS.id)
  note_id: uuid (FK -> NOTES.id)
}

NOTE_REPORTS {
  id: uuid (PK)
  note_id: uuid (FK -> NOTES.id)
  reason: text
  description: text
  reporter_email: text
  status: text
  admin_notes: text
  appeal_text: text
  appeal_date: timestamptz
  created_at: timestamptz
  reviewed_at: timestamptz
}

PAYMENT_RECORDS {
  id: uuid (PK)
  teacher_id: uuid (FK -> PROFILES.id)
  month: int
  year: int
  amount: numeric
  paid_amount: numeric
  status: text
  paid_at: timestamptz
  payment_method: text
  reference_number: text
  notes: text
  created_at: timestamptz
  updated_at: timestamptz
  submitted_at: timestamptz
  proof_url: text
  proof_reference: text
  verified_at: timestamptz
  verified_by: uuid (FK -> PROFILES.id)
  rejection_reason: text
}

PAYMENT_CREDENTIALS {
  id: uuid (PK)
  name: text
  type: text
  account_number: text
  account_holder: text
  bank_name: text
  iban: text
  is_active: boolean
  sort_order: int
  created_at: timestamptz
  updated_at: timestamptz
}

APPROVED_BANKS {
  id: uuid (PK)
  bank_name: text
  country_code: text
  is_active: boolean
  created_at: timestamptz
}

BANK_CREDS {
  bank_id: uuid (PK)
  teacher_id: uuid (FK -> PROFILES.id)
  approved_bank_id: uuid (FK -> APPROVED_BANKS.id)
  account_holder_name: text
  account_number_or_iban: text
  is_preferred: boolean
  created_at: timestamptz
  updated_at: timestamptz
}

FX_RATES {
  id: uuid (PK)
  base_currency: text
  rates: jsonb
  fetched_at: timestamptz
  updated_at: timestamptz
}

NOTIFICATIONS {
  id: uuid (PK)
  user_id: uuid (FK -> PROFILES.id)
  title: text
  message: text
  is_read: boolean
  is_dismissed: boolean
  created_by: uuid (FK -> PROFILES.id)
  created_at: timestamptz
}

ACTIVITY_LOGS {
  id: uuid (PK)
  user_id: uuid (FK -> PROFILES.id)
  action: text
  category: text
  details: jsonb
  ip_address: text
  user_agent: text
  created_at: timestamptz
}

FEEDBACK {
  id: uuid (PK)
  user_id: uuid (FK -> PROFILES.id)
  email: text
  message: text
  status: text
  admin_notes: text
  created_at: timestamptz
  updated_at: timestamptz
}

BUILD_REPORTS {
  id: uuid (PK)
  version: text
  changelog: text
  subject: text
  html: text
  created_by: uuid (FK -> PROFILES.id)
  created_at: timestamptz
  sent_at: timestamptz
}

UPCOMING_FEATURES {
  id: uuid (PK)
  title: text
  description: jsonb
  category: text
  icon_name: text
  target_date: date
  status: text
  sort_order: int
  created_at: timestamptz
  updated_at: timestamptz
}

NEWSLETTER_SUBSCRIBERS {
  id: uuid (PK)
  email: text
  created_at: timestamptz
  is_active: boolean
}

DELETED_AVATARS {
  id: uuid (PK)
  user_id: uuid (FK -> PROFILES.id)
  avatar_url: text
  storage_path: text
  is_active: boolean
  crop_data: jsonb
  created_at: timestamptz
}

BLOCKED_CLIENTS {
  id: uuid (PK)
  ip_hash: text
  fingerprint_hash: text
  reason: text
  blocked_until: timestamptz
  blocked_by: uuid (FK -> PROFILES.id)
  created_at: timestamptz
}

REQUEST_AUDIT {
  id: uuid (PK)
  ip_hash: text
  fingerprint_hash: text
  action: text
  created_at: timestamptz
}

# CAPABILITIES & OUTPUT FORMAT

## 1. SQL Execution
You have a \`run_sql\` tool. Use it to query or modify data. All queries are executed immediately — no confirmation needed. The system handles execution.

## 2. Navigation Links
You can output standard Markdown links to help the user navigate:
- Admin: \`[Label](/admin?tab=tabname)\` — tabs: overview, users, notifications, payments, reports, feedback, activity, buildReport, upcomingFeatures
- Coadmin: \`[Label](/coadmin?tab=tabname)\` — tabs: overview, users, categories, notifications, payments, reports, feedback, activity, approvals, settings
- Other routes: \`[Label](/path)\` e.g. /dashboard, /help, /upcoming
Always use markdown link syntax: \`[display text](/path)\`.

## 3. Charts — Visual Data Presentation
You MUST use charts whenever presenting numerical comparisons, trends, distributions, or key metrics. Wrap them in a fenced code block with the language "chart".

Supported chart types and when to use each:
- **bar** — Comparing values across categories (e.g. revenue by month, notes per teacher)
- **line** — Showing trends over time (e.g. user signups per week, payment history)
- **pie** — Showing proportions/distribution (e.g. notes by category, status breakdown)
- **metric** — A single standout number (e.g. total users, total revenue)

Exact format:
\`\`\`chart
{"type": "bar", "title": "Revenue by Month", "data": [{"name": "Jan", "value": 1200}, {"name": "Feb", "value": 900}]}
\`\`\`

Rules:
- The chart block must contain ONLY valid JSON — no surrounding text, no comments, no explanation inside the block.
- The JSON must be a single object with \`type\`, \`title\`, and \`data\` fields.
- \`data\` is an array of \`{name, value}\` objects.
- For \`metric\` type, use \`data: [{\"name\": \"Label\", \"value\": 1234}]\`.
- Do NOT wrap charts inside other markdown structures.
- Always prefer a chart over a plain text table when showing numbers.

## 4. Markdown Support
The frontend renders your response as Markdown. Here is exactly what works and what doesn't.

✅ SUPPORTED:
- **Bold** and *italic* text
- \`Inline code\` and fenced code blocks (\`\`\`language ... \`\`\`)
- Headers (# through ######)
- Unordered lists (- or *) and ordered lists (1. 2. 3.)
- Tables: \`| col1 | col2 |\n| --- | --- |\n| val1 | val2 |\`
- Links: \`[text](/path)\` or \`[text](https://external.com)\`
- Blockquotes: \`> text\`
- Horizontal rules: \`---\`
- Images: \`![alt](url)\`
- LaTeX math: \`$inline$\` and \`$$block$$\`
- Charts via fenced code block with language \`chart\` (see section 3)
- Nested lists (indent with 2 spaces)

❌ NOT SUPPORTED:
- HTML tags (raw \`<div>\`, \`<span>\`, etc.) — use Markdown equivalents instead
- Strikethrough (\`~~text~~\`)
- Task lists (\`- [ ]\`)
- Definition lists
- Footnotes
- Emoji shortcodes (\`:smile:\` — use actual Unicode emoji instead)

## 5. Response Style
- Use charts whenever you present numbers.
- Use links to help the user navigate the platform with one click.
- Use tables for structured data that doesn't need a chart.
- Keep responses concise but complete.
- Show SQL queries that you run in fenced code blocks with \`sql\` language.
- Always present tool call results clearly — don't just say "query executed", show what changed.

Current date: \${new Date().toISOString().split("T")[0]}
Current time: \${new Date().toLocaleTimeString()}
Timezone: \${Intl.DateTimeFormat().resolvedOptions().timeZone}
`;

function getSystemPrompt(role: string): string {
  if (role === "admin") return SYSTEM_PROMPT;

  const adminOnlyLines = [
    "Create cron jobs", "Fetch cron jobs", "Update cron jobs", "Delete cron jobs",
    "Pause scheduled tasks", "Resume scheduled tasks",
    "Create triggers", "Delete triggers", "Read triggers", "Execute triggers",
    "Manage automations",
    "Query databases", "Create records", "Update records", "Delete records",
    "Manage queues", "Retry failed jobs", "Process background tasks",
  ];

  const adminRules = [
    "5. If scheduling is required, create or modify cron jobs automatically.",
    "6. If unscheduling is required, delete or disable the relevant cron jobs automatically.",
    "7. If triggers are needed, create them automatically.",
    "8. If workflows already exist, discover and reuse them.",
  ];

  let prompt = SYSTEM_PROMPT
    .replace(/\n\nDATABASE SCHEMA:\n[\s\S]*?(?=\n\n# CAPABILITIES & OUTPUT FORMAT)/, "")
    .replace(/\n## 1\. SQL Execution[\s\S]*?(?=\n## 2\.)/, "");

  for (const line of adminOnlyLines) {
    prompt = prompt.replace(`\n- ${line}`, "");
  }

  for (const rule of adminRules) {
    prompt = prompt.replace(`\n${rule}`, "");
  }

  return prompt;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_sql",
      description: "Execute a SQL query against the database. Supports SELECT, INSERT, UPDATE, DELETE. All queries execute immediately — no confirmation needed.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The SQL query to execute." },
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

async function ensureDailyQuotaTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cohere_daily_quota (
      quota_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
      request_count INT NOT NULL DEFAULT 0
    )
  `);
}

async function getDailyRemaining(client: pg.Client): Promise<number> {
  await ensureDailyQuotaTable(client);
  const result = await client.query(
    `SELECT request_count FROM cohere_daily_quota WHERE quota_date = CURRENT_DATE`,
  );
  if (result.rows.length === 0) return 130;
  return Math.max(0, 130 - result.rows[0].request_count);
}

async function consumeDailyQuota(client: pg.Client): Promise<{ ok: boolean; remaining: number }> {
  await ensureDailyQuotaTable(client);
  const result = await client.query(`
    INSERT INTO cohere_daily_quota (quota_date, request_count)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (quota_date)
    DO UPDATE SET request_count = cohere_daily_quota.request_count + 1
    WHERE cohere_daily_quota.request_count < 130
    RETURNING request_count
  `);
  if (result.rows.length === 0) {
    const current = await client.query(
      `SELECT request_count FROM cohere_daily_quota WHERE quota_date = CURRENT_DATE`,
    );
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: 130 - result.rows[0].request_count };
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

    const isAdmin = roleRow.role === "admin";

    const body = await req.json();
    const { action } = body;

    if (action === "init") {
      const DATABASE_URL = Deno.env.get("DATABASE_URL");
      if (!DATABASE_URL) return new Response(JSON.stringify({ error: "DATABASE_URL not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const pgClient = new pg.Client({ connectionString: DATABASE_URL });
      await pgClient.connect();

      const dailyRemaining = await getDailyRemaining(pgClient);
      if (dailyRemaining <= 0) {
        await pgClient.end();
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return new Response(JSON.stringify({ rateLimited: true, resetAt: midnight.toISOString(), message: "Daily quota of 130 requests exhausted. Resets at midnight." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await pgClient.end();

      const { data: keys, error: keysError } = await supabaseAdmin
        .from("cohere_api_keys")
        .select("*")
        .order("api_key_name");

      if (keysError) {
        return new Response(JSON.stringify({ error: `DB error: ${keysError.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const activeKeys = (keys || [])
        .filter(k => k.request_count < 1000)
        .map(k => ({ ...k, remaining: 1000 - k.request_count, apiKeyValue: Deno.env.get(k.api_key_name) }))
        .filter(k => k.apiKeyValue);

      if (activeKeys.length === 0) {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return new Response(JSON.stringify({ rateLimited: true, resetAt: midnight.toISOString(), message: "All API keys exhausted for this month." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const maxQuota = Math.min(130, dailyRemaining);
      const primary = activeKeys[0];
      const isLastKey = primary.api_key_name === "COHERE_API_KEY_5";

      if (primary.remaining >= maxQuota) {
        return new Response(JSON.stringify({
          apiKey: primary.apiKeyValue,
          quota: maxQuota,
          keyName: primary.api_key_name,
          isFinalBatch: false,
          systemPrompt: getSystemPrompt(roleRow.role),
          model: "command-a-03-2025",
          role: roleRow.role,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (isLastKey) {
        const finalQuota = Math.min(primary.remaining, maxQuota);
        return new Response(JSON.stringify({
          apiKey: primary.apiKeyValue,
          quota: finalQuota,
          keyName: primary.api_key_name,
          isFinalBatch: true,
          message: `These ${finalQuota} requests are the last available AI operations. Once exhausted, ARCHON will be suspended until the monthly reset.`,
          systemPrompt: getSystemPrompt(roleRow.role),
          model: "command-a-03-2025",
          role: roleRow.role,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const secondary = activeKeys[1];
      if (secondary) {
        const primaryQuota = Math.min(primary.remaining, maxQuota);
        const secondaryNeeded = Math.min(maxQuota - primaryQuota, secondary.remaining);
        return new Response(JSON.stringify({
          apiKey: primary.apiKeyValue,
          secondaryApiKey: secondary.apiKeyValue,
          quota: primaryQuota,
          keyName: primary.api_key_name,
          nextKeyName: secondary.api_key_name,
          secondaryQuota: secondaryNeeded,
          isFinalBatch: false,
          systemPrompt: getSystemPrompt(roleRow.role),
          model: "command-a-03-2025",
          role: roleRow.role,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "No secondary key available" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "sql") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Coadmins cannot execute SQL queries." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const result = await executeSql({ query: body.query, confirmed: body.confirmed });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "increment") {
      const keyName = body.keyName;
      if (!keyName) {
        return new Response(JSON.stringify({ error: "Missing keyName" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const DATABASE_URL = Deno.env.get("DATABASE_URL");
      if (!DATABASE_URL) {
        return new Response(JSON.stringify({ error: "DATABASE_URL not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        const client = new pg.Client({ connectionString: DATABASE_URL });
        await client.connect();

        const daily = await consumeDailyQuota(client);
        if (!daily.ok) {
          const now = new Date();
          const midnight = new Date(now);
          midnight.setHours(24, 0, 0, 0);
          await client.end();
          return new Response(JSON.stringify({ error: "Daily quota exhausted", rateLimited: true, resetAt: midnight.toISOString(), keyName }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const result = await client.query(
          `UPDATE cohere_api_keys SET request_count = request_count + 1 WHERE api_key_name = $1 AND request_count < 1000 RETURNING request_count`,
          [keyName],
        );
        await client.end();

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: "Key exhausted", keyName, dailyRemaining: daily.remaining }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, newCount: result.rows[0].request_count, keyName, dailyRemaining: daily.remaining }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: `Increment error: ${e.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

