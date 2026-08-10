import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";
import { aalFromAuthHeader, requireAal2 } from "../_shared/authz.ts";

const ALLOWED_ORIGINS = [
  "https://scholar-share.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

const VALID_ROLES = ["admin", "coadmin", "teacher", "pending", "rejected", "deleted", "blocked"];

Deno.serve(trackFn("admin-change-role", async (req) => {
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

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole) throw new Error("No role found for caller");

    const callerRoleName = callerRole.role;

    const { target_user_id, new_role } = await req.json();
    if (!target_user_id) throw new Error("target_user_id is required");
    if (!new_role) throw new Error("new_role is required");
    if (!VALID_ROLES.includes(new_role)) throw new Error(`Invalid role: ${new_role}`);
    if (target_user_id === caller.id) throw new Error("Cannot change your own role");

    if (callerRoleName !== "admin" && callerRoleName !== "coadmin") {
      throw new Error("Only admins and coadmins can change roles");
    }

    requireAal2(aalFromAuthHeader(authHeader));

    if (callerRoleName === "coadmin") {
      const allowedRoles = ["teacher", "pending", "blocked", "rejected", "deleted"];
      if (!allowedRoles.includes(new_role)) {
        throw new Error("Co-admins can only assign teacher, pending, blocked, rejected, or deleted roles");
      }

      const { data: targetRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", target_user_id)
        .maybeSingle();

      if (targetRole && ["admin", "coadmin"].includes(targetRole.role)) {
        throw new Error("Co-admins cannot change the role of admins or coadmins");
      }
    }

    const { error } = await adminClient
      .from("user_roles")
      .update({ role: new_role })
      .eq("user_id", target_user_id);

    if (error) throw error;

    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      action: "role_changed",
      category: "admin",
      details: {
        target_user_id,
        new_role,
        caller_role: callerRoleName,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}));
