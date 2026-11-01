import type { L } from "./l10n";

/**
 * Questions customers ask, answered only with what the company does.
 *
 * The page this replaces said Art Lighting sells floor and table lamps
 * (it does not), makes custom fixtures, is an Energy Star partner, ships in
 * one to two days (the site promises four), refunds within fourteen days
 * with free return shipping, and gives a three-year warranty on
 * everything — none of it written anywhere the company wrote it. Returns
 * and warranty now point at their own policy pages (content/policies).
 *
 * `link` points the answer at the page that says more.
 */
export type Faq = { q: L; a: L; link?: { href: string; label: L } };
export type FaqGroup = { id: string; title: L; items: Faq[] };

export const FAQ: FaqGroup[] = [
  {
    id: "products",
    title: { en: "Products and brands", ar: "المنتجات والعلامات" },
    items: [
      {
        q: { en: "What does Art Lighting sell?", ar: "ماذا تبيع آرت لايتنج؟" },
        a: {
          en: "Architectural lighting from Balcom — COB spotlights, panel, linear, track and strip lighting indoors; flood lights, wall washers, uplights, spike lights and bollards outdoors — and chandeliers and decorative lighting from Mister LED.",
          ar: "إضاءة معمارية من بالكوم — كشافات COB وإضاءة بانل وخطية وتراك وشريط ليد للداخل، وكشافات فلود ووول واشر وإضاءة أرضية وسبايك وبولارد للخارج — ونجف وإضاءة ديكورية من مستر ليد.",
        },
        link: { href: "/products", label: { en: "Browse the catalogue", ar: "تصفّح المنتجات" } },
      },
      {
        q: { en: "Are you an authorised agent for these brands?", ar: "هل أنتم وكيل معتمد لهذه العلامات؟" },
        a: {
          en: "Yes. Art Lighting has been the sole authorised agent and distributor for Balcom in Egypt since 2010, and an authorised agent and distributor for Mister LED since 2023.",
          ar: "نعم. آرت لايتنج هي الوكيل والموزع الوحيد المعتمد لبالكوم في مصر منذ ٢٠١٠، ووكيل وموزع معتمد لمستر ليد منذ ٢٠٢٣.",
        },
        link: { href: "/about-us", label: { en: "About the company", ar: "عن الشركة" } },
      },
      {
        q: { en: "How do I choose the right light for my space?", ar: "كيف أختار الإضاءة المناسبة لمكاني؟" },
        a: {
          en: "Start from the space: the applications section explains what each kind of room needs and which lighting types suit it, and the lighting guide explains colour temperature, beam angle, CRI and IP ratings. If you are still unsure, send the showroom a photo or the measurements of the room on WhatsApp and they will suggest fittings and quantities.",
          ar: "ابدأ من المكان: قسم الاستخدامات يشرح ما تحتاجه كل مساحة وأنواع الإضاءة المناسبة لها، ودليل الإضاءة يشرح درجة اللون وزاوية الإضاءة ومؤشر CRI ودرجات الحماية IP. وإذا كنت ما زلت مترددًا، ابعث للمعرض صورة أو مقاسات المكان على واتساب وسيقترحون عليك الوحدات وعددها.",
        },
        link: { href: "/applications", label: { en: "Applications", ar: "الاستخدامات" } },
      },
      {
        q: { en: "Can I choose the colour temperature and IP rating?", ar: "هل يمكنني اختيار درجة اللون ودرجة الحماية؟" },
        a: {
          en: "For many products, yes. The product page shows the colour temperatures and IP ratings each fitting is available in, and any price difference, before you add it to the cart.",
          ar: "في كثير من المنتجات نعم. صفحة المنتج توضح درجات اللون ودرجات الحماية المتاحة لكل وحدة وأي فرق في السعر قبل إضافتها للسلة.",
        },
      },
    ],
  },
  {
    id: "orders",
    title: { en: "Orders, delivery and payment", ar: "الطلبات والتوصيل والدفع" },
    items: [
      {
        q: { en: "How long does delivery take?", ar: "كم يستغرق التوصيل؟" },
        a: { en: "Orders are delivered within four working days.", ar: "يتم توصيل الطلبات خلال أربعة أيام عمل." },
        link: { href: "/shipping", label: { en: "Delivery and payment", ar: "التوصيل والدفع" } },
      },
      {
        q: { en: "How much is delivery?", ar: "كم تكلفة التوصيل؟" },
        a: {
          en: "Standard delivery is a flat EGP 69 per order, however many products it holds. For addresses outside Cairo, the showroom confirms the delivery cost with you before the order is sent.",
          ar: "التوصيل القياسي بسعر ثابت ٦٩ جنيهًا للطلب مهما كان عدد المنتجات. وللعناوين خارج القاهرة، يؤكد المعرض معك تكلفة التوصيل قبل إرسال الطلب.",
        },
      },
      {
        q: { en: "How do I pay?", ar: "كيف أدفع؟" },
        a: { en: "Cash on delivery — you pay when the order arrives. No card is needed.", ar: "الدفع عند الاستلام — تدفع عند وصول الطلب، ولا تحتاج إلى بطاقة." },
      },
      {
        q: { en: "Can I order large quantities for a project?", ar: "هل يمكنني طلب كميات كبيرة لمشروع؟" },
        a: {
          en: "Yes. For project quantities, contact the showroom or send a project enquiry on WhatsApp with the products or areas involved, the quantities and the delivery location, and you will receive a quotation.",
          ar: "نعم. لكميات المشروعات تواصل مع المعرض أو أرسل استفسار مشروع على واتساب بالمنتجات أو المساحات والكميات ومكان التسليم، وسيصلك عرض سعر.",
        },
        link: { href: "/services#projects", label: { en: "Supply for projects", ar: "التوريد للمشروعات" } },
      },
    ],
  },
  {
    id: "after",
    title: { en: "Returns, warranty and support", ar: "الاسترجاع والضمان والدعم" },
    items: [
      {
        q: { en: "What are the return and warranty terms?", ar: "ما شروط الاسترجاع والضمان؟" },
        a: {
          en: "You can return or exchange a product within 14 days of delivery; a defective or incorrect product is replaced or refunded at our cost. Products carry their manufacturer's warranty against manufacturing defects, with the period written on your invoice.",
          ar: "يمكنك استرجاع المنتج أو استبداله خلال ١٤ يومًا من الاستلام، ويُستبدل المنتج المعيب أو غير المطابق أو يُرد ثمنه على نفقتنا. والمنتجات مشمولة بضمان الشركة المصنعة ضد عيوب التصنيع، وتُكتب مدته على الفاتورة.",
        },
        link: { href: "/returns", label: { en: "Returns and exchanges", ar: "الاسترجاع والاستبدال" } },
      },
      {
        q: { en: "Where can I find technical information about a product?", ar: "أين أجد المعلومات الفنية عن المنتج؟" },
        a: {
          en: "Each product page lists its technical specifications — wattage, luminous flux, colour temperature, beam angle, CRI and IP rating where recorded. The company profile, with approvals and quality certificates, can be downloaded from the about page.",
          ar: "صفحة كل منتج تعرض مواصفاته الفنية — القدرة وشدة الإضاءة ودرجة اللون وزاوية الإضاءة ومؤشر CRI ودرجة الحماية حيثما كانت مسجّلة. ويمكن تحميل ملف الشركة بالاعتمادات وشهادات الجودة من صفحة عن الشركة.",
        },
        link: { href: "/about-us#documents-heading", label: { en: "Approvals and certificates", ar: "الاعتمادات والشهادات" } },
      },
      {
        q: { en: "How do I reach the showroom?", ar: "كيف أتواصل مع المعرض؟" },
        a: {
          en: "By phone or WhatsApp on +20 115 446 6259, Saturday to Thursday, 9:30am to 5:30pm, or at the showroom in Sheraton Al Matar, El Nozha, Cairo.",
          ar: "بالهاتف أو واتساب على ‎+20 115 446 6259‎، من السبت إلى الخميس من ٩:٣٠ صباحًا حتى ٥:٣٠ مساءً، أو في المعرض بشيراتون المطار، النزهة، القاهرة.",
        },
        link: { href: "/contact-us", label: { en: "Contact", ar: "تواصل معنا" } },
      },
    ],
  },
];
