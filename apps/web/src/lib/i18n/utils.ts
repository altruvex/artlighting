import { SupportedLanguage } from "@/types/products";

export function getLocaleFromParams(params: { locale?: string }): SupportedLanguage {
    const locale = params.locale?.toLowerCase();

    if (locale === "ar" || locale === "arabic") return "ar";
    if (locale === "en" || locale === "english") return "en";

    return "ar";
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
