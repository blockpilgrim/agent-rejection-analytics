import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { storefronts, products } from "../schema";

/**
 * Tests for query functions in src/db/queries.ts.
 *
 * The actual query functions use the singleton getDb(), which targets the
 * file-based DB. Here we replicate the same Drizzle query patterns against
 * an in-memory DB to verify correctness without touching the real database.
 */
describe("query functions", () => {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  beforeAll(() => {
    // Create tables
    sqlite.exec(`
      CREATE TABLE storefronts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shipping_policies TEXT,
        return_policy TEXT,
        sustainability_claims TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    sqlite.exec(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        storefront_id TEXT NOT NULL REFERENCES storefronts(id),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        description TEXT,
        structured_specs TEXT,
        brand TEXT,
        review_score REAL,
        review_count INTEGER,
        stock_status TEXT NOT NULL DEFAULT 'in_stock',
        data_completeness_score REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Seed test data
    db.insert(storefronts)
      .values({
        id: "sf_001",
        name: "Test Store",
        shippingPolicies: { standard: "3-5 days" },
        returnPolicy: { windowDays: 30, free: true },
      })
      .run();

    db.insert(storefronts)
      .values({ id: "sf_002", name: "Other Store" })
      .run();

    const testProducts = [
      {
        id: "prod_001",
        storefrontId: "sf_001",
        name: "Espresso Machine",
        category: "Espresso Machines",
        price: 49999,
        brand: "ProBrew",
        stockStatus: "in_stock" as const,
      },
      {
        id: "prod_002",
        storefrontId: "sf_001",
        name: "Blender",
        category: "Blenders",
        price: 12999,
        brand: "PowerBlend",
        stockStatus: "in_stock" as const,
      },
      {
        id: "prod_003",
        storefrontId: "sf_002",
        name: "Toaster",
        category: "Appliances",
        price: 3999,
        brand: null,
        stockStatus: "in_stock" as const,
      },
    ];

    for (const p of testProducts) {
      db.insert(products).values(p).run();
    }
  });

  afterAll(() => {
    sqlite.close();
  });

  describe("getStorefront pattern", () => {
    it("returns a storefront by id", () => {
      const result = db
        .select()
        .from(storefronts)
        .where(eq(storefronts.id, "sf_001"))
        .get();

      expect(result).toBeDefined();
      expect(result!.id).toBe("sf_001");
      expect(result!.name).toBe("Test Store");
      expect(result!.shippingPolicies).toEqual({ standard: "3-5 days" });
      expect(result!.returnPolicy).toEqual({ windowDays: 30, free: true });
    });

    it("returns undefined for non-existent id", () => {
      const result = db
        .select()
        .from(storefronts)
        .where(eq(storefronts.id, "sf_999"))
        .get();

      expect(result).toBeUndefined();
    });
  });

  describe("getProductsByStorefront pattern", () => {
    it("returns only products for the given storefront", () => {
      const results = db
        .select()
        .from(products)
        .where(eq(products.storefrontId, "sf_001"))
        .all();

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name).sort()).toEqual([
        "Blender",
        "Espresso Machine",
      ]);
    });

    it("returns correct product shape with price in cents", () => {
      const results = db
        .select()
        .from(products)
        .where(eq(products.storefrontId, "sf_001"))
        .all();

      const espresso = results.find((r) => r.id === "prod_001")!;
      expect(espresso.price).toBe(49999);
      expect(espresso.category).toBe("Espresso Machines");
      expect(espresso.brand).toBe("ProBrew");
      expect(espresso.stockStatus).toBe("in_stock");
    });

    it("returns empty array for storefront with no products", () => {
      const results = db
        .select()
        .from(products)
        .where(eq(products.storefrontId, "sf_nonexistent"))
        .all();

      expect(results).toEqual([]);
    });
  });
});
