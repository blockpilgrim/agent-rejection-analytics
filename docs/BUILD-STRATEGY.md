# Agent Rejection Analytics — Build Strategy

## Tech Stack

### Framework: Next.js (App Router)

**Choice:** Next.js 15+ with the App Router and React 19.

**Why:** Next.js is the most mature React meta-framework with the strongest ecosystem for dashboard-style applications. It gives us server components for fast initial loads, API routes for our simulation backend, and streaming support for the live feed — all in one framework. The tight integration with the Vercel AI SDK (our LLM interface layer) and free-tier Vercel deployment makes this the lowest-friction path from development to production. Alternatives like Remix offer smaller bundles and TanStack Start offers better type-safe routing, but neither has the ecosystem depth or deployment simplicity we need for an MVP.

**Trade-off:** We accept heavier dev-server startup times and Vercel coupling in exchange for ecosystem maturity and deployment simplicity.

### AI Integration: Claude API via Vercel AI SDK

**Choice:** Anthropic Claude API (claude-sonnet-4-20250514 for simulations) accessed through the Vercel AI SDK.

**Why:** The user's preference for Claude API aligns with our needs perfectly. Claude's structured output support and tool use capabilities let us define rigid output schemas for agent decisions (outcome, reason code, reasoning trace), ensuring consistent, parseable simulation results. The Vercel AI SDK provides a unified streaming interface (`streamText`, `streamObject`) that handles SSE transport, abort controllers, and error recovery — eliminating custom streaming infrastructure. Using Claude Sonnet balances cost with the reasoning quality needed for realistic buyer-agent simulations.

**Cost strategy:** For the live simulation feed (F4), we use real-time streaming API calls. For background re-runs or large batch simulations, we can optionally use Anthropic's Message Batches API for a 50% cost reduction on tokens, processing asynchronously within 24 hours.

**Trade-off:** We depend on a single LLM provider. The Vercel AI SDK's provider abstraction mitigates this — switching to another model requires changing two lines of code. We optimize for simulation quality and streaming UX over provider flexibility.

### UI Layer: shadcn/ui + Tailwind CSS

**Choice:** shadcn/ui component library with Tailwind CSS for styling.

**Why:** shadcn/ui is the leading React component library for 2025-2026. Its copy-paste model means zero runtime CSS overhead and full control over every component. Built on Radix UI primitives, it provides accessible, keyboard-navigable components out of the box — critical for the data-dense dashboard views (F5) and expandable reasoning traces (F6). Tailwind CSS eliminates style conflicts and makes responsive design straightforward.

