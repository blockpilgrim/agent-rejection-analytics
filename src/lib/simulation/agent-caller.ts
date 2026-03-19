import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { PROFILE_PROMPTS } from "@/lib/prompts";
import type { AgentDecision, ReasonCode } from "@/lib/types";
import { recordApiCall } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Zod schema for structured output
// ---------------------------------------------------------------------------

const reasonCodeEnum = z.enum([
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
]);

const agentDecisionSchema = z.object({
  outcome: z.enum(["purchase", "reject"]),
  reason_code: reasonCodeEnum.nullable(),
  reason_summary: z.string(),
  reasoning_trace: z.array(
    z.object({
      step: z.number(),
      action: z.string(),
      data_evaluated: z.string(),
      outcome: z.string(),
    })
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductData {
  id: string;
  name: string;
  category: string;
  price: number; // cents
  description: string | null;
  structuredSpecs: Record<string, string | number | boolean | null> | null;
  brand: string | null;
  reviewScore: number | null;
  reviewCount: number | null;
  stockStatus: string;
  dataCompletenessScore: number | null;
}

export interface StorefrontContext {
  name: string;
  shippingPolicies: Record<string, string | undefined> | null;
  returnPolicy: {
    windowDays?: number;
    free?: boolean;
    structured?: boolean;
    rawText?: string;
  } | null;
  sustainabilityClaims: {
    certified?: boolean;
    claims?: string[];
  } | null;
}

export interface CallAgentInput {
  profileId: string;
  product: ProductData;
  storefront: StorefrontContext;
  mandate: string;
}

// ---------------------------------------------------------------------------
// Build the user prompt with product data + storefront policies + mandate
// ---------------------------------------------------------------------------

function buildUserPrompt(input: CallAgentInput): string {
  const { product, storefront, mandate } = input;
  const priceFormatted = `$${(product.price / 100).toFixed(2)}`;

  const lines: string[] = [
    `## Buyer Mandate`,
    mandate,
    ``,
    `## Storefront: ${storefront.name}`,
  ];

  // Shipping
  if (storefront.shippingPolicies) {
    lines.push(`### Shipping Policies`);
    for (const [key, val] of Object.entries(storefront.shippingPolicies)) {
      if (val) lines.push(`- ${key}: ${val}`);
    }
  } else {
    lines.push(`### Shipping Policies`);
    lines.push(`No shipping policy information available.`);
  }

  // Return policy
  lines.push(``);
  if (storefront.returnPolicy) {
    lines.push(`### Return Policy`);
    if (storefront.returnPolicy.structured) {
      lines.push(`- Window: ${storefront.returnPolicy.windowDays ?? "unknown"} days`);
      lines.push(`- Free returns: ${storefront.returnPolicy.free ?? "unknown"}`);
    } else if (storefront.returnPolicy.rawText) {
      lines.push(`Raw policy text: "${storefront.returnPolicy.rawText}"`);
      lines.push(`(Note: this policy is not in a structured/machine-readable format)`);
    } else {
      lines.push(`No return policy details available.`);
    }
  } else {
    lines.push(`### Return Policy`);
    lines.push(`No return policy information available.`);
  }

  // Sustainability
  lines.push(``);
  if (storefront.sustainabilityClaims) {
    lines.push(`### Sustainability Claims`);
    lines.push(`- Certified: ${storefront.sustainabilityClaims.certified ?? false}`);
    if (storefront.sustainabilityClaims.claims?.length) {
      lines.push(`- Claims: ${storefront.sustainabilityClaims.claims.join(", ")}`);
    } else {
      lines.push(`- No sustainability claims listed.`);
    }
  }

  // Product data
  lines.push(``);
  lines.push(`## Product Under Evaluation`);
  lines.push(`- Name: ${product.name}`);
  lines.push(`- Category: ${product.category}`);
  lines.push(`- Price: ${priceFormatted}`);
  lines.push(`- Brand: ${product.brand ?? "Not specified"}`);
  lines.push(`- Stock Status: ${product.stockStatus}`);
  lines.push(`- Review Score: ${product.reviewScore ?? "No reviews"}`);
  lines.push(`- Review Count: ${product.reviewCount ?? 0}`);
  lines.push(`- Data Completeness: ${product.dataCompletenessScore != null ? `${Math.round(product.dataCompletenessScore * 100)}%` : "Unknown"}`);

  if (product.description) {
    lines.push(``);
    lines.push(`### Description`);
    lines.push(product.description);
  } else {
    lines.push(``);
    lines.push(`### Description`);
    lines.push(`No product description available.`);
  }

  if (product.structuredSpecs && Object.keys(product.structuredSpecs).length > 0) {
    lines.push(``);
    lines.push(`### Structured Specifications`);
    for (const [key, val] of Object.entries(product.structuredSpecs)) {
      lines.push(`- ${key}: ${val}`);
    }
  } else {
    lines.push(``);
    lines.push(`### Structured Specifications`);
    lines.push(`No structured specifications available.`);
  }

  lines.push(``);
  lines.push(
    `Evaluate this product according to your buyer profile and mandate. Respond with your decision as a JSON object.`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Call the agent — single attempt
// ---------------------------------------------------------------------------

async function callOnce(input: CallAgentInput): Promise<AgentDecision> {
  const systemPrompt = PROFILE_PROMPTS[input.profileId];
  if (!systemPrompt) {
    throw new Error(`Unknown profile ID: ${input.profileId}`);
  }

  const userPrompt = buildUserPrompt(input);

  recordApiCall();
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: agentDecisionSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Map from snake_case API response to camelCase AgentDecision
  return {
    outcome: object.outcome,
    reasonCode: object.reason_code as ReasonCode | null,
    reasonSummary: object.reason_summary,
    reasoningTrace: object.reasoning_trace.map((s) => ({
      step: s.step,
      action: s.action,
      dataEvaluated: s.data_evaluated,
      outcome: s.outcome,
    })),
  };
}

// ---------------------------------------------------------------------------
// Public: call with retry (once on failure, mark failed on second failure)
// ---------------------------------------------------------------------------

export interface AgentCallResult {
  decision: AgentDecision | null;
  error: string | null;
  failed: boolean;
}

export async function callAgent(input: CallAgentInput): Promise<AgentCallResult> {
  try {
    const decision = await callOnce(input);
    return { decision, error: null, failed: false };
  } catch (firstError: unknown) {
    // Check for rate limit (429) — wait before retry
    const errMsg = firstError instanceof Error ? firstError.message : String(firstError);
    const is429 = errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit");

    if (is429) {
      await sleep(2000); // back off 2 seconds on rate limit
    }

    // Retry once
    try {
      const decision = await callOnce(input);
      return { decision, error: null, failed: false };
    } catch (secondError: unknown) {
      const msg =
        secondError instanceof Error ? secondError.message : String(secondError);
      return { decision: null, error: msg, failed: true };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
