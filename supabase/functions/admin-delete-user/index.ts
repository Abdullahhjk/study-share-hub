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

Deno.serve(trackFn("admin-delete-user", async (req) => {
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

    // Verify the caller is an admin
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

    if (!roleData) throw new Error("Only admins can delete users");

    const { target_user_id } = await req.json();
    if (!target_user_id) throw new Error("target_user_id is required");
    if (target_user_id === caller.id) throw new Error("Cannot delete yourself");

    // Log admin action server-side
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      action: "delete_user",
      category: "admin",
      details: { target_user_id },
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || null,
    });

    // Delete all user data from public tables
    await Promise.all([
      adminClient.from("activity_logs").delete().eq("user_id", target_user_id),
      adminClient.from("notifications").delete().eq("user_id", target_user_id),
      adminClient.from("notifications").delete().eq("created_by", target_user_id),
      adminClient.from("request_notes").delete().in(
        "request_id",
        (await adminClient.from("note_requests").select("id").eq("teacher_id", target_user_id)).data?.map((r: any) => r.id) || []
      ),
    ]);

    // Sequential deletes for FK ordering
    await adminClient.from("note_requests").delete().eq("teacher_id", target_user_id);
    await adminClient.from("notes").delete().eq("teacher_id", target_user_id);
    await adminClient.from("user_roles").delete().eq("user_id", target_user_id);
    await adminClient.from("profiles").delete().eq("id", target_user_id);

    // Delete the user from auth
    const { error: authError2 } = await adminClient.auth.admin.deleteUser(target_user_id);
    if (authError2) throw new Error(`Auth deletion failed: ${authError2.message}`);

    return new Response(
      JSON.stringify({ success: true }),
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
