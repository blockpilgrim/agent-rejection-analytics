import { eq, desc, inArray } from "drizzle-orm";
import { getDb } from "./index";
import {
  storefronts,
  products,
  buyerProfiles,
  simulationRuns,
  agentVisits,
  rejectionClusters,
  storefrontActions,
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

// ---------------------------------------------------------------------------
// Simulation Run Queries
// ---------------------------------------------------------------------------

export function getSimulationRun(id: string) {
  return getDb()
    .select()
    .from(simulationRuns)
    .where(eq(simulationRuns.id, id))
    .get();
}

export function getLatestCompletedSimulationRun() {
  return getDb()
    .select()
    .from(simulationRuns)
    .where(eq(simulationRuns.status, "completed"))
    .orderBy(desc(simulationRuns.createdAt))
    .limit(1)
    .get();
}

// ---------------------------------------------------------------------------
// Rejection Clusters
// ---------------------------------------------------------------------------

export function getRejectionClustersByRun(simulationRunId: string) {
  return getDb()
    .select()
    .from(rejectionClusters)
    .where(eq(rejectionClusters.simulationRunId, simulationRunId))
    .orderBy(rejectionClusters.rank)
    .all();
}

// ---------------------------------------------------------------------------
// Agent Visits — additional queries
// ---------------------------------------------------------------------------

export function getAgentVisitsByRunAndReasonCode(
  simulationRunId: string,
  reasonCode: string
) {
  return getDb()
    .select()
    .from(agentVisits)
    .where(eq(agentVisits.simulationRunId, simulationRunId))
    .all()
    .filter((v) => v.reasonCode === reasonCode);
}

export function getAgentVisitsByRun(simulationRunId: string) {
  return getDb()
    .select()
    .from(agentVisits)
    .where(eq(agentVisits.simulationRunId, simulationRunId))
    .all();
}

export function getProduct(id: string) {
  return getDb().select().from(products).where(eq(products.id, id)).get();
}

export function getBuyerProfile(id: string) {
  return getDb()
    .select()
    .from(buyerProfiles)
    .where(eq(buyerProfiles.id, id))
    .get();
}

// ---------------------------------------------------------------------------
// Storefront Mutations
// ---------------------------------------------------------------------------

export function updateStorefrontPolicies(
  id: string,
  updates: {
    shippingPolicies?: Record<string, string | undefined>;
    returnPolicy?: {
      windowDays?: number;
      free?: boolean;
      structured?: boolean;
      rawText?: string;
    };
    sustainabilityClaims?: {
      certified?: boolean;
      claims?: string[];
    };
  }
) {
  const data: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (updates.shippingPolicies !== undefined) {
    data.shippingPolicies = updates.shippingPolicies;
  }
  if (updates.returnPolicy !== undefined) {
    data.returnPolicy = updates.returnPolicy;
  }
  if (updates.sustainabilityClaims !== undefined) {
    data.sustainabilityClaims = updates.sustainabilityClaims;
  }
  return getDb()
    .update(storefronts)
    .set(data)
    .where(eq(storefronts.id, id))
    .run();
}

export function updateProduct(
  id: string,
  updates: {
    price?: number;
    description?: string;
    structuredSpecs?: Record<string, string | number | boolean | null>;
    stockStatus?: "in_stock" | "out_of_stock" | "limited";
    dataCompletenessScore?: number;
  }
) {
  return getDb()
    .update(products)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id))
    .run();
}

export function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return getDb()
    .select()
    .from(products)
    .where(inArray(products.id, ids))
    .all();
}

// ---------------------------------------------------------------------------
// Storefront Actions
// ---------------------------------------------------------------------------

export function createStorefrontAction(data: {
  id: string;
  simulationRunId: string;
  recommendationSource: string;
  actionType: string;
  changePreview: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  applied: boolean;
  appliedAt: string | null;
}) {
  return getDb()
    .insert(storefrontActions)
    .values({
      id: data.id,
      simulationRunId: data.simulationRunId,
      recommendationSource: data.recommendationSource,
      actionType: data.actionType,
      changePreview: data.changePreview,
      applied: data.applied,
      appliedAt: data.appliedAt,
    })
    .run();
}

export function getStorefrontActionsByRun(simulationRunId: string) {
  return getDb()
    .select()
    .from(storefrontActions)
    .where(eq(storefrontActions.simulationRunId, simulationRunId))
    .all();
}

export function getStorefrontAction(id: string) {
  return getDb()
    .select()
    .from(storefrontActions)
    .where(eq(storefrontActions.id, id))
    .get();
}

export function updateStorefrontAction(
  id: string,
  updates: {
    applied?: boolean;
    appliedAt?: string | null;
    reverted?: boolean;
  }
) {
  return getDb()
    .update(storefrontActions)
    .set(updates)
    .where(eq(storefrontActions.id, id))
    .run();
}

export function getRejectionCluster(id: string) {
  return getDb()
    .select()
    .from(rejectionClusters)
    .where(eq(rejectionClusters.id, id))
    .get();
}
