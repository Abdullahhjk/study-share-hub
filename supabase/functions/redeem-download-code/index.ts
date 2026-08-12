import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { trackFn } from "../_shared/telemetry.ts";

const ALLOWED_ORIGINS = [
  "https://scholar-share.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests = 10, windowSeconds = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

Deno.serve(trackFn("redeem-download-code", async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    if (!checkRateLimit(ip)) {
      return json({ error: "Too many requests. Try again later." }, 429, headers);
    }

    const url = new URL(req.url);
    const code = (url.searchParams.get("code") || "").trim();
    const requestId = (url.searchParams.get("requestId") || "").trim();
    const action = url.searchParams.get("action") || "info";

    if (!code || !requestId) {
      return json({ error: "Missing code or requestId" }, 400, headers);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: nr, error } = await admin
      .from("note_requests")
      .select("id, request_id, status, download_code, download_code_used_at")
      .eq("request_id", requestId)
      .eq("download_code", code)
      .maybeSingle();

    if (error || !nr) return json({ error: "Invalid code or request ID" }, 404, headers);
    if (nr.status !== "completed") return json({ error: "Request not approved yet" }, 403, headers);
    if (nr.download_code_used_at) return json({ error: "This download code has already been used" }, 410, headers);

    const { data: rNotes } = await admin
      .from("request_notes")
      .select("note_id, notes(id, title, file_url)")
      .eq("request_id", nr.id);

    const items: Array<{ title: string; signedUrl: string }> = [];
    for (const rn of rNotes || []) {
      const note: any = (rn as any).notes;
      if (!note?.file_url) continue;
      const path = note.file_url.split("/notes/")[1];
      if (!path) continue;
      const { data: signed } = await admin.storage.from("notes").createSignedUrl(path, 60 * 10);
      if (signed?.signedUrl) items.push({ title: note.title, signedUrl: signed.signedUrl });
    }

    if (action === "consume") {
      await admin
        .from("note_requests")
        .update({ download_code_used_at: new Date().toISOString(), download_code_used_ip: ip })
        .eq("id", nr.id);
    }

    return json({ items }, 200, headers);
  } catch (e) {
    return json({ error: (e as Error).message }, 500, headers);
  }
}));

function json(body: unknown, status = 200, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
