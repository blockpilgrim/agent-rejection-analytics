import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { ensureTables, ensureSeed } from "./init";

const isVercel = !!process.env.VERCEL;

function getDbPath(): string {
  if (isVercel) return "/tmp/local.db";
  return process.env.DATABASE_URL ?? "./data/local.db";
}

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const sqlite = new Database(getDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = OFF");

  // Always ensure schema and seed data exist. On Vercel /tmp is ephemeral so
  // this runs on every cold start. Locally it's a no-op if already seeded.
  ensureTables(sqlite);
  const db = drizzle(sqlite, { schema });
  ensureSeed(db);

  sqlite.pragma("foreign_keys = ON");
  return db;
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
