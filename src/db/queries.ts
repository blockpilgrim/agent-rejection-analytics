import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { storefronts, products } from "./schema";

export function getStorefront(id: string) {
  return getDb().select().from(storefronts).where(eq(storefronts.id, id)).get();
}

export function getProductsByStorefront(storefrontId: string) {
  return getDb()
    .select()
    .from(products)
    .where(eq(products.storefrontId, storefrontId))
    .all();
}