**Trade-off:** We own the component code (it's copied in, not installed as a dependency), which means we maintain it. But for an MVP, this is an advantage — we can modify components freely without fighting library abstractions.

### Data Visualization: Recharts

**Choice:** Recharts for charts and data visualization.

**Why:** Recharts is composable, declarative, and easy to customize — three properties that matter more than raw performance for our use case. Our datasets are small (100-1000 simulation results per run), so SVG-per-datapoint scaling concerns don't apply. Recharts integrates naturally with React's component model and supports the chart types we need: bar charts for rejection clusters (F5), line/area charts for before/after comparisons (F9), and pie/donut charts for buyer profile distribution (F2). Tremor was considered for its dashboard focus, but Recharts gives us more control over custom visualizations without adopting Tremor's full design system.

**Trade-off:** We sacrifice Tremor's out-of-the-box dashboard aesthetics and Nivo's animation polish. We gain flexibility and a smaller dependency surface.

### Database: SQLite (via Turso for deployment)

**Choice:** SQLite for local development and Turso (LibSQL) for production deployment.

**Why:** This application is fundamentally a single-user simulation tool, not a multi-tenant SaaS. SQLite is the simplest database that handles our workload: storing a product catalog (~20-200 products), simulation results (~100-1000 per run), and storefront state snapshots for before/after comparison. There's no concurrent write contention — one user runs one simulation at a time. Turso provides hosted SQLite with a generous free tier (5GB storage, 500M row reads/month) and edge deployment, giving us production hosting without PostgreSQL infrastructure.

We use JSONB-style columns (SQLite supports JSON functions) for flexible product attributes and reasoning traces, avoiding rigid schemas for data that varies by product category.

**Trade-off:** We sacrifice PostgreSQL's richer JSONB indexing and concurrent write support. If the product evolves toward multi-tenancy or heavier write loads, PostgreSQL (via Supabase or Neon) is the upgrade path. For MVP, SQLite's simplicity and zero-infrastructure local development win.

### ORM: Drizzle ORM

**Choice:** Drizzle ORM for database access.

**Why:** Drizzle is TypeScript-first, SQL-transparent, and tiny (~7.4KB). It maps directly to SQL without hiding the query behind abstractions, which matters when we're debugging simulation storage queries or optimizing dashboard aggregations. It has excellent SQLite/Turso support and strong TypeScript inference from schema definitions. Prisma was considered but adds a heavier runtime, a separate schema language, and code generation steps — overhead that doesn't justify itself for an MVP with straightforward data access patterns.

**Trade-off:** Drizzle's v1.0 is still in beta (v0.45.x stable). We accept minor API instability in exchange for better developer experience, smaller bundle, and SQL transparency.

### Real-Time Transport: Server-Sent Events (SSE)

**Choice:** SSE for streaming simulation results to the frontend.

**Why:** Our real-time requirement is strictly unidirectional: the server streams simulation results to the client as they complete. SSE is purpose-built for this. It works over standard HTTP, auto-reconnects on failure, multiplexes efficiently over HTTP/2, and requires no special proxy/firewall configuration. The Vercel AI SDK uses SSE internally for LLM streaming, so our transport layer is consistent end-to-end. WebSockets would add bidirectional complexity we don't need, plus connection management overhead.

**Trade-off:** If we later need bidirectional features (collaborative editing, multi-user simulations), we'd need to add WebSockets alongside SSE. For MVP, unidirectional streaming is sufficient.

### Deployment: Vercel

**Choice:** Vercel for hosting (frontend + API routes).

**Why:** Vercel offers free-tier hosting with excellent Next.js support (unsurprising, since they build it). API routes handle our simulation orchestration. The main constraint is that Vercel Functions have execution time limits (60s on free tier, 300s on Pro), which we need to work around for long-running simulations. We handle this by streaming results incrementally rather than waiting for all 100 simulations to complete.

**Trade-off:** Vercel's serverless model isn't ideal for long-running LLM orchestration. If simulation runs exceed function timeouts, we'd need to move the simulation engine to a persistent backend (Railway or Fly.io). For MVP with ~100 agent visits, incremental streaming within timeout limits is viable.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Storefront  │  │  Simulation  │  │   Rejection    │  │
│  │    View      │  │  Live Feed   │  │   Dashboard    │  │
│  │   (F1)       │  │   (F4)       │  │   (F5,F7,F10) │  │
│  └─────────────┘  └──────┬───────┘  └───────┬────────┘  │
│                          │                   │           │
│  ┌─────────────┐         │          ┌────────┴────────┐  │
│  │  Before/     │         │          │  Reasoning      │  │
│  │  After (F9)  │         │          │  Trace (F6)     │  │
│  └─────────────┘         │          └─────────────────┘  │
│                          │ SSE                           │
└──────────────────────────┼───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                      SERVER                              │
│                          │                               │
│  ┌───────────────────────┴────────────────────────────┐  │
│  │              Simulation Orchestrator                │  │
│  │                                                    │  │
│  │  1. Load storefront state + buyer profiles         │  │
│  │  2. Generate agent visit queue (profile × product) │  │
│  │  3. Fan out Claude API calls (concurrent)          │  │
│  │  4. Stream results to client via SSE               │  │
│  │  5. Persist results to database                    │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│           ┌───────────────┼───────────────┐              │
│           │               │               │              │
│  ┌────────┴───────┐ ┌────┴─────┐ ┌───────┴──────────┐   │
│  │  Claude API    │ │ Database │ │ Aggregation      │   │
│  │  (Anthropic)   │ │ (SQLite/ │ │ Engine           │   │
│  │                │ │  Turso)  │ │ (rejection       │   │
│  │  - Structured  │ │          │ │  clustering,     │   │
│  │    output      │ │          │ │  revenue calc,   │   │
│  │  - Streaming   │ │          │ │  recommendations)│   │
│  │  - Tool use    │ │          │ │                  │   │
│  └────────────────┘ └──────────┘ └──────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Request Flow: Simulation Run

1. **User triggers simulation** → POST `/api/simulate` with config (visit count, profile weights)
2. **Orchestrator builds visit queue** → Pairs buyer profiles with products based on weighted distribution
3. **Concurrent LLM calls begin** → Orchestrator sends requests to Claude API in batches of 5-10 (respecting rate limits), each with a buyer-profile system prompt and the product/storefront data as context
4. **Each completion streams to client** → As each Claude response completes, result is emitted via SSE to the live feed and written to the database
5. **Aggregation runs on completion** → After all visits complete, server computes rejection clusters, revenue estimates, and recommendations, then sends the aggregated dashboard data
6. **Client renders dashboard** → Transitions from live feed to rejection dashboard view

### Request Flow: One-Click Action (F8)

1. **User clicks action** → PATCH `/api/storefront` with the recommended change
2. **Server applies change** → Updates the storefront state, creates a snapshot of the pre-change state for comparison
3. **Auto-rerun triggers** → New simulation runs against updated storefront
4. **Before/after computed** → Server diffs current results against previous snapshot, computes deltas

---

## Data Architecture

### Core Models

```
Storefront
├── id
├── name
├── shipping_policies (JSON)     # { standard: "3 days", expedited: "1 day" }
├── return_policy (JSON)         # { window_days: 30, free: true, structured: false }
├── sustainability_claims (JSON) # { certified: false, claims: [...] }
├── created_at
└── updated_at

Product
├── id
├── storefront_id → Storefront
├── name
├── category
├── price (cents)
├── description (text)           # Free-text, varying quality
├── structured_specs (JSON)      # { wattage: 1200, capacity_oz: 64, ... }
├── brand
├── review_score (decimal)
├── review_count (integer)
├── stock_status (enum)          # in_stock, out_of_stock, limited
├── data_completeness_score      # Computed: 0.0-1.0
├── created_at
└── updated_at

BuyerProfile
├── id
├── name                         # "Price-Sensitive", "Speed-Obsessed", etc.
├── primary_constraint
├── system_prompt (text)         # The full prompt template for this persona
├── example_mandate (text)
├── default_weight (decimal)     # Distribution weight for simulation mix
└── parameters (JSON)            # { max_budget: 300, max_delivery_days: 2, ... }

SimulationRun
├── id
├── storefront_id → Storefront
├── storefront_snapshot (JSON)   # Full storefront state at time of simulation
├── total_visits
├── total_purchases
├── total_rejections
├── overall_conversion_rate
├── estimated_revenue_lost
├── profile_weights (JSON)       # The weight distribution used
├── previous_run_id → SimulationRun (nullable, for before/after)
├── created_at
└── status (enum)                # pending, running, completed, failed

AgentVisit
├── id
├── simulation_run_id → SimulationRun
├── buyer_profile_id → BuyerProfile
├── product_id → Product
├── mandate (text)               # The specific mandate generated for this visit
├── outcome (enum)               # purchase, reject
├── reason_code (enum, nullable) # SHIPPING_SLA_UNMET, PRICE_ABOVE_BUDGET, etc.
├── reason_summary (text)        # One-line human-readable reason
├── reasoning_trace (JSON)       # Array of { step, action, data_evaluated, outcome }
├── product_price (cents)        # Denormalized for revenue calc
├── created_at
└── sequence_number              # Order in the simulation for live feed

RejectionCluster
├── id
├── simulation_run_id → SimulationRun
├── reason_code (enum)
├── count
├── affected_profile_ids (JSON)  # Array of buyer profile IDs
├── affected_product_ids (JSON)  # Array of product IDs
├── estimated_revenue_impact (cents)
├── rank                         # By revenue impact
└── recommendation (JSON)        # { action, description, estimated_recovery }

StorefrontAction
├── id
├── simulation_run_id → SimulationRun
├── recommendation_source → RejectionCluster
├── action_type (text)           # "add_expedited_shipping", "structure_return_policy", etc.
├── change_preview (JSON)        # { before: {...}, after: {...} }
├── applied (boolean)
├── applied_at (timestamp, nullable)
└── reverted (boolean)
```

### Key Data Design Decisions

**Product attributes as hybrid schema:** Core fields (name, price, brand, stock) are typed columns for query performance. Variable attributes (specs, policies) use JSON columns. This mirrors the real-world problem — some data is structured, some isn't — and lets us realistically simulate data-quality issues that agents would encounter.

**Storefront snapshots for comparison:** Each SimulationRun stores a full JSON snapshot of the storefront state at the time of simulation. This makes before/after comparison stateless — we never need to reconstruct past states from a change log. Storage cost is minimal (a few KB per run for ~200 products).

**Denormalized revenue data on AgentVisit:** We store `product_price` directly on each visit record rather than joining to Products. This prevents stale-price bugs when the storefront changes between runs and simplifies revenue aggregation queries.

**Reasoning trace as structured JSON:** Each trace step is a structured object `{ step: number, action: string, data_evaluated: string, outcome: string }` rather than free text. This enables programmatic comparison of traces across runs (for the before/after divergence point feature in F9) while remaining human-readable.

---

## Key Decisions

### KD1: Single LLM Call Per Agent Visit vs. Multi-Step Agent

**Context:** Each simulated agent visit needs to evaluate a product against buyer constraints and produce a decision. We could either (a) make one Claude API call per visit with a detailed prompt that returns the full decision + reasoning trace, or (b) implement a multi-step agent that makes sequential tool calls to "browse" the catalog.

**Decision:** Single structured call per visit.

**Rationale:** The simulation doesn't need real agent autonomy — we're modeling the *outcome* of an agent evaluation, not building an actual shopping agent. A single call with a well-crafted prompt and structured output schema produces deterministic, consistent results. Multi-step agents would increase latency by 3-5x per visit, cost 2-4x more in tokens, and introduce non-determinism that breaks the "same input → same output" acceptance criterion (F3).

**Trade-off:** The reasoning trace is *generated* by Claude as a plausible evaluation sequence, not a record of actual step-by-step API interactions. This is fine for the demo/simulation context but wouldn't be appropriate if we were claiming to show actual agent behavior.

### KD2: Concurrent Simulation Calls with Rate Limiting

**Context:** Simulating 100 agent visits means 100 Claude API calls. We need to balance speed (users expect results in seconds, not minutes) against rate limits and cost.

**Decision:** Fan out calls in concurrent batches of 5-10 with a semaphore pattern, streaming results to the client as each completes.

**Rationale:** Claude API rate limits for Tier 1 allow ~50 requests/minute. Batches of 5-10 concurrent requests keep us well within limits while completing a 100-visit simulation in roughly 30-60 seconds. Each result streams to the live feed immediately on completion, so users see activity from the first second. This matches the F4 acceptance criteria (incremental, not all-at-once).

**Trade-off:** Simulations aren't instant. A 100-visit run takes 30-60 seconds. We accept this because the live feed makes the wait engaging, and instant results would require pre-computation that breaks the "real AI evaluation" value proposition.

### KD3: Prompt Architecture — System Prompt per Profile + Product Context

**Context:** We need Claude to role-play as different buyer agents evaluating products. The prompt design determines simulation quality.

**Decision:** Three-layer prompt structure:
1. **System prompt** (per buyer profile): Defines the agent's persona, priorities, constraints, and evaluation methodology. Includes the structured output schema.
2. **User message** (per visit): Contains the specific product data, storefront policies, and the buyer's mandate for this visit.
3. **Output schema** (via structured output): Enforces the response format — outcome, reason code, reason summary, and reasoning trace steps.

**Rationale:** Separating persona (system) from product data (user) lets us leverage Claude's prompt caching — the system prompt is identical across all visits for a given buyer profile, so subsequent calls within the same profile hit the cache (90% cost reduction on input tokens). Few-shot examples in the system prompt improve output consistency.

**Trade-off:** Prompt caching requires exact system prompt matches, which constrains prompt iteration — any change to a profile's prompt invalidates the cache. We accept this because profiles change rarely (they're pre-built archetypes).

