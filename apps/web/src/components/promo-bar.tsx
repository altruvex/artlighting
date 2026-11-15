"use client";

import { Link } from "@/i18n/navigation";
import { familySlug } from "@repo/catalog/families";
import {
  formatPercent,
  formatNumber,
  formatNumberWithConversion,
} from "@/lib/numbers";
import type { Promotion } from "@/lib/promotions.server";
import { cn } from "@/lib/utils";
import { Onward } from "@/components/editorial/arrow";
import { Tag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

const DISMISS_EVENT = "artlighting:promo-dismissed";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(DISMISS_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(DISMISS_EVENT, listener);
  };
}

/** The same surfaces, type and accent as the shop; each date belongs to its offer. */
export function PromoBar({ promotions }: { promotions: Promotion[] }) {
  const t = useTranslations("promo");
  const locale = useLocale();
  const signature = promotions
    .map((promotion) => promotion.id)
    .sort()
    .join("|");
  const storageKey = `promo-dismissed:${signature}`;
  const [dismissedHere, setDismissedHere] = useState<string | null>(null);
  const dismissedStored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );

  if (!promotions.length || dismissedHere === signature || dismissedStored)
    return null;

  const dismiss = () => {
    setDismissedHere(signature);
    try {
      window.localStorage.setItem(storageKey, "1");
      window.dispatchEvent(new Event(DISMISS_EVENT));
    } catch {
      /* The current tab still remembers the dismissal. */
    }
  };

  return (
    <aside
      aria-label={t("label")}
      className="border-b border-border bg-accent/60 text-foreground"
    >
      <div className="relative mx-auto flex min-h-11 max-w-screen-2xl items-center justify-center py-1 ps-4 pe-12 sm:px-14">
        <ul className="flex min-w-0 items-center justify-center gap-6 text-[length:var(--text-xs)]">
          {promotions.slice(0, 2).map((promotion, index) => (
            <li
              key={promotion.id}
              className={cn(
                "min-w-0",
                index > 0 && "hidden border-s border-border ps-6 xl:block",
              )}
            >
              <PromotionLine promotion={promotion} locale={locale} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="absolute end-1 inset-y-0 my-auto grid size-10 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}

function PromotionLine({
  promotion,
  locale,
}: {
  promotion: Promotion;
  locale: string;
}) {
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
            families: new Intl.ListFormat(locale, {
              style: "long",
              type: "conjunction",
            }).format(coverage.families.map((family) => t(`family.${family}`))),
          })
        : coverage.kind === "products"
          ? t("on.products", {
              count: coverage.count,
              formatted: formatNumber(
                coverage.count,
                locale === "ar" ? "ar" : "en",
              ),
            })
          : coverage.kind === "categories"
            ? t("on.categories", {
                count: coverage.count,
                formatted: formatNumber(
                  coverage.count,
                  locale === "ar" ? "ar" : "en",
                ),
              })
            : coverage.minOrderValue
              ? t("on.cartOver", {
                  amount: formatNumberWithConversion(
                    coverage.minOrderValue,
                    locale,
                  ),
                })
              : t("on.cart");
  const target =
    coverage.kind === "family"
      ? `/products?family=${familySlug(coverage.family)}`
      : "/products";
  const endDate = promotion.endsAt
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Cairo",
      }).format(new Date(promotion.endsAt))
    : null;

  return (
    <Link
      href={target}
      className="group flex min-h-9 min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 leading-relaxed"
    >
      <Tag
        className="hidden size-3.5 shrink-0 text-primary sm:block"
        aria-hidden
      />
      <span className="font-semibold tabular-nums text-primary">
        {t("off", { figure })}
      </span>
      <span>{where}</span>
      {promotion.code && (
        <span className="inline-flex items-center gap-1">
          {t("withCode")}{" "}
          <code
            dir="ltr"
            className="rounded-sm border border-border bg-background px-1.5 font-mono font-semibold"
          >
            {promotion.code}
          </code>
        </span>
      )}
      {endDate && (
        <span className="hidden items-center gap-1 text-muted-foreground lg:inline-flex">
          <span aria-hidden>·</span>
          {t("untilShort")} <time dateTime={promotion.endsAt!}>{endDate}</time>
        </span>
      )}
      <span className="hidden items-center gap-1 font-medium underline-offset-4 group-hover:underline sm:inline-flex">
        {t("shopNow")}
        <Onward className="size-3.5" />
      </span>
      <span className="sr-only sm:hidden">{t("shopNow")}</span>
    </Link>
  );
}
