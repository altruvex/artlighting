import { serializeMoney, type MoneyInput } from "@repo/money";
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

    const formatOptions: Intl.NumberFormatOptions = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
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
