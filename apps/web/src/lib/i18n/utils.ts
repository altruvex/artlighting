import { headers } from "next/headers";
import { SupportedLanguage } from "@/types/products";
import { I18nService } from "./services";

export async function getLocaleFromHeaders(): Promise<SupportedLanguage> {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";

    // Check pathname for language prefix
    if (pathname.startsWith("/ar/") || pathname.includes("/ar/")) return "ar";
    if (pathname.startsWith("/en/") || pathname.includes("/en/")) return "en";

    // Check Accept-Language header
    const acceptLanguage = headersList.get("accept-language") || "";
    if (acceptLanguage.includes("ar")) return "ar";
    if (acceptLanguage.includes("en")) return "en";

    // Default to Arabic for Middle East region
    return "ar";
}

export function getLocaleFromParams(params: { locale?: string }): SupportedLanguage {
    const locale = params.locale?.toLowerCase();

    if (locale === "ar" || locale === "arabic") return "ar";
    if (locale === "en" || locale === "english") return "en";

    return "ar";
}

export async function getServerI18n(locale?: SupportedLanguage) {
    const currentLocale = locale || await getLocaleFromHeaders();

    return {
        locale: currentLocale,
        isRTL: currentLocale === "ar",
        isArabic: currentLocale === "ar",
        isEnglish: currentLocale === "en",
        service: I18nService.getInstance(),
    };
}


/**
 * Helper to determine best display language for product info
 */
export function getBestDisplayLanguage(
    requestedLanguage: SupportedLanguage,
    availableLanguages: SupportedLanguage[]
): SupportedLanguage {
    // Return requested if available
    if (availableLanguages.includes(requestedLanguage)) {
        return requestedLanguage;
    }

    // Fallback logic
    if (requestedLanguage === "ar" && availableLanguages.includes("en")) {
        return "en";
    }

    if (requestedLanguage === "en" && availableLanguages.includes("ar")) {
        return "ar";
    }

    // Return first available or requested as last resort
    return availableLanguages[0] || requestedLanguage;
}
