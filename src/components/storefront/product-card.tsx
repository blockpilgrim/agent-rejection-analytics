"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DataQualityDot,
  DataQualityWarnings,
} from "@/components/storefront/data-quality-indicator";
import {
  ProductDetailDialog,
  type ProductForDetail,
} from "@/components/storefront/product-detail-dialog";
import { formatPrice, stockLabel } from "@/lib/format";

export function ProductCard({ product }: { product: ProductForDetail }) {
  const stockVariant =
    product.stockStatus === "in_stock"
      ? "secondary"
      : product.stockStatus === "limited"
        ? "outline"
        : "destructive";

  return (
    <ProductDetailDialog product={product}>
      <Card className="h-full transition-shadow hover:ring-2 hover:ring-ring/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm">
                {product.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product.category}
              </p>
            </div>
            <span className="text-base font-bold whitespace-nowrap">
              {formatPrice(product.price)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Review + Stock row */}
          <div className="flex items-center justify-between gap-2">
            {product.reviewScore != null ? (
              <span className="text-xs text-muted-foreground">
                {product.reviewScore.toFixed(1)}/5
                {product.reviewCount != null && (
                  <> ({product.reviewCount})</>
                )}
              </span>
            ) : (
              <span className="text-xs italic text-muted-foreground">
                No reviews
              </span>
            )}
            <Badge variant={stockVariant} className="text-[10px]">
              {stockLabel(product.stockStatus)}
            </Badge>
          </div>

          {/* Data completeness */}
          {product.dataCompletenessScore != null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wide">
                Data Quality
              </span>
              <DataQualityDot score={product.dataCompletenessScore} />
            </div>
          )}

          {/* Warnings */}
          <DataQualityWarnings product={product} />
        </CardContent>
      </Card>
    </ProductDetailDialog>
  );
}
