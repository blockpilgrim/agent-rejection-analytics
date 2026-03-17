# Agent Rejection Analytics — Product Specification

## Vision

Commerce is shifting from human-browsed storefronts to API-evaluated catalogs where a consumer's AI agent silently decides whether to buy — or walk away. When an agent rejects a merchant, there is no page view, no abandoned cart, no signal at all. Agent Rejection Analytics gives merchants the missing analytics layer: a dashboard that captures, explains, and makes actionable the reasons AI shopping agents reject their store.

---

## Problem Statement

Today's e-commerce analytics stack is built entirely around human behavior signals — clicks, page views, scroll depth, cart abandonment. These tools assume a browser, a screen, and a person making decisions in real time.

In an agent-mediated commerce world, none of those signals exist. A consumer's AI agent evaluates a merchant's offerings programmatically, compares them against constraints set by the consumer (budget, delivery speed, sustainability, brand preference), and makes a purchase or moves on — all within milliseconds, all invisible to the merchant.

This creates a critical blind spot:

- **Merchants can't see agent traffic.** There is no equivalent of a "visit" in traditional analytics. An agent's evaluation leaves no trace unless the merchant explicitly instruments for it.
- **Merchants can't diagnose agent rejections.** Even if a merchant knows agents are evaluating their catalog, they have no way to understand _why_ agents are choosing competitors. The rejection reasons live inside the agent's decision logic, inaccessible to the merchant.
- **Merchants can't optimize for agents.** Without rejection data, merchants cannot make targeted changes to their catalog, pricing, policies, or data quality to win agent-mediated purchases. They are optimizing blind.
- **Existing analytics categories don't map.** Bounce rate, time on page, and conversion funnel analysis are meaningless when the "visitor" is a stateless API call that evaluates and decides in a single request.

Merchants need an entirely new analytics primitive: one that captures agent decision outcomes, surfaces the reasoning behind rejections, clusters rejections into actionable categories, and lets merchants measure the impact of changes — closing the loop from diagnosis to intervention to measurable result.

---

## Personas

### 1. Maya — Independent E-Commerce Merchant

**Background:** Maya runs a specialty kitchenware store with ~200 SKUs. She manages her own Shopify store, handles product listings personally, and relies on Google Analytics and Shopify's built-in reports for decision-making. She is tech-comfortable but not technical — she can navigate dashboards and follow recommendations but doesn't write code or manage APIs directly.

**Goals:**
- Understand why her store might lose sales in an agent-mediated commerce environment
- Get specific, actionable guidance on what to change — not abstract strategy
- See proof that a change actually works before committing time and resources to it

**Pain points:**
- Has no visibility into how AI agents evaluate her store — it's a total black box
- Doesn't know which aspects of her catalog data are machine-readable and which aren't
- Feels overwhelmed by the pace of AI-driven commerce shifts and doesn't know where to start
- Existing analytics tools don't surface anything useful about agent interactions

### 2. Derek — E-Commerce Operations Manager

**Background:** Derek manages digital operations for a mid-market home goods brand with ~2,000 SKUs across multiple categories. He oversees catalog data quality, shipping logistics, and conversion optimization. He reports to a VP of E-Commerce and needs to justify investments in tooling and process changes with data.

**Goals:**
- Quantify the revenue impact of agent-readiness gaps across the catalog
- Prioritize operational changes (shipping SLAs, return policies, data enrichment) by estimated revenue recovery
- Build a business case for investing in agent-commerce readiness

**Pain points:**
- Lacks a framework for evaluating agent-readiness — no benchmarks, no standards, no category norms exist yet
- Can't connect specific catalog data issues to revenue impact
- Needs to make the case to leadership that agent commerce matters _now_, before competitors gain an advantage
- Current tooling treats every conversion problem as a UX problem — nothing addresses the API/data layer

### 3. Priya — Product Catalog Manager

