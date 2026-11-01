"use client";

import { useRouter } from "@/i18n/navigation";
import type { ShopSort as Sort } from "@/lib/shop.server";
import { setParam, type ShopParams } from "@/lib/shop-url";
import { useTranslations } from "next-intl";
import { useId, useTransition } from "react";

const OPTIONS: Sort[] = ["featured", "price-asc", "price-desc", "discount", "newest"];

/**
 * A native select. It is the one control every phone renders as its own
 * picker, it needs no script to be reachable by keyboard, and a sort has
 * five options — nothing a custom listbox would add is worth its weight.
 */
export function ShopSort({ value, params }: { value: Sort; params: ShopParams }) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [pending, start] = useTransition();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[length:var(--text-sm)] text-muted-foreground">
        {t("sortBy")}
      </label>
      <select
        id={id}
        value={value}
        disabled={pending}
        onChange={(event) =>
          start(() => {
            const next = event.target.value as Sort;
            router.push(setParam(params, "sort", next === "featured" ? null : next), { scroll: false });
          })
        }
        className="h-10 rounded-md border border-input bg-card pe-8 ps-3 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary/60 disabled:opacity-60 sm:h-9"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(`sort.${option}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
