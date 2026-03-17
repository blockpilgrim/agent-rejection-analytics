import { NextRequest } from "next/server";
import {
  getStorefront,
  getProductsByStorefront,
  getAllBuyerProfiles,
  createSimulationRun,
  updateSimulationRunTotals,
  insertAgentVisit,
} from "@/db/queries";
import {
  runSimulation,
  type ProfileInfo,
  type VisitResult,
} from "@/lib/simulation/orchestrator";
import type { StorefrontContext, ProductData } from "@/lib/simulation/agent-caller";

// ---------------------------------------------------------------------------
// POST /api/simulate — start a simulation and stream results via SSE
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { storefrontId?: string; visitCount?: number };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const storefrontId = body.storefrontId ?? "sf_001";
  const visitCount = body.visitCount ?? 100;

  // Validate
  if (visitCount < 1 || visitCount > 500) {
    return new Response(
      JSON.stringify({ error: "visitCount must be between 1 and 500" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Load storefront + products + profiles
  const storefront = getStorefront(storefrontId);
  if (!storefront) {
    return new Response(
      JSON.stringify({ error: `Storefront ${storefrontId} not found` }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawProducts = getProductsByStorefront(storefrontId);
  if (rawProducts.length === 0) {
    return new Response(
      JSON.stringify({ error: "No products found for storefront" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawProfiles = getAllBuyerProfiles();
  if (rawProfiles.length === 0) {
    return new Response(
      JSON.stringify({ error: "No buyer profiles found. Run db:seed first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Map to orchestrator types
  const storefrontCtx: StorefrontContext = {
    name: storefront.name,
    shippingPolicies: storefront.shippingPolicies ?? null,
    returnPolicy: storefront.returnPolicy ?? null,
    sustainabilityClaims: storefront.sustainabilityClaims ?? null,
  };

  const productsList: ProductData[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    structuredSpecs: p.structuredSpecs ?? null,
    brand: p.brand,
    reviewScore: p.reviewScore,
    reviewCount: p.reviewCount,
    stockStatus: p.stockStatus,
    dataCompletenessScore: p.dataCompletenessScore,
  }));

  const profiles: ProfileInfo[] = rawProfiles.map((p) => ({
    id: p.id,
    name: p.name,
    weight: p.defaultWeight,
    systemPrompt: p.systemPrompt,
    exampleMandate: p.exampleMandate,
    parameters: p.parameters as Record<string, unknown> | null,
  }));

  // Create the simulation run record
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const profileWeights: Record<string, number> = {};
  for (const p of profiles) {
    profileWeights[p.id] = p.weight;
  }

  createSimulationRun({
    id: runId,
    storefrontId,
    storefrontSnapshot: {
      name: storefront.name,
      productCount: rawProducts.length,
      shippingPolicies: storefront.shippingPolicies,
      returnPolicy: storefront.returnPolicy,
      sustainabilityClaims: storefront.sustainabilityClaims,
    },
    totalVisits: visitCount,
    profileWeights,
    status: "running",
  });

  // Set up SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send the run ID as the first event
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify({ runId, totalVisits: visitCount })}\n\n`)
      );

      let purchases = 0;
      let rejections = 0;
      let errors = 0;
      let revenueLost = 0;

      try {
        const generator = runSimulation(
          { storefrontId, visitCount },
          profiles,
          productsList,
          storefrontCtx
        );

        for await (const result of generator) {
          // Persist the visit to the database (skip error visits with no decision)
          if (result.outcome !== "error") {
            try {
              const visitId = `av_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              insertAgentVisit({
                id: visitId,
                simulationRunId: runId,
                buyerProfileId: result.profileId,
                productId: result.productId,
                mandate: result.mandate,
                outcome: result.outcome as "purchase" | "reject",
                reasonCode: result.reasonCode,
                reasonSummary: result.reasonSummary,
                reasoningTrace: result.reasoningTrace,
                productPrice: result.productPrice,
                sequenceNumber: result.sequenceNumber,
              });
            } catch (dbErr) {
              console.error("Failed to persist agent visit:", dbErr);
            }
          }

          // Update running tallies
          if (result.outcome === "purchase") {
            purchases++;
          } else if (result.outcome === "reject") {
            rejections++;
            revenueLost += result.productPrice;
          } else {
            errors++;
          }

          // Send SSE event
          const ssePayload: VisitSSEPayload = {
            ...result,
            runningTotals: {
              purchases,
              rejections,
              errors,
              completed: purchases + rejections + errors,
              total: visitCount,
            },
          };
          controller.enqueue(
            encoder.encode(`event: visit\ndata: ${JSON.stringify(ssePayload)}\n\n`)
          );
        }

        // Update simulation run with final totals
        const totalCompleted = purchases + rejections;
        const conversionRate =
          totalCompleted > 0 ? purchases / totalCompleted : 0;

        try {
          updateSimulationRunTotals(runId, {
            totalPurchases: purchases,
            totalRejections: rejections,
            overallConversionRate: Math.round(conversionRate * 10000) / 10000,
            estimatedRevenueLost: revenueLost,
            status: "completed",
          });
        } catch (dbErr) {
          console.error("Failed to update simulation run totals:", dbErr);
        }

        // Send completion event
        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              runId,
              totalVisits: visitCount,
              purchases,
              rejections,
              errors,
              conversionRate: Math.round(conversionRate * 10000) / 10000,
              estimatedRevenueLost: revenueLost,
            })}\n\n`
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Simulation error:", msg);

        try {
          updateSimulationRunTotals(runId, {
            totalPurchases: purchases,
            totalRejections: rejections,
            overallConversionRate: 0,
            estimatedRevenueLost: revenueLost,
            status: "failed",
          });
        } catch {
          // ignore
        }

        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// SSE payload type
// ---------------------------------------------------------------------------

interface VisitSSEPayload extends VisitResult {
  runningTotals: {
    purchases: number;
    rejections: number;
    errors: number;
    completed: number;
    total: number;
  };
}

