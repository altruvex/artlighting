"use client";

import { Link } from "@/i18n/navigation";
import { familySlug, type ProductFamily } from "@repo/catalog/families";
import { formatPercent, formatNumberWithConversion } from "@/lib/numbers";
import type { Promotion } from "@/lib/promotions.server";
import { cn } from "@/lib/utils";
import { Onward } from "@/components/editorial/arrow";
import { CalendarClockIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

/**
 * The live promotions, one band above the header.
 *
 * It reads the Discount rows the checkout prices with, so what it offers is
 * what the cart gives. The figure sits in a filled gold chip and the copy in
 * full white: the earlier hairline version, with the figure in gold type and
 * the copy at 72%, read as a footnote, and "Ends in 83d 22h" told the shopper
 * nothing they could act on.
 *
 * How it ends depends on how far away the end is. Weeks out, it names the
 * date ("Until 31 January") — a date is something you plan around, a count
 * of 83 days is noise. Inside the last week it switches to a live countdown
 * in boxes, seconds included, because that is when a deadline makes people
 * act.
 */

/** Inside this window the end date becomes a live countdown. */
const COUNTDOWN_WINDOW = 7 * 86_400_000;

const INK = "bg-[oklch(0.16_0.006_60)]";
const PAPER = "text-[oklch(0.975_0.002_80)]";

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
      className={cn("relative isolate z-40 overflow-hidden", INK, PAPER)}
    >
      {/* A warm light from the start edge and a gold hairline along the
          bottom: the band glows like the fittings it sells. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_140%_at_0%_50%,oklch(0.66_0.125_70/0.28),transparent_70%)] rtl:bg-[radial-gradient(60%_140%_at_100%_50%,oklch(0.66_0.125_70/0.28),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--gold-400),transparent)] opacity-70"
      />

      <div className="mx-auto flex min-h-12 max-w-screen-2xl items-center justify-center gap-x-3 py-1.5 ps-3 pe-12 text-[length:var(--text-xs)] sm:gap-x-5 sm:ps-12 sm:text-[length:var(--text-sm)]">
        <span className="hidden shrink-0 items-center gap-2 font-semibold text-[color:var(--gold-300)] lg:inline-flex">
          <LiveDot />
          {t("limited")}
        </span>

        <ul className="flex min-w-0 items-center justify-center">
          {promotions.map((promotion, index) => (
            <li
              key={promotion.id}
              // One offer on a phone: the rest wait for the wider screen.
              className={cn(
                "min-w-0 items-center",
                index > 0 ? "ms-5 hidden border-s border-[oklch(1_0_0/0.16)] ps-5 xl:flex" : "flex",
              )}
            >
              <PromotionLine promotion={promotion} locale={locale} lead={index === 0} />
            </li>
          ))}
        </ul>

        {soonest && <EndsAt endsAt={soonest} />}
      </div>

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

/** A small gold light that breathes: the offer is on now. */
function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color:var(--gold-400)] opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-[color:var(--gold-300)]" />
    </span>
  );
}

