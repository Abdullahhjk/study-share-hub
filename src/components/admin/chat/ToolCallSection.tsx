import { useState } from "react";
import type { ToolCallData } from "./chat-store";

export default function ToolCallSection({ calls }: { calls: ToolCallData[] }) {
  const [open, setOpen] = useState(false);

  if (!calls.length) return null;

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        {open ? "▼" : "▶"} {calls.length} SQL {calls.length === 1 ? "Query" : "Queries"}
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-border bg-background p-3 space-y-3">
          {calls.map((call, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-border my-3" />}
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Query {i + 1}
              </div>
              <pre className="bg-[#1e1e2e] text-[13px] leading-relaxed rounded p-2.5 overflow-x-auto mb-2">
                <code>{call.query}</code>
              </pre>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Output
              </div>
              <pre className="bg-[#1e1e2e] text-[13px] leading-relaxed rounded p-2.5 overflow-x-auto">
                <code>{JSON.stringify(call.result, null, 2)}</code>
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
