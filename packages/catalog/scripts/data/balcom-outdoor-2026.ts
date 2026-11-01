/**
 * The Balcom outdoor "new collection" (2026), transcribed from Ali's
 * datasheet deck `balcom(new-collection)-1.pptx`, one slide per product.
 *
 * Values are the deck's own, with its typos corrected ("Poly Carbonite" →
 * polycarbonate, "Electronic Powder Coating" → electrostatic). What the deck
 * repeats on every slide and cannot be true of each product is left out and
 * reported instead: the "220 × 90 cm" / "130 x 80 mm" dimension rows are the
 * same on bollards and 6 m poles alike.
 *
 * Price is Ali's placeholder: 5,000 EGP for every product until real prices
 * are set.
 */
import type { SpecAddition } from "../../src/spec-write";

export type Subcategory = "bollard" | "pole";

export interface CollectionProduct {
  sku: string;
  subcategory: Subcategory;
  /** Numeric part of the model's wattage, also the variant's wattage. */
  wattage: string;
  description: { en: string; ar: string };
  specs: SpecAddition[];
}

export const PLACEHOLDER_PRICE = "5000";

const DESCRIPTIONS = {
  lattice: {
    en: "A contemporary lattice-frame outdoor bollard with a geometric steel body and warm integrated LED illumination, designed for decorative pathway lighting in gardens and premium residential landscapes.",
    ar: "بولارد خارجي عصري بإطار شبكي وجسم هندسي من الصلب وإضاءة LED دافئة مدمجة، مصمم لإضاءة الممرات الديكورية في الحدائق واللاندسكيب السكني الراقي.",
  },
  laserColumn: {
    en: "A bold architectural column bollard with precision laser-cut geometric openings and warm integrated LED illumination, delivering a striking visual identity for high-end outdoor pathway and landscape projects.",
    ar: "بولارد معماري على شكل عمود بفتحات هندسية مقطوعة بالليزر بدقة وإضاءة LED دافئة مدمجة، يمنح هوية بصرية لافتة لمشروعات الممرات واللاندسكيب الخارجية الراقية.",
  },
  precisionColumn: {
    en: "A precision-engineered column bollard with laser-cut geometric openings and integrated warm LED illumination, combining bold architectural form with functional pathway definition for premium outdoor environments.",
    ar: "بولارد عمودي مصمم هندسيًا بدقة بفتحات هندسية مقطوعة بالليزر وإضاءة LED دافئة مدمجة، يجمع بين الشكل المعماري الجريء وتحديد الممرات بشكل عملي للمساحات الخارجية الراقية.",
  },
  rgbAccent: {
    en: "A sleek, weather-resistant architectural light featuring high-performance LED path lighting and customizable RGB accents for smart landscape projects.",
    ar: "وحدة إضاءة معمارية أنيقة مقاومة للعوامل الجوية، بإضاءة ممرات LED عالية الأداء ولمسات RGB قابلة للتخصيص لمشروعات اللاندسكيب الذكية.",
  },
  tBar: {
    en: "A sophisticated architectural pathway luminaire featuring a sleek, asymmetric T-bar design with integrated, uniform LED lighting, providing an elegant and impactful presence for contemporary outdoor spaces.",
    ar: "وحدة إضاءة معمارية راقية للممرات بتصميم أنيق غير متماثل على شكل حرف T وإضاءة LED مدمجة ومتجانسة، تمنح حضورًا أنيقًا ومؤثرًا للمساحات الخارجية المعاصرة.",
  },
  dualPost: {
    en: "A modern dual-post street pole with staggered, opposing arms and integrated rectangular LED light heads, engineered for versatile and efficient urban area lighting.",
    ar: "عمود إنارة شوارع حديث بقائمين وذراعين متقابلين متدرجين ورؤوس إضاءة LED مستطيلة مدمجة، مصمم لإضاءة المناطق الحضرية بمرونة وكفاءة.",
  },
  solar: {
    en: "A sleek, modern metal street light pole integrating solar panels along its structure to provide clean, sustainable energy for the light fixture on its top arm.",
    ar: "عمود إنارة شوارع معدني عصري وأنيق تتكامل الألواح الشمسية على امتداد هيكله لتوفير طاقة نظيفة ومستدامة لوحدة الإضاءة على ذراعه العلوي.",
  },
  cageLantern: {
    en: "A classic galvanized steel pole with protective cage-guarded lanterns, designed to bring a timeless industrial aesthetic to urban walkways and heritage sites.",
    ar: "عمود كلاسيكي من الصلب المجلفن بفوانيس محمية بأقفاص واقية، مصمم ليضفي طابعًا صناعيًا خالدًا على الممرات الحضرية والمواقع التراثية.",
  },
  victorian: {
    en: "A classic Victorian-style street pole with ornate cast aluminum construction and a decorative lantern head, bringing timeless heritage aesthetics to urban boulevards, parks, and historic districts.",
    ar: "عمود إنارة شوارع كلاسيكي على الطراز الفيكتوري بهيكل مزخرف من الألمنيوم المصبوب ورأس فانوس ديكوري، يضفي جمالًا تراثيًا خالدًا على الشوارع الحضرية والحدائق والأحياء التاريخية.",
  },
} as const;

