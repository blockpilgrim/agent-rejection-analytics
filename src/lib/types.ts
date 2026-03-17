// ---------------------------------------------------------------------------
// Simulation output types
// ---------------------------------------------------------------------------

/** The 10-code rejection reason taxonomy. */
export const ReasonCode = {
  SHIPPING_SLA_UNMET: "SHIPPING_SLA_UNMET",
  PRICE_ABOVE_BUDGET: "PRICE_ABOVE_BUDGET",
  MISSING_STRUCTURED_DATA: "MISSING_STRUCTURED_DATA",
  INSUFFICIENT_DESCRIPTION: "INSUFFICIENT_DESCRIPTION",
  RETURN_POLICY_UNACCEPTABLE: "RETURN_POLICY_UNACCEPTABLE",
  SUSTAINABILITY_UNVERIFIED: "SUSTAINABILITY_UNVERIFIED",
  BRAND_MISMATCH: "BRAND_MISMATCH",
  REVIEW_SCORE_BELOW_THRESHOLD: "REVIEW_SCORE_BELOW_THRESHOLD",
  STOCK_UNAVAILABLE: "STOCK_UNAVAILABLE",
  API_FIELD_MISSING: "API_FIELD_MISSING",
} as const;

export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode];

/** Human-readable labels for each reason code. */
export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  SHIPPING_SLA_UNMET: "Delivery time exceeds agent's required timeframe",
  PRICE_ABOVE_BUDGET: "Price exceeds the buyer's stated budget",
  MISSING_STRUCTURED_DATA:
    "A required field is absent or not machine-readable",
  INSUFFICIENT_DESCRIPTION:
    "Product description lacks specs needed for automated comparison",
  RETURN_POLICY_UNACCEPTABLE:
    "Return policy missing, not machine-readable, or doesn't meet requirements",
  SUSTAINABILITY_UNVERIFIED:
    "No verifiable sustainability claims when required",
  BRAND_MISMATCH: "Product doesn't match brand preference or exclusion",
  REVIEW_SCORE_BELOW_THRESHOLD:
    "Ratings/reviews below agent's minimum threshold",
  STOCK_UNAVAILABLE: "Product out of stock or availability uncertain",
  API_FIELD_MISSING:
    "Merchant data feed missing a field the agent expected to evaluate",
};

/** A single step in the agent's reasoning trace. */
export interface ReasoningStep {
  step: number;
  action: string;
  dataEvaluated: string;
  outcome: string;
}

/** The structured decision output from a buyer agent. */
export interface AgentDecision {
  outcome: "purchase" | "reject";
  reasonCode: ReasonCode | null;
  reasonSummary: string;
  reasoningTrace: ReasoningStep[];
}
