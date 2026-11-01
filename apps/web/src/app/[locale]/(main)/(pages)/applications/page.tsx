import { ClosingCta } from "@/components/closing-cta";
import { formatIndex } from "@/lib/numbers";
import { Onward } from "@/components/editorial/arrow";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { APPLICATIONS } from "@/content/applications";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "applications" });
  return constructMetadata({ locale, path: "/applications", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * Every application, image first. A photograph of the space and its name
 * beneath it — set into the grid like plates in a book, not boxed as cards.
 */
export default async function ApplicationsPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "applications" });

  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: t("crumb") }]} eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("lede")}</p>} />
      <section aria-label={t("crumb")} className={`${SECTION_FRAME} pb-20 lg:pb-28`}>
        <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {APPLICATIONS.map((application, index) => (
            <li key={application.slug} className={index === 0 ? "sm:col-span-2" : undefined}>
              <Link href={`/applications/${application.slug}`} className="group block">
                <div className={`relative overflow-hidden rounded-sm bg-muted ${index === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
                  <Image
                    src={application.image}
                    alt=""
                    fill
                    sizes={index === 0 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                    style={{ objectPosition: application.imagePosition }}
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-5 flex items-start justify-between gap-4 border-t border-border pt-4">
                  <div>
                    <span className="index-numeral">{formatIndex(index + 1, locale)}</span>
                    <h2 className="mt-2 text-[length:var(--text-xl)] font-medium leading-snug transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
                      {pick(application.name, locale)}
                    </h2>
                    <p className="mt-2 max-w-md text-pretty text-muted-foreground">{pick(application.summary, locale)}</p>
                  </div>
                  <Onward className="mt-8 text-muted-foreground transition-[transform,color] duration-[var(--dur-hover)] group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ClosingCta locale={locale} />
    </>
  );
}
