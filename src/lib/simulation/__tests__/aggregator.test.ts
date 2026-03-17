import { describe, it, expect } from "vitest";

// =============================================================================
// Aggregation logic tests
//
// The aggregator's core logic (clustering, revenue calculation, ranking) is
// tested here without DB dependency by re-implementing the pure computation.
// Same pattern as simulation.test.ts — test the algorithm, not the I/O.
// =============================================================================

interface MockVisit {
  id: string;
  outcome: "purchase" | "reject";
  reasonCode: string | null;
  buyerProfileId: string;
  productId: string;
  productPrice: number; // cents
}

interface ClusterResult {
  reasonCode: string;
  rejectionCount: number;
  estimatedRevenueImpact: number; // cents
  affectedProfileIds: string[];
  affectedProductIds: string[];
  rank: number;
}

/**
 * Mirrors the core aggregation logic from aggregator.ts:
 * - Group rejections by reasonCode
 * - Compute revenue impact = count * avg price
 * - Rank by revenue impact descending
 */
function aggregateVisits(visits: MockVisit[]): {
  clusters: ClusterResult[];
  totalPurchases: number;
  totalRejections: number;
  overallConversionRate: number;
  estimatedRevenueLost: number;
} {
  const purchases = visits.filter((v) => v.outcome === "purchase");
  const rejections = visits.filter((v) => v.outcome === "reject");

  const clusterMap = new Map<
    string,
    {
      reasonCode: string;
      count: number;
      profileIds: Set<string>;
      productIds: Set<string>;
      productPrices: number[];
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
    cluster.productPrices.push(visit.productPrice);
  }

  const clusters: ClusterResult[] = [];
  for (const [, cluster] of clusterMap) {
    const avgPrice =
      cluster.productPrices.length > 0
        ? Math.round(
            cluster.productPrices.reduce((sum, p) => sum + p, 0) /
              cluster.productPrices.length
          )
        : 0;
    const revenueImpact = cluster.count * avgPrice;

    clusters.push({
      reasonCode: cluster.reasonCode,
      rejectionCount: cluster.count,
      estimatedRevenueImpact: revenueImpact,
      affectedProfileIds: [...cluster.profileIds],
      affectedProductIds: [...cluster.productIds],
      rank: 0,
    });
  }

  // Sort by revenue impact desc, assign ranks
  clusters.sort((a, b) => b.estimatedRevenueImpact - a.estimatedRevenueImpact);
  for (let i = 0; i < clusters.length; i++) {
    clusters[i].rank = i + 1;
  }

  const totalPurchases = purchases.length;
  const totalRejections = rejections.length;
  const totalCompleted = totalPurchases + totalRejections;
  const overallConversionRate =
    totalCompleted > 0
      ? Math.round((totalPurchases / totalCompleted) * 10000) / 10000
      : 0;
  const estimatedRevenueLost = clusters.reduce(
    (sum, c) => sum + c.estimatedRevenueImpact,
    0
  );

  return {
    clusters,
    totalPurchases,
    totalRejections,
    overallConversionRate,
    estimatedRevenueLost,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("aggregation: clustering", () => {
  it("groups rejections by reason code", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_001", productId: "p_001", productPrice: 30000 },
      { id: "2", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_002", productId: "p_002", productPrice: 50000 },
      { id: "3", outcome: "reject", reasonCode: "MISSING_STRUCTURED_DATA", buyerProfileId: "bp_003", productId: "p_001", productPrice: 30000 },
      { id: "4", outcome: "purchase", reasonCode: null, buyerProfileId: "bp_001", productId: "p_003", productPrice: 20000 },
    ];

    const result = aggregateVisits(visits);

    expect(result.clusters).toHaveLength(2);
    expect(result.totalPurchases).toBe(1);
    expect(result.totalRejections).toBe(3);
  });

  it("collects unique affected profile and product IDs per cluster", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_001", productId: "p_001", productPrice: 30000 },
      { id: "2", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_001", productId: "p_001", productPrice: 30000 },
      { id: "3", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_002", productId: "p_002", productPrice: 50000 },
    ];

    const result = aggregateVisits(visits);
    const cluster = result.clusters[0];

    // 2 unique profiles, 2 unique products (despite 3 visits)
    expect(cluster.affectedProfileIds).toHaveLength(2);
    expect(cluster.affectedProfileIds).toContain("bp_001");
    expect(cluster.affectedProfileIds).toContain("bp_002");
    expect(cluster.affectedProductIds).toHaveLength(2);
    expect(cluster.affectedProductIds).toContain("p_001");
    expect(cluster.affectedProductIds).toContain("p_002");
  });

  it("handles visits with null reason code as UNKNOWN", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: null, buyerProfileId: "bp_001", productId: "p_001", productPrice: 10000 },
    ];

    const result = aggregateVisits(visits);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].reasonCode).toBe("UNKNOWN");
  });
});