### KD4: Revenue Estimation Methodology

**Context:** Revenue impact needs to feel credible without real transaction data. We need a methodology that's transparent and defensible.

**Decision:** `Estimated Revenue Impact = Rejection Count × Average Order Value of Affected Products`. Display the formula explicitly on the dashboard.

**Rationale:** This is the simplest formula that produces meaningful relative rankings between rejection clusters. We don't need absolute accuracy — we need merchants to understand *which problems cost the most*. Transparency (showing the calculation) prevents users from treating estimates as predictions.

**Trade-off:** This overestimates impact because it assumes every rejection would have been a purchase. More sophisticated models (conversion probability, competitive alternatives) add complexity without adding proportional insight for MVP.

### KD5: Storefront State Management — Snapshots vs. Event Sourcing

**Context:** We need to track storefront changes for before/after comparison (F9) and undo support (F8).

**Decision:** Simple snapshot model — store full storefront state as JSON on each SimulationRun.

**Rationale:** Event sourcing is architecturally elegant but overkill for our use case. We have ~200 products, a handful of policies, and users apply 2-3 changes per session. A full JSON snapshot is a few KB. Snapshots make before/after comparison trivial (diff two JSON objects) and undo straightforward (restore the previous snapshot). Event sourcing would require replay logic, schema versioning, and eventual consistency patterns — none of which justify themselves for an MVP simulation tool.

