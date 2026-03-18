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

  if (isVercel) {
    // On Vercel, /tmp is ephemeral — create schema and seed on every cold start.
    sqlite.pragma("foreign_keys = OFF");
    ensureTables(sqlite);
    const db = drizzle(sqlite, { schema });
    ensureSeed(db);
    sqlite.pragma("foreign_keys = ON");
    return db;
  }

  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
