import { NextRequest, NextResponse } from "next/server";
import {
  getStorefront,
  getProductsByIds,
  getStorefrontActionsByRun,
  updateStorefrontPolicies,
  updateProduct,
  createStorefrontAction,
  getStorefrontAction,
  updateStorefrontAction,
  getRejectionCluster,
} from "@/db/queries";
import type { ActionType } from "@/lib/simulation/recommender";

// ---------------------------------------------------------------------------
// PATCH /api/storefront — apply or undo a recommended action
// ---------------------------------------------------------------------------

interface ApplyBody {
  action: "apply";
  clusterId: string;
  simulationRunId: string;
  actionType: ActionType;
  storefrontId: string;
}

interface UndoBody {
  action: "undo";
  storefrontActionId: string;
  storefrontId: string;
}

type RequestBody = ApplyBody | UndoBody;

export async function PATCH(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "undo") {
    return handleUndo(body);
  }

  if (body.action === "apply") {
    return handleApply(body);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Apply handler
// ---------------------------------------------------------------------------

function handleApply(body: ApplyBody) {
  const { clusterId, simulationRunId, actionType, storefrontId } = body;

  if (!clusterId || !simulationRunId || !actionType || !storefrontId) {
    return NextResponse.json(
      { error: "clusterId, simulationRunId, actionType, and storefrontId are required" },
      { status: 400 }
    );
  }

  const storefront = getStorefront(storefrontId);
  if (!storefront) {
    return NextResponse.json(
      { error: `Storefront ${storefrontId} not found` },
      { status: 404 }
    );
  }

  const cluster = getRejectionCluster(clusterId);
  if (!cluster) {
    return NextResponse.json(
      { error: `Cluster ${clusterId} not found` },
      { status: 404 }
    );
  }

  const affectedProductIds = (cluster.affectedProductIds ?? []) as string[];

  try {
    const result = applyAction(
      actionType,
      storefront,
      affectedProductIds,
      storefrontId
    );

    // Create the storefront action record
    const actionId = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    createStorefrontAction({
      id: actionId,
      simulationRunId,
      recommendationSource: clusterId,
      actionType,
      changePreview: result.changePreview,
      applied: true,
      appliedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      actionId,
      changePreview: result.changePreview,
      applied: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Apply action error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Undo handler
// ---------------------------------------------------------------------------

function handleUndo(body: UndoBody) {
  const { storefrontActionId, storefrontId } = body;

  if (!storefrontActionId || !storefrontId) {
    return NextResponse.json(
      { error: "storefrontActionId and storefrontId are required" },
      { status: 400 }
    );
  }

  const action = getStorefrontAction(storefrontActionId);
  if (!action) {
    return NextResponse.json(
      { error: `Action ${storefrontActionId} not found` },
      { status: 404 }
    );
  }

  if (!action.applied || action.reverted) {
    return NextResponse.json(
      { error: "Action is not in an applied state" },
      { status: 400 }
    );
  }

  const storefront = getStorefront(storefrontId);
  if (!storefront) {
    return NextResponse.json(
      { error: `Storefront ${storefrontId} not found` },
      { status: 404 }
    );
  }

  try {
    const changePreview = action.changePreview as {
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    };

    revertAction(action.actionType as ActionType, changePreview, storefrontId);

    updateStorefrontAction(storefrontActionId, {
      applied: false,
      reverted: true,
    });

    return NextResponse.json({ reverted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Undo action error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Action handlers — apply
// ---------------------------------------------------------------------------

type Storefront = NonNullable<ReturnType<typeof getStorefront>>;

function applyAction(
  actionType: ActionType,
  storefront: Storefront,
  affectedProductIds: string[],
  storefrontId: string
): { changePreview: { before: Record<string, unknown>; after: Record<string, unknown> } } {
  switch (actionType) {
    case "add_expedited_shipping":
      return applyAddExpeditedShipping(storefront, storefrontId);
    case "structure_return_policy":
      return applyStructureReturnPolicy(storefront, storefrontId);
    case "add_sustainability_certs":
      return applyAddSustainabilityCerts(storefront, storefrontId);
    case "enrich_product_specs":
      return applyEnrichProductSpecs(affectedProductIds);
    case "reduce_price":
      return applyReducePrice(affectedProductIds);
    case "add_stock_status":
      return applyAddStockStatus(affectedProductIds);
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

function applyAddExpeditedShipping(
  storefront: Storefront,
  storefrontId: string
) {
  const before = { shippingPolicies: storefront.shippingPolicies ?? {} };
  const newPolicies = {
    ...(storefront.shippingPolicies ?? {}),
    expedited: "Expedited shipping: 1-2 business days, $9.99 flat rate.",
  };
  const after = { shippingPolicies: newPolicies };

  updateStorefrontPolicies(storefrontId, { shippingPolicies: newPolicies });

  return { changePreview: { before, after } };
}

function applyStructureReturnPolicy(
  storefront: Storefront,
  storefrontId: string
) {
  const before = { returnPolicy: storefront.returnPolicy ?? {} };
  const newPolicy = {
    windowDays: 30,
    free: true,
    structured: true,
    rawText: (storefront.returnPolicy as Record<string, unknown>)?.rawText as string | undefined,
  };
  const after = { returnPolicy: newPolicy };

  updateStorefrontPolicies(storefrontId, { returnPolicy: newPolicy });

  return { changePreview: { before, after } };
}

function applyAddSustainabilityCerts(
  storefront: Storefront,
  storefrontId: string
) {
  const before = { sustainabilityClaims: storefront.sustainabilityClaims ?? {} };
  const newClaims = {
    certified: true,
    claims: ["Energy Star Certified", "Fair Trade Verified", "FSC Certified"],
  };
  const after = { sustainabilityClaims: newClaims };

  updateStorefrontPolicies(storefrontId, { sustainabilityClaims: newClaims });

  return { changePreview: { before, after } };
}

function applyEnrichProductSpecs(affectedProductIds: string[]) {
  const products = getProductsByIds(affectedProductIds);
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  for (const product of products) {
    before[product.id] = {
      name: product.name,
      structuredSpecs: product.structuredSpecs,
      dataCompletenessScore: product.dataCompletenessScore,
    };

    // Generate enriched specs based on category
    const enrichedSpecs = generateEnrichedSpecs(product);

    updateProduct(product.id, {
      structuredSpecs: enrichedSpecs,
      dataCompletenessScore: Math.min(
        (product.dataCompletenessScore ?? 0) + 0.3,
        1.0
      ),
    });

    after[product.id] = {
      name: product.name,
      structuredSpecs: enrichedSpecs,
      dataCompletenessScore: Math.min(
        (product.dataCompletenessScore ?? 0) + 0.3,
        1.0
      ),
    };
  }

  return { changePreview: { before, after } };
}

function applyReducePrice(affectedProductIds: string[]) {
  const products = getProductsByIds(affectedProductIds);
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  for (const product of products) {
    before[product.id] = {
      name: product.name,
      price: product.price,
    };

    const newPrice = Math.round(product.price * 0.9); // 10% reduction
    updateProduct(product.id, { price: newPrice });

    after[product.id] = {
      name: product.name,
      price: newPrice,
    };
  }

  return { changePreview: { before, after } };
}

function applyAddStockStatus(affectedProductIds: string[]) {
  const products = getProductsByIds(affectedProductIds);
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  for (const product of products) {
    before[product.id] = {
      name: product.name,
      stockStatus: product.stockStatus,
    };

    updateProduct(product.id, { stockStatus: "in_stock" });

    after[product.id] = {
      name: product.name,
      stockStatus: "in_stock",
    };
  }

  return { changePreview: { before, after } };
}

// ---------------------------------------------------------------------------
// Action handlers — revert
// ---------------------------------------------------------------------------

function revertAction(
  actionType: ActionType,
  changePreview: { before: Record<string, unknown>; after: Record<string, unknown> },
  storefrontId: string
) {
  switch (actionType) {
    case "add_expedited_shipping": {
      const before = changePreview.before as {
        shippingPolicies: Record<string, string | undefined>;
      };
      updateStorefrontPolicies(storefrontId, {
        shippingPolicies: before.shippingPolicies,
      });
      break;
    }
    case "structure_return_policy": {
      const before = changePreview.before as {
        returnPolicy: {
          windowDays?: number;
          free?: boolean;
          structured?: boolean;
          rawText?: string;
        };
      };
      updateStorefrontPolicies(storefrontId, {
        returnPolicy: before.returnPolicy,
      });
      break;
    }
    case "add_sustainability_certs": {
      const before = changePreview.before as {
        sustainabilityClaims: { certified?: boolean; claims?: string[] };
      };
      updateStorefrontPolicies(storefrontId, {
        sustainabilityClaims: before.sustainabilityClaims,
      });
      break;
    }
    case "enrich_product_specs": {
      const before = changePreview.before as Record<
        string,
        {
          name: string;
          structuredSpecs: Record<string, string | number | boolean | null> | null;
          dataCompletenessScore: number | null;
        }
      >;
      for (const [productId, data] of Object.entries(before)) {
        updateProduct(productId, {
          structuredSpecs: data.structuredSpecs ?? undefined,
          dataCompletenessScore: data.dataCompletenessScore ?? undefined,
        });
      }
      break;
    }
    case "reduce_price": {
      const before = changePreview.before as Record<
        string,
        { name: string; price: number }
      >;
      for (const [productId, data] of Object.entries(before)) {
        updateProduct(productId, { price: data.price });
      }
      break;
    }
    case "add_stock_status": {
      const before = changePreview.before as Record<
        string,
        { name: string; stockStatus: "in_stock" | "out_of_stock" | "limited" }
      >;
      for (const [productId, data] of Object.entries(before)) {
        updateProduct(productId, { stockStatus: data.stockStatus });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Product = ReturnType<typeof getProductsByIds>[number];

/** Generate enriched specs for a product based on its category and existing data. */
function generateEnrichedSpecs(
  product: Product
): Record<string, string | number | boolean | null> {
  const existing = (product.structuredSpecs ?? {}) as Record<
    string,
    string | number | boolean | null
  >;

  // Category-specific default specs
  const categoryDefaults: Record<
    string,
    Record<string, string | number | boolean | null>
  > = {
    "Espresso Machines": {
      pump_pressure_bar: 15,
      boiler_material: "Stainless Steel",
      water_capacity_liters: 1.5,
      weight_lbs: 15,
      warranty_years: 2,
      voltage: "120V",
    },
    Blenders: {
      wattage: 1000,
      capacity_oz: 48,
      blade_material: "Stainless Steel",
      speeds: 5,
      bpa_free: true,
      warranty_years: 2,
    },
    Cookware: {
      material: "Stainless Steel",
      dishwasher_safe: true,
      oven_safe: true,
      warranty_years: 5,
      weight_lbs: 4,
      country_of_origin: "USA",
    },
  };

  const defaults = categoryDefaults[product.category] ?? {
    warranty_years: 2,
    weight_lbs: 5,
  };

  // Merge: keep existing values, fill in missing ones from defaults
  return { ...defaults, ...existing };
}

// ---------------------------------------------------------------------------
// GET /api/storefront?id=xxx — fetch storefront actions for a run
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json(
      { error: "runId query parameter is required" },
      { status: 400 }
    );
  }

  const actions = getStorefrontActionsByRun(runId);

  return NextResponse.json({ actions });
}
