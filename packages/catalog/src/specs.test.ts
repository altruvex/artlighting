import { describe, expect, it } from "vitest";
import { formatSpecValue, specValueParts } from "./spec-format";
import { normalizeDigits, optionKeyFor, parseSpecValue } from "./specs";

describe("normalizeDigits", () => {
  it("reads Arabic-Indic digits and marks", () => {
    expect(normalizeDigits("١٥")).toBe("15");
    expect(normalizeDigits("٥٠٬٠٠٠")).toBe("50000");
    expect(normalizeDigits("٠٫٥")).toBe("0.5");
  });
});

describe("parseSpecValue", () => {
  it("reads a plain wattage from either script", () => {
    expect(parseSpecValue("maximumWattage", "15", "١٥")).toMatchObject({
      kind: "MEASUREMENT",
      unit: "W",
      measurements: [{ value: "15.0000" }],
    });
    // English missing: Arabic still yields the same number.
    expect(parseSpecValue("maximumWattage", null, "١٥")).toMatchObject({
      measurements: [{ value: "15.0000" }],
    });
  });

  it("keeps a comparator as a comparator, not as text", () => {
    expect(parseSpecValue("cri", "≥ 80", "≥ ٨٠")).toMatchObject({
      kind: "MEASUREMENT",
      comparator: "AT_LEAST",
      measurements: [{ value: "80.0000" }],
    });
  });

  it("splits luminous flux into one figure per colour temperature", () => {
    const parsed = parseSpecValue("luminousFlux", "1320LM (3000k) / 1400LM (6500k)", "٦٢٠ لومن/متر");
    expect(parsed.kind).toBe("MEASUREMENT");
    expect(parsed.unit).toBe("lm");
    expect(parsed.measurements).toEqual([
      { value: "1320.0000", conditionValue: "3000.0000", conditionUnit: "K" },
      { value: "1400.0000", conditionValue: "6500.0000", conditionUnit: "K" },
    ]);
  });

  it("English wins, so a wrong Arabic string cannot survive the conversion", () => {
    // This is the actual jy-202-15w disagreement: the Arabic said 620 lm/m.
    const parsed = parseSpecValue("luminousFlux", "1320LM (3000k) / 1400LM (6500k)", "٦٢٠ لومن/متر");
    expect(parsed.measurements.some((m) => m.value.startsWith("620"))).toBe(false);
  });

  it("records one figure quoted for several temperatures once per temperature", () => {
    expect(parseSpecValue("luminousFlux", "440 LM (3000K / 6500K)", null).measurements).toEqual([
      { value: "440.0000", conditionValue: "3000.0000", conditionUnit: "K" },
      { value: "440.0000", conditionValue: "6500.0000", conditionUnit: "K" },
    ]);
  });

  it("reads a temperature range", () => {
    expect(parseSpecValue("workingTemperature", "-10° to 45° C", null)).toMatchObject({
      kind: "RANGE",
      unit: "°C",
      measurements: [{ value: "-10.0000", valueMax: "45.0000" }],
    });
  });

  it("reads the colour temperatures a fixture is available in", () => {
    expect(parseSpecValue("colorTemperature", "3000K / 4000K /  6500K", null).measurements).toHaveLength(3);
  });

  it("gives a choice column a stable, language-neutral key", () => {
    expect(parseSpecValue("mainMaterial", "Die-Casting Aluminum", "ألمنيوم مصبوب بالقالب")).toMatchObject({
      kind: "CHOICE",
      optionKey: "die_casting_aluminum",
    });
  });

  it("falls back to TEXT rather than guessing a number", () => {
    expect(parseSpecValue("luminousFlux", "see datasheet", null).kind).toBe("TEXT");
    expect(parseSpecValue("beamAngle", "wide", null).kind).toBe("TEXT");
  });
});

describe("optionKeyFor", () => {
  it("is stable across punctuation and case", () => {
    expect(optionKeyFor("Die-Casting Aluminum")).toBe("die_casting_aluminum");
    expect(optionKeyFor("  balcom internal Driver ")).toBe("balcom_internal_driver");
  });

  it("does not reduce a value to a bare number", () => {
    // "90%" used to key as "90", which says nothing about what it is.
    expect(optionKeyFor("90%")).toBe("90_percent");
    expect(optionKeyFor("80")).toBe("value_80");
  });
});

