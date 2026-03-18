"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReasoningTrace } from "@/components/dashboard/ReasoningTrace";
import type { ReasoningStep } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types matching the SSE payloads from /api/simulate
// ---------------------------------------------------------------------------

interface RunningTotals {
  purchases: number;
  rejections: number;
  errors: number;
  completed: number;
  total: number;
}

interface VisitEvent {
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
  reasoningTrace: ReasoningStep[] | null;
  error: string | null;
  runningTotals: RunningTotals;
}

interface CompletionData {
  runId: string;
  totalVisits: number;
  purchases: number;
  rejections: number;
  errors: number;
  conversionRate: number;
  estimatedRevenueLost: number;
}

type SimulationState = "idle" | "running" | "completed" | "error";

// ---------------------------------------------------------------------------
// LiveFeed component
// ---------------------------------------------------------------------------

export function LiveFeed({
  visitCount,
  previousRunId,
  onComplete,
}: {
  visitCount: number;
  previousRunId?: string;
  onComplete?: (runId: string) => void;
}) {
  const [state, setState] = useState<SimulationState>("idle");
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [totals, setTotals] = useState<RunningTotals>({
    purchases: 0,
    rejections: 0,
    errors: 0,
    completed: 0,
    total: visitCount,
  });
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startSimulation = useCallback(async () => {
    setState("running");
    setVisits([]);
    setCompletion(null);
    setErrorMsg(null);
    setTotals({
      purchases: 0,
      rejections: 0,
      errors: 0,
      completed: 0,
      total: visitCount,
    });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefrontId: "sf_001",
          visitCount,
          ...(previousRunId ? { previousRunId } : {}),
        }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const parts = buffer.split("\n\n");
        // Keep the last incomplete chunk in the buffer
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let eventType = "";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              data = line.slice(6);
            }
          }

          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (eventType === "visit") {
              const visit = parsed as VisitEvent;
              setVisits((prev) => [...prev, visit]);
              setTotals(visit.runningTotals);
            } else if (eventType === "complete") {
              setCompletion(parsed as CompletionData);
              setState("completed");
            } else if (eventType === "error") {
              setErrorMsg(parsed.error);
              setState("error");
            }
            // "init" event is informational, no action needed
          } catch {
            // ignore malformed JSON
          }
        }
      }

      // If we exited the loop without a complete event, mark as completed
      setState((prev) => (prev === "running" ? "completed" : prev));
    } catch (err: unknown) {
      if (abort.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState("error");
    }
  }, [visitCount, previousRunId]);

  // Auto-start simulation on mount
  useEffect(() => {
    if (state === "idle") {
      startSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll only if user is already near the bottom (don't hijack scroll)
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Only auto-scroll if within 80px of bottom (user hasn't scrolled up to browse)
    if (distFromBottom < 80) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visits.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const progressPercent =
    totals.total > 0
      ? Math.round((totals.completed / totals.total) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {state !== "idle" && (
        <>
          {/* Running tally */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium">
                  Purchases:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {totals.purchases}
                  </span>
                </span>
                <span className="text-foreground/20">|</span>
                <span className="font-medium">
                  Rejections:{" "}
                  <span className="text-red-600 dark:text-red-400 font-mono">
                    {totals.rejections}
                  </span>
                </span>
                {totals.errors > 0 && (
                  <>
                    <span className="text-foreground/20">|</span>
                    <span className="font-medium">
                      Errors:{" "}
                      <span className="text-amber-600 dark:text-amber-400 font-mono">
                        {totals.errors}
                      </span>
                    </span>
                  </>
                )}
                <span className="text-foreground/20">|</span>
                <span className="font-medium font-mono">
                  {totals.completed}/{totals.total}
                </span>
              </div>
              <div className="mt-2.5">
                <Progress value={progressPercent} />
              </div>
            </CardContent>
          </Card>

          {/* Visit feed */}
          <Card className={state === "running" ? "ring-1 ring-primary/20" : ""}>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                {state === "running"
                  ? "Live Feed"
                  : state === "completed"
                  ? "Simulation Results"
                  : "Simulation Error"}
                {state === "running" && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Simulation in progress...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={feedRef}
                className="max-h-[420px] space-y-1 overflow-y-auto pr-1"
              >
                {visits.map((v) => (
                  <VisitRow key={`${v.sequenceNumber}-${v.productId}`} visit={v} />
                ))}

                {state === "running" && visits.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    Starting simulation...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Completion summary */}
          {state === "completed" && completion && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Simulation Complete</h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversion Rate</p>
                    <p className="text-base font-bold font-mono">
                      {(completion.conversionRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Purchases</p>
                    <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {completion.purchases}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rejections</p>
                    <p className="text-base font-bold font-mono text-red-600 dark:text-red-400">
                      {completion.rejections}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Est. Revenue Lost
                    </p>
                    <p className="text-base font-bold font-mono">
                      ${(completion.estimatedRevenueLost / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                {onComplete && completion && (
                  <Button
                    onClick={() => onComplete(completion.runId)}
                    size="default"
                    className="mt-3 gap-2 shadow-md"
                  >
                    View Dashboard
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Error state */}
          {state === "error" && errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-xs text-red-600 dark:text-red-400">
                Simulation failed: {errorMsg}
              </p>
              <Button
                onClick={() => setState("idle")}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual visit row
// ---------------------------------------------------------------------------

function VisitRow({ visit }: { visit: VisitEvent }) {
  const [showTrace, setShowTrace] = useState(false);
  const priceFormatted = `$${(visit.productPrice / 100).toFixed(2)}`;
  const hasTrace =
    visit.reasoningTrace != null && visit.reasoningTrace.length > 0;

  return (
    <div className={`rounded-md border animate-in fade-in slide-in-from-bottom-1 duration-300 ${visit.outcome === "purchase" ? "border-emerald-500/20 bg-emerald-500/[0.03]" : visit.outcome === "reject" ? "border-red-500/15" : "border-amber-500/15"}`}>
      <div className="flex items-start gap-2.5 p-2.5">
        {/* Outcome badge — fixed width so text content aligns across rows */}
        <div className="shrink-0 pt-0.5 w-[62px]">
          {visit.outcome === "purchase" ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-semibold text-[10px] border-0 h-4 w-full justify-center">
              PURCHASE
            </Badge>
          ) : visit.outcome === "reject" ? (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 font-semibold text-[10px] border-0 h-4 w-full justify-center">
              REJECT
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-semibold text-[10px] border-0 h-4 w-full justify-center">
              ERROR
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium truncate">{visit.productName}</span>
            <span className="shrink-0 text-muted-foreground font-mono">
              {priceFormatted}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{visit.profileName}</span>
            {visit.reasonCode && (
              <>
                <span className="text-foreground/20">&middot;</span>
                <span className="font-mono text-[10px]">
                  {visit.reasonCode}
                </span>
              </>
            )}
          </div>
          {visit.reasonSummary && (
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
              {visit.reasonSummary}
            </p>
          )}
          {hasTrace && (
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="mt-1 text-[10px] font-medium text-primary hover:underline"
            >
              {showTrace ? "Hide trace" : "View trace"}
            </button>
          )}
        </div>

        {/* Sequence */}
        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums font-mono">
          #{visit.sequenceNumber}
        </span>
      </div>

      {/* Reasoning trace panel */}
      {showTrace && hasTrace && (
        <div className="border-t border-border bg-muted/20 px-2.5 py-2.5">
          <ReasoningTrace
            mandate={visit.mandate}
            steps={visit.reasoningTrace!}
            outcome={visit.outcome}
            reasonCode={visit.reasonCode}
          />
        </div>
      )}
    </div>
  );
}
