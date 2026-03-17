"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REASON_CODE_LABELS, type ReasonCode, type ReasoningStep } from "@/lib/types";
import { RevenueTooltip } from "@/components/dashboard/RevenueTooltip";
import { ReasoningTrace } from "@/components/dashboard/ReasoningTrace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RejectionCluster {
  id: string;
  simulationRunId: string;
  reasonCode: string;
  count: number;
  affectedProfileIds: string[] | null;
  affectedProductIds: string[] | null;
  estimatedRevenueImpact: number | null;
  rank: number | null;
  recommendation: {
    action: string;
    description: string;
    estimatedRecovery: number;
  } | null;
}

interface AgentVisit {
  id: string;
  buyerProfileId: string;
  productId: string;
  outcome: string;
  reasonCode: string | null;
  reasonSummary: string | null;
  reasoningTrace: ReasoningStep[] | null;
  productPrice: number | null;
  mandate: string | null;
  sequenceNumber: number | null;
}

interface ProfileInfo {
  name: string;
  primaryConstraint: string;
}

// ---------------------------------------------------------------------------
// Severity colors
// ---------------------------------------------------------------------------

function getSeverityColor(rank: number | null): string {
  if (rank === 1) return "border-red-300 dark:border-red-800";
  if (rank === 2) return "border-orange-300 dark:border-orange-800";
  if (rank === 3) return "border-yellow-300 dark:border-yellow-800";
  return "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClusterCard({
  cluster,
  visits,
  profileMap,
}: {
  cluster: RejectionCluster;
  visits: AgentVisit[];
  profileMap: Record<string, ProfileInfo>;
}) {
  const [expanded, setExpanded] = useState(false);

  const label =
    REASON_CODE_LABELS[cluster.reasonCode as ReasonCode] ?? cluster.reasonCode;
  const revenueImpact = cluster.estimatedRevenueImpact ?? 0;
  const avgPrice =
    cluster.count > 0 ? Math.round(revenueImpact / cluster.count) : 0;
  const profileIds = cluster.affectedProfileIds ?? [];
  const productIds = cluster.affectedProductIds ?? [];

  return (
    <Card className={`transition-colors ${getSeverityColor(cluster.rank)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {cluster.rank != null && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {cluster.rank}
                </span>
              )}
              <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            </div>
            <p className="mt-0.5 text-xs font-mono text-muted-foreground">
              {cluster.reasonCode}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <RevenueTooltip
              rejectionCount={cluster.count}
              avgPrice={avgPrice}
              totalImpact={revenueImpact}
            >
              <p className="text-lg font-bold tabular-nums cursor-help">
                ${(revenueImpact / 100).toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </RevenueTooltip>
            <p className="text-xs text-muted-foreground">revenue impact</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {cluster.count}
            </span>{" "}
            <span className="text-muted-foreground">rejections</span>
          </span>
          <span className="text-muted-foreground">|</span>
          <span>
            <span className="font-medium">{productIds.length}</span>{" "}
            <span className="text-muted-foreground">products affected</span>
          </span>
        </div>

        {/* Profile badges */}
        {profileIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profileIds.map((pid) => {
              const profile = profileMap[pid];
              return (
                <Badge key={pid} variant="secondary" className="text-[11px]">
                  {profile?.name ?? pid}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Recommendation */}
        {cluster.recommendation && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs font-medium">
              {cluster.recommendation.action}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {cluster.recommendation.description}
            </p>
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded
            ? "Hide individual rejections"
            : `Show ${visits.length} individual rejections`}
        </button>

        {/* Expanded visit list */}
        {expanded && visits.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            {visits.map((visit) => (
              <ClusterVisitRow
                key={visit.id}
                visit={visit}
                profileMap={profileMap}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Individual visit row with trace toggle
// ---------------------------------------------------------------------------

function ClusterVisitRow({
  visit,
  profileMap,
}: {
  visit: AgentVisit;
  profileMap: Record<string, ProfileInfo>;
}) {
  const [showTrace, setShowTrace] = useState(false);
  const profile = profileMap[visit.buyerProfileId];
  const hasTrace =
    visit.reasoningTrace != null && visit.reasoningTrace.length > 0;

  return (
    <div className="rounded-md border border-border text-xs">
      <div className="flex items-start gap-3 p-2.5">
        <Badge className="shrink-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
          REJECT
        </Badge>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {profile?.name ?? visit.buyerProfileId}
            </span>
            {visit.productPrice != null && (
              <span className="text-muted-foreground">
                ${(visit.productPrice / 100).toFixed(2)}
              </span>
            )}
          </div>
          {visit.reasonSummary && (
            <p className="text-muted-foreground line-clamp-2">
              {visit.reasonSummary}
            </p>
          )}
          {hasTrace && (
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="mt-1 text-[11px] font-medium text-primary hover:underline"
            >
              {showTrace ? "Hide trace" : "View trace"}
            </button>
          )}
        </div>
        {visit.sequenceNumber != null && (
          <span className="shrink-0 text-muted-foreground tabular-nums">
            #{visit.sequenceNumber}
          </span>
        )}
      </div>

      {/* Reasoning trace panel */}
      {showTrace && hasTrace && (
        <div className="border-t border-border bg-muted/20 px-3 py-3">
          <ReasoningTrace
            mandate={visit.mandate}
            steps={visit.reasoningTrace!}
            outcome={visit.outcome as "purchase" | "reject" | "error"}
            reasonCode={visit.reasonCode}
          />
        </div>
      )}
    </div>
  );
}
