import type { L } from "./l10n";

/**
 * Returns, warranty and terms of sale.
 *
 * DRAFT FOR THE COMPANY'S REVIEW. These pages did not exist and no written
 * terms were on record, so the text follows three things: what the shop
 * already does (cash on delivery, a flat delivery charge, four working
 * days, products "made or bought in to order" per Product.trackInventory),
 * the Egyptian Consumer Protection Law No. 181 of 2018 (a consumer's right
 * to replace or return a defective or non-conforming product within
 * fourteen days of receiving it), and the manufacturer's warranty the
 * brands provide. No warranty length is stated because none is on record:
 * the page says the period is the manufacturer's and is written on the
 * invoice. The numbers a manager should confirm live in STORE_TERMS.
 */
export const STORE_TERMS = {
  /** Days from delivery to ask for a return or exchange. */
  returnDays: 14,
  /** Working days from order to delivery, as the checkout and emails promise. */
  deliveryWorkingDays: 4,
} as const;

export type PolicyBlock = { kind: "p"; text: L } | { kind: "ul"; items: L[] } | { kind: "callout"; text: L };
export type PolicySectionContent = { id: string; title: L; blocks: PolicyBlock[] };
export type PolicyContent = { title: L; lede: L; metaDescription: L; sections: PolicySectionContent[] };

const d = STORE_TERMS.returnDays;
const dAr = d.toLocaleString("ar-EG");

