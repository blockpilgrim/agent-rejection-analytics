"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { FlippedVisit } from "@/lib/simulation/comparator";
import type { ReasoningStep } from "@/lib/types";

// ---------------------------------------------------------------------------
// Trace Comparison — side-by-side view of two reasoning traces
//
// Shows both traces for a "flipped" visit where the same profile + product
// reached a different outcome. Highlights the divergence point.
// ---------------------------------------------------------------------------

export function TraceComparison({
  flippedVisit,
}: {
  flippedVisit: FlippedVisit;
}) {
  const [expanded, setExpanded] = useState(false);
  const { beforeVisit, afterVisit, direction, divergenceStep } = flippedVisit;
  const isImproved = direction === "improved";

  return (
    <div
      className={`rounded-md border text-sm ${
        isImproved
          ? "border-emerald-500/25"
          : "border-red-500/25"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={
                isImproved
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 text-[10px]"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-0 text-[10px]"
              }
            >
              {isImproved ? "REJECT -> PURCHASE" : "PURCHASE -> REJECT"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Profile: {beforeVisit.buyerProfileId} | Product:{" "}
              {beforeVisit.productId}
            </span>
          </div>
          {beforeVisit.reasonSummary && isImproved && (
            <p className="mt-1 text-xs text-muted-foreground">
              Previously rejected:{" "}
              <span className="italic">{beforeVisit.reasonSummary}</span>
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Hide traces" : "Compare traces"}
        </button>
      </div>

      {/* Side-by-side traces */}
      {expanded && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Before trace */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-0 text-[10px]">
                  {isImproved ? "REJECT" : "PURCHASE"}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Before
                </span>
              </div>
              {beforeVisit.mandate && (
                <p className="text-[11px] text-muted-foreground mb-2 italic">
                  &quot;{beforeVisit.mandate}&quot;
                </p>
              )}
              <TraceSteps
                steps={beforeVisit.reasoningTrace}
                divergenceStep={divergenceStep}
                side="before"
              />
            </div>

            {/* After trace */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 text-[10px]">
                  {isImproved ? "PURCHASE" : "REJECT"}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-medium">
                  After
                </span>
              </div>
              {afterVisit.mandate && (
                <p className="text-[11px] text-muted-foreground mb-2 italic">
                  &quot;{afterVisit.mandate}&quot;
                </p>
              )}
              <TraceSteps
                steps={afterVisit.reasoningTrace}
                divergenceStep={divergenceStep}
                side="after"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trace steps rendering with divergence highlighting
// ---------------------------------------------------------------------------

function TraceSteps({
  steps,
  divergenceStep,
  side,
}: {
  steps: ReasoningStep[] | null;
  divergenceStep: number | null;
  side: "before" | "after";
}) {
  if (!steps || steps.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        No reasoning trace available
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const isDivergence = divergenceStep !== null && idx === divergenceStep;
        const isAfterDivergence =
          divergenceStep !== null && idx >= divergenceStep;
        const isLastStep = idx === steps.length - 1;

        return (
          <div
            key={step.step}
            className={`rounded px-2 py-1.5 text-[11px] ${
              isDivergence
                ? side === "after"
                  ? "bg-emerald-500/8 border border-emerald-500/25"
                  : "bg-red-500/8 border border-red-500/25"
                : isAfterDivergence
                ? "bg-muted/30"
                : isLastStep
                ? side === "before"
                  ? "bg-red-500/5 border border-border"
                  : "bg-emerald-500/5 border border-border"
                : ""
            }`}
          >
            <div className="flex items-start gap-1.5">
              <span
                className={`shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                  isDivergence
                    ? side === "after"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-500/20 text-red-700 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.step}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.action}</p>
                <p className="text-muted-foreground">{step.dataEvaluated}</p>
                <p
                  className={`mt-0.5 ${
                    isDivergence ? "font-semibold" : ""
                  }`}
                >
                  {step.outcome}
                </p>
              </div>
            </div>
            {isDivergence && (
              <p className="mt-1 text-[10px] font-semibold text-primary">
                ^ Divergence point
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
