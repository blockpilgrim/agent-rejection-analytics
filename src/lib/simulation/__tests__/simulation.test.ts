import { describe, it, expect } from "vitest";
import { z } from "zod";

// =============================================================================
// 1. Visit queue distribution logic
//
// generateVisitQueue is not exported from orchestrator.ts, so we re-implement
// the core distribution algorithm here (same pattern as seed.test.ts).
// This tests the weighted distribution math, not the shuffle or mandate gen.
// =============================================================================

interface ProfileInfo {
  id: string;
  name: string;
  weight: number;
}

/**
 * Mirrors the weight-based distribution logic from orchestrator.ts:
 * Each profile gets Math.round(weight/totalWeight * visitCount) visits,
 * with the last profile receiving the remainder to ensure exact total.
 */
function computeVisitDistribution(
  profiles: ProfileInfo[],
  visitCount: number
): { profileId: string; count: number }[] {
  const totalWeight = profiles.reduce((sum, p) => sum + p.weight, 0);
  const result: { profileId: string; count: number }[] = [];
  let assigned = 0;

  for (let i = 0; i < profiles.length; i++) {
    const proportion = profiles[i].weight / totalWeight;
    const count =
      i === profiles.length - 1
        ? visitCount - assigned
        : Math.round(proportion * visitCount);
    result.push({ profileId: profiles[i].id, count });
    assigned += count;
  }

  return result;
}

describe("visit queue distribution", () => {
  const sixProfiles: ProfileInfo[] = [
    { id: "bp_001", name: "Price-Sensitive", weight: 0.25 },
    { id: "bp_002", name: "Speed-Obsessed", weight: 0.2 },
    { id: "bp_003", name: "Brand-Loyal", weight: 0.15 },
    { id: "bp_004", name: "Eco-Conscious", weight: 0.15 },
    { id: "bp_005", name: "Spec-Driven", weight: 0.15 },
    { id: "bp_006", name: "Return-Policy", weight: 0.1 },
  ];

  it("distributes 100 visits proportionally to weights", () => {
    const dist = computeVisitDistribution(sixProfiles, 100);

    // Total assigned must equal exactly 100
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(100);

    // Each profile should be roughly proportional:
    // bp_001: 0.25 * 100 = 25
    // bp_002: 0.20 * 100 = 20
    // bp_003: 0.15 * 100 = 15
    // bp_004: 0.15 * 100 = 15
    // bp_005: 0.15 * 100 = 15
    // bp_006: gets remainder = 100 - (25+20+15+15+15) = 10
    expect(dist.find((d) => d.profileId === "bp_001")!.count).toBe(25);
    expect(dist.find((d) => d.profileId === "bp_002")!.count).toBe(20);
    expect(dist.find((d) => d.profileId === "bp_003")!.count).toBe(15);
    expect(dist.find((d) => d.profileId === "bp_004")!.count).toBe(15);
    expect(dist.find((d) => d.profileId === "bp_005")!.count).toBe(15);
    expect(dist.find((d) => d.profileId === "bp_006")!.count).toBe(10);
  });

  it("distributes visits correctly with equal weights", () => {
    const equalProfiles: ProfileInfo[] = [
      { id: "a", name: "A", weight: 1 },
      { id: "b", name: "B", weight: 1 },
      { id: "c", name: "C", weight: 1 },
    ];

    const dist = computeVisitDistribution(equalProfiles, 30);
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(30);

    // Equal weights => 10 each
    for (const d of dist) {
      expect(d.count).toBe(10);
    }
  });

  it("assigns remainder to last profile when visits do not divide evenly", () => {
    const twoProfiles: ProfileInfo[] = [
      { id: "a", name: "A", weight: 1 },
      { id: "b", name: "B", weight: 1 },
    ];

    // 7 visits, 2 equal profiles: Math.round(0.5 * 7) = 4 for first, 7-4=3 for last
    const dist = computeVisitDistribution(twoProfiles, 7);
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(7);

    expect(dist[0].count).toBe(4); // Math.round(3.5) = 4
    expect(dist[1].count).toBe(3); // remainder
  });

  it("handles a single profile getting all visits", () => {
    const single: ProfileInfo[] = [{ id: "solo", name: "Solo", weight: 1 }];

    const dist = computeVisitDistribution(single, 50);
    expect(dist).toHaveLength(1);
    expect(dist[0].count).toBe(50);
  });

  it("handles small visit count (1 visit)", () => {
    const dist = computeVisitDistribution(sixProfiles, 1);
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(1);
  });
});

