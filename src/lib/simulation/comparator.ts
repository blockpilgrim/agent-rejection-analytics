// ---------------------------------------------------------------------------
// Before/After Comparison Engine
//
// Compares two simulation runs to identify improvements and regressions.
// Computes deltas for aggregate stats, per-cluster changes, and identifies
// "flipped" visits where the same profile + product changed outcome.
// ---------------------------------------------------------------------------

import type { ReasoningStep } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunSummary {
  id: string;
  totalVisits: number;
  totalPurchases: number;
  totalRejections: number;
  overallConversionRate: number | null;
  estimatedRevenueLost: number | null;
}

export interface ClusterSummary {
  reasonCode: string;
  count: number;
  estimatedRevenueImpact: number; // cents
}

export interface VisitRecord {
  id: string;
  buyerProfileId: string;
  productId: string;
  outcome: string;
  reasonCode: string | null;
  reasonSummary: string | null;
  reasoningTrace: ReasoningStep[] | null;
  productPrice: number | null;
  mandate: string | null;
}

/** A visit that changed outcome between runs (same profile + product). */
export interface FlippedVisit {
  profileId: string;
  productId: string;
  beforeVisit: VisitRecord;
  afterVisit: VisitRecord;
  /** "improved" = reject->purchase, "regressed" = purchase->reject */
  direction: "improved" | "regressed";
  /** Index of the step where the traces diverge (if determinable). */
  divergenceStep: number | null;
}

/** Per-reason-code delta. */
export interface ClusterDelta {
  reasonCode: string;
  beforeCount: number;
  afterCount: number;
  countDelta: number; // negative = improvement
  beforeRevenueImpact: number; // cents
  afterRevenueImpact: number; // cents
  revenueImpactDelta: number; // negative = revenue recovered
}

/** Full comparison result. */
export interface ComparisonResult {
  beforeRun: RunSummary;
  afterRun: RunSummary;
  conversionRateBefore: number; // 0-1
  conversionRateAfter: number; // 0-1
  conversionRateDeltaPp: number; // percentage points change
  totalRejectionsDelta: number; // negative = fewer rejections
  revenueLostBefore: number; // cents
  revenueLostAfter: number; // cents
  revenueRecovered: number; // cents (positive = improvement)
  clusterDeltas: ClusterDelta[];
  flippedVisits: FlippedVisit[];
  improvedCount: number; // reject -> purchase
  regressedCount: number; // purchase -> reject
}

// ---------------------------------------------------------------------------
// Comparison engine
// ---------------------------------------------------------------------------

export function compareRuns(
  beforeRun: RunSummary,
  afterRun: RunSummary,
  beforeClusters: ClusterSummary[],
  afterClusters: ClusterSummary[],
  beforeVisits: VisitRecord[],
  afterVisits: VisitRecord[]
): ComparisonResult {
  // 1. Aggregate deltas
  const conversionRateBefore = beforeRun.overallConversionRate ?? 0;
  const conversionRateAfter = afterRun.overallConversionRate ?? 0;
  const conversionRateDeltaPp = Math.round(
    (conversionRateAfter - conversionRateBefore) * 10000
  ) / 100; // percentage points

  const totalRejectionsDelta = afterRun.totalRejections - beforeRun.totalRejections;

  const revenueLostBefore = beforeRun.estimatedRevenueLost ?? 0;
  const revenueLostAfter = afterRun.estimatedRevenueLost ?? 0;
  const revenueRecovered = revenueLostBefore - revenueLostAfter; // positive = good

  // 2. Per-cluster deltas
  const clusterDeltas = computeClusterDeltas(beforeClusters, afterClusters);

  // 3. Find flipped visits
  const flippedVisits = findFlippedVisits(beforeVisits, afterVisits);

  const improvedCount = flippedVisits.filter(
    (f) => f.direction === "improved"
  ).length;
  const regressedCount = flippedVisits.filter(
    (f) => f.direction === "regressed"
  ).length;

  return {
    beforeRun,
    afterRun,
    conversionRateBefore,
    conversionRateAfter,
    conversionRateDeltaPp,
    totalRejectionsDelta,
    revenueLostBefore,
    revenueLostAfter,
    revenueRecovered,
    clusterDeltas,
    flippedVisits,
    improvedCount,
    regressedCount,
  };
}

// ---------------------------------------------------------------------------
// Cluster delta computation
// ---------------------------------------------------------------------------

