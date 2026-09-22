"use client";

import { chooseBulb } from "@/actions/product-bulb";
import { formatNumber, formatNumberWithConversion } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import type { BulbChoice } from "@repo/catalog/bulb-pricing";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ChipSpinner, OptionGroup, optionChip } from "./option-group";

/**
 * Which bulb the fixture is bought with.
 *
 * Shown only when the product has choices, which @repo/catalog only returns
 * for a fixture with arms — a bulb needs somewhere to go. The old version
 * decided this from the brand and the lighting type instead, so an
 * arm-bearing chandelier filed as LED offered nothing and a Balcom one
 * could not offer anything at all.
 *
 * The prices come from the server already worked out for this fixture's arm
 * count, and picking one posts the bulb's id — never a price. The figure
 * shown is the difference from the bulb the fixture is sold with, because
 * the listed price already covers that one.
 */
export default function ProductBulbButtons({
  configId,
  choices,
  selectedBulbId,
  onBulbChange,
}: {
  configId?: string;
  choices: BulbChoice[];
  selectedBulbId?: string | null;
  /** Reports the id and what it adds, both as the server computed them. */
  onBulbChange: (bulbId: string, lampPriceIncrease: string) => void;
}) {
  const t = useTranslations("ProductBulbButtons");
  const locale = useLocale();

  const fallback = choices.find((choice) => choice.isDefault)?.id ?? choices[0]?.id;
  const [active, setActive] = useState<string | undefined>(selectedBulbId ?? fallback);
  const [saving, setSaving] = useState<string | null>(null);

  const handleChange = useCallback(
    async (choice: BulbChoice) => {
      if (choice.id === active || saving) return;

      const previous = active;
      // Optimistic: the price beside the button moves at once, and goes back
      // if the server refuses.
      setActive(choice.id);
      onBulbChange(choice.id, choice.increase);

      if (!configId) return;
      setSaving(choice.id);
      try {
        const result = await chooseBulb({ configId, bulbId: choice.id });
        if (!result.success) {
          setActive(previous);
          const restored = choices.find((row) => row.id === previous);
          if (restored) onBulbChange(restored.id, restored.increase);
          toast.error(t("change-error"));
        }
      } catch {
        setActive(previous);
        toast.error(t("change-error"));
      } finally {
        setSaving(null);
      }
    },
    [active, saving, configId, choices, onBulbChange, t],
  );

  if (choices.length === 0) return null;

  const current = choices.find((choice) => choice.id === active);

  return (
    // One per row on a phone: the label is a name, a wattage and a price,
    // and two of those side by side at 375px push the amount off the screen.
    <OptionGroup
      label={t("chooseBulb")}
      selected={current ? `${current.name} ${t("watts", { n: formatNumber(current.wattage, locale === "ar" ? "ar" : "en") })}` : undefined}
      className="grid-cols-1 sm:grid-cols-2"
    >
      {choices.map((choice) => {
        const isActive = choice.id === active;
        const included = Number(choice.increase) === 0;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleChange(choice)}
            disabled={saving !== null}
            className={cn(optionChip(isActive), "justify-between")}
          >
            <span className="truncate">
              {choice.name} {t("watts", { n: formatNumber(choice.wattage, locale === "ar" ? "ar" : "en") })}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
              {saving === choice.id && <ChipSpinner />}
              {included
                ? t("included")
                : /* The page's own formatter: Intl with numberingSystem
                     "arab", so the amount reads ١٢٠ beside a price that
                     already does, not 120. */
                  `${Number(choice.increase) < 0 ? "−" : "+"}${formatNumberWithConversion(
                    Math.abs(Number(choice.increase)).toFixed(2),
                    locale,
                  )}`}
            </span>
          </button>
        );
      })}
    </OptionGroup>
  );
}
