"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { BuyerProfileCards } from "@/components/simulation/buyer-profile-cards";
import { SimulationConfig } from "@/components/simulation/simulation-config";
import { RejectionDashboard, type DashboardData } from "@/components/dashboard/RejectionDashboard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuyerProfile {
  id: string;
  name: string;
  primaryConstraint: string;
  systemPrompt: string | null;
  exampleMandate: string | null;
  defaultWeight: number;
  parameters: Record<string, string | number | boolean | string[] | null> | null;
}

type ActiveTab = "simulation" | "dashboard";

// ---------------------------------------------------------------------------
// Main dashboard with tab navigation
// ---------------------------------------------------------------------------

export function MainDashboard({ profiles }: { profiles: BuyerProfile[] }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("simulation");
  const [completedRunId, setCompletedRunId] = useState<string | null>(null);
  const [completedDashboardData, setCompletedDashboardData] = useState<DashboardData | null>(null);

  // Re-run state: when user clicks "Re-run Simulation" from the dashboard,
  // we pass these to SimulationConfig to auto-start with the right params
  const [rerunConfig, setRerunConfig] = useState<{
    previousRunId: string;
    visitCount: number;
  } | null>(null);

  const prevTabRef = useRef(activeTab);

  // Scroll to top when switching to dashboard tab
  useEffect(() => {
    if (activeTab === "dashboard" && prevTabRef.current !== "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  function handleSimulationComplete(runId: string, dashboardData?: unknown) {
    setCompletedRunId(runId);
    setCompletedDashboardData((dashboardData as DashboardData) ?? null);
    setActiveTab("dashboard");
    // Clear re-run config after completion
    setRerunConfig(null);
  }

  const handleRerunSimulation = useCallback(
    (previousRunId: string, visitCount: number) => {
      setRerunConfig({ previousRunId, visitCount });
      setActiveTab("simulation");
    },
    []
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Agentic Commerce
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Agent Rejection Analytics</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              AI shopping agents are evaluating your store right now — but traditional analytics can&rsquo;t see them.
              Simulate their visits, diagnose why they reject your store, apply fixes, and verify the impact.
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-[3px] w-fit border border-border/50">
        <TabButton
          active={activeTab === "simulation"}
          onClick={() => setActiveTab("simulation")}
        >
          Simulation Feed
        </TabButton>
        <TabButton
          active={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
          disabled={!completedRunId}
        >
          Rejection Dashboard
          {completedRunId && (
            <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === "simulation" && (
        <div className="space-y-6">
          {/* Buyer profiles — context before CTA */}
          {profiles.length > 0 ? (
            <BuyerProfileCards profiles={profiles} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No buyer profiles found. Run{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                    npm run db:seed
                  </code>{" "}
                  to set up the demo data.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Simulation config */}
          <SimulationConfig
            onSimulationComplete={handleSimulationComplete}
            rerunConfig={rerunConfig}
          />
        </div>
      )}

      {activeTab === "dashboard" && completedRunId && (
        <RejectionDashboard
          key={completedRunId}
          runId={completedRunId}
          initialData={completedDashboardData ?? undefined}
          onRerunSimulation={handleRerunSimulation}
        />
      )}

      {activeTab === "dashboard" && !completedRunId && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-muted-foreground">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <p className="font-medium text-foreground">No simulation data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Run a simulation from the{" "}
              <button
                onClick={() => setActiveTab("simulation")}
                className="text-primary hover:underline font-medium"
              >
                Simulation Feed
              </button>{" "}
              tab to see rejection analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-background text-primary shadow-sm font-semibold"
          : "text-foreground/60 hover:text-foreground"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}
