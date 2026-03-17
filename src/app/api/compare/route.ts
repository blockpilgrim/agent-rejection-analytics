import { NextRequest, NextResponse } from "next/server";
import {
  getSimulationRun,
  getRejectionClustersByRun,
  getAgentVisitsByRun,
} from "@/db/queries";
import {
  compareRuns,
  type RunSummary,
  type ClusterSummary,
  type VisitRecord,
} from "@/lib/simulation/comparator";

// ---------------------------------------------------------------------------
// GET /api/compare?runId=xxx — compare a run against its previous run
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json(
      { error: "runId query parameter is required" },
      { status: 400 }
    );
  }

  const currentRun = getSimulationRun(runId);
  if (!currentRun) {
    return NextResponse.json(
      { error: `Simulation run ${runId} not found` },
      { status: 404 }
    );
  }

  if (!currentRun.previousRunId) {
    return NextResponse.json(
      { error: "No previous run to compare against", hasPrevious: false },
      { status: 404 }
    );
  }

  const previousRun = getSimulationRun(currentRun.previousRunId);
  if (!previousRun) {
    return NextResponse.json(
      { error: `Previous run ${currentRun.previousRunId} not found`, hasPrevious: false },
      { status: 404 }
    );
  }

  // Load data for both runs
  const currentClusters = getRejectionClustersByRun(runId);
  const previousClusters = getRejectionClustersByRun(previousRun.id);
  const currentVisits = getAgentVisitsByRun(runId);
  const previousVisits = getAgentVisitsByRun(previousRun.id);

  // Map to comparator types
  const beforeRunSummary: RunSummary = {
    id: previousRun.id,
    totalVisits: previousRun.totalVisits,
    totalPurchases: previousRun.totalPurchases,
    totalRejections: previousRun.totalRejections,
    overallConversionRate: previousRun.overallConversionRate,
    estimatedRevenueLost: previousRun.estimatedRevenueLost,
  };

  const afterRunSummary: RunSummary = {
    id: currentRun.id,
    totalVisits: currentRun.totalVisits,
    totalPurchases: currentRun.totalPurchases,
    totalRejections: currentRun.totalRejections,
    overallConversionRate: currentRun.overallConversionRate,
    estimatedRevenueLost: currentRun.estimatedRevenueLost,
  };

  const beforeClusterSummaries: ClusterSummary[] = previousClusters.map((c) => ({
    reasonCode: c.reasonCode,
    count: c.count,
    estimatedRevenueImpact: c.estimatedRevenueImpact ?? 0,
  }));

  const afterClusterSummaries: ClusterSummary[] = currentClusters.map((c) => ({
    reasonCode: c.reasonCode,
    count: c.count,
    estimatedRevenueImpact: c.estimatedRevenueImpact ?? 0,
  }));

  const beforeVisitRecords: VisitRecord[] = previousVisits.map((v) => ({
    id: v.id,
    buyerProfileId: v.buyerProfileId,
    productId: v.productId,
    outcome: v.outcome,
    reasonCode: v.reasonCode,
    reasonSummary: v.reasonSummary,
    reasoningTrace: v.reasoningTrace ?? null,
    productPrice: v.productPrice,
    mandate: v.mandate,
  }));

  const afterVisitRecords: VisitRecord[] = currentVisits.map((v) => ({
    id: v.id,
    buyerProfileId: v.buyerProfileId,
    productId: v.productId,
    outcome: v.outcome,
    reasonCode: v.reasonCode,
    reasonSummary: v.reasonSummary,
    reasoningTrace: v.reasoningTrace ?? null,
    productPrice: v.productPrice,
    mandate: v.mandate,
  }));

  const comparison = compareRuns(
    beforeRunSummary,
    afterRunSummary,
    beforeClusterSummaries,
    afterClusterSummaries,
    beforeVisitRecords,
    afterVisitRecords
  );

  return NextResponse.json({
    comparison,
    hasPrevious: true,
    previousRunId: previousRun.id,
  });
}
