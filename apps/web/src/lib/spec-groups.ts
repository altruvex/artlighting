import "server-only";
export { localizeSpecGroups } from "./spec-localize";

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
export function specGroupSelect(_language: string) {
  return {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      translations: { select: { language: true, name: true } },
      items: {
        orderBy: { position: "asc" as const },
        select: {
          key: true,
          kind: true,
          unit: true,
          comparator: true,
          measurements: {
            orderBy: { position: "asc" as const },
            select: {
              value: true,
              valueMax: true,
              conditionValue: true,
              conditionUnit: true,
            },
          },
          option: {
            select: {
              key: true,
              translations: { select: { language: true, label: true } },
            },
          },
          translations: {
            select: { language: true, label: true, value: true },
          },
        },
      },
    },
  };
}
