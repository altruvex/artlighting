/**
 * The catalogue's spec layout: which groups a product's specs fall into,
 * which spec belongs to which group, and what each is called in each
 * language.
 *
 * The backfill built every product's SpecGroups from this, and the admin
 * product editor lays its form out from it, so a spec typed into the editor
 * lands in the same group, under the same label, as the backfill put it.
 * The order is the order the datasheet prints.
 *
 * Pure data: safe to import from a client component.
 */

export interface SpecLayoutField {
  /** The language-neutral `SpecItem.key`. */
  key: string;
  en: string;
  ar: string;
  unit?: string;
}

export interface SpecLayoutGroup {
  en: string;
  ar: string;
  fields: SpecLayoutField[];
}

export const SPEC_LAYOUT: SpecLayoutGroup[] = [
  {
    en: "Electrical",
    ar: "الكهرباء",
    fields: [
      { key: "input", en: "Input", ar: "الجهد" },
      { key: "maximumWattage", en: "Maximum wattage", ar: "أقصى قدرة", unit: "W" },
      { key: "electrical", en: "Driver", ar: "المحول" },
      { key: "powerFactor", en: "Power factor", ar: "معامل القدرة" },
      { key: "fixtureDimmable", en: "Dimmable", ar: "قابل للتعتيم" },
      { key: "energySaving", en: "Energy saving", ar: "توفير الطاقة" },
    ],
  },
  {
    en: "Optical",
    ar: "الإضاءة",
    fields: [
      { key: "luminousFlux", en: "Luminous flux", ar: "شدة الإضاءة", unit: "lm" },
      { key: "colorTemperature", en: "Color temperature", ar: "درجة حرارة اللون", unit: "K" },
      { key: "beamAngle", en: "Beam angle", ar: "زاوية الإضاءة" },
      { key: "cri", en: "CRI", ar: "معامل تجسيد اللون" },
      { key: "brandOfLed", en: "LED brand", ar: "نوع الليد" },
    ],
  },
  {
    en: "Physical",
    ar: "المواصفات المادية",
    fields: [
      { key: "mainMaterial", en: "Main material", ar: "الخامة" },
      { key: "ip", en: "IP rating", ar: "درجة الحماية" },
      { key: "workingTemperature", en: "Working temperature", ar: "درجة حرارة التشغيل" },
      { key: "lifeTime", en: "Lifetime", ar: "العمر الافتراضي" },
    ],
  },
  {
    en: "Chandelier",
    ar: "النجف",
    fields: [
      { key: "finish", en: "Finish", ar: "التشطيب" },
      { key: "lampBase", en: "Lamp base", ar: "قاعدة اللمبة" },
      { key: "bulb", en: "Bulb included", ar: "اللمبة مرفقة" },
    ],
  },
];

/** A group's place in the layout, by its English name; -1 for one the layout does not know. */
export function layoutGroupIndex(englishName: string): number {
  return SPEC_LAYOUT.findIndex((group) => group.en === englishName.trim());
}

/** Where a spec key sits: its group and its place within it. */
export function layoutFieldFor(
  key: string | null | undefined,
): { group: SpecLayoutGroup; groupIndex: number; field: SpecLayoutField; fieldIndex: number } | null {
  if (!key) return null;
  for (const [groupIndex, group] of SPEC_LAYOUT.entries()) {
    const fieldIndex = group.fields.findIndex((field) => field.key === key);
    if (fieldIndex >= 0) return { group, groupIndex, field: group.fields[fieldIndex]!, fieldIndex };
  }
  return null;
}
