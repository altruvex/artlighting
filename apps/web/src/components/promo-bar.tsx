"use client";

import { Link } from "@/i18n/navigation";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import { formatPercent, formatNumberWithConversion } from "@/lib/numbers";
import type { Promotion } from "@/lib/promotions.server";
import { cn } from "@/lib/utils";
import { Onward } from "@/components/editorial/arrow";
import { XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

/**
 * The live promotions, one slim line above the header.
 *
 * It replaces a "White Friday" banner that had stayed up all year: a
 * gradient block taller than the header, its figure bouncing on a loop, and
 * its copy a fixed string that happened to match the data. This reads the
 * Discount rows the checkout prices with, so what it offers is what the cart
 * gives, and it shows what ends with a real countdown rather than a
 * permanent "limited time".
 *
 * Set as a narrow ink band, the same always-dark ground as the home page's
 * first screen, in either theme: the figure in gold type rather than a
 * filled gold chip, the offers divided by hairlines, and each whole offer a
 * link — it read as a shop's sale ticker, not the top line of a company's
 * site.
 */
export function PromoBar({ promotions }: { promotions: Promotion[] }) {
  const t = useTranslations("promo");
  const locale = useLocale();
  // Dismissal is remembered against *this set* of promotions: closing one
  // offer must not hide the next one the showroom runs.
  const signature = useMemo(() => promotions.map((p) => p.id).sort().join("|"), [promotions]);
  const storageKey = `promo-dismissed:${signature}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // Storage can be blocked (private mode); then it simply shows.
    }
  }, [storageKey]);

  if (promotions.length === 0 || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* best effort */
    }
  };

  const soonest = promotions
    .map((p) => p.endsAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return (
    <aside
      aria-label={t("label")}
      className="relative z-40 border-b border-[oklch(1_0_0/0.08)] bg-[oklch(0.16_0.006_60)] text-[oklch(0.975_0.002_80)]"
    >
      <div className="mx-auto flex h-10 max-w-screen-2xl items-center justify-center gap-x-6 px-12 text-[length:var(--text-xs)] sm:text-[length:var(--text-sm)]">
        <span className="eyebrow hidden shrink-0 !text-[color:var(--gold-300)] lg:inline">{t("label")}</span>
        <ul className="flex min-w-0 items-center justify-center">
          {promotions.map((promotion, index) => (
            <li
              key={promotion.id}
              // One line on a phone: the rest wait for the wider screen.
              className={cn(
                "min-w-0 items-center",
                index > 0 ? "hidden border-s border-[oklch(1_0_0/0.16)] ps-6 ms-6 md:flex" : "flex",
              )}
            >
              <PromotionLine promotion={promotion} locale={locale} />
            </li>
          ))}
        </ul>
        {soonest && <Countdown endsAt={soonest} />}
      </div>
      {/* The bar's full height: a 32px target was too small for a thumb. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="absolute inset-y-0 end-1 my-auto grid size-10 place-items-center rounded-md text-[oklch(0.975_0.002_80/0.6)] transition-colors duration-[var(--dur-hover)] ease-[var(--ease-out)] hover:bg-[oklch(1_0_0/0.08)] hover:text-[oklch(0.975_0.002_80)]"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </aside>
  );
}

function PromotionLine({ promotion, locale }: { promotion: Promotion; locale: string }) {
  const t = useTranslations("promo");
  const figure = promotion.rate
    ? formatPercent(promotion.rate, locale)
    : promotion.amount
      ? formatNumberWithConversion(promotion.amount, locale)
      : null;
  if (!figure) return null;

  const coverage = promotion.coverage;
  const where =
    coverage.kind === "family"
      ? t("on.family", { family: t(`family.${coverage.family}`) })
      : coverage.kind === "families"
        ? t("on.families", {
            families: new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
              coverage.families.map((family) => t(`family.${family}`)),
            ),
          })
        : coverage.kind === "products"
          ? t("on.products", { count: coverage.count })
          : coverage.kind === "categories"
            ? t("on.categories", { count: coverage.count })
            : coverage.minOrderValue
              ? t("on.cartOver", { amount: formatNumberWithConversion(coverage.minOrderValue, locale) })
              : t("on.cart");

  // Where the offer can be spent: the family's own shelf when it has one.
  const target =
    coverage.kind === "family" ? `/products?family=${familySlug(coverage.family as ProductFamily)}` : "/products";

  return (
    <Link
      href={target}
      className="group flex min-w-0 items-center gap-2 whitespace-nowrap transition-colors duration-[var(--dur-hover)]"
    >
      <span className="font-semibold tabular-nums text-[color:var(--gold-300)]">{t("off", { figure })}</span>
      <span className="truncate text-[oklch(0.975_0.002_80/0.72)] group-hover:text-[oklch(0.975_0.002_80)]">{where}</span>
      {promotion.code && (
        <span className="hidden text-[oklch(0.975_0.002_80/0.72)] sm:inline">
          {t("withCode")}{" "}
          <code className="rounded-sm border border-[oklch(1_0_0/0.24)] px-1 font-mono text-[length:var(--text-xs)] text-[oklch(0.975_0.002_80)]" dir="ltr">
            {promotion.code}
          </code>
        </span>
      )}
      <span className="sr-only">— {t("shop")}</span>
      <Onward className="size-3.5 shrink-0 text-[oklch(0.975_0.002_80/0.6)] transition-transform duration-[var(--dur-hover)] group-hover:translate-x-0.5 group-hover:text-[oklch(0.975_0.002_80)] rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

/**
 * Days, hours and minutes to the soonest end. Seconds would tick visibly
 * and pull the eye every second for no decision the shopper can make.
 */
function Countdown({ endsAt }: { endsAt: string }) {
  const t = useTranslations("promo");
  const locale = useLocale();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Nothing on the server render: a countdown computed there is already
  // wrong by the time it reaches the browser, and would not hydrate.
  if (now === null) return null;
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  if (left === 0) return null;

  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const n = (value: number) => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);

  return (
    <span className="hidden shrink-0 items-center gap-1.5 border-s border-[oklch(1_0_0/0.16)] ps-6 text-[oklch(0.975_0.002_80/0.6)] lg:flex">
      {t("endsIn")}
      <time dateTime={endsAt} className="font-medium tabular-nums text-[oklch(0.975_0.002_80)]">
        {days > 0 ? t("dh", { d: n(days), h: n(hours) }) : t("hm", { h: n(hours), m: n(minutes) })}
      </time>
    </span>
  );
}
