"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClusterDelta {
  reasonCode: string;
  beforeCount: number;
  afterCount: number;
  countDelta: number;
}

interface ChartDataPoint {
  label: string;
  before: number;
  after: number;
  delta: number;
}

// ---------------------------------------------------------------------------
// Short labels
// ---------------------------------------------------------------------------

const SHORT_LABELS: Record<string, string> = {
  SHIPPING_SLA_UNMET: "Shipping",
  PRICE_ABOVE_BUDGET: "Price",
  MISSING_STRUCTURED_DATA: "Missing Data",
  INSUFFICIENT_DESCRIPTION: "Description",
  RETURN_POLICY_UNACCEPTABLE: "Returns",
  SUSTAINABILITY_UNVERIFIED: "Sustainability",
  BRAND_MISMATCH: "Brand",
  REVIEW_SCORE_BELOW_THRESHOLD: "Reviews",
  STOCK_UNAVAILABLE: "Stock",
  API_FIELD_MISSING: "API Field",
};

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium">{data.label}</p>
      <div className="mt-1.5 space-y-0.5 text-[11px]">
        <p>
          <span className="inline-block w-2.5 h-1.5 rounded-sm bg-[oklch(0.50_0.01_255)] dark:bg-[oklch(0.45_0.01_255)] mr-1.5" />
          <span className="text-muted-foreground">Before: </span>
          <span className="font-medium font-mono">{data.before}</span>
        </p>
        <p>
          <span className="inline-block w-2.5 h-1.5 rounded-sm bg-primary mr-1.5" />
          <span className="text-muted-foreground">After: </span>
          <span className="font-medium font-mono">{data.after}</span>
        </p>
        <p
          className={`font-medium font-mono ${
            data.delta < 0
              ? "text-emerald-600 dark:text-emerald-400"
              : data.delta > 0
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
        >
          Change: {data.delta > 0 ? "+" : ""}
          {data.delta}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ComparisonBarChart({ deltas }: { deltas: ClusterDelta[] }) {
  if (deltas.length === 0) return null;

  const chartData: ChartDataPoint[] = deltas
    .filter((d) => d.beforeCount > 0 || d.afterCount > 0)
    .map((d) => ({
      label: SHORT_LABELS[d.reasonCode] ?? d.reasonCode,
      before: d.beforeCount,
      after: d.afterCount,
      delta: d.countDelta,
    }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
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
          <Legend
            verticalAlign="top"
            height={24}
            wrapperStyle={{ fontSize: "11px" }}
          />
          <Bar
            dataKey="before"
            name="Before"
            fill="oklch(0.50 0.01 255)"
            radius={[3, 3, 0, 0]}
            maxBarSize={30}
          />
          <Bar
            dataKey="after"
            name="After"
            fill="var(--color-primary, #0ea5e9)"
            radius={[3, 3, 0, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
