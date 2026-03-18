"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REASON_CODE_LABELS, type ReasonCode, type ReasoningStep } from "@/lib/types";
import { ComparisonBarChart } from "@/components/dashboard/ComparisonBarChart";
import { TraceComparison } from "@/components/dashboard/TraceComparison";
import {
  compareRuns,
  type ComparisonResult,
  type FlippedVisit,
} from "@/lib/simulation/comparator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparisonAPIResponse {
  comparison: ComparisonResult;
  hasPrevious: boolean;
  previousRunId: string;
}

// Minimal interface for client-side comparison (structurally compatible with
// DashboardData — avoids circular import with RejectionDashboard).
interface RunSnapshot {
  run: {
    id: string;
    totalVisits: number;
    totalPurchases: number;
    totalRejections: number;
    overallConversionRate: number | null;
    estimatedRevenueLost: number | null;
    previousRunId?: string | null;
  };
  clusters: Array<{
    reasonCode: string;
    count: number;
    estimatedRevenueImpact: number | null;
  }>;
  visits: Array<{
    id: string;
    buyerProfileId: string;
    productId: string;
    outcome: string;
    reasonCode: string | null;
    reasonSummary: string | null;
    reasoningTrace: ReasoningStep[] | null;
    productPrice: number | null;
    mandate: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BeforeAfterComparison({
  runId,
  currentData,
  previousData,
}: {
  runId: string;
  currentData?: RunSnapshot | null;
  previousData?: RunSnapshot | null;
}) {
  const [data, setData] = useState<ComparisonAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Client-side path: both runs' data are already in state from the SSE
    // streams, so compute the comparison without a network round-trip.
    // This avoids the Vercel cross-instance /tmp isolation problem entirely.
    if (currentData && previousData && currentData.run.previousRunId) {
      const comparison = compareRuns(
        { id: previousData.run.id, totalVisits: previousData.run.totalVisits, totalPurchases: previousData.run.totalPurchases, totalRejections: previousData.run.totalRejections, overallConversionRate: previousData.run.overallConversionRate, estimatedRevenueLost: previousData.run.estimatedRevenueLost },
        { id: currentData.run.id, totalVisits: currentData.run.totalVisits, totalPurchases: currentData.run.totalPurchases, totalRejections: currentData.run.totalRejections, overallConversionRate: currentData.run.overallConversionRate, estimatedRevenueLost: currentData.run.estimatedRevenueLost },
        previousData.clusters.map((c) => ({ reasonCode: c.reasonCode, count: c.count, estimatedRevenueImpact: c.estimatedRevenueImpact ?? 0 })),
        currentData.clusters.map((c) => ({ reasonCode: c.reasonCode, count: c.count, estimatedRevenueImpact: c.estimatedRevenueImpact ?? 0 })),
        previousData.visits.map((v) => ({ id: v.id, buyerProfileId: v.buyerProfileId, productId: v.productId, outcome: v.outcome, reasonCode: v.reasonCode, reasonSummary: v.reasonSummary, reasoningTrace: v.reasoningTrace ?? null, productPrice: v.productPrice, mandate: v.mandate })),
        currentData.visits.map((v) => ({ id: v.id, buyerProfileId: v.buyerProfileId, productId: v.productId, outcome: v.outcome, reasonCode: v.reasonCode, reasonSummary: v.reasonSummary, reasoningTrace: v.reasoningTrace ?? null, productPrice: v.productPrice, mandate: v.mandate }))
      );
      setData({ comparison, hasPrevious: true, previousRunId: previousData.run.id });
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadComparison() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/compare?runId=${encodeURIComponent(runId)}`
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData.hasPrevious === false) {
            // No previous run — not an error, just nothing to compare
            if (!cancelled) {
              setData(null);
              setLoading(false);
            }
            return;
          }
          throw new Error(
            errData.error || `Comparison fetch failed: ${res.status}`
          );
        }

        const result: ComparisonAPIResponse = await res.json();
        if (!cancelled) {
          setData(result);
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

    loadComparison();
    return () => {
      cancelled = true;
    };
  }, [runId, currentData, previousData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground animate-pulse text-sm">
            Loading comparison data...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load comparison: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    // No previous run to compare
    return null;
  }

  const { comparison } = data;
  const convBefore = (comparison.conversionRateBefore * 100).toFixed(1);
  const convAfter = (comparison.conversionRateAfter * 100).toFixed(1);
  const deltaPp = comparison.conversionRateDeltaPp;
  const isImproved = deltaPp > 0;
  const recovered = comparison.revenueRecovered;

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card
        className={`border-l-[3px] ${
          isImproved
            ? "border-l-emerald-500/60"
            : "border-l-orange-500/60"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Before / After Comparison
            <Badge
              className={`text-[10px] border-0 ${
                isImproved
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
              }`}
            >
              {isImproved ? "Improved" : "Regressed"}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Comparing current run against the previous simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary delta bar */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Conversion rate change */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Conversion Rate</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold font-mono tabular-nums">
                  {convBefore}%
                </span>
                <span className="text-muted-foreground text-xs">&rarr;</span>
                <span className="text-base font-bold font-mono tabular-nums">
                  {convAfter}%
                </span>
                <span
                  className={`text-xs font-semibold font-mono ${
                    deltaPp > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : deltaPp < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  ({deltaPp > 0 ? "+" : ""}
                  {deltaPp.toFixed(1)}pp)
                </span>
              </div>
            </div>

            {/* Rejection change */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Rejections</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold font-mono tabular-nums">
                  {comparison.beforeRun.totalRejections}
                </span>
                <span className="text-muted-foreground text-xs">&rarr;</span>
                <span className="text-base font-bold font-mono tabular-nums">
                  {comparison.afterRun.totalRejections}
                </span>
                <DeltaBadge
                  value={comparison.totalRejectionsDelta}
                  invertColor
                />
              </div>
            </div>

            {/* Revenue recovered */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Revenue Impact</p>
              <div className="mt-1">
                <span
                  className={`text-base font-bold font-mono tabular-nums ${
                    recovered > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : recovered < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {recovered > 0 ? "+" : ""}$
                  {(Math.abs(recovered) / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {recovered > 0
                    ? "estimated revenue recovered"
                    : recovered < 0
                    ? "additional revenue at risk"
                    : "no change"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cluster comparison chart */}
      {comparison.clusterDeltas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Rejection Distribution: Before vs After
            </CardTitle>
            <CardDescription className="text-xs">
              Side-by-side comparison of rejection counts by reason code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComparisonBarChart deltas={comparison.clusterDeltas} />
          </CardContent>
        </Card>
      )}

      {/* Per-cluster deltas */}
      {comparison.clusterDeltas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Changes by Rejection Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {comparison.clusterDeltas.map((delta) => (
                <ClusterDeltaRow key={delta.reasonCode} delta={delta} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flipped visits */}
      {comparison.flippedVisits.length > 0 && (
        <FlippedVisitsSection flippedVisits={comparison.flippedVisits} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cluster delta row
// ---------------------------------------------------------------------------

function ClusterDeltaRow({
  delta,
}: {
  delta: {
    reasonCode: string;
    beforeCount: number;
    afterCount: number;
    countDelta: number;
    beforeRevenueImpact: number;
    afterRevenueImpact: number;
    revenueImpactDelta: number;
  };
}) {
  const label =
    REASON_CODE_LABELS[delta.reasonCode as ReasonCode] ?? delta.reasonCode;

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-2.5 text-xs transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-xs">{getShortLabel(delta.reasonCode)}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Count change */}
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-muted-foreground font-mono">
              {delta.beforeCount}
            </span>
            <span className="text-muted-foreground text-[10px]">&rarr;</span>
            <span className="tabular-nums font-medium font-mono">
              {delta.afterCount}
            </span>
          </div>
          <DeltaBadge value={delta.countDelta} invertColor />
        </div>

        {/* Revenue change */}
        <div className="text-right min-w-[70px]">
          <span
            className={`text-[11px] font-medium font-mono tabular-nums ${
              delta.revenueImpactDelta < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : delta.revenueImpactDelta > 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {delta.revenueImpactDelta < 0 ? "" : "+"}$
            {(delta.revenueImpactDelta / 100).toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flipped visits section
// ---------------------------------------------------------------------------

function FlippedVisitsSection({
  flippedVisits,
}: {
  flippedVisits: FlippedVisit[];
}) {
  const [showExamples, setShowExamples] = useState(false);

  const improved = flippedVisits.filter((f) => f.direction === "improved");
  const regressed = flippedVisits.filter((f) => f.direction === "regressed");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Outcome Changes</CardTitle>
        <CardDescription className="text-xs">
          Visits where the same buyer profile evaluating the same product reached
          a different decision
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex flex-wrap gap-4 text-xs">
          {improved.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {improved.length}
                </span>{" "}
                <span className="text-muted-foreground">
                  REJECT &rarr; PURCHASE
                </span>
              </span>
            </div>
          )}
          {regressed.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
              <span>
                <span className="font-bold font-mono text-red-600 dark:text-red-400">
                  {regressed.length}
                </span>{" "}
                <span className="text-muted-foreground">
                  PURCHASE &rarr; REJECT
                </span>
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowExamples(!showExamples)}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          {showExamples
            ? "Hide examples"
            : `View ${flippedVisits.length} example${flippedVisits.length !== 1 ? "s" : ""}`}
        </button>

        {showExamples && (
          <div className="space-y-3 border-t border-border pt-2.5">
            {flippedVisits.slice(0, 10).map((fv, idx) => (
              <TraceComparison key={idx} flippedVisit={fv} />
            ))}
            {flippedVisits.length > 10 && (
              <p className="text-[10px] text-muted-foreground text-center">
                Showing 10 of {flippedVisits.length} outcome changes
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Delta badge
// ---------------------------------------------------------------------------

function DeltaBadge({
  value,
  invertColor = false,
}: {
  value: number;
  /** If true, negative values are green (fewer rejections = good) */
  invertColor?: boolean;
}) {
  if (value === 0) {
    return (
      <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
        (no change)
      </span>
    );
  }

  const isPositive = value > 0;
  // For rejections: negative delta = good (green), positive = bad (red)
  // invertColor flips the usual positive=green convention
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <span
      className={`text-[10px] font-semibold tabular-nums font-mono ${
        isGood
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      ({isPositive ? "+" : ""}
      {value})
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
