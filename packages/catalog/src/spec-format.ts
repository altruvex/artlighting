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
 * A unit that is a word gets translated; a unit that is a symbol does not.
 *
 * "°" and "°C" are notation and read the same in any script. "W", "lm" and
 * "K" abbreviate words an Arabic reader says in Arabic — a spec table that
 * writes "١٥ W" beside a sentence saying "بقدرة ١٥ وات" is two answers to
 * one question, so both come from here.
 */
const UNIT_LABELS: Record<string, { en: string; ar: string }> = {
  W: { en: "W", ar: "وات" },
  lm: { en: "lm", ar: "لومن" },
  K: { en: "K", ar: "كلفن" },
  h: { en: "h", ar: "ساعة" },
  "lm/m": { en: "lm/m", ar: "لومن/م" },
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

/** One stored figure, ready to be placed in its own cell. */
export interface SpecValuePart {
  /** What the figure was measured at, e.g. "3,000 K". Absent when there is none. */
  condition?: string;
  /** The figure with its unit, e.g. "1,320 lm". */
  text: string;
}

/**
 * The value broken into its stored figures, so a table can give each one its
 * own cell instead of reading them out as a sentence.
 *
 * `formatSpecValue` below joins these into a single string, which is still
 * what a datasheet line, a card, or a lookup by key wants. The table wants
 * the pieces.
 */
export function specValueParts(value: SpecValueForDisplay, locale: string): SpecValuePart[] {
  const isArabic = locale.startsWith("ar");

  switch (value.kind) {
    case "CHOICE":
      return value.optionLabel ? [{ text: value.optionLabel }] : [];

    case "TEXT":
      return value.text ? [{ text: value.text }] : [];

    case "RANGE": {
      const [measurement] = value.measurements ?? [];
      if (!measurement || measurement.valueMax == null) return [];
      const unit = unitFor(value.unit, locale);
      const from = formatNumber(measurement.value, locale);
      const to = formatNumber(measurement.valueMax, locale);
      const joiner = isArabic ? " إلى " : " to ";
      return [{ text: `${from}${joiner}${to}${unit ? ` ${unit}` : ""}` }];
    }

    case "MEASUREMENT": {
      const measurements = value.measurements ?? [];
      if (measurements.length === 0) return [];
      const unit = unitFor(value.unit, locale);
      const prefix = COMPARATOR_PREFIX[value.comparator ?? "EXACT"];
      const joinUnit = (number: string) => (unit === "°" ? `${number}${unit}` : unit ? `${number} ${unit}` : number);

      const parts = measurements.map((measurement) => {
        const text = `${prefix}${joinUnit(formatNumber(measurement.value, locale))}`;
        if (measurement.conditionValue == null) return { text };
        return {
          // Through the same table: a condition is a measurement too, and
          // it used to print its unit raw.
          condition: `${formatNumber(measurement.conditionValue, locale)}${
            measurement.conditionUnit ? ` ${unitFor(measurement.conditionUnit, locale)}` : ""
          }`,
          text,
        };
      });

      // The same figure quoted for two conditions is two rows; the same
      // figure twice with no condition is one.
      const seen = new Set<string>();
      return parts.filter((part) => {
        const identity = `${part.condition ?? ""}|${part.text}`;
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      });
    }
  }
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
          measurement.conditionUnit ? ` ${unitFor(measurement.conditionUnit, locale)}` : ""
        }`;
        return `${body} (${condition})`;
      });

      // Deduplicate: a figure quoted once for two colour temperatures still
      // reads as two measurements, but two identical ones do not.
      return [...new Set(parts)].join(" / ");
    }
  }
}
