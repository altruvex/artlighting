import { describe, expect, it } from "vitest";
import { formatSpecValue } from "./spec-format";
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
    const hours = { kind: "MEASUREMENT" as const, unit: "h", comparator: "EXACT" as const, measurements: [{ value: "50000" }] };
    expect(formatSpecValue(hours, "en")).toBe("50,000 h");
    expect(formatSpecValue(hours, "ar")).toContain("ساعة");
    const watts = { kind: "MEASUREMENT" as const, unit: "W", comparator: "EXACT" as const, measurements: [{ value: "15" }] };
    expect(formatSpecValue(watts, "ar")).toContain("W");
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
