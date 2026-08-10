import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";
import { aalFromAuthHeader, requireAal2 } from "../_shared/authz.ts";

const ALLOWED_ORIGINS = [
  "https://scholarshare.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

Deno.serve(trackFn("admin-create-user", async (req) => {
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
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Only admins can create users");

    requireAal2(aalFromAuthHeader(authHeader));

    const { email, password, role, full_name } = await req.json();
    if (!email || !password) throw new Error("email and password are required");
    if (!role) throw new Error("role is required");

    const validRoles = ["teacher", "pending"];
    if (!validRoles.includes(role)) throw new Error("Invalid role. Must be teacher or pending");

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);
    if (!newUser?.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      email,
      full_name: full_name || "",
    });

    if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userId,
      role,
    });

    if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      action: "create_user",
      category: "admin",
      details: { target_user_id: userId, email, role },
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || null,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
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
