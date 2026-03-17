"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChartDataPoint {
  reasonCode: string;
  label: string;
  count: number;
  revenueImpact: number; // cents
}

const BAR_COLORS = [
  "var(--color-chart-1, #e11d48)",
  "var(--color-chart-2, #f97316)",
  "var(--color-chart-3, #eab308)",
  "var(--color-chart-4, #22c55e)",
  "var(--color-chart-5, #3b82f6)",
];

function getBarColor(index: number): string {
  return BAR_COLORS[index % BAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const avgPrice = data.count > 0 ? data.revenueImpact / data.count : 0;

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{data.label}</p>
      <p className="text-xs text-muted-foreground font-mono">{data.reasonCode}</p>
      <div className="mt-1.5 space-y-0.5 text-xs">
        <p>
          <span className="text-muted-foreground">Rejections: </span>
          <span className="font-medium">{data.count}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Revenue impact: </span>
          <span className="font-medium">
            ${(data.revenueImpact / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground italic">
          {data.count} rejections x ${(avgPrice / 100).toFixed(0)} avg price = $
          {(data.revenueImpact / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RejectionBarChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 40, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={60}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
