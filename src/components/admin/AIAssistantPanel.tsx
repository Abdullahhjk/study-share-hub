import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAdminMfaPending } from "@/lib/mfa";
import { CohereClientV2 } from "cohere-ai";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAIPanel } from "./AIPanelContext";
import ChatMessageList from "./chat/ChatMessageList";
import ChatInput from "./chat/ChatInput";
import AIPanelHeader from "./chat/AIPanelHeader";
import { loadMessages, saveMessages, clearMessages, STORAGE_KEY, ChatMessage, ToolCallData } from "./chat/chat-store";

const SQL_TOOL = {
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
};

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
  const isMobile = useIsMobile();
  const { open, setOpen, panelWidth, setPanelWidth, activePanel, setActivePanel, systemContext } = useAIPanel();
  const isOnAiTab = (location.pathname === "/admin" || location.pathname === "/coadmin") && searchParams.get("tab") === "aiAssistant";

  const isArchonActive = activePanel === "archon";
  const archonShown = open && isArchonActive;

  const openArchonTab = () => {
    setActivePanel("archon");
    setOpen(true);
  };
  const [user, setUser] = useState<any>(null);
  const [avatar, setAvatar] = useState<string>("/user.png");
  const [isColorBlind, setIsColorBlind] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [mfaPending, setMfaPending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [initStatus, setInitStatus] = useState<"idle" | "initializing" | "done">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [streamMode, setStreamMode] = useState<"collect" | "stream">("stream");
  const [executingSql, setExecutingSql] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [quotaBannerDismissed, setQuotaBannerDismissed] = useState(false);
  const [userKeys, setUserKeys] = useState<{ key: string; label: string; request_count: number }[]>([]);
  const [userKeyIndex, setUserKeyIndex] = useState(0);
  useEffect(() => {
    if (!resetAt) return;
    const update = () => {
      const diff = new Date(resetAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeUntilReset("");
        setIsQuotaExhausted(false);
        setResetAt(null);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeUntilReset(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [resetAt]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<number>(0);
  const configRef = useRef<{
    apiKey: string;
    systemPrompt: string;
    model: string;
    quota: number;
    keyName: string;
    secondaryApiKey?: string;
    nextKeyName?: string;
    secondaryQuota?: number;
    isFinalBatch: boolean;
    message?: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isHoveringRef = useRef(false);
  const resizeRef = useRef({ isResizing: false, startX: 0, startWidth: 0 });
  const quotaUsedRef = useRef(0);
  const secondaryUsedRef = useRef(0);

  const initAgent = useCallback(async () => {
    try {
      if (!user?.id) return;
      const isAdmin = role === "admin" || role === "coadmin";

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("cohere-agent", { body: { action: "init" } });

      if (isAdmin) {
        if (edgeError) throw new Error(edgeError.message);
        const data = edgeData ?? {};
        if (data?.error) throw new Error(data.error);
        if (data?.rateLimited) {
          setIsQuotaExhausted(true);
          setResetAt(data.resetAt);
          setError(`ARCHON is rate limited until ${new Date(data.resetAt).toLocaleString()} (midnight UTC). All available AI request quotas have been exhausted for this cycle.`);
          setInitialized(true);
          setInitStatus("done");
          return;
        }
        configRef.current = { apiKey: data.apiKey, systemPrompt: data.systemPrompt, model: data.model, quota: data.quota, keyName: data.keyName, secondaryApiKey: data.secondaryApiKey, nextKeyName: data.nextKeyName, secondaryQuota: data.secondaryQuota, isFinalBatch: data.isFinalBatch, message: data.message };
        quotaUsedRef.current = 0;
        secondaryUsedRef.current = 0;
        setIsQuotaExhausted(false);
        setResetAt(null);
        setInitialized(true);
        setInitStatus("done");
        return;
      }

      const { data: settings } = await supabase
        .from("user_settings")
        .select("cohere_api_keys")
        .eq("user_id", user?.id)
        .maybeSingle();

      const keys = (settings?.cohere_api_keys as { key: string; label: string; request_count: number }[]) ?? [];
      setUserKeys(keys);

      if (keys.length === 0) {
        setError("No Cohere API keys configured. Add keys in ARCHON Keys.");
        setInitialized(true);
        setInitStatus("done");
        return;
      }

      const availableKeys = keys.filter(k => k.request_count < 1000);;
      if (availableKeys.length === 0) {
        setIsQuotaExhausted(true);
        setResetAt(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
        setError("All your API key quotas are exhausted. Quotas reset on the 1st of each month.");
        setInitialized(true);
        setInitStatus("done");
        return;
      }

      const chosen = availableKeys[0];
      const chosenIndex = keys.indexOf(chosen);
      setUserKeyIndex(chosenIndex);

      configRef.current = {
        apiKey: chosen.key,
        systemPrompt: (edgeData && !edgeError && edgeData?.systemPrompt)
          ? edgeData.systemPrompt
          : `You are ARCHON, an AI assistant for Scholar Share. You are helpful, concise, and professional. Current date: ${new Date().toLocaleDateString("en-CA")}.`,
        model: "command-a-03-2025",
        quota: 1000,
        keyName: chosen.label,
        isFinalBatch: false,
      };
      quotaUsedRef.current = chosen.request_count;
      secondaryUsedRef.current = 0;
      setIsQuotaExhausted(false);
      setResetAt(null);
      setInitialized(true);
      setInitStatus("done");
    } catch (e: any) {
      setError(`Init failed: ${e.message}`);
    }
  }, [role, user?.id]);

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
        .maybeSingle();
      setRole(roleData?.role || "user");
      const pending = await isAdminMfaPending();
      setMfaPending(pending);
      setChecking(false);
      const blockedRoles = ["anon", "pending", "blocked", "deleted", "rejected"];
      if (!isQuotaExhausted && !blockedRoles.includes(roleData?.role || "") && !pending) await initAgent();
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

  const ensureQuota = useCallback(async (): Promise<string> => {
    const config = configRef.current;
    if (!config || !config.apiKey) {
      throw new Error("AI not initialized");
    }

    const isAdmin = role === "admin" || role === "coadmin";

    if (isAdmin) {
      const tryIncrement = async (keyName: string): Promise<{ ok: boolean; rateLimited?: boolean; resetAt?: string }> => {
        const { data } = await supabase.functions.invoke("cohere-agent", {
          body: { action: "increment", keyName },
        });
        if (!data) return { ok: false };
        if (data.rateLimited) {
          return { ok: false, rateLimited: true, resetAt: data.resetAt };
        }
        if (data.success) return { ok: true };
        return { ok: false };
      };

      if (quotaUsedRef.current < (config.quota || 0)) {
        const result = await tryIncrement(config.keyName);
        if (result.ok) {
          quotaUsedRef.current++;
          return config.apiKey;
        }
        if (result.rateLimited) {
          setIsQuotaExhausted(true);
          setResetAt(result.resetAt!);
          setError(`Daily quota exhausted. ARCHON resumes at midnight (${new Date(result.resetAt!).toLocaleString()}).`);
          throw new Error("Rate limited");
        }
        quotaUsedRef.current = config.quota || 0;
      }

      if (config.secondaryApiKey && config.nextKeyName && secondaryUsedRef.current < (config.secondaryQuota || 0)) {
        const result = await tryIncrement(config.nextKeyName);
        if (result.ok) {
          secondaryUsedRef.current++;
          return config.secondaryApiKey;
        }
        if (result.rateLimited) {
          setIsQuotaExhausted(true);
          setResetAt(result.resetAt!);
          setError(`Daily quota exhausted. ARCHON resumes at midnight (${new Date(result.resetAt!).toLocaleString()}).`);
          throw new Error("Rate limited");
        }
        secondaryUsedRef.current = config.secondaryQuota || 0;
      }

      const { data: initData, error: initError } = await supabase.functions.invoke("cohere-agent", { body: { action: "init" } });
      if (initError) throw new Error(initError.message);
      if (initData?.error) throw new Error(initData.error);
      if (initData?.rateLimited) {
        setIsQuotaExhausted(true);
        setResetAt(initData.resetAt);
        setError(`ARCHON is rate limited. All API quotas exhausted. Resets at ${new Date(initData.resetAt).toLocaleString()}.`);
        throw new Error("Rate limited");
      }

      configRef.current = { apiKey: initData.apiKey, systemPrompt: initData.systemPrompt, model: initData.model, quota: initData.quota, keyName: initData.keyName, secondaryApiKey: initData.secondaryApiKey, nextKeyName: initData.nextKeyName, secondaryQuota: initData.secondaryQuota, isFinalBatch: initData.isFinalBatch, message: initData.message };
      quotaUsedRef.current = 0;
      secondaryUsedRef.current = 0;

      const { data: incData } = await supabase.functions.invoke("cohere-agent", {
        body: { action: "increment", keyName: initData.keyName },
      });
      if (incData?.success) {
        quotaUsedRef.current = 1;
        return initData.apiKey;
      }
      if (incData?.rateLimited) {
        setIsQuotaExhausted(true);
        setResetAt(incData.resetAt);
        setError(`Daily quota exhausted. ARCHON resumes at midnight (${new Date(incData.resetAt).toLocaleString()}).`);
        throw new Error("Rate limited");
      }
      throw new Error("Failed to acquire API quota");
    }

    // Non-admin: use user's own keys
    if (quotaUsedRef.current < 999) {
      quotaUsedRef.current++;
      const { error: rpcError } = await supabase.rpc("increment_user_cohere_key", {
        p_key_label: config.keyName,
      });
      if (rpcError) console.warn("Failed to increment key count:", rpcError.message);
      return config.apiKey;
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("cohere_api_keys")
      .eq("user_id", user?.id)
      .maybeSingle();

    const keys = (settings?.cohere_api_keys as { key: string; label: string; request_count: number }[]) ?? [];
    const available = keys.filter(k => k.request_count < 1000);
    if (available.length === 0) {
      setIsQuotaExhausted(true);
      setResetAt(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
      setError("All your API key quotas are exhausted. Quotas reset on the 1st of each month.");
      throw new Error("Rate limited");
    }

    const chosen = available[0];
    const chosenIndex = keys.indexOf(chosen);
    setUserKeyIndex(chosenIndex);
    configRef.current = { ...config, apiKey: chosen.key, keyName: chosen.label };
    quotaUsedRef.current = chosen.request_count + 1;

    const { error: rpcError } = await supabase.rpc("increment_user_cohere_key", {
      p_key_label: chosen.label,
    });
    if (rpcError) console.warn("Failed to increment key count:", rpcError.message);

    return chosen.key;
  }, [role, user?.id]);

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
        (systemContext ? "\n\n## Admin System Context (selected section):\n" + systemContext : "") +
        "\n\nCurrent Date: " +
        new Date().toLocaleDateString("en-CA") +
        "\n\nCurrent Time: " +
        new Date().toLocaleTimeString("en-GB", { hour12: false }) +
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

    const tools = role === "admin" ? [SQL_TOOL] : [];

    try {
      // ── STREAM MODE ──────────────────────────────────────────
      if (streamMode === "stream") {
        const apiKey = await ensureQuota();
        const client = new CohereClientV2({ token: apiKey });

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
            tools,
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
          const apiKey2 = await ensureQuota();
          const client2 = new CohereClientV2({ token: apiKey2 });

          const toolMessages = [
            ...sanitize(history),
            { role: "assistant" as const, toolCalls: toolCallsFromStream, content: originalText || "" },
            ...executed.map(({ tc, data }) => ({
              role: "tool" as const,
              toolCallId: tc.id,
              content: JSON.stringify(data),
            })),
          ];

          const streamResp2 = await client2.chatStream({
            model: config.model,
            messages: [systemMsg, ...toolMessages],
            tools,
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

      // ── COLLECT MODE ───────────────────────────────────────────
      const collectKey = await ensureQuota();
      const client = new CohereClientV2({ token: collectKey });

      const firstResp = await client.chat({
        model: config.model,
        messages: [systemMsg, ...sanitize(history)],
        tools,
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

      const secondKey = await ensureQuota();
      const client2 = new CohereClientV2({ token: secondKey });

      const secondResp = await client2.chat({
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
        tools,
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
  }, [role, user, streamMode, ensureQuota]);

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
    if (!text || isLoading || !initialized || isQuotaExhausted) return;
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

  if (checking || !user || isOnAiTab || mfaPending) return null;

  const ARCHON_BLOCKED_ROLES = ["anon", "pending", "blocked", "deleted", "rejected"];
  if (ARCHON_BLOCKED_ROLES.includes(role || "")) return null;

  const dots = ".".repeat(thinkingStage);

  const msgList = (
    <ChatMessageList
      messages={messages}
      isLoading={isLoading}
      isQuotaExhausted={isQuotaExhausted}
      error={error}
      timeUntilReset={timeUntilReset}
      executingSql={executingSql}
      user={user}
      avatar={avatar}
      copiedId={copiedId}
      editingIndex={editingIndex}
      streamMode={streamMode}
      initStatus={initStatus}
      containerRef={containerRef as React.RefObject<HTMLDivElement>}
      bottomRef={bottomRef as React.RefObject<HTMLDivElement>}
      handleScroll={handleScroll}
      handleApprove={handleApprove}
      handleReject={handleReject}
      handleCopy={handleCopy}
      handleEdit={handleEdit}
      asksApproval={asksApproval}
      dots={dots}
    />
  );

  const chatInput = (
    <ChatInput
      input={input}
      setInput={setInput}
      isLoading={isLoading}
      initialized={initialized}
      isQuotaExhausted={isQuotaExhausted}
      editingIndex={editingIndex}
      setEditingIndex={setEditingIndex}
      streamMode={streamMode}
      isMobile={isMobile}
      isColorBlind={isColorBlind}
      textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
      sendMessage={sendMessage}
      handleStop={handleStop}
      handleKeyDown={handleKeyDown}
    />
  );

  const remaining = (configRef.current?.quota || 0) - quotaUsedRef.current
    + ((configRef.current?.secondaryQuota || 0) - secondaryUsedRef.current);
  const dailyUsed = 130 - remaining;
  const showQuotaBanner = !isQuotaExhausted && configRef.current && !quotaBannerDismissed;
  const canDismiss = remaining > 15;

  const quotaBanner = showQuotaBanner && (
    <div className="px-3 py-2 border-b border-border bg-muted/40">
      <div className="flex items-center gap-3 text-xs">
        {configRef.current?.isFinalBatch ? (
          <div className="flex-1 flex items-center gap-2 text-destructive font-medium">
            <span className="text-lg">⚠</span>
            <span>{configRef.current?.message || `Final batch: ${configRef.current?.quota || 0} requests remaining.`}</span>
          </div>
        ) : (
          <>
            <span className="text-muted-foreground">
              Quota: <span className="font-medium text-foreground">{dailyUsed}/130</span>
            </span>
            <span className="text-muted-foreground ml-auto">
              <span className="font-medium text-foreground">{remaining}</span> remaining
            </span>
          </>
        )}
        {canDismiss && (
          <button
            onClick={() => setQuotaBannerDismissed(true)}
            className="ml-1 h-5 w-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          ref={panelRef}
          className={`fixed inset-0 z-[60] flex flex-col bg-background transition-transform duration-300 ease-in-out ${archonShown ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
          onMouseEnter={() => { isHoveringRef.current = true; }}
          onMouseLeave={() => { isHoveringRef.current = false; }}
        >
          <AIPanelHeader
            isMobile={true}
            streamMode={streamMode}
            isQuotaExhausted={isQuotaExhausted}
            initStatus={initStatus}
            setStreamMode={setStreamMode}
            handleInit={handleInit}
            setOpen={setOpen}
          />
          {quotaBanner}
          <div className="flex flex-col flex-1 min-h-0">
            {msgList}
            {chatInput}
          </div>
        </div>
        <button
          onClick={openArchonTab}
          className={`fixed z-[61] transition-all duration-300 ease-in-out ${open
            ? "right-0 top-1/2 -translate-y-1/2 rounded-l-md border border-r-0 bg-background px-1.5 py-4 shadow-md hover:bg-accent flex flex-col items-center gap-1 group"
            : "bottom-28 right-5 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90"
            } ${archonShown ? "opacity-0 pointer-events-none" : ""}`}
          title="Open A.R.C.H.O.N."
        >
          {open ? (
            <>
              <img src="/ARCHON.png" alt="ARCHON" className="h-4 w-4 rotate-90 transition-transform duration-300 group-hover:rotate-0" />
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider flex flex-col items-center leading-none">
                {"ARCHON".split("").map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </span>
            </>
          ) : (
            <img src="/ARCHON.png" alt="ARCHON" className="h-5 w-5" />
          )}
        </button>
      </>
    );
  }

  return (
    <>
      <div
        ref={panelRef}
        style={{ width: `${panelWidth}%` }}
        className={`fixed right-0 top-0 bottom-0 z-40 border-l flex flex-col shadow-lg bg-background transition-transform duration-300 ease-in-out ${streamMode === "stream" ? "border-success/20" : "border-border"} ${archonShown ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
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
          <AIPanelHeader
            isMobile={false}
            streamMode={streamMode}
            isQuotaExhausted={isQuotaExhausted}
            initStatus={initStatus}
            setStreamMode={setStreamMode}
            handleInit={handleInit}
            setOpen={setOpen}
          />
          {quotaBanner}
          {msgList}
          {chatInput}
        </div>
      </div>
      <button
        onClick={openArchonTab}
        className={`fixed right-0 top-1/2 z-50 rounded-l-md border border-r-0 bg-background px-1.5 py-4 shadow-md hover:bg-accent flex flex-col items-center gap-1 transition-all duration-300 ease-in-out group ${archonShown
          ? "opacity-0 pointer-events-none"
          : open && activePanel === "sql"
            ? "-translate-y-1/2 opacity-100"
            : "-translate-y-[calc(100%+12px)] opacity-100"
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