export const RETURNS: PolicyContent = {
  title: { en: "Returns and exchanges", ar: "الاسترجاع والاستبدال" },
  lede: {
    en: `How to return or exchange a product bought on this site, within ${d} days of delivery.`,
    ar: `كيفية استرجاع أو استبدال منتج اشتريته من هذا الموقع خلال ${dAr} يومًا من الاستلام.`,
  },
  metaDescription: {
    en: `Return or exchange a product within ${d} days of delivery. Defective or incorrect items are replaced or refunded at our cost.`,
    ar: `استرجاع أو استبدال المنتج خلال ${dAr} يومًا من الاستلام. المنتجات المعيبة أو غير المطابقة تُستبدل أو يُرد ثمنها على نفقتنا.`,
  },
  sections: [
    {
      id: "defective",
      title: { en: "Defective or incorrect products", ar: "المنتجات المعيبة أو غير المطابقة" },
      blocks: [
        {
          kind: "p",
          text: {
            en: `If a product arrives damaged, does not work, or is not what you ordered, tell us within ${d} days of delivery. We will replace it, or refund it if a replacement is not available, and we cover the cost of collecting it.`,
            ar: `إذا وصل المنتج تالفًا أو لا يعمل أو مختلفًا عما طلبته، أبلغنا خلال ${dAr} يومًا من الاستلام. سنستبدله، أو نرد ثمنه إذا لم يتوفر بديل، ونتحمل تكلفة استلامه منك.`,
          },
        },
        {
          kind: "p",
          text: {
            en: "Please check the order when it is delivered and tell the courier or the showroom straight away about any visible damage to the packaging.",
            ar: "يُرجى فحص الطلب عند استلامه وإبلاغ مندوب التوصيل أو المعرض فورًا بأي تلف ظاهر في التغليف.",
          },
        },
      ],
    },
    {
      id: "change-of-mind",
      title: { en: "Changing your mind", ar: "إذا غيّرت رأيك" },
      blocks: [
        {
          kind: "p",
          text: {
            en: `You can return or exchange a product you no longer want within ${d} days of delivery, provided that:`,
            ar: `يمكنك استرجاع أو استبدال منتج لم تعد تريده خلال ${dAr} يومًا من الاستلام، بشرط:`,
          },
        },
        {
          kind: "ul",
          items: [
            { en: "it has not been installed or used;", ar: "ألا يكون قد رُكّب أو استُخدم؛" },
            { en: "it is in its original packaging, with all its parts and accessories;", ar: "أن يكون في تغليفه الأصلي بكل أجزائه وملحقاته؛" },
            { en: "you have the order number or invoice.", ar: "أن يكون معك رقم الطلب أو الفاتورة." },
          ],
        },
        {
          kind: "p",
          text: {
            en: "For a change of mind, the cost of returning the product is yours; the showroom will tell you the amount before it is collected.",
            ar: "في حالة تغيير الرأي، تكون تكلفة إعادة المنتج على العميل، وسيوضح لك المعرض قيمتها قبل استلامه.",
          },
        },
      ],
    },
    {
      id: "exclusions",
      title: { en: "What cannot be returned", ar: "ما لا يمكن استرجاعه" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Unless it is defective or not what you ordered, the following cannot be returned for a change of mind:",
            ar: "ما لم يكن معيبًا أو مختلفًا عما طلبته، لا يمكن استرجاع ما يلي بسبب تغيير الرأي:",
          },
        },
        {
          kind: "ul",
          items: [
            { en: "LED strip and other products cut to a length you specified;", ar: "شريط الليد والمنتجات الأخرى المقطوعة بطول حددته؛" },
            { en: "products ordered in specially for you or for a project;", ar: "المنتجات المطلوبة خصيصًا لك أو لمشروع؛" },
            { en: "products that have been installed, altered or damaged after delivery.", ar: "المنتجات التي رُكّبت أو عُدّلت أو تلفت بعد الاستلام." },
          ],
        },
      ],
    },
    {
      id: "how",
      title: { en: "How to return a product", ar: "كيفية الاسترجاع" },
      blocks: [
        {
          kind: "ul",
          items: [
            {
              en: "Call or message the showroom with your order number, the product and the reason.",
              ar: "اتصل بالمعرض أو راسله برقم الطلب والمنتج وسبب الاسترجاع.",
            },
            {
              en: "For a defect, send a photo or a short video — it usually lets us resolve it without a visit.",
              ar: "في حالة العيب، ابعث صورة أو فيديو قصيرًا — غالبًا ما يتيح لنا حل المشكلة دون زيارة.",
            },
            { en: "We arrange collection, or you can bring the product to the showroom.", ar: "نرتب استلام المنتج، أو يمكنك إحضاره إلى المعرض." },
          ],
        },
      ],
    },
    {
      id: "refunds",
      title: { en: "Refunds", ar: "رد المبلغ" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Once the product has been received and checked, the refund is paid in cash at the showroom or by bank transfer, as you prefer. Delivery charges are refunded when the product was defective or incorrect.",
            ar: "بعد استلام المنتج وفحصه، يُرد المبلغ نقدًا في المعرض أو بتحويل بنكي حسب رغبتك. وتُرد رسوم التوصيل إذا كان المنتج معيبًا أو غير مطابق.",
          },
        },
        {
          kind: "callout",
          text: {
            en: "Nothing on this page limits your rights under the Egyptian Consumer Protection Law No. 181 of 2018.",
            ar: "لا يحد أي شيء في هذه الصفحة من حقوقك وفقًا لقانون حماية المستهلك المصري رقم ١٨١ لسنة ٢٠١٨.",
          },
        },
      ],
    },
  ],
};