function computeClusterDeltas(
  beforeClusters: ClusterSummary[],
  afterClusters: ClusterSummary[]
): ClusterDelta[] {
  // Build maps by reason code
  const beforeMap = new Map<string, ClusterSummary>();
  for (const c of beforeClusters) {
    beforeMap.set(c.reasonCode, c);
  }

  const afterMap = new Map<string, ClusterSummary>();
  for (const c of afterClusters) {
    afterMap.set(c.reasonCode, c);
  }

  // Collect all reason codes from both runs
  const allCodes = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const deltas: ClusterDelta[] = [];
  for (const code of allCodes) {
    const before = beforeMap.get(code);
    const after = afterMap.get(code);

    deltas.push({
      reasonCode: code,
      beforeCount: before?.count ?? 0,
      afterCount: after?.count ?? 0,
      countDelta: (after?.count ?? 0) - (before?.count ?? 0),
      beforeRevenueImpact: before?.estimatedRevenueImpact ?? 0,
      afterRevenueImpact: after?.estimatedRevenueImpact ?? 0,
      revenueImpactDelta:
        (after?.estimatedRevenueImpact ?? 0) -
        (before?.estimatedRevenueImpact ?? 0),
    });
  }

  // Sort by absolute count delta descending (biggest changes first)
  deltas.sort(
    (a, b) => Math.abs(b.countDelta) - Math.abs(a.countDelta)
  );

  return deltas;
}

// ---------------------------------------------------------------------------
// Find flipped visits
// ---------------------------------------------------------------------------

function findFlippedVisits(
  beforeVisits: VisitRecord[],
  afterVisits: VisitRecord[]
): FlippedVisit[] {
  // Key = profileId + "|" + productId
  // We match visits that share the same profile+product pair
  const beforeByKey = new Map<string, VisitRecord[]>();
  for (const v of beforeVisits) {
    const key = `${v.buyerProfileId}|${v.productId}`;
    const list = beforeByKey.get(key) ?? [];
    list.push(v);
    beforeByKey.set(key, list);
  }

  const afterByKey = new Map<string, VisitRecord[]>();
  for (const v of afterVisits) {
    const key = `${v.buyerProfileId}|${v.productId}`;
    const list = afterByKey.get(key) ?? [];
    list.push(v);
    afterByKey.set(key, list);
  }

  const flipped: FlippedVisit[] = [];

  // For each key that exists in both runs, check for outcome flips.
  // We match one-to-one: first before visit with first after visit per key.
  for (const [key, beforeList] of beforeByKey) {
    const afterList = afterByKey.get(key);
    if (!afterList) continue;

    const matchCount = Math.min(beforeList.length, afterList.length);
    for (let i = 0; i < matchCount; i++) {
      const bv = beforeList[i];
      const av = afterList[i];

      if (bv.outcome !== av.outcome) {
        const direction =
          bv.outcome === "reject" && av.outcome === "purchase"
            ? "improved"
            : "regressed";

        const divergenceStep = findDivergenceStep(
          bv.reasoningTrace,
          av.reasoningTrace
        );

        flipped.push({
          profileId: bv.buyerProfileId,
          productId: bv.productId,
          beforeVisit: bv,
          afterVisit: av,
          direction,
          divergenceStep,
        });
      }
    }
  }

  // Sort: improved first, then regressed
  flipped.sort((a, b) => {
    if (a.direction === b.direction) return 0;
    return a.direction === "improved" ? -1 : 1;
  });

  return flipped;
}

// ---------------------------------------------------------------------------
// Divergence point detection
// ---------------------------------------------------------------------------

/**
 * Find the step number where two traces diverge in outcome.
 * Returns null if traces are missing or can't be compared.
 */
function findDivergenceStep(
  beforeTrace: ReasoningStep[] | null,
  afterTrace: ReasoningStep[] | null
): number | null {
  if (!beforeTrace?.length || !afterTrace?.length) return null;

  const minLen = Math.min(beforeTrace.length, afterTrace.length);

  for (let i = 0; i < minLen; i++) {
    // Look for the step where outcomes diverge
    if (beforeTrace[i].outcome !== afterTrace[i].outcome) {
      return i;
    }
  }

  // If one trace is longer, the divergence is at the end of the shorter one
  if (beforeTrace.length !== afterTrace.length) {
    return minLen;
  }

  return null;
}
