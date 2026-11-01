"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Any page under [locale] that throws while rendering lands here instead of
 * the browser's bare "Application error". The header and footer stay, since
 * the layout above this boundary is still standing.
 *
 * Server errors arrive with only a `digest` (Next strips the message so no
 * internals leak); showing it lets the showroom match a customer's report
 * to the Vercel log line.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("error");
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  useEffect(() => {
    console.error("[page-error]", error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] w-full max-w-screen-2xl flex-col px-4 py-10 sm:px-6 lg:px-10">
      <div className="my-auto max-w-2xl py-16">
        <p className="eyebrow">500</p>
        <h1 className="mt-4 text-[length:var(--text-4xl)] font-medium leading-[1.05] ltr:tracking-tight rtl:leading-[1.3]">{t("title")}</h1>
        <p className="lede mt-6">{t("description")}</p>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="h-12 shrink-0 rounded-md bg-primary px-5 font-semibold text-primary-foreground transition-[transform,background-color] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-md border border-border px-5 font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary"
          >
            {t("home")}
          </Link>
        </div>

        {digest && (
          <p className="mt-8 text-sm text-muted-foreground">
            {t("reference")}: <span dir="ltr" className="font-mono">{digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
