import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Cpu,
  Database,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Loader2,
  Activity,
  Copy,
  Check,
  Zap,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  Flame,
} from "lucide-react";

interface CohereApiKey {
  uuid: string;
  api_key_name: string;
  request_count: number;
  api_key: string;
}

interface DailyQuotaRow {
  quota_date: string;
  request_count: number;
}

function useCountdown(target: Date): string {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setText("Resetting..."); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setText(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [target]);

  return text;
}

function useMonthlyCountdown(): { days: number; hours: number; minutes: number } {
  const [delta, setDelta] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 0, 0, 0));
      const diff = reset.getTime() - now.getTime();
      if (diff <= 0) { setDelta({ days: 0, hours: 0, minutes: 0 }); return; }
      const totalMinutes = Math.floor(diff / 60000);
      setDelta({
        days: Math.floor(totalMinutes / 1440),
        hours: Math.floor((totalMinutes % 1440) / 60),
        minutes: totalMinutes % 60,
      });
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  return delta;
}

function DailyUsageChart({ rows }: { rows: DailyQuotaRow[] }) {
  const [chartMode, setChartMode] = useState<"heatmap" | "log">("heatmap");
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; day: DailyQuotaRow; monthTotal: number; maxDaily: number
  } | null>(null);

  const byMonth = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.quota_date.localeCompare(b.quota_date));
    const map: { label: string; days: DailyQuotaRow[]; total: number }[] = [];
    for (const row of sorted) {
      const key = row.quota_date.slice(0, 7);
      let group = map.find(g => g.label === key);
      if (!group) {
        group = { label: key, days: [], total: 0 };
        map.push(group);
      }
      group.days.push(row);
      group.total += row.request_count;
    }
    return map;
  }, [rows]);

  const maxDaily = Math.max(...rows.map(r => r.request_count), 1);

  function usageColor(rel: number) {
    if (rel >= 0.95) return "#dc2626";
    if (rel >= 0.75) return "#ea580c";
    if (rel >= 0.5) return "#ca8a04";
    if (rel >= 0.25) return "#0891b2";
    return "#6366f1";
  }

  function criticalness(rel: number) {
    if (rel >= 0.95) return { label: "Critical", variant: "destructive" as const };
    if (rel >= 0.75) return { label: "High", variant: "secondary" as const };
    if (rel >= 0.5) return { label: "Elevated", variant: "secondary" as const };
    if (rel >= 0.25) return { label: "Moderate", variant: "outline" as const };
    return { label: "Low", variant: "outline" as const };
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mr-1">View:</span>
        {(["heatmap", "log"] as const).map(m => (
          <button
            key={m}
            onClick={() => setChartMode(m)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all capitalize ${chartMode === m
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
          >
            {m === "heatmap" ? "Heatmap" : "Log Scale"}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {byMonth.map(month => {
          const monthLabel = new Date(month.label + "-01").toLocaleDateString(undefined, { month: "short" });
          return (
            <div key={month.label} className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground w-7 shrink-0 text-right">{monthLabel}</span>
              <div className="flex-1 relative">
                <div className="flex h-6 rounded-sm overflow-hidden bg-muted/30">
                  {month.days.map(day => {
                    const rel = day.request_count / maxDaily;
                    return (
                      <div
                        key={day.quota_date}
                        className="h-full cursor-pointer transition-all hover:brightness-110 border-r border-white/90 last:border-r-0"
                        style={{
                          flex: chartMode === "heatmap" ? 1 : Math.max(1, Math.log1p(day.request_count)),
                          backgroundColor: usageColor(rel),
                        }}
                        onMouseEnter={e => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            day,
                            monthTotal: month.total,
                            maxDaily,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>

              </div>
            </div>

          );
        })}

      </div>

      {tooltip && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="mb-2 rounded-xl border bg-popover px-3.5 py-2.5 text-xs shadow-xl space-y-1.5 w-max backdrop-blur-sm">
            <p className="font-semibold text-sm">
              {new Date(tooltip.day.quota_date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short", month: "short", day: "numeric",
              })}
            </p>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-bold text-base">{tooltip.day.request_count}</span>
              <span className="text-muted-foreground">requests</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{((tooltip.day.request_count / tooltip.monthTotal) * 100).toFixed(1)}% of month</span>
              <span className="text-[10px] opacity-50">|</span>
              <span>{((tooltip.day.request_count / tooltip.maxDaily) * 100).toFixed(0)}% of peak</span>
            </div>
            <div className="pt-0.5">
              <Badge
                variant={criticalness(tooltip.day.request_count / tooltip.maxDaily).variant}
                className="text-[10px]"
              >
                {criticalness(tooltip.day.request_count / tooltip.maxDaily).label}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getKeyStatus(count: number) {
  if (count >= 1000) return "Exhausted";
  if (count >= 900) return "Critical";
  if (count >= 750) return "High";
  if (count >= 500) return "Moderate";
  if (count > 0) return "Healthy";
  return "Unused";
}

function getKeyStatusColor(count: number) {
  if (count >= 1000) return "destructive";
  if (count >= 800) return "secondary";
  return "outline";
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 mt-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-6 w-48" />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-xl lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function CohereQuotaTab() {
  const [keyTooltip, setKeyTooltip] = useState<{
    x: number;
    y: number;
    key: typeof sortedKeys[number];
  } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const keyTooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keySort, setKeySort] = useState<"usage" | "name" | "remaining">("usage");
  const [refreshing, setRefreshing] = useState(false);

  function usageColor(pct: number) {
    if (pct >= 100) return "#dc2626";
    if (pct >= 80) return "#ea580c";
    if (pct >= 50) return "#ca8a04";
    if (pct > 0) return "#2563eb";
    return "zinc-300 dark:zinc-700";
  }

  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("cohere-quota-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cohere_api_keys" },
        () => qc.invalidateQueries({ queryKey: ["cohere-api-keys"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cohere_daily_quota" },
        () => qc.invalidateQueries({ queryKey: ["cohere-daily-quota"] }),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const {
    data: keys = [],
    isLoading: keysLoading,
  } = useQuery({
    queryKey: ["cohere-api-keys"],
    queryFn: async (): Promise<CohereApiKey[]> => {
      const { data, error } = await supabase
        .from("cohere_api_keys")
        .select("*")
        .order("api_key_name");

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const {
    data: dailyRows = [],
    isLoading: dailyLoading,
  } = useQuery({
    queryKey: ["cohere-daily-quota"],
    queryFn: async (): Promise<DailyQuotaRow[]> => {
      const { data, error } = await supabase
        .from("cohere_daily_quota")
        .select("*")
        .order("quota_date", { ascending: false })
        .limit(92);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const today = dailyRows[0];
  const yesterday = dailyRows[1];
  const history = dailyRows.slice(1);

  const totalKeyUsage = useMemo(
    () => keys.reduce((sum, k) => sum + k.request_count, 0),
    [keys],
  );
  const totalKeyCapacity = keys.length * 1000;
  const monthlyUsagePercent = totalKeyCapacity > 0 ? (totalKeyUsage / totalKeyCapacity) * 100 : 0;
  const dailyUsagePercent = today?.request_count ? (today.request_count / 130) * 100 : 0;

  const avgDailyUsage = history.length > 0
    ? Math.round(history.reduce((s, r) => s + r.request_count, 0) / history.length)
    : 0;

  const last7Days = history.slice(0, 7);
  const avg7Day = last7Days.length > 0
    ? Math.round(last7Days.reduce((s, r) => s + r.request_count, 0) / last7Days.length)
    : 0;

  const last14Days = history.slice(0, 14);
  const avg14Day = last14Days.length > 0
    ? Math.round(last14Days.reduce((s, r) => s + r.request_count, 0) / last14Days.length)
    : 0;

  const peakDay = history.length > 0
    ? history.reduce((max, r) => r.request_count > max.request_count ? r : max, history[0])
    : null;

  const highestUsage = Math.max(...history.map(r => r.request_count), 0);
  const lowestUsage = history.length > 0 ? Math.min(...history.map(r => r.request_count)) : 0;
  const volatility = avg7Day > 0 ? Math.round((highestUsage - lowestUsage) / avg7Day * 100) : 0;

  const overloadedKeys = keys.filter(k => k.request_count >= 800);

  const usageTrend = today && yesterday ? today.request_count - yesterday.request_count : 0;

  const remainingMonthly = Math.max(0, totalKeyCapacity - totalKeyUsage);

  const now = new Date();
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();

  const projectedMonthlyUsage = avg7Day * daysInMonth;
  const projectedOverage = Math.max(0, projectedMonthlyUsage - totalKeyCapacity);

  const exhaustionDate = avg7Day > 0
    ? new Date(now.getTime() + (remainingMonthly / avg7Day) * 86400000)
    : null;

  const healthScore = Math.max(0, 100 - monthlyUsagePercent);

  const efficiencyScore = totalKeyCapacity > 0
    ? Math.max(0, Math.round(100 - (overloadedKeys.length / keys.length) * 100))
    : 0;

  const sortedKeys = useMemo(() => {
    const arr = [...keys];
    switch (keySort) {
      case "usage":
        return arr.sort((a, b) => b.request_count - a.request_count);
      case "name":
        return arr.sort((a, b) => a.api_key_name.localeCompare(b.api_key_name));
      case "remaining":
        return arr.sort((a, b) => a.request_count - b.request_count);
      default:
        return arr;
    }
  }, [keys, keySort]);

  const exhaustedKeys = keys.filter(k => k.request_count >= 1000);
  const unusedKeys = keys.filter(k => k.request_count === 0);
  const healthyKeys = keys.filter(k => k.request_count > 0 && k.request_count < 500);

  const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const timeToMidnight = useCountdown(midnightUTC);

  const monthlyCountdown = useMonthlyCountdown();

  if (keysLoading || dailyLoading) {
    return <LoadingSkeleton />;
  }

  const usageTrendUp = usageTrend > 0;
  const usageTrendDown = usageTrend < 0;
  const isHealthy = healthScore >= 70;
  const isCritical = monthlyUsagePercent >= 80;

  return (
    <div className="space-y-6 mt-4 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">AI Quota & Usage</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="live-shimmer font-medium">Live</span>
                </span>
                <span className="text-border">|</span>
                <span>{keys.length} keys active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${refreshing ? "btn-shimmer" : "bg-green-600 text-white hover:bg-green-700"}`}
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                Promise.all([
                  qc.invalidateQueries({ queryKey: ["cohere-api-keys"] }),
                  qc.invalidateQueries({ queryKey: ["cohere-daily-quota"] }),
                ]).finally(() => setTimeout(() => setRefreshing(false), 600));
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh Details</span>
              <span className="sm:hidden">Refresh</span>
            </button>
            <div className="flex items-center gap-1.5 rounded-lg bg-background/80 border px-3 py-1.5 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>Daily reset in {timeToMidnight}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-background/80 border px-3 py-1.5 backdrop-blur-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                {monthlyCountdown.days > 2
                  ? `${monthlyCountdown.days}d ${monthlyCountdown.hours}h`
                  : `${monthlyCountdown.days}d ${monthlyCountdown.hours}h ${monthlyCountdown.minutes}m`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {isCritical && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {projectedOverage > 0
              ? `Projected overage of ${projectedOverage} requests this month. Consider rotating keys.`
              : `Monthly usage is at ${monthlyUsagePercent.toFixed(1)}%. Monitor closely.`}
          </p>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Usage */}
        <Card className="relative overflow-hidden group hover:shadow-card-hover transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Usage</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">{totalKeyUsage}</span>
                  <span className="text-sm text-muted-foreground">/ {totalKeyCapacity}</span>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${monthlyUsagePercent >= 100
                    ? "bg-destructive"
                    : monthlyUsagePercent >= 80
                      ? "bg-orange-500"
                      : monthlyUsagePercent >= 50
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                  style={{ width: `${Math.min(100, monthlyUsagePercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{monthlyUsagePercent.toFixed(1)}% utilized</p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Usage */}
        <Card className="relative overflow-hidden group hover:shadow-card-hover transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">{today?.request_count || 0}</span>
                  <span className="text-sm text-muted-foreground">/ 130</span>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${dailyUsagePercent >= 100
                    ? "bg-destructive"
                    : dailyUsagePercent >= 80
                      ? "bg-orange-500"
                      : "bg-emerald-500"
                    }`}
                  style={{ width: `${Math.min(100, dailyUsagePercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {Math.max(0, 130 - (today?.request_count || 0))} remaining
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 7-Day Average */}
        <Card className="relative overflow-hidden group hover:shadow-card-hover transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">7d Average</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">{avg7Day}</span>
                  <span className="text-sm text-muted-foreground">/ day</span>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {usageTrendUp ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-destructive">
                  <ArrowUpRight className="h-3 w-3" />
                  +{usageTrend}
                </span>
              ) : usageTrendDown ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                  <ArrowDownRight className="h-3 w-3" />
                  {usageTrend}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">No change</span>
              )}
              <span className="text-[11px] text-muted-foreground">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card className="relative overflow-hidden group hover:shadow-card-hover transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Health</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">{healthScore.toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isHealthy
                ? "bg-emerald-500/10 group-hover:bg-emerald-500/20"
                : "bg-destructive/10 group-hover:bg-destructive/20"
                }`}>
                <Shield className={`h-4 w-4 ${isHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={isHealthy ? "outline" : "destructive"} className="text-[10px]">
                {isHealthy ? "Healthy" : "At Risk"}
              </Badge>
              {exhaustedKeys.length > 0 && (
                <span className="text-[11px] text-destructive font-medium">{exhaustedKeys.length} exhausted</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Usage Overview Card */}
        <Card className="lg:col-span-2 hover:shadow-card transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Usage Overview</CardTitle>
                  <CardDescription className="text-[11px]">Monthly & daily consumption</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={monthlyUsagePercent >= 100 ? "destructive" : "secondary"} className="text-xs tabular-nums">
                  {totalKeyUsage} / {totalKeyCapacity}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Monthly Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Monthly Usage</span>
                <span className="font-semibold tabular-nums">{monthlyUsagePercent.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${monthlyUsagePercent >= 100
                    ? "bg-gradient-to-r from-destructive to-red-400"
                    : monthlyUsagePercent >= 80
                      ? "bg-gradient-to-r from-orange-500 to-amber-400"
                      : "bg-gradient-to-r from-primary to-blue-400"
                    }`}
                  style={{ width: `${Math.min(100, monthlyUsagePercent)}%` }}
                />
              </div>
            </div>

            {/* Daily Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Daily Usage</span>
                <span className="font-semibold tabular-nums">{dailyUsagePercent.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${dailyUsagePercent >= 100
                    ? "bg-gradient-to-r from-destructive to-red-400"
                    : dailyUsagePercent >= 80
                      ? "bg-gradient-to-r from-orange-500 to-amber-400"
                      : "bg-gradient-to-r from-emerald-500 to-teal-400"
                    }`}
                  style={{ width: `${Math.min(100, dailyUsagePercent)}%` }}
                />
              </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-3 space-y-1 hover:bg-accent/50 transition-colors">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Monthly Left</p>
                <p className="text-lg font-bold tabular-nums">{remainingMonthly.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1 hover:bg-accent/50 transition-colors">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Daily Left</p>
                <p className="text-lg font-bold tabular-nums">{Math.max(0, 130 - (today?.request_count || 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1 hover:bg-accent/50 transition-colors">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Peak</p>
                <p className="text-lg font-bold tabular-nums">{peakDay?.request_count || 0}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1 hover:bg-accent/50 transition-colors">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Forecast</p>
                <p className="text-lg font-bold tabular-nums">{projectedMonthlyUsage}</p>
              </div>
            </div>

            {/* Trend & Alerts */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {today && yesterday && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                  {today.request_count > yesterday.request_count ? (
                    <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                  ) : today.request_count < yesterday.request_count ? (
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>
                    {today.request_count > yesterday.request_count
                      ? `+${today.request_count - yesterday.request_count} more`
                      : today.request_count < yesterday.request_count
                        ? `-${yesterday.request_count - today.request_count} less`
                        : "Same as yesterday"}
                  </span>
                </div>
              )}
              {projectedOverage > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  +{projectedOverage} projected overage
                </Badge>
              )}
              {exhaustionDate && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>Exhausts {exhaustionDate.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Intelligence + Avg */}
        <div className="space-y-4">
          {/* Average Daily Card */}
          <Card className="hover:shadow-card transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10">
                  <Activity className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Average Daily</CardTitle>
                  <CardDescription className="text-[11px]">Rolling 7-day</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div>
                  <div className="text-3xl font-bold tabular-nums">{avgDailyUsage}</div>
                  <p className="text-xs text-muted-foreground mt-1">requests per day</p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>7d: {avg7Day}</span>
                    <span className="text-border">|</span>
                    <span>14d: {avg14Day}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No history yet</p>
              )}
            </CardContent>
          </Card>

          {/* Usage Intelligence Card */}
          <Card className="hover:shadow-card transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
                  <Target className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Intelligence</CardTitle>
                  <CardDescription className="text-[11px]">Anomalies & key health</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border bg-card p-2.5 space-y-0.5 hover:bg-accent/50 transition-colors">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volatility</p>
                    <p className="text-lg font-bold tabular-nums">{volatility}%</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5 space-y-0.5 hover:bg-accent/50 transition-colors">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Efficiency</p>
                    <p className="text-lg font-bold tabular-nums">{efficiencyScore}%</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5 space-y-0.5 hover:bg-accent/50 transition-colors">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overloaded</p>
                    <p className="text-lg font-bold tabular-nums text-orange-500">{overloadedKeys.length}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5 space-y-0.5 hover:bg-accent/50 transition-colors">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthy</p>
                    <p className="text-lg font-bold tabular-nums text-emerald-600">{healthyKeys.length}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No history yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Grid + Daily History */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Key Grid Card */}
        <Card className="lg:col-span-2 hover:shadow-card transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Key Utilization</CardTitle>
                  <CardDescription className="text-[11px]">Per-key usage heatmap (max 1,000 each)</CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{keys.length} keys</Badge>
                {exhaustedKeys.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{exhaustedKeys.length} exhausted</Badge>
                )}
                {unusedKeys.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{unusedKeys.length} unused</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mr-1">Sort:</span>
              {(["usage", "name", "remaining"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setKeySort(s)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all capitalize ${keySort === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {s === "usage" ? "By Usage" : s === "name" ? "By Name" : "By Remaining"}
                </button>
              ))}
            </div>

            {/* Key Grid */}
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20 gap-1 sm:gap-1.5">
              {sortedKeys.map((key) => {
                const pct = (key.request_count / 1000) * 100;
                const keyNumber =
                  key.api_key_name.match(/^COHERE_API_KEY_(.+)$/)?.[1] ??
                  key.api_key_name;

                return (
                  <div
                    key={key.uuid}
                    className="aspect-square rounded-md cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-lg hover:z-10 flex items-center justify-center text-[10px] sm:text-xs font-semibold ring-1 ring-white/10"
                    style={{
                      backgroundColor: usageColor(pct),
                      color: pct === 0 ? "#71717a" : "white",
                    }}
                    onMouseEnter={(e) => {
                      if (keyTooltipTimeout.current) {
                        clearTimeout(keyTooltipTimeout.current);
                        keyTooltipTimeout.current = null;
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      setKeyTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        key,
                      });
                    }}
                    onMouseLeave={() => {
                      keyTooltipTimeout.current = setTimeout(() => {
                        setKeyTooltip(null);
                        setKeyCopied(false);
                      }, 200);
                    }}
                  >
                    {keyNumber}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-zinc-300 dark:bg-zinc-700 ring-1 ring-white/10" />
                0%
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-blue-600 ring-1 ring-white/10" />
                1-49%
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-yellow-600 ring-1 ring-white/10" />
                50-79%
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-orange-600 ring-1 ring-white/10" />
                80-99%
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-red-600 ring-1 ring-white/10" />
                100%
              </div>
            </div>

            {/* Key Tooltip */}
            {keyTooltip && (() => {
              const pct = (keyTooltip.key.request_count / 1000) * 100;
              const remaining = Math.max(0, 1000 - keyTooltip.key.request_count);
              const keyNumber =
                keyTooltip.key.api_key_name.match(/^COHERE_API_KEY_(.+)$/)?.[1] ??
                keyTooltip.key.api_key_name;

              const tooltipWidth = 240;
              const margin = 12;
              const viewportW = window.innerWidth;
              let left = keyTooltip.x;
              left = Math.max(margin + tooltipWidth / 2, left);
              left = Math.min(viewportW - margin - tooltipWidth / 2, left);

              return (
                <div
                  className="fixed z-50 -translate-y-full"
                  style={{
                    left,
                    top: keyTooltip.y - 1,
                    transform: `translateY(-110%) translateX(-50%)`,
                  }}
                  onMouseEnter={() => {
                    if (keyTooltipTimeout.current) {
                      clearTimeout(keyTooltipTimeout.current);
                      keyTooltipTimeout.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    setKeyTooltip(null);
                    setKeyCopied(false);
                  }}
                >
                  <div className="mb-2 rounded-xl border bg-popover px-4 py-3 shadow-xl text-xs space-y-2.5 w-60 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">Key #{keyNumber}</h3>
                      <Badge variant={getKeyStatusColor(keyTooltip.key.request_count) as "destructive" | "secondary" | "outline"} className="text-[10px]">
                        {getKeyStatus(keyTooltip.key.request_count)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Used</span>
                        <span className="font-semibold tabular-nums">{keyTooltip.key.request_count} / 1,000</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-semibold tabular-nums text-emerald-600">{remaining}</span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${pct >= 100
                            ? "bg-destructive"
                            : pct >= 80
                              ? "bg-orange-500"
                              : pct >= 50
                                ? "bg-amber-500"
                                : "bg-primary"
                            }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-muted-foreground">
                        <span>Utilization</span>
                        <span className="font-medium">{pct.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="pt-1 border-t">
                      <button
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
                        onClick={() => {
                          navigator.clipboard.writeText(keyTooltip.key.api_key).then(() => {
                            setKeyCopied(true);
                            setTimeout(() => setKeyCopied(false), 2000);
                          });
                        }}
                      >
                        {keyCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Copied to clipboard
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy API Key
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Daily Usage History */}
        {history.length > 0 && (
          <Card className="hover:shadow-card transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10">
                  <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Daily History</CardTitle>
                  <CardDescription className="text-[11px]">Past 3 months</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DailyUsageChart rows={dailyRows} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
