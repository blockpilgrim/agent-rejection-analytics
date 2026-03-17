"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DataQualityBar,
  DataQualityWarnings,
} from "@/components/storefront/data-quality-indicator";
import { formatPrice, stockLabel } from "@/lib/format";
import type { ReactNode } from "react";

export type ProductForDetail = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  structuredSpecs: Record<string, string | number | boolean | null> | null;
  brand: string | null;
  reviewScore: number | null;
  reviewCount: number | null;
  stockStatus: string;
  dataCompletenessScore: number | null;
};

export function ProductDetailDialog({
  product,
  children,
}: {
  product: ProductForDetail;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button className="text-left w-full cursor-pointer" />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {product.category}
            {product.brand ? ` / ${product.brand}` : ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Price & Stock */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {formatPrice(product.price)}
              </span>
              <StockBadge status={product.stockStatus} />
            </div>

            {/* Reviews */}
            {product.reviewScore != null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {product.reviewScore.toFixed(1)} / 5.0
                </span>
                <span className="text-muted-foreground">
                  ({product.reviewCount ?? 0}{" "}
                  {product.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}

            {/* Data Quality */}
            {product.dataCompletenessScore != null && (
              <DataQualityBar score={product.dataCompletenessScore} />
            )}
            <DataQualityWarnings product={product} />

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Description
              </h4>
              <p className="text-sm leading-relaxed">
                {product.description ?? (
                  <span className="italic text-muted-foreground">
                    No description provided
                  </span>
                )}
              </p>
            </div>

            {/* Structured Specs */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Structured Specs
              </h4>
              {product.structuredSpecs &&
              Object.keys(product.structuredSpecs).length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(product.structuredSpecs).map(
                        ([key, value]) => (
                          <tr
                            key={key}
                            className="border-b last:border-b-0"
                          >
                            <td className="bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">
                              {key.replace(/_/g, " ")}
                            </td>
                            <td className="px-3 py-1.5">
                              {value === true
                                ? "Yes"
                                : value === false
                                  ? "No"
                                  : value === null
                                    ? "--"
                                    : String(value)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed px-3 py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No structured specs available
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Agents cannot programmatically evaluate this product
                  </p>
                </div>
              )}
            </div>

            {/* Agent readability warnings */}
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                Agent Readability Notes
              </p>
              {!product.structuredSpecs && (
                <p>
                  -- No structured specs: agents must parse free-text
                  description, which is error-prone.
                </p>
              )}
              {product.reviewCount != null && product.reviewCount < 5 && (
                <p>
                  -- Low review count ({product.reviewCount}): agents with
                  review thresholds will likely reject.
                </p>
              )}
              {product.reviewScore == null && (
                <p>
                  -- No review data: agents requiring social proof will reject.
                </p>
              )}
              {!product.brand && (
                <p>
                  -- No brand listed: brand-conscious agents will skip.
                </p>
              )}
              {product.stockStatus === "out_of_stock" && (
                <p>
                  -- Out of stock: all purchasing agents will reject.
                </p>
              )}
              {product.dataCompletenessScore != null &&
                product.dataCompletenessScore >= 0.8 && (
                  <p>
                    -- This product has strong data coverage and is well-positioned
                    for agent evaluation.
                  </p>
                )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StockBadge({ status }: { status: string }) {
  const variant =
    status === "in_stock"
      ? "secondary"
      : status === "limited"
        ? "outline"
        : "destructive";

  return <Badge variant={variant}>{stockLabel(status)}</Badge>;
}
