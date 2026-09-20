import { describe, expect, it } from "vitest";
import { computePricing } from "./compute";
import type { CartLine, DiscountRule } from "./types";

const NOW = new Date("2026-06-15T12:00:00Z");

function line(over: Partial<CartLine> = {}): CartLine {
  return { id: "l1", productId: "p1", categoryIds: ["c1"], unitPrice: "100.00", quantity: 1, ...over };
}

function rule(over: Partial<DiscountRule> = {}): DiscountRule {
  return {
    id: "d1",
    name: "Test",
    type: "PERCENTAGE",
    mode: "AUTOMATIC",
    scope: "CART",
    rate: "0.1000",
    isActive: true,
    ...over,
  };
}

describe("the basics", () => {
  it("prices a cart with no discounts", () => {
    const result = computePricing({ lines: [line({ quantity: 3 })], discounts: [], now: NOW });
    expect(result.subtotal).toBe("300.00");
    expect(result.discountTotal).toBe("0.00");
    expect(result.grandTotal).toBe("300.00");
  });

  it("treats a percentage as a rate, not a percent", () => {
    // 13 would be 1300%. This is the convention the whole codebase uses,
    // and the one that already shipped a cart charging 0.13%.
    const result = computePricing({
      lines: [line({ unitPrice: "729.00" })],
      discounts: [rule({ rate: "0.1300" })],
      now: NOW,
    });
    expect(result.discountTotal).toBe("94.77");
    expect(result.grandTotal).toBe("634.23");
  });

  it("adds tax on the discounted subtotal, not the original", () => {
    const result = computePricing({
      lines: [line({ unitPrice: "100.00" })],
      discounts: [rule({ rate: "0.1000" })],
      taxRate: "0.14",
      now: NOW,
    });
    expect(result.discountTotal).toBe("10.00");
    expect(result.tax).toBe("12.60"); // 14% of 90, not of 100
    expect(result.grandTotal).toBe("102.60");
  });

  it("adds shipping after tax", () => {
    const result = computePricing({
      lines: [line()],
      discounts: [],
      shipping: "69.00",
      now: NOW,
    });
    expect(result.grandTotal).toBe("169.00");
  });
});

describe("eligibility", () => {
  const cases: [string, Partial<DiscountRule>, string][] = [
    ["inactive", { isActive: false }, "inactive"],
    ["not started", { startsAt: new Date("2026-07-01") }, "not_started"],
    ["expired", { endsAt: new Date("2026-06-01") }, "expired"],
    ["used up", { usageLimit: 5, usageCount: 5 }, "usage_limit_reached"],
    ["below minimum", { minOrderValue: "500.00" }, "below_minimum_order"],
  ];

  for (const [label, over, reason] of cases) {
    it(`rejects a discount that is ${label}`, () => {
      const result = computePricing({ lines: [line()], discounts: [rule(over)], now: NOW });
      expect(result.applied).toHaveLength(0);
      expect(result.rejected[0]?.reason).toBe(reason);
      expect(result.grandTotal).toBe("100.00");
    });
  }

  it("counts this customer's own redemptions against a per-customer limit", () => {
    const result = computePricing({
      lines: [line()],
      discounts: [rule({ perCustomerLimit: 1 })],
      customer: { redemptionsByDiscountId: { d1: 1 } },
      now: NOW,
    });
    expect(result.rejected[0]?.reason).toBe("customer_limit_reached");
  });

  it("checks the minimum against the undiscounted subtotal", () => {
    // Otherwise whether a discount qualifies depends on which other
    // discount ran first.
    const result = computePricing({
      lines: [line({ unitPrice: "100.00" })],
      discounts: [
        rule({ id: "a", rate: "0.5000", stackable: true, priority: 0 }),
        rule({ id: "b", minOrderValue: "100.00", amount: "5.00", type: "FIXED", rate: null, stackable: true, priority: 1 }),
      ],
      now: NOW,
    });
    expect(result.applied.map((a) => a.discountId)).toEqual(["a", "b"]);
  });
});

describe("scope", () => {
  const lines = [
    line({ id: "l1", productId: "p1", categoryIds: ["c1"], unitPrice: "100.00" }),
    line({ id: "l2", productId: "p2", categoryIds: ["c2"], unitPrice: "200.00" }),
  ];

  it("applies a product-scoped discount only to its products", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "PRODUCTS", productIds: ["p1"], rate: "0.1000" })],
      now: NOW,
    });
    expect(result.discountTotal).toBe("10.00");
    expect(result.lines.find((l) => l.id === "l1")?.discount).toBe("10.00");
    expect(result.lines.find((l) => l.id === "l2")?.discount).toBe("0.00");
  });

  it("applies a category-scoped discount to the lines in that category", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "CATEGORIES", categoryIds: ["c2"], rate: "0.1000" })],
      now: NOW,
    });
    expect(result.discountTotal).toBe("20.00");
    expect(result.lines.find((l) => l.id === "l2")?.discount).toBe("20.00");
  });

  it("rejects a discount whose products are not in the cart", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "PRODUCTS", productIds: ["p99"] })],
      now: NOW,
    });
    expect(result.rejected[0]?.reason).toBe("no_matching_lines");
  });

  it("spreads a cart-scoped discount across the lines, and the parts add up", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "CART", rate: "0.1000" })],
      now: NOW,
    });
    const parts = result.lines.map((l) => Number(l.discount));
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(Number(result.discountTotal), 2);
  });
});

