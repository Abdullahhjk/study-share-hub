import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Database,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  CornerDownLeft,
  Trash2,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Braces,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MousePointerClick,
  Table2,
  Workflow,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAIPanel } from "./AIPanelContext";
import SqlResultGraph from "./SqlResultGraph";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SqlResult =
  | { kind: "select"; columns: string[]; rows: Record<string, unknown>[]; rowCount: number }
  | { kind: "dml"; queryType: string; rowCount: number; message: string }
  | { kind: "error"; message: string };

interface HistoryEntry {
  id: number;
  query: string;
  time: string;
  result: SqlResult;
}

function normalizeResult(data: any): SqlResult {
  if (data?.error) {
    return { kind: "error", message: data.error };
  }
  if (data?.data) {
    const rows: Record<string, unknown>[] = Array.isArray(data.data) ? data.data : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { kind: "select", columns, rows, rowCount: rows.length };
  }
  if (data?.success) {
    return { kind: "dml", queryType: data.queryType || "SQL", rowCount: data.rowCount ?? 0, message: data.message || "Query executed." };
  }
  return { kind: "error", message: "Unexpected response from the server." };
}

const PAGE_SIZE = 20;

const SQL_HISTORY_KEY = "sql-exec-history";

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(SQL_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

const SQL_TEMPLATES: { name: string; query: string }[] = [
  { name: "Select table by name", query: "SELECT * FROM table_name LIMIT 100;" },
  {
    name: "Query-Driven Relational Data Mapping Engine", query: `SELECT * 
FROM user_roles 
JOIN profiles 
  ON user_roles.user_id = profiles.id 
JOIN platform_settings 
  ON user_roles.settings_id = platform_settings.id;`},
  { name: "Select specific columns", query: "SELECT column1, column2 FROM table_name LIMIT 100;" },
  { name: "Find by ID", query: "SELECT * FROM table_name WHERE id = 'your-id';" },
  { name: "Filter rows", query: "SELECT * FROM table_name WHERE column_name = 'value';" },
  { name: "Sort descending", query: "SELECT * FROM table_name ORDER BY created_at DESC LIMIT 100;" },
  { name: "Count rows", query: "SELECT COUNT(*) FROM table_name;" },
  { name: "Insert row", query: "INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');" },
  { name: "Update row", query: "UPDATE table_name SET column1 = 'new-value' WHERE id = 'your-id';" },
  { name: "Delete row", query: "DELETE FROM table_name WHERE id = 'your-id';" },
  { name: "List all tables", query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
  { name: "Describe table", query: "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'table_name' ORDER BY ordinal_position;" },
  { name: "List indexes", query: "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'table_name';" },
  { name: "Foreign keys", query: "SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'table_name';" },
  { name: "Latest 10 rows", query: "SELECT * FROM table_name ORDER BY created_at DESC LIMIT 10;" },
  { name: "Rows created today", query: "SELECT * FROM table_name WHERE created_at >= CURRENT_DATE;" },
  { name: "Search with LIKE", query: "SELECT * FROM table_name WHERE column_name ILIKE '%search%';" },
  { name: "Distinct values", query: "SELECT DISTINCT column_name FROM table_name;" },
  { name: "Group by count", query: "SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name ORDER BY COUNT(*) DESC;" },
  { name: "Join two tables", query: "SELECT * FROM table1 t1 JOIN table2 t2 ON t1.id = t2.table1_id LIMIT 100;" },
  { name: "Table size", query: "SELECT pg_size_pretty(pg_total_relation_size('table_name'));" },
  { name: "Database version", query: "SELECT version();" },
];

function TemplateGallery({ open, onPick, onClose }: { open: boolean; onPick: (query: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const items = q
    ? SQL_TEMPLATES.filter((t) => t.name.toLowerCase().includes(q) || t.query.toLowerCase().includes(q))
    : SQL_TEMPLATES;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LayoutGrid className="h-4 w-4 text-primary shrink-0" />
          <span>Query Templates</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="border-b px-3 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-2">
          {items.map((t) => (
            <button
              key={t.name}
              onClick={() => onPick(t.query)}
              className="group rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 hover:bg-accent transition-colors"
              title="Insert into editor"
            >
              <p className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                {t.name}
                <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </p>
              <pre className="mt-1.5 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all line-clamp-2">
                {t.query}
              </pre>
            </button>
          ))}
        </div>
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No templates match.</p>
        )}
      </div>
    </div>
  );
}

function cellString(val: unknown): string {
  if (val === null) return "NULL";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function CopyQueryButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={copy}
      title="Copy query"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CellValue({ val }: { val: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (val === null) {
    return (
      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] italic text-muted-foreground/70">
        NULL
      </span>
    );
  }

  if (typeof val === "boolean") {
    return (
      <Badge
        variant={val ? "default" : "secondary"}
        className="font-mono text-[10px]"
      >
        {String(val)}
      </Badge>
    );
  }

  if (typeof val === "object") {
    const text = JSON.stringify(val, null, 2);
    return (
      <div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? "Collapse JSON" : "Expand JSON"}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <Braces className="h-3 w-3 text-primary" />
          <span className="font-sans text-[10px] font-medium">JSON</span>
        </button>
        {expanded && (
          <pre className="mt-1 rounded bg-black/5 dark:bg-white/10 p-2 text-[10px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {text}
          </pre>
        )}
      </div>
    );
  }

  const text = String(val);
  const needsToggle = text.length > 120;
  if (!needsToggle) {
    return <span className="block break-all whitespace-pre-wrap">{text}</span>;
  }
  return (
    <div>
      <span className={cn("block break-all whitespace-pre-wrap", !expanded && "line-clamp-3")}>
        {text}
      </span>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-0.5 flex items-center gap-0.5 text-[10px] font-sans text-primary hover:underline transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}

function SelectResultTable({ result }: { result: Extract<SqlResult, { kind: "select" }> }) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"table" | "graph">("table");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const sortedRows = useMemo(() => {
    if (!sortKey) return result.rows;
    const rows = [...result.rows];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      if (typeof av === "boolean" && typeof bv === "boolean") return (Number(av) - Number(bv)) * dir;
      return cellString(av).localeCompare(cellString(bv)) * dir;
    });
    return rows;
  }, [result.rows, sortKey, sortDir]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sortedRows;
    return sortedRows.filter((row) =>
      result.columns.some((col) => cellString(row[col]).toLowerCase().includes(q))
    );
  }, [sortedRows, filter, result.columns]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filteredRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length);

  const handleSort = (col: string) => {
    setPage(0);
    if (sortKey !== col) {
      setSortKey(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir("asc");
    }
  };

  const startResize = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[col] ?? 140;
    const onMove = (ev: MouseEvent) => {
      setColWidths((prev) => ({ ...prev, [col]: Math.max(60, startW + (ev.clientX - startX)) }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/50 border-b border-border px-2.5 py-1.5 flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter rows..."
            className="h-7 pl-6 text-xs font-mono"
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {view === "graph" ? result.rowCount : filteredRows.length} / {result.rowCount} rows
        </span>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shrink-0">
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            title="Table view"
          >
            <Table2 className="h-3 w-3" />
            Table
          </button>
          <button
            onClick={() => setView("graph")}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${view === "graph" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            title="Flow graph view (dedupes repeated values, links rows by shared keys)"
          >
            <Workflow className="h-3 w-3" />
            Graph
          </button>
        </div>
      </div>
      {view === "graph" ? (
        <SqlResultGraph columns={result.columns} rows={result.rows} />
      ) : (
        <>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      style={colWidths[col] ? { minWidth: `${colWidths[col]}px` } : undefined}
                      className="relative border-b border-border p-0"
                    >
                      <button
                        onClick={() => handleSort(col)}
                        className="flex w-full items-center gap-1 px-2.5 py-1.5 text-left font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        title="Sort column"
                      >
                        <span className="truncate">{col}</span>
                        {sortKey === col ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 shrink-0 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 shrink-0 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />
                        )}
                      </button>
                      <span
                        onMouseDown={(e) => startResize(e, col)}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 transition-colors"
                        title="Resize column"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={result.columns.length}
                      className="px-2.5 py-3 text-center text-[10px] text-muted-foreground font-sans"
                    >
                      No rows match the filter.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, i) => (
                    <tr key={i} className="odd:bg-background even:bg-muted/40">
                      {result.columns.map((col) => (
                        <td
                          key={col}
                          style={colWidths[col] ? { minWidth: `${colWidths[col]}px` } : undefined}
                          className={cn(
                            "border-b border-border/50 px-2.5 py-1.5 align-top",
                            row[col] === null && "text-muted-foreground/60"
                          )}
                        >
                          <CellValue val={row[col]} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-muted px-2.5 py-1 text-[10px] text-muted-foreground border-t border-border flex items-center justify-between gap-2">
            <span className="tabular-nums">
              {filteredRows.length === 0 ? "0 rows" : `Showing ${rangeStart}-${rangeEnd} of ${filteredRows.length} rows`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                  className="flex items-center rounded px-1 py-0.5 border border-border hover:bg-black/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="px-1">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= totalPages - 1}
                  className="flex items-center rounded px-1 py-0.5 border border-border hover:bg-black/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
            <button
              onClick={copyJson}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/10 transition-colors"
              title="Copy as JSON"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "JSON"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ResultView({ result }: { result: SqlResult }) {
  if (result.kind === "error") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <span className="font-mono text-xs text-destructive whitespace-pre-wrap break-all">{result.message}</span>
      </div>
    );
  }

  if (result.kind === "dml") {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-success uppercase tracking-wider">{result.queryType}</p>
          <p className="text-xs text-foreground mt-1">{result.message}</p>
        </div>
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <span className="text-xs">Query returned {result.rowCount} row(s).</span>
      </div>
    );
  }

  return <SelectResultTable result={result} />;
}

export default function SQLExecPanel() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isOnAiTab = (location.pathname === "/admin" || location.pathname === "/coadmin") && searchParams.get("tab") === "aiAssistant";

  const isMobile = useIsMobile();
  const { open, setOpen, panelWidth, setPanelWidth, activePanel, setActivePanel } = useAIPanel();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const nextId = useRef(0);
  if (nextId.current === 0 && history.length > 0) {
    nextId.current = Math.max(...history.map((h) => h.id)) + 1;
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef({ isResizing: false, startX: 0, startWidth: 0 });

  const isSqlActive = activePanel === "sql";
  const sqlShown = open && isSqlActive;

  const openSqlTab = () => {
    setActivePanel("sql");
    setOpen(true);
  };

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      setUser(session.user);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setRole(roleData?.role || "user");
      setChecking(false);
    };
    check();
  }, []);

  useEffect(() => {
    if (!running) {
      textareaRef.current?.focus();
    }
  }, [running]);

  useEffect(() => {
    localStorage.setItem(SQL_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, running]);

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

  const executeQuery = useCallback(async (sql: string, confirmed: boolean) => {
    const trimmed = sql.trim();
    if (!trimmed || running) return;

    setRunning(true);
    const ts = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
    try {
      const { data, error } = await supabase.functions.invoke("cohere-agent", {
        body: { action: "sql", query: trimmed, confirmed },
      });
      if (error) {
        setHistory(prev => [...prev, { id: nextId.current++, query: trimmed, time: ts(), result: { kind: "error", message: error.message } }]);
        return;
      }
      if (data?.needsConfirmation) {
        setPendingConfirm(trimmed);
        return;
      }
      setPendingConfirm(null);
      setHistory(prev => [...prev, { id: nextId.current++, query: trimmed, time: ts(), result: normalizeResult(data) }]);
    } catch (e: any) {
      setHistory(prev => [...prev, { id: nextId.current++, query: trimmed, time: ts(), result: { kind: "error", message: e.message } }]);
    } finally {
      setRunning(false);
    }
  }, [running]);

  const handleRun = () => {
    setPendingConfirm(null);
    executeQuery(query, false);
  };

  const handleConfirm = () => {
    if (!pendingConfirm) return;
    const sql = pendingConfirm;
    setPendingConfirm(null);
    setQuery("");
    executeQuery(sql, true);
  };

  const handleCancelConfirm = () => {
    setPendingConfirm(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  const clearHistory = () => {
    setQuery("");
    setHistory([]);
    localStorage.removeItem(SQL_HISTORY_KEY);
  };

  const handlePickTemplate = (template: string) => {
    setQuery(template);
    setGalleryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  if (checking || !user || isOnAiTab) return null;
  if (role !== "admin") return null;

  const sqlEditor = (
    <>
      <div className="border-t p-3 shrink-0 flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM notes LIMIT 10;"
          disabled={running}
          className="flex-1 min-h-[90px] max-h-[200px] resize-none font-mono text-sm"
          rows={4}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRun}
              disabled={!query.trim() || running}
              size="sm"
              className="h-8 flex-1 gap-1.5 text-xs sm:flex-none"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? "Running..." : "Run"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => query && navigator.clipboard.writeText(query)}
              disabled={!query.trim()}
              className="h-8 gap-1.5 text-xs text-muted-foreground flex-1 sm:flex-none"
              title="Copy query"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              disabled={history.length === 0}
              className="h-8 flex-1 gap-1.5 text-xs text-muted-foreground sm:flex-none"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setGalleryOpen(true)}
              className="h-8 w-full gap-1.5 text-xs text-muted-foreground sm:w-auto"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Templates
            </Button>
          </div>

          <span className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground sm:justify-end">
            <CornerDownLeft className="h-3 w-3" />
            Ctrl/⌘ + Enter
          </span>
        </div>
      </div>
      {pendingConfirm && (
        <div className="px-3 pb-3 shrink-0 animate-fade-in">
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
            <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Confirm destructive change
            </p>
            <p className="mt-1 text-xs text-foreground">
              This query modifies data. Review it carefully before running.
            </p>
            <div className="mt-2 flex items-start justify-between gap-2">
              <pre className="rounded bg-black/5 dark:bg-white/10 p-2 text-[10px] font-mono whitespace-pre-wrap break-all max-h-28 overflow-y-auto">
                {pendingConfirm}
              </pre>
              <CopyQueryButton text={pendingConfirm} />
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-8" onClick={handleConfirm}>
                <Play className="h-3.5 w-3.5" />
                Confirm &amp; Run
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleCancelConfirm}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const sqlResults = (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {history.length === 0 && !pendingConfirm && (
        <div className="flex flex-col items-center justify-center h-full text-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">SQL Executor</p>
          <p className="text-xs text-muted-foreground/70 max-w-[220px]">
            Write a query below and run it directly against the database.
          </p>
        </div>
      )}
      {history.map((entry) => (
        <div key={entry.id} className="space-y-2">
          <div className="rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Query</span>
              <span className="flex items-center gap-2">
                <CopyQueryButton text={entry.query} />
                <span className="text-[10px] text-muted-foreground">[{entry.time}]</span>
              </span>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">{entry.query}</pre>
          </div>
          <ResultView result={entry.result} />
        </div>
      ))}
      {running && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Executing SQL...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );

  const header = (
    <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary shrink-0" />
          <span>SQL EXECUTOR</span>
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
          Admin only
        </span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          ref={panelRef}
          className={`fixed inset-0 z-[60] flex flex-col bg-background transition-transform duration-300 ease-in-out ${sqlShown ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
        >
          {header}
          {sqlResults}
          {sqlEditor}
          <TemplateGallery open={galleryOpen} onPick={handlePickTemplate} onClose={() => setGalleryOpen(false)} />
        </div>
        <button
          onClick={openSqlTab}
          className={cn(
            "fixed z-[61] transition-all duration-300 ease-in-out",
            open
              ? "right-0 top-1/2 -translate-y-1/2 rounded-l-md border border-r-0 bg-background px-1.5 py-4 shadow-md hover:bg-accent flex flex-col items-center gap-1"
              : "bottom-12 right-5 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90",
            sqlShown && "opacity-0 pointer-events-none"
          )}
          title="Open SQL EXEC"
        >
          {open ? (
            <>
              <Database className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider flex flex-col items-center leading-none">
                {"SQL EXEC".split("").map((c, i) => (
                  <span key={i}>{c === " " ? <>&nbsp;</> : c}</span>
                ))}
              </span>
            </>
          ) : (
            <Database className="h-5 w-5" />
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
        className={`fixed right-0 top-0 bottom-0 z-40 border-l border-border flex flex-col shadow-lg bg-background transition-transform duration-300 ease-in-out ${sqlShown ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
      >
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute left-0 top-0 bottom-0 w-5 -ml-2.5 cursor-col-resize z-50 flex items-center justify-center group"
        >
          <div className="h-full w-1.5" />
          <div className="absolute top-1/2 -translate-y-1/2 w-2 h-10 rounded-full bg-border/60 group-hover:bg-primary/50 group-active:bg-primary/60 transition-colors" />
        </div>
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          {header}
          {sqlResults}
          {sqlEditor}
          <TemplateGallery open={galleryOpen} onPick={handlePickTemplate} onClose={() => setGalleryOpen(false)} />
        </div>
      </div>
      <button
        onClick={openSqlTab}
        className={`fixed right-0 top-1/2 z-50 rounded-l-md border border-r-0 bg-background px-1.5 py-4 shadow-md hover:bg-accent flex flex-col items-center gap-1 transition-all duration-300 ease-in-out group ${sqlShown
          ? "opacity-0 pointer-events-none"
          : open && activePanel === "archon"
            ? "-translate-y-1/2 opacity-100"
            : "translate-y-[12px] opacity-100"
          }`}
        title="Open SQL EXEC"
      >
        <Database className="h-4 w-4 text-primary" />

        <span className="text-[10px] font-medium text-muted-foreground tracking-wider flex flex-col items-center leading-none">
          {"SQL EXEC".split("").map((c, i) => (
            <span key={i}>{c === " " ? <>&nbsp;</> : c}</span>
          ))}
        </span>
      </button>
    </>
  );
}
