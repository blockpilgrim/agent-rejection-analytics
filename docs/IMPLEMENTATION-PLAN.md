# Agent Rejection Analytics — Implementation Plan

This plan breaks the MVP (features F1–F10) into eight sequenced phases. Each phase produces a working increment. Later phases depend on earlier ones — do not skip ahead.

> **Guiding principle:** This is a demo app. Optimize for speed. Only test core infrastructure (DB, data pipelines, shared utilities). Skip tests for UI, charts, and feature wiring.

---

## Phase 1: Project Scaffolding & Infrastructure

Stand up the project skeleton: framework, styling, database, and app shell. Nothing user-visible beyond a layout — but everything downstream depends on this.

- [x] Initialize Next.js 15+ project with App Router (`create-next-app` with TypeScript, ESLint, Tailwind CSS, App Router, `src/` directory)
- [x] Install and configure shadcn/ui (init with default theme, add base components: `Button`, `Card`, `Badge`, `Tabs`, `ScrollArea`, `Collapsible`, `Skeleton`)
- [x] Install Drizzle ORM + `better-sqlite3` driver for local dev; configure `drizzle.config.ts`
- [x] Define full database schema in `src/db/schema.ts` matching the data architecture:
  - `storefronts` table
  - `products` table (with JSON column for `structured_specs`)
  - `buyer_profiles` table (with JSON column for `parameters`)
  - `simulation_runs` table (with JSON columns for `storefront_snapshot`, `profile_weights`)
  - `agent_visits` table (with JSON column for `reasoning_trace`, enum for `outcome` and `reason_code`)
  - `rejection_clusters` table (with JSON columns for `affected_profile_ids`, `affected_product_ids`, `recommendation`)
  - `storefront_actions` table (with JSON column for `change_preview`)
- [x] Generate initial migration and verify it applies cleanly
- [x] Create database connection utility (`src/db/index.ts`) with a singleton pattern for the SQLite connection
- [x] Create app layout shell (`src/app/layout.tsx`) with a top nav bar (logo/title, minimal navigation) and a main content area
- [x] Set up environment variables (`.env.local.example`) for `ANTHROPIC_API_KEY` and `DATABASE_URL`
- [x] Install Vercel AI SDK (`ai`, `@ai-sdk/anthropic`)
- [x] Install Recharts

---

## Phase 2: Seed Data & Storefront View (F1)

Populate the simulated merchant storefront and build the UI to browse it. This is the user's entry point — they need to see the store before simulating anything.

- [ ] Create seed data script (`src/db/seed.ts`) that inserts:
  - 1 default storefront with realistic policies (shipping: standard 3-day only, return policy as free-text blob, no structured sustainability claims)
  - 20+ products across 3+ categories (e.g., Espresso Machines, Blenders, Cookware) with varying data quality:
    - ~6 products with full structured specs, reviews, stock status
    - ~8 products with partial data (missing some specs, low review counts)
    - ~6 products with minimal data (free-text descriptions only, no structured specs)
  - Prices ranging from $30–$600 to create meaningful budget constraint variation
- [ ] Compute and store `data_completeness_score` for each product during seeding (ratio of populated fields to total possible fields)
- [ ] Add an npm script (`db:seed`) that resets and re-seeds the database
- [ ] Build storefront overview page (`src/app/page.tsx` or `src/app/storefront/page.tsx`):
  - Storefront header showing store name, shipping policy summary, return policy summary
  - Product catalog displayed as a grid of cards
  - Each product card shows: name, category, price, review score, stock status, and a data-completeness indicator (e.g., colored dot or progress bar)
- [ ] Build product detail view (expandable card or modal) showing all fields including raw structured specs and description text, so the user can see exactly what data agents will evaluate
- [ ] Add visual indicators for data quality issues (e.g., "No structured specs", "Return policy not machine-readable") — these foreshadow what agents will flag

---

## Phase 3: Buyer Profiles & Simulation Config (F2)

Define the six buyer agent archetypes and build the simulation configuration UI. After this phase the user can see profiles and configure a run — but can't execute one yet.