// =============================================================================
// 2. Zod schema validation for structured agent output
//
// agentDecisionSchema is not exported from agent-caller.ts, so we re-create
// the same schema here to test valid/invalid payloads.
// =============================================================================

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

describe("agentDecisionSchema", () => {
  it("accepts a valid purchase decision", () => {
    const valid = {
      outcome: "purchase",
      reason_code: null,
      reason_summary: "Product meets all buying criteria.",
      reasoning_trace: [
        {
          step: 1,
          action: "Check price against budget",
          data_evaluated: "Price: $129.99, Budget: $300",
          outcome: "Within budget",
        },
        {
          step: 2,
          action: "Verify review score",
          data_evaluated: "Score: 4.6 (312 reviews)",
          outcome: "Meets threshold",
        },
      ],
    };

    const result = agentDecisionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts a valid rejection with reason code", () => {
    const valid = {
      outcome: "reject",
      reason_code: "PRICE_ABOVE_BUDGET",
      reason_summary: "Product price $499.99 exceeds budget of $300.",
      reasoning_trace: [
        {
          step: 1,
          action: "Check price against budget",
          data_evaluated: "Price: $499.99, Budget: $300",
          outcome: "Over budget - reject",
        },
      ],
    };

    const result = agentDecisionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid outcome value", () => {
    const invalid = {
      outcome: "maybe",
      reason_code: null,
      reason_summary: "Not sure.",
      reasoning_trace: [],
    };

    const result = agentDecisionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid reason code", () => {
    const invalid = {
      outcome: "reject",
      reason_code: "NOT_A_REAL_CODE",
      reason_summary: "Bad reason.",
      reasoning_trace: [],
    };

    const result = agentDecisionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects when reasoning_trace steps are missing required fields", () => {
    const invalid = {
      outcome: "purchase",
      reason_code: null,
      reason_summary: "OK",
      reasoning_trace: [{ step: 1 }], // missing action, data_evaluated, outcome
    };

    const result = agentDecisionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts all 10 reason codes from the taxonomy", () => {
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

    for (const code of codes) {
      const result = agentDecisionSchema.safeParse({
        outcome: "reject",
        reason_code: code,
        reason_summary: `Rejected: ${code}`,
        reasoning_trace: [],
      });
      expect(result.success, `Expected ${code} to be valid`).toBe(true);
    }
  });
});

// =============================================================================
// 3. SSE event formatting
//
// The route handler formats SSE events inline. We test that the format
// pattern produces spec-compliant SSE strings (event + data + double newline).
// =============================================================================

/** Mirrors the SSE formatting pattern used in route.ts */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe("SSE event formatting", () => {
  it("formats an init event with correct SSE structure", () => {
    const result = formatSSE("init", { runId: "run_123", totalVisits: 100 });

    expect(result).toBe(
      `event: init\ndata: {"runId":"run_123","totalVisits":100}\n\n`
    );
  });

  it("formats a visit event with nested data", () => {
    const payload = {
      sequenceNumber: 1,
      profileName: "Price-Sensitive",
      outcome: "reject",
      reasonCode: "PRICE_ABOVE_BUDGET",
      runningTotals: {
        purchases: 0,
        rejections: 1,
        errors: 0,
        completed: 1,
        total: 100,
      },
    };

    const result = formatSSE("visit", payload);

    // Verify structure: starts with "event: visit\n", then "data: ...\n\n"
    expect(result).toMatch(/^event: visit\ndata: .+\n\n$/);

    // Verify the data parses back correctly
    const dataLine = result.split("\n")[1];
    const jsonStr = dataLine.replace("data: ", "");
    const parsed = JSON.parse(jsonStr);
    expect(parsed.sequenceNumber).toBe(1);
    expect(parsed.outcome).toBe("reject");
    expect(parsed.runningTotals.completed).toBe(1);
  });

  it("formats a complete event", () => {
    const result = formatSSE("complete", {
      runId: "run_abc",
      purchases: 60,
      rejections: 38,
      errors: 2,
      conversionRate: 0.6122,
    });

    expect(result).toMatch(/^event: complete\ndata: .+\n\n$/);

    const dataLine = result.split("\n")[1];
    const parsed = JSON.parse(dataLine.replace("data: ", ""));
    expect(parsed.conversionRate).toBe(0.6122);
  });

  it("formats an error event", () => {
    const result = formatSSE("error", { error: "Simulation failed" });

    expect(result).toBe(
      `event: error\ndata: {"error":"Simulation failed"}\n\n`
    );
  });

  it("terminates with double newline (required by SSE spec)", () => {
    const result = formatSSE("test", {});
    expect(result.endsWith("\n\n")).toBe(true);
  });
});
