import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { agentVisits, rejectionClusters, simulationRuns } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterResult {
  id: string;
  simulationRunId: string;
  reasonCode: string;
  rejectionCount: number;
  estimatedRevenueImpact: number; // cents
  affectedProfileIds: string[];
  affectedProductIds: string[];
  rank: number;
  recommendation: {
    action: string;
    description: string;
    estimatedRecovery: number; // cents
  };
}

export interface AggregationResult {
  clusters: ClusterResult[];
  totalPurchases: number;
  totalRejections: number;
  overallConversionRate: number;
  estimatedRevenueLost: number; // cents
}

// ---------------------------------------------------------------------------
// Recommendation templates by reason code
// ---------------------------------------------------------------------------

const RECOMMENDATIONS: Record<string, { action: string; description: string }> = {
  SHIPPING_SLA_UNMET: {
    action: "Add expedited shipping",
    description: "Offer a 2-day or next-day shipping option so speed-focused agents can complete purchases.",
  },
  PRICE_ABOVE_BUDGET: {
    action: "Review pricing strategy",
    description: "Consider adding lower-tier product options or promotional pricing to capture budget-conscious agents.",
  },
  MISSING_STRUCTURED_DATA: {
    action: "Add structured product specs",
    description: "Populate machine-readable spec fields (wattage, dimensions, materials) so comparison agents can evaluate products.",
  },
  INSUFFICIENT_DESCRIPTION: {
    action: "Expand product descriptions",
    description: "Add detailed feature descriptions and use-case information to help agents assess product suitability.",
  },
  RETURN_POLICY_UNACCEPTABLE: {
    action: "Improve return policy",
    description: "Offer a clear, machine-readable return policy with at least 30-day free returns.",
  },
  SUSTAINABILITY_UNVERIFIED: {
    action: "Add sustainability certifications",
    description: "Obtain and display verified sustainability certifications (Fair Trade, Energy Star, etc.).",
  },
  BRAND_MISMATCH: {
    action: "Expand brand selection",
    description: "Stock products from in-demand brands that brand-loyal agents are searching for.",
  },
  REVIEW_SCORE_BELOW_THRESHOLD: {
    action: "Improve product ratings",
    description: "Encourage customer reviews and address common complaints to raise review scores above agent thresholds.",
  },
  STOCK_UNAVAILABLE: {
    action: "Improve inventory management",
    description: "Keep popular items in stock and update availability status in real-time for agent queries.",
  },
  API_FIELD_MISSING: {
    action: "Complete data feed fields",
    description: "Ensure all fields expected by shopping agents are present in your product data feed.",
  },
};

// ---------------------------------------------------------------------------
// Aggregation engine
// ---------------------------------------------------------------------------

/**
 * Aggregate all agent visits for a simulation run into rejection clusters,
 * compute summary stats, and persist everything to the database.
 *
 * Returns the aggregated results for immediate use by the caller.
 */
export function aggregateSimulationResults(simulationRunId: string): AggregationResult {
  const db = getDb();

  // 1. Fetch all visits for this simulation run
  const visits = db
    .select()
    .from(agentVisits)
    .where(eq(agentVisits.simulationRunId, simulationRunId))
    .all();

  if (visits.length === 0) {
    return {
      clusters: [],
      totalPurchases: 0,
      totalRejections: 0,
      overallConversionRate: 0,
      estimatedRevenueLost: 0,
    };
  }

  // 2. Separate purchases and rejections
  const purchases = visits.filter((v) => v.outcome === "purchase");
  const rejections = visits.filter((v) => v.outcome === "reject");

  // 3. Group rejections by reason_code
  const clusterMap = new Map<
    string,
    {
      reasonCode: string;
      count: number;
      profileIds: Set<string>;
      productIds: Set<string>;
      productPrices: number[]; // for avg calculation
    }
  >();

  for (const visit of rejections) {
    const code = visit.reasonCode ?? "UNKNOWN";
    let cluster = clusterMap.get(code);
    if (!cluster) {
      cluster = {
        reasonCode: code,
        count: 0,
        profileIds: new Set(),
        productIds: new Set(),
        productPrices: [],
      };
      clusterMap.set(code, cluster);
    }
    cluster.count++;
    cluster.profileIds.add(visit.buyerProfileId);
    cluster.productIds.add(visit.productId);
    if (visit.productPrice != null) {
      cluster.productPrices.push(visit.productPrice);
    }
  }

  // 4. Compute revenue impact per cluster and build results
  // Revenue impact = rejection count * average price of affected products
  const clusterResults: ClusterResult[] = [];

  for (const [, cluster] of clusterMap) {
    const avgPrice =
      cluster.productPrices.length > 0
        ? Math.round(
            cluster.productPrices.reduce((sum, p) => sum + p, 0) /
              cluster.productPrices.length
          )
        : 0;
    const revenueImpact = cluster.count * avgPrice;

    const rec = RECOMMENDATIONS[cluster.reasonCode] ?? {
      action: "Investigate rejection reason",
      description: "Review the rejection details and address the underlying issue.",
    };

    clusterResults.push({
      id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      simulationRunId,
      reasonCode: cluster.reasonCode,
      rejectionCount: cluster.count,
      estimatedRevenueImpact: revenueImpact,
      affectedProfileIds: [...cluster.profileIds],
      affectedProductIds: [...cluster.productIds],
      rank: 0, // assigned below
      recommendation: {
        ...rec,
        estimatedRecovery: Math.round(revenueImpact * 0.6), // estimate 60% recovery
      },
    });
  }

  // 5. Rank by estimated revenue impact descending
  clusterResults.sort((a, b) => b.estimatedRevenueImpact - a.estimatedRevenueImpact);
  for (let i = 0; i < clusterResults.length; i++) {
    clusterResults[i].rank = i + 1;
  }

  // 6. Compute summary stats
  const totalPurchases = purchases.length;
  const totalRejections = rejections.length;
  const totalCompleted = totalPurchases + totalRejections;
  const overallConversionRate =
    totalCompleted > 0
      ? Math.round((totalPurchases / totalCompleted) * 10000) / 10000
      : 0;
  const estimatedRevenueLost = clusterResults.reduce(
    (sum, c) => sum + c.estimatedRevenueImpact,
    0
  );

  // 7. Persist clusters to database
  // First, delete any existing clusters for this run (idempotent)
  db.delete(rejectionClusters)
    .where(eq(rejectionClusters.simulationRunId, simulationRunId))
    .run();

  for (const cluster of clusterResults) {
    db.insert(rejectionClusters)
      .values({
        id: cluster.id,
        simulationRunId: cluster.simulationRunId,
        reasonCode: cluster.reasonCode,
        count: cluster.rejectionCount,
        affectedProfileIds: cluster.affectedProfileIds,
        affectedProductIds: cluster.affectedProductIds,
        estimatedRevenueImpact: cluster.estimatedRevenueImpact,
        rank: cluster.rank,
        recommendation: cluster.recommendation,
      })
      .run();
  }

  // 8. Update simulation run with summary stats
  db.update(simulationRuns)
    .set({
      totalPurchases,
      totalRejections,
      overallConversionRate,
      estimatedRevenueLost,
    })
    .where(eq(simulationRuns.id, simulationRunId))
    .run();

  return {
    clusters: clusterResults,
    totalPurchases,
    totalRejections,
    overallConversionRate,
    estimatedRevenueLost,
  };
}