- [ ] Create 6 buyer profile seed records with full definitions:
  - **Price-Sensitive**: budget ceiling, minimum review threshold
  - **Speed-Obsessed**: max delivery days, willingness to pay for expedited
  - **Brand-Loyal**: approved brand list, brand tier requirements
  - **Sustainability-First**: requires verified sustainability claims, rejects unverifiable
  - **Spec-Comparator**: requires structured specs for comparison fields (wattage, capacity, warranty)
  - **Return-Conscious**: minimum return window, requires free returns, requires machine-readable policy
- [ ] Write the system prompt template for each profile (`src/lib/prompts/`). Each prompt must:
  - Define the agent's persona and evaluation methodology
  - Specify the structured output schema (outcome, reason_code, reason_summary, reasoning_trace)
  - Include 1–2 few-shot examples of a purchase and a rejection
  - Reference the rejection reason taxonomy (10 codes from PRODUCT.md)
- [ ] Define the TypeScript types for simulation output (`src/lib/types.ts`):
  - `AgentDecision` (outcome, reason_code, reason_summary, reasoning_trace)
  - `ReasoningStep` (step number, action, data_evaluated, outcome)
  - `ReasonCode` enum matching the 10-code taxonomy
- [ ] Build buyer profiles display panel (visible on the main page or in a sidebar/tab):
  - Card per profile showing name, primary constraint, and example mandate
  - Default weight allocation displayed (e.g., pie chart or labeled percentages)
- [ ] Build simulation config controls:
  - Visit count selector (default 100, options: 25, 50, 100, 200)
  - "Simulate N Agent Visits" trigger button (disabled until Phase 4 wires it up)
  - Brief explainer text: "We'll send N AI shopping agents — each with different buyer priorities — to evaluate your store."

---

## Phase 4: Simulation Engine & Live Feed (F3, F4)

The core engine. Wire up Claude API calls, orchestrate concurrent simulations, stream results to the client in real time. After this phase, the user can run a simulation and watch results appear live.

