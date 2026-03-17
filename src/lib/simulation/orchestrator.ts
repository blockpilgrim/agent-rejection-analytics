import {
  callAgent,
  type CallAgentInput,
  type ProductData,
  type StorefrontContext,
  type AgentCallResult,
} from "./agent-caller";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimulationConfig {
  storefrontId: string;
  visitCount: number;
  concurrency?: number; // default 8
}

/** A single visit in the queue before execution. */
interface QueuedVisit {
  profileId: string;
  profileName: string;
  product: ProductData;
  mandate: string;
  sequenceNumber: number;
}

/** A completed visit result yielded from the orchestrator. */
export interface VisitResult {
  sequenceNumber: number;
  profileId: string;
  profileName: string;
  productId: string;
  productName: string;
  productPrice: number;
  mandate: string;
  outcome: "purchase" | "reject" | "error";
  reasonCode: string | null;
  reasonSummary: string | null;
  reasoningTrace: Array<{
    step: number;
    action: string;
    dataEvaluated: string;
    outcome: string;
  }> | null;
  error: string | null;
}

export interface ProfileInfo {
  id: string;
  name: string;
  weight: number;
  systemPrompt: string | null;
  exampleMandate: string | null;
  parameters: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Mandate generation
// ---------------------------------------------------------------------------

const MANDATE_TEMPLATES: Record<string, string[]> = {
  bp_001: [
    "Find me a product under ${budget} with at least 4-star reviews",
    "I need the cheapest option with good reviews (4+ stars, 5+ reviews)",
    "Look for a product in my budget of ${budget} that has strong customer ratings",
  ],
  bp_002: [
    "I need this delivered within 2 business days — what are my options?",
    "Find a product under ${budget} that ships fast, ideally next-day",
    "Speed is everything. Can I get this delivered by end of week?",
  ],
  bp_003: [
    "Only show me products from premium or well-known brands",
    "I only buy from trusted brands. What brand is this from?",
    "Is this from a reputable brand? I need brand assurance before purchasing",
  ],
  bp_004: [
    "I only buy from stores with verified sustainability certifications",
    "Does this product have any eco-friendly or Fair Trade certifications?",
    "Reject if there are no verifiable environmental claims",
  ],
  bp_005: [
    "I need full technical specs to compare — wattage, capacity, materials",
    "Compare this product's specifications against standard benchmarks",
    "Are the structured specs complete enough for automated comparison?",
  ],
  bp_006: [
    "I need at least a 30-day free return window, clearly stated",
    "Is the return policy machine-readable and customer-friendly?",
    "Only buy if the return policy is clearly documented with free returns",
  ],
};

function generateMandate(profileId: string, product: ProductData, params: Record<string, unknown> | null): string {
  const templates = MANDATE_TEMPLATES[profileId] ?? [
    "Evaluate this product according to your buying criteria",
  ];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Replace budget placeholder
  const budgetCents = params?.budgetCeiling as number | undefined;
  const budgetStr = budgetCents
    ? `$${(budgetCents / 100).toFixed(0)}`
    : "$300";

  return template
    .replace("${budget}", budgetStr)
    .replace("${product}", product.name);
}

// ---------------------------------------------------------------------------
// Visit queue generation
// ---------------------------------------------------------------------------

function generateVisitQueue(
  profiles: ProfileInfo[],
  products: ProductData[],
  visitCount: number
): QueuedVisit[] {
  // Weight-based distribution: profile.weight / totalWeight * visitCount
  const totalWeight = profiles.reduce((sum, p) => sum + p.weight, 0);

  // Calculate visit counts per profile based on weight
  const profileVisitCounts: { profile: ProfileInfo; count: number }[] = [];
  let assigned = 0;

  for (let i = 0; i < profiles.length; i++) {
    const proportion = profiles[i].weight / totalWeight;
    const count =
      i === profiles.length - 1
        ? visitCount - assigned // last profile gets remainder
        : Math.round(proportion * visitCount);
    profileVisitCounts.push({ profile: profiles[i], count });
    assigned += count;
  }

  // Build the queue: pair each profile's visits with products (round-robin)
  const queue: QueuedVisit[] = [];
  let seq = 1;

  for (const { profile, count } of profileVisitCounts) {
    for (let i = 0; i < count; i++) {
      const product = products[i % products.length];
      const mandate = generateMandate(
        profile.id,
        product,
        profile.parameters as Record<string, unknown> | null
      );
      queue.push({
        profileId: profile.id,
        profileName: profile.name,
        product,
        mandate,
        sequenceNumber: seq++,
      });
    }
  }

  // Shuffle to simulate realistic interleaving of different profiles
  shuffleArray(queue);

  // Re-assign sequence numbers after shuffle
  for (let i = 0; i < queue.length; i++) {
    queue[i].sequenceNumber = i + 1;
  }

  return queue;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------------------------------------------------------------------------
// Semaphore for concurrency control
// ---------------------------------------------------------------------------

class Semaphore {
  private current = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.limit) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) {
      this.current++;
      next();
    }
  }
}

