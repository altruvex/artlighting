import { describe, expect, it } from "vitest";
import { computeQuotationTotals } from "./quotation";

describe("computeQuotationTotals", () => {
  it("sums lines and applies VAT to the whole", () => {
    const totals = computeQuotationTotals({
      lines: [
        { quantity: 10, unitPrice: "450.00" },
        { quantity: 2, unitPrice: "1250.50" },
      ],
      taxRate: "0.14",
    });
    expect(totals.subtotal).toBe("7001.00");
    expect(totals.taxTotal).toBe("980.14");
    expect(totals.grandTotal).toBe("7981.14");
  });

  it("takes the line discount before the quotation discount", () => {
    const totals = computeQuotationTotals({
      lines: [{ quantity: 4, unitPrice: "100.00", discountRate: "0.10" }],
      discount: { type: "PERCENTAGE", rate: "0.05" },
      taxRate: "0.14",
    });
    expect(totals.lines[0]).toEqual({ gross: "400.00", discount: "40.00", lineTotal: "360.00" });
    expect(totals.discountTotal).toBe("18.00");
    expect(totals.taxableAmount).toBe("342.00");
    expect(totals.taxTotal).toBe("47.88");
    expect(totals.grandTotal).toBe("389.88");
  });

  it("rounds each line before summing, like a printed quotation", () => {
    const totals = computeQuotationTotals({
      lines: [
        { quantity: 1, unitPrice: "10.005" },
        { quantity: 1, unitPrice: "10.005" },
      ],
    });
    expect(totals.subtotal).toBe("20.02");
  });

  it("never lets a fixed discount exceed the subtotal", () => {
    const totals = computeQuotationTotals({
      lines: [{ quantity: 1, unitPrice: "100.00" }],
      discount: { type: "FIXED", amount: "250.00" },
      taxRate: "0.14",
    });
    expect(totals.discountTotal).toBe("100.00");
    expect(totals.grandTotal).toBe("0.00");
  });

  it("reads a rate as a fraction, never as a percent", () => {
    const totals = computeQuotationTotals({
      lines: [{ quantity: 1, unitPrice: "100.00", discountRate: "0.015" }],
    });
    expect(totals.lines[0]?.discount).toBe("1.50");
  });

  it("is zero for an empty quotation", () => {
    const totals = computeQuotationTotals({ lines: [], taxRate: "0.14" });
    expect(totals.grandTotal).toBe("0.00");
  });
});
