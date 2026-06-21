import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CohereClientV2 } from "cohere-ai";
import { X, Send, Loader2, PanelRightClose, Sparkles, ThumbsUp, ThumbsDown, Square, Copy, Check, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAIPanel } from "./AIPanelContext";
import AIMarkdown from "./chat/AIMarkdown";
import { loadMessages, saveMessages, clearMessages, STORAGE_KEY, ChatMessage, ToolCallData } from "./chat/chat-store";

function ToolCallSection({ calls }: { calls: ToolCallData[] }) {
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

const TOOLS = [
  {
    type: "function" as const,
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
  const { open, setOpen, panelWidth, setPanelWidth } = useAIPanel();
  const [user, setUser] = useState<any>(null);
  const [avatar, setAvatar] = useState<string>("/user.png");
  const [isColorBlind, setIsColorBlind] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [initStatus, setInitStatus] = useState<"idle" | "initializing" | "done">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [streamMode, setStreamMode] = useState<"collect" | "stream">("collect");
  const [executingSql, setExecutingSql] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<number>(0);
  const configRef = useRef<{ apiKey: string; systemPrompt: string; model: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isHoveringRef = useRef(false);
  const resizeRef = useRef({ isResizing: false, startX: 0, startWidth: 0 });

  const initAgent = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("cohere-agent", { body: { action: "init" } });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      configRef.current = { apiKey: data.apiKey, systemPrompt: data.systemPrompt, model: data.model };
      setInitialized(true);
      setInitStatus("done");
    } catch (e: any) {
      setError(`Init failed: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      setUser(session.user);
      const { data: avatar_url } = await supabase.from("profiles").select("avatar_url").eq("id", session.user.id).maybeSingle();
      setAvatar(avatar_url?.avatar_url || "/user.png");
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
    const check = () => setIsColorBlind(document.documentElement.classList.contains("colorblind-mode"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (initStatus === "done") {
      const t = setTimeout(() => setInitStatus("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [initStatus]);

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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { isResizing: true, startX: e.clientX, startWidth: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current.isResizing) return;
      const dx = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(40, Math.max(25, resizeRef.current.startWidth + (dx / window.innerWidth) * 100));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!resizeRef.current.isResizing) return;
      resizeRef.current.isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const invokeAgent = useCallback(async (history: ChatMessage[]) => {
    const config = configRef.current;
    if (!config) { setMessages(prev => [...prev, { role: "assistant", content: "AI not initialized. Please refresh." }]); return; }

    setIsLoading(true);
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const systemMsg = {
      role: "system" as const,
      content:
        config.systemPrompt +
        "\n\nCurrent Date: " +
        new Date().toLocaleDateString("en-CA") +
        "\n\nCurrent Time: " +
        new Date().toLocaleTimeString("en-GB", {
          hour12: false,
        }) +
        "\n\nCurrent Time Zone: " +
        Intl.DateTimeFormat().resolvedOptions().timeZone +
        "\n\nUser Current URL: " +
        window.location.href +
        "\n\nCurrent Page Content:\n" +
        document.body.innerText.slice(0, 30000) +
        "\n\nUser Current Role: " +
        role +
        "\n\nUser Data: " +
        JSON.stringify(user),
    };

    const sanitize = (msgs: ChatMessage[]) => msgs.map(({ toolCalls: _, ...rest }) => rest);

    try {
      // ── STREAM MODE ──────────────────────────────────────────
      if (streamMode === "stream") {
        const client = new CohereClientV2({ token: config.apiKey });

        const streamMsgIdx = history.length;
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        let fullText = "";
        const toolCallsAcc = new Map<number, {
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>();

        // ── First streaming request ──
        {
          const streamResp = await client.chatStream({
            model: config.model,
            messages: [systemMsg, ...sanitize(history)],
            tools: TOOLS,
          }, { abortSignal: controller.signal });

          const stream = await streamResp;

          for await (const event of stream) {
            if (event.type === "content-delta") {
              const text = event.delta?.message?.content?.text;
              if (text) {
                fullText += text;
                setMessages(prev => {
                  const copy = [...prev];
                  if (streamMsgIdx < copy.length) {
                    copy[streamMsgIdx] = { role: "assistant", content: fullText };
                  }
                  return copy;
                });
              }
            } else if (event.type === "tool-call-start") {
              const tc = event.delta?.message?.toolCalls;
              if (tc) {
                toolCallsAcc.set(event.index ?? 0, {
                  id: tc.id,
                  type: "function",
                  function: {
                    name: tc.function?.name ?? "",
                    arguments: tc.function?.arguments ?? "",
                  },
                });
              }
            } else if (event.type === "tool-call-delta") {
              const idx = event.index ?? 0;
              const existing = toolCallsAcc.get(idx);
              if (existing) {
                existing.function.arguments += event.delta?.message?.toolCalls?.function?.arguments ?? "";
              }
            }
          }
        }

        const toolCallsFromStream = Array.from(toolCallsAcc.values())
          .filter(tc => tc.function.name === "run_sql");

        // ── Execute tool calls if any ────────────────────────────
        if (toolCallsFromStream.length > 0) {
          const originalText = fullText;
          setExecutingSql(true);

          const executed: { tc: typeof toolCallsFromStream[0]; data: any }[] = [];
          for (const tc of toolCallsFromStream) {
            const args = JSON.parse(tc.function.arguments || "{}");
            if (tc.function.name === "run_sql") {
              const { data: sqlData, error } = await supabase.functions.invoke("cohere-agent", {
                body: { action: "sql", query: args.query, confirmed: args.confirmed ?? false },
              });
              if (error) throw new Error(error.message);
              executed.push({ tc, data: sqlData });
            }
          }

          const toolCallData: ToolCallData[] = executed.map(({ tc, data }) => {
            const args = JSON.parse(tc.function.arguments || "{}");
            return { query: args.query, result: data };
          });

          setExecutingSql(false);

          setMessages(prev => {
            const copy = [...prev];
            if (streamMsgIdx < copy.length) {
              copy[streamMsgIdx] = { role: "assistant", content: originalText, toolCalls: toolCallData };
            }
            return copy;
          });

          // ── Second streaming request with tool results ──
          const toolMessages = [
            ...sanitize(history),
            { role: "assistant" as const, toolCalls: toolCallsFromStream, content: originalText || "" },
            ...executed.map(({ tc, data }) => ({
              role: "tool" as const,
              toolCallId: tc.id,
              content: JSON.stringify(data),
            })),
          ];

          const streamResp2 = await client.chatStream({
            model: config.model,
            messages: [systemMsg, ...toolMessages],
            tools: TOOLS,
          }, { abortSignal: controller.signal });

          const stream2 = await streamResp2;
          let fullText2 = "";

          for await (const event of stream2) {
            if (event.type === "content-delta") {
              const text = event.delta?.message?.content?.text;
              if (text) {
                fullText2 += text;
                setMessages(prev => {
                  const copy = [...prev];
                  if (streamMsgIdx < copy.length) {
                    copy[streamMsgIdx] = { role: "assistant", content: fullText2, toolCalls: toolCallData };
                  }
                  return copy;
                });
              }
            }
          }

          setMessages(prev => {
            const copy = [...prev];
            if (streamMsgIdx < copy.length) {
              copy[streamMsgIdx] = {
                role: "assistant",
                content: fullText2 || originalText || "Empty response",
                toolCalls: toolCallData,
              };
            }
            return copy;
          });
        } else {
          setMessages(prev => {
            const copy = [...prev];
            if (streamMsgIdx < copy.length) {
              copy[streamMsgIdx] = { role: "assistant", content: fullText || "Empty response" };
            }
            return copy;
          });
        }

        return;
      }

      // ── COLLECT MODE (existing 2-step tool flow) ─────────────
      const client = new CohereClientV2({ token: config.apiKey });

      const firstResp = await client.chat({
        model: config.model,
        messages: [systemMsg, ...sanitize(history)],
        tools: TOOLS,
      }, { abortSignal: controller.signal });

      const firstMsg = firstResp.message;
      const firstText = extractText(firstMsg.content) ?? "";
      const toolCalls = firstMsg.toolCalls || [];

      if (!toolCalls.length) {
        setMessages(prev => [...prev, { role: "assistant", content: firstText || "Empty response" }]);
        return;
      }

      const toolMsgIdx = history.length;
      setMessages(prev => [...prev, { role: "assistant", content: firstText ? firstText + "\n\n*Executing SQL...*" : "*Executing SQL...*" }]);

      const executed: { tc: (typeof toolCalls)[number]; data: any }[] = [];
      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function?.arguments || "{}");
        if (tc.function?.name === "run_sql") {
          const { data: sqlData, error } = await supabase.functions.invoke("cohere-agent", {
            body: { action: "sql", query: args.query, confirmed: args.confirmed ?? false },
          });
          if (error) throw new Error(error.message);
          executed.push({ tc, data: sqlData });
        }
      }

      const toolCallData: ToolCallData[] = executed.map(({ tc, data }) => {
        const args = JSON.parse(tc.function?.arguments || "{}");
        return { query: args.query, result: data };
      });

      const secondResp = await client.chat({
        model: config.model,
        messages: [
          systemMsg,
          ...sanitize(history),
          { role: "assistant", toolCalls, content: firstText },
          ...executed.map(({ tc, data }) => ({
            role: "tool" as const,
            toolCallId: tc.id,
            content: JSON.stringify(data),
          })),
        ],
        tools: TOOLS,
      }, { abortSignal: controller.signal });

      const assistantText = extractText(secondResp.message.content) ?? "Empty response";

      setMessages(prev => {
        const copy = [...prev];
        if (toolMsgIdx < copy.length) {
          copy[toolMsgIdx] = { role: "assistant", content: assistantText, toolCalls: toolCallData };
        }
        return copy;
      });

    } catch (e: any) {
      if (e.name === "AbortError") return;
      setError(e.message);
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
      setExecutingSql(false);
      abortRef.current = null;
    }
  }, [role, user, streamMode]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setUserScrolledUp(!isNearBottom);
  }, []);

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
    setEditingIndex(null);

    if (editingIndex !== null) {
      const history = [
        ...messages.slice(0, editingIndex),
        { role: "user" as const, content: text },
      ];
      setMessages(history);
      invokeAgent(history);
    } else {
      const history = [...messages, { role: "user" as const, content: text }];
      setMessages(history);
      invokeAgent(history);
    }
  }, [input, isLoading, messages, invokeAgent, initialized, editingIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInit = async () => {
    setMessages([]);
    clearMessages();
    setError("");
    setEditingIndex(null);
    setInitStatus("initializing");
    try {
      await initAgent();
      setInitStatus("done");
    } catch {
      setInitStatus("idle");
    }
  };

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (id: number) => {
    const msg = messages[id];
    if (msg.role !== "user") return;
    setInput(msg.content);
    setEditingIndex(id);
  };

  if (checking || !role || isOnAiTab) return null;

  const dots = ".".repeat(thinkingStage);

  const msgList = (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[90%] text-center text-muted-foreground px-4">
          <img src="/ARCHON.png" alt="ARCHON" className="h-20 w-20 mb-2" />
          <p className="text-sm font-bold text-xl">A.R.C.H.O.N</p>
          <p className="text-sm font-medium">At your service.</p>
          <p className="text-xs mt-1">Ask about users, notes, payments, or any platform feature.</p>
        </div>
      )}
      {initStatus === "done" && (
        <div className="flex justify-center animate-fade-in">
          <div className="bg-success text-success-foreground text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
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
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"
              }`}
          >
            <div
              className={`min-w-[50%] max-w-[95%] rounded-2xl px-4 py-3 text-sm group relative backdrop-blur-sm transition-all duration-200 ${msg.role === "user" && streamMode === "stream"
                ? "bg-success/70 text-foreground border border-success/20"
                : msg.role === "user" && streamMode === "collect"
                  ? "bg-primary/70 text-foreground border border-primary/20"
                  : "bg-muted border border-border/40"
                } ${isNewAssistant ? "animate-fade-in" : ""
                } ${editingIndex === i ? "ring-2 ring-success/60" : ""
                }`}
            >
              {msg.role === "user" ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-success/20 border border-success/30 flex items-center justify-center shrink-0">
                      <img src={avatar || "/user.png"} alt="User" className="h-5 w-5 rounded-full" />
                    </div>

                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-semibold tracking-wide uppercase text-foreground">
                        {user?.user_metadata.full_name}
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
                    <div className="h-8 w-8 rounded-full items-center justify-center bg-primary/20 border border-primary/30 flex items-center justify-center shadow-sm shrink-0">
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
                  <div
                    className={`flex gap-1 pt-2 ${msg.role === "user"
                      ? "justify-end"
                      : "justify-start"
                      }`}
                  >
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
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
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
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="gap-1.5 text-xs h-8"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Yes
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReject}
                    className="gap-1.5 text-xs h-8"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    No
                  </Button>
                </div>
              )}
          </div>
        );
      })}

      {isLoading && !executingSql && (!messages.length || !messages[messages.length - 1].content || messages[messages.length - 1].role !== "assistant") && (
        <div className="flex justify-start">
          <div className="rounded-lg px-3 py-2 bg-muted text-sm flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking{dots}</span>
          </div>
        </div>
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

  const chatInput = (
    <div className={`border-t p-3 flex gap-2 shrink-0 items-center ${streamMode === "stream" && !isMobile ? "border-success/20" : ""}`}>
      <Textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask anything..." disabled={isLoading || !initialized} className={`flex-1 min-h-[40px] border-[3px] max-h-[120px] resize-none ${streamMode === "stream" && !isMobile ? "bg-success/5 border-success/20 focus-visible:ring-success/50 focus-visible:border-success" : ""} ${isColorBlind ? "border-success/40" : ""}`} rows={3} />
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
        <Button onClick={sendMessage} disabled={!input.trim() || !initialized} size="icon" className={`h-full w-9 shrink-0 ${streamMode === "stream" && !isMobile ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}>
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          ref={panelRef}
          className={`fixed inset-0 z-[60] flex flex-col bg-background transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
          onMouseEnter={() => { isHoveringRef.current = true; }}
          onMouseLeave={() => { isHoveringRef.current = false; }}
        >
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
              <img src="/ARCHON.png" alt="ARCHON" className="h-5 w-5 shrink-0" /> <span className="truncate">A.R.C.H.O.N.</span>
              <button
                onClick={() => setStreamMode(s => s === "collect" ? "stream" : "collect")}
                className="ml-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors shrink-0 bg-muted text-muted-foreground border-border"
              >
                {streamMode === "stream" ? "Streaming" : "Collection"}
              </button>

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
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            {msgList}
            {chatInput}
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-12 right-5 z-[61] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all duration-300 ease-in-out ${open ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"}`}
          title="Open A.R.C.H.O.N."
        >
          <img src="/ARCHON.png" alt="ARCHON" className="h-5 w-5" />
        </button>
      </>
    );
  }

  return (
    <>
      <div
        ref={panelRef}
        style={{ width: `${panelWidth}%` }}
        className={`fixed right-0 top-0 bottom-0 z-40 border-l flex flex-col shadow-lg bg-background transition-transform duration-300 ease-in-out ${streamMode === "stream" ? "border-success/20" : "border-border"} ${open ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
        onMouseEnter={() => { isHoveringRef.current = true; }}
        onMouseLeave={() => { isHoveringRef.current = false; }}
      >
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute left-0 top-0 bottom-0 w-5 -ml-2.5 cursor-col-resize z-50 flex items-center justify-center group"
        >
          <div className="h-full w-1.5" />
          <div className="absolute top-1/2 -translate-y-1/2 w-2 h-10 rounded-full bg-border/60 group-hover:bg-primary/50 group-active:bg-primary/60 transition-colors" />
        </div>
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${streamMode === "stream" ? "opacity-100" : "opacity-0"} bg-gradient-to-b from-success/[0.04] to-success/[0.15] ${isColorBlind ? "hidden" : ""}`} />
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          <div className={`flex items-center justify-between border-b px-3 py-2.5 shrink-0 ${streamMode === "stream" ? "border-success/20" : ""}`}>
            <div className="flex flex-col items-start gap-1 text-sm font-semibold">
              <span className="flex items-center gap-2"><img src="/ARCHON.png" alt="ARCHON" className="h-5 w-5" /> A.R.C.H.O.N.
                <button
                  onClick={() => setStreamMode(s => s === "collect" ? "stream" : "collect")}
                  className={`ml-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${streamMode === "stream" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}
                >
                  {streamMode === "stream" ? "Streaming" : "Collect"}
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
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {msgList}
          {chatInput}
        </div>
      </div>
      <button
        onClick={() => setOpen(true)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 rounded-l-md border border-r-0 bg-background px-1.5 py-4 shadow-md hover:bg-accent flex flex-col items-center gap-1 transition-all duration-300 ease-in-out group ${open ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        title="Open A.R.C.H.O.N."
      >
        <img src="/ARCHON.png" alt="ARCHON" className="h-4 w-4 rotate-90 transition-transform duration-300 group-hover:rotate-0" />

        <span className="text-[10px] font-medium text-muted-foreground tracking-wider flex flex-col items-center leading-none">
          {"ARCHON".split("").map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </span>
      </button>
    </>
  );
}
