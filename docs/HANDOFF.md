# Implementation Handoff Log

## Phase 1 — Project Scaffolding & Infrastructure (2026-03-17)
**Built:** Next.js 15+ app with App Router, Tailwind CSS v4, shadcn/ui v4, Drizzle ORM + better-sqlite3, full 7-table database schema with migration, app layout shell with nav, Vercel AI SDK, and Recharts. Vitest configured with schema validation tests (21 passing).
**Deviations:** Used Next.js 16.1.7 (latest stable) and Tailwind CSS v4 / shadcn v4 instead of v3 — uses CSS-native config (`@theme inline`) rather than `tailwind.config.ts`.
**Landmines:** Prices/revenue stored in cents (integers) throughout the schema. DB defaults to `./data/local.db` relative to project root. On Node.js v25, `npx next build` fails due to a symlink resolution bug — use `node node_modules/next/dist/bin/next build` as a workaround (not an issue on Node 20/22 or in deployment).
**Depends on:** Nothing beyond what's in the plan.

## Phase 2 — Seed Data & Storefront View (2026-03-17)
**Built:** Seed script (`src/db/seed.ts`) with 1 storefront and 20 products across 3 categories (Espresso Machines, Blenders, Cookware). Products have intentionally varying data quality: ~6 with full specs, ~8 with partial data, ~6 with minimal data. `data_completeness_score` computed and stored as 0-1 float. Storefront overview page at `/storefront` with policy summaries, categorized product grid, data quality indicators (colored dots + percentage), and product detail dialog with structured specs table and agent readability warnings.
**Deviations:** None.
**Landmines:** Seed script uses `SeedProduct` type to avoid TS union-type issues with varying `structuredSpecs` shapes. `computeCompleteness` uses a weighted formula (60% field presence, 40% spec depth) — not a simple ratio. shadcn v4 Dialog uses `@base-ui/react` under the hood (not Radix). The `DialogTrigger` takes a `render` prop instead of `asChild`.
**Depends on:** Phase 1 schema and db connection.

## Phase 3 — Buyer Profiles & Simulation Config (2026-03-17)
**Built:** TypeScript types for simulation output (`src/lib/types.ts`): `ReasonCode` const enum (10 codes), `REASON_CODE_LABELS` lookup, `ReasoningStep`, and `AgentDecision`. System prompt templates for all 6 buyer profiles in `src/lib/prompts/` — each defines persona, evaluation methodology, structured output schema, 1-2 few-shot examples, and references the reason code taxonomy. Shared fragments (`shared.ts`) for taxonomy and output schema to avoid duplication. 6 buyer profile seed records with realistic weight distribution (Price-Sensitive: 1.4, Speed-Obsessed: 1.2, Spec-Comparator: 1.0, Brand-Loyal: 0.9, Return-Conscious: 0.8, Sustainability-First: 0.7). Dashboard page updated with `BuyerProfileCards` (weight bars, constraints, example mandates) and `SimulationConfig` (visit count selector with 25/50/100/200 options, disabled simulate button).
**Deviations:** None.
**Landmines:** Buyer profile seed data uses `SeedBuyerProfile` type (same pattern as `SeedProduct`) to avoid TS union-type inference issues when different profiles have different parameter shapes. `PROFILE_PROMPTS` map in `src/lib/prompts/index.ts` maps profile IDs (bp_001..bp_006) to prompt strings — Phase 4 will use this to look up the system prompt for each profile during simulation. Profile weights are NOT equal: they sum to 6.0 and represent relative proportions. The `SimulationConfig` component is client-side ("use client") because it has interactive state for visit count selection.
**Depends on:** Phase 2 seed script and queries.
