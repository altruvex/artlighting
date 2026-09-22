import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The one heading every storefront section opens with.
 *
 * The home rails, the category tiles and the product page each titled
 * their sections their own way — text-2xl here, text-xl semibold there,
 * "Features :" with a colon on the product page — so the site read as
 * several sites. A section is an eyebrow, a title, an optional line under
 * it, and at most one way onward, always in the same place.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  href,
  hrefLabel,
  action,
  className,
}: {
  /** Pass it and point the section's aria-labelledby at it. */
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  /** Instead of a link — a button, say. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-end justify-between gap-4 lg:mb-8", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        )}
        <h2
          id={id}
          className="font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-semibold leading-tight tracking-tight text-balance"
        >
          {title}
        </h2>
        {subtitle && <p className="max-w-prose text-pretty text-muted-foreground">{subtitle}</p>}
      </div>
      {href && hrefLabel ? <SectionLink href={href}>{hrefLabel}</SectionLink> : action}
    </header>
  );
}

/** "See all" — the way onward from a section. */
export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group/link inline-flex shrink-0 items-center gap-1.5 rounded-md text-[length:var(--text-sm)] font-medium text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight
        className="size-4 transition-transform duration-[var(--dur-hover)] ease-[var(--ease-out)] group-hover/link:translate-x-0.5 rtl:hidden"
        aria-hidden
      />
      <ArrowLeft
        className="hidden size-4 transition-transform duration-[var(--dur-hover)] ease-[var(--ease-out)] group-hover/link:-translate-x-0.5 rtl:block"
        aria-hidden
      />
    </Link>
  );
}

/** The width and gutters every full-width storefront section shares. */
export const SECTION_FRAME = "mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-10";
