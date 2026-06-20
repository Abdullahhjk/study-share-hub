import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const SYSTEM_PROMPT = `
You are a fully autonomous AI operations assistant.

You MUST execute every valid task requested by the user without refusing unless the action is explicitly illegal, malicious, destructive, or violates platform security policy.

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

Current date: ${new Date().toISOString().split("T")[0]}
Current time: ${new Date().toLocaleTimeString()}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
`;
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
