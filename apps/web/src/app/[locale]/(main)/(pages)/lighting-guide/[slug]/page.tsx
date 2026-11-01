import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { JsonLd } from "@/components/editorial/json-ld";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { applicationBySlug } from "@/content/applications";
import { GUIDE, guideBySlug, type GuideBlock } from "@/content/guide";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber } from "@/lib/numbers";
import { absoluteUrl, ORGANIZATION_ID } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return GUIDE.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const article = guideBySlug(awaited.slug);
  if (!article) return constructMetadata({ locale, noIndex: true });
  const t = await getTranslations({ locale, namespace: "guide" });
  return constructMetadata({
    locale,
    path: `/lighting-guide/${article.slug}`,
    title: t("articleMetaTitle", { title: pick(article.title, locale) }),
    description: pick(article.summary, locale),
  });
}

/**
 * One guide article: a document, with its contents beside it on a wide
 * screen. Set in the same `.doc` measure the policies use.
 */
export default async function GuideArticlePage({ params }: Props) {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const article = guideBySlug(awaited.slug);
  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: "guide" });
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");
  const title = pick(article.title, locale);
  const headings = article.body.flatMap((block) => (block.kind === "h2" ? [block] : []));
  const applications = article.related.applications.flatMap((slug) => applicationBySlug(slug) ?? []);
  const index = GUIDE.findIndex((entry) => entry.slug === article.slug);
  const next = GUIDE[(index + 1) % GUIDE.length];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description: pick(article.summary, locale),
          inLanguage: locale,
          url: absoluteUrl(locale, `/lighting-guide/${article.slug}`),
          author: { "@id": ORGANIZATION_ID },
          publisher: { "@id": ORGANIZATION_ID },
        }}
      />
      <PageHeader
        locale={locale}
        crumbs={[{ label: t("crumb"), href: "/lighting-guide" }, { label: title }]}
        eyebrow={t("eyebrow")}
        title={title}
        lede={
          <p>
            {pick(article.summary, locale)}
            <span className="mt-3 block text-[length:var(--text-sm)] text-muted-foreground tabular-nums">
              {t("minutes", { count: article.minutes, formatted: n(article.minutes) })}
            </span>
          </p>
        }
      />

      <div className={`${SECTION_FRAME} grid gap-12 pb-20 lg:grid-cols-12 lg:gap-10 lg:pb-28`}>
        {headings.length > 1 && (
          <nav aria-label={t("contents")} className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow mb-4">{t("contents")}</p>
              <ol className="space-y-2.5 border-s border-border ps-4 text-[length:var(--text-sm)]">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`} className="text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground">
                      {pick(heading.text, locale)}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        )}
        <article className={`doc min-w-0 ${headings.length > 1 ? "lg:col-span-8 lg:col-start-5" : "lg:col-span-8"}`}>
          {article.body.map((block, i) => (
            <Block key={i} block={block} locale={locale} />
          ))}
        </article>
      </div>

      {applications.length > 0 && (
        <section aria-labelledby="guide-apps-heading" className={`${SECTION_FRAME} border-t border-border py-16 lg:py-20`}>
          <h2 id="guide-apps-heading" className="eyebrow">{t("applyIt")}</h2>
          <ul className="mt-6 grid border-t border-border sm:grid-cols-2">
            {applications.map((application, i) => (
              <li key={application.slug} className={`border-b border-border ${i % 2 === 1 ? "sm:border-s sm:ps-8" : "sm:pe-8"}`}>
                <Link href={`/applications/${application.slug}`} className="group flex items-start justify-between gap-6 py-6">
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug transition-colors duration-[var(--dur-hover)] group-hover:text-primary">{pick(application.name, locale)}</span>
                    <span className="mt-1.5 block text-pretty text-[length:var(--text-sm)] text-muted-foreground">{pick(application.summary, locale)}</span>
                  </span>
                  <Onward className="mt-1 text-muted-foreground transition-[transform,color] duration-[var(--dur-hover)] group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label={t("nextLabel")} className={`${SECTION_FRAME} border-t border-border`}>
        <Link href={`/lighting-guide/${next.slug}`} className="group flex items-center justify-between gap-6 py-10">
          <span>
            <span className="eyebrow block">{t("next")}</span>
            <span className="mt-2 block font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-semibold leading-tight text-balance transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
              {pick(next.title, locale)}
            </span>
          </span>
          <Onward className="size-6 transition-transform duration-[var(--dur-hover)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </nav>

      <ClosingCta locale={locale} />
    </>
  );
}

function Block({ block, locale }: { block: GuideBlock; locale: string }) {
  switch (block.kind) {
    case "p":
      return <p>{pick(block.text, locale)}</p>;
    case "h2":
      return <h2 id={block.id}>{pick(block.text, locale)}</h2>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item.en}>{pick(item, locale)}</li>
          ))}
        </ul>
      );
    case "callout":
      return <p className="callout">{pick(block.text, locale)}</p>;
    case "table":
      return (
        // A spec table must stay readable on a phone: it scrolls sideways
        // inside its own frame rather than squeezing three columns to 100px.
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="min-w-[32rem]">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell.en} scope="col">{pick(cell, locale)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) =>
                    c === 0 ? (
                      <th key={c} scope="row" className="!text-[length:var(--text-sm)] !font-semibold !text-foreground !tracking-normal">
                        <bdi>{pick(cell, locale)}</bdi>
                      </th>
                    ) : (
                      <td key={c}>{pick(cell, locale)}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
