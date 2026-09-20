import { describe, expect, it } from "vitest";
import { EFFECT, InsufficientStockError, type StockMovementKind } from "./inventory";

/**
 * The write path needs a database and is exercised against the dev branch.
 * What is unit-testable is the arithmetic that decides which of the two
 * numbers a movement touches — which is exactly the part that would be
 * quietly wrong if it were written twice.
 */
describe("movement effects", () => {
  it("a reservation touches only `reserved` — the units are still in the building", () => {
    expect(EFFECT.RESERVE(5)).toEqual({ onHand: 0, reserved: 5 });
    expect(EFFECT.RELEASE(5)).toEqual({ onHand: 0, reserved: -5 });
  });

  it("a sale removes the units and the reservation together", () => {
    // Anything else leaves a reservation against stock that has left.
    expect(EFFECT.SALE(3)).toEqual({ onHand: -3, reserved: -3 });
  });

  it("stock coming in raises onHand and promises nothing", () => {
    for (const kind of ["RECEIPT", "RETURN", "TRANSFER_IN"] as const) {
      expect(EFFECT[kind](7)).toEqual({ onHand: 7, reserved: 0 });
    }
  });

  it("a transfer out removes units without touching reservations", () => {
    expect(EFFECT.TRANSFER_OUT(4)).toEqual({ onHand: -4, reserved: 0 });
  });

  it("an adjustment is signed, because a count can go either way", () => {
    expect(EFFECT.ADJUSTMENT(-2)).toEqual({ onHand: -2, reserved: 0 });
    expect(EFFECT.ADJUSTMENT(2)).toEqual({ onHand: 2, reserved: 0 });
  });

  it("covers every kind, so adding one cannot be forgotten here", () => {
    const kinds: StockMovementKind[] = [
      "RECEIPT", "SALE", "RETURN", "ADJUSTMENT", "RESERVE", "RELEASE", "TRANSFER_IN", "TRANSFER_OUT",
    ];
    for (const kind of kinds) expect(typeof EFFECT[kind]).toBe("function");
    expect(Object.keys(EFFECT).sort()).toEqual([...kinds].sort());
  });

  it("a full cycle returns to where it started", () => {
    let onHand = 0;
    let reserved = 0;
    const apply = (kind: StockMovementKind, quantity: number) => {
      const delta = EFFECT[kind](quantity);
      onHand += delta.onHand;
      reserved += delta.reserved;
    };
    apply("RECEIPT", 10);
    apply("RESERVE", 4);
    apply("SALE", 4);
    apply("RETURN", 4);
    expect({ onHand, reserved }).toEqual({ onHand: 10, reserved: 0 });
  });
});

describe("InsufficientStockError", () => {
  it("names the SKU and both numbers, so the message is actionable", () => {
    const error = new InsufficientStockError("jy-202-15w", 99, 3);
    expect(error.sku).toBe("jy-202-15w");
    expect(error.requested).toBe(99);
    expect(error.available).toBe(3);
    expect(error.message).toBe("Only 3 of jy-202-15w available, 99 requested");
  });
});