describe("coupons", () => {
  const coupon = rule({ id: "c", mode: "COUPON", code: "SUMMER10", rate: "0.1000" });

  it("does not apply a coupon nobody typed", () => {
    const result = computePricing({ lines: [line()], discounts: [coupon], now: NOW });
    expect(result.applied).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
    expect(result.grandTotal).toBe("100.00");
  });

  it("applies one that was typed, whatever the case", () => {
    for (const typed of ["SUMMER10", "summer10", " Summer10 "]) {
      const result = computePricing({ lines: [line()], discounts: [coupon], coupon: typed, now: NOW });
      expect(result.applied[0]?.code).toBe("SUMMER10");
      expect(result.grandTotal).toBe("90.00");
    }
  });

  it("says so when the code matches nothing", () => {
    const result = computePricing({ lines: [line()], discounts: [coupon], coupon: "NOPE", now: NOW });
    expect(result.rejected.some((r) => r.reason === "unknown_code")).toBe(true);
  });
});

describe("stacking", () => {
  it("lets the best non-stackable discount win and says the others were outranked", () => {
    const result = computePricing({
      lines: [line({ unitPrice: "100.00" })],
      discounts: [
        rule({ id: "small", rate: "0.1000" }),
        rule({ id: "big", rate: "0.2500" }),
      ],
      now: NOW,
    });
    expect(result.applied.map((a) => a.discountId)).toEqual(["big"]);
    expect(result.rejected).toEqual([
      expect.objectContaining({ discountId: "small", reason: "outranked" }),
    ]);
    expect(result.grandTotal).toBe("75.00");
  });

  it("breaks a tie the same way regardless of input order", () => {
    const a = rule({ id: "aaa", rate: "0.1000", priority: 5 });
    const b = rule({ id: "bbb", rate: "0.1000", priority: 1 });
    const one = computePricing({ lines: [line()], discounts: [a, b], now: NOW });
    const two = computePricing({ lines: [line()], discounts: [b, a], now: NOW });
    expect(one.applied[0]?.discountId).toBe("bbb"); // lower priority number wins
    expect(two.applied[0]?.discountId).toBe("bbb");
  });

  it("applies every stackable discount, one after the other", () => {
    const result = computePricing({
      lines: [line({ unitPrice: "100.00" })],
      discounts: [
        rule({ id: "a", rate: "0.1000", stackable: true, priority: 0 }),
        rule({ id: "b", rate: "0.1000", stackable: true, priority: 1 }),
      ],
      now: NOW,
    });
    // The second applies to what is left, not to the original: 10 then 9.
    expect(result.discountTotal).toBe("19.00");
    expect(result.grandTotal).toBe("81.00");
  });

  it("lets one non-stackable winner combine with the stackable ones", () => {
    const result = computePricing({
      lines: [line({ unitPrice: "100.00" })],
      discounts: [
        rule({ id: "excl-small", rate: "0.1000" }),
        rule({ id: "excl-big", rate: "0.2000" }),
        rule({ id: "stack", amount: "5.00", type: "FIXED", rate: null, stackable: true }),
      ],
      now: NOW,
    });
    expect(result.applied.map((a) => a.discountId)).toEqual(["excl-big", "stack"]);
    expect(result.discountTotal).toBe("25.00");
  });
});

describe("a fixed amount", () => {
  it("never takes more than the cart is worth", () => {
    const result = computePricing({
      lines: [line({ unitPrice: "30.00" })],
      discounts: [rule({ type: "FIXED", amount: "500.00", rate: null })],
      now: NOW,
    });
    expect(result.discountTotal).toBe("30.00");
    expect(result.grandTotal).toBe("0.00");
  });
});

/**
 * Property tests. The two the plan asks for, run over generated carts —
 * these are the invariants that matter more than any single example.
 */