describe("aggregation: revenue calculation", () => {
  it("calculates revenue impact as rejection count times average price", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_001", productId: "p_001", productPrice: 20000 },
      { id: "2", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_002", productId: "p_002", productPrice: 40000 },
    ];

    const result = aggregateVisits(visits);
    const cluster = result.clusters[0];

    // avg price = (20000 + 40000) / 2 = 30000
    // revenue impact = 2 * 30000 = 60000
    expect(cluster.estimatedRevenueImpact).toBe(60000);
  });

  it("handles single rejection correctly", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: "STOCK_UNAVAILABLE", buyerProfileId: "bp_001", productId: "p_001", productPrice: 47900 },
    ];

    const result = aggregateVisits(visits);
    const cluster = result.clusters[0];

    // 1 rejection * 47900 avg = 47900
    expect(cluster.estimatedRevenueImpact).toBe(47900);
  });

  it("sums revenue lost across all clusters", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_001", productId: "p_001", productPrice: 30000 },
      { id: "2", outcome: "reject", reasonCode: "MISSING_STRUCTURED_DATA", buyerProfileId: "bp_003", productId: "p_002", productPrice: 20000 },
    ];

    const result = aggregateVisits(visits);
    // Cluster 1: 1 * 30000 = 30000
    // Cluster 2: 1 * 20000 = 20000
    // Total: 50000
    expect(result.estimatedRevenueLost).toBe(50000);
  });
});

