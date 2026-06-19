import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bot, X, Send, Loader2, PanelRightClose, Sparkles, ThumbsUp, ThumbsDown, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAIPanel } from "./AIPanelContext";
import AIMarkdown from "./chat/AIMarkdown";
import { loadMessages, saveMessages, clearMessages, STORAGE_KEY, ChatMessage } from "./chat/chat-store";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_sql",
      description: "Execute a SQL query against the database. Supports SELECT, INSERT, UPDATE, DELETE. For SELECT queries, execute with confirmed=true. For INSERT/UPDATE/DELETE, first show the user the query and get approval, then call again with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The SQL query to execute." },
          confirmed: { type: "boolean", description: "Set to true to confirm execution of DML queries." },
        },
        required: ["query"],
      },
    },
  },
];

function extractText(content: unknown): string | null {
  if (!content) return null;
  if (typeof content === "string") return content.trim() || null;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === "text" && block?.text) { const t = block.text.trim(); if (t) return t; }
      if (typeof block === "string") { const t = block.trim(); if (t) return t; }
    }
  }
  return null;
}

export default function AIAssistantPanel() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isOnAiTab = (location.pathname === "/admin" || location.pathname === "/coadmin") && searchParams.get("tab") === "aiAssistant";

  const isMobile = useIsMobile();
  const { open, setOpen } = useAIPanel();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<number>(0);
  const configRef = useRef<{ apiKey: string; systemPrompt: string; model: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantMsgRef = useRef(false);
  const streamedRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isHoveringRef = useRef(false);

  const initAgent = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("cohere-agent", { body: { action: "init" } });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      configRef.current = { apiKey: data.apiKey, systemPrompt: data.systemPrompt, model: data.model };
      setInitialized(true);
    } catch (e: any) {
      setError(`Init failed: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      setUser(session.user);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setRole(roleData?.role || null);
      setChecking(false);
      await initAgent();
    };
    check();
  }, [initAgent]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userScrolledUp]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setMessages(prev => {
          const loaded = loadMessages();
          return JSON.stringify(prev) === JSON.stringify(loaded) ? prev : loaded;
        });
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    if (isLoading) {
      const timer = window.setInterval(() => setThinkingStage(s => (s + 1) % 4), 400);
      thinkingTimerRef.current = timer;
      return () => clearInterval(timer);
    } else {
      setThinkingStage(0);
      clearInterval(thinkingTimerRef.current);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const invokeAgent = useCallback(async (history: ChatMessage[]) => {
    const config = configRef.current;
    if (!config) { setMessages(prev => [...prev, { role: "assistant", content: "AI not initialized. Please refresh." }]); return; }

    setIsLoading(true);
    setError("");
    streamedRef.current = "";
    assistantMsgRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    let conversation = [...history];
    let safety = 0;

    const commitText = () => {
      const snapshot = streamedRef.current;
      setMessages(prev => {
        const copy = [...prev];
        if (assistantMsgRef.current) {
          copy[copy.length - 1] = { role: "assistant", content: snapshot };
        } else {
          assistantMsgRef.current = true;
          copy.push({ role: "assistant", content: snapshot });
        }
        return copy;
      });
    };

    try {
      while (safety < 5) {
        safety++;

        const resp = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "system", content: config.systemPrompt + "\n\n" + "Current Date: " + new Date().toISOString().split("T")[0] + "\n\n" + "Current Time: " + new Date().toISOString().split("T")[1].split(".")[0] + "\n\n" + "User Current URL: " + window.location.href + "\n\n" + "User Current Role: " + role + "\n\n" + "User Data:" + JSON.stringify(user) }, ...conversation],
            tools: TOOLS,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`Cohere API error (${resp.status}): ${err}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let responseMessage: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "content-delta") {
                const text = data.delta?.message?.content?.text || "";
                if (!text) continue;
                streamedRef.current += text;
                commitText();
              } else if (data.type === "stream-end") {
                responseMessage = data.response?.message || data.message;
              }
            } catch { /* skip malformed */ }
          }
        }

        const toolCalls = responseMessage?.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          break;
        }

        if (streamedRef.current) {
          streamedRef.current += "\n\n*⚡ Executing SQL...*";
          commitText();
        }

        const toolResults: any[] = [];
        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments);
          if (tc.function.name === "run_sql") {
            const { data: sqlData, error: sqlError } = await supabase.functions.invoke("cohere-agent", {
              body: { action: "sql", query: args.query, confirmed: args.confirmed ?? false },
            });
            if (sqlError) throw new Error(sqlError.message);
            toolResults.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(sqlData) });
          } else {
            toolResults.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: `Unknown tool: ${tc.function.name}` }) });
          }
        }

        conversation = [...conversation, responseMessage, ...toolResults];
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        if (assistantMsgRef.current) {
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: streamedRef.current || "Cancelled." };
            return copy;
          });
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: streamedRef.current || "Cancelled." }]);
        }
      } else {
        setError(e.message);
        const errorSuffix = `\n\n**Error:** ${e.message}`;
        if (assistantMsgRef.current) {
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: (streamedRef.current || copy[copy.length - 1].content) + errorSuffix };
            return copy;
          });
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
        }
      }
    } finally {
      streamedRef.current = "";
      assistantMsgRef.current = false;
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setUserScrolledUp(!isNearBottom);
  }, []);

  const hasSQLBlock = (text: string) => /```sql[\s\S]*?```/i.test(text);
  const asksApproval = (text: string) => /\b(approve|confirm|shall i|should i|run this|proceed|do you want me to)\b/i.test(text);

  const handleApprove = () => {
    const history = [...messages, { role: "user" as const, content: "Yes, I approve. Please execute the query." }];
    setMessages(history);
    invokeAgent(history);
  };

  const handleReject = () => {
    const history = [...messages, { role: "user" as const, content: "No, don't run it." }];
    setMessages(history);
    invokeAgent(history);
  };

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading || !initialized) return;
    setInput("");
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    invokeAgent(history);
  }, [input, isLoading, messages, invokeAgent, initialized]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]);
    clearMessages();
    setError("");
    initAgent();
  };

  if (checking || !role || isOnAiTab) return null;

  const dots = ".".repeat(thinkingStage);
  const hasNonEmptyAssistant = messages.some(m => m.role === "assistant" && m.content);

  const msgList = (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
          <Sparkles className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">At your service.</p>
          <p className="text-xs mt-1">Ask about users, notes, payments, or any platform feature.</p>
        </div>
      )}
      {messages.map((msg, i) => {
        const isStreamingMsg = isLoading && msg.role === "assistant" && i === messages.length - 1;
        return (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"} ${isStreamingMsg ? "animate-fade-in" : ""}`}>
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              ) : (
                <AIMarkdown content={msg.content} />
              )}
            </div>
            {msg.role === "assistant" && i === messages.length - 1 && !isLoading && hasSQLBlock(msg.content) && asksApproval(msg.content) && (
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
      {isLoading && !hasNonEmptyAssistant && (
        <div className="flex justify-start">
          <div className="rounded-lg px-3 py-2 bg-muted text-sm flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking{dots}</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );

  const chatInput = (
    <div className="border-t p-3 flex gap-2 shrink-0 items-center">
      <Textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask anything..." disabled={isLoading || !initialized} className="flex-1 min-h-[40px] max-h-[120px] resize-none" rows={3} />
      {isLoading ? (
        <Button onClick={handleStop} size="icon" variant="destructive" className="h-full w-9 shrink-0">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={sendMessage} disabled={!input.trim() || !initialized} size="icon" className="h-full w-9 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {open && (
          <div ref={panelRef} className="fixed inset-0 z-[60] bg-background flex flex-col" onMouseEnter={() => { isHoveringRef.current = true; }} onMouseLeave={() => { isHoveringRef.current = false; }}>
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bot className="h-4 w-4 text-primary" /> A.R.C.H.O.N. <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">BETA</span>
                <small className="text-xs text-muted-foreground">(Academic Resource & Command Hub for Organized Notes)</small>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground h-7 px-2">
                    Clear
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {msgList}
            {chatInput}
          </div>
        )}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-[60] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Bot className="h-5 w-5" />
          </button>
        )}
      </>
    );
  }

  return (
    <>
      {open ? (
        <div ref={panelRef} className="fixed right-0 top-0 bottom-0 z-40 w-[28.571%] border-l bg-background flex flex-col shadow-lg" onMouseEnter={() => { isHoveringRef.current = true; }} onMouseLeave={() => { isHoveringRef.current = false; }}>
          <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0">
            <div className="flex flex-col items-start gap-1 text-sm font-semibold">
              <span className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> A.R.C.H.O.N. <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">BETA</span></span>
              <small className="text-[10px] text-muted-foreground">(Academic Resource & Command Hub for Organized Notes)</small>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground h-7 px-2">
                  Clear
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {msgList}
          {chatInput}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l-md border border-r-0 bg-background px-1.5 py-4 shadow-md hover:bg-accent transition-colors flex flex-col items-center gap-1"
          title="Open A.R.C.H.O.N."
        >
          <Bot className="h-4 w-4 text-primary transform rotate-90" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-medium text-muted-foreground tracking-wider">A.R.C.H.O.N.</span>
        </button>
      )}
    </>
  );
}
