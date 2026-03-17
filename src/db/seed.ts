import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { storefronts, products } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/local.db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function id(prefix: string, n: number) {
  return `${prefix}_${String(n).padStart(3, "0")}`;
}

/** Compute data completeness as ratio of populated optional fields. */
function computeCompleteness(p: {
  description: string | null;
  structuredSpecs: Record<string, unknown> | null;
  brand: string | null;
  reviewScore: number | null;
  reviewCount: number | null;
}): number {
  // Structured specs depth: count how many keys are populated
  const specKeys = p.structuredSpecs ? Object.keys(p.structuredSpecs).length : 0;
  const maxSpecKeys = 6; // our "ideal" product has ~6 spec fields

  const boolFields = [
    p.description != null && p.description.length > 30,
    p.structuredSpecs != null,
    p.brand != null,
    p.reviewScore != null,
    p.reviewCount != null && p.reviewCount >= 5,
  ];

  const filledBool = boolFields.filter(Boolean).length;
  const specRatio = Math.min(specKeys / maxSpecKeys, 1);

  // Weighted: 60% from boolean field presence, 40% from spec depth
  const score = 0.6 * (filledBool / boolFields.length) + 0.4 * specRatio;
  return Math.round(score * 100) / 100;
}

// ---------------------------------------------------------------------------
// Storefront
// ---------------------------------------------------------------------------

