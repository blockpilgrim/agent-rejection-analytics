import { describe, it, expect } from "vitest";
import { formatPrice, formatPercent, stockLabel } from "../format";

describe("formatPrice", () => {
  it("converts cents to dollar string", () => {
    expect(formatPrice(49999)).toBe("$499.99");
    expect(formatPrice(100)).toBe("$1.00");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(1)).toBe("$0.01");
  });

  it("handles typical seed product prices", () => {
    // Spot-check a few prices from the seed data
    expect(formatPrice(12999)).toBe("$129.99");
    expect(formatPrice(2499)).toBe("$24.99");
  });
});

describe("formatPercent", () => {
  it("converts 0-1 score to percentage string", () => {
    expect(formatPercent(0.73)).toBe("73%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.5)).toBe("50%");
  });

  it("rounds to nearest integer", () => {
    expect(formatPercent(0.666)).toBe("67%");
    expect(formatPercent(0.334)).toBe("33%");
  });
});

describe("stockLabel", () => {
  it("returns human-readable labels for known statuses", () => {
    expect(stockLabel("in_stock")).toBe("In Stock");
    expect(stockLabel("out_of_stock")).toBe("Out of Stock");
    expect(stockLabel("limited")).toBe("Limited Stock");
  });

  it("passes through unknown status as-is", () => {
    expect(stockLabel("discontinued")).toBe("discontinued");
  });
});
