// ---------------------------------------------------------------------------
// Deterministic recommendation generator
//
// Maps each reason code to a specific action type + recommendation details.
// The action type corresponds to a handler in the storefront mutation API.
// ---------------------------------------------------------------------------

export interface Recommendation {
  action: string;
  description: string;
  estimatedRecovery: number; // cents
  actionType: ActionType;
}

export type ActionType =
  | "add_expedited_shipping"
  | "structure_return_policy"
  | "add_sustainability_certs"
  | "enrich_product_specs"
  | "reduce_price"
  | "add_stock_status";

// ---------------------------------------------------------------------------
// Reason code -> action type mapping
// ---------------------------------------------------------------------------

const ACTION_TYPE_MAP: Record<string, ActionType> = {
  SHIPPING_SLA_UNMET: "add_expedited_shipping",
  PRICE_ABOVE_BUDGET: "reduce_price",
  MISSING_STRUCTURED_DATA: "enrich_product_specs",
  INSUFFICIENT_DESCRIPTION: "enrich_product_specs",
  RETURN_POLICY_UNACCEPTABLE: "structure_return_policy",
  SUSTAINABILITY_UNVERIFIED: "add_sustainability_certs",
  BRAND_MISMATCH: "enrich_product_specs", // can't really fix brand, enrich specs instead
  REVIEW_SCORE_BELOW_THRESHOLD: "enrich_product_specs", // can't fake reviews, enrich data
  STOCK_UNAVAILABLE: "add_stock_status",
  API_FIELD_MISSING: "enrich_product_specs",
};

const RECOMMENDATION_TEMPLATES: Record<
  string,
  { action: string; description: string }
> = {
  SHIPPING_SLA_UNMET: {
    action: "Add expedited shipping option with 1-2 day delivery",
    description:
      "Add a 1-2 business day expedited shipping option so speed-focused agents can complete purchases. This is the single highest-impact change for delivery-sensitive buyers.",
  },
  PRICE_ABOVE_BUDGET: {
    action: "Reduce prices by 10% on affected products",
    description:
      "Apply a 10% price reduction on products that were rejected for being above budget. This brings more items within typical agent budget thresholds.",
  },
  MISSING_STRUCTURED_DATA: {
    action: "Add structured product specifications",
    description:
      "Populate machine-readable spec fields (wattage, dimensions, materials, capacity) on products missing structured data so comparison agents can evaluate them.",
  },
  INSUFFICIENT_DESCRIPTION: {
    action: "Enrich product descriptions with detailed specs",
    description:
      "Expand product descriptions with detailed feature information, technical specifications, and use-case details to help agents assess suitability.",
  },
  RETURN_POLICY_UNACCEPTABLE: {
    action: "Structure return policy with machine-readable fields",
    description:
      "Convert the free-text return policy to structured fields (window days, free returns, conditions) so agents can programmatically verify return terms.",
  },
  SUSTAINABILITY_UNVERIFIED: {
    action: "Add verified sustainability certifications",
    description:
      "Add Energy Star, Fair Trade, and FSC certifications to the storefront's sustainability claims so sustainability-focused agents can verify environmental commitments.",
  },
  BRAND_MISMATCH: {
    action: "Enrich product brand and specification data",
    description:
      "Ensure all products have brand information and rich structured specs to maximize discoverability by brand-aware and comparison agents.",
  },
  REVIEW_SCORE_BELOW_THRESHOLD: {
    action: "Enrich product data to compensate for low reviews",
    description:
      "Add detailed structured specs and descriptions to products with low review scores. Rich product data can offset the impact of limited reviews.",
  },
  STOCK_UNAVAILABLE: {
    action: "Mark affected products as in-stock",
    description:
      "Update stock status for out-of-stock or uncertain availability products to in_stock, ensuring agents can complete purchases.",
  },
  API_FIELD_MISSING: {
    action: "Complete missing data feed fields",
    description:
      "Fill in missing structured specification fields that agents expect to find in the product data feed.",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a recommendation for a given reason code and revenue impact.
 * Uses a deterministic mapping (no LLM call).
 */
export function generateRecommendation(
  reasonCode: string,
  revenueImpact: number
): Recommendation {
  const template = RECOMMENDATION_TEMPLATES[reasonCode] ?? {
    action: "Investigate and fix rejection cause",
    description:
      "Review the rejection details and address the underlying data or policy issue.",
  };

  const actionType = ACTION_TYPE_MAP[reasonCode] ?? "enrich_product_specs";

  return {
    ...template,
    estimatedRecovery: Math.round(revenueImpact * 0.6), // estimate 60% recovery
    actionType,
  };
}

/**
 * Get the action type for a given reason code.
 */
export function getActionType(reasonCode: string): ActionType {
  return ACTION_TYPE_MAP[reasonCode] ?? "enrich_product_specs";
}
