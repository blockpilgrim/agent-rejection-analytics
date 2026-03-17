"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuyerProfileCards } from "@/components/simulation/buyer-profile-cards";
import { SimulationConfig } from "@/components/simulation/simulation-config";
import { RejectionDashboard } from "@/components/dashboard/RejectionDashboard";

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

  function handleSimulationComplete(runId: string) {
    setCompletedRunId(runId);
    setActiveTab("dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Understand why AI shopping agents reject your store and what to do
          about it.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-[3px] w-fit">
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
            <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-green-500" />
          )}
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === "simulation" && (
        <div className="space-y-8">
          {/* Simulation config */}
          <SimulationConfig onSimulationComplete={handleSimulationComplete} />

          {/* Buyer profiles */}
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
        </div>
      )}

      {activeTab === "dashboard" && completedRunId && (
        <RejectionDashboard runId={completedRunId} />
      )}

      {activeTab === "dashboard" && !completedRunId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Run a simulation first to see the rejection dashboard.
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
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-foreground/60 hover:text-foreground"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}
