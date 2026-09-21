import { describe, expect, it } from "vitest";
import { movementsFor, positionFrom, stageFor, type StockStage, type VariantPosition } from "./order-stock";
import { EFFECT } from "./inventory";

/**
 * The transitions are pure; the writes they drive go through recordMovement,
 * whose guarded UPDATE is what refuses an oversell. These pin that every
 * status change moves exactly the difference, whatever the order did before.
 */

/** Applies planned movements to a position the way the ledger would record them. */
function replay(position: VariantPosition, stage: StockStage, quantity: number): VariantPosition {
  const ledger: { kind: string; quantity: number }[] = [];
  // Rebuild a ledger that yields `position`, then append the plan.
  if (position.sold > 0) {
    ledger.push({ kind: "RESERVE", quantity: position.sold });
    ledger.push({ kind: "SALE", quantity: -position.sold });
  }
  if (position.reserved > 0) ledger.push({ kind: "RESERVE", quantity: position.reserved });
  for (const step of movementsFor(stage, quantity, position)) {
    const effect = EFFECT[step.kind](step.quantity);
    ledger.push({ kind: step.kind, quantity: effect.onHand !== 0 ? effect.onHand : effect.reserved });
  }
  return positionFrom(ledger);
}

describe("which stage a status means", () => {
  it("promises stock while the order waits, sells it once it leaves, gives it back when cancelled", () => {
    expect(stageFor("awaiting_shipment")).toBe("reserved");
    expect(stageFor("processing")).toBe("reserved");
    expect(stageFor("shipped")).toBe("sold");
    expect(stageFor("delivered")).toBe("sold");
    expect(stageFor("fulfilled")).toBe("sold");
    expect(stageFor("cancelled")).toBe("released");
    expect(stageFor("refunded")).toBe("released");
  });
});

describe("reading an order's position from its ledger", () => {
  it("counts a sale as leaving the building and clearing its promise", () => {
    expect(
      positionFrom([
        { kind: "RESERVE", quantity: 3 },
        { kind: "SALE", quantity: -2 },
      ]),
    ).toEqual({ reserved: 1, sold: 2 });
  });

  it("ignores movements that are not the order's to make", () => {
    expect(positionFrom([{ kind: "RECEIPT", quantity: 50 }, { kind: "ADJUSTMENT", quantity: -4 }])).toEqual({
      reserved: 0,
      sold: 0,
    });
  });
});

describe("moving an order's stock", () => {
  const none = { reserved: 0, sold: 0 };

  it("reserves on confirmation", () => {
    expect(movementsFor("reserved", 3, none)).toEqual([{ kind: "RESERVE", quantity: 3 }]);
  });

  it("does nothing when the order is already where its status says", () => {
    expect(movementsFor("reserved", 3, { reserved: 3, sold: 0 })).toEqual([]);
    expect(movementsFor("sold", 3, { reserved: 0, sold: 3 })).toEqual([]);
    expect(movementsFor("released", 3, none)).toEqual([]);
  });

  it("ships from the reservation", () => {
    expect(movementsFor("sold", 3, { reserved: 3, sold: 0 })).toEqual([{ kind: "SALE", quantity: 3 }]);
  });

  it("reserves first when shipping an order confirmed before orders reserved stock", () => {
    expect(movementsFor("sold", 2, none)).toEqual([
      { kind: "RESERVE", quantity: 2 },
      { kind: "SALE", quantity: 2 },
    ]);
  });

  it("releases a cancelled order that never shipped", () => {
    expect(movementsFor("released", 3, { reserved: 3, sold: 0 })).toEqual([{ kind: "RELEASE", quantity: 3 }]);
  });

  it("leaves a shipped order's units as sold when it is refunded", () => {
    expect(movementsFor("released", 3, { reserved: 0, sold: 3 })).toEqual([]);
  });

  it("returns and re-reserves when an admin moves a shipped order back", () => {
    expect(movementsFor("reserved", 3, { reserved: 0, sold: 3 })).toEqual([
      { kind: "RETURN", quantity: 3 },
      { kind: "RESERVE", quantity: 3 },
    ]);
  });

  it("lands every stage exactly, from every position, and repeating a stage changes nothing", () => {
    const stages: StockStage[] = ["reserved", "sold", "released"];
    const quantity = 4;
    const positions: VariantPosition[] = [none, { reserved: 4, sold: 0 }, { reserved: 0, sold: 4 }, { reserved: 1, sold: 0 }];
    for (const start of positions) {
      for (const stage of stages) {
        const after = replay(start, stage, quantity);
        if (stage === "reserved") expect(after).toEqual({ reserved: quantity, sold: 0 });
        if (stage === "sold") expect(after).toEqual({ reserved: 0, sold: quantity });
        if (stage === "released") expect(after).toEqual({ reserved: 0, sold: start.sold });
        expect(movementsFor(stage, quantity, after)).toEqual([]);
      }
    }
  });
});