**Background:** Priya is responsible for product data quality at a large online retailer. She manages structured product attributes, descriptions, images, and metadata across thousands of SKUs. She works closely with both merchandising (what to feature) and engineering (what data to expose via API).

**Goals:**
- Identify specific product data gaps that cause agent rejections
- Understand which structured fields agents actually evaluate and weight most heavily
- Prioritize data enrichment work by business impact rather than completeness checklists

**Pain points:**
- Has no signal about which data quality issues actually cost revenue in an agent context — she's guessing
- Product data standards for agent consumption don't exist yet; she's working from human-facing guidelines that may not translate
- Enrichment work is expensive and slow — she needs to know where effort will have the highest return
- Can't distinguish between "nice-to-have" data completeness and "deal-breaker" missing fields

---

## Features

### MVP Features

#### F1: Simulated Merchant Storefront

**Description:** A pre-populated product catalog representing a realistic merchant store, complete with products, pricing, shipping policies, return policies, and structured/unstructured data of varying quality. The storefront serves as the environment that AI agents evaluate.

**User stories:**
- As a merchant, I want to see a storefront that resembles my own so the simulation results feel relevant and credible.
- As a merchant, I want the storefront to include realistic data quality issues (missing fields, unstructured policies, ambiguous specs) so I can see how agents react to imperfect data.

**Acceptance criteria:**
- Storefront includes at least 20 products across 3+ categories
- Products vary in data completeness: some have full structured specs, some have partial data, some have only free-text descriptions
- Shipping policies, return policies, and sustainability claims are present but vary in machine-readability
- The merchant can view the full catalog and its current state at any time

---

#### F2: Buyer Profile Archetypes

**Description:** A set of pre-built AI shopping agent personas, each representing a distinct consumer priority. Each profile defines the constraints and preferences the agent uses when evaluating a merchant's catalog.

**Profiles:**

| Profile | Primary Constraint | Example Mandate |
|---|---|---|
| **Price-Sensitive** | Lowest cost within requirements | "Find a stand mixer under $300 with at least 4-star reviews" |
| **Speed-Obsessed** | Fastest delivery | "Espresso machine under $500, delivered within 2 days" |
| **Brand-Loyal** | Specific brand or brand tier | "Only consider KitchenAid or Breville products" |
| **Sustainability-First** | Verified environmental claims | "Prefer products with certified sustainable sourcing; reject if no verifiable claims" |
| **Spec-Comparator** | Detailed feature comparison | "Compare blenders by motor wattage, jar capacity, and warranty length" |
| **Return-Conscious** | Low-risk purchase | "Only buy from merchants with free 30-day returns, clearly stated" |

**User stories:**
- As a merchant, I want to see how different types of buyers' agents evaluate my store so I can understand which customer segments I'm losing and why.
- As a merchant, I want each buyer profile's priorities to be clearly labeled so I understand what's driving each agent's decisions.

**Acceptance criteria:**
- At least 6 distinct buyer profiles are available
- Each profile displays its name, primary constraint, and an example mandate in plain language
- The simulation distributes agent visits across profiles in a realistic mix (not equal distribution — configurable weighting)
- Each agent decision in the dashboard is tagged with its buyer profile

---

#### F3: Agent Simulation Engine

**Description:** The core simulation capability. The merchant triggers a batch of AI shopping agent visits (e.g., "Simulate 100 Agent Visits") and the system runs each agent profile against the storefront catalog, producing a purchase or rejection decision with a structured reason for each visit.

**User stories:**
- As a merchant, I want to simulate a batch of agent visits with a single click so I can quickly see how agents interact with my store.
- As a merchant, I want to control the number of simulated visits so I can run quick checks or deeper analyses.

**Acceptance criteria:**
- Merchant can trigger a simulation of a configurable number of agent visits (default: 100)
- Each simulated visit produces a clear outcome: PURCHASE or REJECT
- Each rejection includes a structured reason code and a human-readable explanation
- Simulation results are deterministic for the same storefront state and configuration (re-running with no changes produces consistent results)