- [ ] Build the simulation orchestrator (`src/lib/simulation/orchestrator.ts`):
  - Accept config: storefront ID, visit count, profile weights
  - Generate the visit queue: pair buyer profiles with products based on weighted distribution (profile weights determine how many visits each profile gets; product selection is randomized or round-robin within each profile's visits)
  - Return an async iterator/generator that yields `AgentVisit` results as they complete
- [ ] Implement the Claude API caller (`src/lib/simulation/agent-caller.ts`):
  - Use Vercel AI SDK's `generateObject()` with Anthropic provider
  - Three-layer prompt: system (profile persona) + user (product data + storefront policies + specific mandate) + structured output schema via Zod
  - Parse and validate the structured response into `AgentDecision`
  - Handle API errors gracefully (retry once, then mark visit as failed)
- [ ] Implement concurrent execution with semaphore pattern:
  - Configurable concurrency limit (default: 8)
  - Process visits in concurrent batches, yielding each result as it completes
  - Respect rate limits — back off on 429 responses
- [ ] Build the simulation API route (`src/app/api/simulate/route.ts`):
  - POST handler: accepts config, creates a `SimulationRun` record (status: running), starts orchestration
  - Streams results via SSE (use `ReadableStream` with `TextEncoder` for SSE format)
  - Each SSE event contains a serialized `AgentVisit` result
  - On completion: update `SimulationRun` with totals, emit a `complete` event
- [ ] Persist each `AgentVisit` to the database as it completes (within the orchestrator loop, before yielding to the stream)
- [ ] Build the live simulation feed UI (`src/components/simulation/LiveFeed.tsx`):
  - Connect to SSE endpoint on simulation trigger
  - Display results as they arrive: each entry is a row/card showing buyer profile name, product name, outcome badge (green PURCHASE / red REJECT), and one-line reason summary
  - Animate new entries appearing (subtle fade-in or slide-in)
  - Running tally bar at the top: "Purchases: X | Rejections: Y | Total: Z/N" with a progress indicator
- [ ] Handle simulation completion: transition from live feed to results view (initially just a completion message — the dashboard comes in Phase 5)
- [ ] Test: orchestrator visit queue distribution logic, structured output Zod schema validation, SSE event formatting

---

## Phase 5: Rejection Dashboard & Revenue Estimation (F5, F10)

Transform raw simulation results into the merchant's primary diagnostic view. Cluster rejections, estimate revenue impact, rank by severity.

- [ ] Build the aggregation engine (`src/lib/simulation/aggregator.ts`):
  - Input: all `AgentVisit` records for a simulation run
  - Group rejections by `reason_code`
  - For each cluster: count rejections, collect unique affected profile IDs and product IDs, compute `estimated_revenue_impact` = rejection count × average price of affected products
  - Rank clusters by `estimated_revenue_impact` descending
  - Persist `RejectionCluster` records to the database
- [ ] Compute and store simulation-level summary stats on `SimulationRun`:
  - `total_purchases`, `total_rejections`, `overall_conversion_rate`
  - `estimated_revenue_lost` = sum of all cluster revenue impacts
- [ ] Build the rejection dashboard page/view (`src/components/dashboard/RejectionDashboard.tsx`):
  - Summary bar at top: overall conversion rate (e.g., "37% conversion — 63 of 100 agents rejected"), total estimated revenue lost
  - Rejection cluster list, ranked by revenue impact:
    - Each cluster card shows: reason code label (human-readable), rejection count, estimated revenue impact, affected buyer profiles (as badges), affected product count
  - Clicking a cluster expands to show the individual rejections within it (list of agent visits in that cluster with profile, product, and reason summary)
- [ ] Build a bar chart (Recharts) showing rejection counts by reason code
- [ ] Build the revenue impact tooltip/explainer: on hover/click, show the calculation formula ("38 rejections × $479 avg product price = $18,202")
- [ ] Wire the simulation completion flow: after live feed finishes → auto-transition to the rejection dashboard
- [ ] Create a top-level page layout with tabs or navigation between: Storefront View | Simulation Feed | Dashboard (the dashboard tab activates after a simulation completes)
- [ ] Test: aggregation logic (clustering, revenue calculation, ranking)

---

## Phase 6: Agent Reasoning Trace (F6)

Give merchants the ability to drill into any individual agent decision and see the step-by-step evaluation chain.

- [ ] Build the reasoning trace component (`src/components/dashboard/ReasoningTrace.tsx`):
  - Expandable/collapsible panel (uses shadcn `Collapsible`) attached to each agent visit entry
  - Displays the agent's mandate at the top
  - Renders each `ReasoningStep` as a numbered step in a vertical timeline/stepper layout:
    - Step description (what the agent did)
    - Data evaluated (what it looked at)
    - Step outcome (what it found)
  - The decision step (final step) is visually highlighted (e.g., red border for REJECT, green for PURCHASE)
  - The specific constraint that caused rejection is called out with emphasis
- [ ] Integrate trace expansion into two locations:
  - The live feed: each feed entry has a "View trace" expand toggle
  - The rejection dashboard: when a cluster is expanded to show individual rejections, each rejection row has a trace toggle
- [ ] Ensure traces render in plain language (the prompt engineering in Phase 3 should produce this, but verify and adjust prompts if traces are too technical)

---

## Phase 7: Recommendations & One-Click Actions (F7, F8)

Turn diagnostic data into directives. Generate concrete recommendations per rejection cluster, and let the merchant apply fixes to the simulated storefront with one click.

- [ ] Build the recommendation generator (`src/lib/simulation/recommender.ts`):
  - Input: `RejectionCluster` records + storefront state
  - For each cluster, use Claude Haiku (via Vercel AI SDK) to generate:
    - A specific action statement (e.g., "Add expedited shipping option with 1-day delivery to all products")
    - The estimated revenue recovery (= cluster's revenue impact, since fixing it would recover those rejections)
  - Alternatively: use a deterministic mapping for MVP (reason_code → hardcoded recommendation template) to avoid an extra LLM call per cluster. Fall back to Haiku only for edge cases or nuanced recommendations.
  - Persist recommendations as JSON on each `RejectionCluster` record
- [ ] Build the recommendation display within each cluster card on the dashboard:
  - Action statement in bold
  - Estimated recovery figure
  - "Apply Fix" button
- [ ] Build the action preview modal (`src/components/actions/ActionPreview.tsx`):
  - Shows before → after diff of what will change in the storefront (e.g., shipping policies, product fields)
  - "Confirm" and "Cancel" buttons
- [ ] Build the storefront mutation API (`src/app/api/storefront/route.ts`):
  - PATCH handler: accepts an action type and parameters, applies the change to the storefront/product records
  - Creates a `StorefrontAction` record tracking what changed
  - Returns the updated storefront state
- [ ] Implement action types (one handler per type):
  - `add_expedited_shipping` — adds expedited option to storefront shipping policies
  - `structure_return_policy` — converts free-text return policy to structured fields
  - `add_sustainability_certs` — adds verified sustainability claims
  - `enrich_product_specs` — fills in missing structured specs for affected products
  - `reduce_price` — adjusts price for products above budget thresholds
  - `add_stock_status` — marks uncertain-stock products as in-stock
- [ ] Implement undo: each action stores a `change_preview` with the before state; an "Undo" button on applied actions calls a revert endpoint that restores the before state
- [ ] Update the dashboard to show applied actions with a visual indicator (e.g., checkmark, dimmed "Applied" state) and the undo option

---

## Phase 8: Before/After Comparison (F9)

Close the optimization loop. After a merchant applies fixes and reruns, show them proof that it worked — in aggregate numbers and in individual agent reasoning.

- [ ] Snapshot storefront state on every simulation run:
  - On simulation start, serialize the full storefront (all products + policies) as JSON and store in `SimulationRun.storefront_snapshot`
  - Link consecutive runs: set `previous_run_id` on the new run to the most recent completed run
- [ ] Auto-trigger re-simulation after action(s) are applied:
  - After one or more actions are confirmed, show a "Re-run Simulation" button (or auto-trigger)
  - New simulation runs against the updated storefront with the same config (visit count, profile weights)
- [ ] Build the comparison engine (`src/lib/simulation/comparator.ts`):
  - Input: current `SimulationRun` + previous `SimulationRun`
  - Compute deltas for: overall conversion rate, total rejections, estimated revenue lost
  - Compute per-cluster deltas: for each reason code, show count change and revenue impact change
  - Identify "flipped" visits: same profile + same product, different outcome — these are the proof points
- [ ] Build the before/after comparison UI (`src/components/dashboard/BeforeAfterComparison.tsx`):
  - Summary delta bar: conversion rate change (e.g., "37% → 68% (+31pp)"), revenue recovered
  - Side-by-side or stacked cluster comparison: each reason code shows old count vs. new count with a delta badge
  - Bar chart overlay (Recharts) comparing rejection distributions before and after
- [ ] Build the trace comparison view:
  - For "flipped" visits (reject → purchase), show both traces side by side
  - Highlight the divergence point — the step where the old trace rejected but the new trace continued to purchase
  - Link to these from the comparison summary (e.g., "18 agents changed from REJECT to PURCHASE — view examples")
- [ ] Wire the full optimization loop end-to-end:
  - Dashboard shows recommendations → user applies fix → preview → confirm → storefront updates → re-simulation runs → live feed plays → new dashboard loads with before/after comparison visible
  - Ensure the comparison persists until a new unrelated simulation is started

---

## Dependency Graph

```
Phase 1 ─── Phase 2 ─── Phase 3 ─── Phase 4 ─── Phase 5 ─── Phase 6
  (infra)    (data/UI)   (profiles)   (engine)    (dashboard)  (traces)
                                         │
                                         └──── Phase 7 ─── Phase 8
                                              (actions)    (compare)
```

Phases 1–4 are strictly sequential — each builds on the last. After Phase 5, Phases 6 and 7 can be worked in parallel (traces and recommendations are independent). Phase 8 depends on Phase 7 (actions must exist to compare before/after).
