import type { ProductFamily } from "@repo/catalog/families";
import type { L } from "./l10n";

/**
 * What each lighting type in the catalogue is for.
 *
 * Keyed by the shop's `type` facet value (Product.spotlightType), so a
 * description can only exist for a type the catalogue actually stocks. The
 * shop's family view and the product page both read from here: a shopper
 * sees "Linear — continuous lines of light for offices, corridors…" rather
 * than a bare word.
 */
export type LightingType = {
  id: string;
  family: ProductFamily;
  name: L;
  purpose: L;
  /**
   * The words people search for this type with, for its page title. The
   * display name reads well on a shelf; this is how the thing is asked for
   * in Egypt — "فلود لايت", "سبوت لايت", "LED".
   */
  search: L;
};

export const LIGHTING_TYPES: LightingType[] = [
  {
    id: "panel-light",
    family: "INDOOR",
    name: { en: "Panel lights", ar: "إضاءة البانل" },
    search: { en: "LED panel lights", ar: "بانل لايت ليد" },
    purpose: {
      en: "Even, low-glare general light from a flat surface — offices, classrooms, clinics and corridors.",
      ar: "إضاءة عامة متجانسة ومنخفضة الإبهار من سطح مسطّح — للمكاتب والفصول والعيادات والممرات.",
    },
  },
  {
    id: "linear",
    family: "INDOOR",
    name: { en: "Linear lights", ar: "الإضاءة الخطية" },
    search: { en: "LED linear lights", ar: "إضاءة لينير ليد الخطية" },
    purpose: {
      en: "Continuous lines of light that follow the architecture — workspaces, corridors, retail and hospitality.",
      ar: "خطوط إضاءة متصلة تتبع خطوط المعمار — لمساحات العمل والممرات والمحلات والفنادق.",
    },
  },
  {
    id: "cob",
    family: "INDOOR",
    name: { en: "COB spotlights", ar: "كشافات COB" },
    search: { en: "COB LED spotlights", ar: "سبوت لايت COB ليد" },
    purpose: {
      en: "A single concentrated source with a defined beam — accent and general light in homes, shops and lobbies.",
      ar: "مصدر ضوء واحد مركّز بزاوية محددة — لإضاءة التركيز والإضاءة العامة في المنازل والمحلات والاستقبالات.",
    },
  },
  {
    id: "double-spotlight",
    family: "INDOOR",
    name: { en: "Double spotlights", ar: "الكشافات المزدوجة" },
    search: { en: "Double LED spotlights", ar: "سبوت لايت مزدوج ليد" },
    purpose: {
      en: "Two adjustable heads in one fitting — for lighting two surfaces or displays from a single ceiling point.",
      ar: "رأسان قابلان للتوجيه في وحدة واحدة — لإضاءة سطحين أو عرضين من نقطة واحدة في السقف.",
    },
  },
  {
    id: "track-light",
    family: "INDOOR",
    name: { en: "Track lights", ar: "إضاءة التراك" },
    search: { en: "LED track lights", ar: "تراك لايت ليد" },
    purpose: {
      en: "Spotlights on a powered rail that can be moved and re-aimed — showrooms, galleries and changing displays.",
      ar: "كشافات على مجرى كهربائي يمكن تحريكها وإعادة توجيهها — للمعارض والجاليريهات والعروض المتغيرة.",
    },
  },
  {
    id: "strip",
    family: "INDOOR",
    name: { en: "LED strip", ar: "شريط الليد" },
    search: { en: "LED strip lights", ar: "شريط ليد استريب" },
    purpose: {
      en: "Flexible, concealed light for coves, shelves, stairs and joinery — light without a visible fitting.",
      ar: "إضاءة مرنة مخفية للكرانيش والأرفف والسلالم والنجارة — ضوء بدون وحدة ظاهرة.",
    },
  },
  {
    id: "uplight",
    family: "OUTDOOR",
    name: { en: "Uplights", ar: "الإضاءة الأرضية العلوية" },
    search: { en: "LED uplights", ar: "أب لايت أرضي ليد" },
    purpose: {
      en: "Set at ground level and aimed up — to graze walls and columns and lift trees out of the dark.",
      ar: "توضع على مستوى الأرض وتوجَّه لأعلى — لإبراز الحوائط والأعمدة والأشجار في الظلام.",
    },
  },
  {
    id: "spikes",
    family: "OUTDOOR",
    name: { en: "Spike lights", ar: "كشافات السبايك" },
    search: { en: "Garden spike lights", ar: "سبايك لايت للحدائق" },
    purpose: {
      en: "Staked into soil and easy to re-aim as planting grows — accent light for gardens and landscape.",
      ar: "تُثبَّت في التربة ويسهل إعادة توجيهها مع نمو الزرع — إضاءة تركيز للحدائق واللاندسكيب.",
    },
  },
  {
    id: "bollard",
    family: "OUTDOOR",
    name: { en: "Bollards", ar: "البولارد" },
    search: { en: "Bollard lights", ar: "بولارد إضاءة حدائق وممرات" },
    purpose: {
      en: "Low posts that light the ground at walking height — paths, entrances and the edges of landscape.",
      ar: "أعمدة منخفضة تضيء الأرض على مستوى المشي — للممرات والمداخل وحدود اللاندسكيب.",
    },
  },
  {
    id: "pole",
    family: "OUTDOOR",
    name: { en: "Pole lights", ar: "أعمدة الإنارة" },
    search: { en: "LED street and garden poles", ar: "أعمدة إنارة ليد للشوارع والحدائق" },
    purpose: {
      en: "Tall posts that light from above — streets, boulevards, parks and large landscape.",
      ar: "أعمدة طويلة تضيء من أعلى — للشوارع والطرق والحدائق العامة واللاندسكيب الواسع.",
    },
  },
  {
    id: "flood-light",
    family: "OUTDOOR",
    name: { en: "Flood lights", ar: "كشافات الفلود" },
    search: { en: "LED flood lights", ar: "كشافات فلود لايت ليد" },
    purpose: {
      en: "High output over a wide area — facades, yards, car parks and sports and security lighting.",
      ar: "قدرة عالية على مساحة واسعة — للواجهات والساحات والجراجات والملاعب وإضاءة التأمين.",
    },
  },
  {
    id: "wall-washer",
    family: "OUTDOOR",
    name: { en: "Wall washers", ar: "إضاءة وول واشر" },
    search: { en: "LED wall washers", ar: "وول واشر ليد للواجهات" },
    purpose: {
      en: "An even wash of light across a whole wall or facade, without hot spots.",
      ar: "إضاءة متساوية تغمر حائطًا أو واجهة كاملة بدون بقع ضوء مركّزة.",
    },
  },
];

