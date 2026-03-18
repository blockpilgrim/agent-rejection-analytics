"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveFeed } from "@/components/simulation/LiveFeed";

const VISIT_OPTIONS = [25, 50, 100, 200] as const;

interface RerunConfig {
  previousRunId: string;
  visitCount: number;
}

export function SimulationConfig({
  onSimulationComplete,
  rerunConfig,
}: {
  onSimulationComplete?: (runId: string) => void;
  rerunConfig?: RerunConfig | null;
}) {
  const [visitCount, setVisitCount] = useState<number>(25);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simKey, setSimKey] = useState(0); // force LiveFeed remount on new sim
  const [previousRunId, setPreviousRunId] = useState<string | null>(null);
  const lastRerunRef = useRef<string | null>(null);

  // Auto-start when rerunConfig changes
  useEffect(() => {
    if (rerunConfig && rerunConfig.previousRunId !== lastRerunRef.current) {
      lastRerunRef.current = rerunConfig.previousRunId;
      setVisitCount(rerunConfig.visitCount);
      setPreviousRunId(rerunConfig.previousRunId);
      setIsSimulating(true);
      setSimKey((k) => k + 1);
    }
  }, [rerunConfig]);

  function handleStartSimulation() {
    setPreviousRunId(null);
    setIsSimulating(true);
    setSimKey((k) => k + 1);
  }

  function handleComplete(runId: string) {
    if (onSimulationComplete) {
      onSimulationComplete(runId);
    }
  }

  function handleReset() {
    setIsSimulating(false);
    setPreviousRunId(null);
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Run Simulation
            {previousRunId && isSimulating && (
              <Badge className="bg-primary/15 text-primary text-[10px] border-0">
                Re-run (comparing against previous)
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            We&rsquo;ll send {visitCount} AI shopping agents — each with
            different buyer priorities — to evaluate your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Visit Count</label>
            <div className="flex gap-1.5">
              {VISIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setVisitCount(n)}
                  disabled={isSimulating}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium font-mono transition-colors ${
                    visitCount === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  } ${isSimulating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              More visits produce more statistically significant results but take
              longer to simulate.
            </p>
          </div>

          {!isSimulating && (
            <button
              onClick={handleStartSimulation}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:translate-y-px"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Simulate {visitCount} Agent Visits
            </button>
          )}

          {isSimulating && (
            <button
              onClick={handleReset}
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-muted active:translate-y-px"
            >
              New Simulation
            </button>
          )}
        </CardContent>
      </Card>

      {isSimulating && (
        <LiveFeed
          key={simKey}
          visitCount={visitCount}
          previousRunId={previousRunId ?? undefined}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
