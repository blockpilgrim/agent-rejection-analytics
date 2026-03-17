import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

/** Returns color classes for the data completeness score. */
function scoreColor(score: number) {
  if (score >= 0.8) return { bg: "bg-emerald-500", text: "text-emerald-700" };
  if (score >= 0.5) return { bg: "bg-amber-500", text: "text-amber-700" };
  return { bg: "bg-red-500", text: "text-red-700" };
}

export function DataQualityDot({ score }: { score: number }) {
  const { bg } = scoreColor(score);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", bg)} />
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatPercent(score)}
      </span>
    </span>
  );
}

export function DataQualityBar({ score }: { score: number }) {
  const { bg, text } = scoreColor(score);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Data Completeness
        </span>
        <span className={cn("text-xs font-semibold tabular-nums", text)}>
          {formatPercent(score)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", bg)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Warnings about data quality issues that agents would flag. */
export function DataQualityWarnings({
  product,
}: {
  product: {
    structuredSpecs: Record<string, unknown> | null;
    reviewScore: number | null;
    reviewCount: number | null;
    brand: string | null;
    description: string | null;
    stockStatus: string;
  };
}) {
  const warnings: string[] = [];

  if (!product.structuredSpecs) {
    warnings.push("No structured specs");
  } else if (Object.keys(product.structuredSpecs).length < 3) {
    warnings.push("Incomplete structured specs");
  }

  if (product.reviewScore == null) {
    warnings.push("No review data");
  } else if (product.reviewCount != null && product.reviewCount < 5) {
    warnings.push("Low review count");
  }

  if (!product.brand) {
    warnings.push("No brand listed");
  }

  if (!product.description || product.description.length < 30) {
    warnings.push("Insufficient description");
  }

  if (product.stockStatus === "out_of_stock") {
    warnings.push("Out of stock");
  }

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {warnings.map((w) => (
        <span
          key={w}
          className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
        >
          {w}
        </span>
      ))}
    </div>
  );
}
