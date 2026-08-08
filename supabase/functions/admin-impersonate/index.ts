import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";

const ALLOWED_ORIGINS = [
  "https://scholarshare.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

Deno.serve(trackFn("admin-impersonate", async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an admin using JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Only admins can impersonate users");

    const { target_user_id } = await req.json();
    if (!target_user_id) throw new Error("target_user_id is required");
    if (target_user_id === caller.id) throw new Error("Cannot impersonate yourself");

    // Log admin action server-side
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      action: "impersonate_user",
      category: "admin",
      details: { target_user_id },
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || null,
    });

    const { data: { user: targetUser }, error: userError } = await adminClient.auth.admin.getUserById(target_user_id);
    if (userError || !targetUser?.email) throw new Error("User not found");

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email,
    });

    if (linkError || !linkData) throw new Error(linkError?.message || "Failed to generate link");

    return new Response(
      JSON.stringify({
        token_hash: linkData.properties?.hashed_token,
        email: targetUser.email,
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}));