export const lightingType = (id: string | null | undefined) =>
  LIGHTING_TYPES.find((type) => type.id === (id ?? "").toLowerCase());

/** What a family is, in a sentence — for the shop when one family is chosen. */
export const FAMILY_INTRO: Record<ProductFamily, { title: L; body: L }> = {
  INDOOR: {
    title: { en: "Indoor LED lighting and spotlights", ar: "إضاءة ليد داخلية وسبوت لايت" },
    body: {
      en: "Balcom spotlights, panel, linear, track and strip lighting for homes, offices, healthcare and retail. Each type below solves a different part of a room: general light, accent, or light built into the architecture.",
      ar: "كشافات وإضاءة بانل وخطية وتراك وشريط ليد من بالكوم للمنازل والمكاتب والمنشآت الطبية والمحلات. كل نوع بالأسفل يحل جزءًا مختلفًا من المكان: إضاءة عامة، أو إضاءة تركيز، أو إضاءة مدمجة في المعمار.",
    },
  },
  OUTDOOR: {
    title: { en: "Outdoor and landscape lighting", ar: "الإضاءة الخارجية واللاندسكيب" },
    body: {
      en: "Balcom fixtures for facades, gardens, paths and open areas. Outdoor light has two jobs — to make a place safe to move through and to give its architecture a night-time presence — and the IP rating decides where a fixture can go.",
      ar: "وحدات بالكوم للواجهات والحدائق والممرات والمساحات المفتوحة. للإضاءة الخارجية وظيفتان — أن تجعل المكان آمنًا للحركة، وأن تمنح المعمار حضورًا ليليًا — ودرجة الحماية IP هي ما يحدد أين توضع الوحدة.",
    },
  },
  CHANDELIER: {
    title: { en: "Chandeliers and decorative lighting", ar: "النجف والإضاءة الديكورية" },
    body: {
      en: "Mister LED chandeliers, pendants and wall pieces — in integrated LED or with lamps you choose. A decorative fitting sets the character of a room; the rest of the lighting should support it, not compete with it.",
      ar: "نجف ومعلّقات وقطع حائط من مستر ليد — بليد مدمج أو بلمبات تختارها. القطعة الديكورية تحدد طابع المكان، وباقي الإضاءة يجب أن يدعمها لا أن ينافسها.",
    },
  },
};
