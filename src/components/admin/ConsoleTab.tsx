import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Play, CornerDownLeft, AlertTriangle, Terminal, CircleAlert, Info } from "lucide-react";

interface ConsoleEntry {
  id: number;
  type: "input" | "log" | "warn" | "error" | "info" | "result";
  value: string;
  timestamp: string;
}

function inspect(val: unknown, depth = 0): string {
  if (val === undefined) return "undefined";
  if (val === null) return "null";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") return String(val);
  if (typeof val === "symbol") return val.toString();
  if (typeof val === "function") return `ƒ ${val.name || "anonymous"}()`;
  if (val instanceof Error) return `${val.name}: ${val.message}`;
  if (val instanceof RegExp) return val.toString();
  if (val instanceof Date) return val.toISOString();
  if (val instanceof Promise) return "Promise {<pending>}";
  if (typeof Window !== "undefined" && val instanceof Window) return "Window";
  if (typeof Document !== "undefined" && val instanceof Document) return `Document ${val.title ? `"${val.title}"` : ""}`;
  if (val instanceof HTMLElement) {
    const tag = val.tagName.toLowerCase();
    const id = val.id ? `#${val.id}` : "";
    const cls = val.className && typeof val.className === "string" ? `.${val.className.trim().split(/\s+/).join(".")}` : "";
    const children = val.children.length;
    const inner = val.innerHTML.length > 80 ? val.innerHTML.slice(0, 80) + "…" : val.innerHTML;
    return `<${tag}${id}${cls}>${children > 0 ? `${children} children` : inner}</${tag}>`;
  }
  if (val instanceof Node) return `${val.nodeName}`;
  if (typeof NodeList !== "undefined" && val instanceof NodeList) return `NodeList(${val.length})`;
  if (Array.isArray(val)) {
    if (depth > 2) return `[${val.length} items]`;
    return `[${val.map(v => inspect(v, depth + 1)).join(", ")}]`;
  }
  if (val instanceof Map) return `Map(${val.size}) {${[...val.entries()].slice(0, 5).map(([k, v]) => `${inspect(k, depth + 1)} => ${inspect(v, depth + 1)}`).join(", ")}${val.size > 5 ? ", …" : ""}}`;
  if (val instanceof Set) return `Set(${val.size}) {${[...val].slice(0, 5).map(v => inspect(v, depth + 1)).join(", ")}${val.size > 5 ? ", …" : ""}}`;
  if (typeof Response !== "undefined" && val instanceof Response) return `Response { status: ${val.status}, ${val.statusText} }`;
  if (typeof Request !== "undefined" && val instanceof Request) return `Request { url: "${val.url}" }`;
  if (depth > 2) return "{…}";
  try {
    const keys = Object.keys(val as object);
    if (keys.length === 0) return "{}";
    const pairs = keys.slice(0, 10).map(k => `${k}: ${inspect((val as Record<string, unknown>)[k], depth + 1)}`).join(", ");
    return `{${pairs}${keys.length > 10 ? ", …" : ""}}`;
  } catch {
    return String(val);
  }
}

function formatArgs(args: unknown[]): string {
  if (args.length === 0) return "";
  return args.map(a => inspect(a)).join(" ");
}

const origConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
};

