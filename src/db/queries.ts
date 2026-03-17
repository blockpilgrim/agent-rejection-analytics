import { eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  storefronts,
  products,
  buyerProfiles,
  simulationRuns,
  agentVisits,
} from "./schema";

export function getStorefront(id: string) {
  return getDb().select().from(storefronts).where(eq(storefronts.id, id)).get();
}

export function getProductsByStorefront(storefrontId: string) {
  return getDb()
    .select()
    .from(products)
    .where(eq(products.storefrontId, storefrontId))
    .all();
}

export function getAllBuyerProfiles() {
  return getDb().select().from(buyerProfiles).all();
}

// ---------------------------------------------------------------------------
// Simulation Runs
// ---------------------------------------------------------------------------

export function createSimulationRun(data: {
  id: string;
  storefrontId: string;
  storefrontSnapshot?: unknown;
  totalVisits: number;
  profileWeights?: Record<string, number>;
  status: "pending" | "running" | "completed" | "failed";
}) {
  return getDb()
    .insert(simulationRuns)
    .values({
      id: data.id,
      storefrontId: data.storefrontId,
      storefrontSnapshot: data.storefrontSnapshot as null,
      totalVisits: data.totalVisits,
      profileWeights: data.profileWeights,
      status: data.status,
    })
    .run();
}

export function updateSimulationRunStatus(
  id: string,
  status: "pending" | "running" | "completed" | "failed"
) {
  return getDb()
    .update(simulationRuns)
    .set({ status })
    .where(eq(simulationRuns.id, id))
    .run();
}

export function updateSimulationRunTotals(
  id: string,
  totals: {
    totalPurchases: number;
    totalRejections: number;
    overallConversionRate: number;
    estimatedRevenueLost: number;
    status: "completed" | "failed";
  }
) {
  return getDb()
    .update(simulationRuns)
    .set(totals)
    .where(eq(simulationRuns.id, id))
    .run();
}

// ---------------------------------------------------------------------------
// Agent Visits
// ---------------------------------------------------------------------------

export function insertAgentVisit(data: {
  id: string;
  simulationRunId: string;
  buyerProfileId: string;
  productId: string;
  mandate: string | null;
  outcome: "purchase" | "reject";
  reasonCode: string | null;
  reasonSummary: string | null;
  reasoningTrace: Array<{
    step: number;
    action: string;
    dataEvaluated: string;
    outcome: string;
  }> | null;
  productPrice: number | null;
  sequenceNumber: number | null;
}) {
  return getDb()
    .insert(agentVisits)
    .values({
      id: data.id,
      simulationRunId: data.simulationRunId,
      buyerProfileId: data.buyerProfileId,
      productId: data.productId,
      mandate: data.mandate,
      outcome: data.outcome,
      reasonCode: data.reasonCode as null,
      reasonSummary: data.reasonSummary,
      reasoningTrace: data.reasoningTrace,
      productPrice: data.productPrice,
      sequenceNumber: data.sequenceNumber,
    })
    .run();
}
