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
  "var(--color-chart-1, #0ea5e9)",
  "var(--color-chart-2, #f59e0b)",
  "var(--color-chart-3, #f43f5e)",
  "var(--color-chart-4, #10b981)",
  "var(--color-chart-5, #8b5cf6)",
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
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium">{data.label}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{data.reasonCode}</p>
      <div className="mt-1.5 space-y-0.5 text-[11px]">
        <p>
          <span className="text-muted-foreground">Rejections: </span>
          <span className="font-medium font-mono">{data.count}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Revenue impact: </span>
          <span className="font-medium font-mono">
            ${(data.revenueImpact / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {data.count} x ${(avgPrice / 100).toFixed(0)} avg = $
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #888)" }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #888)" }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={44}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
