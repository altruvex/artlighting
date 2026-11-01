import type { SectorId, ServiceId } from "@/lib/company";
import type { L } from "./l10n";

/**
 * The words the company pages say about Art Lighting.
 *
 * Every statement here is either taken from the company profile
 * (public/portfolio/portfolio-artlighting.pdf) or describes something the
 * site itself does. The profile's own phrasing is kept close where it makes
 * a claim — "design, supply and distribution", "after-sales services" — so
 * nothing is promised beyond what the company has already said.
 */

export const POSITIONING = {
  statement: {
    en: "Light is part of how a space is built — not something added once the walls are finished.",
    ar: "الإضاءة جزء من بناء المكان — وليست شيئًا يُضاف بعد انتهاء الحوائط.",
  },
  body: {
    en: "Art Lighting has worked in the design, supply and distribution of lighting in Egypt since 2010. We are the sole authorised agent for Balcom and an authorised agent for Mister LED, and we supply homes, businesses and large projects — hospitals, universities, hotels and residential compounds — from our showroom in Cairo.",
    ar: "تعمل آرت لايتنج في تصميم وتوريد وتوزيع الإضاءة في مصر منذ ٢٠١٠. نحن الوكيل الوحيد المعتمد لبالكوم ووكيل معتمد لمستر ليد، ونورّد للمنازل والشركات والمشروعات الكبرى — مستشفيات وجامعات وفنادق ومجمعات سكنية — من معرضنا في القاهرة.",
  },
} as const;

export const MILESTONE_COPY: Record<number, { title: L; body: L }> = {
  2010: {
    title: { en: "Founded in Cairo", ar: "التأسيس في القاهرة" },
    body: {
      en: "Art Lighting is established and becomes the only authorised agent and distributor for Balcom in Egypt.",
      ar: "تأسست آرت لايتنج وأصبحت الوكيل والموزع الوحيد المعتمد لبالكوم في مصر.",
    },
  },
  2019: {
    title: { en: "Electrical distribution", ar: "التوزيع الكهربائي" },
    body: {
      en: "The company adds electrical distribution services alongside its lighting supply.",
      ar: "أضافت الشركة خدمات التوزيع الكهربائي إلى جانب توريد الإضاءة.",
    },
  },
  2023: {
    title: { en: "Mister LED", ar: "مستر ليد" },
    body: {
      en: "Art Lighting also becomes an authorised agent and distributor for Mister LED chandeliers and decorative lighting.",
      ar: "أصبحت آرت لايتنج أيضًا وكيلًا وموزعًا معتمدًا لنجف وإضاءة مستر ليد الديكورية.",
    },
  },
};

/**
 * How the company approaches lighting. The first three are the aims the
 * profile states — less misuse of the product, longer lamp life, lower
 * maintenance cost; the fourth is its stated sourcing rule.
 */
export const PRINCIPLES: { title: L; body: L }[] = [
  {
    title: { en: "The right fitting for the job", ar: "الوحدة المناسبة للمهمة" },
    body: {
      en: "A good product in the wrong place is still the wrong light. Choosing for the space — not only for the look or the price — is where avoiding misuse of a product begins.",
      ar: "المنتج الجيد في المكان الخطأ يظل إضاءة خاطئة. الاختيار بحسب المكان — لا بحسب الشكل أو السعر وحدهما — هو بداية تجنّب سوء استخدام المنتج.",
    },
  },
  {
    title: { en: "Longer life, lower maintenance", ar: "عمر أطول وصيانة أقل" },
    body: {
      en: "Choosing and using fittings correctly extends the life of the lamps and reduces what a building spends on maintenance — which, over years, matters more than the price on the day.",
      ar: "الاختيار والاستخدام الصحيح للوحدات يطيل عمر اللمبات ويقلل ما ينفقه المبنى على الصيانة — وهذا على مدار السنين أهم من السعر يوم الشراء.",
    },
  },
  {
    title: { en: "Brands we can stand behind", ar: "علامات نستطيع أن نضمنها" },
    body: {
      en: "We work only with reliable, established brands, and represent them directly — so the product, its documentation and its support come from one place.",
      ar: "نعمل فقط مع علامات تجارية موثوقة وراسخة، ونمثلها مباشرة — فيأتي المنتج ومستنداته ودعمه من مكان واحد.",
    },
  },
  {
    title: { en: "Value, not only price", ar: "القيمة لا السعر فقط" },
    body: {
      en: "Where it helps, we adapt how a product is supplied to suit the customer, keeping cost down while getting the most use from the product.",
      ar: "حيث يفيد ذلك، نكيّف طريقة توريد المنتج بما يناسب العميل، مع خفض التكلفة والحصول على أقصى استفادة من المنتج.",
    },
  },
];

export const SECTOR_COPY: Record<SectorId, L> = {
  healthcare: { en: "Healthcare", ar: "المنشآت الطبية" },
  hospitality: { en: "Hotels and resorts", ar: "الفنادق والمنتجعات" },
  residential: { en: "Residential compounds", ar: "المجمعات السكنية" },
  education: { en: "Universities", ar: "الجامعات" },
  civic: { en: "Conference centres", ar: "مراكز المؤتمرات" },
  landscape: { en: "Parks and gardens", ar: "الحدائق والمتنزهات" },
};

