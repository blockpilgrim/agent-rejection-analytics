import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/local.db";

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
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
