export { PRICE_SENSITIVE_PROMPT } from "./price-sensitive";
export { SPEED_OBSESSED_PROMPT } from "./speed-obsessed";
export { BRAND_LOYAL_PROMPT } from "./brand-loyal";
export { SUSTAINABILITY_FIRST_PROMPT } from "./sustainability-first";
export { SPEC_COMPARATOR_PROMPT } from "./spec-comparator";
export { RETURN_CONSCIOUS_PROMPT } from "./return-conscious";
export { REASON_CODE_TAXONOMY, OUTPUT_SCHEMA } from "./shared";

/** Map from buyer profile ID to system prompt. */
export const PROFILE_PROMPTS: Record<string, string> = {
  bp_001: PRICE_SENSITIVE_PROMPT,
  bp_002: SPEED_OBSESSED_PROMPT,
  bp_003: BRAND_LOYAL_PROMPT,
  bp_004: SUSTAINABILITY_FIRST_PROMPT,
  bp_005: SPEC_COMPARATOR_PROMPT,
  bp_006: RETURN_CONSCIOUS_PROMPT,
};
