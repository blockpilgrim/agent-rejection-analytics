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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Run Simulation
            {previousRunId && isSimulating && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                Re-run (comparing against previous)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            We&rsquo;ll send {visitCount} AI shopping agents — each with
            different buyer priorities — to evaluate your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Visit Count</label>
            <div className="flex gap-2">
              {VISIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setVisitCount(n)}
                  disabled={isSimulating}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    visitCount === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  } ${isSimulating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              More visits produce more statistically significant results but take
              longer to simulate.
            </p>
          </div>

          {!isSimulating && (
            <button
              onClick={handleStartSimulation}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:translate-y-px"
            >
              Simulate {visitCount} Agent Visits
            </button>
          )}

          {isSimulating && (
            <button
              onClick={handleReset}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted active:translate-y-px"
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