---

#### F4: Live Simulation Feed

**Description:** A real-time visualization that shows agent evaluation results populating as the simulation runs. Each entry appears as a card or row showing the agent profile, the product evaluated, the outcome (purchase/reject), and a summary reason.

**User stories:**
- As a merchant, I want to watch agent decisions appear in real time so the simulation feels tangible and engaging, not like a static report.
- As a merchant, I want to see at a glance which agents are buying and which are rejecting so I can immediately spot patterns.

**Acceptance criteria:**
- Results populate incrementally during simulation, not all at once after completion
- Each entry shows: buyer profile, product name, outcome (visually distinct: purchase vs. reject), and a one-line reason summary
- Feed is scrollable and remains accessible after simulation completes
- A running tally of total purchases vs. rejections updates as entries appear

---

#### F5: Rejection Dashboard

**Description:** An aggregated, prioritized view of all rejection reasons from a simulation run. Rejections are clustered by reason category and ranked by frequency and estimated revenue impact. This is the merchant's primary diagnostic view.

**User stories:**
- As a merchant, I want to see rejections grouped by cause so I can identify the biggest problems, not just individual incidents.
- As a merchant, I want rejection clusters ranked by impact so I know where to focus my effort first.
- As a catalog manager, I want to see which data quality issues are causing the most rejections so I can prioritize enrichment work.

**Acceptance criteria:**
- Rejections are clustered by reason code (e.g., SHIPPING_SLA_UNMET, MISSING_STRUCTURED_DATA, PRICE_ABOVE_BUDGET)
- Each cluster shows: reason category, count of rejections, affected buyer profiles, affected products, and estimated revenue impact
- Clusters are ranked by estimated revenue impact (highest first)
- Clicking a cluster expands to show the individual rejections within it
- Dashboard includes a summary bar showing overall conversion rate (purchases / total visits) and total estimated revenue lost to rejections

**Rejection reason taxonomy (MVP set):**

| Reason Code | Description |
|---|---|
| SHIPPING_SLA_UNMET | Delivery time exceeds agent's required timeframe |
| PRICE_ABOVE_BUDGET | Price exceeds the buyer's stated budget |
| MISSING_STRUCTURED_DATA | A required field is absent or not machine-readable |
| INSUFFICIENT_DESCRIPTION | Product description lacks specs needed for automated comparison |
| RETURN_POLICY_UNACCEPTABLE | Return policy missing, not machine-readable, or doesn't meet requirements |
| SUSTAINABILITY_UNVERIFIED | No verifiable sustainability claims when required |
| BRAND_MISMATCH | Product doesn't match brand preference or exclusion |
| REVIEW_SCORE_BELOW_THRESHOLD | Ratings/reviews below agent's minimum threshold |
| STOCK_UNAVAILABLE | Product out of stock or availability uncertain |
| API_FIELD_MISSING | Merchant data feed missing a field the agent expected to evaluate |

---

#### F6: Agent Reasoning Trace

**Description:** An expandable, step-by-step log showing exactly how a consumer agent evaluated the merchant's store for a specific visit. The trace reads like a decision chain, showing each evaluation step, the data the agent inspected, the constraint it checked, and where the decision was made (purchase or rejection).

**Example trace:**
> 1. _User mandate received: "Find an espresso machine under $500, delivered within 2 days, with at least 4.5-star equivalent reviews."_
> 2. _Queried merchant catalog. Found 3 matching products._
> 3. _Top candidate: ProBrew X9, $479, 4.7-star equivalent. Shipping SLA: 3 days._
> 4. _Shipping SLA fails user constraint (3 days > 2 days). Checking if expedited option exists._
> 5. _No expedited shipping field exposed in catalog data. Cannot verify faster option._
> 6. _Decision: REJECT. Reason code: SHIPPING_SLA_UNMET. Fallback: Evaluating next merchant._

