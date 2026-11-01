import { serializeMoney, serializeRate, type MoneyInput } from "@repo/money";
import { Locale } from "next-intl";

export function convertArabicToEnglishNumbers(str: string): string {
    if (!str) return ""

    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    let result = str.toString()
    for (let i = 0; i < arabicNumbers.length; i++) {
        result = result.replace(new RegExp(arabicNumbers[i], "g"), englishNumbers[i])
    }
    return result
}

export function formatNumber(number: number, locale: Locale): string {
    return new Intl.NumberFormat(
        locale === 'ar' ? 'ar-EG' : 'en-US'
    ).format(number);
}


/**
 * Formats an amount for display. Accepts the serialized string form as well
 * as a number: money travels as a string (see @repo/money), and formatting
 * from the string keeps digits a Number conversion could round away.
 */
export function formatNumberWithConversion(amount: MoneyInput, locale: string): string {
    const currencyConfig = {
        ar: { currency: "EGP", symbol: "ج.م" },
        "ar-EG": { currency: "EGP", symbol: "ج.م" },
        en: { currency: "EGP", symbol: "EGP" },
        "en-US": { currency: "EGP", symbol: "EGP" },
    };

    const config = currencyConfig[locale as keyof typeof currencyConfig] || currencyConfig["en"];

    // Whole pounds print whole; anything with piastres prints both digits.
    // "EGP 1,067.5" read as a typo on a price tag — it is "EGP 1,067.50".
    const formatOptions: Intl.NumberFormatOptions & { trailingZeroDisplay?: "auto" | "stripIfInteger" } = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        trailingZeroDisplay: "stripIfInteger",
    };

    if (locale.startsWith("ar")) {
        formatOptions.numberingSystem = "arab";
    }

    // Intl accepts a numeric string and formats it without a float round trip.
    const formattedNumber = new Intl.NumberFormat(locale, formatOptions).format(
        serializeMoney(amount) as unknown as number,
    );

    if (locale.startsWith("ar")) {
        return `${formattedNumber} ${config.symbol}`;
    } else {
        return `${config.symbol} ${formattedNumber}`;
    }
}

/**
 * Reads a whole number out of a spec value that may be written in either
 * digit system. The Arabic ProductSpecification rows store "١٥", and
 * `parseInt("١٥")` is NaN — which is how "بقدرة NaN وات" reached the
 * Arabic product pages. Returns undefined when there is no number to read,
 * so callers fall back instead of rendering NaN.
 */
export function parseLocalizedInt(value: string | null | undefined): number | undefined {
    if (value == null) return undefined;
    const parsed = Number.parseInt(convertArabicToEnglishNumbers(value), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Formats a discount rate (0.13 = 13%) as a percentage in the page's own
 * digits and percent sign: "13%" in English, "١٣٪" in Arabic. Writing a
 * literal "%" next to Arabic-Indic digits mixes the two scripts.
 */
export function formatPercent(rate: MoneyInput, locale: string): string {
    const options: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 2 };
    if (locale.startsWith("ar")) options.numberingSystem = "arab";
    return new Intl.NumberFormat(locale, options).format(serializeRate(rate) as unknown as number);
}

/** A year, in the locale's digits and without a thousands separator: 2010, ٢٠١٠. */
export function formatYear(year: number, locale: string): string {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { useGrouping: false }).format(year);
}

/** A two-digit index for numbered rows — 01, 02 — in the locale's digits (٠١، ٠٢ in Arabic). */
export function formatIndex(index: number, locale: string): string {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { minimumIntegerDigits: 2, useGrouping: false }).format(index);
}
