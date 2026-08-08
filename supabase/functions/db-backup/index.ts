import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.0";
import { trackFn } from "../_shared/telemetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function quote(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  const s = String(val);
  return `'${s.replace(/'/g, "''")}'`;
}

function mapDataType(raw: string): string {
  const map: Record<string, string> = {
    "character varying": "TEXT",
    "character": "TEXT",
    "timestamp without time zone": "TIMESTAMPTZ",
    "timestamp with time zone": "TIMESTAMPTZ",
    "time without time zone": "TIME",
    "time with time zone": "TIMETZ",
    "double precision": "DOUBLE PRECISION",
    "real": "REAL",
    "numeric": "NUMERIC",
    "boolean": "BOOLEAN",
    "json": "JSONB",
    "jsonb": "JSONB",
    "uuid": "UUID",
    "bigint": "BIGINT",
    "integer": "INTEGER",
    "smallint": "SMALLINT",
    "text": "TEXT",
    "bytea": "BYTEA",
    "date": "DATE",
    "interval": "INTERVAL",
    "oid": "OID",
  };
  return map[raw] || raw.toUpperCase();
}

function formatDefault(col: { column_default: string | null; data_type: string }): string {
  if (!col.column_default) return "";
  let def = col.column_default;
  if (def.startsWith("nextval(") || def.startsWith("uuid_generate")) {
    return "";
  }
  if (def.startsWith("'") && def.endsWith("'::" + col.data_type)) {
    def = def.slice(0, def.indexOf("::"));
  }
  return ` DEFAULT ${def}`;
}

