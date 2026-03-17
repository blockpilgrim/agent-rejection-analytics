import { describe, it, expect, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

describe("database connection", () => {
  // Use an in-memory database so tests are fast and leave no artifacts
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  afterAll(() => {
    sqlite.close();
  });

  it("can execute a basic query", () => {
    const result = db.get<{ value: number }>(sql`SELECT 1 as value`);
    expect(result).toEqual({ value: 1 });
  });

  it("supports WAL journal mode", () => {
    sqlite.pragma("journal_mode = WAL");
    const mode = sqlite.pragma("journal_mode", { simple: true });
    // In-memory databases may return "memory" instead of "wal"
    expect(["wal", "memory"]).toContain(mode);
  });

  it("can enable foreign keys", () => {
    sqlite.pragma("foreign_keys = ON");
    const fk = sqlite.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
  });

  it("can create tables from schema and insert/query data", () => {
    // Create the storefronts table using raw SQL matching the schema
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS storefronts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shipping_policies TEXT,
        return_policy TEXT,
        sustainability_claims TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    db.insert(schema.storefronts).values({
      id: "test-1",
      name: "Test Store",
    }).run();

    const rows = db
      .select()
      .from(schema.storefronts)
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("test-1");
    expect(rows[0].name).toBe("Test Store");
    expect(rows[0].createdAt).toBeDefined();
  });
});

describe("getDb singleton", () => {
  it("returns the same instance on repeated calls", async () => {
    // We need to test the singleton pattern from src/db/index.ts.
    // Since it creates a file-based DB by default, we import and verify identity.
    const { getDb } = await import("../index");
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });
});
