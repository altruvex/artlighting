import { formatSpecValue, specValueParts } from "@repo/catalog/spec-format";
import { layoutFieldFor } from "@repo/catalog/spec-layout";
import { serializeMoney } from "@repo/money";
import type { LocalizedSpecGroup } from "./specs-view";

type DecimalValue = Parameters<typeof serializeMoney>[0];
export interface RawSpecGroup {
  translations: { language: string; name: string }[];
  items: {
    key: string | null;
    kind: string;
    unit: string | null;
    comparator: string;
    measurements: {
      value: DecimalValue;
      valueMax: DecimalValue | null;
      conditionValue: DecimalValue | null;
      conditionUnit: string | null;
    }[];
    option: {
      key?: string;
      translations: { language: string; label: string }[];
    } | null;
    translations: { language: string; label: string; value: string | null }[];
  }[];
}

/** A missing translation must never hide a stored specification. */
function translated<T extends { language: string }>(
  rows: T[],
  locale: string,
  value: (row: T) => string | null,
): string | undefined {
  const usable = (row: T) => {
    const text = value(row)?.trim();
    return text && text !== "—" ? text : undefined;
  };
  return (
    rows
      .filter((row) => row.language === locale)
      .map(usable)
      .find(Boolean) ??
    rows
      .filter((row) => row.language === "en")
      .map(usable)
      .find(Boolean) ??
    rows.map(usable).find(Boolean)
  );
}

export function localizeSpecGroups(
  groups: RawSpecGroup[],
  locale: string,
): LocalizedSpecGroup[] {
  const language = locale.startsWith("ar") ? "ar" : "en";
  return groups
    .map((group) => {
      const layout = group.items
        .map((item) => layoutFieldFor(item.key))
        .find(Boolean);
      return {
        name:
          translated(group.translations, language, (row) => row.name) ??
          layout?.group[language] ??
          (language === "ar" ? "مواصفات إضافية" : "Additional specifications"),
        items: group.items
          .map((item) => {
            const field = layoutFieldFor(item.key)?.field;
            // Specifications use Decimal(14,4), not money's two decimal places.
            const measurements = item.measurements.map((m) => ({
              value: serializeMoney(m.value, 4),
              valueMax:
                m.valueMax == null ? null : serializeMoney(m.valueMax, 4),
              conditionValue:
                m.conditionValue == null
                  ? null
                  : serializeMoney(m.conditionValue, 4),
              conditionUnit: m.conditionUnit,
            }));
            const display = {
              kind: item.kind as Parameters<typeof formatSpecValue>[0]["kind"],
              unit: item.unit,
              comparator: item.comparator as Parameters<
                typeof formatSpecValue
              >[0]["comparator"],
              measurements,
              optionLabel:
                translated(
                  item.option?.translations ?? [],
                  language,
                  (row) => row.label,
                ) ??
                item.option?.key ??
                null,
              text:
                translated(item.translations, language, (row) => row.value) ??
                null,
            };
            return {
              key: item.key,
              label:
                translated(item.translations, language, (row) => row.label) ??
                field?.[language] ??
                item.key ??
                (language === "ar" ? "مواصفة" : "Specification"),
              numeric: measurements[0] ? Number(measurements[0].value) : null,
              value: formatSpecValue(display, locale),
              parts: specValueParts(display, locale),
            };
          })
          .filter((item) => Boolean(item.value?.trim()) && item.value !== "—"),
      };
    })
    .filter((group) => group.items.length > 0);
}
