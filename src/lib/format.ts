/** Format cents as dollar string, e.g. 49999 -> "$499.99" */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a 0-1 score as a percentage string, e.g. 0.73 -> "73%" */
export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Get a human label for stock status */
export function stockLabel(status: string): string {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "out_of_stock":
      return "Out of Stock";
    case "limited":
      return "Limited Stock";
    default:
      return status;
  }
}
