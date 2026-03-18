import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { storefronts, products, buyerProfiles } from "./schema";
import * as schema from "./schema";
import { storefrontData, productData, buyerProfileData, computeCompleteness } from "./seed-data";

type DbInstance = BetterSQLite3Database<typeof schema>;

// ---------------------------------------------------------------------------
// Schema creation — safe to call on every cold start (IF NOT EXISTS)
// ---------------------------------------------------------------------------

export function ensureTables(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS storefronts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shipping_policies TEXT,
      return_policy TEXT,
      sustainability_claims TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS buyer_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_constraint TEXT NOT NULL,
      system_prompt TEXT,
      example_mandate TEXT,
      default_weight REAL NOT NULL DEFAULT 1.0,
      parameters TEXT
    );

    CREATE TABLE IF NOT EXISTS simulation_runs (
      id TEXT PRIMARY KEY,
      storefront_id TEXT NOT NULL REFERENCES storefronts(id),
      storefront_snapshot TEXT,
      total_visits INTEGER NOT NULL DEFAULT 0,
      total_purchases INTEGER NOT NULL DEFAULT 0,
      total_rejections INTEGER NOT NULL DEFAULT 0,
      overall_conversion_rate REAL,
      estimated_revenue_lost INTEGER,
      profile_weights TEXT,
      previous_run_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_visits (
      id TEXT PRIMARY KEY,
      simulation_run_id TEXT NOT NULL REFERENCES simulation_runs(id),
      buyer_profile_id TEXT NOT NULL REFERENCES buyer_profiles(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      mandate TEXT,
      outcome TEXT NOT NULL,
      reason_code TEXT,
      reason_summary TEXT,
      reasoning_trace TEXT,
      product_price INTEGER,
      sequence_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rejection_clusters (
      id TEXT PRIMARY KEY,
      simulation_run_id TEXT NOT NULL REFERENCES simulation_runs(id),
      reason_code TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      affected_profile_ids TEXT,
      affected_product_ids TEXT,
      estimated_revenue_impact INTEGER,
      rank INTEGER,
      recommendation TEXT
    );

    CREATE TABLE IF NOT EXISTS storefront_actions (
      id TEXT PRIMARY KEY,
      simulation_run_id TEXT NOT NULL REFERENCES simulation_runs(id),
      recommendation_source TEXT REFERENCES rejection_clusters(id),
      action_type TEXT NOT NULL,
      change_preview TEXT,
      applied INTEGER NOT NULL DEFAULT 0,
      reverted INTEGER NOT NULL DEFAULT 0,
      applied_at TEXT
    );
  `);
}

// ---------------------------------------------------------------------------
// Seed — only runs if the database is empty
// ---------------------------------------------------------------------------

export function ensureSeed(db: DbInstance): void {
  const existing = db.select({ id: storefronts.id }).from(storefronts).limit(1).all();
  if (existing.length > 0) return;

  db.insert(storefronts).values(storefrontData).run();

  for (const p of productData) {
    db.insert(products).values({
      ...p,
      dataCompletenessScore: computeCompleteness(p),
    }).run();
  }

  for (const bp of buyerProfileData) {
    db.insert(buyerProfiles).values(bp).run();
  }
}
