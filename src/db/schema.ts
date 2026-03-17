import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// --- Storefronts ---

export const storefronts = sqliteTable("storefronts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shippingPolicies: text("shipping_policies", { mode: "json" }).$type<{
    standard?: string;
    expedited?: string;
    [key: string]: string | undefined;
  }>(),
  returnPolicy: text("return_policy", { mode: "json" }).$type<{
    windowDays?: number;
    free?: boolean;
    structured?: boolean;
    rawText?: string;
  }>(),
  sustainabilityClaims: text("sustainability_claims", {
    mode: "json",
  }).$type<{
    certified?: boolean;
    claims?: string[];
  }>(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// --- Products ---

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  storefrontId: text("storefront_id")
    .notNull()
    .references(() => storefronts.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(), // in cents
  description: text("description"),
  structuredSpecs: text("structured_specs", { mode: "json" }).$type<
    Record<string, string | number | boolean | null>
  >(),
  brand: text("brand"),
  reviewScore: real("review_score"),
  reviewCount: integer("review_count"),
  stockStatus: text("stock_status", {
    enum: ["in_stock", "out_of_stock", "limited"],
  })
    .notNull()
    .default("in_stock"),
  dataCompletenessScore: real("data_completeness_score"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// --- Buyer Profiles ---

export const buyerProfiles = sqliteTable("buyer_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  primaryConstraint: text("primary_constraint").notNull(),
  systemPrompt: text("system_prompt"),
  exampleMandate: text("example_mandate"),
  defaultWeight: real("default_weight").notNull().default(1.0),
  parameters: text("parameters", { mode: "json" }).$type<
    Record<string, string | number | boolean | string[] | null>
  >(),
});

// --- Simulation Runs ---

export const simulationRuns = sqliteTable("simulation_runs", {
  id: text("id").primaryKey(),
  storefrontId: text("storefront_id")
    .notNull()
    .references(() => storefronts.id),
  storefrontSnapshot: text("storefront_snapshot", { mode: "json" }),
  totalVisits: integer("total_visits").notNull().default(0),
  totalPurchases: integer("total_purchases").notNull().default(0),
  totalRejections: integer("total_rejections").notNull().default(0),
  overallConversionRate: real("overall_conversion_rate"),
  estimatedRevenueLost: integer("estimated_revenue_lost"), // in cents
  profileWeights: text("profile_weights", { mode: "json" }).$type<
    Record<string, number>
  >(),
  previousRunId: text("previous_run_id"),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// --- Agent Visits ---

export const agentVisits = sqliteTable("agent_visits", {
  id: text("id").primaryKey(),
  simulationRunId: text("simulation_run_id")
    .notNull()
    .references(() => simulationRuns.id),
  buyerProfileId: text("buyer_profile_id")
    .notNull()
    .references(() => buyerProfiles.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  mandate: text("mandate"),
  outcome: text("outcome", { enum: ["purchase", "reject"] }).notNull(),
  reasonCode: text("reason_code", {
    enum: [
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
    ],
  }),
  reasonSummary: text("reason_summary"),
  reasoningTrace: text("reasoning_trace", { mode: "json" }).$type<
    Array<{
      step: number;
      action: string;
      dataEvaluated: string;
      outcome: string;
    }>
  >(),
  productPrice: integer("product_price"), // denormalized, in cents
  sequenceNumber: integer("sequence_number"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// --- Rejection Clusters ---

export const rejectionClusters = sqliteTable("rejection_clusters", {
  id: text("id").primaryKey(),
  simulationRunId: text("simulation_run_id")
    .notNull()
    .references(() => simulationRuns.id),
  reasonCode: text("reason_code").notNull(),
  count: integer("count").notNull().default(0),
  affectedProfileIds: text("affected_profile_ids", {
    mode: "json",
  }).$type<string[]>(),
  affectedProductIds: text("affected_product_ids", {
    mode: "json",
  }).$type<string[]>(),
  estimatedRevenueImpact: integer("estimated_revenue_impact"), // in cents
  rank: integer("rank"),
  recommendation: text("recommendation", { mode: "json" }).$type<{
    action: string;
    description: string;
    estimatedRecovery: number;
  }>(),
});

// --- Storefront Actions ---

export const storefrontActions = sqliteTable("storefront_actions", {
  id: text("id").primaryKey(),
  simulationRunId: text("simulation_run_id")
    .notNull()
    .references(() => simulationRuns.id),
  recommendationSource: text("recommendation_source").references(
    () => rejectionClusters.id
  ),
  actionType: text("action_type").notNull(),
  changePreview: text("change_preview", { mode: "json" }).$type<{
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>(),
  applied: integer("applied", { mode: "boolean" }).notNull().default(false),
  appliedAt: text("applied_at"),
  reverted: integer("reverted", { mode: "boolean" }).notNull().default(false),
});
