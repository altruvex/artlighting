"use client";

import { chooseBulb } from "@/actions/product-bulb";
import { Button } from "@/components/ui/button";
import { formatNumber, formatNumberWithConversion } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import type { BulbChoice } from "@repo/catalog/bulb-pricing";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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

  return (
    <div className="space-y-2">
      <h3 className="mb-2 text-lg font-semibold">{t("chooseBulb")}</h3>
      {/* A single choice, so it is a radio group: without this a screen
          reader reads six buttons and never says which one is chosen. */}
      {/* One per row on a phone: the label is a name, a wattage and a
          price, and two of those side by side at 375px push the amount off
          the screen. */}
      <div
        role="radiogroup"
        aria-label={t("chooseBulb")}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {choices.map((choice) => {
          const isActive = choice.id === active;
          const included = Number(choice.increase) === 0;
          return (
            <Button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleChange(choice)}
              disabled={saving !== null}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "flex h-auto items-center justify-center rounded-full py-2 transition-all duration-200",
                isActive ? "bg-primary text-primary-foreground shadow-lg" : "bg-background hover:bg-secondary",
                saving !== null && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex min-w-0 flex-row items-end justify-center gap-2 text-center">
                <span className="truncate font-medium">
                  {choice.name} {t("watts", { n: formatNumber(choice.wattage, locale === "ar" ? "ar" : "en") })}
                </span>
                <span className="block max-w-xs whitespace-nowrap font-medium opacity-70">
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
              </span>
              {saving === choice.id && (
                <span className="ms-2 size-3 animate-spin rounded-full border-b-2 border-current" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
