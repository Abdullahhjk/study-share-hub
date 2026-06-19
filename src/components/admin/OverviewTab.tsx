import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { Users, DollarSign, TrendingUp, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";

const borderColorMap: Record<string, string> = {
  "text-success": "border-success",
  "text-primary": "border-primary",
  "text-warning": "border-warning",
  "text-destructive": "border-destructive",
};

export function StatCard({ title, value, icon, sub, color }: { title: string; value: string | number; icon: React.ReactNode; sub?: string; color?: string }) {
  const borderClass = color && borderColorMap[color] ? borderColorMap[color] : "border-muted";
  return (
    <Card className={`border-l-4 ${borderClass}`}>
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className={`text-lg sm:text-2xl font-bold ${color || ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm md:text-base">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-semibold text-sm sm:text-base md:text-lg lg:text-xl">{value}</div>
    </div>
  );
}

const TAX_RATE = 0.15;
const FX_STALE_MS = 6 * 60 * 60 * 1000 + 5 * 60 * 1000;

export default function OverviewTab() {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [isFxFetching, setIsFxFetching] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [usersRes, notesRes, requestsRes, fxRes] = await Promise.all([
        supabase.from("user_roles").select("role"),
        supabase.from("notes").select("id, price, is_free", { count: "exact" }),
        supabase.from("note_requests").select("status, total_amount"),
        supabase.from("fx_rates").select("*").eq("base_currency", "PKR").single(),
      ]);
      const roles = usersRes.data || [];
      const notes = notesRes.data || [];
      const requests = requestsRes.data || [];
      const totalUsers = roles.length;
      const teachers = roles.filter(r => r.role === "teacher").length;
      const pending = roles.filter(r => r.role === "pending").length;
      const admins = roles.filter(r => r.role === "admin").length;
      const paidNotes = notes.filter(n => !n.is_free);
      const freeNotes = notes.filter(n => n.is_free);
      const notesValue = paidNotes.reduce((s, n) => s + (n.price || 0), 0);
      const completedRequests = requests.filter(r => r.status === "completed");
      const pendingRequests = requests.filter(r => r.status === "pending");
      const totalRevenue = completedRequests.reduce((s, r) => s + (r.total_amount || 0), 0);
      const pendingRevenue = pendingRequests.reduce((s, r) => s + (r.total_amount || 0), 0);
      const grossRevenue = totalRevenue;
      const tax = grossRevenue * TAX_RATE;
      const netRevenue = grossRevenue - tax;
      return { totalUsers, teachers, pending, admins, totalNotes: notes.length, paidNotes: paidNotes.length, freeNotes: freeNotes.length, notesValue, totalRequests: requests.length, completedRequests: completedRequests.length, pendingRequests: pendingRequests.length, grossRevenue, tax, netRevenue, pendingRevenue, fxRate: fxRes.data ?? null };
    },
  });

  const handleForceFetchFx = async () => {
    setIsFxFetching(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.functions.invoke("update-fx-rates", { body: {} });
      if (error) throw error;
      await supabase.from("fx_rates").update({ updated_at: now }).eq("base_currency", "PKR");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      console.error("Failed to force fetch FX rates:", e);
    } finally {
      setIsFxFetching(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const fxStale = data.fxRate ? Date.now() - new Date(data.fxRate.fetched_at).getTime() > FX_STALE_MS : false;

  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return `${hours}h ${remainder}m ago`;
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={data.totalUsers} icon={<Users className="h-4 w-4" />} sub={`${data.teachers} teachers, ${data.admins} admins, ${data.pending} pending`} />
        <StatCard title="Total Notes" value={data.totalNotes} icon={<BarChart3 className="h-4 w-4" />} sub={`${data.paidNotes} paid, ${data.freeNotes} free`} />
        <StatCard title="Gross Revenue" value={formatPrice(data.grossRevenue)} icon={<TrendingUp className="h-4 w-4 text-success" />} sub={`${data.completedRequests} completed sales`} color="text-success" />
        <StatCard title="Net Revenue (after 15% tax)" value={formatPrice(data.netRevenue)} icon={<DollarSign className="h-4 w-4 text-primary" />} sub={`Tax: ${formatPrice(data.tax)}`} color="text-primary" />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Collection" value={formatPrice(data.pendingRevenue)} icon={<DollarSign className="h-4 w-4 text-warning" />} sub={`${data.pendingRequests} pending requests`} color="text-warning" />
        <StatCard title="Platform Worth" value={formatPrice(data.notesValue)} icon={<TrendingUp className="h-4 w-4" />} sub="Total value of all paid notes" />
        <StatCard title="Per-Teacher Avg" value={formatPrice(data.teachers > 0 ? data.netRevenue / data.teachers : 0)} icon={<Users className="h-4 w-4" />} sub="Net revenue per teacher" />
        <StatCard title="Total Requests" value={data.totalRequests} icon={<BarChart3 className="h-4 w-4" />} sub={`${data.completedRequests} completed, ${data.pendingRequests} pending`} />
      </div>
      {data.fxRate && (
        <Card
          className={
            fxStale
              ? "border-destructive bg-destructive/5 shadow-sm shadow-destructive/20"
              : ""
          }
        >
          {fxStale && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-destructive/20 bg-destructive/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-semibold text-destructive uppercase tracking-wider">
                  Exchange rates are stale
                </span>
              </div>

              <span className="text-xs text-destructive/80">
                Refresh required
              </span>
            </div>
          )}

          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                FX Rates (PKR)
              </CardTitle>

              {fxStale && (
                <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  Stale
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${fxStale
                  ? "text-destructive"
                  : "text-muted-foreground"
                  }`}
              >
                Updated {relativeTime(data.fxRate.fetched_at)}
              </span>

              <Button
                variant={fxStale ? "default" : "outline"}
                size="sm"
                onClick={handleForceFetchFx}
                disabled={!fxStale || isFxFetching}
                className="h-7 gap-1 text-xs"
              >
                {isFxFetching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>

          {data.fxRate.rates && typeof data.fxRate.rates === "object" && (
            <CardContent className="p-3">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {Object.entries(data.fxRate.rates as Record<string, number>)
                  .sort()
                  .map(([key, rate]) => {
                    const currency = key.replace("PKR", "");
                    const inverseRate = 1 / rate;

                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-3 space-y-2 transition-colors ${fxStale
                          ? "border-destructive/20 bg-destructive/[0.03]"
                          : "bg-background"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-base">
                            {currency}
                          </span>

                          <span
                            className={`text-[10px] uppercase ${fxStale
                              ? "text-destructive"
                              : "text-muted-foreground"
                              }`}
                          >
                            FX
                          </span>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">
                            1 PKR
                          </div>

                          <div className="font-mono font-bold text-lg">
                            {rate.toFixed(6)}
                          </div>
                        </div>

                        <div className="border-t pt-2">
                          <div className="text-xs text-muted-foreground">
                            1 {currency}
                          </div>

                          <div className="font-semibold">
                            {inverseRate.toFixed(2)} PKR
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