export default function ConsoleTab() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const appendEntry = useCallback((entry: ConsoleEntry) => {
    setEntries(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    const ts = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

    const patch = (method: "log" | "warn" | "error" | "info") => {
      const original = origConsole[method];
      return (...args: unknown[]) => {
        original(...args);
        appendEntry({
          id: nextId.current++,
          type: method,
          value: formatArgs(args),
          timestamp: ts(),
        });
      };
    };

    console.log = patch("log");
    console.warn = patch("warn");
    console.error = patch("error");
    console.info = patch("info");

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      appendEntry({
        id: nextId.current++,
        type: "error",
        value: `Unhandled Promise Rejection: ${inspect(e.reason)}`,
        timestamp: ts(),
      });
    };

    const onError = (e: ErrorEvent) => {
      appendEntry({
        id: nextId.current++,
        type: "error",
        value: `${e.message} (${e.filename}:${e.lineno}:${e.colno})`,
        timestamp: ts(),
      });
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    return () => {
      console.log = origConsole.log;
      console.warn = origConsole.warn;
      console.error = origConsole.error;
      console.info = origConsole.info;
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, [appendEntry]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [entries, scrollToBottom]);

  const executeCommand = (cmd: string) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });

    appendEntry({ id: nextId.current++, type: "input", value: cmd, timestamp: ts });

    if (cmd === "clear()") {
      setEntries([]);
      setHistory(prev => [...prev, cmd]);
      setHistoryIndex(-1);
      setInput("");
      return;
    }

    try {
      const result = (0, eval)(cmd);
      if (result !== undefined) {
        if (result instanceof Promise) {
          const asyncId = nextId.current++;
          appendEntry({ id: asyncId, type: "result", value: "Promise {<pending>}", timestamp: ts });
          result
            .then(res => {
              if (res !== undefined) {
                setEntries(prev => prev.map(e =>
                  e.id === asyncId ? { ...e, value: inspect(res) } : e
                ));
              } else {
                setEntries(prev => prev.filter(e => e.id !== asyncId));
              }
            })
            .catch(err => {
              setEntries(prev => prev.map(e =>
                e.id === asyncId ? { ...e, type: "error" as const, value: inspect(err) } : e
              ));
            });
        } else {
          appendEntry({ id: nextId.current++, type: "result", value: inspect(result), timestamp: ts });
        }
      }
    } catch (err: unknown) {
      appendEntry({ id: nextId.current++, type: "error", value: inspect(err), timestamp: ts });
    }

    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      executeCommand(input.trim());
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      setInput(history[history.length - 1 - newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput("");
        return;
      }
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(history[history.length - 1 - newIndex]);
    }
  };

  const typeStyle = (type: ConsoleEntry["type"]) => {
    switch (type) {
      case "input": return "text-foreground";
      case "warn": return "text-yellow-500 dark:text-yellow-400";
      case "error": return "text-red-500 dark:text-red-400";
      case "info": return "text-blue-500 dark:text-blue-400";
      case "result": return "text-purple-500 dark:text-purple-400";
      default: return "text-foreground/80";
    }
  };

  const typeIcon = (type: ConsoleEntry["type"]) => {
    switch (type) {
      case "input":
        return <span className="text-green-500 dark:text-green-400 mr-1 select-none">&gt;</span>;
      case "warn":
        return <CircleAlert className="h-3 w-3 text-yellow-500 dark:text-yellow-400 mt-0.5 shrink-0" />;
      case "error":
        return <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />;
      case "info":
        return <Info className="h-3 w-3 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex-1 min-h-0 border rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-3 font-mono text-xs">
          {entries.length === 0 && (
            <p className="text-muted-foreground">Console output appears here. Type expressions below.</p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="mb-1.5">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0 select-none">[{entry.timestamp}]</span>
                <div className="flex items-start gap-1 min-w-0">
                  {typeIcon(entry.type)}
                  <span className={`${typeStyle(entry.type)} whitespace-pre-wrap break-all`}>
                    {entry.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </ScrollArea>
      </div>

      <div className="flex gap-2 mt-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 dark:text-green-400 font-mono text-sm select-none">&gt;</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Run JS expression..."
            className="pl-7 font-mono text-sm"
            autoFocus
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => input.trim() && executeCommand(input.trim())}
          disabled={!input.trim()}
          title="Run (Enter)"
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CornerDownLeft className="h-3 w-3" />
            Enter to run
          </span>

          <span className="whitespace-nowrap">
            ↑↓ History
          </span>

          <span className="whitespace-nowrap text-muted-foreground/60">
            clear() to clear
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full px-3 text-xs sm:h-6 sm:w-auto sm:px-2"
          onClick={() => setEntries([])}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}
