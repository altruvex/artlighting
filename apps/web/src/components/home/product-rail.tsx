import ProductCard from "@/components/product-card/product-card";
import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import type { ReactNode } from "react";
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
  id,
  title,
  subtitle,
  href,
  hrefLabel,
  action,
  products,
  locale,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  /** In place of the link — the recently-viewed rail's "clear". */
  action?: ReactNode;
  products: ShopCard[];
  locale: string;
}) {
  if (products.length === 0) return null;

  const headingId = `rail-${id ?? title.replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId} className="py-12 lg:py-16">
      <SectionHeading
        id={headingId}
        title={title}
        subtitle={subtitle}
        href={href}
        hrefLabel={hrefLabel}
        action={action}
        className={SECTION_FRAME}
      />
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
