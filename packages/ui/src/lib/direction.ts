import { useMemo } from "react"

const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "ku", "az"]

function isRTLLanguage(locale?: string): boolean {
  const lang =
    locale ||
    (typeof document !== "undefined" ? document.documentElement.lang : "") ||
    "en"
  return RTL_LANGUAGES.includes(lang.split("-")[0].toLowerCase())
}

export function useTextDirection(locale?: string) {
  return useMemo(() => {
    const isRTL = isRTLLanguage(locale)
    return { direction: isRTL ? ("rtl" as const) : ("ltr" as const), isRTL }
  }, [locale])
}

export function getDirectionalValue<T>(ltrValue: T, rtlValue: T, locale?: string): T {
  return isRTLLanguage(locale) ? rtlValue : ltrValue
}
