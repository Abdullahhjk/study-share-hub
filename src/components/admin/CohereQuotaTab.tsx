import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Cpu,
  Database,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Target,
  Loader2,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface CohereApiKey {
  uuid: string;
  api_key_name: string;
  request_count: number;
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
      setText(`${h} hours and ${m} min`);
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
      <div className="space-y-3">
        {byMonth.map(month => {
          const monthLabel = new Date(month.label + "-01").toLocaleDateString(undefined, { month: "short" });
          const totalFlex = Math.max(1, month.days.reduce((s, d) => s + d.request_count, 0));
          return (
            <div key={month.label} className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground w-7 shrink-0 text-right">{monthLabel}</span>
              <div className="flex-1 relative">
                <div className="flex h-5 rounded-full overflow-hidden bg-muted/30">
                  {month.days.map(day => {
                    const rel = day.request_count / maxDaily;
                    const flex = Math.max(0.5, day.request_count);
                    return (
                      <div
                        key={day.quota_date}
                        className="h-full cursor-pointer transition-all hover:scale-y-110 hover:shadow-sm"
                        style={{ flex, backgroundColor: usageColor(rel) }}
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
          <div className="mb-2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg space-y-1 w-max">
            <p className="font-medium">
              {new Date(tooltip.day.quota_date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short", month: "short", day: "numeric",
              })}
            </p>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-semibold">{tooltip.day.request_count}</span>
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

export default function CohereQuotaTab() {
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

  const comparisonText = yesterday
    ? today && today.request_count > yesterday.request_count
      ? `${today.request_count - yesterday.request_count} more than yesterday`
      : today && today.request_count < yesterday.request_count
        ? `${yesterday.request_count - today.request_count} less than yesterday`
        : "Same as yesterday"
    : null;

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

  const sortedKeys = [...keys].sort((a, b) => b.request_count - a.request_count);
  const exhaustedKeys = keys.filter(k => k.request_count >= 1000);
  const unusedKeys = keys.filter(k => k.request_count === 0);

  const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const timeToMidnight = useCountdown(midnightUTC);

  const monthlyCountdown = useMonthlyCountdown();

  if (keysLoading || dailyLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">AI Quota & Usage</h2>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="md:col-span-2">

          <CardHeader className="pb-3">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />

                <CardTitle className="text-sm font-medium">
                  Usage Overview
                </CardTitle>
              </div>

              <div className="flex items-center gap-2">

                <Badge
                  variant={
                    monthlyUsagePercent >= 100
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {totalKeyUsage} / {totalKeyCapacity}
                </Badge>

                <Badge
                  variant={
                    (today?.request_count || 0) >= 130
                      ? "destructive"
                      : "outline"
                  }
                >
                  {today?.request_count || 0} / 130
                </Badge>

              </div>

            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">

              <span>
                {monthlyCountdown.days > 2
                  ? `Monthly reset in ${monthlyCountdown.days} days and ${monthlyCountdown.hours} hours`
                  : `Monthly reset in ${monthlyCountdown.days} days, ${monthlyCountdown.hours} hours and ${monthlyCountdown.minutes} minutes`}
              </span>

              <span>
                Daily reset in {timeToMidnight}
              </span>

            </div>

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="space-y-2">

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Monthly Usage
                </span>

                <span className="font-medium">
                  {monthlyUsagePercent.toFixed(1)}%
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${monthlyUsagePercent >= 100
                    ? "bg-destructive"
                    : monthlyUsagePercent >= 80
                      ? "bg-warning"
                      : "bg-primary"
                    }`}
                  style={{
                    width: `${Math.min(
                      100,
                      monthlyUsagePercent,
                    )}%`,
                  }}
                />
              </div>

            </div>

            <div className="space-y-2">

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Daily Usage
                </span>

                <span className="font-medium">
                  {dailyUsagePercent.toFixed(1)}%
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${dailyUsagePercent >= 100
                    ? "bg-destructive"
                    : dailyUsagePercent >= 80
                      ? "bg-warning"
                      : "bg-primary"
                    }`}
                  style={{
                    width: `${Math.min(
                      100,
                      dailyUsagePercent,
                    )}%`,
                  }}
                />
              </div>

            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Monthly Left
                </div>

                <div className="font-medium">
                  {remainingMonthly}
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Daily Left
                </div>

                <div className="font-medium">
                  {Math.max(
                    0,
                    130 - (today?.request_count || 0),
                  )}
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Health
                </div>

                <div className="font-medium">
                  {healthScore.toFixed(0)}%
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Velocity
                </div>

                <div className="font-medium">
                  {usageTrend > 0 ? "+" : ""}
                  {usageTrend}/day
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Avg 7d
                </div>

                <div className="font-medium">
                  {avg7Day}
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Peak
                </div>

                <div className="font-medium">
                  {peakDay?.request_count || 0}
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Forecast
                </div>

                <div className="font-medium">
                  {projectedMonthlyUsage}
                </div>
              </div>

              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">
                  Exhaustion
                </div>

                <div className="font-medium">
                  {exhaustionDate
                    ? exhaustionDate.toLocaleDateString()
                    : "N/A"}
                </div>
              </div>

            </div>

            {(comparisonText || projectedOverage > 0) && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-2">

                {comparisonText && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">

                    {today &&
                      yesterday &&
                      today.request_count >
                      yesterday.request_count ? (
                      <TrendingUp className="h-3 w-3 text-destructive" />
                    ) : today &&
                      yesterday &&
                      today.request_count <
                      yesterday.request_count ? (
                      <TrendingDown className="h-3 w-3 text-success" />
                    ) : (
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                    )}

                    <span>
                      {comparisonText}
                    </span>

                  </div>
                )}

                {projectedOverage > 0 && (
                  <Badge variant="destructive">
                    +{projectedOverage} projected overage
                  </Badge>
                )}

              </div>
            )}

          </CardContent>

        </Card>

        <div className="grid gap-4 md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
              </div>
              <CardDescription>
                {history.length > 0 ? `Rolling 7-day: ${avg7Day}/day` : "No history yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">{avgDailyUsage}</div>
                  <p className="text-xs text-muted-foreground">requests / day</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Insufficient data (No history)</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Usage Intelligence</CardTitle>
              </div>
              <CardDescription>Anomalies & token health</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Avg 14d</div>
                    <div className="font-medium">{avg14Day}/day</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Volatility</div>
                    <div className="font-medium">{volatility}%</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Efficiency</div>
                    <div className="font-medium">{efficiencyScore}%</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Overloaded</div>
                    <div className="font-medium text-warning">{overloadedKeys.length}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No history yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Monthly Key Usage</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{keys.length} keys</Badge>
                  <Badge variant="outline">{exhaustedKeys.length} exhaust{exhaustedKeys.length !== 1 ? "ed" : ""}</Badge>
                  <Badge variant="outline">{unusedKeys.length} unused</Badge>
                </div>
              </div>
              <CardDescription>Per-key request counts (max 1,000 each)</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {[0, 1].map((col) => (
                <div key={col} className="space-y-2">
                  {sortedKeys
                    .slice(col * 2, col * 2 + 2)
                    .map((key) => {
                      const pct = (key.request_count / 1000) * 100;

                      return (
                        <div key={key.uuid} className="rounded-md border p-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-medium truncate">
                                {key.api_key_name}
                              </span>

                              <Badge
                                variant={
                                  pct >= 100
                                    ? "destructive"
                                    : pct >= 80
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-[10px]"
                              >
                                {getKeyStatus(key.request_count)}
                              </Badge>
                            </div>

                            <span
                              className={`text-xs tabular-nums shrink-0 ${key.request_count >= 1000
                                ? "text-destructive"
                                : key.request_count > 800
                                  ? "text-warning"
                                  : key.request_count >= 500
                                    ? "text-secondary"
                                    : key.request_count === 0
                                      ? "text-muted-foreground"
                                      : "text-primary"
                                }`}
                            >
                            </span>
                          </div>

                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct >= 100
                                ? "bg-destructive"
                                : pct >= 80
                                  ? "bg-warning"
                                  : "bg-primary"
                                }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs tabular-nums shrink-0 ${key.request_count >= 1000
                              ? "text-destructive"
                              : key.request_count > 800
                                ? "text-warning"
                                : key.request_count >= 500
                                  ? "text-secondary"
                                  : key.request_count === 0
                                    ? "text-muted-foreground"
                                    : "text-primary"
                              }`}
                          >
                            {key.request_count} / 1000 ({pct.toFixed(1)}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {history.length > 0 && (
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Daily Usage History</CardTitle>
                </div>
                <CardDescription>Past 3 months</CardDescription>
              </CardHeader>
              <CardContent>
                <DailyUsageChart rows={dailyRows} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