const ELECTRICAL = "Electrical";
const OPTICAL = "Optical";
const PHYSICAL = "Physical";

/** Free-text spec: stored per language, so both are given. */
const text = (groupName: string, label: string, labelAr: string, value: string, valueAr: string): SpecAddition => ({
  groupName,
  label,
  labelAr,
  value,
  valueAr,
});

const toArabicDigits = (value: string) => value.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);

const input: SpecAddition = { groupName: ELECTRICAL, key: "input", value: "220-240V", valueAr: "٢٢٠-٢٤٠ فولت" };
const driver: SpecAddition = { groupName: ELECTRICAL, key: "electrical", value: "Inventronics", valueAr: "إنفينترونيكس" };
const wattage = (watts: string): SpecAddition => ({ groupName: ELECTRICAL, key: "maximumWattage", value: watts });
const lampCount = (count: string) =>
  text(ELECTRICAL, "No. of lamps", "عدد اللمبات", count, toArabicDigits(count));
const ip65: SpecAddition = { groupName: PHYSICAL, key: "ip", value: "65" };
const dieCastAluminum: SpecAddition = { groupName: PHYSICAL, key: "mainMaterial", value: "Die-Casting Aluminum" };
const steel: SpecAddition = { groupName: PHYSICAL, key: "mainMaterial", value: "Steel", valueAr: "صلب" };
const diffuser = (en: string, ar: string) => text(PHYSICAL, "Diffuser", "الناشر", en, ar);
const glass = diffuser("Glass", "زجاج");
const polycarbonate = diffuser("Polycarbonate", "بولي كربونات");
const allCct = "3000K / 4000K / 6500K";

/** The luminaire rows of a CREE fixture: glass diffuser, 80 lm/W, 50,000 h. */
function cree(watts: string, opts: { cct?: string; lamps?: string } = {}): SpecAddition[] {
  return [
    input,
    wattage(watts),
    driver,
    ...(opts.lamps ? [lampCount(opts.lamps)] : []),
    { groupName: OPTICAL, key: "colorTemperature", value: opts.cct ?? allCct },
    { groupName: OPTICAL, key: "cri", value: "80" },
    { groupName: OPTICAL, key: "brandOfLed", value: "CREE", valueAr: "CREE" },
    text(OPTICAL, "LED type", "نوع الشريحة", "COB", "COB"),
    text(OPTICAL, "Efficacy", "الكفاءة الضوئية", "80 lm/W", "٨٠ لومن/وات"),
    dieCastAluminum,
    glass,
    ip65,
    { groupName: PHYSICAL, key: "lifeTime", value: "50000" },
  ];
}

/** The luminaire rows of an OSRAM fixture: polycarbonate diffuser, 120 lm/W. */
function osram(
  watts: string,
  opts: { lamps?: string; ledType?: string; material?: SpecAddition; lifeTime?: string } = {},
): SpecAddition[] {
  return [
    input,
    wattage(watts),
    driver,
    ...(opts.lamps ? [lampCount(opts.lamps)] : []),
    { groupName: OPTICAL, key: "colorTemperature", value: allCct },
    { groupName: OPTICAL, key: "cri", value: "80" },
    { groupName: OPTICAL, key: "brandOfLed", value: "OSRAM", valueAr: "OSRAM" },
    text(OPTICAL, "LED type", "نوع الشريحة", opts.ledType ?? "COB", opts.ledType ?? "COB"),
    text(OPTICAL, "Efficacy", "الكفاءة الضوئية", "120 lm/W", "١٢٠ لومن/وات"),
    opts.material ?? dieCastAluminum,
    polycarbonate,
    ip65,
    { groupName: PHYSICAL, key: "lifeTime", value: opts.lifeTime ?? "30000" },
  ];
}

/** Height and base plate, from the dimension drawing of the JET-011 poles. */
const poleSize = (heightMm: string): SpecAddition[] => [
  text(PHYSICAL, "Height", "الارتفاع", `${heightMm} mm`, `${toArabicDigits(heightMm)} مم`),
  text(PHYSICAL, "Base plate", "قاعدة التثبيت", "250 × 300 mm", "٢٥٠ × ٣٠٠ مم"),
];

/**
 * The Victorian lantern poles (JET-012, JET-013): the deck gives the pole,
 * base, arm and lantern, and no lamp data at all.
 */
const BASE = "Base";
const ARM = "Arm";
const LUMINAIRE = "Luminaire";
export const EXTRA_GROUP_ARABIC: Record<string, string> = { [BASE]: "القاعدة", [ARM]: "الذراع", [LUMINAIRE]: "الفانوس" };