describe("aggregation: ranking", () => {
  it("ranks clusters by revenue impact descending", () => {
    const visits: MockVisit[] = [
      // Low-value cluster: 1 rejection at $100
      { id: "1", outcome: "reject", reasonCode: "STOCK_UNAVAILABLE", buyerProfileId: "bp_001", productId: "p_001", productPrice: 10000 },
      // High-value cluster: 3 rejections at $500 avg
      { id: "2", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_001", productId: "p_002", productPrice: 50000 },
      { id: "3", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_002", productId: "p_003", productPrice: 50000 },
      { id: "4", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_003", productId: "p_004", productPrice: 50000 },
      // Medium cluster: 2 rejections at $200 avg
      { id: "5", outcome: "reject", reasonCode: "MISSING_STRUCTURED_DATA", buyerProfileId: "bp_001", productId: "p_001", productPrice: 20000 },
      { id: "6", outcome: "reject", reasonCode: "MISSING_STRUCTURED_DATA", buyerProfileId: "bp_002", productId: "p_002", productPrice: 20000 },
    ];

    const result = aggregateVisits(visits);

    expect(result.clusters[0].reasonCode).toBe("PRICE_ABOVE_BUDGET");
    expect(result.clusters[0].rank).toBe(1);
    expect(result.clusters[0].estimatedRevenueImpact).toBe(150000); // 3 * 50000

    expect(result.clusters[1].reasonCode).toBe("MISSING_STRUCTURED_DATA");
    expect(result.clusters[1].rank).toBe(2);
    expect(result.clusters[1].estimatedRevenueImpact).toBe(40000); // 2 * 20000

    expect(result.clusters[2].reasonCode).toBe("STOCK_UNAVAILABLE");
    expect(result.clusters[2].rank).toBe(3);
    expect(result.clusters[2].estimatedRevenueImpact).toBe(10000); // 1 * 10000
  });
});

describe("aggregation: conversion rate", () => {
  it("calculates conversion rate correctly", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "purchase", reasonCode: null, buyerProfileId: "bp_001", productId: "p_001", productPrice: 20000 },
      { id: "2", outcome: "purchase", reasonCode: null, buyerProfileId: "bp_002", productId: "p_002", productPrice: 30000 },
      { id: "3", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_003", productId: "p_003", productPrice: 50000 },
    ];

    const result = aggregateVisits(visits);

    // 2 purchases / 3 total = 0.6667
    expect(result.overallConversionRate).toBe(0.6667);
  });

  it("returns 0 conversion rate for empty visits", () => {
    const result = aggregateVisits([]);
    expect(result.overallConversionRate).toBe(0);
    expect(result.clusters).toHaveLength(0);
  });

  it("returns 1.0 conversion rate when all visits are purchases", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "purchase", reasonCode: null, buyerProfileId: "bp_001", productId: "p_001", productPrice: 20000 },
      { id: "2", outcome: "purchase", reasonCode: null, buyerProfileId: "bp_002", productId: "p_002", productPrice: 30000 },
    ];

    const result = aggregateVisits(visits);
    expect(result.overallConversionRate).toBe(1.0);
    expect(result.clusters).toHaveLength(0);
    expect(result.estimatedRevenueLost).toBe(0);
  });

  it("returns 0 conversion rate when all visits are rejections", () => {
    const visits: MockVisit[] = [
      { id: "1", outcome: "reject", reasonCode: "STOCK_UNAVAILABLE", buyerProfileId: "bp_001", productId: "p_001", productPrice: 20000 },
      { id: "2", outcome: "reject", reasonCode: "PRICE_ABOVE_BUDGET", buyerProfileId: "bp_002", productId: "p_002", productPrice: 50000 },
    ];

    const result = aggregateVisits(visits);
    expect(result.overallConversionRate).toBe(0);
    expect(result.totalRejections).toBe(2);
  });
});

describe("aggregation: edge cases", () => {
  it("handles a large number of rejections across many reason codes", () => {
    const codes = [
      "SHIPPING_SLA_UNMET",
      "PRICE_ABOVE_BUDGET",
      "MISSING_STRUCTURED_DATA",
      "INSUFFICIENT_DESCRIPTION",
      "RETURN_POLICY_UNACCEPTABLE",
      "SUSTAINABILITY_UNVERIFIED",
      "BRAND_MISMATCH",
      "REVIEW_SCORE_BELOW_THRESHOLD",
      "STOCK_UNAVAILABLE",
      "API_FIELD_MISSING",
    ];

    const visits: MockVisit[] = codes.map((code, i) => ({
      id: `v_${i}`,
      outcome: "reject" as const,
      reasonCode: code,
      buyerProfileId: `bp_00${(i % 6) + 1}`,
      productId: `p_00${(i % 5) + 1}`,
      productPrice: (i + 1) * 10000,
    }));

    const result = aggregateVisits(visits);

    // All 10 reason codes should create 10 clusters
    expect(result.clusters).toHaveLength(10);

    // Ranks should be 1-10
    const ranks = result.clusters.map((c) => c.rank);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Revenue impact should be strictly descending
    for (let i = 0; i < result.clusters.length - 1; i++) {
      expect(result.clusters[i].estimatedRevenueImpact).toBeGreaterThanOrEqual(
        result.clusters[i + 1].estimatedRevenueImpact
      );
    }
  });
});
