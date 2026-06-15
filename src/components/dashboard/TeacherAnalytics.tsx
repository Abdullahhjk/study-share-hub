import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

interface Props {
  teacherId: string | undefined;
}

const COLORS = [
  "hsl(217, 91%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

export function TeacherAnalytics({ teacherId }: Props) {
  const { data: requestsByStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["analytics-status", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("note_requests")
        .select("status")
        .eq("teacher_id", teacherId);
      if (error) throw error;
      const counts = data.reduce((acc: Record<string, number>, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }));
    },
    enabled: !!teacherId,
  });

  const { data: requestsByMonth, isLoading: monthLoading } = useQuery({
    queryKey: ["analytics-monthly", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("note_requests")
        .select("created_at, total_amount")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const monthlyData: Record<string, { requests: number; revenue: number; sortKey: number }> = {};
      data.forEach((req) => {
        const date = new Date(req.created_at);
        const monthKey = `${date.toLocaleString("en-US", { month: "short" })} '${String(date.getFullYear()).slice(-2)}`;
        const sortKey = date.getFullYear() * 100 + date.getMonth();
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { requests: 0, revenue: 0, sortKey };
        }
        monthlyData[monthKey].requests += 1;
        monthlyData[monthKey].revenue += req.total_amount || 0;
      });
      return Object.entries(monthlyData)
        .sort(([, a], [, b]) => a.sortKey - b.sortKey)
        .map(([month, data]) => ({
          month,
          requests: data.requests,
          revenue: data.revenue,
        }));
    },
    enabled: !!teacherId,
  });

  const { data: notesByCategory, isLoading: categoryLoading } = useQuery({
    queryKey: ["analytics-category", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("notes")
        .select(`id, subcategories (name, categories (name))`)
        .eq("teacher_id", teacherId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((note: any) => {
        const categoryName = note.subcategories?.categories?.name || "Uncategorized";
        counts[categoryName] = (counts[categoryName] || 0) + 1;
      });
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
    enabled: !!teacherId,
  });

  const isLoading = statusLoading || monthLoading || categoryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const chartConfig = {
    requests: { label: "Requests", color: "hsl(217, 91%, 50%)" },
    revenue: { label: "Revenue ($)", color: "hsl(142, 76%, 36%)" },
    count: { label: "Notes", color: "hsl(217, 91%, 50%)" },
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Analytics Overview</h2>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        {/* Request Status Distribution */}
        <Card className="w-full">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Request Status Distribution</CardTitle>
            <CardDescription className="text-xs">
              Breakdown of all requests by status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            {requestsByStatus && requestsByStatus.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[160px] w-full">
                <PieChart>
                  <Pie
                    data={requestsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {requestsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
                No request data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes by Category */}
        <Card className="w-full">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Notes by Category</CardTitle>
            <CardDescription className="text-xs">
              Distribution of your notes across categories
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            {notesByCategory && notesByCategory.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[160px] w-full">
                <BarChart data={notesByCategory} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(217, 91%, 50%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
                No notes uploaded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="w-full">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Monthly Trends</CardTitle>
          <CardDescription className="text-xs">
            Requests and revenue over time
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {requestsByMonth && requestsByMonth.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <LineChart data={requestsByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(217, 91%, 50%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
              No request data available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}