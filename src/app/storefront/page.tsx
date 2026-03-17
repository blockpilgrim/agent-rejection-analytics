import { getStorefront, getProductsByStorefront } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductCard } from "@/components/storefront/product-card";
import type { ProductForDetail } from "@/components/storefront/product-detail-dialog";

const STOREFRONT_ID = "sf_001";

export default function StorefrontPage() {
  const storefront = getStorefront(STOREFRONT_ID);

  if (!storefront) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Storefront</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No storefront found. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                npm run db:seed
              </code>{" "}
              to set up the demo data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rawProducts = getProductsByStorefront(STOREFRONT_ID);

  // Group by category
  const categories = new Map<string, ProductForDetail[]>();
  for (const p of rawProducts) {
    const list = categories.get(p.category) ?? [];
    list.push(p as ProductForDetail);
    categories.set(p.category, list);
  }

  // Sort categories alphabetically, products by price descending within each
  const sortedCategories = [...categories.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, prods]) => [
      cat,
      prods.sort((a, b) => b.price - a.price),
    ] as const);

  const shipping = storefront.shippingPolicies;
  const returns = storefront.returnPolicy;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {storefront.name}
        </h1>
        <p className="text-muted-foreground">
          Storefront overview showing all products and their data quality for
          agent evaluation.
        </p>
      </div>

      {/* Policies summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Shipping Policy</CardTitle>
          </CardHeader>
          <CardContent>
            {shipping?.standard ? (
              <p className="text-sm text-muted-foreground">
                {shipping.standard}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No shipping policy defined
              </p>
            )}
            {!shipping?.expedited && (
              <Badge variant="outline" className="mt-2 text-[10px]">
                No expedited option
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Return Policy</CardTitle>
          </CardHeader>
          <CardContent>
            {returns ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {returns.windowDays}-day returns
                  {returns.free ? " (free)" : ""}
                </p>
                {returns.structured === false && (
                  <Badge variant="outline" className="text-[10px]">
                    Not machine-readable
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No return policy defined
              </p>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Sustainability</CardTitle>
          </CardHeader>
          <CardContent>
            {storefront.sustainabilityClaims?.certified ? (
              <Badge variant="secondary">Certified</Badge>
            ) : (
              <div className="space-y-1">
                <p className="text-sm italic text-muted-foreground">
                  No verified claims
                </p>
                <Badge variant="outline" className="text-[10px]">
                  Sustainability unverified
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Catalog summary */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Product Catalog</h2>
        <Badge variant="secondary">{rawProducts.length} products</Badge>
      </div>

      {/* Products by category */}
      {sortedCategories.map(([category, prods]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{category}</h3>
            <Badge variant="outline" className="text-[10px]">
              {prods.length}
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {prods.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
