import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type NodeProps,
  type NodeTypes,
  type Edge,
  type EdgeProps,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodesChange,
  type EdgeTypes,
} from "@xyflow/react";
import {
  SmartEdge,
  smartEdgePresets,
  type SmartEdgeOptions,
} from "@tisoap/react-flow-smart-edge";
import { Database, Maximize2, Minimize, RefreshCw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import "@xyflow/react/dist/style.css";

const NODE_W = 220;
const COL_GAP = 90;
const ROW_GAP = 28;
const HEADER_H = 24;
const PAD_Y = 10;
const MAX_NODES = 80;
const MAX_FIELDS = 12;
const MAX_ROWS_INPUT = 1000;

const ID_RE = /(^|_)id$|_uuid$|_key$|^key$/i;
const CAT_RE = /role|status|type|state|mode|category|level|tier|kind|priority|grade|stage|plan|class/i;

interface FlowField {
  key: string;
  value: string;
}

interface FlowNodeData {
  kind: "entity" | "category";
  title: string;
  label: string;
  fields: FlowField[];
  groupKey: string;
  hl?: boolean;
  dim?: boolean;
}

type FlowNode = Node<FlowNodeData, "card">;
type FlowEdge = Edge;

function cellString(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function shorten(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function nodeHeight(d: { label: string; fields: FlowField[] }): number {
  const labelH = d.label ? 20 : 0;
  return HEADER_H + labelH + Math.min(d.fields.length, MAX_FIELDS) * 19 + PAD_Y * 2;
}

function buildFlowGraph(columns: string[], rows: Record<string, unknown>[]) {
  if (!columns.length || !rows.length) return { nodes: [] as FlowNode[], edges: [] as FlowEdge[] };

  const limited = rows.slice(0, MAX_ROWS_INPUT);
  const val = (row: Record<string, unknown>, col: string) => cellString(row[col]);

  const distinctOf = (col: string) => {
    const s = new Set<string>();
    for (const r of limited) s.add(val(r, col));
    return s;
  };

  const keyValueIn = (keyCols: string[], row: Record<string, unknown>) => {
    for (const c of keyCols) {
      const v = val(row, c);
      if (v !== "NULL") return v;
    }
    return val(row, keyCols[0]);
  };

  const groups: string[][] = [];
  const keys = columns.filter((c) => ID_RE.test(c));
  const equivalent = (a: string, b: string) => {
    const aToB = new Map<string, string>();
    const bToA = new Map<string, string>();
    for (const r of limited) {
      const av = val(r, a);
      const bv = val(r, b);
      if (aToB.has(av) && aToB.get(av) !== bv) return false;
      aToB.set(av, bv);
      if (bToA.has(bv) && bToA.get(bv) !== av) return false;
      bToA.set(bv, av);
    }
    return true;
  };
  for (const col of keys) {
    const g = groups.find((grp) => grp.some((m) => equivalent(col, m)));
    if (g) g.push(col);
    else groups.push([col]);
  }

  interface EntityInfo {
    keyCols: string[];
    name: string;
    distinct: Set<string>;
    order: number;
  }

  const entityInfos: EntityInfo[] = groups.map((g) => {
    const nonGeneric = g.find((c) => !/^id$/.test(c));
    const base = (nonGeneric || g[0]).replace(/_id$/, "");
    const name = base ? (base.endsWith("s") ? base : base + "s") : "records";
    return {
      keyCols: g,
      name,
      distinct: distinctOf(g[0]),
      order: Math.min(...g.map((c) => columns.indexOf(c))),
    };
  });

  const nonKeys = columns.filter((c) => !keys.includes(c));
  const descriptors: Record<string, string[]> = {};
  for (const e of entityInfos) descriptors[e.keyCols.join("|")] = [];
  const categoryCols: { col: string; parentKey: string; distinct: Set<string>; order: number }[] = [];

  for (const c of nonKeys) {
    const d = distinctOf(c);
    const constantFor = entityInfos.filter((e) => {
      const perKey = new Map<string, Set<string>>();
      for (const r of limited) {
        const kv = keyValueIn(e.keyCols, r);
        const cv = val(r, c);
        if (!perKey.has(kv)) perKey.set(kv, new Set());
        perKey.get(kv)!.add(cv);
      }
      return [...perKey.values()].every((s) => s.size === 1);
    });

    const isCategory = CAT_RE.test(c) && d.size > 1;
    if (isCategory) {
      const parent =
        (constantFor.length
          ? [...constantFor].sort((a, b) => a.distinct.size - b.distinct.size || a.order - b.order)[0]
          : [...entityInfos].sort((a, b) => b.distinct.size - a.distinct.size || a.order - b.order)[0]) ??
        entityInfos[0];
      categoryCols.push({ col: c, parentKey: parent.keyCols.join("|"), distinct: d, order: columns.indexOf(c) });
      continue;
    }

    const target =
      (constantFor.length
        ? [...constantFor].sort((a, b) => a.distinct.size - b.distinct.size || a.order - b.order)[0]
        : [...entityInfos].sort((a, b) => b.distinct.size - a.distinct.size || a.order - b.order)[0]) ??
      entityInfos[0];
    if (target) descriptors[target.keyCols.join("|")].push(c);
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const groupMeta = new Map<string, { size: number; order: number }>();
  const entityKeyToNodeId = new Map<string, string>();
  const catValueToNodeId = new Map<string, string>();

  const addGroupedNode = (groupKey: string, size: number, order: number, n: FlowNode) => {
    groupMeta.set(groupKey, { size, order });
    nodes.push(n);
  };

  if (entityInfos.length === 0) {
    const seen = new Map<string, { row: Record<string, unknown>; count: number }>();
    for (const r of limited) {
      const sig = JSON.stringify(columns.map((c) => val(r, c)));
      const prev = seen.get(sig);
      if (prev) prev.count++;
      else seen.set(sig, { row: r, count: 1 });
    }
    for (const { row, count } of seen.values()) {
      if (nodes.length >= MAX_NODES) break;
      const fields = columns
        .map((c) => ({ key: c, value: shorten(val(row, c), 80) }))
        .slice(0, MAX_FIELDS);
      const data: FlowNodeData = {
        kind: "entity",
        title: count > 1 ? `row ×${count}` : "row",
        label: "",
        fields,
        groupKey: "rows",
      };
      nodes.push({ id: `row:${nodes.length}`, type: "card", position: { x: 0, y: 0 }, width: NODE_W, height: nodeHeight(data), measured: { width: NODE_W, height: nodeHeight(data) }, data });
      groupMeta.set("rows", { size: nodes.length, order: 0 });
    }
  } else {
    for (const e of entityInfos) {
      const gk = e.keyCols.join("|");
      for (const v of e.distinct) {
        const fields: FlowField[] = [];
        for (const c of descriptors[gk]) {
          if (fields.length >= MAX_FIELDS) break;
          const sample = limited.find((r) => keyValueIn(e.keyCols, r) === v);
          fields.push({ key: c, value: shorten(sample ? val(sample, c) : "", 80) });
        }
        const data: FlowNodeData = { kind: "entity", title: e.name, label: shorten(v, 30), fields, groupKey: gk };
        const id = `ent:${gk}:${v}`;
        entityKeyToNodeId.set(`${gk}|${v}`, id);
        addGroupedNode(gk, e.distinct.size, e.order, {
          id,
          type: "card",
          position: { x: 0, y: 0 },
          width: NODE_W,
          height: nodeHeight(data),
          measured: { width: NODE_W, height: nodeHeight(data) },
          data,
        });
      }
    }

    for (const ci of categoryCols) {
      const gk = `cat:${ci.col}`;
      for (const v of ci.distinct) {
        const data: FlowNodeData = { kind: "category", title: ci.col, label: shorten(v, 30), fields: [], groupKey: gk };
        const id = `cat:${ci.col}:${v}`;
        catValueToNodeId.set(`${ci.col}|${v}`, id);
        addGroupedNode(gk, ci.distinct.size, ci.order, {
          id,
          type: "card",
          position: { x: 0, y: 0 },
          width: NODE_W,
          height: nodeHeight(data),
          measured: { width: NODE_W, height: nodeHeight(data) },
          data,
        });
      }
    }
  }

  if (nodes.length > MAX_NODES) {
    nodes.length = MAX_NODES;
  }

  const rawConnections: { a: FlowNode; b: FlowNode }[] = [];
  if (entityInfos.length > 0) {
    for (const r of limited) {
      const byGroup = new Map<string, FlowNode>();
      for (const e of entityInfos) {
        const nid = entityKeyToNodeId.get(`${e.keyCols.join("|")}|${keyValueIn(e.keyCols, r)}`);
        const n = nid ? nodes.find((x) => x.id === nid) : undefined;
        if (n) byGroup.set(e.keyCols.join("|"), n);
      }
      const entities = [...byGroup.values()];
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          if (entities[i].id !== entities[j].id) rawConnections.push({ a: entities[i], b: entities[j] });
        }
      }
      for (const ci of categoryCols) {
        const cn = catValueToNodeId.get(`${ci.col}|${val(r, ci.col)}`);
        const en = byGroup.get(ci.parentKey);
        if (cn && en) {
          const catNode = nodes.find((x) => x.id === cn);
          if (catNode && catNode.id !== en.id) rawConnections.push({ a: catNode, b: en });
        }
      }
    }
  }

  const groupEdges = new Map<string, { a: string; b: string }>();
  for (const { a, b } of rawConnections) {
    const ka = a.data.groupKey;
    const kb = b.data.groupKey;
    if (ka === kb) continue;
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    if (!groupEdges.has(key)) groupEdges.set(key, ka < kb ? { a: ka, b: kb } : { a: kb, b: ka });
  }

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const gk of groupMeta.keys()) {
    incoming.set(gk, 0);
    outgoing.set(gk, []);
  }
  for (const { a, b } of groupEdges.values()) {
    outgoing.get(a)!.push(b);
    incoming.set(b, (incoming.get(b) ?? 0) + 1);
  }
  const layer = new Map<string, number>();
  const queue = [...groupMeta.keys()].filter((gk) => (incoming.get(gk) ?? 0) === 0);
  queue.sort((a, b) => groupMeta.get(a)!.size - groupMeta.get(b)!.size || groupMeta.get(a)!.order - groupMeta.get(b)!.order);
  let head = 0;
  for (const gk of queue) layer.set(gk, 0);
  while (head < queue.length) {
    const cur = queue[head++];
    const cl = layer.get(cur) ?? 0;
    for (const nxt of outgoing.get(cur) ?? []) {
      layer.set(nxt, Math.max(layer.get(nxt) ?? 0, cl + 1));
      incoming.set(nxt, (incoming.get(nxt) ?? 0) - 1);
      if ((incoming.get(nxt) ?? 0) === 0) queue.push(nxt);
    }
  }
  for (const gk of groupMeta.keys()) if (!layer.has(gk)) layer.set(gk, 0);

  const layers = [...new Set(layer.values())].sort((a, b) => a - b);
  const colOfLayer = new Map<number, number>();
  layers.forEach((l, i) => colOfLayer.set(l, i));
  const colOf = new Map<string, number>();
  for (const gk of groupMeta.keys()) colOf.set(gk, colOfLayer.get(layer.get(gk)!));

  const seenEdges = new Set<string>();
  for (const { a, b } of rawConnections) {
    const ca = colOf.get(a.data.groupKey) ?? 0;
    const cb = colOf.get(b.data.groupKey) ?? 0;
    const [src, dst] = ca <= cb ? [a, b] : [b, a];
    const id = `${src.id}->${dst.id}`;
    if (seenEdges.has(id)) continue;
    seenEdges.add(id);
    edges.push({ id, source: src.id, target: dst.id, type: "smart" });
  }

  for (let i = edges.length - 1; i >= 0; i--) {
    const e = edges[i];
    if (!nodes.some((n) => n.id === e.source) || !nodes.some((n) => n.id === e.target)) edges.splice(i, 1);
  }

  const colStacks = new Map<number, number>();
  const colTotals = new Map<number, number>();
  for (const n of nodes) {
    const col = colOf.get(n.data.groupKey) ?? 0;
    const y = colStacks.get(col) ?? 0;
    n.position = { x: col * (NODE_W + COL_GAP), y };
    const h = n.height ?? 0;
    colStacks.set(col, y + h + ROW_GAP);
    colTotals.set(col, (colTotals.get(col) ?? 0) + h + ROW_GAP);
  }
  const maxColH = Math.max(0, ...colTotals.values());
  for (const n of nodes) {
    const col = colOf.get(n.data.groupKey) ?? 0;
    const total = colTotals.get(col) ?? 0;
    n.position.y += (maxColH - total) / 2;
  }

  return { nodes, edges };
}

function FlowCard({ data }: NodeProps<FlowNode>) {
  const { kind, title, label, fields, hl, dim } = data;
  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-md transition-all duration-150",
        hl
          ? "border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/20"
          : "border-border",
        dim && "opacity-30 saturate-50"
      )}
      style={{ width: NODE_W }}
    >
      <div
        className="flex items-center gap-1.5 rounded-t-lg border-b px-2 py-1.5"
        style={{
          background: kind === "category" ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted))",
          borderColor: kind === "category" ? "hsl(var(--primary) / 0.35)" : undefined,
        }}
      >
        {kind === "category" ? (
          <Tag className="h-3 w-3 shrink-0 text-primary" />
        ) : (
          <Database className="h-3 w-3 shrink-0 text-primary" />
        )}
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-foreground">{title}</span>
      </div>
      {label && (
        <div className="px-2 pt-1.5 font-mono text-[10px] break-all text-foreground/90" title={label}>
          {label}
        </div>
      )}
      {fields.length > 0 && (
        <div className="space-y-0.5 px-2 pb-2 pt-1">
          {fields.map((f) => (
            <div key={f.key} className="flex items-baseline gap-1.5">
              <span className="shrink-0 text-[9px] font-medium text-muted-foreground">{f.key}</span>
              <span className="truncate font-mono text-[9px] text-foreground" title={f.value}>
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-background" />
    </div>
  );
}

const nodeTypes: NodeTypes = { card: FlowCard };

const LiveNodesContext = createContext<FlowNode[]>([]);
const SMART_EDGE_OPTIONS: SmartEdgeOptions = {
  ...smartEdgePresets.smoothstep,
  gridRatio: 10,
  nodePadding: 14,
};

function SmartFlowEdge(props: EdgeProps<FlowEdge>) {
  const liveNodes = useContext(LiveNodesContext);
  return <SmartEdge {...props} nodes={liveNodes} options={SMART_EDGE_OPTIONS} />;
}

const edgeTypes: EdgeTypes = { smart: SmartFlowEdge };

interface Highlight {
  nodes: string[];
  edges: string[];
}

function FlowCanvas({
  nodes,
  edges,
  colorMode,
  fullscreen,
  onNodesChange,
  onRefresh,
  onToggleFullscreen,
  onHighlight,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  colorMode: "light" | "dark";
  fullscreen: boolean;
  onNodesChange: OnNodesChange<FlowNode>;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
  onHighlight: {
    hover: Highlight | null;
    setHover: (h: Highlight | null) => void;
    setPinned: (h: Highlight | null) => void;
  };
}) {
  const { fitView } = useReactFlow();
  const { hover, setHover, setPinned } = onHighlight;

  const handleRefresh = useCallback(() => {
    onRefresh();
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [onRefresh, fitView]);

  useEffect(() => {
    if (fullscreen) {
      const t = setTimeout(() => fitView({ padding: 0.25 }), 60);
      return () => clearTimeout(t);
    }
  }, [fullscreen, fitView]);

  const displayNodes = useMemo(() => {
    if (!hover) return nodes;
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, hl: hover.nodes.includes(n.id), dim: !hover.nodes.includes(n.id) },
    }));
  }, [nodes, hover]);

  const displayEdges = useMemo(() => {
    if (!hover) return edges;
    return edges.map((e) => {
      const hl = hover.edges.includes(e.id);
      return {
        ...e,
        animated: hl,
        zIndex: hl ? 1000 : 1,
        style: {
          ...(e.style ?? {}),
          stroke: hl ? "hsl(var(--primary))" : undefined,
          strokeWidth: hl ? 2.5 : 1.5,
          opacity: hl ? 1 : 0.12,
        },
      };
    });
  }, [edges, hover]);

  return (
    <div className={cn("relative w-full", fullscreen ? "h-full" : "h-[420px]")}>
      <LiveNodesContext.Provider value={nodes}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={colorMode}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesDraggable
          onNodesChange={onNodesChange}
          minZoom={0.15}
          maxZoom={2.5}
          onNodeMouseEnter={onHighlight.onNodeMouseEnter}
          onNodeMouseLeave={onHighlight.onNodeMouseLeave}
          onNodeClick={onHighlight.onNodeClick}
          onEdgeMouseEnter={onHighlight.onEdgeMouseEnter}
          onEdgeMouseLeave={onHighlight.onEdgeMouseLeave}
          onEdgeClick={onHighlight.onEdgeClick}
          onPaneClick={() => setPinned(null)}
        >
          <Background gap={18} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </LiveNodesContext.Provider>
      <button
        onClick={handleRefresh}
        className="absolute right-11 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
        title="Reset layout"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
        title={fullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"}
      >
        {fullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function SqlResultGraph({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  const { resolvedTheme } = useTheme();
  const colorMode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  const { nodes, edges } = useMemo(() => buildFlowGraph(columns, rows), [columns, rows]);
  const [flowNodes, setFlowNodes] = useState(nodes);
  const [hover, setHover] = useState<Highlight | null>(null);
  const [pinned, setPinned] = useState<Highlight | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes]);

  const onNodesChange: OnNodesChange<FlowNode> = useCallback(
    (changes) => setFlowNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const adjacency = useMemo(() => {
    const m = new Map<string, { edges: string[]; nodes: string[] }>();
    for (const e of edges) {
      for (const id of [e.source, e.target]) {
        const cur = m.get(id) ?? { edges: [], nodes: [] };
        cur.edges.push(e.id);
        cur.nodes.push(id === e.source ? e.target : e.source);
        m.set(id, cur);
      }
    }
    return m;
  }, [edges]);

  const highlightForNode = useCallback(
    (nodeId: string): Highlight => {
      const adj = adjacency.get(nodeId);
      return adj ? { nodes: [nodeId, ...adj.nodes], edges: adj.edges } : { nodes: [nodeId], edges: [] };
    },
    [adjacency]
  );

  const onNodeMouseEnter: NodeMouseHandler<FlowNode> = useCallback(
    (_, node) => setHover(highlightForNode(node.id)),
    [highlightForNode]
  );
  const onNodeMouseLeave: NodeMouseHandler<FlowNode> = useCallback(() => setHover(null), []);
  const onNodeClick: NodeMouseHandler<FlowNode> = useCallback(
    (_, node) => {
      const h = highlightForNode(node.id);
      setPinned((prev) => (prev && prev.nodes[0] === node.id ? null : h));
    },
    [highlightForNode]
  );
  const onEdgeMouseEnter: EdgeMouseHandler<FlowEdge> = useCallback(
    (_, edge) => setHover({ nodes: [edge.source, edge.target], edges: [edge.id] }),
    []
  );
  const onEdgeMouseLeave: EdgeMouseHandler<FlowEdge> = useCallback(() => setHover(null), []);
  const onEdgeClick: EdgeMouseHandler<FlowEdge> = useCallback((_, edge) => {
    const h: Highlight = { nodes: [edge.source, edge.target], edges: [edge.id] };
    setPinned((prev) => (prev && prev.edges[0] === edge.id ? null : h));
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const refreshLayout = useCallback(() => {
    setFlowNodes(nodes);
    setHover(null);
    setPinned(null);
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
        No data to visualize.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border",
        fullscreen && "fixed inset-0 z-[999] rounded-none border-0 bg-background"
      )}
    >
      <ReactFlowProvider>
        <FlowCanvas
          nodes={flowNodes}
          edges={edges}
          colorMode={colorMode}
          fullscreen={fullscreen}
          onNodesChange={onNodesChange}
          onRefresh={refreshLayout}
          onToggleFullscreen={toggleFullscreen}
          onHighlight={{
            hover: pinned ?? hover,
            setHover,
            setPinned,
            onNodeMouseEnter,
            onNodeMouseLeave,
            onNodeClick,
            onEdgeMouseEnter,
            onEdgeMouseLeave,
            onEdgeClick,
          }}
        />
      </ReactFlowProvider>
    </div>
  );
}
