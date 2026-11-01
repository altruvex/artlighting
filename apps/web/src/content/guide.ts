import type { L } from "./l10n";

/**
 * The lighting guide.
 *
 * Plain explanations of the figures on a lighting spec sheet — what each one
 * means and how to choose by it. General lighting practice, written so a
 * customer can read the product pages with confidence; nothing here is a
 * claim about a product or a service. Where a figure is a common rule of
 * thumb rather than a fixed value, the text says so.
 *
 * Each article is a list of blocks rather than a string of HTML, so the two
 * languages keep the same structure and the table of contents is built
 * from the headings.
 */
export type GuideBlock =
  | { kind: "p"; text: L }
  | { kind: "h2"; id: string; text: L }
  | { kind: "ul"; items: L[] }
  | { kind: "table"; head: L[]; rows: L[][] }
  | { kind: "callout"; text: L };

export type GuideArticle = {
  slug: string;
  minutes: number;
  /** Lighting types or application slugs this article helps choose. */
  related: { applications: string[] };
  title: L;
  summary: L;
  body: GuideBlock[];
};

const same = (text: string): L => ({ en: text, ar: text });

export const GUIDE: GuideArticle[] = [
  {
    slug: "color-temperature",
    minutes: 4,
    related: { applications: ["residential", "workplaces-and-education"] },
    title: { en: "Choosing a colour temperature", ar: "كيف تختار درجة لون الإضاءة" },
    summary: {
      en: "What 3000K, 4000K and 6500K mean, and which suits which room.",
      ar: "ماذا تعني ٣٠٠٠ و٤٠٠٠ و٦٥٠٠ كلفن، وأيها يناسب كل مكان.",
    },
    body: [
      {
        kind: "p",
        text: {
          en: "Colour temperature describes whether white light looks warm and yellowish or cool and bluish. It is measured in kelvin (K): the lower the number, the warmer the light. It says nothing about brightness — a 3000K and a 6500K fitting can give exactly the same amount of light.",
          ar: "درجة حرارة اللون تصف هل يبدو الضوء الأبيض دافئًا مائلًا للأصفر أم باردًا مائلًا للأزرق. تُقاس بالكلفن (K): كلما قل الرقم كان الضوء أدفأ. ولا علاقة لها بشدة الإضاءة — وحدة ٣٠٠٠ كلفن ووحدة ٦٥٠٠ كلفن قد تعطيان نفس كمية الضوء تمامًا.",
        },
      },
      { kind: "h2", id: "three", text: { en: "The three temperatures in our catalogue", ar: "الدرجات الثلاث في منتجاتنا" } },
      {
        kind: "table",
        head: [
          { en: "Temperature", ar: "الدرجة" },
          { en: "How it looks", ar: "كيف تبدو" },
          { en: "Usually chosen for", ar: "تُختار عادة لـ" },
        ],
        rows: [
          [
            { en: "3000K — warm", ar: "٣٠٠٠ كلفن — دافئ" },
            { en: "Soft, yellowish, close to a traditional lamp", ar: "ناعم مائل للأصفر، قريب من اللمبة التقليدية" },
            { en: "Living rooms, bedrooms, restaurants, hotel rooms", ar: "المعيشة والنوم والمطاعم وغرف الفنادق" },
          ],
          [
            { en: "4000K — neutral white", ar: "٤٠٠٠ كلفن — أبيض محايد" },
            { en: "Clear and natural, neither yellow nor blue", ar: "واضح وطبيعي، لا أصفر ولا أزرق" },
            { en: "Offices, classrooms, kitchens, shops, clinics", ar: "المكاتب والفصول والمطابخ والمحلات والعيادات" },
          ],
          [
            { en: "6500K — cool", ar: "٦٥٠٠ كلفن — بارد" },
            { en: "Bright bluish white, like an overcast sky", ar: "أبيض مائل للأزرق، كسماء ملبّدة" },
            { en: "Workshops, warehouses, car parks, security lighting", ar: "الورش والمخازن والجراجات وإضاءة التأمين" },
          ],
        ],
      },
      { kind: "h2", id: "choosing", text: { en: "How to choose", ar: "كيف تختار" } },
      {
        kind: "ul",
        items: [
          {
            en: "Choose by what happens in the room. Rest and conversation suit warm light; reading, work and detailed tasks suit neutral white.",
            ar: "اختر بحسب ما يحدث في المكان: الراحة والجلوس تناسبهما الإضاءة الدافئة، والقراءة والعمل والمهام الدقيقة يناسبها الأبيض المحايد.",
          },
          {
            en: "Keep one temperature within one space. A warm chandelier beside cool spotlights makes both look wrong.",
            ar: "حافظ على درجة واحدة في المساحة الواحدة. نجفة دافئة بجوار كشافات باردة تجعل الاثنين يبدوان غير مناسبين.",
          },
          {
            en: "Consider the finishes. Warm wood, brass and beige look richer under 3000K; white marble and grey concrete look crisper under 4000K.",
            ar: "راعِ التشطيبات: الخشب والنحاس والبيج تبدو أغنى تحت ٣٠٠٠ كلفن، والرخام الأبيض والخرسانة الرمادية تبدو أوضح تحت ٤٠٠٠ كلفن.",
          },
          {
            en: "Outdoors, warm light suits homes and hospitality; cool light suits security and open industrial areas.",
            ar: "في الخارج، الإضاءة الدافئة تناسب البيوت والفنادق، والباردة تناسب التأمين والمساحات الصناعية المفتوحة.",
          },
        ],
      },
      {
        kind: "callout",
        text: {
          en: "Many of our spotlights are offered in more than one temperature — the product page shows which, and lets you choose before adding to the cart.",
          ar: "كثير من كشافاتنا متوفر بأكثر من درجة لون — صفحة المنتج توضح المتاح وتتيح لك الاختيار قبل الإضافة للسلة.",
        },
      },
    ],
  },
  {
    slug: "cri",
    minutes: 3,
    related: { applications: ["retail-and-showrooms", "hospitality"] },
    title: { en: "What CRI means, and when it matters", ar: "ما هو مؤشر CRI ومتى يهم" },
    summary: {
      en: "Colour rendering, explained — and why a shop or a hotel should check it first.",
      ar: "شرح تجسيد الألوان — ولماذا يجب أن يراجعه المحل أو الفندق أولًا.",
    },
    body: [
      {
        kind: "p",
        text: {
          en: "The colour rendering index (CRI, or Ra) measures how faithfully a light source shows the colours of the things it lights, compared with a reference light. It is a score out of 100. Two fittings can have the same brightness and the same colour temperature and still make a red fabric, a wooden floor or a face look quite different.",
          ar: "مؤشر تجسيد الألوان (CRI أو Ra) يقيس مدى دقة مصدر الضوء في إظهار ألوان ما يضيئه مقارنةً بضوء مرجعي، وهو درجة من ١٠٠. قد تتساوى وحدتان في الشدة ودرجة اللون، ومع ذلك تُظهر كل منهما قماشًا أحمر أو أرضية خشب أو وجهًا بشكل مختلف تمامًا.",
        },
      },
      { kind: "h2", id: "levels", text: { en: "Reading the number", ar: "كيف تقرأ الرقم" } },
      {
        kind: "table",
        head: [
          { en: "CRI", ar: "المؤشر" },
          { en: "What to expect", ar: "ما الذي تتوقعه" },
          { en: "Suitable for", ar: "مناسب لـ" },
        ],
        rows: [
          [
            same("80+"),
            { en: "Good, everyday colour", ar: "ألوان جيدة للاستخدام اليومي" },
            { en: "Corridors, offices, general lighting", ar: "الممرات والمكاتب والإضاءة العامة" },
          ],
          [
            same("90+"),
            { en: "Rich, accurate colour; skin and food look natural", ar: "ألوان غنية ودقيقة؛ البشرة والطعام يبدوان طبيعيين" },
            { en: "Homes, retail, hospitality, galleries, clinics", ar: "المنازل والمحلات والفنادق والمعارض والعيادات" },
          ],
        ],
      },
      { kind: "h2", id: "where", text: { en: "Where it matters most", ar: "أين يهم أكثر" } },
      {
        kind: "ul",
        items: [
          { en: "Shops, where the customer judges the colour of what they buy.", ar: "المحلات، حيث يحكم العميل على لون ما يشتريه." },
          { en: "Restaurants and hotels, where food and people should look their best.", ar: "المطاعم والفنادق، حيث يجب أن يبدو الطعام والناس في أفضل صورة." },
          { en: "Kitchens and dressing areas at home.", ar: "المطابخ وأماكن تبديل الملابس في البيت." },
          { en: "Examination rooms, where colour helps judge skin and tissue.", ar: "غرف الكشف، حيث يساعد اللون على الحكم على الجلد." },
        ],
      },
      {
        kind: "callout",
        text: {
          en: "Where a product's CRI is recorded, it appears in the product's technical specifications.",
          ar: "إذا كان مؤشر CRI مسجلًا للمنتج، فهو يظهر في المواصفات الفنية في صفحته.",
        },
      },
    ],
  },
  {
    slug: "lumens-and-watts",
    minutes: 3,
    related: { applications: ["workplaces-and-education"] },
    title: { en: "Lumens, watts and efficiency", ar: "اللومن والوات والكفاءة" },
    summary: {
      en: "Why watts no longer tell you how bright a light is — and what to read instead.",
      ar: "لماذا لم يعد الوات يخبرك بشدة الإضاءة — وما الذي تقرأه بدلًا منه.",
    },
    body: [
      {
        kind: "p",
        text: {
          en: "With old incandescent lamps, watts were a fair guide to brightness. With LED they are not: watts tell you how much electricity a fitting uses, and lumens (lm) tell you how much light it gives out. Two 12W fittings can differ by hundreds of lumens.",
          ar: "مع اللمبات التقليدية القديمة كان الوات دليلًا معقولًا على شدة الإضاءة، أما مع الليد فلا: الوات يخبرك بكمية الكهرباء التي تستهلكها الوحدة، واللومن (lm) يخبرك بكمية الضوء الذي تعطيه. وحدتان بقدرة ١٢ وات قد تختلفان بمئات اللومنات.",
        },
      },
      { kind: "h2", id: "efficacy", text: { en: "Efficacy: light per watt", ar: "الكفاءة: الضوء لكل وات" } },
      {
        kind: "p",
        text: {
          en: "Divide lumens by watts and you get efficacy in lumens per watt (lm/W) — how efficiently a fitting turns electricity into light. For a building with hundreds of fittings running long hours, this figure has more effect on the electricity bill than the purchase price.",
          ar: "اقسم اللومن على الوات تحصل على الكفاءة باللومن لكل وات (lm/W) — أي مدى كفاءة الوحدة في تحويل الكهرباء إلى ضوء. في مبنى به مئات الوحدات تعمل لساعات طويلة، يؤثر هذا الرقم في فاتورة الكهرباء أكثر من سعر الشراء.",
        },
      },
      {
        kind: "table",
        head: [
          { en: "On the spec sheet", ar: "في المواصفات" },
          { en: "What it tells you", ar: "ما الذي يخبرك به" },
        ],
        rows: [
          [{ en: "Maximum wattage (W)", ar: "أقصى قدرة (وات)" }, { en: "Power drawn — what you pay for", ar: "الطاقة المستهلكة — ما تدفع ثمنه" }],
          [{ en: "Luminous flux (lm)", ar: "شدة الإضاءة (لومن)" }, { en: "Light given out — what you see", ar: "الضوء الخارج — ما تراه" }],
          [{ en: "Lifetime (hours)", ar: "العمر الافتراضي (ساعة)" }, { en: "How long before output drops noticeably", ar: "المدة قبل أن ينخفض الضوء بشكل ملحوظ" }],
        ],
      },
      { kind: "h2", id: "compare", text: { en: "Comparing two fittings", ar: "المقارنة بين وحدتين" } },
      {
        kind: "ul",
        items: [
          { en: "Compare lumens first to know which gives more light.", ar: "قارن اللومن أولًا لتعرف أيهما يعطي ضوءًا أكثر." },
          { en: "Then compare lm/W to know which costs less to run.", ar: "ثم قارن اللومن لكل وات لتعرف أيهما أقل في تكلفة التشغيل." },
          { en: "Then check the beam angle: the same lumens in a narrow beam look far brighter on the spot it hits.", ar: "ثم راجع زاوية الإضاءة: نفس اللومن في زاوية ضيقة يبدو أقوى بكثير على البقعة التي يسقط عليها." },
        ],
      },
    ],
  },
  {
    slug: "beam-angle",
    minutes: 3,
    related: { applications: ["retail-and-showrooms", "residential", "facades-and-architecture"] },
    title: { en: "Beam angles explained", ar: "شرح زاوية الإضاءة" },
    summary: {
      en: "Narrow, medium or wide — how the spread of a spotlight changes a room.",
      ar: "ضيقة أم متوسطة أم واسعة — كيف يغيّر انتشار الكشاف شكل المكان.",
    },
    body: [
      {
        kind: "p",
        text: {
          en: "The beam angle is how widely a fitting spreads its light, measured in degrees. The same spotlight with a 24° beam and a 60° beam gives the same total light — but one makes a bright, defined pool and the other a soft, wide wash.",
          ar: "زاوية الإضاءة هي مدى انتشار الضوء من الوحدة، وتُقاس بالدرجات. نفس الكشاف بزاوية ٢٤ درجة وبزاوية ٦٠ درجة يعطي نفس كمية الضوء الكلية — لكن الأول يصنع بقعة ساطعة محددة والثاني إضاءة ناعمة واسعة.",
        },
      },
      { kind: "h2", id: "ranges", text: { en: "Three ranges", ar: "ثلاثة نطاقات" } },
      {
        kind: "table",
        head: [
          { en: "Beam", ar: "الزاوية" },
          { en: "Effect", ar: "التأثير" },
          { en: "Typical use", ar: "الاستخدام المعتاد" },
        ],
        rows: [
          [
            { en: "Narrow, under ~25°", ar: "ضيقة، أقل من ~٢٥°" },
            { en: "Defined pool, strong contrast", ar: "بقعة محددة وتباين قوي" },
            { en: "Artwork, products, columns, high ceilings", ar: "اللوحات والمنتجات والأعمدة والأسقف العالية" },
          ],
          [
            { en: "Medium, ~25–40°", ar: "متوسطة، ~٢٥–٤٠°" },
            { en: "Balanced accent and general light", ar: "توازن بين التركيز والإضاءة العامة" },
            { en: "Living rooms, lobbies, shop floors", ar: "المعيشة والاستقبالات وأرضيات المحلات" },
          ],
          [
            { en: "Wide, over ~40°", ar: "واسعة، أكثر من ~٤٠°" },
            { en: "Soft, even, few shadows", ar: "ناعمة ومتجانسة وظلال أقل" },
            { en: "General lighting, low ceilings, corridors", ar: "الإضاءة العامة والأسقف المنخفضة والممرات" },
          ],
        ],
      },
      { kind: "h2", id: "height", text: { en: "Beam and ceiling height", ar: "الزاوية وارتفاع السقف" } },
      {
        kind: "p",
        text: {
          en: "A beam widens as it travels. From a 2.8 m ceiling a medium beam lights a comfortable circle on the floor; from 6 m the same beam covers a much larger, dimmer area — which is why high lobbies and facades often use narrower beams to keep the light where it is meant to be.",
          ar: "تتسع الزاوية كلما ابتعد الضوء. من سقف بارتفاع ٢٫٨ متر تضيء الزاوية المتوسطة دائرة مريحة على الأرض، ومن ارتفاع ٦ أمتار تغطي نفس الزاوية مساحة أكبر بكثير وأخفت — ولهذا تستخدم الاستقبالات العالية والواجهات زوايا أضيق لتبقى الإضاءة حيث يجب.",
        },
      },
    ],
  },
  {
    slug: "ip-ratings",
    minutes: 3,
    related: { applications: ["landscape-and-outdoor", "facades-and-architecture"] },
    title: { en: "IP ratings: where a fitting can go", ar: "درجات الحماية IP: أين توضع الوحدة" },
    summary: {
      en: "The two digits that decide whether a light belongs in a bathroom, a garden or a fountain.",
      ar: "الرقمان اللذان يحددان هل تصلح الوحدة لحمام أم حديقة أم نافورة.",
    },
    body: [
      {
        kind: "p",
        text: {
          en: "An IP (ingress protection) rating is two digits. The first says how well the fitting keeps out solids, from fingers down to dust (0–6). The second says how well it keeps out water, from drips up to continuous immersion (0–8). The higher each digit, the more protected the fitting.",
          ar: "درجة الحماية IP تتكون من رقمين: الأول يوضح مدى حماية الوحدة من الأجسام الصلبة، من الأصابع حتى الغبار (٠–٦)، والثاني يوضح مدى حمايتها من الماء، من القطرات حتى الغمر المستمر (٠–٨). كلما ارتفع الرقم زادت الحماية.",
        },
      },
      { kind: "h2", id: "ratings", text: { en: "The ratings we offer", ar: "الدرجات المتاحة لدينا" } },
      {
        kind: "table",
        head: [
          { en: "Rating", ar: "الدرجة" },
          { en: "Protection", ar: "الحماية" },
          { en: "Where it goes", ar: "مكان الاستخدام" },
        ],
        rows: [
          [same("IP20"), { en: "Objects over 12 mm; no water protection", ar: "الأجسام أكبر من ١٢ مم؛ بدون حماية من الماء" }, { en: "Dry indoor rooms", ar: "الغرف الداخلية الجافة" }],
          [same("IP44"), { en: "Splashing water from any direction", ar: "رذاذ الماء من أي اتجاه" }, { en: "Bathrooms away from the shower, covered porches", ar: "الحمامات بعيدًا عن الدش، والتراسات المغطاة" }],
          [same("IP54"), { en: "Dust-protected and splash-proof", ar: "محمية من الغبار والرذاذ" }, { en: "Kitchens, covered outdoor areas", ar: "المطابخ والمساحات الخارجية المغطاة" }],
          [same("IP65"), { en: "Dust-tight; water jets", ar: "مانعة للغبار؛ نفثات الماء" }, { en: "Facades, gardens, exposed outdoor", ar: "الواجهات والحدائق والأماكن المكشوفة" }],
          [same("IP68"), { en: "Dust-tight; long immersion", ar: "مانعة للغبار؛ الغمر لفترات طويلة" }, { en: "Pools, fountains, in-ground where water collects", ar: "حمامات السباحة والنوافير والأرضيات التي يتجمع فيها الماء" }],
        ],
      },
      {
        kind: "callout",
        text: {
          en: "Many Balcom spotlights can be ordered at a higher IP rating than their standard one; the product page shows the ratings available for each fitting and any price difference.",
          ar: "كثير من كشافات بالكوم يمكن طلبها بدرجة حماية أعلى من الدرجة القياسية؛ وصفحة المنتج توضح الدرجات المتاحة لكل وحدة وأي فرق في السعر.",
        },
      },
    ],
  },
  {
    slug: "how-much-light",
    minutes: 5,
    related: { applications: ["workplaces-and-education", "healthcare"] },
    title: { en: "How much light does a room need?", ar: "كم تحتاج الغرفة من الإضاءة؟" },
    summary: {
      en: "Lux, typical levels, and a first estimate of how many fittings a space takes.",
      ar: "اللوكس، والمستويات المعتادة، وتقدير أولي لعدد الوحدات التي تحتاجها المساحة.",
    },
    body: [
      {
        kind: "p",
        text: {
          en: "Lumens measure the light a fitting gives out. Lux measures the light that arrives on a surface: one lux is one lumen spread over one square metre. Recommendations for a space are given in lux, usually at the height where the work happens — a desk, a worktop, the floor of a corridor.",
          ar: "اللومن يقيس الضوء الذي تعطيه الوحدة، أما اللوكس فيقيس الضوء الذي يصل إلى السطح: اللوكس الواحد هو لومن واحد موزع على متر مربع. توصيات الإضاءة تُعطى باللوكس، وعادة على الارتفاع الذي يحدث فيه العمل — المكتب أو سطح المطبخ أو أرضية الممر.",
        },
      },
      { kind: "h2", id: "levels", text: { en: "Typical levels", ar: "مستويات معتادة" } },
      {
        kind: "p",
        text: {
          en: "These are common guide values used in lighting practice, not fixed rules; a specific project follows the standards and brief that apply to it.",
          ar: "هذه قيم استرشادية شائعة في ممارسة الإضاءة وليست قواعد ثابتة؛ والمشروع المحدد يتبع المعايير والمتطلبات الخاصة به.",
        },
      },
      {
        kind: "table",
        head: [
          { en: "Space", ar: "المساحة" },
          { en: "Typical level", ar: "المستوى المعتاد" },
        ],
        rows: [
          [{ en: "Corridors and circulation", ar: "الممرات ومناطق الحركة" }, { en: "100–150 lux", ar: "١٠٠–١٥٠ لوكس" }],
          [{ en: "Living rooms and bedrooms (general)", ar: "المعيشة والنوم (إضاءة عامة)" }, { en: "100–300 lux", ar: "١٠٠–٣٠٠ لوكس" }],
          [{ en: "Kitchen worktops", ar: "أسطح المطبخ" }, { en: "300–500 lux", ar: "٣٠٠–٥٠٠ لوكس" }],
          [{ en: "Offices and classrooms", ar: "المكاتب والفصول" }, { en: "300–500 lux", ar: "٣٠٠–٥٠٠ لوكس" }],
          [{ en: "Shop floors", ar: "أرضيات المحلات" }, { en: "300–750 lux", ar: "٣٠٠–٧٥٠ لوكس" }],
          [{ en: "Examination and treatment rooms", ar: "غرف الكشف والعلاج" }, { en: "500–1000 lux", ar: "٥٠٠–١٠٠٠ لوكس" }],
        ],
      },
      { kind: "h2", id: "estimate", text: { en: "A first estimate", ar: "تقدير أولي" } },
      {
        kind: "p",
        text: {
          en: "For a quick estimate of how many fittings a room needs: multiply the target lux by the floor area to get the lumens that must reach the floor, then divide by the lumens of one fitting — allowing for the light lost to walls, ceiling and ageing, which in an ordinary room is roughly half.",
          ar: "لتقدير سريع لعدد الوحدات: اضرب مستوى اللوكس المطلوب في مساحة الأرضية لتعرف اللومنات التي يجب أن تصل للأرض، ثم اقسم على لومنات الوحدة الواحدة — مع حساب الضوء الذي يُفقد على الحوائط والسقف ومع تقادم الوحدات، وهو في الغرفة العادية حوالي النصف.",
        },
      },
      {
        kind: "callout",
        text: {
          en: "Example: an office of 5 × 6 m (30 m²) lit to 400 lux needs 400 × 30 = 12,000 lm on the desks. Allowing for losses (÷ 0.5) that is about 24,000 lm from the fittings — six panels of around 4,000 lm each.",
          ar: "مثال: مكتب مساحته ٥ × ٦ أمتار (٣٠ م²) بمستوى ٤٠٠ لوكس يحتاج ٤٠٠ × ٣٠ = ١٢٬٠٠٠ لومن على المكاتب. مع حساب الفاقد (÷ ٠٫٥) يصبح المطلوب من الوحدات حوالي ٢٤٬٠٠٠ لومن — أي ست وحدات بانل بحوالي ٤٬٠٠٠ لومن لكل منها.",
        },
      },
      {
        kind: "p",
        text: {
          en: "This is a starting point, not a design. Room shape, surface colours, ceiling height and each fitting's light distribution all change the result; for a project, a calculation from the fittings' photometric data is the reliable way to confirm it.",
          ar: "هذه نقطة بداية وليست تصميمًا. شكل الغرفة وألوان الأسطح وارتفاع السقف وطريقة توزيع كل وحدة للضوء تغيّر النتيجة؛ وفي المشروعات، الحساب من البيانات الضوئية للوحدات هو الطريقة الموثوقة للتأكد.",
        },
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDE.find((article) => article.slug === slug);
export const guidesFor = (slugs: string[]) => slugs.flatMap((slug) => guideBySlug(slug) ?? []);
