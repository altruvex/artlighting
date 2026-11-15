/** Keep legacy imports from undoing the corrections in the driver/strip migrations. */
export const LEGACY_OPTION_LABELS: Record<string, { en: string; ar: string }> =
  {
    balcom_internal_driver: {
      en: "Balcom Internal Driver",
      ar: "درايفر داخلي من بالكوم",
    },
    balcom_external_driver: {
      en: "Balcom External Driver",
      ar: "درايفر خارجي من بالكوم",
    },
    phillips_external_driver: {
      en: "Philips External Driver",
      ar: "درايفر خارجي من فيليبس",
    },
    "90_percent": { en: "90%", ar: "٩٠٪" },
  };

/** null means the legacy template carried a value the catalogue correction removed. */
export function legacySpecValue(
  productId: string,
  key: string,
  value: { en: string | null; ar: string | null },
): { en: string | null; ar: string | null } | null {
  if (!productId.startsWith("jy-5050-12v-")) return value;
  // Documented in 20260923081000 and 20261101120000: these are strips,
  // not the mains-powered die-cast spotlights used as their legacy template.
  if (key === "input") return { en: "DC 12V", ar: "١٢ فولت تيار مستمر" };
  if (key === "mainMaterial")
    return { en: "Flexible PCB", ar: "لوحة PCB مرنة" };
  if (key === "beamAngle") return null;
  return value;
}
