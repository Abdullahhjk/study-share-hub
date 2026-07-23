import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Users, DollarSign, TrendingUp, BarChart3, Loader2, RefreshCw, Copy, Check, LucideIcon, BadgeCent, Coins, Euro, JapaneseYen, PoundSterling } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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

export default function OverviewTab() {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [isFxFetching, setIsFxFetching] = useState(false);
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("PKR");
  const [toCurrency, setToCurrency] = useState("USD");

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
      return { totalUsers, teachers, pending, admins, coadmins, totalNotes: notes.length, paidNotes: paidNotes.length, freeNotes: freeNotes.length, notesValue, totalRequests: requests.length, completedRequests: completedRequests.length, pendingRequests: pendingRequests.length, grossRevenue, tax, netRevenue, pendingRevenue, fxRate: fxRes.data ?? null };
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

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const convertCurrency = (
    amount: number,
    from: string,
    to: string
  ) => {
    if (!data.fxRate?.rates) return 0;

    const rates = data.fxRate.rates as Record<string, number>;

    const toPKR = (value: number, currency: string) => {
      if (currency === "PKR") return value;

      const rate = rates[`PKR${currency}`];
      return value / rate;
    };

    const fromPKR = (value: number, currency: string) => {
      if (currency === "PKR") return value;

      const rate = rates[`PKR${currency}`];
      return value * rate;
    };

    return fromPKR(toPKR(amount, from), to);
  };

  const convertedAmount = convertCurrency(
    Number(amount) || 0,
    fromCurrency,
    toCurrency
  );



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
        <StatCard title="Total Users" value={data.totalUsers} icon={<Users className="h-4 w-4" />} sub={`Teachers: ${data.teachers}, Admins: ${data.admins}, Co-admins: ${data.coadmins}, Pending: ${data.pending}`} />
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

          <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-3 pb-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-medium">
                FX Rates (PKR)
              </CardTitle>

              {fxStale && (
                <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  Stale
                </span>
              )}
            </div>

            <span
              className={`text-xs font-medium ${fxStale
                ? "text-destructive"
                : "text-muted-foreground"
                }`}
            >
              Updated {relativeTime(data.fxRate.fetched_at)}
            </span>
            <div className="flex items-center gap-2">

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
              {(() => {
                const CopyRatesButton = () => {
                  const [copied, setCopied] = useState(false);

                  const handleCopy = () => {
                    if (!data.fxRate?.rates) return;
                    const rates = data.fxRate.rates as Record<string, number>;
                    const markdown = [
                      "These rates are fetched with respect to Pakistani Rupee (PKR).",
                      "| Currency | Rate | Label |",
                      "|---|---|---|",
                      ...Object.entries(rates)
                        .sort()
                        .map(([key, rate]) => {
                          const currency = key.replace("PKR", "");
                          return `| ${currency} | ${rate} | ${Currencies.find((c) => c.code === currency)?.label} |`;
                        })
                    ].join("\n");
                    navigator.clipboard.writeText(markdown);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  };

                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 gap-1 text-xs w-28"
                    >
                      {copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? "Copied" : "Copy Rates"}
                    </Button>
                  );
                };
                return <CopyRatesButton />;
              })()}

            </div>
          </CardHeader>

          {data.fxRate.rates && typeof data.fxRate.rates === "object" && (
            <CardContent className="p-3 space-y-6">
              {/* Currency Converter */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Currency Converter</h3>

                  <div className="text-xs text-muted-foreground">
                    Precision: 4 decimal places
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 sm:grid-cols-2">
                  <span>
                    <Input
                      type="number"
                      className={`${Number(amount) >= 10000000000
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                        }`}
                      step="0.0001"
                      placeholder="Amount"
                      min={0}
                      max={10000000000}
                      value={amount}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (value === "") {
                          setAmount("");
                          return;
                        }

                        const num = Number(value);

                        if (num >= 0 && num <= 10000000000) {
                          setAmount(value);
                        }
                        else if (num <= 0) {
                          setAmount("0")
                        }
                        else {
                          setAmount("10000000000")
                        }
                      }}
                    />
                    {Number(amount) >= 10000000000 && <p className="text-red-500 text-xs mt-1">Maximum value is reached</p>}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFromCurrency(toCurrency);
                      setToCurrency(fromCurrency);
                    }}
                  >
                    Swap
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 sm:grid-cols-2 sm:text-sm md:text-md">

                  <Select
                    value={fromCurrency}
                    onValueChange={setFromCurrency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem
                          key={currency}
                          value={currency}
                          disabled={currency === toCurrency}
                        >
                          {currency} - {Currencies.find((c) => c.code === currency)?.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={toCurrency}
                    onValueChange={setToCurrency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem
                          key={currency}
                          value={currency}
                          disabled={currency === fromCurrency}
                        >
                          {currency} - {Currencies.find((c) => c.code === currency)?.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border bg-background p-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    Converted Amount
                  </div>

                  <div className="overflow-x-auto">
                    <div className="font-mono font-bold text-xl sm:text-3xl break-all leading-tight">
                      {convertedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}{" "}
                      {toCurrency}
                    </div>
                    <span className="text-sm text-muted-foreground">{Currencies.find((c) => c.code === toCurrency)?.label}</span>
                  </div>

                  <div className="mt-2 text-sm text-muted-foreground break-all">
                    {(Number(amount) || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}{" "}
                    {fromCurrency}
                    {" = "}
                    <span className="font-semibold text-foreground">
                      {convertedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}{" "}
                      {toCurrency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Existing FX Rates */}
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
