// ---------------------------------------------------------------------------
// In-memory rate limiting for abuse prevention on public portfolio demo.
//
// On Vercel serverless, each instance has its own state — counters reset on
// cold start. This is fine for a demo: it still prevents sustained abuse
// within a warm instance's lifetime.
// ---------------------------------------------------------------------------

/** Sliding-window entry: timestamp of each event */
interface WindowEntry {
  timestamps: number[];
}

// ---------------------------------------------------------------------------
// Per-IP simulation rate limiter
// ---------------------------------------------------------------------------

const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SIMULATIONS_PER_IP = 5;
const ipSimulations = new Map<string, WindowEntry>();

/** Prune timestamps older than the window */
function pruneWindow(entry: WindowEntry, windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
}

/**
 * Check if an IP is allowed to start a new simulation.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkIpRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMs?: number;
  remaining?: number;
} {
  let entry = ipSimulations.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    ipSimulations.set(ip, entry);
  }

  pruneWindow(entry, IP_WINDOW_MS);

  if (entry.timestamps.length >= MAX_SIMULATIONS_PER_IP) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + IP_WINDOW_MS - Date.now();
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  return { allowed: true, remaining: MAX_SIMULATIONS_PER_IP - entry.timestamps.length };
}

/** Record that an IP started a simulation */
export function recordIpSimulation(ip: string): void {
  let entry = ipSimulations.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    ipSimulations.set(ip, entry);
  }
  entry.timestamps.push(Date.now());
}

// ---------------------------------------------------------------------------
// Global hourly API call budget
// ---------------------------------------------------------------------------

const GLOBAL_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_GLOBAL_API_CALLS = 300;
const globalApiCalls: WindowEntry = { timestamps: [] };

/** Check if the global API call budget has room for `needed` calls */
export function checkGlobalBudget(needed: number): {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
} {
  pruneWindow(globalApiCalls, GLOBAL_WINDOW_MS);
  const remaining = MAX_GLOBAL_API_CALLS - globalApiCalls.timestamps.length;

  if (remaining < needed) {
    const oldestInWindow = globalApiCalls.timestamps[0];
    const retryAfterMs = oldestInWindow
      ? oldestInWindow + GLOBAL_WINDOW_MS - Date.now()
      : 60_000;
    return {
      allowed: false,
      remaining: Math.max(remaining, 0),
      retryAfterMs: Math.max(retryAfterMs, 1000),
    };
  }

  return { allowed: true, remaining };
}

/** Record a single API call against the global budget */
export function recordApiCall(): void {
  globalApiCalls.timestamps.push(Date.now());
}

// ---------------------------------------------------------------------------
// Concurrent simulation lock
// ---------------------------------------------------------------------------

let activeSimulation = false;

export function acquireSimulationLock(): boolean {
  if (activeSimulation) return false;
  activeSimulation = true;
  return true;
}

export function releaseSimulationLock(): void {
  activeSimulation = false;
}

// ---------------------------------------------------------------------------
// Constants (exported for route-level validation)
// ---------------------------------------------------------------------------

export const LIMITS = {
  maxVisitCount: 50,
  maxSimulationsPerIp: MAX_SIMULATIONS_PER_IP,
  ipWindowMinutes: IP_WINDOW_MS / 60_000,
  maxGlobalApiCallsPerHour: MAX_GLOBAL_API_CALLS,
} as const;
