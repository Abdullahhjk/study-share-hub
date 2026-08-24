import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pg from "npm:pg@8.13.0";
import { trackFn } from "../_shared/telemetry.ts";
import { decodeJwtPayload } from "../_shared/authz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const MAX_SESSIONS = 5;

interface SessionRow {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  refreshed_at: string | null;
  not_after: string | null;
}

async function getDbClient() {
  const DATABASE_URL = Deno.env.get("DATABASE_URL");
  if (!DATABASE_URL) throw new Error("DATABASE_URL not configured");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

Deno.serve(trackFn("session-manager", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const claims = decodeJwtPayload(jwt);
    const userId = claims?.sub as string | undefined;
    const currentSessionId = claims?.session_id as string | undefined;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const client = await getDbClient();

    try {
      if (action === "list") {
        const result = await client.query(
          `SELECT id, ip::text AS ip, user_agent, created_at, updated_at, refreshed_at, not_after
           FROM auth.sessions
           WHERE user_id = $1 AND (not_after IS NULL OR not_after > now())
           ORDER BY updated_at DESC`,
          [userId],
        );
        await client.end();

        const sessions: SessionRow[] = result.rows;
        return new Response(JSON.stringify({
          sessions,
          currentSessionId,
          maxSessions: MAX_SESSIONS,
          activeCount: sessions.length,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "revoke") {
        const sessionId = body.sessionId;
        if (!sessionId) {
          await client.end();
          return new Response(JSON.stringify({ error: "Missing sessionId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (sessionId === currentSessionId) {
          await client.end();
          return new Response(JSON.stringify({ error: "Cannot revoke the current session. Use logout instead." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const result = await client.query(
          `DELETE FROM auth.sessions WHERE id = $1 AND user_id = $2 RETURNING id`,
          [sessionId, userId],
        );
        await client.end();

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: "Session not found or already revoked" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ success: true, revoked: sessionId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "revokeOthers") {
        const result = await client.query(
          `DELETE FROM auth.sessions WHERE user_id = $1 AND id <> $2 RETURNING id`,
          [userId, currentSessionId ?? ""],
        );
        await client.end();
        return new Response(JSON.stringify({ success: true, revokedCount: result.rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "enforce") {
        const countResult = await client.query(
          `SELECT id FROM auth.sessions WHERE user_id = $1 AND (not_after IS NULL OR not_after > now()) ORDER BY updated_at ASC`,
          [userId],
        );
        let removed = 0;
        if (countResult.rows.length > MAX_SESSIONS) {
          const excess = countResult.rows.slice(0, countResult.rows.length - MAX_SESSIONS);
          for (const row of excess) {
            if (row.id === currentSessionId) continue;
            await client.query(`DELETE FROM auth.sessions WHERE id = $1 AND user_id = $2`, [row.id, userId]);
            removed++;
          }
        }
        await client.end();
        return new Response(JSON.stringify({ success: true, activeCount: countResult.rows.length - removed, maxSessions: MAX_SESSIONS, removedOldest: removed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await client.end();
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      try { await client.end(); } catch (_) { /* already closed */ }
      return new Response(JSON.stringify({ error: `DB error: ${e.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