/** Named in the company profile but without a page on this site — listed as names only. */
export const PROFILE_PROJECTS: L[] = [
  { en: "Imbaba Hospital", ar: "مستشفى إمبابة" },
  { en: "International Medical Center", ar: "المركز الطبي العالمي" },
  { en: "Triumph Hotel", ar: "فندق تريومف" },
  { en: "West Shorouk Mall", ar: "مول غرب الشروق" },
  { en: "Suez Housing", ar: "إسكان السويس" },
  { en: "University of Technology, Assiut", ar: "الجامعة التكنولوجية بأسيوط" },
  { en: "Sharm El Sheikh Gangway", ar: "ممشى شرم الشيخ" },
  { en: "El Alamein Hotel", ar: "فندق العلمين" },
];

export const SERVICE_COPY: Record<ServiceId, { title: L; summary: L; points: L[]; cta: L }> = {
  selection: {
    title: { en: "Help choosing the right light", ar: "المساعدة في اختيار الإضاءة المناسبة" },
    summary: {
      en: "Send the showroom a photo of the space or its measurements and tell us how it is used. We suggest the fittings that suit it, and how many.",
      ar: "ابعث للمعرض صورة المكان أو مقاساته وأخبرنا كيف يُستخدم، ونقترح عليك الوحدات المناسبة وعددها.",
    },
    points: [
      { en: "By WhatsApp, by phone or in person at the showroom", ar: "عبر واتساب أو الهاتف أو في المعرض" },
      { en: "Colour temperature, beam and IP rating chosen for the room", ar: "درجة اللون والزاوية ودرجة الحماية بحسب المكان" },
      { en: "No obligation to buy", ar: "بدون أي التزام بالشراء" },
    ],
    cta: { en: "Ask the showroom", ar: "اسأل المعرض" },
  },
  projects: {
    title: { en: "Supply for projects", ar: "التوريد للمشروعات" },
    summary: {
      en: "For contractors, developers and consultants: lighting supplied in project quantities, from one source, for hospitals, universities, hotels and residential compounds.",
      ar: "للمقاولين والمطورين والاستشاريين: توريد الإضاءة بكميات المشروعات من مصدر واحد، للمستشفيات والجامعات والفنادق والمجمعات السكنية.",
    },
    points: [
      { en: "Quotations for project quantities", ar: "عروض أسعار لكميات المشروعات" },
      { en: "Balcom and Mister LED supplied directly as their agent", ar: "توريد بالكوم ومستر ليد مباشرة بصفتنا الوكيل" },
      { en: "Electrical distribution alongside the lighting", ar: "التوزيع الكهربائي بجانب الإضاءة" },
    ],
    cta: { en: "Send a project enquiry", ar: "أرسل استفسار مشروع" },
  },
  documentation: {
    title: { en: "Technical documentation", ar: "المستندات الفنية" },
    summary: {
      en: "The information a consultant or a client needs to approve a product: its specifications, the company profile, and the approvals and quality certificates on record.",
      ar: "المعلومات التي يحتاجها الاستشاري أو العميل لاعتماد المنتج: المواصفات، وملف الشركة، والاعتمادات وشهادات الجودة المسجّلة.",
    },
    points: [
      { en: "Full specifications on every product page", ar: "مواصفات كاملة في صفحة كل منتج" },
      { en: "Company profile available to download", ar: "ملف الشركة متاح للتحميل" },
      { en: "Approvals and quality certificates on request", ar: "الاعتمادات وشهادات الجودة عند الطلب" },
    ],
    cta: { en: "Download the company profile", ar: "حمّل ملف الشركة" },
  },
  aftersales: {
    title: { en: "After-sales service", ar: "خدمة ما بعد البيع" },
    summary: {
      en: "The relationship does not end at delivery: the showroom that supplied a product is the one to contact about it afterwards.",
      ar: "العلاقة لا تنتهي عند التسليم: المعرض الذي ورّد المنتج هو نفسه جهة التواصل بشأنه بعد ذلك.",
    },
    points: [
      { en: "One point of contact for the products we supply", ar: "جهة تواصل واحدة للمنتجات التي نوردها" },
      { en: "Saturday to Thursday, 9:30 to 5:30", ar: "من السبت إلى الخميس، ٩:٣٠ صباحًا حتى ٥:٣٠ مساءً" },
    ],
    cta: { en: "Contact support", ar: "تواصل مع الدعم" },
  },
  // Not rendered while SERVICES marks it unavailable. Kept so turning it on
  // is a one-line change once the company offers it.
  studies: {
    title: { en: "Lighting studies", ar: "دراسات الإضاءة" },
    summary: {
      en: "Calculated lighting layouts for a space, from the fittings' photometric data.",
      ar: "تخطيطات إضاءة محسوبة للمساحة من البيانات الضوئية للوحدات.",
    },
    points: [],
    cta: { en: "Request a study", ar: "اطلب دراسة" },
  },
};

/** Who the company works with. */
export const AUDIENCES: L[] = [
  { en: "Homeowners", ar: "أصحاب المنازل" },
  { en: "Interior designers", ar: "مصممو الديكور" },
  { en: "Architects and consultants", ar: "المعماريون والاستشاريون" },
  { en: "Contractors", ar: "المقاولون" },
  { en: "Developers", ar: "المطورون العقاريون" },
  { en: "Businesses", ar: "الشركات" },
];
