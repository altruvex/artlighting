"use client";

import { chooseColorTemp } from "@/actions/product-color-temp";
import { PRODUCT_TEMP_LABEL_MAP } from "@/config/config";
import type { SupportedLanguage } from "@/types/products";
import type { ProductColorTemp } from "@repo/database";
import { useLocale } from "next-intl";
import { useState } from "react";
import { OptionGroup, optionChip } from "./option-group";

const SECTION_TITLE: Record<SupportedLanguage, string> = {
  en: "Colour temperature",
  ar: "درجة حرارة اللون",
};

/** What each choice looks like lit — a hint beside the word, not a claim. */
const SWATCH: Record<ProductColorTemp, string> = {
  warm: "bg-[#F6C77A]",
  white: "bg-[#F4EFE3]",
  cool: "bg-[#D6E6F7]",
};

/** Warm, neutral, cool — the order they sit on the Kelvin scale. */
const ORDER: ProductColorTemp[] = ["warm", "white", "cool"];

/**
 * The colour temperature the customer wants.
 *
 * Saved on their own configuration. It used to be written onto the product
 * itself, by an action anyone could call, and then the whole page was
 * re-rendered on the server to show a choice the browser already knew.
 */
export default function ColorTempOptions({
  ensureConfigId,
  productColorTemp,
  onColorTempChange,
}: {
  /** The visitor's configuration id, created on first use. */
  ensureConfigId: () => Promise<string | null>;
  productColorTemp: ProductColorTemp;
  onColorTempChange: (next: ProductColorTemp) => void;
}) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as SupportedLanguage;
  const labels = PRODUCT_TEMP_LABEL_MAP[locale];
  const [active, setActive] = useState<ProductColorTemp>(productColorTemp);

  const choose = (next: ProductColorTemp) => {
    if (next === active) return;
    setActive(next);
    onColorTempChange(next);
    // Best-effort: the choice is also carried by the order itself, so a
    // failed save costs nothing the customer would see.
    void ensureConfigId()
      .then((configId) => (configId ? chooseColorTemp({ configId, colorTemp: next }) : undefined))
      .catch(() => {});
  };

  return (
    <OptionGroup label={SECTION_TITLE[locale]} selected={labels[active]} className="grid-cols-3">
      {ORDER.map((temp) => (
        <button
          key={temp}
          type="button"
          role="radio"
          aria-checked={active === temp}
          onClick={() => choose(temp)}
          className={optionChip(active === temp)}
        >
          <span aria-hidden className={`size-3 shrink-0 rounded-full ring-1 ring-foreground/15 ${SWATCH[temp]}`} />
          {labels[temp]}
        </button>
      ))}
    </OptionGroup>
  );
}
