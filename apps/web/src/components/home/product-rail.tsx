import ProductCard from "@/components/product-card/product-card";
import { Link } from "@/i18n/navigation";
import type { ShopCard } from "@/lib/shop.server";

/**
 * A titled row of products that scrolls sideways.
 *
 * Native horizontal scroll with snap points — the browser's own scrolling,
 * not a carousel library taking the wheel over. A phone swipes it, a
 * trackpad pans it, a keyboard tabs through it, and the next card peeking
 * in at the edge is the cue that there is more.
 */
export function ProductRail({
  title,
  subtitle,
  href,
  hrefLabel,
  products,
  locale,
}: {
  title: string;
  subtitle?: string;
  href: string;
  hrefLabel: string;
  products: ShopCard[];
  locale: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-12 lg:py-16">
      <header className="mx-auto mb-6 flex max-w-screen-2xl items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="min-w-0 space-y-1">
          <h2 className="text-[length:var(--text-2xl)]">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <Link
          href={href}
          className="shrink-0 text-[length:var(--text-sm)] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {hrefLabel}
        </Link>
      </header>
      <ul
        className="mx-auto flex max-w-screen-2xl snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 sm:gap-6 sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10"
      >
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[22%] xl:w-[18.5%]"
          >
            <ProductCard product={product} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
