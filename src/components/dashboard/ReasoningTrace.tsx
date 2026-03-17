"use client";

import type { ReasoningStep } from "@/lib/types";

// ---------------------------------------------------------------------------
// ReasoningTrace — vertical timeline of an agent's evaluation steps
//
// Displays the agent mandate, numbered reasoning steps, and highlights
// the final decision step with a colored border (green=purchase, red=reject).
// ---------------------------------------------------------------------------

interface ReasoningTraceProps {
  mandate: string | null;
  steps: ReasoningStep[];
  outcome: "purchase" | "reject" | "error";
  reasonCode: string | null;
}

export function ReasoningTrace({
  mandate,
  steps,
  outcome,
  reasonCode,
}: ReasoningTraceProps) {
  if (steps.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        No reasoning trace available for this visit.
      </div>
    );
  }

  const lastStepNumber = steps[steps.length - 1]?.step ?? steps.length;

  return (
    <div className="space-y-3">
      {/* Agent mandate */}
      {mandate && (
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Mandate
          </p>
          <p className="mt-0.5 text-xs">{mandate}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />

        {steps.map((step, idx) => {
          const isDecisionStep = step.step === lastStepNumber;
          const borderColor = isDecisionStep
            ? outcome === "reject"
              ? "border-red-400 dark:border-red-600"
              : outcome === "purchase"
              ? "border-green-400 dark:border-green-600"
              : "border-yellow-400 dark:border-yellow-600"
            : "border-border";

          return (
            <div key={step.step} className="relative pb-3 last:pb-0">
              {/* Step dot */}
              <div
                className={`absolute -left-6 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${
                  isDecisionStep
                    ? outcome === "reject"
                      ? "border-red-500 bg-red-100 dark:border-red-400 dark:bg-red-900/40"
                      : outcome === "purchase"
                      ? "border-green-500 bg-green-100 dark:border-green-400 dark:bg-green-900/40"
                      : "border-yellow-500 bg-yellow-100 dark:border-yellow-400 dark:bg-yellow-900/40"
                    : "border-muted-foreground/40 bg-background"
                }`}
              />

              {/* Step content */}
              <div
                className={`rounded-md border ${borderColor} ${
                  isDecisionStep ? "border-2" : ""
                } bg-background px-3 py-2`}
              >
                {/* Step header */}
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold tabular-nums">
                    {step.step}
                  </span>
                  <span className="text-xs font-medium">{step.action}</span>
                  {isDecisionStep && (
                    <span
                      className={`ml-auto text-[10px] font-semibold uppercase ${
                        outcome === "reject"
                          ? "text-red-600 dark:text-red-400"
                          : outcome === "purchase"
                          ? "text-green-600 dark:text-green-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      Decision
                    </span>
                  )}
                </div>

                {/* Data evaluated */}
                <div className="mt-1.5 text-[11px]">
                  <span className="font-medium text-muted-foreground">
                    Evaluated:{" "}
                  </span>
                  <span>{step.dataEvaluated}</span>
                </div>

                {/* Outcome */}
                <div className="mt-1 text-[11px]">
                  <span className="font-medium text-muted-foreground">
                    Finding:{" "}
                  </span>
                  <span
                    className={
                      isDecisionStep && outcome === "reject"
                        ? "font-medium text-red-700 dark:text-red-400"
                        : ""
                    }
                  >
                    {step.outcome}
                  </span>
                </div>

                {/* Rejection constraint callout */}
                {isDecisionStep && outcome === "reject" && reasonCode && (
                  <div className="mt-2 rounded bg-red-50 px-2 py-1.5 dark:bg-red-950/30">
                    <p className="text-[10px] font-semibold text-red-700 dark:text-red-400">
                      Blocking constraint: {reasonCode.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
