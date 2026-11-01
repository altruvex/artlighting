import type { SectorId } from "@/lib/company";
import type { ProductFamily } from "@repo/catalog/families";
import type { L } from "./l10n";

/**
 * Where the lighting goes.
 *
 * The shop answers "what product do you want?". These answer the question
 * a customer usually arrives with — "what am I trying to light?" — and end
 * in the same shop, filtered to the types that do the job.
 *
 * Every application is built only from what exists: `types` are lighting
 * types the catalogue stocks (see LIGHTING_TYPES), `families` are catalogue
 * families, and `sectors` are sectors Art Lighting has supplied projects in
 * (from the company profile). An application with nothing in the catalogue
 * behind it does not belong here.
 *
 * The considerations are general lighting practice — what the space needs —
 * not claims about a service; the guide articles they point to explain the
 * terms.
 */
export type Application = {
  slug: string;
  image: string;
  imagePosition?: string;
  families?: ProductFamily[];
  types: string[];
  sectors: SectorId[];
  guides: string[];
  name: L;
  summary: L;
  intro: L;
  needs: { title: L; body: L }[];
};

export const APPLICATIONS: Application[] = [
  {
    slug: "residential",
    image: "/main-landing/landing-1.png",
    imagePosition: "50% 60%",
    families: ["CHANDELIER"],
    types: ["cob", "strip", "linear", "track-light", "double-spotlight"],
    sectors: ["residential"],
    guides: ["color-temperature", "beam-angle"],
    name: { en: "Homes and residential interiors", ar: "المنازل والمساحات السكنية" },
    summary: {
      en: "Living rooms, bedrooms and kitchens — light in layers, warm where people rest.",
      ar: "غرف المعيشة والنوم والمطابخ — إضاءة على طبقات، ودافئة حيث يرتاح الناس.",
    },
    intro: {
      en: "A room at home is used for many things in one day, so it rarely works with one kind of light. The usual approach is three layers: general light to move around by, task light where people cook, read or work, and accent or decorative light that gives the room its character in the evening.",
      ar: "الغرفة في البيت تُستخدم لأشياء كثيرة في اليوم الواحد، لذلك نادرًا ما يكفيها نوع واحد من الإضاءة. الأسلوب المعتاد ثلاث طبقات: إضاءة عامة للحركة، وإضاءة مهام حيث يطبخ الناس أو يقرأون أو يعملون، وإضاءة تركيز أو ديكورية تمنح الغرفة طابعها في المساء.",
    },
    needs: [
      {
        title: { en: "Warm colour where people relax", ar: "لون دافئ حيث يرتاح الناس" },
        body: {
          en: "3000K suits living rooms and bedrooms. Kitchens and work corners often take 4000K on the worktop, with the rest of the room kept warm.",
          ar: "درجة ٣٠٠٠ كلفن تناسب المعيشة والنوم. المطابخ وأركان العمل غالبًا تأخذ ٤٠٠٠ كلفن على سطح العمل مع بقاء باقي الغرفة دافئًا.",
        },
      },
      {
        title: { en: "Glare kept out of sight lines", ar: "إبعاد الإبهار عن مجال الرؤية" },
        body: {
          en: "Recessed spotlights with a medium beam, set back from sofas and beds, light the room without shining into anyone's eyes.",
          ar: "الكشافات الغاطسة بزاوية متوسطة، بعيدًا عن الكنب والسرير، تضيء المكان دون أن تلمع في أعين الجالسين.",
        },
      },
      {
        title: { en: "One decorative piece, supported", ar: "قطعة ديكورية واحدة مدعومة" },
        body: {
          en: "A chandelier sets the character of a room. Concealed strip in a cove or joinery fills in around it, so the chandelier does not have to light everything alone.",
          ar: "النجفة تحدد طابع الغرفة، وشريط الليد المخفي في الكرانيش أو النجارة يكمّل حولها، فلا تُحمَّل النجفة مهمة إضاءة كل شيء وحدها.",
        },
      },
    ],
  },
  {
    slug: "hospitality",
    image: "/misterled-landing/landing-2.png",
    imagePosition: "50% 40%",
    families: ["CHANDELIER"],
    types: ["cob", "linear", "strip", "wall-washer", "uplight"],
    sectors: ["hospitality"],
    guides: ["cri", "color-temperature"],
    name: { en: "Hotels and hospitality", ar: "الفنادق والضيافة" },
    summary: {
      en: "Lobbies, restaurants and guest rooms — atmosphere first, and the same light in every room.",
      ar: "الاستقبالات والمطاعم وغرف النزلاء — الأجواء أولًا، ونفس الإضاءة في كل غرفة.",
    },
    intro: {
      en: "In a hotel, light is part of the experience being sold. Lobbies and restaurants are lit for mood, with contrast between lit and unlit surfaces; guest rooms need the same warm, comfortable light repeated across every room, which makes consistency between fittings as important as the fittings themselves.",
      ar: "في الفندق، الإضاءة جزء من التجربة التي يُدفع ثمنها. تُضاء الاستقبالات والمطاعم لخلق الأجواء، مع تباين بين الأسطح المضيئة وغير المضيئة، بينما تحتاج غرف النزلاء إلى نفس الإضاءة الدافئة المريحة مكررة في كل غرفة — لذلك يصبح التطابق بين الوحدات مهمًا بقدر الوحدات نفسها.",
    },
    needs: [
      {
        title: { en: "High colour rendering", ar: "تجسيد ألوان مرتفع" },
        body: {
          en: "Food, skin tones and materials look right under CRI 90 and above. It is one of the first figures to check on a hospitality specification.",
          ar: "الطعام ولون البشرة والخامات تبدو على طبيعتها تحت مؤشر CRI ‏٩٠ فأكثر، وهو من أول الأرقام التي تُراجع في مواصفات الفنادق.",
        },
      },
      {
        title: { en: "Consistency across rooms", ar: "التطابق بين الغرف" },
        body: {
          en: "The same colour temperature and fitting in every room, specified once and supplied in the full quantity, keeps a building from looking patched together.",
          ar: "نفس درجة اللون ونفس الوحدة في كل غرفة، تُحدَّد مرة واحدة وتُورَّد بالكمية كاملة، حتى لا يبدو المبنى مجمّعًا من قطع مختلفة.",
        },
      },
      {
        title: { en: "The building at night", ar: "المبنى في الليل" },
        body: {
          en: "Wall washers and uplights on the facade and entrance are what guests see first, before they step inside.",
          ar: "إضاءة الوول واشر والإضاءة العلوية على الواجهة والمدخل هي أول ما يراه النزيل قبل أن يدخل.",
        },
      },
    ],
  },
  {
    slug: "workplaces-and-education",
    image: "/main-landing/landing-2.png",
    imagePosition: "50% 50%",
    types: ["panel-light", "linear", "cob"],
    sectors: ["education", "civic"],
    guides: ["how-much-light", "color-temperature"],
    name: { en: "Offices, universities and schools", ar: "المكاتب والجامعات والمدارس" },
    summary: {
      en: "Workspaces and classrooms — enough light on the desk, and no glare on the screen.",
      ar: "مساحات العمل والفصول — إضاءة كافية على المكتب، وبلا انعكاس على الشاشة.",
    },
    intro: {
      en: "Where people read, write and look at screens for hours, the priorities change: a level of light that is sufficient and even across the whole working area, low glare from the fittings overhead, and a neutral colour that keeps people alert without feeling clinical.",
      ar: "حيث يقرأ الناس ويكتبون وينظرون إلى الشاشات لساعات، تتغير الأولويات: مستوى إضاءة كافٍ ومتجانس على مساحة العمل كلها، وإبهار منخفض من الوحدات فوق الرؤوس، ولون محايد يحافظ على التركيز دون إحساس بالبرودة.",
    },
    needs: [
      {
        title: { en: "An even level on the working plane", ar: "مستوى متجانس على سطح العمل" },
        body: {
          en: "Offices and classrooms are commonly lit to around 300–500 lux at desk height. Panel and linear lights spread it evenly with fewer dark patches.",
          ar: "تُضاء المكاتب والفصول عادة بحوالي ٣٠٠–٥٠٠ لوكس على ارتفاع المكتب، وإضاءة البانل والخطية توزعها بتجانس مع مناطق مظلمة أقل.",
        },
      },
      {
        title: { en: "Low glare overhead", ar: "إبهار منخفض من السقف" },
        body: {
          en: "Diffused panels and linear fittings keep bright points out of the eye and off the screen.",
          ar: "البانل والوحدات الخطية ذات الناشر تُبقي نقاط الضوء الساطعة بعيدًا عن العين وعن الشاشة.",
        },
      },
      {
        title: { en: "Neutral white", ar: "أبيض محايد" },
        body: {
          en: "4000K is the usual choice for work and study: clear and alert, without the blue cast of 6500K.",
          ar: "درجة ٤٠٠٠ كلفن هي الاختيار المعتاد للعمل والدراسة: واضحة ومنبّهة، بدون الزرقة التي في ٦٥٠٠ كلفن.",
        },
      },
    ],
  },
  {
    slug: "healthcare",
    image: "/balcom-landing/landing4.jpg",
    imagePosition: "50% 50%",
    types: ["panel-light", "linear"],
    sectors: ["healthcare"],
    guides: ["how-much-light", "cri"],
    name: { en: "Hospitals and healthcare", ar: "المستشفيات والمنشآت الطبية" },
    summary: {
      en: "Wards, clinics and corridors — clear, even light that is easy to keep clean and running.",
      ar: "العنابر والعيادات والممرات — إضاءة واضحة ومتجانسة سهلة التنظيف والصيانة.",
    },
    intro: {
      en: "Healthcare buildings run day and night and are lit for staff and patients at once. Corridors and wards need calm, even light; examination and treatment areas need more of it, with colour good enough to judge skin and tissue; and every fitting has to be simple to clean and to maintain across a large building.",
      ar: "المنشآت الطبية تعمل ليلًا ونهارًا، وتُضاء للطاقم والمرضى معًا. الممرات والعنابر تحتاج إلى إضاءة هادئة ومتجانسة، ومناطق الكشف والعلاج تحتاج إلى مستوى أعلى وتجسيد ألوان يكفي للحكم على لون الجلد، وكل وحدة يجب أن تكون سهلة التنظيف والصيانة في مبنى كبير.",
    },
    needs: [
      {
        title: { en: "Different levels for different rooms", ar: "مستويات مختلفة لغرف مختلفة" },
        body: {
          en: "Corridors are lit lower than examination rooms. Planning the level room by room avoids both dim treatment areas and over-lit corridors at night.",
          ar: "تُضاء الممرات بمستوى أقل من غرف الكشف. تحديد المستوى لكل غرفة يمنع ضعف الإضاءة في مناطق العلاج وزيادتها في الممرات ليلًا.",
        },
      },
      {
        title: { en: "Flat, closed fittings", ar: "وحدات مسطحة ومغلقة" },
        body: {
          en: "Panel lights with a flat diffuser have no open reflector to gather dust and are wiped down easily.",
          ar: "إضاءة البانل ذات الناشر المسطح لا تحتوي على عاكس مكشوف يجمع الغبار، ويسهل مسحها.",
        },
      },
      {
        title: { en: "Long life, fewer replacements", ar: "عمر طويل واستبدال أقل" },
        body: {
          en: "In a building that never switches off, a fitting's rated life and the ability to get the same model again later matter as much as its price.",
          ar: "في مبنى لا تُطفأ أنواره، يهم العمر الافتراضي للوحدة وإمكانية الحصول على نفس الموديل لاحقًا بقدر ما يهم سعرها.",
        },
      },
    ],
  },
  {
    slug: "retail-and-showrooms",
    image: "/balcom-landing/landing2.png",
    imagePosition: "50% 50%",
    types: ["track-light", "cob", "double-spotlight", "linear"],
    sectors: [],
    guides: ["beam-angle", "cri"],
    name: { en: "Shops and showrooms", ar: "المحلات والمعارض" },
    summary: {
      en: "Displays and shelves — light aimed at the merchandise, and moved when the display changes.",
      ar: "العروض والأرفف — إضاءة موجّهة على المعروضات، تتحرك عندما يتغير العرض.",
    },
    intro: {
      en: "In a shop, the product is the thing to light, not the room. Contrast draws the eye to what is on display, colour rendering makes it look as it will at home, and because displays change, the lighting needs to change with them without an electrician.",
      ar: "في المحل، المنتج هو ما يجب إضاءته وليس المكان. التباين يجذب العين إلى المعروض، وتجسيد الألوان يجعله يبدو كما سيبدو في البيت، ولأن العروض تتغير، تحتاج الإضاءة أن تتغير معها بدون كهربائي.",
    },
    needs: [
      {
        title: { en: "Adjustable accent light", ar: "إضاءة تركيز قابلة للتوجيه" },
        body: {
          en: "Track spotlights and double spotlights are re-aimed by hand when a display moves.",
          ar: "كشافات التراك والكشافات المزدوجة يُعاد توجيهها باليد عند تغيير مكان العرض.",
        },
      },
      {
        title: { en: "Narrow beams for contrast", ar: "زوايا ضيقة للتباين" },
        body: {
          en: "A narrower beam on the product and softer light around it makes the product the brightest thing in view.",
          ar: "زاوية ضيقة على المنتج وإضاءة أهدأ حوله تجعل المنتج أكثر شيء مضيء في مجال الرؤية.",
        },
      },
      {
        title: { en: "True colour", ar: "ألوان حقيقية" },
        body: {
          en: "CRI 90 and above for fashion, food and finishes, so the customer is not surprised by the colour at home.",
          ar: "مؤشر CRI ‏٩٠ فأكثر للملابس والطعام والتشطيبات، حتى لا يتفاجأ العميل باللون في البيت.",
        },
      },
    ],
  },
  {
    slug: "facades-and-architecture",
    image: "/projects/al-galala-resort/al-galala-resort-2.jpg",
    imagePosition: "50% 50%",
    types: ["wall-washer", "uplight", "flood-light"],
    sectors: [],
    guides: ["ip-ratings", "beam-angle"],
    name: { en: "Facades and architecture", ar: "الواجهات والمعمار" },
    summary: {
      en: "Buildings at night — walls washed, columns grazed, the form of the building drawn in light.",
      ar: "المباني في الليل — حوائط مغمورة بالضوء، وأعمدة مُبرزة، وشكل المبنى مرسوم بالإضاءة.",
    },
    intro: {
      en: "Facade lighting decides how a building is seen after dark. The architecture sets the approach: wash a flat wall evenly, graze a textured one from close to its base, pick out columns and edges — and leave some of the building dark, because contrast is what gives it shape.",
      ar: "إضاءة الواجهة تحدد كيف يُرى المبنى بعد الغروب. المعمار هو ما يحدد الأسلوب: غمر الحائط المسطح بإضاءة متساوية، أو إبراز الملمس من قاعدة الحائط، أو تحديد الأعمدة والحواف — مع ترك أجزاء من المبنى مظلمة، لأن التباين هو ما يعطيه شكله.",
    },
    needs: [
      {
        title: { en: "Protection from weather", ar: "الحماية من الطقس" },
        body: {
          en: "Anything on a facade is exposed to rain, dust and cleaning water. IP65 is the usual minimum outdoors.",
          ar: "كل ما على الواجهة معرّض للمطر والأتربة ومياه التنظيف، ودرجة IP65 هي الحد الأدنى المعتاد في الخارج.",
        },
      },
      {
        title: { en: "Wash or graze", ar: "غمر أم إبراز" },
        body: {
          en: "Wall washers set back from the wall give an even wash; uplights set close to the base graze the surface and bring out its texture.",
          ar: "الوول واشر البعيد عن الحائط يعطي إضاءة متساوية، والإضاءة العلوية القريبة من قاعدته تُبرز الملمس.",
        },
      },
      {
        title: { en: "Light where it is needed", ar: "الضوء حيث يلزم فقط" },
        body: {
          en: "Aimed fittings keep light on the building and out of windows and the sky.",
          ar: "الوحدات الموجّهة تُبقي الضوء على المبنى وبعيدًا عن النوافذ والسماء.",
        },
      },
    ],
  },
  {
    slug: "landscape-and-outdoor",
    image: "/main-landing/landing-4.png",
    imagePosition: "18% 50%",
    types: ["spikes", "bollard", "pole", "uplight", "flood-light"],
    sectors: ["landscape", "residential"],
    guides: ["ip-ratings", "how-much-light"],
    name: { en: "Gardens, paths and outdoor spaces", ar: "الحدائق والممرات والمساحات الخارجية" },
    summary: {
      en: "Landscape, walkways and open areas — safe to move through, pleasant to stay in.",
      ar: "اللاندسكيب والممرات والمساحات المفتوحة — آمنة للحركة، ومريحة للبقاء.",
    },
    intro: {
      en: "Outdoors, light has to do two things at once: show people where to walk and what is around them, and give the landscape a presence after dark. Low light at the level of the path, accents on trees and features, and fittings rated for soil, water and sun.",
      ar: "في الخارج، على الإضاءة أن تؤدي مهمتين معًا: أن تُري الناس أين يمشون وما حولهم، وأن تمنح اللاندسكيب حضورًا بعد الغروب. إضاءة منخفضة على مستوى الممر، وتركيز على الأشجار والعناصر، ووحدات مصنّفة لتحمّل التربة والماء والشمس.",
    },
    needs: [
      {
        title: { en: "Light at walking height", ar: "إضاءة على مستوى المشي" },
        body: {
          en: "Bollards light the ground and the edges of a path without glare in the eyes of people walking.",
          ar: "البولارد يضيء الأرض وحواف الممر دون إبهار في أعين المارّة.",
        },
      },
      {
        title: { en: "Accents that can move", ar: "تركيز قابل للتحريك" },
        body: {
          en: "Spike lights are staked in the soil and re-aimed as planting grows.",
          ar: "كشافات السبايك تُثبَّت في التربة ويُعاد توجيهها مع نمو الزرع.",
        },
      },
      {
        title: { en: "Rated for the ground", ar: "مصنّفة للأرض" },
        body: {
          en: "Fittings in soil or in areas that are irrigated need IP65 at least; anything that may sit in water needs IP67–68.",
          ar: "الوحدات في التربة أو في مناطق الري تحتاج IP65 على الأقل، وما قد يغمره الماء يحتاج IP67–68.",
        },
      },
    ],
  },
];

export const applicationBySlug = (slug: string) => APPLICATIONS.find((application) => application.slug === slug);

/** The applications a lighting type serves — for "where to use it" on the product page. */
export const applicationsForType = (typeId: string | null | undefined, family?: ProductFamily) =>
  APPLICATIONS.filter(
    (application) =>
      (typeId && application.types.includes(typeId.toLowerCase())) ||
      (family && application.families?.includes(family)),
  );
