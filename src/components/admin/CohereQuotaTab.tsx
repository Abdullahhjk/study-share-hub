import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
      setText(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [target]);

  return text;
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
        .limit(30);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const today = dailyRows[0];
  const yesterday = dailyRows[1];
  const history = dailyRows.slice(1);

  const totalKeyUsage = keys.reduce((sum, key) => sum + key.request_count, 0);
  const totalKeyCapacity = keys.length * 1000;
  const monthlyUsagePercent = totalKeyCapacity > 0 ? (totalKeyUsage / totalKeyCapacity) * 100 : 0;
  const dailyUsagePercent = today?.request_count ? (today.request_count / 130) * 100 : 0;

  const avgDailyUsage = history.length > 0
    ? Math.round(history.reduce((s, r) => s + r.request_count, 0) / history.length)
    : 0;

  const peakDay = history.length > 0
    ? history.reduce((max, r) => r.request_count > max.request_count ? r : max, history[0])
    : null;

  const comparisonText = yesterday
    ? today && today.request_count > yesterday.request_count
      ? `${(today.request_count - yesterday.request_count)} more than yesterday`
      : today && today.request_count < yesterday.request_count
        ? `${(yesterday.request_count - today.request_count)} less than yesterday`
        : "Same as yesterday"
    : null;

  const now = new Date();
  const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const timeToMidnight = useCountdown(midnightUTC);

  const endOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const daysUntilReset = Math.ceil((endOfMonthUTC.getTime() - now.getTime()) / 86400000);

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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
              </div>
              <Badge variant={monthlyUsagePercent >= 100 ? "destructive" : "secondary"}>
                {totalKeyUsage} / {totalKeyCapacity}
              </Badge>
            </div>
            <CardDescription>{daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""} until monthly reset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${monthlyUsagePercent >= 100 ? "bg-destructive"
                    : monthlyUsagePercent >= 80 ? "bg-warning"
                      : "bg-primary"
                    }`}
                  style={{ width: `${Math.min(100, monthlyUsagePercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{totalKeyUsage} used</span>
                <span>{Math.max(0, totalKeyCapacity - totalKeyUsage)} remaining ({monthlyUsagePercent.toFixed(1)}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Daily Quota</CardTitle>
              </div>
              <Badge variant={(today?.request_count || 0) >= 130 ? "destructive" : "secondary"}>
                {today?.request_count || 0} / 130
              </Badge>
            </div>
            <CardDescription>Resets in {timeToMidnight}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${dailyUsagePercent >= 100 ? "bg-destructive"
                    : dailyUsagePercent >= 80 ? "bg-warning"
                      : "bg-primary"
                    }`}
                  style={{ width: `${Math.min(100, dailyUsagePercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{today?.request_count || 0} used today</span>
                <span>{Math.max(0, 130 - (today?.request_count || 0))} remaining ({dailyUsagePercent.toFixed(1)}%)</span>
              </div>
              {comparisonText && (
                <div className="flex items-center gap-1.5 text-xs pt-1 border-t border-border">
                  {today && yesterday && today.request_count > yesterday.request_count ? (
                    <TrendingUp className="h-3 w-3 text-destructive" />
                  ) : today && yesterday && today.request_count < yesterday.request_count ? (
                    <TrendingDown className="h-3 w-3 text-success" />
                  ) : (
                    <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">{comparisonText}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
              </div>
              <CardDescription>Across {history.length} day{history.length !== 1 ? "s" : ""}</CardDescription>
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
                <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
              </div>
              <CardDescription>Highest usage in history</CardDescription>
            </CardHeader>
            <CardContent>
              {peakDay ? (
                <>
                  <div className="text-2xl font-bold">{peakDay.request_count}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(peakDay.quota_date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No history yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Monthly Key Usage</CardTitle>
            </div>
            <Badge variant="outline">{totalKeyUsage} / {totalKeyCapacity}</Badge>
          </div>
          <CardDescription>Per-key request counts (max 1,000 each)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keys.map((key) => {
              const pct = (key.request_count / 1000) * 100;
              return (
                <div key={key.uuid}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">
                      {key.api_key_name}
                    </span>
                    <span className={
                      key.request_count >= 1000 ? "text-destructive"
                        : key.request_count > 800 ? "text-warning"
                          : key.request_count >= 500 ? "text-secondary"
                            : key.request_count === 0 ? "text-muted-foreground"
                              : "text-primary"
                    }>
                      {key.request_count} / 1000 ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-destructive"
                        : pct >= 80 ? "bg-warning"
                          : "bg-primary"
                        }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Daily Usage History</CardTitle>
            </div>
            <CardDescription>Last {history.length} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((row) => (
                <div key={row.quota_date} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 shrink-0 text-muted-foreground">
                    {new Date(row.quota_date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.request_count >= 130 ? "bg-destructive" : "bg-primary/60"
                        }`}
                      style={{ width: `${Math.min(100, (row.request_count / 130) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                    {row.request_count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
