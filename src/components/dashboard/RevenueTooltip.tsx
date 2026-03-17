"use client";

import { useState, useRef, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Revenue impact tooltip/explainer
//
// On hover, shows the calculation formula:
// "38 rejections x $479 avg product price = $18,202"
// ---------------------------------------------------------------------------

export function RevenueTooltip({
  rejectionCount,
  avgPrice,
  totalImpact,
  children,
}: {
  rejectionCount: number;
  avgPrice: number; // cents
  totalImpact: number; // cents
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  }

  const avgPriceFmt = `$${(avgPrice / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
  const totalFmt = `$${(totalImpact / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => setVisible(!visible)}
    >
      {children}
      {visible && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="text-xs font-medium text-foreground">
            Revenue Impact Calculation
          </p>
          <div className="mt-1.5 rounded bg-muted px-2 py-1.5 font-mono text-[11px]">
            <span className="text-red-600 dark:text-red-400">
              {rejectionCount}
            </span>{" "}
            rejections{" "}
            <span className="text-muted-foreground">x</span>{" "}
            <span className="font-medium">{avgPriceFmt}</span> avg price{" "}
            <span className="text-muted-foreground">=</span>{" "}
            <span className="font-bold">{totalFmt}</span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Average product price of affected items multiplied by the number of
            agent rejections in this cluster.
          </p>
        </div>
      )}
    </div>
  );
}
