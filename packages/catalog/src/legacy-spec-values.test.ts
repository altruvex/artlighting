import { describe, expect, it } from "vitest";
import { LEGACY_OPTION_LABELS, legacySpecValue } from "./legacy-spec-values";

describe("legacy imports retain catalogue corrections", () => {
  it("does not put the old spotlight template back onto 12 V strips", () => {
    expect(
      legacySpecValue("jy-5050-12v-3000k", "input", {
        en: "AC 85-265v",
        ar: null,
      }),
    ).toEqual({ en: "DC 12V", ar: "١٢ فولت تيار مستمر" });
    expect(
      legacySpecValue("jy-5050-12v-6500k", "mainMaterial", {
        en: "Die-Casting Aluminum",
        ar: null,
      })?.en,
    ).toBe("Flexible PCB");
    expect(
      legacySpecValue("jy-5050-12v-3000k", "beamAngle", {
        en: "53°",
        ar: null,
      }),
    ).toBeNull();
    expect(
      legacySpecValue("jy-lnsd-012-32w", "beamAngle", { en: "53°", ar: null }),
    ).toEqual({ en: "53°", ar: null });
  });
  it("keeps internal and external drivers distinct in Arabic", () => {
    expect(LEGACY_OPTION_LABELS.balcom_internal_driver?.ar).toContain("داخلي");
    expect(LEGACY_OPTION_LABELS.balcom_external_driver?.ar).toContain("خارجي");
  });
});
