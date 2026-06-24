import { Clock } from "lucide-react";

interface AIEmptyStateProps {
  isQuotaExhausted: boolean;
  error: string;
  timeUntilReset: string;
}

export default function AIEmptyState({ isQuotaExhausted, error, timeUntilReset }: AIEmptyStateProps) {
  if (isQuotaExhausted) {
    return (
      <div className="flex flex-col items-center justify-center h-[90%] text-center text-muted-foreground px-4">
        <img src="/ARCHON.png" alt="ARCHON" className="h-20 w-20 mb-2 opacity-40" />
        <p className="text-xl font-bold text-destructive">ARCHON Unavailable</p>
        <p className="text-sm mt-2 max-w-xs text-muted-foreground">
          {error ? error : "All AI request quotas have been exhausted for this cycle."}
        </p>
        {timeUntilReset && (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-500">
            <Clock className="h-4 w-4" /> Resets in {timeUntilReset}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[90%] text-center text-muted-foreground px-4">
      <img src="/ARCHON.png" alt="ARCHON" className="h-20 w-20 mb-2" />
      <p className="text-sm font-bold text-xl">A.R.C.H.O.N</p>
      <p className="text-sm font-medium">At your service.</p>
      <p className="text-xs mt-1">Ask about users, notes, payments, or any platform feature.</p>
    </div>
  );
}
