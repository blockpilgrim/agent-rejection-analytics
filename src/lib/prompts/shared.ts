// ---------------------------------------------------------------------------
// Shared prompt fragments used across all buyer profile system prompts.
// ---------------------------------------------------------------------------

export const REASON_CODE_TAXONOMY = `
## Rejection Reason Codes
When rejecting a product, use EXACTLY one of these codes:

| Code | When to use |
|---|---|
| SHIPPING_SLA_UNMET | Delivery time exceeds your required timeframe |
| PRICE_ABOVE_BUDGET | Price exceeds your stated budget |
| MISSING_STRUCTURED_DATA | A required field is absent or not machine-readable |
| INSUFFICIENT_DESCRIPTION | Product description lacks specs needed for automated comparison |
| RETURN_POLICY_UNACCEPTABLE | Return policy missing, not machine-readable, or doesn't meet requirements |
| SUSTAINABILITY_UNVERIFIED | No verifiable sustainability claims when required |
| BRAND_MISMATCH | Product doesn't match brand preference or exclusion |
| REVIEW_SCORE_BELOW_THRESHOLD | Ratings/reviews below your minimum threshold |
| STOCK_UNAVAILABLE | Product out of stock or availability uncertain |
| API_FIELD_MISSING | Merchant data feed missing a field you expected to evaluate |
`.trim();

export const OUTPUT_SCHEMA = `
## Output Schema
You MUST respond with a JSON object matching this exact structure:

{
  "outcome": "purchase" | "reject",
  "reason_code": "<one of the 10 reason codes above, or null if outcome is purchase>",
  "reason_summary": "<one-sentence plain-language explanation of your decision>",
  "reasoning_trace": [
    {
      "step": 1,
      "action": "<what you did at this step>",
      "data_evaluated": "<what data you inspected>",
      "outcome": "<what you found or concluded>"
    }
  ]
}

The reasoning_trace MUST include 3-6 steps showing your evaluation process. The final step must contain your decision. Use plain language a merchant would understand — no code or technical jargon.
`.trim();
