import { Link } from "@/i18n/navigation";
import { formatPercent } from "@/lib/numbers";
import type { Promotion } from "@/lib/promotions.server";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * The first screen.
 *
 * It replaces a five-slide street-lamp carousel with no headline and no way
 * into the shop — the one place a first-time visitor decides whether this
 * is a lighting store, and it said nothing. Now it says what the shop is,
 * names the strongest live offer from the discounts the cart applies, and
 * puts the shop one tap away. One image, not five: a carousel's second
 * slide is seen by almost no one, and five hero images is five full-width
 * downloads before anything is interactive.
 */
export async function HomeHero({ locale, promotion }: { locale: string; promotion: Promotion | null }) {
  const t = await getTranslations({ locale, namespace: "home.hero" });
  const Arrow = locale === "ar" ? ArrowLeftIcon : ArrowRightIcon;
  const rate = promotion?.rate ? formatPercent(promotion.rate, locale) : null;

  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/main-landing/landing-1.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Darkened toward the text side so the copy stays legible over any
          part of the photograph, in either direction. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-l from-background/95 via-background/70 to-background/15 ltr:bg-linear-to-r"
      />
      <div className="mx-auto flex min-h-[min(78dvh,46rem)] max-w-screen-2xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-10">
        <div className="max-w-xl space-y-6">
          {rate && (
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/60 py-1 pe-3 ps-1 text-[length:var(--text-sm)] backdrop-blur">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[length:var(--text-xs)] font-semibold tabular-nums text-primary-foreground">
                {rate}
              </span>
              {t("offer")}
            </p>
          )}
          <h1 className="text-[length:var(--text-4xl)] leading-[1.05]">{t("title")}</h1>
          <p className="max-w-md text-[length:var(--text-lg)] text-muted-foreground">{t("body")}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-[var(--dur-press)] ease-[var(--ease-out)] active:scale-[0.98]"
            >
              {t("shop")}
              <Arrow className="size-4 transition-transform duration-[var(--dur-hover)] group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/products?sale=1"
              className="inline-flex items-center rounded-lg border border-border bg-background/60 px-6 py-3 font-semibold backdrop-blur transition-colors duration-[var(--dur-hover)] hover:border-primary/60"
            >
              {t("deals")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
