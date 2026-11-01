import { absoluteUrl, assetUrl, SITE_URL } from "@/lib/site";
import { SupportedLanguage } from "@/types/products";
import { Metadata } from "next";

/**
 * Page metadata.
 *
 * `path` is the page's own path without the locale ("/about-us"). It gives
 * each page its own canonical and its language alternates — before, every
 * page declared the home page as its canonical, which told search engines
 * the whole site was one page.
 */
export function constructMetadata({
    title,
    description,
    locale = "en",
    path = "",
    image = locale === "ar" ? "/logo-ar.png" : "/logo-en.png",
    icons = "/favicon.ico",
    openGraph,
    twitter,
    noIndex = false,
}: {
    title?: string;
    description?: string;
    image?: string;
    icons?: string;
    path?: string;
    openGraph?: Metadata["openGraph"];
    twitter?: Metadata["twitter"];
    locale?: SupportedLanguage;
    noIndex?: boolean;
} = {}): Metadata {
    const defaultTitles: Record<SupportedLanguage, string> = {
        en: "Art Lighting | LED Spotlights, Chandeliers & Outdoor Lighting, Egypt",
        ar: "آرت لايتنج Art Lighting | كشافات ليد ونجف وإضاءة خارجية في مصر",
    };

    const defaultDescriptions: Record<SupportedLanguage, string> = {
        en: "Sole authorised Balcom agent in Egypt since 2010. LED spotlights, linear and panel lights, outdoor lighting and Mister LED chandeliers — Cairo showroom.",
        ar: "الوكيل الوحيد المعتمد لبالكوم في مصر منذ ٢٠١٠. كشافات ليد وسبوت لايت وإضاءة لينير وبانل وإضاءة خارجية ونجف مستر ليد — معرض في القاهرة.",
    };

    const ogLocale = locale === "ar" ? "ar_EG" : "en_US";
    const url = absoluteUrl(locale, path);
    const siteName = locale === "ar" ? "آرت لايتنج" : "Art Lighting";

    const resolvedTitle = title ?? defaultTitles[locale];
    const resolvedDescription = description ?? defaultDescriptions[locale];
    const resolvedImage = assetUrl(image);
    const imageAlt = locale === "ar" ? "آرت لايتنج" : "Art Lighting";

    return {
        title: resolvedTitle,
        description: resolvedDescription,
        openGraph: openGraph ?? {
            type: "website",
            locale: ogLocale,
            url,
            siteName,
            title: resolvedTitle,
            description: resolvedDescription,
            images: [{ url: resolvedImage, alt: imageAlt }],
        },
        twitter: twitter ?? {
            card: "summary_large_image",
            title: resolvedTitle,
            description: resolvedDescription,
            images: { url: resolvedImage, alt: imageAlt },
        },
        applicationName: siteName,
        icons,
        metadataBase: new URL(SITE_URL),
        robots: noIndex
            ? { index: false, follow: true }
            : {
                  index: true,
                  follow: true,
                  googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
              },
        alternates: {
            canonical: url,
            languages: {
                en: absoluteUrl("en", path),
                ar: absoluteUrl("ar", path),
                "x-default": absoluteUrl("en", path),
            },
        },
    };
}