**User stories:**
- As a merchant, I want to see the full reasoning chain for any rejection so I can understand exactly what went wrong and at which step.
- As a merchant, I want to see what data the agent looked at and what it expected to find so I can identify specific gaps in my catalog.
- As an operations manager, I want to compare reasoning traces across similar rejections to confirm the root cause before investing in a fix.

**Acceptance criteria:**
- Every simulated agent visit (purchase and rejection) has an expandable reasoning trace
- Each step in the trace shows: what the agent did, what data it evaluated, and the outcome of that step
- The step where the decision was made (purchase or rejection) is visually highlighted
- The specific constraint that caused a rejection is clearly identified in the trace
- Traces use plain language, not code or technical jargon

---

#### F7: Actionable Recommendations

**Description:** Each rejection cluster is paired with a specific, concrete merchant action. Recommendations are expressed as clear directives with estimated revenue recovery, ranked by impact. They translate diagnostic data into next steps.

**User stories:**
- As a merchant, I want each rejection cluster to come with a specific recommended action so I don't have to figure out the fix myself.
- As a merchant, I want recommendations ranked by estimated revenue recovery so I can prioritize the highest-impact changes.
- As an operations manager, I want recommendations to be specific enough to act on (not generic advice) so I can assign them to the right team.

**Example recommendations:**
- "Expose your return policy as a structured data field. Estimated recovery: 12 agent conversions → ~$2,400/simulation."
- "Add expedited shipping option to 'Espresso Machines' category. Estimated recovery: 38 agent conversions → ~$18,200/simulation."
- "Enrich product descriptions with comparison-ready specs (wattage, capacity, warranty). Estimated recovery: 7 agent conversions → ~$1,050/simulation."

**Acceptance criteria:**
- Every rejection cluster has at least one associated recommendation
- Each recommendation includes: a clear action statement, the rejection cluster it addresses, and an estimated revenue recovery figure
- Recommendations are ranked by estimated revenue recovery
- Recommendations are specific to the merchant's storefront data (not generic best practices)

---

#### F8: One-Click Merchant Actions

**Description:** The ability for a merchant to apply a recommended change to their simulated storefront directly from the dashboard. Clicking the action modifies the relevant storefront data (e.g., adding a structured return policy field, enabling an expedited shipping option, enriching a product description) so the simulation can be rerun against the updated state.

**User stories:**
- As a merchant, I want to apply a recommended fix with a single click so I can immediately test whether it works, without manual data editing.
- As a merchant, I want to see what the action will change before I apply it so I understand the modification.

**Acceptance criteria:**
- Each recommendation has a clearly labeled action button
- Clicking the button shows a preview of what will change (before → after for the affected data)
- After confirmation, the change is applied to the simulated storefront
- The storefront state reflects the change immediately
- Multiple actions can be applied before re-running the simulation
- Actions are reversible (merchant can undo an applied action)

---

#### F9: Before & After Comparison

**Description:** After a merchant applies one or more actions and reruns the simulation, the dashboard displays a side-by-side comparison of results before and after the changes. This includes shifts in rejection rates, conversion rates, rejection cluster sizes, and estimated revenue impact.

**User stories:**
- As a merchant, I want to see a clear before/after comparison so I can verify that my changes actually improved agent conversion.
- As a merchant, I want to see the revenue impact of my changes so I can quantify the value of each intervention.
- As an operations manager, I want to compare reasoning traces before and after a change so I can see exactly where the agent's decision flipped.

**Acceptance criteria:**
- Dashboard shows side-by-side or overlay comparison of: overall conversion rate, rejection count by cluster, and estimated revenue
- Each metric shows the delta (absolute and percentage change)
- Individual reasoning traces are comparable: the merchant can view a trace from the same agent profile/product combination before and after the change, with the divergence point highlighted
- The comparison persists until the merchant starts a new simulation or resets

