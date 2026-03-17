"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionPreviewProps {
  actionType: string;
  actionLabel: string;
  description: string;
  estimatedRecovery: number; // cents
  clusterId: string;
  simulationRunId: string;
  storefrontId: string;
  onApplied: (actionId: string) => void;
}

// Human-readable labels for action types
const ACTION_TYPE_LABELS: Record<string, string> = {
  add_expedited_shipping: "Add Expedited Shipping",
  structure_return_policy: "Structure Return Policy",
  add_sustainability_certs: "Add Sustainability Certs",
  enrich_product_specs: "Enrich Product Specs",
  reduce_price: "Reduce Prices",
  add_stock_status: "Update Stock Status",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionPreview({
  actionType,
  actionLabel,
  description,
  estimatedRecovery,
  clusterId,
  simulationRunId,
  storefrontId,
  onApplied,
}: ActionPreviewProps) {
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  } | null>(null);

  async function handleApply() {
    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/storefront", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          clusterId,
          simulationRunId,
          actionType,
          storefrontId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to apply: ${res.status}`);
      }

      const data = await res.json();
      setPreview(data.changePreview);
      onApplied(data.actionId);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  const recoveryFmt = `$${(estimatedRecovery / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="default" />
        }
      >
        Apply Fix
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Recommended Fix</DialogTitle>
          <DialogDescription>
            Review the changes below before applying them to your storefront.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">
                {ACTION_TYPE_LABELS[actionType] ?? actionType}
              </Badge>
            </div>
            <p className="text-sm font-medium">{actionLabel}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>

          {/* What will change */}
          <div className="rounded-md border border-border">
            <div className="border-b border-border bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium">What will change</p>
            </div>
            <div className="px-3 py-2 text-xs space-y-1.5">
              {actionType === "add_expedited_shipping" && (
                <>
                  <DiffLine
                    label="Shipping Options"
                    before="Standard only (3-5 days)"
                    after="Standard + Expedited (1-2 days)"
                  />
                </>
              )}
              {actionType === "structure_return_policy" && (
                <>
                  <DiffLine
                    label="Return Policy"
                    before="Free-text, unstructured"
                    after="Structured: 30-day, free returns, machine-readable"
                  />
                </>
              )}
              {actionType === "add_sustainability_certs" && (
                <>
                  <DiffLine
                    label="Certifications"
                    before="None"
                    after="Energy Star, Fair Trade, FSC"
                  />
                </>
              )}
              {actionType === "enrich_product_specs" && (
                <>
                  <DiffLine
                    label="Product Specs"
                    before="Incomplete or missing"
                    after="Full structured specs (wattage, capacity, materials, etc.)"
                  />
                </>
              )}
              {actionType === "reduce_price" && (
                <>
                  <DiffLine
                    label="Pricing"
                    before="Current prices"
                    after="10% reduction on affected products"
                  />
                </>
              )}
              {actionType === "add_stock_status" && (
                <>
                  <DiffLine
                    label="Stock Status"
                    before="Out of stock / uncertain"
                    after="In stock"
                  />
                </>
              )}
            </div>
          </div>

          {/* Recovery estimate */}
          <div className="rounded-md bg-green-50 dark:bg-green-950/30 px-3 py-2">
            <p className="text-xs text-green-800 dark:text-green-300">
              Estimated revenue recovery:{" "}
              <span className="font-bold">{recoveryFmt}</span>
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={applying}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? "Applying..." : "Confirm & Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Diff line helper
// ---------------------------------------------------------------------------

function DiffLine({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex flex-col gap-0.5">
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 font-mono text-red-500">-</span>
          <span className="text-red-600 dark:text-red-400 line-through">
            {before}
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 font-mono text-green-500">+</span>
          <span className="text-green-600 dark:text-green-400">{after}</span>
        </div>
      </div>
    </div>
  );
}
