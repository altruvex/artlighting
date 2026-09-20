import { describe, expect, it } from "vitest";
import { applyPriceOperation, MissingProductsError } from "./products";
import { importRowSchema, moneySchema, rateSchema, skuSchema } from "./schemas";

describe("applyPriceOperation", () => {
  it("sets an exact price", () => {
    expect(applyPriceOperation("729.00", { mode: "set", amount: "899.50" })).toBe("899.50");
  });

  it("adds and subtracts amounts exactly", () => {
    expect(applyPriceOperation("0.10", { mode: "increase_amount", amount: "0.20" })).toBe("0.30");
    expect(applyPriceOperation("729.00", { mode: "decrease_amount", amount: "29.99" })).toBe("699.01");
  });

  it("never produces a negative price", () => {
    expect(applyPriceOperation("10.00", { mode: "decrease_amount", amount: "25.00" })).toBe("0.00");
    expect(applyPriceOperation("10.00", { mode: "decrease_percent", rate: "1" })).toBe("0.00");
  });

  it("applies a percentage as a rate, not a percent", () => {
    // 13% off 729 is 94.77 exactly, so 634.23 — the figure the storefront shows.
    expect(applyPriceOperation("729.00", { mode: "decrease_percent", rate: "0.13" })).toBe("634.23");
    expect(applyPriceOperation("729.00", { mode: "increase_percent", rate: "0.13" })).toBe("823.77");
  });

  it("rounds half up, once, at the end", () => {
    // 1.005 is not representable in binary: (1.005).toFixed(2) is "1.00".
    expect(applyPriceOperation("1.00", { mode: "increase_percent", rate: "0.005" })).toBe("1.01");
  });

  it("is exact where a float would drift", () => {
    let price = "0.00";
    for (let i = 0; i < 10; i++) price = applyPriceOperation(price, { mode: "increase_amount", amount: "0.10" });
    expect(price).toBe("1.00");
  });
});

describe("moneySchema", () => {
  it("normalises to two decimals", () => {
    expect(moneySchema.parse("729")).toBe("729.00");
    expect(moneySchema.parse(729.5)).toBe("729.50");
  });

  it("rejects rather than silently rounding a third decimal", () => {
    expect(moneySchema.safeParse("12.345").success).toBe(false);
  });

  it("rejects negatives and nonsense", () => {
    expect(moneySchema.safeParse("-1").success).toBe(false);
    expect(moneySchema.safeParse("abc").success).toBe(false);
    expect(moneySchema.safeParse("").success).toBe(false);
  });
});

describe("rateSchema", () => {
  it("keeps four decimals and rejects a percent written as a whole number", () => {
    expect(rateSchema.parse("0.13")).toBe("0.1300");
    // 13 would mean 1300% — the mistake this convention exists to prevent.
    expect(rateSchema.safeParse("13").success).toBe(false);
  });
});

describe("skuSchema", () => {
  it("accepts the catalogue's own SKUs", () => {
    expect(skuSchema.parse("jy-202-15w")).toBe("jy-202-15w");
  });

  it("rejects spaces, uppercase and non-ASCII", () => {
    expect(skuSchema.safeParse("jy 202").success).toBe(false);
    expect(skuSchema.safeParse("JY-202").success).toBe(false);
    expect(skuSchema.safeParse("جي-٢٠٢").success).toBe(false);
  });
});

describe("importRowSchema", () => {
  it("needs only a SKU, so a sheet can update one column", () => {
    expect(importRowSchema.parse({ sku: "jy-202-15w" })).toEqual({ sku: "jy-202-15w" });
  });

  it("reports the bad field rather than coercing it", () => {
    const result = importRowSchema.safeParse({ sku: "jy-202-15w", price: "12.345" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["price"]);
  });
});

describe("MissingProductsError", () => {
  it("names the ids that had no product", () => {
    const error = new MissingProductsError(["a", "b"]);
    expect(error.missing).toEqual(["a", "b"]);
    expect(error.message).toContain("a, b");
  });
});
