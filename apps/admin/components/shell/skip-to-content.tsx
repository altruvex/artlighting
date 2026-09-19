"use client";

import { useTranslations } from "next-intl";

/** Keyboard users land here first and can jump past the nav (WCAG 2.4.1). */
export function SkipToContent() {
  const t = useTranslations("Shell");
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("skipToContent")}
    </a>
  );
}