Deno.serve(trackFn("db-backup", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const databaseUrl = Deno.env.get("DATABASE_URL");
    if (!databaseUrl) throw new Error("DATABASE_URL not set");

    const pool = new pg.Pool({ connectionString: databaseUrl });
    const client = await pool.connect();

    const lines: string[] = [];

    lines.push("-- ================================================");
    lines.push("-- FULL DATABASE BACKUP");
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push("-- NOTE: Primary keys, foreign keys, and unique");
    lines.push("-- constraints are excluded for clean recovery.");
    lines.push("-- ================================================");
    lines.push("");
    lines.push("BEGIN;");
    lines.push("");

    // ── 1. TABLES (schema without PK/FK) ────────────────────
    lines.push("-- ================================================");
    lines.push("-- TABLES");
    lines.push("-- ================================================");
    lines.push("");

    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations', 'schema_migrations')
      ORDER BY table_name
    `);

    const tableNames: string[] = tablesRes.rows.map((r) => r.table_name);

    for (const tableName of tableNames) {
      const colsRes = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName],
      );

      lines.push(`-- ${tableName}`);
      lines.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);
      const colLines = colsRes.rows.map((col) => {
        const typ = mapDataType(col.data_type);
        let line = `  ${col.column_name} ${typ}`;
        if (col.is_nullable === "NO") line += " NOT NULL";
        line += formatDefault(col);
        return line;
      });
      lines.push(colLines.join(",\n"));
      lines.push(");");
      lines.push("");

      // ── DATA ──────────────────────────────────────────────
      const dataRes = await client.query(`SELECT * FROM public.${tableName}`);
      if (dataRes.rows.length > 0) {
        const colNames = colsRes.rows.map((c) => c.column_name);
        const batchSize = 100;
        for (let i = 0; i < dataRes.rows.length; i += batchSize) {
          const batch = dataRes.rows.slice(i, i + batchSize);
          lines.push(`INSERT INTO public.${tableName} (${colNames.join(", ")}) VALUES`);
          const valueLines = batch.map((row) => {
            const vals = colNames.map((cn) => quote(row[cn]));
            return `(${vals.join(", ")})`;
          });
          lines.push(valueLines.join(",\n") + ";");
          lines.push("");
        }
      }
    }

    // ── 2. ENUMS ────────────────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- ENUMS");
    lines.push("-- ================================================");
    lines.push("");

    const enumRes = await client.query(`
      SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) as labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `);

    for (const row of enumRes.rows) {
      const labels = row.labels.split(",").map((l: string) => `'${l}'`).join(", ");
      lines.push(`CREATE TYPE public.${row.typname} AS ENUM (${labels});`);
      lines.push("");
    }

    // ── 3. RLS POLICIES ─────────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- RLS POLICIES");
    lines.push("-- ================================================");
    lines.push("");

    const policyRes = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);

    for (const p of policyRes.rows) {
      lines.push(`-- ${p.policyname} on ${p.tablename}`);
      const permissive = p.permissive === "PERMISSIVE" ? "" : "RESTRICTIVE";
      const roles = Array.isArray(p.roles) ? p.roles.join(", ") : p.roles || "public";
      const using_ = p.qual?.replace(/\s+/g, " ").trim();
      const check_ = p.with_check?.replace(/\s+/g, " ").trim();

      lines.push(
        `CREATE POLICY "${p.policyname}" ON public.${p.tablename}` +
        ` ${permissive} FOR ${p.cmd}` +
        ` TO ${roles}` +
        (using_ ? ` USING (${using_})` : "") +
        (check_ ? ` WITH CHECK (${check_})` : "") +
        ";",
      );
    }
    if (policyRes.rows.length > 0) lines.push("");

    // ── 4. FUNCTIONS / RPCs ─────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- FUNCTIONS / RPCs");
    lines.push("-- ================================================");
    lines.push("");

    const funcRes = await client.query(`
      SELECT n.nspname as schema_name,
             p.proname as function_name,
             pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname NOT LIKE '%_deprecated%'
      ORDER BY p.proname
    `);

    for (const f of funcRes.rows) {
      lines.push(f.definition.replace(/\s+/g, " ").trim() + ";");
      lines.push("");
    }

    // ── 5. TRIGGERS ─────────────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- TRIGGERS");
    lines.push("-- ================================================");
    lines.push("");

    const trigRes = await client.query(`
      SELECT
        c.relname AS event_object_table,
        t.tgname AS trigger_name,
        pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE NOT t.tgisinternal
        AND c.relnamespace = 'public'::regnamespace
      ORDER BY c.relname, t.tgname
    `);

    for (const t of trigRes.rows) {
      lines.push(t.definition + ";");
      lines.push("");
    }

    // ── 6. CRON JOBS ────────────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- CRON JOBS");
    lines.push("-- ================================================");
    lines.push("");

    try {
      const cronRes = await client.query(`
        SELECT jobname, schedule, command, database, active
        FROM cron.job
        ORDER BY jobname
      `);

      for (const c of cronRes.rows) {
        lines.push(`-- Job: ${c.jobname}`);
        lines.push(`-- Schedule: ${c.schedule}`);
        lines.push(`-- Command: ${c.command}`);
        lines.push(
          `SELECT cron.schedule('${c.jobname}', '${c.schedule}', '${c.command.replace(/'/g, "''")}');`,
        );
        lines.push("");
      }
    } catch {
      lines.push("-- pg_cron extension not available or no cron jobs found.");
      lines.push("");
    }

    // ── 7. EXTENSIONS ───────────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- EXTENSIONS");
    lines.push("-- ================================================");
    lines.push("");

    const extRes = await client.query(`
      SELECT e.extname, e.extversion
      FROM pg_extension e
      ORDER BY e.extname
    `);

    for (const e of extRes.rows) {
      lines.push(`CREATE EXTENSION IF NOT EXISTS "${e.extname}" WITH SCHEMA extensions;`);
    }
    if (extRes.rows.length > 0) lines.push("");

    // ── 8. EDGE FUNCTIONS ───────────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- EDGE FUNCTIONS");
    lines.push("-- ================================================");
    lines.push("");

    let edgeFunctionsIncluded = false;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabasePat = Deno.env.get("_SUPABASE_PAT") || "";
      const projectRef = supabaseUrl.replace(/https?:\/\//, "").split(".")[0];

      if (supabasePat && projectRef) {
        const listRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/functions`,
          { headers: { Authorization: `Bearer ${supabasePat}` } },
        );
        if (listRes.ok) {
          const fnList: any[] = await listRes.json();
          lines.push("-- Deployed Edge Functions:");
          for (const fn of fnList) {
            lines.push(`--   ${fn.name} (slug: ${fn.slug}, v${fn.version})`);
          }
          edgeFunctionsIncluded = fnList.length > 0;
          lines.push(`-- Total: ${fnList.length}`);
        } else {
          lines.push(`-- Management API error (${listRes.status}): unable to list edge functions`);
        }
      } else {
        lines.push("-- Edge function metadata not available.");
        lines.push("-- Set _SUPABASE_PAT secret with a Personal Access Token from");
        lines.push("-- Supabase Dashboard → Settings → API → Personal Access Tokens");
        lines.push("-- to include edge function names and versions in the backup.");
      }
    } catch (e: any) {
      lines.push(`-- Error fetching edge function metadata: ${e.message}`);
    }
    lines.push("--");
    lines.push("-- Edge function TypeScript source lives in supabase/functions/.");
    lines.push("-- Back up that directory separately and deploy with:");
    lines.push("--   supabase functions deploy <name>");
    lines.push("");

    // ── 9. ENABLE RLS on tables ─────────────────────────────
    lines.push("-- ================================================");
    lines.push("-- ENABLE RLS");
    lines.push("-- ================================================");
    lines.push("");

    for (const tableName of tableNames) {
      lines.push(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`);
    }
    lines.push("");

    lines.push("COMMIT;");

    client.release();
    await pool.end();

    const sql = lines.join("\n");

    return new Response(JSON.stringify({ sql, edgeFunctionsIncluded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
