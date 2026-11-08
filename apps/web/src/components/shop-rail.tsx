import { ProductRail } from "@/components/home/product-rail";
import { applicationCards, homeData } from "@/lib/shop.server";
import type { ProductFamily } from "@repo/catalog/families";

/**
 * A product rail for pages that are not about the catalogue: it loads its
 * own cards, so the page around it renders first and wraps this in
 * `<Suspense fallback={null}>`. Cards of the given types or families when
 * there are any; otherwise the featured products, under the fallback title
 * when one is given (so the heading never claims a match that was not made).
 */
export async function ShopRail({
  id,
  locale,
  types = [],
  families = [],
  title,
  subtitle,
  href = "/products",
  hrefLabel,
  fallback,
}: {
  id: string;
  locale: string;
  types?: string[];
  families?: ProductFamily[];
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel: string;
  fallback?: { title: string; subtitle?: string };
}) {
  const matched = types.length + families.length > 0 ? (await applicationCards({ families, types }, locale, 10)).cards : [];
  const usingMatch = matched.length > 0 || types.length + families.length === 0;
  const products = matched.length > 0 ? matched : (await homeData(locale)).featured;
  const heading = usingMatch || !fallback ? { title, subtitle } : fallback;
  return (
    <ProductRail
      id={id}
      title={heading.title}
      subtitle={heading.subtitle}
      href={usingMatch ? href : "/products"}
      hrefLabel={hrefLabel}
      products={products}
      locale={locale}
    />
  );
}
