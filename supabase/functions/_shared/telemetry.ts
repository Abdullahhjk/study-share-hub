// Shared edge-function execution telemetry.
//
// Status: DISABLED (no-op).
//
// The destination table `edge_function_invocations` was removed from the
// database by migration 024_sys_observability.sql (a REVERT migration), so
// every record() call was firing an insert that could never succeed and its
// error was discarded. trackFn() is still wired up so timing/observability
// can be restored by re-creating the table and re-enabling record() below.

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

export async function record(name: string, info: TelemetryInfo): Promise<void> {
  void admin;
  void name;
  void info;
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
