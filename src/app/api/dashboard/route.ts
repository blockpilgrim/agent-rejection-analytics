import { NextRequest, NextResponse } from "next/server";
import {
  getSimulationRun,
  getRejectionClustersByRun,
  getAgentVisitsByRun,
  getAllBuyerProfiles,
} from "@/db/queries";

// ---------------------------------------------------------------------------
// GET /api/dashboard?runId=xxx — fetch dashboard data for a simulation run
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json(
      { error: "runId query parameter is required" },
      { status: 400 }
    );
  }

  const run = getSimulationRun(runId);
  if (!run) {
    return NextResponse.json(
      { error: `Simulation run ${runId} not found` },
      { status: 404 }
    );
  }

  const clusters = getRejectionClustersByRun(runId);
  const visits = getAgentVisitsByRun(runId);
  const profiles = getAllBuyerProfiles();

  // Build a profile lookup for the client
  const profileMap: Record<string, { name: string; primaryConstraint: string }> = {};
  for (const p of profiles) {
    profileMap[p.id] = { name: p.name, primaryConstraint: p.primaryConstraint };
  }

  return NextResponse.json({
    run,
    clusters,
    visits,
    profileMap,
  });
}
