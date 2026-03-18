import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { storefronts, products, buyerProfiles } from "./schema";
import {
  storefrontData,
  productData,
  buyerProfileData,
  computeCompleteness,
} from "./seed-data";

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/local.db";

async function seed() {
  console.log("Seeding database...");

  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = OFF");

  const db = drizzle(sqlite, { schema });

  console.log("  Clearing existing data...");
  db.delete(products).run();
  db.delete(buyerProfiles).run();
  db.delete(storefronts).run();

  console.log("  Inserting storefront...");
  db.insert(storefronts).values(storefrontData).run();

  console.log("  Inserting products...");
  for (const p of productData) {
    db.insert(products).values({
      ...p,
      dataCompletenessScore: computeCompleteness(p),
    }).run();
  }

  console.log("  Inserting buyer profiles...");
  for (const bp of buyerProfileData) {
    db.insert(buyerProfiles).values(bp).run();
  }

  sqlite.pragma("foreign_keys = ON");
  sqlite.close();

  console.log(
    `Seeded 1 storefront, ${productData.length} products, ${buyerProfileData.length} buyer profiles.`
  );
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
