import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEDUPE_MS = 60_000;
const MAX_KEYS = 200;

export function SystemEventReporter() {
  const recent = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const send = async (level: "warn" | "error", message: string, stack?: string) => {
      const key = `${level}:${message}`;
      const now = Date.now();
      if (recent.current.size > MAX_KEYS) return;
      const last = recent.current.get(key);
      if (last && now - last < DEDUPE_MS) return;
      recent.current.set(key, now);
      try {
        await supabase.rpc("log_system_event", {
          p_source: "web",
          p_level: level,
          p_message: message.slice(0, 500),
          p_stack: stack ? stack.slice(0, 2000) : null,
          p_url: window.location.href,
        });
      } catch {
        // never let error reporting break the app
      }
    };

    const onError = (e: ErrorEvent) => {
      const stack = typeof e.error?.stack === "string" ? e.error.stack : `${e.filename}:${e.lineno}`;
      send("error", e.message || "Uncaught error", stack);
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason;
      const msg =
        typeof reason === "object" && reason !== null && "message" in reason
          ? String((reason as { message?: unknown }).message ?? reason)
          : String(reason ?? "Unhandled promise rejection");
      const stack = typeof (reason as { stack?: unknown })?.stack === "string" ? String((reason as { stack: string }).stack) : undefined;
      send("error", msg.slice(0, 500), stack);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