export const WARRANTY: PolicyContent = {
  title: { en: "Warranty", ar: "الضمان" },
  lede: {
    en: "The products we sell carry their manufacturer's warranty. This page explains what it covers and how to use it.",
    ar: "المنتجات التي نبيعها مشمولة بضمان الشركة المصنعة. توضح هذه الصفحة ما يغطيه وكيفية الاستفادة منه.",
  },
  metaDescription: {
    en: "Balcom and Mister LED products carry the manufacturer's warranty against manufacturing defects. What it covers, what it excludes and how to claim.",
    ar: "منتجات بالكوم ومستر ليد مشمولة بضمان الشركة المصنعة ضد عيوب التصنيع. ما يغطيه وما لا يغطيه وكيفية المطالبة.",
  },
  sections: [
    {
      id: "cover",
      title: { en: "What the warranty covers", ar: "ما يغطيه الضمان" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Every product carries its manufacturer's warranty against defects in materials and manufacture under normal use. As the authorised agent for Balcom and Mister LED, we handle warranty claims for their products directly.",
            ar: "كل منتج مشمول بضمان الشركة المصنعة ضد عيوب الخامات والتصنيع في ظروف الاستخدام العادية. وبصفتنا الوكيل المعتمد لبالكوم ومستر ليد، نتولى مطالبات الضمان لمنتجاتهما مباشرة.",
          },
        },
        {
          kind: "p",
          text: {
            en: "The warranty period depends on the product and is confirmed when you buy it and written on your invoice. If you need to know it before ordering, ask the showroom.",
            ar: "تختلف مدة الضمان بحسب المنتج، وتُؤكد عند الشراء وتُكتب على الفاتورة. وإذا أردت معرفتها قبل الطلب، اسأل المعرض.",
          },
        },
      ],
    },
    {
      id: "remedy",
      title: { en: "What we do", ar: "ما الذي نقوم به" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "If a product fails because of a manufacturing defect within its warranty period, we repair or replace it. If neither is possible, we refund it.",
            ar: "إذا تعطل المنتج بسبب عيب تصنيع خلال مدة الضمان، نصلحه أو نستبدله، وإذا تعذر ذلك نرد ثمنه.",
          },
        },
      ],
    },
    {
      id: "exclusions",
      title: { en: "What it does not cover", ar: "ما لا يغطيه الضمان" },
      blocks: [
        {
          kind: "ul",
          items: [
            {
              en: "installation that did not follow the product's specifications or was not done by a qualified electrician;",
              ar: "التركيب المخالف لمواصفات المنتج أو الذي لم يقم به كهربائي مؤهل؛",
            },
            {
              en: "damage from a supply voltage outside the product's rated input, or from power surges;",
              ar: "التلف الناتج عن جهد كهربائي خارج المدخل المحدد للمنتج أو عن ارتفاع مفاجئ في التيار؛",
            },
            {
              en: "use in a place its IP rating does not allow — for example an IP20 fitting outdoors;",
              ar: "الاستخدام في مكان لا تسمح به درجة الحماية — مثل وحدة IP20 في الخارج؛",
            },
            { en: "physical damage, alteration or repair by anyone other than us;", ar: "التلف المادي أو التعديل أو الإصلاح من غيرنا؛" },
            { en: "normal wear, and replaceable lamps.", ar: "الاستهلاك الطبيعي، واللمبات القابلة للاستبدال." },
          ],
        },
      ],
    },
    {
      id: "claim",
      title: { en: "How to make a claim", ar: "كيفية المطالبة بالضمان" },
      blocks: [
        {
          kind: "ul",
          items: [
            { en: "Contact the showroom with your order number or invoice.", ar: "تواصل مع المعرض برقم الطلب أو الفاتورة." },
            {
              en: "Describe the fault and send a photo or a short video where you can.",
              ar: "صِف العطل وابعث صورة أو فيديو قصيرًا إن أمكن.",
            },
            {
              en: "We tell you whether to bring the product in or arrange for it to be collected.",
              ar: "سنخبرك هل تحضر المنتج إلى المعرض أم نرتب استلامه.",
            },
          ],
        },
        {
          kind: "callout",
          text: {
            en: "Keep your invoice: it records the product and its warranty period.",
            ar: "احتفظ بالفاتورة: فهي تسجل المنتج ومدة ضمانه.",
          },
        },
      ],
    },
  ],
};