---

#### F10: Revenue Impact Estimation

**Description:** Throughout the dashboard, rejection clusters, recommendations, and before/after comparisons are annotated with estimated revenue impact figures. These figures translate agent rejection counts into dollar-value estimates, making the business case tangible.

**User stories:**
- As a merchant, I want to see estimated revenue impact in dollars so I can understand the business value of fixing each issue.
- As an operations manager, I want revenue estimates to build a business case for investing in agent-readiness changes.

**Acceptance criteria:**
- Revenue estimates are displayed on: each rejection cluster, each recommendation, and the before/after comparison summary
- Estimates are derived from: number of rejections × average order value of affected products
- The estimation methodology is transparent — the merchant can see how the figure was calculated
- Revenue figures update dynamically when the merchant applies actions and reruns the simulation

---

### Post-MVP Features

#### F11: Custom Buyer Profiles

**Description:** Merchants can create, edit, and save custom buyer profiles beyond the pre-built archetypes. A custom profile lets the merchant define specific constraints, preferences, and weightings to simulate agent behavior tailored to their target customer segments.

**User stories:**
- As a merchant, I want to create a buyer profile that matches my actual customer segments so simulations reflect my real market.
- As an operations manager, I want to weight buyer profiles to match our traffic mix so revenue estimates are more accurate.

**Acceptance criteria:**
- Merchant can create a new buyer profile by specifying: name, primary constraint, budget range, delivery requirement, and any additional preferences
- Custom profiles appear alongside pre-built profiles in the simulation configuration
- Custom profiles can be edited and deleted
- Simulation results for custom profiles are displayed identically to pre-built profiles

---

#### F12: Custom Storefront Configuration

**Description:** Merchants can edit the simulated storefront's catalog directly — modifying products, pricing, policies, and data fields — rather than relying solely on one-click actions. This enables merchants to test arbitrary changes and model their actual store more closely.

**User stories:**
- As a merchant, I want to edit the simulated catalog to match my real store so results are directly applicable.
- As a catalog manager, I want to test how adding or removing specific data fields affects agent behavior so I can plan enrichment work.

**Acceptance criteria:**
- Merchant can add, edit, and remove products from the simulated catalog
- Merchant can modify product attributes: name, price, description, structured specs, images, stock status
- Merchant can edit store-level policies: shipping options/SLAs, return policy, sustainability certifications
- All changes are reflected in subsequent simulation runs
- A reset option restores the storefront to its default state

---

#### F13: Simulation History & Trends

**Description:** The dashboard tracks results across multiple simulation runs, allowing merchants to see how their agent conversion rate changes over time as they make iterative improvements. A timeline view shows the trajectory of key metrics across sessions.

**User stories:**
- As a merchant, I want to see my improvement trajectory over multiple sessions so I can track progress.
- As an operations manager, I want to export trend data so I can include it in leadership reports.

**Acceptance criteria:**
- Each simulation run is saved with a timestamp and a snapshot of the storefront state
- A timeline view shows conversion rate, rejection count, and estimated revenue across runs
- Merchants can compare any two historical runs side-by-side
- Data is exportable as CSV

---

#### F14: Agent Readiness Score

**Description:** A composite score (0–100) representing the merchant's overall readiness for agent-mediated commerce. The score is derived from simulation results and is broken down into sub-scores by category: data completeness, policy machine-readability, pricing competitiveness, fulfillment speed, and product discoverability.

**User stories:**
- As a merchant, I want a single number that tells me how "agent-ready" my store is so I have a benchmark to improve against.
- As an operations manager, I want sub-scores by category so I can assign improvement work to the right teams.

**Acceptance criteria:**
- Score is displayed prominently on the dashboard after each simulation
- Sub-scores are broken out by category with clear labels
- Score updates after each simulation run, reflecting the impact of changes
- Score includes a brief interpretation (e.g., "Your store is agent-ready for price-sensitive buyers but loses speed-obsessed and sustainability-focused segments")

