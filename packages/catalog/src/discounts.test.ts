import { describe, expect, it } from "vitest";
import { claimRefusal } from "./discounts";

/**
 * What a held discount needs when the customer confirms. The hold itself
 * (at placement) claims nothing, so these limits are only ever checked here.
 */
const open = { usageLimit: null, usageCount: 0, perCustomerLimit: null, isActive: true };

describe("claiming a held discount on confirmation", () => {
  it("claims an active discount with uses left", () => {
    expect(claimRefusal(open, 0)).toBeNull();
    expect(claimRefusal({ ...open, usageLimit: 10, usageCount: 9 }, 0)).toBeNull();
  });

  it("refuses one that was deleted or switched off after the order was placed", () => {
    expect(claimRefusal(undefined, 0)).toMatch(/no longer exists/);
    expect(claimRefusal({ ...open, isActive: false }, 0)).toMatch(/deactivated/);
  });

  it("refuses the use after the last, whoever placed their order first", () => {
    expect(claimRefusal({ ...open, usageLimit: 10, usageCount: 10 }, 0)).toMatch(/usage limit/);
  });

  it("counts only this customer's confirmed uses against their limit", () => {
    // usedByCustomer comes from confirmed orders only: an abandoned order
    // that held the coupon leaves it at 0, so the customer can still use it.
    expect(claimRefusal({ ...open, perCustomerLimit: 1 }, 0)).toBeNull();
    expect(claimRefusal({ ...open, perCustomerLimit: 1 }, 1)).toMatch(/already used/);
  });
});
