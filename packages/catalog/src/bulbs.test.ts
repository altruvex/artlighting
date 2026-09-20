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
  it("charges the difference from the included bulb, per arm", () => {
    // The listed price already covers 9 W at 25. Picking 15 W at 40 adds
    // 15 an arm, not 40 — charging 40 would bill the customer twice for a
    // bulb the fixture was already sold with.
    expect(bulbPriceIncrease("40.00", "25.00", 8)).toBe("120.00");
    expect(bulbPriceIncrease("40.00", "25.00", 1)).toBe("15.00");
  });

  it("is free to keep the bulb the fixture is sold with", () => {
    expect(bulbPriceIncrease("25.00", "25.00", 8)).toBe("0.00");
  });

  it("takes money off for a cheaper bulb rather than rounding it away", () => {
    // Quietly clamping this to zero would charge for a fitting the
    // customer did not choose.
    expect(bulbPriceIncrease("20.00", "25.00", 4)).toBe("-20.00");
  });

  it("is zero for a fixture with no arms", () => {
    // An LED chandelier has nothing to screw a bulb into.
    expect(bulbPriceIncrease("40.00", "25.00", null)).toBe("0.00");
    expect(bulbPriceIncrease("40.00", "25.00", 0)).toBe("0.00");
  });

  it("keeps the piastres a float would lose", () => {
    expect(bulbPriceIncrease("25.10", "25.00", 3)).toBe("0.30");
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

  it("keeps the real price and shows the difference the customer pays", () => {
    const choices = bulbChoices(rows, 4, "en");
    expect(choices.map((c) => [c.key, c.price, c.increase])).toEqual([
      // The default costs nothing extra; the fixture price already has it.
      ["candle_3w", "25.00", "0.00"],
      ["e27_15w", "40.00", "60.00"],
    ]);
  });

  it("falls back to the cheapest offered bulb when the default is retired", () => {
    // Otherwise every remaining choice reads as an upgrade over a bulb
    // nobody can buy any more.
    const retiredDefault = [
      { isDefault: true, bulb: { ...candle3w, isActive: false } },
      { isDefault: false, bulb: e27_15w },
    ];
    expect(bulbChoices(retiredDefault, 4, "en").map((c) => [c.key, c.increase])).toEqual([
      ["e27_15w", "0.00"],
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