---

#### F15: Competitive Benchmarking (Simulated)

**Description:** The simulation includes a set of synthetic competitor storefronts. After running a simulation, the merchant can see how their store's agent conversion rate compares to these simulated competitors, identifying where they lead and where they trail.

**User stories:**
- As a merchant, I want to see how my store compares to competitors in agent evaluations so I can identify my competitive gaps.
- As an operations manager, I want to know which rejection categories put us behind competitors so I can prioritize accordingly.

**Acceptance criteria:**
- At least 3 synthetic competitor storefronts are included, each with different strengths/weaknesses
- A comparison view shows the merchant's conversion rate vs. competitors, broken down by buyer profile
- For each buyer profile where the merchant trails, the dashboard shows the specific gap (e.g., "Competitor A wins speed-obsessed agents because their shipping SLA is 1 day vs. your 3 days")

---

#### F16: Exportable Reports

**Description:** Merchants can export simulation results, rejection analyses, recommendations, and before/after comparisons as formatted reports for sharing with teams, leadership, or external partners.

**User stories:**
- As an operations manager, I want to export a report summarizing our agent-readiness gaps and recommended actions so I can share it with leadership.
- As a merchant, I want to save a PDF of my before/after results so I can document the impact of changes.

**Acceptance criteria:**
- Export formats: PDF and CSV
- PDF report includes: simulation summary, rejection clusters, top recommendations, before/after comparison (if applicable), and agent readiness score
- CSV export includes raw simulation data: each agent visit with profile, product, outcome, reason code, and revenue estimate
- Reports include the date of the simulation and the storefront state at the time

---

## User Flows

### Flow 1: First Simulation — "What's Happening?"

The merchant's initial experience, designed to deliver an "aha moment" within minutes.

1. **Merchant arrives at the dashboard.** They see a simulated storefront overview showing the current catalog, policies, and data quality indicators.
2. **Merchant clicks "Simulate 100 Agent Visits."** A brief explanation appears: "We're sending 100 AI shopping agents — each with different buyer priorities — to evaluate your store."
3. **Live simulation feed activates.** Agent decisions appear one by one. Green entries (purchases) and red entries (rejections) populate the feed. A running counter shows the purchase/rejection split.
4. **Simulation completes.** The feed is replaced by (or transitions into) the Rejection Dashboard, with rejection clusters ranked by revenue impact. A summary headline reads something like: "63 of 100 agents rejected your store. Estimated missed revenue: $14,200."
5. **Merchant scans the rejection clusters.** The top cluster might read: "38 agents rejected due to SHIPPING_SLA_UNMET — your 3-day shipping didn't meet their 2-day requirement." The second might read: "12 agents rejected due to RETURN_POLICY_UNACCEPTABLE — your return policy is not machine-readable."
6. **Merchant understands the shape of the problem.** They now know that shipping speed and data quality are their two biggest agent-conversion barriers.

---

### Flow 2: Rejection Deep-Dive — "Why Exactly?"

The merchant investigates a specific rejection cluster to understand the root cause.

1. **Merchant clicks into the top rejection cluster** (e.g., SHIPPING_SLA_UNMET, 38 rejections).
2. **Cluster detail view opens.** It shows: the affected buyer profiles (mostly Speed-Obsessed), the affected products, and the recommended action.
3. **Merchant expands an individual rejection** to view its Agent Reasoning Trace.
4. **The trace reveals the full decision chain:** the agent's mandate, the products it found, the candidate it selected, the constraint check that failed (shipping SLA: 3 days > required 2 days), the fallback check (no expedited option found), and the final REJECT decision.
5. **Merchant now understands the precise failure point:** it's not that the product was wrong — it's that the shipping option wasn't fast enough AND the expedited option wasn't exposed in the data.
6. **Merchant reviews the recommended action** at the bottom of the cluster view: "Add expedited shipping option to your catalog. Estimated recovery: 38 conversions → ~$18,200."

