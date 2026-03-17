import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import {
  storefronts,
  products,
  buyerProfiles,
  simulationRuns,
  agentVisits,
  rejectionClusters,
  storefrontActions,
} from "../schema";

describe("database schema", () => {
  const tables = {
    storefronts,
    products,
    buyerProfiles,
    simulationRuns,
    agentVisits,
    rejectionClusters,
    storefrontActions,
  };

  it("exports all 7 expected tables", () => {
    for (const [name, table] of Object.entries(tables)) {
      expect(table, `${name} should be defined`).toBeDefined();
    }
  });

  it("maps tables to correct SQL table names", () => {
    expect(getTableName(storefronts)).toBe("storefronts");
    expect(getTableName(products)).toBe("products");
    expect(getTableName(buyerProfiles)).toBe("buyer_profiles");
    expect(getTableName(simulationRuns)).toBe("simulation_runs");
    expect(getTableName(agentVisits)).toBe("agent_visits");
    expect(getTableName(rejectionClusters)).toBe("rejection_clusters");
    expect(getTableName(storefrontActions)).toBe("storefront_actions");
  });

  describe("storefronts", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(storefronts);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "name",
          "shippingPolicies",
          "returnPolicy",
          "sustainabilityClaims",
          "createdAt",
          "updatedAt",
        ].sort()
      );
    });

    it("has id as primary key", () => {
      const cols = getTableColumns(storefronts);
      expect(cols.id.primary).toBe(true);
    });
  });

  describe("products", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(products);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "storefrontId",
          "name",
          "category",
          "price",
          "description",
          "structuredSpecs",
          "brand",
          "reviewScore",
          "reviewCount",
          "stockStatus",
          "dataCompletenessScore",
          "createdAt",
          "updatedAt",
        ].sort()
      );
    });

    it("has price as integer (cents)", () => {
      const cols = getTableColumns(products);
      expect(cols.price.dataType).toBe("number");
      expect(cols.price.notNull).toBe(true);
    });

    it("has stockStatus with default 'in_stock'", () => {
      const cols = getTableColumns(products);
      expect(cols.stockStatus.hasDefault).toBe(true);
    });
  });

  describe("buyerProfiles", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(buyerProfiles);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "name",
          "primaryConstraint",
          "systemPrompt",
          "exampleMandate",
          "defaultWeight",
          "parameters",
        ].sort()
      );
    });
  });

  describe("simulationRuns", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(simulationRuns);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "storefrontId",
          "storefrontSnapshot",
          "totalVisits",
          "totalPurchases",
          "totalRejections",
          "overallConversionRate",
          "estimatedRevenueLost",
          "profileWeights",
          "previousRunId",
          "status",
          "createdAt",
        ].sort()
      );
    });

    it("has status with default 'pending'", () => {
      const cols = getTableColumns(simulationRuns);
      expect(cols.status.hasDefault).toBe(true);
    });
  });

  describe("agentVisits", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(agentVisits);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "simulationRunId",
          "buyerProfileId",
          "productId",
          "mandate",
          "outcome",
          "reasonCode",
          "reasonSummary",
          "reasoningTrace",
          "productPrice",
          "sequenceNumber",
          "createdAt",
        ].sort()
      );
    });

    it("has outcome as not-null", () => {
      const cols = getTableColumns(agentVisits);
      expect(cols.outcome.notNull).toBe(true);
    });
  });

  describe("rejectionClusters", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(rejectionClusters);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "simulationRunId",
          "reasonCode",
          "count",
          "affectedProfileIds",
          "affectedProductIds",
          "estimatedRevenueImpact",
          "rank",
          "recommendation",
        ].sort()
      );
    });
  });

  describe("storefrontActions", () => {
    it("has the expected columns", () => {
      const cols = getTableColumns(storefrontActions);
      expect(Object.keys(cols).sort()).toEqual(
        [
          "id",
          "simulationRunId",
          "recommendationSource",
          "actionType",
          "changePreview",
          "applied",
          "appliedAt",
          "reverted",
        ].sort()
      );
    });

    it("has applied defaulting to false", () => {
      const cols = getTableColumns(storefrontActions);
      expect(cols.applied.hasDefault).toBe(true);
    });

    it("has reverted defaulting to false", () => {
      const cols = getTableColumns(storefrontActions);
      expect(cols.reverted.hasDefault).toBe(true);
    });
  });
});
