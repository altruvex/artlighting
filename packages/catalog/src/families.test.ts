import { describe, expect, it } from "vitest";
import {
  FAMILY_SLUGS,
  familiesMatching,
  familyFromSlug,
  familySlug,
  productFamilies,
} from "./families";

describe("family slugs", () => {
  it("round-trips every family", () => {
    for (const family of productFamilies) {
      expect(familyFromSlug(familySlug(family))).toBe(family);
    }
  });

  it("keeps the live URL segments", () => {
    // These are public URLs. Changing one breaks every indexed link.
    expect(FAMILY_SLUGS).toEqual({
      INDOOR: "indoor",
      OUTDOOR: "outdoor",
      CHANDELIER: "chandelier",
    });
  });

  it("accepts a slug as a user or a router might spell it", () => {
    expect(familyFromSlug("Indoor")).toBe("INDOOR");
    expect(familyFromSlug("  chandelier ")).toBe("CHANDELIER");
  });

  it("refuses anything else rather than guessing", () => {
    for (const bad of ["", " ", "indoors", "INDOOR_LIGHTING", "cart", null, undefined]) {
      expect(familyFromSlug(bad)).toBeNull();
    }
  });
});

describe("familiesMatching", () => {
  it("matches a partial term, because search used to be a substring query", () => {
    expect(familiesMatching("chand")).toEqual(["CHANDELIER"]);
    expect(familiesMatching("door")).toEqual(["INDOOR", "OUTDOOR"]);
  });

  it("matches a whole slug", () => {
    expect(familiesMatching("outdoor")).toEqual(["OUTDOOR"]);
  });

  it("returns nothing for a blank term, so the OR clause stays out", () => {
    // An empty `in` would match no rows; leaving the clause off is the point.
    expect(familiesMatching("")).toEqual([]);
    expect(familiesMatching("   ")).toEqual([]);
    expect(familiesMatching(null)).toEqual([]);
  });

  it("returns nothing for a term that is not a family", () => {
    expect(familiesMatching("mc1608")).toEqual([]);
  });
});
