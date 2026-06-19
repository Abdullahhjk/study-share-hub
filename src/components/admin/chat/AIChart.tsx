import { memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie" | "metric";
  title?: string;
  data: { name: string; value: number; color?: string }[];
}

function colors(i: number) {
  const palette = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 70% 50%))", "hsl(var(--chart-3, 30 80% 55%))", "hsl(var(--chart-4, 280 60% 60%))", "hsl(var(--chart-5, 340 75% 55%))", "hsl(var(--muted-foreground))"];
  return palette[i % palette.length];
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-foreground">
          {entry.name}: <span className="font-semibold">{typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function AIChartInner({ spec }: { spec: ChartData }) {
  if (spec.type === "metric" && spec.data[0]) {
    return (
      <div className="my-2 rounded-lg border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground">{spec.title || spec.data[0].name}</p>
        <p className="text-2xl font-bold mt-1">{spec.data[0].value.toLocaleString()}</p>
      </div>
    );
  }

  const isSingle = spec.data.length <= 1;

  if (spec.type === "pie") {
    return (
      <div className="my-2 rounded-lg border bg-card p-3">
        {spec.title && <p className="text-xs font-medium text-center mb-2">{spec.title}</p>}
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={spec.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} isAnimationActive={false}>
              {spec.data.map((_, i) => (<Cell key={i} fill={colors(i)} />))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const ChartComp = spec.type === "line" ? LineChart : BarChart;
  return (
    <div className="my-2 rounded-lg border bg-card p-3">
      {spec.title && <p className="text-xs font-medium text-center mb-2">{spec.title}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <ChartComp data={spec.data}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {spec.type === "line"
            ? <Line type="monotone" dataKey="value" stroke={colors(0)} strokeWidth={2} isAnimationActive={false} />
            : <Bar dataKey="value" fill={colors(0)} radius={isSingle ? [4, 4, 0, 0] : [4, 4, 0, 0]} isAnimationActive={false} />}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(AIChartInner);
