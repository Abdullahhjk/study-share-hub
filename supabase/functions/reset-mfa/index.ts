import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";
import { decodeJwtPayload } from "../_shared/authz.ts";

const ALLOWED_ORIGINS = [
  "https://scholar-share.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

interface AmrClaim {
  method: string;
  timestamp?: number;
}

const FRESH_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

/**
 * A recovery request must be backed by fresh primary authentication:
 *   - an email magic-link session (`amr.method === "otp"`), which GoTrue
 *     issues only after the account owner clicks a single-use, expiring
 *     link, or
 *   - a password sign-in (`amr.method === "password"`) that happened within
 *     the last 15 minutes (fresh re-authentication).
 * This is read server-side from the signed GoTrue JWT, so a merely logged-in
 * AAL2 session alone is never enough to reset MFA.
 */
function recoveryProof(token: string): { ok: boolean; method?: string; reason?: string } {
  const claims = decodeJwtPayload(token);
  if (!claims) return { ok: false, reason: "Invalid session" };
  const amr = Array.isArray(claims.amr) ? (claims.amr as AmrClaim[]) : [];

  const otp = amr.find((a) => a.method === "otp");
  if (otp) return { ok: true, method: "otp" };

  const password = amr.find((a) => a.method === "password");
  if (password && typeof password.timestamp === "number") {
    const ageMs = Date.now() - password.timestamp * 1000;
    if (ageMs >= 0 && ageMs <= FRESH_PASSWORD_WINDOW_MS) {
      return { ok: true, method: "password" };
    }
  }
  return { ok: false, reason: "Fresh re-authentication required" };
}

/**
 * Removes all verified TOTP factors for the CALLER (from the validated JWT).
 *
 * GoTrue requires AAL2 to unenroll a verified factor and also requires AAL2 to
 * enroll a new one whenever a verified factor exists — so an admin who lost
 * their authenticator can never self-serve through the client API. This edge
 * function uses the service role to remove the old factor AFTER the caller
 * proves fresh primary auth (magic link or recent password), at which point
 * the client can enroll a brand-new factor from an AAL1 session.
 */
Deno.serve(trackFn("reset-mfa", async (req) => {
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

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const proof = recoveryProof(token);
    if (!proof.ok) throw new Error(proof.reason || "Fresh re-authentication required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!roleRow || !["admin", "coadmin"].includes(roleRow.role)) {
      throw new Error("Only admins can recover two-factor authentication");
    }

    const adminAuth = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${caller.id}/factors`, {
      headers: adminAuth,
    });
    if (!listRes.ok) throw new Error("Could not list two-factor factors");
    const factors = (await listRes.json()) as { id: string; status: string }[];
    const verified = factors.filter((f) => f.status === "verified");

    for (const factor of verified) {
      const delRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${caller.id}/factors/${factor.id}`,
        { method: "DELETE", headers: adminAuth },
      );
      if (!delRes.ok) throw new Error("Could not remove a two-factor factor");
    }

    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      action: "mfa_reset",
      category: "admin",
      details: { via: proof.method, removed: verified.length },
    });

    return new Response(JSON.stringify({ success: true, removed: verified.length }), {
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