---

### Flow 3: Take Action & Verify — "Did It Work?"

The merchant applies a fix and sees the impact.

1. **Merchant clicks the action button** on a recommendation (e.g., "Add expedited shipping option").
2. **A preview appears** showing what will change: "Shipping options will be updated from [Standard: 3 days] to [Standard: 3 days, Expedited: 1 day] for all products."
3. **Merchant confirms the action.** The storefront data is updated.
4. **Simulation reruns automatically.** The live feed shows agents re-evaluating the updated storefront.
5. **Before/After comparison appears.** The dashboard shows: conversion rate went from 37% to 68%. The SHIPPING_SLA_UNMET cluster dropped from 38 rejections to 2. Estimated revenue recovery: $17,400.
6. **Merchant opens a reasoning trace for a Speed-Obsessed agent** that previously rejected. The trace now shows: same mandate, same product candidate, but at step 4, the agent finds the expedited shipping option, verifies the 1-day SLA meets the 2-day constraint, and proceeds to PURCHASE. The divergence point from the previous trace is highlighted.
7. **Merchant sees proof the fix worked** — not just in aggregate numbers, but in the specific decision logic of the agents that changed their minds.

---

### Flow 4: Iterative Optimization — "What's Next?"

After the first fix, the merchant continues improving.

1. **The updated Rejection Dashboard shows remaining clusters.** The former #2 cluster (RETURN_POLICY_UNACCEPTABLE, 12 rejections) is now #1.
2. **Merchant dives into this cluster,** reviews the traces, and sees that agents couldn't parse the return policy because it was embedded in free text, not structured data.
3. **Merchant applies the recommended action:** "Expose return policy as structured fields (return window: 30 days, free returns: yes)."
4. **Simulation reruns.** Conversion rate climbs from 68% to 78%. Cumulative revenue recovery from both actions: $21,600.
5. **Merchant reviews the Agent Readiness indicators** (post-MVP: the Readiness Score) and decides whether to continue optimizing or pause.

---

## Success Metrics

### Primary Metrics

| Metric | Definition | Target |
|---|---|---|
| **Full Loop Completion Rate** | % of users who complete the full cycle: simulate → review rejections → apply action → verify improvement | > 70% of sessions |
| **Time to First Insight** | Time from landing on the dashboard to viewing the first rejection cluster | < 60 seconds |
| **Actions Taken Per Session** | Average number of one-click actions applied per session | >= 2 |
| **Before/After Verification Rate** | % of applied actions where the user views the before/after comparison | > 80% |

### Engagement Metrics

| Metric | Definition | Target |
|---|---|---|
| **Reasoning Trace Expansion Rate** | % of rejection entries where the user expands the full reasoning trace | > 40% |
| **Simulation Reruns Per Session** | Number of times the user reruns the simulation after applying actions | >= 2 |
| **Cluster Exploration Depth** | Average number of rejection clusters explored per session | >= 3 |
| **Session Duration** | Average time spent in a single dashboard session | 8–15 minutes |

### Insight Quality Metrics

| Metric | Definition | Target |
|---|---|---|
| **Action Success Rate** | % of applied actions that result in a measurable reduction in the targeted rejection cluster | > 90% |
| **Revenue Recovery Accuracy** | Correlation between estimated revenue recovery and actual simulation improvement | r > 0.85 |
| **Rejection Taxonomy Coverage** | % of simulated rejections that map to a defined reason code (vs. uncategorized) | > 95% |

### Comprehension Metrics

| Metric | Definition | Target |
|---|---|---|
| **Problem Articulation** | After one session, can the user describe in their own words what agent rejection analytics is and why it matters? (qualitative, via survey/interview) | > 85% affirmative |
| **Action Rationale Understanding** | When taking an action, can the user explain why that action addresses the rejection? (qualitative) | > 80% affirmative |
