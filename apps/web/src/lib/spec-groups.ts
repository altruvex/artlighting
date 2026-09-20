import "server-only";
import { formatSpecValue } from "@repo/catalog";
import { serializeMoney } from "@repo/money";
import type { LocalizedSpecGroup } from "@/lib/specs-view";

export type { LocalizedSpecGroup, LocalizedSpecItem } from "@/lib/specs-view";
export { specNumbersByKey, specsByKey } from "@/lib/specs-view";

/**
 * Reading the structured specs (SpecGroup / SpecItem) for one locale.
 *
 * The page used to build this table by hand, with the label for every row
 * written out twice — once in English and once in Arabic — and the value
 * taken from whichever of the two ProductSpecification rows matched the
 * locale. That is why the Arabic could claim a different luminous flux from
 * the English. Here the number comes from one place and is only rendered
 * per locale.
 */

/** The Prisma select the spec-reading queries share. */
export function specGroupSelect(language: string) {
  return {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      translations: { where: { language }, select: { name: true }, take: 1 },
      items: {
        orderBy: { position: "asc" as const },
        select: {
          key: true,
          kind: true,
          unit: true,
          comparator: true,
          measurements: {
            orderBy: { position: "asc" as const },
            select: { value: true, valueMax: true, conditionValue: true, conditionUnit: true },
          },
          option: { select: { translations: { where: { language }, select: { label: true }, take: 1 } } },
          translations: { where: { language }, select: { label: true, value: true }, take: 1 },
        },
      },
    },
  };
}

type Decimalish = { toFixed: (places: number) => string };

interface RawSpecGroup {
  translations: { name: string }[];
  items: {
    key: string | null;
    kind: string;
    unit: string | null;
    comparator: string;
    measurements: {
      value: Decimalish;
      valueMax: Decimalish | null;
      conditionValue: Decimalish | null;
      conditionUnit: string | null;
    }[];
    option: { translations: { label: string }[] } | null;
    translations: { label: string; value: string | null }[];
  }[];
}

export function localizeSpecGroups(groups: RawSpecGroup[], locale: string): LocalizedSpecGroup[] {
  return groups
    .map((group) => ({
      name: group.translations[0]?.name ?? "",
      items: group.items
        .map((item) => ({
          key: item.key,
          label: item.translations[0]?.label ?? "",
          // The stored number, untouched by locale formatting.
          numeric: item.measurements[0]
            ? Number(serializeMoney(item.measurements[0].value as never))
            : null,
          value: formatSpecValue(
            {
              kind: item.kind as never,
              unit: item.unit,
              comparator: item.comparator as never,
              // Decimals are serialized here, at the boundary, like all
              // other numbers leaving the server (see @repo/money).
              measurements: item.measurements.map((measurement) => ({
                value: serializeMoney(measurement.value as never),
                valueMax: measurement.valueMax ? serializeMoney(measurement.valueMax as never) : null,
                conditionValue: measurement.conditionValue
                  ? serializeMoney(measurement.conditionValue as never)
                  : null,
                conditionUnit: measurement.conditionUnit,
              })),
              optionLabel: item.option?.translations[0]?.label ?? null,
              text: item.translations[0]?.value ?? null,
            },
            locale,
          ),
        }))
        .filter((item) => item.label !== "" && item.value !== "—"),
    }))
    .filter((group) => group.name !== "" && group.items.length > 0);
}

