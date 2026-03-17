# Implementation Handoff Log

## Phase 1 — Project Scaffolding & Infrastructure (2026-03-17)
**Built:** Next.js 15+ app with App Router, Tailwind CSS v4, shadcn/ui v4, Drizzle ORM + better-sqlite3, full 7-table database schema with migration, app layout shell with nav, Vercel AI SDK, and Recharts. Vitest configured with schema validation tests (21 passing).
**Deviations:** Used Next.js 16.1.7 (latest stable) and Tailwind CSS v4 / shadcn v4 instead of v3 — uses CSS-native config (`@theme inline`) rather than `tailwind.config.ts`.
**Landmines:** Prices/revenue stored in cents (integers) throughout the schema. DB defaults to `./data/local.db` relative to project root. On Node.js v25, `npx next build` fails due to a symlink resolution bug — use `node node_modules/next/dist/bin/next build` as a workaround (not an issue on Node 20/22 or in deployment).
**Depends on:** Nothing beyond what's in the plan.
