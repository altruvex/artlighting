import { describe, expect, it } from "vitest";
import { bulbChoices, bulbInputSchema, bulbPriceIncrease } from "./bulbs";

const candle3w = {
  id: "b1",
  key: "candle_3w",
  wattage: 3,
  base: "E14" as const,
  price: "25.00",
  isActive: true,
  position: 0,
  translations: [
    { language: "en", name: "Candle" },
    { language: "ar", name: "بلحة" },
  ],
};

const e27_15w = {
  ...candle3w,
  id: "b2",
  key: "e27_15w",
  wattage: 15,
  base: "E27" as const,
  price: "40.00",
  position: 1,
  translations: [
    { language: "en", name: "Standard" },
    { language: "ar", name: "عادية" },
  ],
};

describe("bulbPriceIncrease", () => {
  it("charges per arm", () => {
    // 8 arms at 40 is what a chandelier costs to light, not 40.
    expect(bulbPriceIncrease("40.00", 8)).toBe("320.00");
    expect(bulbPriceIncrease("25.00", 1)).toBe("25.00");
  });

  it("is zero for a fixture with no arms", () => {
    // An LED chandelier has nothing to screw a bulb into.
    expect(bulbPriceIncrease("40.00", null)).toBe("0.00");
    expect(bulbPriceIncrease("40.00", 0)).toBe("0.00");
  });

  it("keeps the piastres a float would lose", () => {
    expect(bulbPriceIncrease("25.10", 3)).toBe("75.30");
  });
});

describe("bulbChoices", () => {
  const rows = [
    { isDefault: true, bulb: candle3w },
    { isDefault: false, bulb: e27_15w },
  ];

  it("offers nothing where no bulb goes", () => {
    expect(bulbChoices(rows, null, "en")).toEqual([]);
    expect(bulbChoices(rows, 0, "en")).toEqual([]);
  });

  it("prices each choice for the arm count", () => {
    const choices = bulbChoices(rows, 4, "en");
    expect(choices.map((c) => [c.key, c.price, c.total])).toEqual([
      ["candle_3w", "25.00", "100.00"],
      ["e27_15w", "40.00", "160.00"],
    ]);
  });

  it("names the shape in the asked-for language, not the wattage", () => {
    // The wattage is a number rendered beside the name. Storing "٣ وات"
    // as a string is how the spec rows came to disagree between languages.
    expect(bulbChoices(rows, 1, "ar").map((c) => c.name)).toEqual(["بلحة", "عادية"]);
    expect(bulbChoices(rows, 1, "en").map((c) => c.name)).toEqual(["Candle", "Standard"]);
  });

  it("falls back to English, then the key, rather than rendering nothing", () => {
    const noArabic = [{ isDefault: true, bulb: { ...candle3w, translations: [{ language: "en", name: "Candle" }] } }];
    expect(bulbChoices(noArabic, 1, "ar")[0]?.name).toBe("Candle");
    const noNames = [{ isDefault: true, bulb: { ...candle3w, translations: [] } }];
    expect(bulbChoices(noNames, 1, "ar")[0]?.name).toBe("candle_3w");
  });

  it("hides a retired bulb but keeps the rest", () => {
    const retired = [
      { isDefault: false, bulb: { ...candle3w, isActive: false } },
      { isDefault: true, bulb: e27_15w },
    ];
    expect(bulbChoices(retired, 2, "en").map((c) => c.key)).toEqual(["e27_15w"]);
  });

  it("marks which one the fixture is sold with", () => {
    expect(bulbChoices(rows, 2, "en").filter((c) => c.isDefault).map((c) => c.key)).toEqual([
      "candle_3w",
    ]);
  });
});

describe("bulbInputSchema", () => {
  const valid = {
    key: "candle_3w",
    wattage: 3,
    base: "E14" as const,
    price: "25.00",
    isActive: true,
    position: 0,
    names: { en: "Candle", ar: "بلحة" },
  };

  it("accepts a well-formed bulb", () => {
    expect(bulbInputSchema.parse(valid).key).toBe("candle_3w");
  });

  it("refuses a key that is not an identifier", () => {
    const bad = bulbInputSchema.safeParse({ ...valid, key: "Candle 3W" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toContain("lowercase letters");
  });

  it("refuses a bulb that draws nothing", () => {
    expect(bulbInputSchema.safeParse({ ...valid, wattage: 0 }).success).toBe(false);
    expect(bulbInputSchema.safeParse({ ...valid, wattage: 2.5 }).success).toBe(false);
  });

  it("refuses a price with more precision than money has", () => {
    const bad = bulbInputSchema.safeParse({ ...valid, price: "25.005" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toContain("decimal places");
  });

  it("insists on a name in both languages", () => {
    expect(bulbInputSchema.safeParse({ ...valid, names: { en: "Candle", ar: "" } }).success).toBe(false);
  });
});
