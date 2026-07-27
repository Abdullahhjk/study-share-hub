import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Users, DollarSign, TrendingUp, BarChart3, Loader2, RefreshCw, Copy, Check, LucideIcon, BadgeCent, Coins, Euro, JapaneseYen, PoundSterling, Activity, Pencil, Save, X, ArrowRightLeft, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const ROLE_COLORS: Record<string, string> = {
  teacher: "hsl(217, 91%, 50%)",
  admin: "hsl(142, 71%, 35%)",
  coadmin: "hsl(262, 83%, 58%)",
  pending: "hsl(38, 92%, 50%)",
  deleted: "hsl(0, 84%, 60%)",
  blocked: "hsl(0, 0%, 40%)",
  rejected: "hsl(346, 77%, 50%)",
};

const borderColorMap: Record<string, string> = {
  "text-success": "border-success",
  "text-primary": "border-primary",
  "text-warning": "border-warning",
  "text-destructive": "border-destructive",
};

export function StatCard({ title, value, icon, sub, color, onClick }: { title: string; value: string | number; icon: React.ReactNode; sub?: string; color?: string; onClick?: () => void }) {
  const borderClass = color && borderColorMap[color] ? borderColorMap[color] : "border-muted";
  return (
    <Card className={`border-l-4 ${borderClass} ${onClick ? "cursor-pointer transition-colors hover:bg-muted/50" : ""}`} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className={`text-lg sm:text-2xl font-bold ${color || ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sub}</p>}
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

interface Currency {
  code: string;
  label: string;
  icon: LucideIcon;
}

const Currencies: Currency[] = [
  { code: "USD", label: "US Dollar", icon: DollarSign },
  { code: "PKR", label: "پاکستانی روپیہ", icon: Coins },
  { code: "CAD", label: "Canadian Dollar", icon: BadgeCent },
  { code: "JPY", label: "日本円", icon: JapaneseYen },
  { code: "CNY", label: "人民币", icon: JapaneseYen },
  { code: "EUR", label: "Euro", icon: Euro },
  { code: "GBP", label: "Pound sterling", icon: PoundSterling },
  { code: "SAR", label: "الریال اسعودی", icon: Coins },
];

const TAX_RATE = 0.15;
const FX_STALE_MS = 6 * 60 * 60 * 1000 + 5 * 60 * 1000;

function maskApi(api: string | null): string {
  if (!api) return "—";
  if (api.length <= 8) return api[0] + "*".repeat(api.length - 2) + api[api.length - 1];
  return api.slice(0, 4) + "*".repeat(api.length - 8) + api.slice(-4);
}

export default function OverviewTab() {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [isFxFetching, setIsFxFetching] = useState(false);
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("PKR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCountValue, setEditingCountValue] = useState("");
  const [newApiName, setNewApiName] = useState("");
  const [newApiCount, setNewApiCount] = useState("0");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);

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
      const coadmins = roles.filter(r => r.role === "coadmin").length;
      const deleted = roles.filter(r => r.role === "deleted").length;
      const blocked = roles.filter(r => r.role === "blocked").length;
      const rejected = roles.filter(r => r.role === "rejected").length;
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
      return { totalUsers, teachers, pending, admins, coadmins, deleted, blocked, rejected, totalNotes: notes.length, paidNotes: paidNotes.length, freeNotes: freeNotes.length, notesValue, totalRequests: requests.length, completedRequests: completedRequests.length, pendingRequests: pendingRequests.length, grossRevenue, tax, netRevenue, pendingRevenue, fxRate: fxRes.data ?? null };
    },
  });

  const { data: apiUsage, isLoading: apiUsageLoading } = useQuery({
    queryKey: ["api-layer-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apilayer_api_track").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: apiDialogOpen,
  });

  const { data: myRole } = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      return data?.role ?? null;
    },
  });

  const isAdmin = myRole === "admin";

  const updateApiRow = useMutation({
    mutationFn: async ({ id, api, count }: { id: string; api: string; count: number }) => {
      const { error } = await supabase.from("apilayer_api_track").update({ API: api, count }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-layer-usage"] });
      setEditingId(null);
      setEditingValue("");
      setEditingCountValue("");
    },
  });

  const addApiKey = useMutation({
    mutationFn: async ({ API, count }: { API: string; count: number }) => {
      const { error } = await supabase.from("apilayer_api_track").insert({ API, count });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-layer-usage"] });
      setNewApiName("");
      setNewApiCount("0");
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apilayer_api_track").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-layer-usage"] });
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

  const currencies = useMemo(() => {
    if (!data?.fxRate?.rates) return ["PKR"];
    return [
      "PKR",
      ...Object.keys(data.fxRate.rates as Record<string, number>)
        .map((k) => k.replace("PKR", ""))
        .sort(),
    ];
  }, [data?.fxRate]);

  const fxStale = data?.fxRate ? Date.now() - new Date(data.fxRate.fetched_at).getTime() > FX_STALE_MS : false;

  const userRoleChartData = useMemo(() => {
    if (!data) return [];
    const roles = [
      { name: "Teachers", value: data.teachers, fill: ROLE_COLORS.teacher },
      { name: "Admins", value: data.admins, fill: ROLE_COLORS.admin },
      { name: "Co-admins", value: data.coadmins, fill: ROLE_COLORS.coadmin },
      { name: "Pending", value: data.pending, fill: ROLE_COLORS.pending },
      { name: "Deleted", value: data.deleted, fill: ROLE_COLORS.deleted },
      { name: "Blocked", value: data.blocked, fill: ROLE_COLORS.blocked },
      { name: "Rejected", value: data.rejected, fill: ROLE_COLORS.rejected },
    ].filter(r => r.value > 0);
    return roles;
  }, [data]);

  const roleChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    userRoleChartData.forEach(r => {
      config[r.name] = { label: r.name, color: r.fill };
    });
    return config;
  }, [userRoleChartData]);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const convertCurrency = (val: number, from: string, to: string) => {
    if (!data.fxRate?.rates) return 0;
    const rates = data.fxRate.rates as Record<string, number>;
    const toPKR = (v: number, c: string) => c === "PKR" ? v : v / rates[`PKR${c}`];
    const fromPKR = (v: number, c: string) => c === "PKR" ? v : v * rates[`PKR${c}`];
    return fromPKR(toPKR(val, from), to);
  };

  const convertedAmount = convertCurrency(Number(amount) || 0, fromCurrency, toCurrency);

  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return `${hours}h ${remainder}m ago`;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={data.totalUsers}
          icon={<Users className="h-4 w-4" />}
          sub={`${data.teachers} teachers, ${data.admins} admins`}
          onClick={() => setUsersDialogOpen(true)}
        />
        <StatCard title="Total Notes" value={data.totalNotes} icon={<BarChart3 className="h-4 w-4" />} sub={`${data.paidNotes} paid, ${data.freeNotes} free`} />
        <StatCard title="Gross Revenue" value={formatPrice(data.grossRevenue)} icon={<TrendingUp className="h-4 w-4 text-success" />} sub={`${data.completedRequests} completed sales`} color="text-success" />
        <StatCard title="Net Revenue" value={formatPrice(data.netRevenue)} icon={<DollarSign className="h-4 w-4 text-primary" />} sub={`After ${formatPrice(data.tax)} tax`} color="text-primary" />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Collection" value={formatPrice(data.pendingRevenue)} icon={<DollarSign className="h-4 w-4 text-warning" />} sub={`${data.pendingRequests} pending requests`} color="text-warning" />
        <StatCard title="Platform Worth" value={formatPrice(data.notesValue)} icon={<TrendingUp className="h-4 w-4" />} sub="Total value of all paid notes" />
        <StatCard title="Per-Teacher Avg" value={formatPrice(data.teachers > 0 ? data.netRevenue / data.teachers : 0)} icon={<Users className="h-4 w-4" />} sub="Net revenue per teacher" />
        <StatCard title="Total Requests" value={data.totalRequests} icon={<BarChart3 className="h-4 w-4" />} sub={`${data.completedRequests} completed, ${data.pendingRequests} pending`} />
      </div>


      {/* FX Rates Card */}
      {data.fxRate && (
        <Card className={fxStale ? "border-destructive bg-destructive/5" : ""}>
          {fxStale && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-destructive/20 bg-destructive/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Exchange rates are stale</span>
              </div>
              <span className="text-xs text-destructive/80">Refresh required</span>
            </div>
          )}

          <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-3 pb-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-medium">FX Rates (PKR)</CardTitle>
              {fxStale && (
                <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  Stale
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${fxStale ? "text-destructive" : "text-muted-foreground"}`}>
                Updated {relativeTime(data.fxRate.fetched_at)}
              </span>
              <Button variant={fxStale ? "default" : "outline"} size="sm" onClick={handleForceFetchFx} disabled={!fxStale || isFxFetching} className="h-7 gap-1 text-xs">
                {isFxFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh
              </Button>
              <CopyRatesButton data={data} />
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setApiDialogOpen(true)}>
                <Activity className="h-3.5 w-3.5" />
                API Usage
              </Button>
            </div>
          </CardHeader>

          {data.fxRate.rates && typeof data.fxRate.rates === "object" && (
            <CardContent className="p-3 space-y-4">
              {/* Compact Currency Converter */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Currency Converter</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="number"
                    className="h-8 text-sm flex-1 min-w-0"
                    step="0.01"
                    placeholder="Amount"
                    min={0}
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setAmount(""); return; }
                      const num = Number(v);
                      if (num >= 0) setAmount(v);
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c} value={c} disabled={c === toCurrency}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }}>
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c} value={c} disabled={c === fromCurrency}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">{(Number(amount) || 0).toLocaleString()} {fromCurrency}</span>
                  <span className="mx-1.5 text-muted-foreground">=</span>
                  <span className="font-semibold">{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {toCurrency}</span>
                </div>
              </div>

              {/* FX Rate Cards */}
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                {Object.entries(data.fxRate.rates as Record<string, number>).sort().map(([key, rate]) => {
                  const currency = key.replace("PKR", "");
                  return (
                    <div key={key} className={`rounded-lg border p-2.5 space-y-1 ${fxStale ? "border-destructive/20 bg-destructive/[0.03]" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{currency}</span>
                        <span className={`text-[10px] uppercase ${fxStale ? "text-destructive" : "text-muted-foreground"}`}>FX</span>
                      </div>
                      <div className="text-xs text-muted-foreground">1 {currency} = {(1 / rate).toFixed(2)} PKR</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* API Usage Dialog */}
      <Dialog open={apiDialogOpen} onOpenChange={setApiDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>API Layer Usage</DialogTitle>
            <DialogDescription>Track record of API calls from the apilayer_api_track table.</DialogDescription>
          </DialogHeader>

          {/* Add New Row (admin only) */}
          {isAdmin && (
            <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">API Name</label>
                <Input value={newApiName} onChange={(e) => setNewApiName(e.target.value)} placeholder="e.g. currency" className="h-8 text-xs" />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Count</label>
                <Input type="number" value={newApiCount} onChange={(e) => setNewApiCount(e.target.value)} className="h-8 text-xs" min={0} />
              </div>
              <Button size="sm" className="h-8 gap-1" disabled={!newApiName.trim() || addApiKey.isPending} onClick={() => addApiKey.mutate({ API: newApiName.trim(), count: Number(newApiCount) || 0 })}>
                {addApiKey.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add
              </Button>
            </div>
          )}

          {apiUsageLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !apiUsage?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No API usage records found.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">API</th>
                    <th className="pb-2 font-medium text-right">Count</th>
                    <th className="pb-2 font-medium text-right">Date</th>
                    {isAdmin && <th className="pb-2 font-medium text-right w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {apiUsage.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 group">
                      <td className="py-2 font-mono">
                        {editingId === row.id ? (
                          <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} className="h-7 text-xs font-mono" autoFocus />
                        ) : (
                          isAdmin ? (row.API ?? "—") : maskApi(row.API)
                        )}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {editingId === row.id ? (
                          <Input type="number" value={editingCountValue} onChange={(e) => setEditingCountValue(e.target.value)} className="h-7 text-xs font-mono w-20 ml-auto" min={0} max={100} />
                        ) : (
                          row.count ?? 0
                        )}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                      {isAdmin && (
                        <td className="py-2 text-right">
                          {editingId === row.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={updateApiRow.isPending} onClick={() => updateApiRow.mutate({ id: row.id, api: editingValue, count: Number(editingCountValue) || 0 })}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(null); setEditingValue(""); setEditingCountValue(""); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(row.id); setEditingValue(row.API ?? ""); setEditingCountValue(String(row.count ?? 0)); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteTargetId(row.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Role Stats Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Role Distribution</DialogTitle>
            <DialogDescription>Breakdown of {data.totalUsers} users by role.</DialogDescription>
          </DialogHeader>
          {userRoleChartData.length > 0 ? (
            <div className="space-y-4">
              <ChartContainer config={roleChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <Pie data={userRoleChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {userRoleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ChartContainer>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {userRoleChartData.map((r) => (
                  <div key={r.name} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.fill }} />
                      <span>{r.name}</span>
                    </div>
                    <span className="font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No user data available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTargetId) deleteApiKey.mutate(deleteTargetId); setDeleteTargetId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CopyRatesButton({ data }: { data: { fxRate?: { rates: unknown; fetched_at: string } | null } }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!data?.fxRate?.rates) return;
    const rates = data.fxRate.rates as Record<string, number>;
    const markdown = [
      "These rates are fetched with respect to Pakistani Rupee (PKR).",
      "| Currency | Rate | Label |",
      "|---|---|---|",
      ...Object.entries(rates).sort().map(([key, rate]) => {
        const currency = key.replace("PKR", "");
        return `| ${currency} | ${rate} | ${Currencies.find((c) => c.code === currency)?.label} |`;
      })
    ].join("\n");
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 gap-1 text-xs w-28">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy Rates"}
    </Button>
  );
}
