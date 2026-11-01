"use client";

import { recentlyViewedCards } from "@/actions/recently-viewed";
import { ProductRail } from "@/components/home/product-rail";
import { clearRecentlyViewed, onRecentlyViewedChanged, readRecentlyViewed, recordRecentlyViewed } from "@/lib/recently-viewed";
import type { ShopCard } from "@/lib/shop.server";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * "Recently viewed" — what this browser looked at on an earlier visit.
 *
 * Renders nothing until there is something to show, and nothing at all for
 * a first-time visitor. On a product page the product being looked at is
 * left out: it is already on the screen.
 */
export function RecentlyViewed({ locale, exclude }: { locale: string; exclude?: string }) {
  const t = useTranslations("recent");
  const [cards, setCards] = useState<ShopCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const codes = readRecentlyViewed().filter((code) => code !== exclude);
      if (codes.length === 0) {
        setCards([]);
        return;
      }
      recentlyViewedCards(codes, locale)
        .then((next) => {
          if (!cancelled) setCards(next);
        })
        .catch(() => {});
    };
    load();
    const stop = onRecentlyViewedChanged(load);
    return () => {
      cancelled = true;
      stop();
    };
  }, [locale, exclude]);

  if (cards.length === 0) return null;

  return (
    <ProductRail
      id="recently-viewed"
      title={t("title")}
      subtitle={t("subtitle")}
      products={cards}
      locale={locale}
      action={
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="inline-flex min-h-10 shrink-0 items-center rounded-md px-1 text-[length:var(--text-sm)] font-medium text-muted-foreground underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {t("clear")}
        </button>
      }
    />
  );
}

/** Remembers the product on the screen. Renders nothing. */
export function RecordView({ productId }: { productId: string }) {
  useEffect(() => recordRecentlyViewed(productId), [productId]);
  return null;
}