**Trade-off:** We sacrifice storage efficiency (duplicating full state per run) and granular change history. Both are irrelevant at MVP scale.

### KD6: Haiku for Aggregation, Sonnet for Simulation

**Context:** We have two distinct LLM workloads: (1) generating realistic agent evaluations (high reasoning quality needed) and (2) generating actionable recommendations from rejection clusters (pattern matching + natural language generation).

**Decision:** Use Claude Sonnet for individual agent visit simulations. Use Claude Haiku for recommendation generation and rejection clustering summaries.

**Rationale:** Agent evaluations need nuanced reasoning about product specs, policy interpretation, and realistic decision-making — Sonnet's sweet spot. Recommendations are pattern-based ("you had 38 shipping rejections → add expedited shipping") and don't need deep reasoning. Haiku is 10-20x cheaper and fast enough for this task.

**Trade-off:** Two model tiers add prompt management complexity. Worth it for cost optimization — recommendation generation is the lower-value LLM task and shouldn't consume the same budget as the core simulation.

---

## Testing Philosophy

### Unit Tests: Logic, Not LLM Calls

Test the deterministic parts of the system without mocking Claude:
- **Aggregation logic**: Given a set of AgentVisit results, do rejection clusters form correctly? Are revenue estimates calculated right? Are clusters ranked properly?
- **Storefront state management**: Do snapshots capture correctly? Do action applications produce the expected state changes? Does undo restore the previous state?
- **Profile weight distribution**: Given weights, does the visit queue distribute profiles correctly across N visits?
- **Data completeness scoring**: Given a product with certain fields populated/missing, is the score computed correctly?

