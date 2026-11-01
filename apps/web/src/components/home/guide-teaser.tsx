import { Onward } from "@/components/editorial/arrow";
import { SECTION_FRAME, SectionLink } from "@/components/section-heading";
import { GUIDE } from "@/content/guide";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/numbers";
import { getTranslations } from "next-intl/server";

/**
 * The lighting guide, surfaced: the figures on a spec sheet, explained. A
 * contents list, not a blog grid — the titles are the point.
 */
export async function GuideTeaser({ locale, limit = 4, exclude }: { locale: string; limit?: number; exclude?: string }) {
  const t = await getTranslations({ locale, namespace: "guide" });
  const articles = GUIDE.filter((article) => article.slug !== exclude).slice(0, limit);

  return (
    <section aria-labelledby="guide-teaser-heading" className={`${SECTION_FRAME} py-20 lg:py-28`}>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="guide-teaser-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
            {t("teaserTitle")}
          </h2>
        </div>
        <SectionLink href="/lighting-guide">{t("all")}</SectionLink>
      </div>
      <ul className="grid sm:grid-cols-2">
        {articles.map((article, index) => (
          <li key={article.slug} className={`border-b border-border ${index % 2 === 1 ? "sm:border-s sm:ps-8" : "sm:pe-8"}`}>
            <Link href={`/lighting-guide/${article.slug}`} className="group flex h-full items-start justify-between gap-6 py-7">
              <span className="min-w-0">
                <span className="block text-[length:var(--text-lg)] font-semibold leading-snug transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
                  {pick(article.title, locale)}
                </span>
                <span className="mt-2 block text-[length:var(--text-sm)] text-muted-foreground">{pick(article.summary, locale)}</span>
                <span className="mt-3 block text-[length:var(--text-xs)] text-muted-foreground tabular-nums">
                  {t("minutes", { count: article.minutes, formatted: formatNumber(article.minutes, locale === "ar" ? "ar" : "en") })}
                </span>
              </span>
              <Onward className="mt-1.5 text-muted-foreground transition-[transform,color] duration-[var(--dur-hover)] group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
