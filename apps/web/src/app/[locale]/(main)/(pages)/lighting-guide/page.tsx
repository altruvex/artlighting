import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { GUIDE } from "@/content/guide";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber, formatIndex } from "@/lib/numbers";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "guide" });
  return constructMetadata({ locale, path: "/lighting-guide", title: t("metaTitle"), description: t("metaDescription") });
}

/** The guide's contents page. */
export default async function GuidePage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "guide" });
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");

  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: t("crumb") }]} eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("lede")}</p>} />
      <section aria-label={t("contents")} className={`${SECTION_FRAME} pb-20 lg:pb-28`}>
        <ol className="border-t border-border">
          {GUIDE.map((article, index) => (
            <li key={article.slug} className="border-b border-border">
              <Link
                href={`/lighting-guide/${article.slug}`}
                className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-4 py-8 sm:grid-cols-[4rem_minmax(0,2fr)_minmax(0,3fr)_auto] sm:gap-8"
              >
                <span className="index-numeral pt-1.5">{formatIndex(index + 1, locale)}</span>
                <h2 className="text-[length:var(--text-xl)] font-medium leading-snug transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
                  {pick(article.title, locale)}
                </h2>
                <p className="col-start-2 text-pretty text-muted-foreground sm:col-start-auto sm:pt-1">
                  {pick(article.summary, locale)}
                  <span className="mt-2 block text-[length:var(--text-xs)] tabular-nums">
                    {t("minutes", { count: article.minutes, formatted: n(article.minutes) })}
                  </span>
                </p>
                <Onward className="row-start-1 mt-2 text-muted-foreground transition-[transform,color] duration-[var(--dur-hover)] group-hover:translate-x-1 group-hover:text-primary sm:row-start-auto rtl:group-hover:-translate-x-1" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <ClosingCta locale={locale} />
    </>
  );
}
