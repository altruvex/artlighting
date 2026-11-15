import { RailScroller } from "./rail-scroller";
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
    <section
      aria-labelledby={headingId}
      className="border-t border-border/60 py-10 lg:py-14"
    >
      <SectionHeading
        id={headingId}
        title={title}
        subtitle={subtitle}
        href={href}
        hrefLabel={hrefLabel}
        action={action}
        className={SECTION_FRAME}
      />
      <RailScroller locale={locale} label={title}>
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[46%] shrink-0 snap-start sm:w-[calc((100%_-_2.5rem)/3)] lg:w-[calc((100%_-_3.75rem)/4)] xl:w-[calc((100%_-_5rem)/5)]"
          >
            <ProductCard product={product} locale={locale} />
          </li>
        ))}
      </RailScroller>
    </section>
  );
}
