import { Link } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { SECTION_FRAME } from "@/components/section-heading";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { JsonLd } from "./json-ld";

export type Crumb = { label: string; href?: string };

/**
 * The trail from home to this page, visible and as structured data.
 *
 * The old breadcrumb printed URL slugs ("all-projects", "mister-led"),
 * linked through the non-locale router, and was hidden on every Arabic
 * page. This one takes real labels, keeps the locale, and reads the same
 * way in both directions.
 */
export async function Breadcrumbs({ locale, items, className }: { locale: string; items: Crumb[]; className?: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const trail: Crumb[] = [{ label: t("home"), href: "/" }, ...items];

  return (
    <>
      <nav aria-label={t("breadcrumb")} className={cn("text-[length:var(--text-xs)] text-muted-foreground", className)}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="transition-colors duration-[var(--dur-hover)] hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={last ? "text-foreground" : undefined}>
                    {crumb.label}
                  </span>
                )}
                {!last && <span aria-hidden className="text-border">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.label,
            ...(crumb.href ? { item: absoluteUrl(locale, crumb.href) } : {}),
          })),
        }}
      />
    </>
  );
}

/**
 * How every company page opens: where you are, what the page is, and one
 * paragraph on why it matters. No box around it, no background — the page
 * starts with type on the ground, the way a printed document does.
 */
export async function PageHeader({
  locale,
  crumbs,
  eyebrow,
  title,
  lede,
  aside,
  className,
}: {
  locale: string;
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(SECTION_FRAME, "pt-8 pb-12 lg:pt-10 lg:pb-16", className)}>
      <Breadcrumbs locale={locale} items={crumbs} />
      <div className="mt-10 grid gap-8 border-b border-border pb-12 lg:mt-16 lg:grid-cols-12 lg:gap-10 lg:pb-16">
        <div className="lg:col-span-8">
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h1 className="text-[length:var(--text-4xl)] font-medium leading-[1.05] ltr:tracking-tight rtl:leading-[1.3]">{title}</h1>
          {lede && <div className="lede mt-6 max-w-2xl">{lede}</div>}
        </div>
        {aside && <div className="lg:col-span-4 lg:self-end">{aside}</div>}
      </div>
    </header>
  );
}
