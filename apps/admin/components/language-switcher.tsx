"use client";

import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Each language is labelled in its own script (and tagged with its own lang)
// so an admin can always find their language, whatever the UI is set to.
const LABELS: Record<Locale, string> = { en: "English", ar: "العربية" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const current = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5 text-xs font-medium",
        isPending && "opacity-60",
        className,
      )}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          disabled={isPending}
          onClick={() => choose(locale)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            locale === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
