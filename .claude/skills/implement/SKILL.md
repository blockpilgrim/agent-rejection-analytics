---
name: implement
description: Fast build → spot-check → ship workflow for sequenced phase execution
argument-hint: phase <number or description>
---

Implement fast for: $ARGUMENTS

This is a demo app. Prioritize speed over ceremony. Follow these steps:

## Step 1 — Build
Use the **builder** subagent to implement: $ARGUMENTS

Pass the builder the full text of the phase from `docs/IMPLEMENTATION-PLAN.md` so it knows exactly what to build.

Wait for it to complete and note its summary.

## Step 2 — Test (core infra only)
Invoke the **test-writer** subagent ONLY if the implementation touches core infrastructure — database schemas/queries, auth flows, API client wrappers, shared utilities used across many features, or data pipeline plumbing.

**Skip** for everything else: UI components, page layouts, charts, dashboards, configuration, feature wiring, formatting, styling. Note that you skipped and why.

## Step 3 — Quick Review & Ship
Review the builder's changes yourself (do NOT use the code-reviewer subagent). Keep it fast:
1. Scan for **security issues** (injection, exposed secrets, broken auth)
2. Scan for **crashes** (unhandled nulls on critical paths, missing imports, obvious runtime errors)
3. Fix anything found, commit

Skip nitpicks, style, naming, docs, and convention updates — this is a demo.

## Step 4 — Finalize
1. **Update progress** in `docs/IMPLEMENTATION-PLAN.md` — mark the completed phase as done (`- [x]`)

2. **Append a handoff entry** to `docs/HANDOFF.md` (create the file if it doesn't exist). Use this format:

   ```
   ## Phase <N> — <title> (YYYY-MM-DD)
   **Built:** <1-3 sentence summary of what was implemented>
   **Deviations:** <any differences from the plan, or "None">
   **Landmines:** <gotchas, shortcuts, hardcoded values, or unfinished edges the next phase should know about, or "None">
   **Depends on:** <anything the next phase must have in place before starting, or "Nothing beyond what's in the plan">
   ```

   Keep each entry short. Only note things a future agent can't easily discover from the code or plan.

3. Provide a **brief summary** to the user: what was built, files touched, anything to watch out for
