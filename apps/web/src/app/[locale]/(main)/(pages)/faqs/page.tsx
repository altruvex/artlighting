import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { JsonLd } from "@/components/editorial/json-ld";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { FAQ } from "@/content/faq";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "faq" });
  return constructMetadata({ locale, path: "/faqs", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * Questions, grouped, each one a native disclosure — it opens without
 * JavaScript, is searchable with the browser's find, and is announced as a
 * button by a screen reader.
 */
export default async function FaqPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "faq" });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.flatMap((group) =>
            group.items.map((item) => ({
              "@type": "Question",
              name: pick(item.q, locale),
              acceptedAnswer: { "@type": "Answer", text: pick(item.a, locale) },
            })),
          ),
        }}
      />
      <PageHeader locale={locale} crumbs={[{ label: t("crumb") }]} eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("description")}</p>} />
      <div className={`${SECTION_FRAME} grid gap-12 pb-20 lg:grid-cols-12 lg:gap-10 lg:pb-28`}>
        {/* Set like the contents of a policy or a guide article, so the
            three kinds of long page read as one set. */}
        <nav aria-label={t("groups")} className="lg:col-span-3">
          <div className="lg:sticky lg:top-28">
            <p aria-hidden className="eyebrow mb-4">{t("groups")}</p>
            <ol className="space-y-2.5 border-s border-border ps-4 text-[length:var(--text-sm)]">
              {FAQ.map((group) => (
                <li key={group.id}>
                  <a href={`#${group.id}`} className="text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground">
                    {pick(group.title, locale)}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <div className="space-y-16 lg:col-span-8 lg:col-start-5">
          {FAQ.map((group) => (
            <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="scroll-mt-28">
              <h2 id={`${group.id}-heading`} className="text-[length:var(--text-2xl)] font-medium leading-tight ltr:tracking-tight">
                {pick(group.title, locale)}
              </h2>
              <div className="mt-6 border-t border-border">
                {group.items.map((item) => (
                  <details key={item.q.en} className="group border-b border-border">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 font-semibold transition-colors duration-[var(--dur-hover)] hover:text-primary [&::-webkit-details-marker]:hidden">
                      {pick(item.q, locale)}
                      <PlusIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--dur-pop)] ease-[var(--ease-out)] group-open:rotate-45" aria-hidden />
                    </summary>
                    <div className="max-w-prose pb-6 text-pretty text-muted-foreground">
                      <p>{pick(item.a, locale)}</p>
                      {item.link && (
                        <Link href={item.link.href} className="mt-3 inline-flex items-center gap-2 font-medium text-foreground underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline">
                          {pick(item.link.label, locale)}
                          <Onward />
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <ClosingCta locale={locale} />
    </>
  );
}
