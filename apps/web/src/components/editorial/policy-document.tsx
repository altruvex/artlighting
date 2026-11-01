import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { Link } from "@/i18n/navigation";
import { POLICIES } from "@/lib/company";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/numbers";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export type PolicySection = { id: string; title: string; body: ReactNode };

/**
 * A store policy, set as a document.
 *
 * No hero, no image, no cards: a title, a numbered table of contents that
 * follows the reader on a wide screen, and the text at a reading measure.
 * The other policies are listed at the foot, so the set reads as one
 * document of the company rather than pages added one at a time.
 */
export async function PolicyDocument({
  locale,
  id,
  title,
  lede,
  sections,
}: {
  locale: string;
  id: (typeof POLICIES)[number]["id"];
  title: string;
  lede?: string;
  sections: PolicySection[];
}) {
  const t = await getTranslations({ locale, namespace: "policies" });

  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: t("crumb") }, { label: title }]} eyebrow={t("eyebrow")} title={title} lede={lede ? <p>{lede}</p> : undefined} />
      <div className={`${SECTION_FRAME} grid gap-12 pb-20 lg:grid-cols-12 lg:gap-10 lg:pb-28`}>
        <nav aria-label={t("contents")} className="lg:col-span-3">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow mb-4">{t("contents")}</p>
            <ol className="space-y-2.5 border-s border-border ps-4 text-[length:var(--text-sm)]">
              {sections.map((section, index) => (
                <li key={section.id} className="flex gap-2">
                  <span className="index-numeral">{formatNumber(index + 1, locale === "ar" ? "ar" : "en")}.</span>
                  <a href={`#${section.id}`} className="text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <article className="doc min-w-0 lg:col-span-8 lg:col-start-5">
          {sections.map((section, index) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className={cn(index === 0 && "!mt-0")}>
                <span className="index-numeral me-3 !text-[length:var(--text-base)]">{formatNumber(index + 1, locale === "ar" ? "ar" : "en")}.</span>
                {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </article>
      </div>
      <nav aria-label={t("others")} className={`${SECTION_FRAME} border-t border-border py-10`}>
        <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[length:var(--text-sm)]">
          <li className="font-semibold">{t("others")}</li>
          {POLICIES.filter((policy) => policy.id !== id).map((policy) => (
            <li key={policy.id}>
              <Link href={policy.href} className="text-muted-foreground underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline">
                {t(`names.${policy.id}`)}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/faqs" className="text-muted-foreground underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline">
              {t("faq")}
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
