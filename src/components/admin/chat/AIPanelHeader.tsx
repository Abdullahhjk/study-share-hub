import { Loader2, X, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIPanelHeaderProps {
  isMobile: boolean;
  streamMode: "collect" | "stream";
  isQuotaExhausted: boolean;
  initStatus: "idle" | "initializing" | "done";
  setStreamMode: (fn: (prev: "collect" | "stream") => "collect" | "stream") => void;
  handleInit: () => void;
  setOpen: (val: boolean) => void;
}

export default function AIPanelHeader({
  isMobile, streamMode, isQuotaExhausted, initStatus,
  setStreamMode, handleInit, setOpen,
}: AIPanelHeaderProps) {
  return (
    <div className={`flex items-center justify-between border-b px-3 py-2.5 shrink-0 ${!isMobile && streamMode === "stream" ? "border-success/20" : ""}`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${isMobile ? "" : "flex-col items-start gap-1"}`}>
        <span className="flex items-center gap-2">
          <img src="/ARCHON.png" alt="ARCHON" className="h-5 w-5 shrink-0" />
          <span className={isMobile ? "truncate" : ""}>A.R.C.H.O.N.</span>
          <button
            disabled={isQuotaExhausted}
            onClick={() => setStreamMode(s => s === "collect" ? "stream" : "collect")}
            className={`ml-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors shrink-0
              ${!isMobile && streamMode === "stream"
                ? "bg-success/10 text-success border-success/30"
                : "bg-muted text-muted-foreground border-border"
              }
              ${isQuotaExhausted ? "cursor-not-allowed" : ""}`}
          >
            {streamMode === "stream" ? "Streaming" : "Collection"}
          </button>
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={handleInit} disabled={initStatus === "initializing"} className="text-xs h-7 px-2 text-muted-foreground">
          {initStatus === "initializing" ? (
            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Init</>
          ) : (
            "Init"
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
          {isMobile ? <X className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
