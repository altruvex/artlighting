import { formatNumber } from "@/lib/numbers";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * A failed checkout action, in words. Shared by the cart, the address step
 * and the review, so "out of stock" names the product and what is left in
 * all three rather than in whichever one remembered to pass the details.
 */
export function orderErrorText(
  t: Translate,
  locale: string,
  result: { error: string; detail?: { product: string; available: number } },
): string {
  if (result.error === "out_of_stock" && result.detail) {
    return t("errors.out_of_stock", {
      product: result.detail.product,
      available: formatNumber(result.detail.available, locale === "ar" ? "ar" : "en"),
    });
  }
  return t(`errors.${result.error}`);
}
