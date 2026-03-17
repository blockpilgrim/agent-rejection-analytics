"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const VISIT_OPTIONS = [25, 50, 100, 200] as const;

export function SimulationConfig() {
  const [visitCount, setVisitCount] = useState<number>(100);

  return (
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
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  visitCount === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
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

        <Button disabled className="w-full sm:w-auto">
          Simulate {visitCount} Agent Visits
        </Button>
        <p className="text-xs text-muted-foreground">
          Simulation will be available once the engine is connected (Phase 4).
        </p>
      </CardContent>
    </Card>
  );
}
