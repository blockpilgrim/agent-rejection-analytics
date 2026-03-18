"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REASON_CODE_LABELS, type ReasonCode, type ReasoningStep } from "@/lib/types";
import { RejectionBarChart } from "@/components/dashboard/RejectionBarChart";
import { ClusterCard, type AppliedAction } from "@/components/dashboard/ClusterCard";
import { BeforeAfterComparison } from "@/components/dashboard/BeforeAfterComparison";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, XCircle, TrendingDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Types matching API responses
// ---------------------------------------------------------------------------

interface SimulationRun {
  id: string;
  storefrontId: string;
  totalVisits: number;
  totalPurchases: number;
  totalRejections: number;
  overallConversionRate: number | null;
  estimatedRevenueLost: number | null;
  status: string;
  previousRunId: string | null;
}

interface RejectionCluster {
  id: string;
  simulationRunId: string;
  reasonCode: string;
  count: number;
  affectedProfileIds: string[] | null;
  affectedProductIds: string[] | null;
  estimatedRevenueImpact: number | null;
  rank: number | null;
  recommendation: {
    action: string;
    description: string;
    estimatedRecovery: number;
  } | null;
}

interface AgentVisit {
  id: string;
  simulationRunId: string;
  buyerProfileId: string;
  productId: string;
  outcome: string;
  reasonCode: string | null;
  reasonSummary: string | null;
  reasoningTrace: ReasoningStep[] | null;
  productPrice: number | null;
  mandate: string | null;
  sequenceNumber: number | null;
}

interface ProfileInfo {
  name: string;
  primaryConstraint: string;
}

interface StorefrontAction {
  id: string;
  simulationRunId: string;
  recommendationSource: string | null;
  actionType: string;
  applied: boolean;
  reverted: boolean;
}

