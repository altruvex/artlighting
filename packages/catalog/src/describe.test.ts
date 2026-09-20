import { describe, expect, it } from "vitest";
import { describeProduct } from "./describe";

const spotlight = {
  family: "INDOOR" as const,
  lightingTypeName: "Track Light",
  specs: {
    maximumWattage: "15 W",
    mainMaterial: "Die-cast aluminium",
    luminousFlux: "1,320 lm",
    beamAngle: "24°",
    colorTemperature: "3,000 K",
    cri: "≥ 80",
    ip: "20",
    lifeTime: "50,000 h",
  },
};

const chandelier = {
  family: "CHANDELIER" as const,
  lightingTypeName: "OH1309 Chandelier",
  hNumber: 6,
  specs: { mainMaterial: "Iron", finish: "Chrome", lampBase: "E14", lifeTime: "50,000 h" },
  bulbChoices: [
    {
      id: "b",
      key: "candle_3w",
      wattage: 3,
      base: "E14" as const,
      price: "20.00",
      increase: "0.00",
      name: "Candle",
      isDefault: true,
    },
  ],
};

const keysOf = (product: Parameters<typeof describeProduct>[0], detail?: "short" | "full") =>
  describeProduct(product, detail).map((clause) => clause.key);

describe("describeProduct", () => {
  it("opens with the family and the lighting type", () => {
    expect(keysOf(spotlight)[0]).toBe("openingWithWattage.INDOOR");
    expect(describeProduct(spotlight)[0]?.params).toMatchObject({
      type: "Track Light",
      wattage: "15 W",
    });
  });

  it("drops the wattage from the opening when none is recorded", () => {
    // Otherwise a fixture with no figure reads as one drawing nothing.
    const { maximumWattage: _omitted, ...rest } = spotlight.specs;
    expect(keysOf({ ...spotlight, specs: rest })[0]).toBe("opening.INDOOR");
  });

  it("never branches on brand — the specs decide what it says", () => {
    // The spotlight records a beam and a flux; the chandelier records arms
    // and a finish. Neither names a brand anywhere.
    expect(keysOf(spotlight, "full")).toEqual([
      "openingWithWattage.INDOOR",
      "clause.material",
      "clause.luminousFlux",
      "clause.beamAngle",
      "clause.colorTemperature",
      "clause.cri",
      "clause.ip",
      "clause.lifeTime",
    ]);
    expect(keysOf(chandelier, "full")).toEqual([
      "opening.CHANDELIER",
      "clause.material",
      "clause.armsWithBulb",
      "clause.lampBase",
      "clause.finish",
      "clause.lifeTime",
    ]);
  });

  it("takes the bulb from the assignment, not from a number in a sentence", () => {
    // The old templates promised "9W or 12W bulbs" and multiplied arms by a
    // hard-coded 12. This fixture takes a 3 W candle.
    const clause = describeProduct(chandelier, "full").find((c) => c.key === "clause.armsWithBulb");
    expect(clause?.params).toEqual({ count: 6, bulb: "Candle", wattage: 3 });
  });

  it("counts arms without a bulb when none is assigned", () => {
    const { bulbChoices: _none, ...noBulb } = chandelier;
    expect(describeProduct(noBulb, "full").find((c) => c.key === "clause.arms")?.params).toEqual({
      count: 6,
    });
  });

  it("says nothing about arms for a fixture that has none", () => {
    expect(keysOf(spotlight, "full")).not.toContain("clause.arms");
    expect(keysOf(spotlight, "full")).not.toContain("clause.armsWithBulb");
  });

  it("leaves out a clause whose spec is missing rather than writing N/A", () => {
    const bare = { family: "OUTDOOR" as const, lightingTypeName: "Flood Light", specs: {} };
    expect(keysOf(bare, "full")).toEqual(["opening.OUTDOOR"]);
  });

  it("keeps a card's line short", () => {
    // The opening plus at most three clauses; the page's block takes more.
    const short = keysOf(spotlight, "short");
    expect(short).toHaveLength(4);
    expect(short).toEqual([
      "openingWithWattage.INDOOR",
      "clause.material",
      "clause.luminousFlux",
      "clause.beamAngle",
    ]);
    expect(keysOf(spotlight, "full").length).toBeGreaterThan(short.length);
  });

  it("never emits a clause with an empty value", () => {
    const blank = { ...spotlight, specs: { ...spotlight.specs, mainMaterial: "" } };
    expect(keysOf(blank, "full")).not.toContain("clause.material");
  });
});
