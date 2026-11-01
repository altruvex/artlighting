import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/numbers";
import { useMemo } from "react";
import { describeProduct, type DescribableProduct } from "@repo/catalog/describe";
import { specsByKey, type LocalizedSpecGroup } from "@/lib/specs-view";

/**
 * The generated description, rendered for the current locale.
 *
 * The join and the full stop come from the messages too: Arabic separates
 * with "، " and English with ", ", and hard-coding either would put the
 * wrong comma in one of them.
 */
export function useProductDescription(
  product: Omit<DescribableProduct, "specs"> & { specGroups?: LocalizedSpecGroup[] },
  detail: "short" | "full" = "short",
): string {
  const t = useTranslations("product-description");
  const locale = useLocale();

  return useMemo(() => {
    const clauses = describeProduct(
      { ...product, specs: specsByKey(product.specGroups ?? []) },
      detail,
    )
      .map((clause) => {
        if (!clause.params) return clause;
        // A raw number renders in Western digits beside spec values the
        // formatter already put in Arabic-Indic ones. The number itself
        // still goes through for the plural category; the text is what the
        // sentence shows.
        const params: Record<string, string | number> = { ...clause.params };
        for (const [name, value] of Object.entries(clause.params)) {
          if (typeof value === "number") {
            params[`${name}Text`] = formatNumber(value, locale === "ar" ? "ar" : "en");
          }
        }
        return { ...clause, params };
      })
      .map((clause) =>
      // A product whose lighting type never loaded would open with a blank
      // where its name goes. A generic noun is better than "An indoor .".
      clause.params && "type" in clause.params && !String(clause.params.type).trim()
        ? { ...clause, params: { ...clause.params, type: t("fixture") } }
        : clause,
    );
    if (clauses.length === 0) return "";
    const rendered = clauses
      .map((clause) => t(clause.key, clause.params).trim())
      .filter(Boolean);
    if (rendered.length === 0) return "";
    return rendered.join(t("join")) + t("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, detail, t, locale]);
}
