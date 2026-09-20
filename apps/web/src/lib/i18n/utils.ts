import { headers } from "next/headers";
import type { ProductFamily } from "@repo/catalog/families";
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

/**
 * Format specifications based on language
 */
export function formatSpecsForLanguage(
    specs: Record<string, string> | undefined,
    language: SupportedLanguage
): Record<string, string> {
    if (!specs) return {};

    // You can add language-specific formatting here
    // For example, units conversion or text direction

    const formatted = { ...specs };

    if (language === "ar") {
        // Arabic-specific formatting
        // Add any Arabic-specific spec formatting here
    } else {
        // English-specific formatting
        // Add any English-specific spec formatting here
    }

    return formatted;
}

export function getLocalizedProductDescription(
    product: {
        productName: string;
        localizedName?: string;
        brand: string;
        specifications?: Record<string, string>;
        chandelierLightingType?: string;
        hNumber?: number;
        sectionType: ProductFamily;
        spotlightType: string;
    },
    language: SupportedLanguage
): string {
    const name = product.localizedName || product.productName;
    const specs = product.specifications || {};

    if (language === "ar") {
        if (product.brand === "mister-led" && product.chandelierLightingType === "lamp") {
            return `ثريا ${name} من ${specs.mainMaterial || 'مواد عالية الجودة'} مع قاعدة ${specs.lampBase || 'قياسية'} وقوة ${product.hNumber ? product.hNumber * 12 : specs.maximumWattage || 'غير محدد'}W`;
        }

        if (product.brand === "balcom" && product.sectionType === "INDOOR") {
            return `كشاف داخلي ${name} من ${specs.mainMaterial || 'مواد متينة'} بزاوية إضاءة ${specs.beamAngle || 'قياسية'}`;
        }

        if (product.brand === "balcom" && product.sectionType === "OUTDOOR") {
            return `كشاف خارجي ${name} من نوع ${product.spotlightType}`;
        }

        if (product.brand === "mister-led" && product.chandelierLightingType === "LED") {
            return `ثريا LED ${name} من ${specs.mainMaterial || 'مواد عالية الجودة'} بقوة ${specs.maximumWattage || 'غير محدد'}`;
        }

        return `${product.brand} - ${name}`;
    }

    else {
        if (product.brand === "mister-led" && product.chandelierLightingType === "lamp") {
            return `${name} chandelier made from ${specs.mainMaterial || 'high-quality materials'} with ${specs.lampBase || 'standard'} base and ${product.hNumber ? product.hNumber * 12 : specs.maximumWattage || 'unspecified'} watts power`;
        }

        if (product.brand === "balcom" && product.sectionType === "INDOOR") {
            return `${name} indoor spotlight made from ${specs.mainMaterial || 'durable materials'} with ${specs.beamAngle || 'standard'} beam angle`;
        }

        if (product.brand === "balcom" && product.sectionType === "OUTDOOR") {
            return `${name} outdoor spotlight of ${product.spotlightType} type`;
        }

        if (product.brand === "mister-led" && product.chandelierLightingType === "LED") {
            return `${name} LED chandelier made from ${specs.mainMaterial || 'high-quality materials'} with ${specs.maximumWattage || 'unspecified'} power`;
        }

        return `${product.brand} - ${name}`;
    }
}