### Integration Tests: LLM Output Contracts

Test that Claude API responses conform to our expected schemas:
- **Structured output validation**: Does the response parse into our expected TypeScript types? Are reason codes from the defined taxonomy? Are reasoning trace steps well-formed?
- **Determinism check**: Given the same storefront state and profile, do repeated calls produce the same outcome (purchase/reject)? Reason codes may vary in explanation but the decision should be consistent.
- **Edge cases**: What happens with minimal product data? Empty descriptions? Missing prices? The simulation should still produce valid results (likely with MISSING_STRUCTURED_DATA rejections).

These tests hit the real API (not mocked) but run infrequently — on CI nightly or before releases, not on every commit.

### E2E Tests: User Flows

Test the critical user flows from PRODUCT.md:
- **Flow 1**: Can a user trigger a simulation, watch the live feed, and see the rejection dashboard?
- **Flow 3**: Can a user apply a one-click action, see the storefront update, rerun the simulation, and view the before/after comparison?
- Playwright or Cypress for browser automation.

### What We Don't Test

- Visual regression of chart rendering (too brittle for MVP)
- Exact LLM output text (inherently variable)
- Performance benchmarks (premature at MVP scale)

---

## Performance Considerations

### LLM Latency Is the Bottleneck

The dominant latency in every user flow is Claude API response time (~2-5 seconds per call). Everything else — database queries, aggregation, rendering — is sub-100ms. Performance optimization should focus almost entirely on LLM call orchestration:

- **Concurrent batching** with semaphore keeps total simulation time at 30-60s for 100 visits
- **Streaming individual results** makes the wait feel productive (users see activity, not a spinner)
- **Prompt caching** reduces input token costs by ~90% for repeated profile prompts within a session

### Frontend Rendering

- **Virtualized live feed**: If simulation produces 100+ results, the feed should use windowing (react-window or similar) to avoid DOM bloat
- **Progressive dashboard rendering**: Show the rejection dashboard skeleton immediately, populate clusters as aggregation completes
- **Debounced chart updates**: During the live feed phase, don't re-render charts on every single result — batch updates on animation frames

### Database Performance

- **SQLite is not the bottleneck**: For our data volumes (hundreds of rows per simulation, not millions), SQLite handles reads and writes without issue
- **Avoid N+1 queries**: Load agent visits with their profiles and products in batch, not individually
- **JSON column queries**: Use SQLite JSON functions for querying structured specs and reasoning traces; add indexes only if profiling reveals a need

### Cost Performance

- **Sonnet for simulation, Haiku for summaries** (see KD6) keeps per-simulation costs manageable
- **Prompt caching** is the biggest cost lever — design prompts with stable system prompts and variable user messages
- **Batch API for reruns**: If a user applies multiple actions before rerunning, batch the simulation calls at 50% discount since the user is already waiting for a "processing" state
- **Estimate for 100-visit simulation**: ~$0.15-0.30 with Sonnet + caching, ~$0.02-0.05 for recommendation generation with Haiku
