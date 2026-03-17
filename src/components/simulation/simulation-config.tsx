"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveFeed } from "@/components/simulation/LiveFeed";

const VISIT_OPTIONS = [25, 50, 100, 200] as const;

export function SimulationConfig({
  onSimulationComplete,
}: {
  onSimulationComplete?: (runId: string) => void;
}) {
  const [visitCount, setVisitCount] = useState<number>(25);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simKey, setSimKey] = useState(0); // force LiveFeed remount on new sim

  function handleStartSimulation() {
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
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Run Simulation</CardTitle>
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
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
