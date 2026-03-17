import { NextRequest, NextResponse } from "next/server";
import { aggregateSimulationResults } from "@/lib/simulation/aggregator";

// ---------------------------------------------------------------------------
// POST /api/aggregate — aggregate simulation results into rejection clusters
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { runId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const runId = body.runId;
  if (!runId) {
    return NextResponse.json(
      { error: "runId is required" },
      { status: 400 }
    );
  }

  try {
    const result = aggregateSimulationResults(runId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Aggregation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
