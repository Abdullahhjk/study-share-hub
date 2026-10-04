import { RefObject } from "react";
import { Loader2, Clock, Pen, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIMarkdown from "./AIMarkdown";
import ToolCallSection from "./ToolCallSection";
import AIEmptyState from "./AIEmptyState";
import type { ChatMessage } from "./chat-store";
import { Separator } from "@radix-ui/react-dropdown-menu";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isQuotaExhausted: boolean;
  error: string;
  timeUntilReset: string;
  executingSql: boolean;
  user: any;
  avatar: string;
  copiedId: number | null;
  editingIndex: number | null;
  streamMode: "collect" | "stream";
  initStatus: "idle" | "initializing" | "done";
  containerRef: RefObject<HTMLDivElement>;
  bottomRef: RefObject<HTMLDivElement>;
  handleScroll: () => void;
  handleApprove: () => void;
  handleReject: () => void;
  handleCopy: (text: string, id: number) => void;
  handleEdit: (id: number) => void;
  asksApproval: (text: string) => boolean;
  dots: string;
}

export default function ChatMessageList({
  messages, isLoading, isQuotaExhausted, error, timeUntilReset, executingSql,
  user, avatar, copiedId, editingIndex, streamMode, initStatus,
  containerRef, bottomRef, handleScroll,
  handleApprove, handleReject, handleCopy, handleEdit, asksApproval,
  dots,
}: ChatMessageListProps) {
  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.length === 0 && (
        <AIEmptyState
          isQuotaExhausted={isQuotaExhausted}
          error={error}
          timeUntilReset={timeUntilReset}
        />
      )}

      {initStatus === "done" && (
        <div className="flex justify-center animate-fade-in">
          <div
            className={`text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md ${isQuotaExhausted
              ? "bg-muted text-muted-foreground"
              : "bg-success text-success-foreground"
              }`}
          >
            <span>Initialized</span>
          </div>
        </div>
      )}

      {messages.map((msg, i) => {
        if (msg.role === "assistant" && !msg.content) return null;

        const isNewAssistant =
          !isLoading &&
          msg.role === "assistant" &&
          i === messages.length - 1 &&
          i > 0 &&
          messages[i - 1].role === "user";

        const isCopied = copiedId === i;

        return (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`min-w-[50%] max-w-[95%] rounded-2xl px-4 py-3 text-sm group hover:border-primary/50 relative backdrop-blur-sm transition-all duration-200 ${msg.role === "user" && streamMode === "stream"
                ? "bg-success/70 text-foreground border border-success/20 "
                : msg.role === "user" && streamMode === "collect"
                  ? "bg-primary/70 text-foreground border border-primary/20"
                  : "bg-muted border border-border"
                } ${isNewAssistant ? "animate-fade-in" : ""} ${editingIndex === i ? "ring-2 ring-success/60" : ""}`}
            >
              {msg.role === "user" ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-success/20 border border-success/30 flex items-center justify-center shrink-0">
                      <img src={avatar || "/user.png"} alt="User" className="h-5 w-5 rounded-full" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-semibold tracking-wide uppercase text-foreground">
                        {user?.user_metadata?.full_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
                        Operator
                      </span>
                    </div>
                  </div>
                  <AIMarkdown content={msg.content} />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-sm shrink-0">
                      <img src="/ARCHON.png" alt="ARCHON" className="h-5 w-5 rounded-full" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-semibold tracking-[0.12em] uppercase text-foreground">
                        ARCHON
                      </span>
                      <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
                        Synthetic Intelligence
                      </span>
                    </div>
                  </div>
                  <AIMarkdown content={msg.content} />
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <ToolCallSection calls={msg.toolCalls} />
                  )}
                </>
              )}

              <div
                className={`grid grid-rows-[0fr] group-hover:grid-rows-[1fr] opacity-0 group-hover:opacity-100 transition-all duration-200 ${msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div className="overflow-hidden min-h-0">
                  <div className={`flex gap-1 pt-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "user" && (
                      <button
                        onClick={() => handleEdit(i)}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors"
                        title="Edit"
                      >
                        <Pen className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(msg.content, i)}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors"
                      title={isCopied ? "Copied" : "Copy"}
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {msg.role === "assistant" &&
              i === messages.length - 1 &&
              !isLoading &&
              msg.toolCalls &&
              msg.toolCalls.length > 0 &&
              asksApproval(msg.content) && (
                <div className="flex gap-2 mt-2 animate-fade-in">
                  <Button size="sm" onClick={handleApprove} className="gap-1.5 text-xs h-8">
                    <ThumbsUp className="h-3.5 w-3.5" /> Yes
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReject} className="gap-1.5 text-xs h-8">
                    <ThumbsDown className="h-3.5 w-3.5" /> No
                  </Button>
                </div>
              )}
          </div>
        );
      })}

      {isLoading && !executingSql && (
        (!messages.length || !messages[messages.length - 1].content || messages[messages.length - 1].role !== "assistant") && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 bg-muted text-sm flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking{dots}</span>
            </div>
          </div>
        )
      )}

      {executingSql && (
        <div className="flex justify-start">
          <div className="rounded-lg px-3 py-2 bg-muted text-sm flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Executing SQL{dots}</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
