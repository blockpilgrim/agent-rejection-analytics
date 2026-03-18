# Agent Rejection Analytics

Diagnostic tool for e-commerce merchants to understand why AI shopping agents silently reject their store — and what to fix.

## What It Does

Commerce is shifting. Instead of humans browsing storefronts, AI shopping agents evaluate catalogs programmatically — comparing against consumer constraints like budget, delivery speed, sustainability certifications, and return policies — then making purchase decisions in milliseconds. When an agent rejects a merchant, there's no page view, no abandoned cart, no signal at all. The merchant's existing analytics stack is completely blind to it.

Agent Rejection Analytics fills that gap. It simulates batches of AI shopping agent visits against a merchant's product catalog, captures structured rejection reasoning, clusters rejections by root cause, and recommends specific fixes. Then it lets merchants apply those fixes and measure the impact — closing the loop from diagnosis to intervention to verified result.

### The loop

1. **Simulate** — Send 25–200 AI agents (each with a distinct buyer persona) to evaluate the catalog. Watch decisions stream in real time via a live feed.
2. **Diagnose** — Rejection dashboard clusters results by reason code (shipping SLA, missing structured data, return policy, pricing, etc.), ranked by estimated revenue impact. Every rejection includes a step-by-step reasoning trace showing exactly where the agent's evaluation turned.
3. **Fix** — Each rejection cluster comes with a concrete recommended action. Apply it to the simulated storefront with one click.
4. **Verify** — Re-run the simulation and see a before/after comparison: conversion rate delta, revenue recovered, and reasoning traces showing where agent decisions flipped from reject to purchase.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, server components) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| AI | Claude via Vercel AI SDK — `generateObject` for structured agent decisions |
| Database | SQLite (better-sqlite3) with Drizzle ORM |
| Validation | Zod (schema-validated, typed agent output) |
| Charts | Recharts |
| Testing | Vitest (69 tests covering DB, aggregation, and simulation logic) |

The simulation engine uses Claude as each buyer agent. Six distinct buyer profiles (price-sensitive, speed-obsessed, brand-loyal, sustainability-first, spec-comparator, return-conscious) each have custom system prompts that enforce purchasing constraints. Agent decisions come back as typed, schema-validated objects — not free text — with a 10-code rejection taxonomy and step-by-step reasoning traces.

## Architecture

```
Merchant triggers simulation
        │
        ▼
┌─ Orchestrator ─────────────────────────────┐
│  Generates weighted visit queue             │
│  Dispatches via semaphore (8 concurrent)    │
│  Yields results as async generator → SSE    │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌─ Agent Caller ─────────────────────────────┐
│  Builds context prompt (product data,      │
│  storefront policies, buyer mandate)       │
│  Calls Claude via generateObject           │
│  Returns typed AgentDecision               │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌─ Aggregator ───────────────────────────────┐
│  Clusters rejections by reason code        │
│  Ranks by estimated revenue impact         │
│  Generates targeted fix recommendations    │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌─ Comparator ───────────────────────────────┐
│  Diffs before/after simulation runs        │
│  Computes conversion deltas + recovery     │
└────────────────────────────────────────────┘
```

Results stream via SSE as agents complete evaluations, so the live feed populates incrementally rather than waiting for the full batch.

## Getting Started

```bash
git clone <repo-url>
cd agent-rejection-analytics
npm install
```

Set up your environment:

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY
```

Seed the database and run:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000` and hit **Simulate 25 Agent Visits** to see it in action.

## Product Artifacts

The `/docs` directory contains the product thinking behind this build:

- **[PRODUCT.md](docs/PRODUCT.md)** — Full product specification: problem statement, personas, 10 feature definitions with acceptance criteria, user flows, success metrics
- **[BUILD-STRATEGY.md](docs/BUILD-STRATEGY.md)** — Technical architecture decisions and trade-offs
- **[IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md)** — Phased build plan across 9 phases
- **[HANDOFF.md](docs/HANDOFF.md)** — Phase-by-phase development notes and decisions

## Status

Working MVP. Built as a rapid prototype to explore how merchants might gain visibility into agent-mediated commerce — a problem space that doesn't have established tools or patterns yet.

The simulation engine, live feed, rejection analytics, fix recommendations, and before/after verification loop are all functional. Not a production system: local SQLite, no auth, seed data only. Designed to demonstrate the concept and the product thinking behind it.