function PromotionLine({ promotion, locale, lead }: { promotion: Promotion; locale: string; lead: boolean }) {
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
    <Link href={target} className="group flex min-w-0 items-center gap-2.5 whitespace-nowrap">
      <span className="relative inline-flex shrink-0 items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--gold-300),var(--gold-400))] px-2.5 py-0.5 font-[family-name:var(--font-display-face)] font-bold tabular-nums text-[oklch(0.2_0.02_60)] shadow-[0_0_18px_oklch(0.76_0.115_76/0.35)] sm:px-3 sm:text-[length:var(--text-base)]">
        {t("off", { figure })}
        {/* One pass of light across the chip every few seconds. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -start-1/2 w-1/2 animate-[promo-sheen_5s_var(--ease-out)_1.2s_infinite] bg-[linear-gradient(100deg,transparent,oklch(1_0_0/0.55),transparent)] motion-reduce:hidden rtl:[--sheen-dir:-1]"
        />
      </span>
      <span className="truncate font-medium">{where}</span>
      {promotion.code && (
        <span className="hidden items-center gap-1.5 text-[oklch(0.975_0.002_80/0.75)] md:inline-flex">
          {t("withCode")}
          <code
            className="rounded-sm border border-dashed border-[color:var(--gold-400)] px-1.5 font-mono text-[length:var(--text-xs)] font-semibold text-[color:var(--gold-300)]"
            dir="ltr"
          >
            {promotion.code}
          </code>
        </span>
      )}
      {lead ? (
        <span className="hidden items-center gap-1 font-semibold text-[color:var(--gold-300)] underline decoration-[oklch(0.86_0.09_82/0.4)] underline-offset-4 transition-colors duration-[var(--dur-hover)] group-hover:decoration-[color:var(--gold-300)] sm:inline-flex">
          {t("shopNow")}
          <Onward className="size-3.5 transition-transform duration-[var(--dur-hover)] ease-[var(--ease-out)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </span>
      ) : (
        <>
          <span className="sr-only">— {t("shop")}</span>
          <Onward className="size-3.5 text-[oklch(0.975_0.002_80/0.6)] group-hover:text-[oklch(0.975_0.002_80)]" />
        </>
      )}
    </Link>
  );
}

/**
 * The end of the soonest offer: a date while it is weeks away, a live
 * countdown in the last week, gone once it has passed.
 */
function EndsAt({ endsAt }: { endsAt: string }) {
  const t = useTranslations("promo");
  const locale = useLocale();
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  const left = now === null ? null : Math.max(0, end - now);
  const counting = left !== null && left <= COUNTDOWN_WINDOW;

  useEffect(() => {
    setNow(Date.now());
    // Each second inside the window, where the seconds are on screen;
    // otherwise a minute is plenty to notice the window opening.
    const id = window.setInterval(() => setNow(Date.now()), counting ? 1_000 : 60_000);
    return () => window.clearInterval(id);
  }, [counting]);

  // Nothing on the server render: whether to show a date or a countdown
  // depends on the visitor's clock, and would not hydrate.
  if (left === null || left === 0) return null;

  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  }).format(end);

  if (!counting) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 border-s border-[oklch(1_0_0/0.16)] ps-3 sm:ps-5">
        <CalendarClockIcon aria-hidden className="hidden size-4 text-[color:var(--gold-300)] sm:block" />
        <span className="hidden text-[oklch(0.975_0.002_80/0.75)] sm:inline">{t("until")}</span>
        <span className="text-[oklch(0.975_0.002_80/0.75)] sm:hidden">{t("untilShort")}</span>
        <time dateTime={endsAt} className="font-semibold">
          {date}
        </time>
      </span>
    );
  }

  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1_000);
  const units: { value: number; label: string; phone?: boolean }[] = [
    ...(days > 0 ? [{ value: days, label: t("units.d"), phone: true }] : []),
    { value: hours, label: t("units.h"), phone: true },
    { value: minutes, label: t("units.m"), phone: true },
    { value: seconds, label: t("units.s") },
  ];
  const two = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { minimumIntegerDigits: 2 });

  return (
    <span className="flex shrink-0 items-center gap-2 border-s border-[oklch(1_0_0/0.16)] ps-3 sm:ps-5">
      <span className="hidden text-[oklch(0.975_0.002_80/0.75)] md:inline">{t("endsIn")}</span>
      <time
        dateTime={endsAt}
        aria-label={t("endsOn", { date })}
        className="flex items-center gap-1"
      >
        {units.map((unit) => (
          <span
            key={unit.label}
            className={cn(
              "min-w-9 flex-col items-center rounded-md border border-[oklch(1_0_0/0.14)] bg-[oklch(1_0_0/0.07)] px-1.5 py-0.5 leading-none sm:min-w-10",
              unit.phone ? "flex" : "hidden sm:flex",
            )}
          >
            <span className="font-[family-name:var(--font-display-face)] text-[length:var(--text-sm)] font-bold tabular-nums text-[color:var(--gold-300)]">
              {two.format(unit.value)}
            </span>
            <span className="mt-0.5 text-[10px] text-[oklch(0.975_0.002_80/0.6)]">{unit.label}</span>
          </span>
        ))}
      </time>
    </span>
  );
}