function lanternPole(): SpecAddition[] {
  return [
    input,
    wattage("100"),
    driver,
    steel,
    ip65,
    text(PHYSICAL, "Pole diameter", "قطر العمود", `6" / 4" / 3"`, `٦" / ٤" / ٣"`),
    text(PHYSICAL, "Pole thickness", "سمك العمود", "2 mm", "٢ مم"),
    text(BASE, "Base height", "ارتفاع القاعدة", "120 cm", "١٢٠ سم"),
    text(BASE, "Material", "الخامة", "Cast aluminum", "ألمنيوم مصبوب"),
    text(BASE, "Base plate", "لوح القاعدة", "30 × 30 cm", "٣٠ × ٣٠ سم"),
    text(BASE, "Plate thickness", "سمك اللوح", "10 mm", "١٠ مم"),
    text(BASE, "Anchor holes", "فتحات التثبيت", "20 mm", "٢٠ مم"),
    text(BASE, "Hole spacing", "المسافة بين الفتحات", "20 × 20 cm", "٢٠ × ٢٠ سم"),
    text(ARM, "Diameter", "القطر", `1.5"`, `١٫٥"`),
    text(ARM, "Projection", "البروز", "60 cm", "٦٠ سم"),
    text(ARM, "Thickness", "السمك", "2 mm", "٢ مم"),
    text(ARM, "Material", "الخامة", "Steel", "صلب"),
    text(LUMINAIRE, "Lantern height", "ارتفاع الفانوس", "60 cm", "٦٠ سم"),
    text(LUMINAIRE, "Material", "الخامة", "Aluminum", "ألمنيوم"),
    text(LUMINAIRE, "Diffuser", "الناشر", "Clear acrylic", "أكريليك شفاف"),
    text(LUMINAIRE, "Finish", "التشطيب", "Electrostatic powder coating", "دهان إلكتروستاتيك"),
  ];
}

export const COLLECTION: CollectionProduct[] = [
  { sku: "bo-004-30w", subcategory: "bollard", wattage: "30", description: DESCRIPTIONS.lattice, specs: cree("30", { lamps: "4" }) },
  { sku: "bo-006-100w", subcategory: "bollard", wattage: "100", description: DESCRIPTIONS.laserColumn, specs: cree("100") },
  { sku: "bo-008-100w", subcategory: "bollard", wattage: "100", description: DESCRIPTIONS.precisionColumn, specs: cree("100") },
  { sku: "bo-014-50w", subcategory: "bollard", wattage: "50", description: DESCRIPTIONS.rgbAccent, specs: osram("50") },
  { sku: "bo-015-50w", subcategory: "bollard", wattage: "50", description: DESCRIPTIONS.rgbAccent, specs: osram("50") },
  { sku: "bo-015-36w", subcategory: "bollard", wattage: "36", description: DESCRIPTIONS.tBar, specs: cree("36", { lamps: "4" }) },
  { sku: "jet-001-100w", subcategory: "pole", wattage: "100", description: DESCRIPTIONS.rgbAccent, specs: cree("100", { lamps: "4", cct: "3000K" }) },
  { sku: "jet-005-100w", subcategory: "pole", wattage: "100", description: DESCRIPTIONS.tBar, specs: cree("100", { lamps: "4" }) },
  { sku: "jet-010-50w", subcategory: "pole", wattage: "50", description: DESCRIPTIONS.rgbAccent, specs: osram("50") },
  { sku: "jet-011-50w", subcategory: "pole", wattage: "50", description: DESCRIPTIONS.rgbAccent, specs: [...osram("50"), ...poleSize("3000")] },
  {
    sku: "jet-011-100w",
    subcategory: "pole",
    wattage: "100",
    description: DESCRIPTIONS.rgbAccent,
    specs: [
      ...osram("100", {
        lamps: "2",
        ledType: "SMD",
        lifeTime: "50000",
        material: { groupName: PHYSICAL, key: "mainMaterial", value: "Die-Casting Aluminum / Steel", valueAr: "ألمنيوم مصبوب بالقالب / صلب" },
      }),
      ...poleSize("6000"),
    ],
  },
  { sku: "jet-003-100w", subcategory: "pole", wattage: "100", description: DESCRIPTIONS.dualPost, specs: cree("100", { lamps: "4" }) },
  { sku: "jet-018-50w", subcategory: "pole", wattage: "50", description: DESCRIPTIONS.rgbAccent, specs: osram("50") },
  { sku: "jet-007-50w", subcategory: "pole", wattage: "50", description: DESCRIPTIONS.solar, specs: cree("50", { cct: "3000K / 6500K" }) },
  { sku: "jet-009-50w", subcategory: "pole", wattage: "50", description: DESCRIPTIONS.solar, specs: cree("50", { cct: "3000K / 6500K" }) },
  { sku: "jet-002-100w", subcategory: "pole", wattage: "100", description: DESCRIPTIONS.cageLantern, specs: cree("100", { lamps: "2" }) },
  { sku: "jet-012-100w", subcategory: "pole", wattage: "100", description: DESCRIPTIONS.victorian, specs: lanternPole() },
  // The deck gives this one the solar pole's description; it is the same
  // Victorian lantern pole as JET-012, spec for spec.
  { sku: "jet-013-100w", subcategory: "pole", wattage: "100", description: DESCRIPTIONS.victorian, specs: lanternPole() },
];
