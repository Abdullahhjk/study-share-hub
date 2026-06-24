import { RefObject } from "react";
import { X, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  initialized: boolean;
  isQuotaExhausted: boolean;
  editingIndex: number | null;
  setEditingIndex: (idx: number | null) => void;
  streamMode: "collect" | "stream";
  isMobile: boolean;
  isColorBlind: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
  sendMessage: () => void;
  handleStop: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function ChatInput({
  input, setInput, isLoading, initialized, isQuotaExhausted,
  editingIndex, setEditingIndex, streamMode, isMobile, isColorBlind,
  textareaRef, sendMessage, handleStop, handleKeyDown,
}: ChatInputProps) {
  return (
    <div className={`border-t p-3 flex gap-2 shrink-0 items-center ${streamMode === "stream" && !isMobile ? "border-success/20" : ""}`}>
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={!isQuotaExhausted ? "Ask anything..." : "Quota exhausted..."}
        disabled={isLoading || !initialized || isQuotaExhausted}
        className={`flex-1 min-h-[40px] border-[3px] max-h-[120px] resize-none ${streamMode === "stream" && !isMobile ? "bg-success/5 border-success/20 focus-visible:ring-success/50 focus-visible:border-success" : ""} ${isColorBlind ? "border-success/40" : ""}`}
        rows={3}
      />
      {editingIndex !== null ? (
        <Button
          onClick={() => { setEditingIndex(null); setInput(""); }}
          size="icon"
          variant="outline"
          className="h-full w-9 shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
          title="Cancel edit"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      {isLoading ? (
        <Button onClick={handleStop} size="icon" className={`h-full w-9 shrink-0 ${streamMode === "stream" && !isMobile ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`} variant={streamMode === "stream" && !isMobile ? "default" : "destructive"}>
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={sendMessage} disabled={!input.trim() || !initialized || isQuotaExhausted} size="icon" className={`h-full w-9 shrink-0 ${streamMode === "stream" && !isMobile ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}>
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
