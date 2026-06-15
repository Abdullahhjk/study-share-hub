import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://scholarshare.netlify.app",
  "https://localhost:8080",
  "https://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "none",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

// CRON_SECRET should be set in Supabase Edge Function secrets
// Used to authenticate cron job invocations
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    // Verify either:
    // 1. A valid cron secret (for automated cron jobs)
    // 2. A valid admin JWT (for manual admin invocation)
    const authHeader = req.headers.get("Authorization") || "";
    const cronAuth = req.headers.get("x-cron-secret") || "";

    let isAuthorized = false;

    // Check cron secret first
    if (CRON_SECRET && cronAuth === CRON_SECRET) {
      isAuthorized = true;
    }

    // Check admin JWT
    if (!isAuthorized && authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleData) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/notes?deleted_at=lt.${cutoffDate}&deleted_at=not.is.null&select=id,file_url,preview_image_url`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch old deleted notes");
      return new Response(JSON.stringify({ error: "Failed to fetch notes" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const notes = await response.json();

    for (const note of notes) {
      if (note.file_url) {
        const path = note.file_url.split("/notes/")[1];
        if (path) {
          await fetch(`${supabaseUrl}/storage/v1/object/notes/${path}`, {
            method: "DELETE",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          });
        }
      }

      if (note.preview_image_url) {
        const previewPath = note.preview_image_url.split("/notes/previews/")[1];
        if (previewPath) {
          await fetch(`${supabaseUrl}/storage/v1/object/notes/previews/${previewPath}`, {
            method: "DELETE",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          });
        }
      }

      await fetch(`${supabaseUrl}/rest/v1/notes?id=eq.${note.id}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      });
    }

    console.log(`Cleaned up ${notes.length} notes older than 30 days`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: notes.length,
        cutoffDate,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
