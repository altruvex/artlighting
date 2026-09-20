import type { SpecComparator, SpecValueKind } from "./specs";

/**
 * Rendering a structured spec value in one locale.
 *
 * There is exactly one of these, and both languages go through it, which is
 * the whole reason for the split: a figure can be *shown* in Arabic, never
 * retyped in Arabic. Only a TEXT value still has a per-language string, and
 * TEXT is the one kind that can still disagree with itself.
 */

export interface SpecValueForDisplay {
  kind: SpecValueKind;
  unit?: string | null;
  comparator?: SpecComparator | null;
  measurements?: {
    value: string;
    valueMax?: string | null;
    conditionValue?: string | null;
    conditionUnit?: string | null;
  }[];
  /** CHOICE: the label already translated for this locale. */
  optionLabel?: string | null;
  /** TEXT: the per-language string. */
  text?: string | null;
}

const COMPARATOR_PREFIX: Record<SpecComparator, string> = {
  EXACT: "",
  AT_LEAST: "≥ ",
  AT_MOST: "≤ ",
  APPROX: "≈ ",
};

/**
 * Units are written the same in both scripts — "W", "lm", "K" are symbols,
 * not English words, and an Arabic datasheet shows them unchanged. The
 * exception is the ones that really are words, which get a translation.
 */
const UNIT_LABELS: Record<string, { en: string; ar: string }> = {
  h: { en: "h", ar: "ساعة" },
  "lm/m": { en: "lm/m", ar: "lm/m" },
};

function formatNumber(value: string, locale: string): string {
  const options: Intl.NumberFormatOptions = { maximumFractionDigits: 4 };
  if (locale.startsWith("ar")) options.numberingSystem = "arab";
  // Intl takes the numeric string directly, so nothing round-trips through
  // a float on its way to the screen.
  return new Intl.NumberFormat(locale, options).format(value as unknown as number);
}

function unitFor(unit: string | null | undefined, locale: string): string {
  if (!unit) return "";
  const translated = UNIT_LABELS[unit];
  if (!translated) return unit;
  return locale.startsWith("ar") ? translated.ar : translated.en;
}

export function formatSpecValue(value: SpecValueForDisplay, locale: string): string {
  const isArabic = locale.startsWith("ar");

  switch (value.kind) {
    case "CHOICE":
      return value.optionLabel ?? "—";

    case "TEXT":
      return value.text ?? "—";

    case "RANGE": {
      const [measurement] = value.measurements ?? [];
      if (!measurement || measurement.valueMax == null) return "—";
      const unit = unitFor(value.unit, locale);
      const from = formatNumber(measurement.value, locale);
      const to = formatNumber(measurement.valueMax, locale);
      // An en dash would read as a minus next to a negative temperature.
      const joiner = isArabic ? " إلى " : " to ";
      return `${from}${joiner}${to}${unit ? ` ${unit}` : ""}`;
    }

    case "MEASUREMENT": {
      const measurements = value.measurements ?? [];
      if (measurements.length === 0) return "—";
      const unit = unitFor(value.unit, locale);
      const prefix = COMPARATOR_PREFIX[value.comparator ?? "EXACT"];

      // A degree sign sits against its number; every other unit takes a space.
      const joinUnit = (number: string) => (unit === "°" ? `${number}${unit}` : unit ? `${number} ${unit}` : number);
      const hasConditions = measurements.some((measurement) => measurement.conditionValue != null);

      // "3,000 / 4,000 / 6,500 K", not "3,000 K / 4,000 K / 6,500 K":
      // repeating the unit on every entry of a plain list is noise. A list
      // with conditions keeps its units, because each figure is a different
      // measurement rather than another option.
      if (!hasConditions) {
        const numbers = [...new Set(measurements.map((measurement) => formatNumber(measurement.value, locale)))];
        return `${prefix}${joinUnit(numbers.join(" / "))}`;
      }

      const parts = measurements.map((measurement) => {
        const body = `${prefix}${joinUnit(formatNumber(measurement.value, locale))}`;
        const condition = `${formatNumber(measurement.conditionValue!, locale)}${
          measurement.conditionUnit ? ` ${measurement.conditionUnit}` : ""
        }`;
        return `${body} (${condition})`;
      });

      // Deduplicate: a figure quoted once for two colour temperatures still
      // reads as two measurements, but two identical ones do not.
      return [...new Set(parts)].join(" / ");
    }
  }
}