describe("formatSpecValue", () => {
  const flux = {
    kind: "MEASUREMENT" as const,
    unit: "lm",
    comparator: "EXACT" as const,
    measurements: [
      { value: "1320.0000", conditionValue: "3000.0000", conditionUnit: "K" },
      { value: "1400.0000", conditionValue: "6500.0000", conditionUnit: "K" },
    ],
  };

  it("renders the same numbers in both scripts", () => {
    expect(formatSpecValue(flux, "en")).toBe("1,320 lm (3,000 K) / 1,400 lm (6,500 K)");
    const arabic = formatSpecValue(flux, "ar");
    expect(arabic).toContain("١٬٣٢٠");
    expect(arabic).toContain("١٬٤٠٠");
    // The point of the exercise: Arabic cannot claim a different figure.
    expect(arabic).not.toContain("٦٢٠ ");
  });

  it("keeps the comparator", () => {
    expect(
      formatSpecValue({ kind: "MEASUREMENT", comparator: "AT_LEAST", measurements: [{ value: "80" }] }, "en"),
    ).toBe("≥ 80");
  });

  it("renders a range with a word, not a dash that reads as a minus", () => {
    const range = {
      kind: "RANGE" as const,
      unit: "°C",
      comparator: "EXACT" as const,
      measurements: [{ value: "-10", valueMax: "45" }],
    };
    expect(formatSpecValue(range, "en")).toBe("-10 to 45 °C");
    expect(formatSpecValue(range, "ar")).toContain("إلى");
  });

  it("translates the units that are words and leaves the symbols alone", () => {
    const measurement = (unit: string, value: string) => ({
      kind: "MEASUREMENT" as const,
      unit,
      comparator: "EXACT" as const,
      measurements: [{ value }],
    });

    // A word an Arabic reader says in Arabic.
    expect(formatSpecValue(measurement("h", "50000"), "en")).toBe("50,000 h");
    expect(formatSpecValue(measurement("h", "50000"), "ar")).toContain("ساعة");
    expect(formatSpecValue(measurement("W", "15"), "ar")).toBe("١٥ وات");
    expect(formatSpecValue(measurement("lm", "1320"), "ar")).toBe("١٬٣٢٠ لومن");
    expect(formatSpecValue(measurement("K", "3000"), "ar")).toBe("٣٬٠٠٠ كلفن");

    // English is unchanged: these are its own abbreviations.
    expect(formatSpecValue(measurement("W", "15"), "en")).toBe("15 W");
    expect(formatSpecValue(measurement("lm", "1320"), "en")).toBe("1,320 lm");

    // Notation, not words — the same in either script.
    expect(formatSpecValue(measurement("°", "53"), "ar")).toBe("٥٣°");
    expect(formatSpecValue(measurement("°C", "45"), "ar")).toBe("٤٥ °C");
  });

  it("puts a condition's unit through the same table", () => {
    // "١٬٣٢٠ لومن (٣٬٠٠٠ K)" was half translated: the condition printed
    // its unit raw while the figure beside it did not.
    const flux = {
      kind: "MEASUREMENT" as const,
      unit: "lm",
      comparator: "EXACT" as const,
      measurements: [{ value: "1320", conditionValue: "3000", conditionUnit: "K" }],
    };
    expect(formatSpecValue(flux, "ar")).toBe("١٬٣٢٠ لومن (٣٬٠٠٠ كلفن)");
    expect(formatSpecValue(flux, "en")).toBe("1,320 lm (3,000 K)");
  });

  it("collapses a figure repeated for several conditions", () => {
    const same = {
      kind: "MEASUREMENT" as const,
      unit: "K",
      comparator: "EXACT" as const,
      measurements: [{ value: "3000" }, { value: "3000" }],
    };
    expect(formatSpecValue(same, "en")).toBe("3,000 K");
  });

  it("writes the unit once for a plain list of options", () => {
    const temperatures = {
      kind: "MEASUREMENT" as const,
      unit: "K",
      comparator: "EXACT" as const,
      measurements: [{ value: "3000" }, { value: "4000" }, { value: "6500" }],
    };
    expect(formatSpecValue(temperatures, "en")).toBe("3,000 / 4,000 / 6,500 K");
  });

  it("puts the degree sign against its number", () => {
    const angle = {
      kind: "MEASUREMENT" as const,
      unit: "°",
      comparator: "EXACT" as const,
      measurements: [{ value: "53" }],
    };
    expect(formatSpecValue(angle, "en")).toBe("53°");
  });
});

describe("specValueParts", () => {
  it("gives each stored figure its own part, with its condition", () => {
    const flux = {
      kind: "MEASUREMENT" as const,
      unit: "lm",
      comparator: "EXACT" as const,
      measurements: [
        { value: "1320", conditionValue: "3000", conditionUnit: "K" },
        { value: "1400", conditionValue: "6500", conditionUnit: "K" },
      ],
    };
    expect(specValueParts(flux, "en")).toEqual([
      { condition: "3,000 K", text: "1,320 lm" },
      { condition: "6,500 K", text: "1,400 lm" },
    ]);
  });

  it("gives each option its own part when there is no condition", () => {
    const temperatures = {
      kind: "MEASUREMENT" as const,
      unit: "K",
      comparator: "EXACT" as const,
      measurements: [{ value: "3000" }, { value: "4000" }, { value: "6500" }],
    };
    expect(specValueParts(temperatures, "en")).toEqual([
      { text: "3,000 K" },
      { text: "4,000 K" },
      { text: "6,500 K" },
    ]);
  });

  it("keeps a figure quoted for two conditions as two parts", () => {
    const shared = {
      kind: "MEASUREMENT" as const,
      unit: "lm",
      comparator: "EXACT" as const,
      measurements: [
        { value: "440", conditionValue: "3000", conditionUnit: "K" },
        { value: "440", conditionValue: "6500", conditionUnit: "K" },
      ],
    };
    expect(specValueParts(shared, "en")).toHaveLength(2);
  });

  it("collapses a figure repeated with no condition", () => {
    const same = {
      kind: "MEASUREMENT" as const,
      unit: "K",
      comparator: "EXACT" as const,
      measurements: [{ value: "3000" }, { value: "3000" }],
    };
    expect(specValueParts(same, "en")).toEqual([{ text: "3,000 K" }]);
  });

  it("renders the same figures in Arabic digits", () => {
    const flux = {
      kind: "MEASUREMENT" as const,
      unit: "lm",
      comparator: "EXACT" as const,
      measurements: [{ value: "1320", conditionValue: "3000", conditionUnit: "K" }],
    };
    const [part] = specValueParts(flux, "ar");
    expect(part!.text).toContain("١٬٣٢٠");
    expect(part!.condition).toContain("٣٬٠٠٠");
  });

  it("a range stays one part — it is one figure, not two", () => {
    const range = {
      kind: "RANGE" as const,
      unit: "°C",
      comparator: "EXACT" as const,
      measurements: [{ value: "-10", valueMax: "45" }],
    };
    expect(specValueParts(range, "en")).toEqual([{ text: "-10 to 45 °C" }]);
  });
});
