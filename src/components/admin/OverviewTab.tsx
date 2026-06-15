import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";

const TAX_RATE = 0.15;

export function StatCard({ title, value, icon, sub, color }: { title: string; value: string | number; icon: React.ReactNode; sub?: string; color?: string }) {
  return (
    <Card>
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

export default function OverviewTab() {
  const { formatPrice } = useCurrency();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [usersRes, notesRes, requestsRes] = await Promise.all([
        supabase.from("user_roles").select("role"),
        supabase.from("notes").select("id, price, is_free", { count: "exact" }),
        supabase.from("note_requests").select("status, total_amount"),
      ]);
      const roles = usersRes.data || [];
      const notes = notesRes.data || [];
      const requests = requestsRes.data || [];
      const totalUsers = roles.length;
      const teachers = roles.filter(r => r.role === "teacher").length;
      const pending = roles.filter(r => r.role === "pending").length;
      const admins = roles.filter(r => r.role === "admin").length;
      const completedRequests = requests.filter(r => r.status === "completed");
      const pendingRequests = requests.filter(r => r.status === "pending");
      const totalRevenue = completedRequests.reduce((s, r) => s + (r.total_amount || 0), 0);
      const pendingRevenue = pendingRequests.reduce((s, r) => s + (r.total_amount || 0), 0);
      const notePricesTotal = notes.filter(n => !n.is_free).reduce((s, n) => s + (n.price || 0), 0);
      const grossRevenue = totalRevenue + notePricesTotal;
      const tax = grossRevenue * TAX_RATE;
      const netRevenue = grossRevenue - tax;
      return { totalUsers, teachers, pending, admins, totalNotes: notes.length, totalRequests: requests.length, completedCount: completedRequests.length, pendingCount: pendingRequests.length, grossRevenue, tax, netRevenue, pendingRevenue, toCollect: pendingRevenue };
    },
  });
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;
  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={data.totalUsers} icon={<Users className="h-4 w-4" />} sub={`${data.teachers} teachers, ${data.admins} admins, ${data.pending} pending`} />
        <StatCard title="Total Notes" value={data.totalNotes} icon={<BarChart3 className="h-4 w-4" />} sub={`${data.totalRequests} requests total`} />
        <StatCard title="Gross Revenue" value={formatPrice(data.grossRevenue)} icon={<TrendingUp className="h-4 w-4 text-success" />} sub={`${data.completedCount} completed requests`} color="text-success" />
        <StatCard title="Net Revenue (after 15% tax)" value={formatPrice(data.netRevenue)} icon={<DollarSign className="h-4 w-4 text-primary" />} sub={`Tax: ${formatPrice(data.tax)}`} color="text-primary" />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <StatCard title="Pending Collection" value={formatPrice(data.toCollect)} icon={<DollarSign className="h-4 w-4 text-warning" />} sub={`${data.pendingCount} pending requests`} color="text-warning" />
        <StatCard title="Platform Worth" value={formatPrice(data.grossRevenue)} icon={<TrendingUp className="h-4 w-4" />} sub="Total revenue generated" />
        <StatCard title="Per-Teacher Avg" value={formatPrice(data.teachers > 0 ? data.netRevenue / data.teachers : 0)} icon={<Users className="h-4 w-4" />} sub="Net revenue per teacher" />
      </div>
    </div>
  );
}