describe("properties", () => {
  const rng = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  function randomCase(next: () => number) {
    const lineCount = 1 + Math.floor(next() * 4);
    const lines: CartLine[] = Array.from({ length: lineCount }, (_, i) => ({
      id: `l${i}`,
      productId: `p${i}`,
      categoryIds: [`c${i % 2}`],
      unitPrice: (1 + Math.floor(next() * 99_999) / 100).toFixed(2),
      quantity: 1 + Math.floor(next() * 5),
    }));
    const discountCount = Math.floor(next() * 4);
    const discounts: DiscountRule[] = Array.from({ length: discountCount }, (_, i) => {
      const percentage = next() > 0.4;
      return {
        id: `d${i}`,
        name: `d${i}`,
        type: percentage ? "PERCENTAGE" : "FIXED",
        mode: "AUTOMATIC",
        scope: (["PRODUCTS", "CATEGORIES", "CART"] as const)[Math.floor(next() * 3)]!,
        rate: percentage ? (0.01 + Math.floor(next() * 99) / 100).toFixed(4) : null,
        amount: percentage ? null : (1 + Math.floor(next() * 50_000) / 100).toFixed(2),
        productIds: [`p${Math.floor(next() * lineCount)}`],
        categoryIds: [`c${Math.floor(next() * 2)}`],
        stackable: next() > 0.5,
        priority: Math.floor(next() * 5),
        isActive: true,
      };
    });
    return { lines, discounts };
  }

  it("never lets a total go negative, over 400 generated carts", () => {
    const next = rng(20260921);
    for (let i = 0; i < 400; i++) {
      const result = computePricing({ ...randomCase(next), taxRate: "0.14", now: NOW });
      expect(Number(result.grandTotal)).toBeGreaterThanOrEqual(0);
      expect(Number(result.discountTotal)).toBeLessThanOrEqual(Number(result.subtotal) + 0.001);
      for (const priced of result.lines) expect(Number(priced.total)).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives the same answer whatever order all-stackable discounts arrive in", () => {
    const next = rng(777);
    for (let i = 0; i < 200; i++) {
      const { lines, discounts } = randomCase(next);
      // The property only holds when every discount stacks and their
      // priorities are distinct; otherwise priority order is the tie-break
      // and that is the point of it.
      const stackable = discounts.map((d, index) => ({ ...d, stackable: true, priority: index }));
      const forwards = computePricing({ lines, discounts: stackable, now: NOW });
      const backwards = computePricing({ lines, discounts: [...stackable].reverse(), now: NOW });
      expect(backwards.grandTotal).toBe(forwards.grandTotal);
      expect(backwards.discountTotal).toBe(forwards.discountTotal);
    }
  });

  it("keeps the line discounts adding up to the discount total", () => {
    const next = rng(31337);
    for (let i = 0; i < 300; i++) {
      const result = computePricing({ ...randomCase(next), now: NOW });
      const summed = result.lines.reduce((total, l) => total + Number(l.discount), 0);
      expect(summed).toBeCloseTo(Number(result.discountTotal), 2);
    }
  });
});

describe("family scope", () => {
  const lines: CartLine[] = [
    { id: "in", productId: "p1", categoryIds: ["c1"], family: "INDOOR", unitPrice: "100.00", quantity: 1 },
    { id: "out", productId: "p2", categoryIds: ["c2"], family: "OUTDOOR", unitPrice: "200.00", quantity: 1 },
    { id: "none", productId: "p3", categoryIds: ["c3"], family: null, unitPrice: "400.00", quantity: 1 },
  ];

  it("covers only the lines in the chosen families", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "FAMILIES", families: ["OUTDOOR"], rate: "0.1000" })],
      now: NOW,
    });
    expect(result.discountTotal).toBe("20.00");
    expect(result.lines.find((l) => l.id === "out")?.discount).toBe("20.00");
    expect(result.lines.find((l) => l.id === "in")?.discount).toBe("0.00");
  });

  it("covers several families at once", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "FAMILIES", families: ["INDOOR", "OUTDOOR"], rate: "0.1000" })],
      now: NOW,
    });
    expect(result.discountTotal).toBe("30.00");
  });

  it("leaves a line with no family alone rather than guessing one", () => {
    const result = computePricing({
      lines,
      discounts: [rule({ scope: "FAMILIES", families: ["INDOOR", "OUTDOOR", "CHANDELIER"], rate: "0.5000" })],
      now: NOW,
    });
    expect(result.lines.find((l) => l.id === "none")?.discount).toBe("0.00");
  });

  it("rejects a family discount when nothing in the cart is in it", () => {
    const result = computePricing({
      lines: [lines[0]!],
      discounts: [rule({ scope: "FAMILIES", families: ["CHANDELIER"] })],
      now: NOW,
    });
    expect(result.rejected[0]?.reason).toBe("no_matching_lines");
  });
});

describe("the date window", () => {
  const within = rule({ startsAt: new Date("2026-06-01"), endsAt: new Date("2026-07-01"), rate: "0.1000" });

  it("applies inside the window", () => {
    const result = computePricing({ lines: [line()], discounts: [within], now: NOW });
    expect(result.grandTotal).toBe("90.00");
  });

  it("is exclusive at the end, so a window can meet the next one without overlapping", () => {
    const atEnd = computePricing({ lines: [line()], discounts: [within], now: new Date("2026-07-01T00:00:00Z") });
    expect(atEnd.rejected[0]?.reason).toBe("expired");
    const justBefore = computePricing({ lines: [line()], discounts: [within], now: new Date("2026-06-30T23:59:59Z") });
    expect(justBefore.applied).toHaveLength(1);
  });

  it("is inclusive at the start", () => {
    const atStart = computePricing({ lines: [line()], discounts: [within], now: new Date("2026-06-01T00:00:00Z") });
    expect(atStart.applied).toHaveLength(1);
  });
});