// ---------------------------------------------------------------------------
// Orchestrator — async generator
// ---------------------------------------------------------------------------

export async function* runSimulation(
  config: SimulationConfig,
  profiles: ProfileInfo[],
  allProducts: ProductData[],
  storefront: StorefrontContext
): AsyncGenerator<VisitResult> {
  const concurrency = config.concurrency ?? 8;
  const visitQueue = generateVisitQueue(profiles, allProducts, config.visitCount);
  const semaphore = new Semaphore(concurrency);

  // We use a push/pull pattern: tasks push results into a buffer,
  // and the generator pulls from it.
  const resultBuffer: VisitResult[] = [];
  let resolveWaiter: (() => void) | null = null;
  let allTasksLaunched = false;
  let completedCount = 0;
  const totalCount = visitQueue.length;

  function pushResult(result: VisitResult) {
    resultBuffer.push(result);
    if (resolveWaiter) {
      const r = resolveWaiter;
      resolveWaiter = null;
      r();
    }
  }

  // Launch all tasks (they will self-throttle via semaphore)
  const tasks = visitQueue.map(async (visit) => {
    await semaphore.acquire();
    try {
      const callInput: CallAgentInput = {
        profileId: visit.profileId,
        product: visit.product,
        storefront,
        mandate: visit.mandate,
      };

      const result: AgentCallResult = await callAgent(callInput);

      const visitResult: VisitResult = {
        sequenceNumber: visit.sequenceNumber,
        profileId: visit.profileId,
        profileName: visit.profileName,
        productId: visit.product.id,
        productName: visit.product.name,
        productPrice: visit.product.price,
        mandate: visit.mandate,
        outcome: result.failed ? "error" : result.decision!.outcome,
        reasonCode: result.decision?.reasonCode ?? null,
        reasonSummary: result.decision?.reasonSummary ?? result.error,
        reasoningTrace: result.decision?.reasoningTrace ?? null,
        error: result.error,
      };

      pushResult(visitResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      pushResult({
        sequenceNumber: visit.sequenceNumber,
        profileId: visit.profileId,
        profileName: visit.profileName,
        productId: visit.product.id,
        productName: visit.product.name,
        productPrice: visit.product.price,
        mandate: visit.mandate,
        outcome: "error",
        reasonCode: null,
        reasonSummary: msg,
        reasoningTrace: null,
        error: msg,
      });
    } finally {
      semaphore.release();
      completedCount++;
    }
  });

  // Mark when all tasks have been queued
  Promise.all(tasks).then(() => {
    allTasksLaunched = true;
    // Wake up the generator if it's waiting
    if (resolveWaiter) {
      const r = resolveWaiter;
      resolveWaiter = null;
      r();
    }
  });

  // Yield results as they arrive
  while (true) {
    if (resultBuffer.length > 0) {
      yield resultBuffer.shift()!;
      continue;
    }

    // All done?
    if (allTasksLaunched && completedCount >= totalCount && resultBuffer.length === 0) {
      break;
    }

    // Wait for next result
    await new Promise<void>((resolve) => {
      resolveWaiter = resolve;
    });
  }
}
