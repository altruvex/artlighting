import { addDays, format } from "date-fns"
import { enUS } from "date-fns/locale"
import { formatNumber } from "@/lib/numbers"

const arabicMonths = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
]


export function formatDate(date: Date, locale: string): string {
    if (locale === "ar") {
        // Arabic-Indic digits, like every other number on the Arabic
        // pages: Intl's own ICU formatting for this locale doesn't produce
        // them on its own (see lib/numbers.ts).
        const day = formatNumber(date.getDate(), "ar")
        const month = arabicMonths[date.getMonth()]
        const year = formatNumber(date.getFullYear(), "ar")
        return `${day} ${month}، ${year}`
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date)
}

export function calculateEstimatedDeliveryDate(locale: "ar" | "en") {
    const currentDate = new Date();
    const estimatedDeliveryDate = addDays(currentDate, 4);

    if (locale === "ar") {
        return new Intl.DateTimeFormat("ar-EG", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(estimatedDeliveryDate);
    }

    return format(estimatedDeliveryDate, "dd MMM, yyyy", { locale: enUS });
}