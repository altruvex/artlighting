import { SupportedLanguage } from "@/types/products";
import { Metadata } from "next";

export function constructMetadata({
    title,
    description,
    locale = "en",
    image = locale === "ar" ? "/Logo-ar.png" : "/Logo-en.png",
    icons = "/favicon.ico",
    openGraph,
    twitter,
}: {
    title?: string;
    description?: string;
    image?: string;
    icons?: string;
    openGraph?: Metadata["openGraph"];
    twitter?: Metadata["twitter"];
    locale?: SupportedLanguage;
} = {}): Metadata {
    const defaultTitles: Record<SupportedLanguage, string> = {
        en: "Linktich Company - Professional lighting: Shop Spotlights, Light Poles, and LED Lights",
        ar: "شركة Linktich - حلول إضاءة احترافية: كشافات، أعمدة إنارة، ولمبات ليد",
    };

    const defaultDescriptions: Record<SupportedLanguage, string> = {
        en:
            "Linktich Company: Elevate your spaces with exquisite Indoor and outdoor lighting solutions. Explore our curated selection of spotlights, light poles, LED fixtures, chandeliers, linear lighting, and bollards, meticulously crafted for enduring brilliance and energy efficiency. Experience the Linktich difference – exceptional illumination at exceptional value.",
        ar:
            "شركة Linktich: ارتقِ بمساحاتك مع حلول الإضاءة الداخلية والخارجية الراقية. استكشف تشكيلتنا المختارة من الكشافات، أعمدة الإنارة، تجهيزات ليد، الثريات، الإضاءات الخطية، والبولارد — مصممة بعناية للحصول على سطوع دائم وكفاءة في استهلاك الطاقة. اكتشف فرق Linktich — إضاءة استثنائية بقيمة استثنائية.",
    };

    const ogLocale = locale === "ar" ? "ar_EG" : "en_US";
    const baseUrl = "https://eg-artlighting.vercel.app";
    const siteUrl = `${baseUrl}/${locale}/`;
    const siteName = "Linktich Company";

    const resolvedTitle = title ?? defaultTitles[locale];
    const resolvedDescription = description ?? defaultDescriptions[locale];

    const resolvedImage = image.startsWith("http") ? image : `${baseUrl}${image}`;

    const imageAlt = locale === "ar" ? "شعار شركة Linktich" : "Linktich Company Logo";

    return {
        title: resolvedTitle,
        description: resolvedDescription,
        openGraph: openGraph ?? {
            type: "website",
            locale: ogLocale,
            url: siteUrl,
            siteName,
            title: resolvedTitle,
            description: resolvedDescription,
            images: [
                {
                    url: resolvedImage,
                    width: 1200,
                    height: 630,
                    alt: imageAlt,
                    type: "image/png"
                },
            ],
        },
        twitter: twitter ?? {
            card: "summary_large_image",
            site: "@ArtLightingEG",
            creator: "@ArtLightingEG",
            title: resolvedTitle,
            description: resolvedDescription,
            images: {
                url: resolvedImage,
                alt: imageAlt,
            },
        },
        other: {
            "application-name": siteName,
            "og:image": resolvedImage,
            "og:image:width": "1200",
            "og:image:height": "630",
            "og:image:alt": imageAlt,
            "twitter:image": resolvedImage,
            "twitter:image:alt": imageAlt,
        },

        icons,
        keywords: [
            "Lighting",
            "LED",
            "Spotlight",
            "Flood Light",
            "Spikes",
            "Balcom",
            "Jetra",
            "mister-led",
            "Bollard",
            "Poles",
            "إضاءة عامة",
            "إضاءة وظيفية",
            "إضاءة زخرفية",
            "إضاءة طوارئ",
            "إضاءة غرفة نوم",
            "إضاءة معيشة",
            "إضاءة مطبخ",
            "إضاءة حمام",
            "إضاءة مدخل",
            "إضاءة متاجر",
            "إضاءة مكاتب",
            "إضاءة مطاعم",
            "إضاءة فنادق",
            "إضاءة مصانع",
            "إضاءة مخازن",
            "إضاءة ورش عمل",
            "إضاءة حدائق",
            "إضاءة واجهات",
            "إضاءة ملاعب",
            "إضاءة شوارع",
            "لمبات LED",
            "لمبات فلورسنت",
            "لمبات هالوجين",
            "لمبات زئبق",
            "لمبات صوديوم",
            "إضاءة مباشرة",
            "إضاءة غير مباشرة",
            "إضاءة موجهة",
            "ثريات حديد",
            "ثريات نحاس",
            "ديمر",
            "فلتر",
            "رفلكتور",
            "تصميم الإضاءة",
            "تركيب الإضاءة",
        ],
        metadataBase: new URL(baseUrl),
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        alternates: {
            canonical: siteUrl,
            languages: {
                en: `${baseUrl}/en/`,
                ar: `${baseUrl}/ar/`,
            },
        },
    };
}
