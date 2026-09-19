import { describe, expect, it } from "vitest";
import {
  addMoney,
  applyPercent,
  applyRate,
  clampNonNegative,
  compareMoney,
  formatMoney,
  money,
  multiplyMoney,
  roundMoney,
  roundRate,
  serializeMoney,
  subtractMoney,
  sumMoney,
} from "./index";

describe("float pitfalls", () => {
  it("adds 0.1 and 0.2 exactly", () => {
    expect(serializeMoney(addMoney("0.1", "0.2"))).toBe("0.30");
    // The reason this module exists.
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it("keeps a long sum exact where floats drift", () => {
    const tenCents = Array.from({ length: 10 }, () => "0.1");
    expect(serializeMoney(sumMoney(tenCents))).toBe("1.00");
    expect(tenCents.reduce((t, v) => t + Number(v), 0)).not.toBe(1);
  });

  it("parses a number through its digits, not its binary form", () => {
    expect(money(1.005).toFixed(3)).toBe("1.005");
  });
});

describe("rounding", () => {
  it("rounds half up at the money scale", () => {
    expect(serializeMoney("2.345")).toBe("2.35");
    expect(serializeMoney("2.344")).toBe("2.34");
    expect(serializeMoney("-2.345")).toBe("-2.35");
  });

  it("rounds 1.005 up, which Number.toFixed gets wrong", () => {
    expect(serializeMoney("1.005")).toBe("1.01");
    expect((1.005).toFixed(2)).toBe("1.00");
  });

  it("rounds rates at 4 decimals", () => {
    expect(roundRate("0.12345").toString()).toBe("0.1235");
    expect(roundRate("0.123449").toString()).toBe("0.1234");
  });

  it("rounds a line total once, not per unit", () => {
    // 3 × 10.005 = 30.015 -> 30.02, not 3 × 10.01 = 30.03
    expect(serializeMoney(multiplyMoney("10.005", 3))).toBe("30.02");
  });
});

describe("percentages and rates", () => {
  it("computes a 13% discount on a real catalogue price", () => {
    expect(serializeMoney(applyRate("729", "0.13"))).toBe("94.77");
    expect(serializeMoney(applyPercent("729", 13))).toBe("94.77");
  });

  it("computes 14% VAT", () => {
    expect(serializeMoney(applyPercent("1525", 14))).toBe("213.50");
  });

  it("discounts then totals without drift", () => {
    const unit = money("1319");
    const quantity = 3;
    const subtotal = multiplyMoney(unit, quantity);
    const discount = applyPercent(subtotal, 12.5);
    const shipping = money("150");
    const total = addMoney(subtractMoney(subtotal, discount), shipping);
    expect(serializeMoney(subtotal)).toBe("3957.00");
    expect(serializeMoney(discount)).toBe("494.63");
    expect(serializeMoney(total)).toBe("3612.37");
  });

  it("never returns a negative total", () => {
    expect(serializeMoney(clampNonNegative(subtractMoney("100", "150")))).toBe("0.00");
  });
});

describe("boundaries", () => {
  it("round-trips through the serialized form", () => {
    const original = money("8789.45");
    expect(serializeMoney(money(serializeMoney(original)))).toBe("8789.45");
  });

  it("keeps precision a JSON number would lose", () => {
    const big = "12345678901.99";
    expect(serializeMoney(money(big))).toBe(big);
  });

  it("compares without converting to number", () => {
    expect(compareMoney("10.10", "10.09")).toBe(1);
    expect(compareMoney("10.10", "10.10")).toBe(0);
  });

  it("rejects values that aren't amounts", () => {
    expect(() => money("abc")).toThrow();
    expect(() => money(Number.NaN)).toThrow();
    expect(() => money(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("formatting", () => {
  it("formats EGP for both locales", () => {
    expect(formatMoney("1525.5", { locale: "en" })).toContain("1,525.50");
    // Arabic keeps Latin digits (ICU's default for `ar`) and carries the
    // Egyptian pound symbol — the same convention as the admin UI.
    const arabic = formatMoney("1525.5", { locale: "ar" });
    expect(arabic).toContain("1,525.50");
    expect(arabic).toContain("ج.م");
  });

  it("formats from the string form, not a lossy number", () => {
    expect(formatMoney("12345678901.99", { locale: "en" })).toContain("12,345,678,901.99");
  });

  it("rounds for display the same way it rounds for storage", () => {
    expect(formatMoney("2.345", { locale: "en" })).toContain("2.35");
    expect(serializeMoney(roundMoney("2.345"))).toBe("2.35");
  });
});
