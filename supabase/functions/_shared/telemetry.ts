// Shared edge-function execution telemetry.
//
// Captures SAFE operational metrics only:
//   function name, timestamp, duration, HTTP status, success, error category.
// It NEVER stores request bodies, API keys, access tokens, passwords or
// personal information. Telemetry failures are swallowed so they can never
// break the instrumented function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _sb: ReturnType<typeof createClient> | null = null;

function admin(): ReturnType<typeof createClient> {
  if (!_sb) {
    _sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
  }
  return _sb;
}

export interface TelemetryInfo {
  ok: boolean;
  status: number;
  durationMs: number;
  error?: string | null;
}

function categoryFor(status: number, error?: string | null): string | null {
  if (status >= 500) return "server_error";
  if (status === 401 || status === 403) return "auth_error";
  if (status >= 400) return "request_error";
  if (error) return error.slice(0, 200);
  return null;
}

export async function record(name: string, info: TelemetryInfo): Promise<void> {
  try {
    await admin()
      .from("edge_function_invocations")
      .insert({
        function_name: name,
        duration_ms: Math.max(0, Math.round(info.durationMs)),
        status: info.status,
        success: info.ok,
        error_category: info.ok ? null : categoryFor(info.status, info.error),
      });
  } catch {
    // telemetry must never break the function
  }
}

export function trackFn(
  name: string,
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const started = Date.now();
    try {
      const res = await handler(req);
      void record(name, { ok: res.status < 400, status: res.status, durationMs: Date.now() - started });
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      void record(name, { ok: false, status: 500, durationMs: Date.now() - started, error: message });
      throw err;
    }
  };
}