export const TERMS: PolicyContent = {
  title: { en: "Terms of sale", ar: "شروط البيع" },
  lede: {
    en: "The terms that apply when you order from Art Lighting through this site.",
    ar: "الشروط التي تنطبق عند الطلب من آرت لايتنج عبر هذا الموقع.",
  },
  metaDescription: {
    en: "Art Lighting's terms of sale: prices, orders, delivery, cash on delivery, returns, warranty and the law that applies.",
    ar: "شروط البيع لدى آرت لايتنج: الأسعار والطلبات والتوصيل والدفع عند الاستلام والاسترجاع والضمان والقانون المطبق.",
  },
  sections: [
    {
      id: "seller",
      title: { en: "Who you are buying from", ar: "من تشتري منه" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Products on this site are sold by Art Lighting for Electrical Supplies, 49 El Shaheed Sayed Zakaria St, Sheraton Al Matar, El Nozha, Cairo, Egypt.",
            ar: "تبيع المنتجات على هذا الموقع شركة آرت لايتنج للأدوات الكهربائية، ٤٩ شارع الشهيد سيد زكريا، شيراتون المطار، النزهة، القاهرة، مصر.",
          },
        },
      ],
    },
    {
      id: "prices",
      title: { en: "Prices", ar: "الأسعار" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Prices are in Egyptian pounds. The price you pay is the one shown in your cart when you confirm the order, including any discount applied to it; options such as a higher IP rating or a bulb are priced on the product page before you add them.",
            ar: "الأسعار بالجنيه المصري. السعر الذي تدفعه هو المعروض في السلة عند تأكيد الطلب، شاملًا أي خصم مطبّق، والإضافات مثل درجة حماية أعلى أو اللمبة يظهر سعرها في صفحة المنتج قبل إضافتها.",
          },
        },
        {
          kind: "p",
          text: {
            en: "If a price is shown in clear error, we will contact you before the order is sent, and you may cancel it at no cost.",
            ar: "إذا ظهر سعر خاطئ بشكل واضح، سنتواصل معك قبل إرسال الطلب، ويمكنك إلغاؤه دون أي تكلفة.",
          },
        },
      ],
    },
    {
      id: "orders",
      title: { en: "Orders", ar: "الطلبات" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Your order is placed when you confirm it at checkout; we then email you a confirmation. The showroom may call to confirm the order and the address. If a product becomes unavailable, we will tell you and you may change or cancel that part of the order.",
            ar: "يُعتبر طلبك مقدّمًا عند تأكيده في صفحة الدفع، ثم نرسل لك تأكيدًا بالبريد الإلكتروني. وقد يتصل بك المعرض لتأكيد الطلب والعنوان. وإذا أصبح منتج غير متاح، سنبلغك ويمكنك تغيير هذا الجزء من الطلب أو إلغاؤه.",
          },
        },
      ],
    },
    {
      id: "delivery",
      title: { en: "Delivery and payment", ar: "التوصيل والدفع" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Orders are delivered within four working days, for a flat delivery charge per order. For addresses outside Cairo we confirm the delivery cost with you before sending. Payment is in cash on delivery.",
            ar: "يتم توصيل الطلبات خلال أربعة أيام عمل برسوم توصيل ثابتة للطلب. وللعناوين خارج القاهرة نؤكد معك تكلفة التوصيل قبل الإرسال. والدفع نقدًا عند الاستلام.",
          },
        },
      ],
    },
    {
      id: "products",
      title: { en: "Product information", ar: "معلومات المنتجات" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "We describe each product as accurately as we can. Photographs are representative: finish and the colour of light can look different on screen. Technical figures are the manufacturer's.",
            ar: "نصف كل منتج بأكبر دقة ممكنة. الصور توضيحية، وقد يبدو التشطيب ولون الضوء مختلفًا على الشاشة. والأرقام الفنية هي أرقام الشركة المصنعة.",
          },
        },
        {
          kind: "p",
          text: {
            en: "Lighting must be installed by a qualified electrician, following the product's specifications and its IP rating.",
            ar: "يجب أن يركّب الإضاءة كهربائي مؤهل وفقًا لمواصفات المنتج ودرجة حمايته.",
          },
        },
      ],
    },
    {
      id: "returns",
      title: { en: "Returns and warranty", ar: "الاسترجاع والضمان" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "Returns and exchanges follow our returns policy, and products carry the manufacturer's warranty described on the warranty page.",
            ar: "يخضع الاسترجاع والاستبدال لسياسة الاسترجاع، والمنتجات مشمولة بضمان الشركة المصنعة الموضح في صفحة الضمان.",
          },
        },
      ],
    },
    {
      id: "law",
      title: { en: "Applicable law", ar: "القانون المطبق" },
      blocks: [
        {
          kind: "p",
          text: {
            en: "These terms are governed by the laws of the Arab Republic of Egypt, including the Consumer Protection Law No. 181 of 2018, and nothing in them limits your rights under it. We may update these terms; the version in force when you placed your order applies to it.",
            ar: "تخضع هذه الشروط لقوانين جمهورية مصر العربية، ومنها قانون حماية المستهلك رقم ١٨١ لسنة ٢٠١٨، ولا يحد أي شيء فيها من حقوقك وفقًا له. وقد نحدّث هذه الشروط، وتنطبق على طلبك النسخة السارية وقت تقديمه.",
          },
        },
      ],
    },
  ],
};
