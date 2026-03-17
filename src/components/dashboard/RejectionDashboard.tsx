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

export function RejectionDashboard({
  runId,
  onRerunSimulation,
}: {
  runId: string;
  onRerunSimulation?: (previousRunId: string, visitCount: number) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track applied actions: clusterId -> AppliedAction
  const [appliedActions, setAppliedActions] = useState<
    Record<string, AppliedAction>
  >({});

  useEffect(() => {
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
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground animate-pulse">
              Analyzing simulation results...
            </p>
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-2xl">{conversionPct}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {run.totalPurchases} of {totalCompleted} agents purchased
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Rejections</CardDescription>
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">
              {run.totalRejections}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalCompleted > 0
                ? `${((run.totalRejections / totalCompleted) * 100).toFixed(0)}% rejection rate`
                : "No visits completed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Revenue Lost</CardDescription>
            <CardTitle className="text-2xl">
              ${(revenueLost / 100).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across {clusters.length} rejection categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Before/After comparison — shown when this run has a previous run */}
      <BeforeAfterComparison runId={runId} />

      {/* Recovery summary — shown when at least one action is applied */}
      {appliedCount > 0 && (
        <Card className="border-green-300 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
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
                  <p className="text-lg font-bold text-green-700 dark:text-green-400 tabular-nums">
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
          </CardContent>
        </Card>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rejections by Reason Code</CardTitle>
            <CardDescription>
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
        <h2 className="text-lg font-semibold">
          Rejection Clusters
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            Ranked by revenue impact
          </span>
        </h2>

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