interface DashboardData {
  run: SimulationRun;
  clusters: RejectionCluster[];
  visits: AgentVisit[];
  profileMap: Record<string, ProfileInfo>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export type { DashboardData };

export function RejectionDashboard({
  runId,
  initialData,
  previousDashboardData,
  onRerunSimulation,
}: {
  runId: string;
  initialData?: DashboardData;
  previousDashboardData?: DashboardData;
  onRerunSimulation?: (previousRunId: string, visitCount: number) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Track applied actions: clusterId -> AppliedAction
  const [appliedActions, setAppliedActions] = useState<
    Record<string, AppliedAction>
  >({});

  useEffect(() => {
    // If data was passed in directly (e.g. bundled with the SSE complete event),
    // skip the network calls entirely — this is the happy path on Vercel where
    // /tmp is ephemeral and subsequent requests may hit different instances.
    if (initialData) return;

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        // First, trigger aggregation
        const aggRes = await fetch("/api/aggregate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId }),
        });

        if (!aggRes.ok) {
          const errData = await aggRes.json().catch(() => ({}));
          throw new Error(errData.error || `Aggregation failed: ${aggRes.status}`);
        }

        // Then fetch the full dashboard data
        const dashRes = await fetch(`/api/dashboard?runId=${encodeURIComponent(runId)}`);
        if (!dashRes.ok) {
          const errData = await dashRes.json().catch(() => ({}));
          throw new Error(errData.error || `Dashboard fetch failed: ${dashRes.status}`);
        }

        const dashData: DashboardData = await dashRes.json();

        // Also load existing storefront actions to restore applied state
        const actionsRes = await fetch(`/api/storefront?runId=${encodeURIComponent(runId)}`);
        if (actionsRes.ok) {
          const actionsData: { actions: StorefrontAction[] } = await actionsRes.json();
          const restored: Record<string, AppliedAction> = {};
          for (const sa of actionsData.actions) {
            if (sa.applied && !sa.reverted && sa.recommendationSource) {
              restored[sa.recommendationSource] = {
                actionId: sa.id,
                clusterId: sa.recommendationSource,
              };
            }
          }
          if (!cancelled) {
            setAppliedActions(restored);
          }
        }

        if (!cancelled) {
          setData(dashData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const handleActionApplied = useCallback(
    (clusterId: string, actionId: string) => {
      setAppliedActions((prev) => ({
        ...prev,
        [clusterId]: { actionId, clusterId },
      }));
    },
    []
  );

  const handleActionUndone = useCallback((clusterId: string) => {
    setAppliedActions((prev) => {
      const next = { ...prev };
      delete next[clusterId];
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-20 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load dashboard: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { run, clusters, visits, profileMap } = data;
  const conversionPct = run.overallConversionRate != null
    ? (run.overallConversionRate * 100).toFixed(1)
    : "0";
  const revenueLost = run.estimatedRevenueLost ?? 0;
  const totalCompleted = run.totalPurchases + run.totalRejections;

  // Compute total recovery from applied actions
  const appliedCount = Object.keys(appliedActions).length;
  const totalRecovery = clusters.reduce((sum, c) => {
    if (appliedActions[c.id] && c.recommendation) {
      return sum + c.recommendation.estimatedRecovery;
    }
    return sum;
  }, 0);

  // Build chart data from clusters
  const chartData = clusters.map((c) => ({
    reasonCode: c.reasonCode,
    label: getShortLabel(c.reasonCode),
    count: c.count,
    revenueImpact: c.estimatedRevenueImpact ?? 0,
  }));

  // Group visits by reason code for cluster drill-down
  const visitsByReasonCode = new Map<string, typeof visits>();
  for (const visit of visits) {
    if (visit.outcome === "reject" && visit.reasonCode) {
      const list = visitsByReasonCode.get(visit.reasonCode) ?? [];
      list.push(visit);
      visitsByReasonCode.set(visit.reasonCode, list);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary KPI bar */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Conversion Rate */}
        <KpiCard
          label="Conversion Rate"
          value={`${conversionPct}%`}
          subtitle={`${run.totalPurchases} of ${totalCompleted} agents purchased`}
          icon={<TrendingUp className="h-4 w-4" />}
          accentColor="emerald"
        />

        {/* Total Rejections */}
        <KpiCard
          label="Total Rejections"
          value={String(run.totalRejections)}
          subtitle={totalCompleted > 0
            ? `${((run.totalRejections / totalCompleted) * 100).toFixed(0)}% rejection rate`
            : "No visits completed"}
          icon={<XCircle className="h-4 w-4" />}
          accentColor="red"
        />

        {/* Revenue Lost */}
        <KpiCard
          label="Est. Revenue Lost"
          value={`$${(revenueLost / 100).toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          subtitle={`Across ${clusters.length} rejection categories`}
          icon={<TrendingDown className="h-4 w-4" />}
          accentColor="amber"
        />
      </div>

      {/* Before/After comparison — shown when this run has a previous run */}
      <BeforeAfterComparison
        runId={runId}
        currentData={data}
        previousData={previousDashboardData}
      />

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rejections by Reason Code</CardTitle>
            <CardDescription className="text-xs">
              Distribution of rejection reasons across all agent visits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RejectionBarChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Cluster list */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-4 w-0.5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold">Rejection Clusters</h2>
          <span className="text-xs text-muted-foreground">Ranked by revenue impact</span>
        </div>

        {clusters.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No rejections recorded in this simulation.
              </p>
            </CardContent>
          </Card>
        ) : (
          clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              visits={visitsByReasonCode.get(cluster.reasonCode) ?? []}
              profileMap={profileMap}
              storefrontId={run.storefrontId}
              appliedAction={appliedActions[cluster.id] ?? null}
              onActionApplied={handleActionApplied}
              onActionUndone={handleActionUndone}
            />
          ))
        )}
      </div>

      {/* Recovery summary + Re-run CTA — placed after clusters so it's the natural next step */}
      {appliedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {appliedCount} fix{appliedCount !== 1 ? "es" : ""} applied
            </p>
            <p className="text-xs text-muted-foreground">
              Changes applied to your storefront
            </p>
          </div>
          <div className="flex items-center gap-4">
            {onRerunSimulation && (
              <Button
                size="sm"
                onClick={() =>
                  onRerunSimulation(runId, run.totalVisits)
                }
              >
                Re-run Simulation
              </Button>
            )}
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                +${(totalRecovery / 100).toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                est. revenue recovery
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

const ACCENT_STYLES = {
  emerald: {
    value: "text-emerald-600 dark:text-emerald-400",
    icon: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
    border: "border-l-emerald-500/60",
  },
  red: {
    value: "text-red-600 dark:text-red-400",
    icon: "bg-red-500/10 text-red-500 dark:text-red-400",
    border: "border-l-red-500/60",
  },
  amber: {
    value: "text-amber-600 dark:text-amber-400",
    icon: "bg-amber-500/10 text-amber-500 dark:text-amber-400",
    border: "border-l-amber-500/60",
  },
} as const;

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  accentColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: keyof typeof ACCENT_STYLES;
}) {
  const accent = ACCENT_STYLES[accentColor];

  return (
    <div className={`rounded-lg bg-card p-4 ring-1 ring-foreground/[0.06] border-l-[3px] ${accent.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold font-mono tabular-nums ${accent.value}`}>
            {value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate reason code label for chart axis. */
function getShortLabel(code: string): string {
  const labels: Record<string, string> = {
    SHIPPING_SLA_UNMET: "Shipping SLA",
    PRICE_ABOVE_BUDGET: "Price/Budget",
    MISSING_STRUCTURED_DATA: "Missing Data",
    INSUFFICIENT_DESCRIPTION: "Insuff. Desc.",
    RETURN_POLICY_UNACCEPTABLE: "Return Policy",
    SUSTAINABILITY_UNVERIFIED: "Sustainability",
    BRAND_MISMATCH: "Brand Mismatch",
    REVIEW_SCORE_BELOW_THRESHOLD: "Low Reviews",
    STOCK_UNAVAILABLE: "Out of Stock",
    API_FIELD_MISSING: "API Field",
  };
  return labels[code] ?? code;
}
