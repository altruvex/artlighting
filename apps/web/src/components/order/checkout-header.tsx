import { SECTION_FRAME } from "@/components/section-heading";
import type { ReactNode } from "react";

/**
 * How each checkout step opens — the same eyebrow, display title and lede
 * as every company page, so paying does not feel like leaving the site.
 */
export function CheckoutHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: ReactNode }) {
  return (
    <header className={`${SECTION_FRAME} pt-10 pb-8 lg:pt-14 lg:pb-10`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">{title}</h1>
      {lede && <div className="lede mt-3 max-w-2xl !text-[length:var(--text-base)]">{lede}</div>}
    </header>
  );
}

/** The two-column body every step shares: the content, and the summary beside it. */
export const CHECKOUT_GRID = `${SECTION_FRAME} grid items-start gap-10 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14 lg:pb-28`;
