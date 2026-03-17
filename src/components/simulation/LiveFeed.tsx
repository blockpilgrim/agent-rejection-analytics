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
  onComplete,
}: {
  visitCount: number;
  onComplete?: () => void;
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
  }, [visitCount]);

  // Auto-start simulation on mount
  useEffect(() => {
    if (state === "idle") {
      startSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom as new visits arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
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
    <div className="space-y-4">
      {state !== "idle" && (
        <>
          {/* Running tally */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-medium">
                  Purchases:{" "}
                  <span className="text-green-600 dark:text-green-400">
                    {totals.purchases}
                  </span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium">
                  Rejections:{" "}
                  <span className="text-red-600 dark:text-red-400">
                    {totals.rejections}
                  </span>
                </span>
                {totals.errors > 0 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium">
                      Errors:{" "}
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {totals.errors}
                      </span>
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">|</span>
                <span className="font-medium">
                  Total: {totals.completed}/{totals.total}
                </span>
              </div>
              <div className="mt-3">
                <Progress value={progressPercent} />
              </div>
            </CardContent>
          </Card>

          {/* Visit feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {state === "running"
                  ? "Live Feed"
                  : state === "completed"
                  ? "Simulation Results"
                  : "Simulation Error"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={feedRef}
                className="max-h-[480px] space-y-2 overflow-y-auto pr-1"
              >
                {visits.map((v) => (
                  <VisitRow key={`${v.sequenceNumber}-${v.productId}`} visit={v} />
                ))}

                {state === "running" && visits.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                    Starting simulation...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Completion summary */}
          {state === "completed" && completion && (
            <Card className="border-green-200 dark:border-green-900">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Simulation Complete</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Conversion Rate</p>
                      <p className="text-lg font-bold">
                        {(completion.conversionRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchases</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {completion.purchases}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rejections</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {completion.rejections}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Est. Revenue Lost
                      </p>
                      <p className="text-lg font-bold">
                        ${(completion.estimatedRevenueLost / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {onComplete && (
                    <Button
                      onClick={onComplete}
                      variant="outline"
                      className="mt-2"
                    >
                      View Dashboard
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error state */}
          {state === "error" && errorMsg && (
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Simulation failed: {errorMsg}
                </p>
                <Button
                  onClick={() => setState("idle")}
                  variant="outline"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
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
  const priceFormatted = `$${(visit.productPrice / 100).toFixed(2)}`;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Outcome badge */}
      <div className="shrink-0 pt-0.5">
        {visit.outcome === "purchase" ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            PURCHASE
          </Badge>
        ) : visit.outcome === "reject" ? (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            REJECT
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            ERROR
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium truncate">{visit.productName}</span>
          <span className="shrink-0 text-muted-foreground">{priceFormatted}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{visit.profileName}</span>
          {visit.reasonCode && (
            <>
              <span>--</span>
              <span className="font-mono text-[11px]">{visit.reasonCode}</span>
            </>
          )}
        </div>
        {visit.reasonSummary && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {visit.reasonSummary}
          </p>
        )}
      </div>

      {/* Sequence */}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        #{visit.sequenceNumber}
      </span>
    </div>
  );
}