const storefrontData = {
  id: "sf_001",
  name: "BrewHaus Kitchen Supply",
  shippingPolicies: {
    standard: "Free standard shipping, 3-5 business days. No expedited options available.",
  },
  returnPolicy: {
    windowDays: 30,
    free: true,
    structured: false,
    rawText:
      "We accept returns within 30 days of delivery for a full refund. Items must be in original packaging and unused condition. Refunds are processed within 7-10 business days after we receive the returned item. Please contact support@brewhaus.example for a return label. Restocking fees may apply for opened electronics. Gift cards and clearance items are final sale.",
  },
  sustainabilityClaims: {
    certified: false,
    claims: [],
  },
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type SeedProduct = {
  id: string;
  storefrontId: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  structuredSpecs: Record<string, string | number | boolean | null> | null;
  brand: string | null;
  reviewScore: number | null;
  reviewCount: number | null;
  stockStatus: "in_stock" | "out_of_stock" | "limited";
};

const productData: SeedProduct[] = [
  // =========================================================================
  // ESPRESSO MACHINES — full data (6 with rich specs)
  // =========================================================================
  {
    id: id("prod", 1),
    storefrontId: "sf_001",
    name: "ProBrew Espresso Elite 3000",
    category: "Espresso Machines",
    price: 49999, // $499.99
    description:
      "Commercial-grade 15-bar pump espresso machine with PID temperature control, 58mm portafilter, and integrated steam wand. Stainless steel boiler with 2L capacity. Ideal for home baristas who demand cafe-quality shots.",
    structuredSpecs: {
      pump_pressure_bar: 15,
      boiler_material: "Stainless Steel",
      water_capacity_liters: 2.0,
      portafilter_mm: 58,
      pid_control: true,
      weight_lbs: 24,
    },
    brand: "ProBrew",
    reviewScore: 4.6,
    reviewCount: 312,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 2),
    storefrontId: "sf_001",
    name: "CafePress Compact Semi-Auto",
    category: "Espresso Machines",
    price: 24999, // $249.99
    description:
      "Compact semi-automatic espresso maker with 15-bar Italian pump. Features a built-in milk frother and removable drip tray. Perfect for small kitchens.",
    structuredSpecs: {
      pump_pressure_bar: 15,
      boiler_material: "Aluminum",
      water_capacity_liters: 1.2,
      portafilter_mm: 54,
      pid_control: false,
      weight_lbs: 12,
    },
    brand: "CafePress",
    reviewScore: 4.2,
    reviewCount: 187,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 3),
    storefrontId: "sf_001",
    name: "Barista Pro Dual Boiler",
    category: "Espresso Machines",
    price: 59999, // $599.99
    description:
      "Dual boiler espresso machine allowing simultaneous brewing and steaming. Digital temperature display, shot timer, and programmable pre-infusion. 67oz water reservoir.",
    structuredSpecs: {
      pump_pressure_bar: 15,
      boiler_material: "Stainless Steel",
      water_capacity_liters: 2.0,
      portafilter_mm: 58,
      pid_control: true,
      weight_lbs: 30,
    },
    brand: "Barista Pro",
    reviewScore: 4.8,
    reviewCount: 95,
    stockStatus: "limited" as const,
  },

  // =========================================================================
  // BLENDERS — mix of full and partial data
  // =========================================================================
  {
    id: id("prod", 4),
    storefrontId: "sf_001",
    name: "PowerBlend Max 1500W",
    category: "Blenders",
    price: 12999, // $129.99
    description:
      "High-performance 1500W countertop blender with 64oz BPA-free Tritan pitcher. 6 stainless steel blades, 10 speed settings, and pulse mode. Crushes ice effortlessly.",
    structuredSpecs: {
      wattage: 1500,
      capacity_oz: 64,
      blade_material: "Stainless Steel",
      speeds: 10,
      bpa_free: true,
      weight_lbs: 8,
    },
    brand: "PowerBlend",
    reviewScore: 4.4,
    reviewCount: 521,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 5),
    storefrontId: "sf_001",
    name: "SmartMix Pro Blender",
    category: "Blenders",
    price: 19999, // $199.99
    description:
      "Smart blender with built-in programs for smoothies, soups, and nut butters. Touchscreen controls, self-cleaning mode, and vacuum blending to reduce oxidation.",
    structuredSpecs: {
      wattage: 1800,
      capacity_oz: 68,
      blade_material: "Hardened Steel",
      speeds: 12,
      bpa_free: true,
      weight_lbs: 11,
    },
    brand: "SmartMix",
    reviewScore: 4.7,
    reviewCount: 204,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 6),
    storefrontId: "sf_001",
    name: "QuickBlend Personal Blender",
    category: "Blenders",
    price: 3999, // $39.99
    description:
      "Compact personal blender with 20oz travel cup. 300W motor, one-touch blending. Great for single-serve smoothies on the go.",
    structuredSpecs: {
      wattage: 300,
      capacity_oz: 20,
      blade_material: "Stainless Steel",
      speeds: 1,
      bpa_free: true,
      weight_lbs: 3,
    },
    brand: "QuickBlend",
    reviewScore: 3.9,
    reviewCount: 1042,
    stockStatus: "in_stock" as const,
  },

  // =========================================================================
  // PARTIAL DATA products (~8) — missing some specs, low review counts
  // =========================================================================
  {
    id: id("prod", 7),
    storefrontId: "sf_001",
    name: "EcoGrind Manual Coffee Grinder",
    category: "Espresso Machines",
    price: 4499, // $44.99
    description:
      "Ceramic burr manual grinder with adjustable settings. Compact and travel-friendly. Grinds enough for 2 cups per fill.",
    structuredSpecs: {
      burr_type: "Ceramic",
      capacity_cups: 2,
    },
    brand: "EcoGrind",
    reviewScore: 4.1,
    reviewCount: 8,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 8),
    storefrontId: "sf_001",
    name: "ThermoKettle Gooseneck Pour-Over",
    category: "Espresso Machines",
    price: 6999, // $69.99
    description:
      "Variable temperature electric gooseneck kettle. Stainless steel, 1L capacity.",
    structuredSpecs: {
      capacity_liters: 1.0,
      material: "Stainless Steel",
    },
    brand: "ThermoKettle",
    reviewScore: 4.3,
    reviewCount: 3,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 9),
    storefrontId: "sf_001",
    name: "Cast Iron Dutch Oven 6qt",
    category: "Cookware",
    price: 8999, // $89.99
    description:
      "Enameled cast iron Dutch oven. Excellent heat retention and distribution. Oven safe to 500F.",
    structuredSpecs: {
      capacity_qt: 6,
      material: "Enameled Cast Iron",
      oven_safe_f: 500,
    },
    brand: "HeritageCook",
    reviewScore: 4.5,
    reviewCount: 12,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 10),
    storefrontId: "sf_001",
    name: "Copper-Core Saute Pan 12\"",
    category: "Cookware",
    price: 14999, // $149.99
    description:
      "Tri-ply copper core saute pan with stainless steel cooking surface. Stay-cool handle.",
    structuredSpecs: {
      diameter_inches: 12,
      material: "Copper Core / Stainless",
    },
    brand: null,
    reviewScore: 4.0,
    reviewCount: 6,
    stockStatus: "limited" as const,
  },
  {
    id: id("prod", 11),
    storefrontId: "sf_001",
    name: "NanoFroth Milk Frother",
    category: "Espresso Machines",
    price: 2999, // $29.99
    description: "Handheld battery-powered milk frother. Stainless steel whisk. Creates rich foam in seconds.",
    structuredSpecs: {
      power_source: "Battery (2x AA)",
    },
    brand: "NanoFroth",
    reviewScore: 3.5,
    reviewCount: 4,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 12),
    storefrontId: "sf_001",
    name: "ProSear Griddle Plate 18\"",
    category: "Cookware",
    price: 5999, // $59.99
    description:
      "Cast iron griddle plate for stovetop or grill. Reversible flat/ridged surface. Pre-seasoned.",
    structuredSpecs: {
      size_inches: 18,
      material: "Cast Iron",
    },
    brand: null,
    reviewScore: null,
    reviewCount: null,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 13),
    storefrontId: "sf_001",
    name: "GlassBrew Pour-Over Set",
    category: "Espresso Machines",
    price: 3499, // $34.99
    description: "Borosilicate glass pour-over dripper with 20oz carafe and reusable stainless filter.",
    structuredSpecs: {
      material: "Borosilicate Glass",
      capacity_oz: 20,
    },
    brand: "GlassBrew",
    reviewScore: 4.2,
    reviewCount: 2,
    stockStatus: "out_of_stock" as const,
  },
  {
    id: id("prod", 14),
    storefrontId: "sf_001",
    name: "SilkBlend Immersion Blender",
    category: "Blenders",
    price: 4999, // $49.99
    description: "500W immersion hand blender with detachable shaft and whisk attachment.",
    structuredSpecs: {
      wattage: 500,
    },
    brand: "SilkBlend",
    reviewScore: 3.8,
    reviewCount: 14,
    stockStatus: "in_stock" as const,
  },

  // =========================================================================
  // MINIMAL DATA products (~6) — free-text only, no structured specs
  // =========================================================================
  {
    id: id("prod", 15),
    storefrontId: "sf_001",
    name: "Kitchen Scale Digital",
    category: "Cookware",
    price: 2499, // $24.99
    description: "A digital kitchen scale. Accurate to 1g. Tare function. Runs on AAA batteries.",
    structuredSpecs: null,
    brand: null,
    reviewScore: null,
    reviewCount: null,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 16),
    storefrontId: "sf_001",
    name: "Bamboo Cutting Board Set",
    category: "Cookware",
    price: 3299, // $32.99
    description: "Set of 3 bamboo cutting boards in graduated sizes. Antimicrobial surface.",
    structuredSpecs: null,
    brand: null,
    reviewScore: null,
    reviewCount: null,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 17),
    storefrontId: "sf_001",
    name: "Ceramic Knife Block 5pc",
    category: "Cookware",
    price: 5499, // $54.99
    description:
      "Five piece ceramic knife set with block. Includes chef, santoku, utility, paring, and bread knife. Very sharp out of the box.",
    structuredSpecs: null,
    brand: null,
    reviewScore: 3.2,
    reviewCount: 1,
    stockStatus: "limited" as const,
  },
  {
    id: id("prod", 18),
    storefrontId: "sf_001",
    name: "Cold Brew Coffee Maker",
    category: "Espresso Machines",
    price: 2799, // $27.99
    description: "Mason-jar style cold brew maker. Makes up to 1.5 quarts. Removable mesh filter.",
    structuredSpecs: null,
    brand: null,
    reviewScore: null,
    reviewCount: null,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 19),
    storefrontId: "sf_001",
    name: "Stainless Mixing Bowl Set",
    category: "Cookware",
    price: 2999, // $29.99
    description: "Set of 5 stainless steel mixing bowls with lids. Nesting design.",
    structuredSpecs: null,
    brand: null,
    reviewScore: null,
    reviewCount: null,
    stockStatus: "in_stock" as const,
  },
  {
    id: id("prod", 20),
    storefrontId: "sf_001",
    name: "Portable Espresso Maker",
    category: "Espresso Machines",
    price: 7999, // $79.99
    description:
      "Hand-pump portable espresso maker. No electricity needed. Compatible with ground coffee and NS capsules. Lightweight for travel.",
    structuredSpecs: null,
    brand: null,
    reviewScore: 4.0,
    reviewCount: 3,
    stockStatus: "out_of_stock" as const,
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding database...");

  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = OFF"); // allow delete order

  const db = drizzle(sqlite, { schema });

  // Reset — delete all rows from relevant tables
  console.log("  Clearing existing data...");
  db.delete(products).run();
  db.delete(storefronts).run();

  // Insert storefront
  console.log("  Inserting storefront...");
  db.insert(storefronts).values(storefrontData).run();

  // Insert products with computed completeness
  console.log("  Inserting products...");
  for (const p of productData) {
    const score = computeCompleteness(p);
    db.insert(products)
      .values({
        ...p,
        dataCompletenessScore: score,
      })
      .run();
  }

  sqlite.pragma("foreign_keys = ON");
  sqlite.close();

  console.log(`Seeded 1 storefront, ${productData.length} products.`);
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
