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
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{data.label}</p>
      <div className="mt-1.5 space-y-0.5 text-xs">
        <p>
          <span className="inline-block w-3 h-2 rounded-sm bg-[#94a3b8] mr-1.5" />
          <span className="text-muted-foreground">Before: </span>
          <span className="font-medium">{data.before}</span>
        </p>
        <p>
          <span className="inline-block w-3 h-2 rounded-sm bg-[#3b82f6] mr-1.5" />
          <span className="text-muted-foreground">After: </span>
          <span className="font-medium">{data.after}</span>
        </p>
        <p
          className={`font-medium ${
            data.delta < 0
              ? "text-green-600"
              : data.delta > 0
              ? "text-red-600"
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
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
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
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Bar
            dataKey="before"
            name="Before"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="after"
            name="After"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
