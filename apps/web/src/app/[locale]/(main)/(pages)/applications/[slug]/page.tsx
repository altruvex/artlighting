import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { JsonLd } from "@/components/editorial/json-ld";
import { PageHeader } from "@/components/editorial/page-header";
import { ProductRail } from "@/components/home/product-rail";
import { ProjectCard } from "@/components/project-card";
import { SECTION_FRAME, SectionLink } from "@/components/section-heading";
import { APPLICATIONS, applicationBySlug } from "@/content/applications";
import { SECTOR_COPY } from "@/content/company-copy";
import { guidesFor } from "@/content/guide";
import { pick } from "@/content/l10n";
import { FAMILY_INTRO, lightingType } from "@/content/lighting-types";
import { Link } from "@/i18n/navigation";
import { SECTORS } from "@/lib/company";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber, formatIndex } from "@/lib/numbers";
import { projectsFor } from "@/lib/projects";
import { applicationCards } from "@/lib/shop.server";
import { absoluteUrl, assetUrl } from "@/lib/site";
import { familySlug } from "@repo/catalog/families";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return APPLICATIONS.map((application) => ({ slug: application.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const application = applicationBySlug(awaited.slug);
  if (!application) return constructMetadata({ locale, noIndex: true });
  const t = await getTranslations({ locale, namespace: "applications" });
  return constructMetadata({
    locale,
    path: `/applications/${application.slug}`,
    title: t("detailMetaTitle", { name: pick(application.name, locale) }),
    description: pick(application.intro, locale).slice(0, 160),
    image: application.image,
  });
}

/**
 * One application: the space, what it needs, the lighting types that do
 * it, the products — then the projects and the guide articles behind it.
 * Problem, then solution, then product, in that order.
 */
export default async function ApplicationPage({ params }: Props) {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const application = applicationBySlug(awaited.slug);
  if (!application) notFound();

  const [t, tFamily, tGuide, products] = await Promise.all([
    getTranslations({ locale, namespace: "applications" }),
    getTranslations({ locale, namespace: "family" }),
    getTranslations({ locale, namespace: "guide" }),
    applicationCards({ families: application.families, types: application.types }, locale),
  ]);
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en");
  const name = pick(application.name, locale);

  // Only types and families with products in them right now.
  const typeRows = application.types
    .flatMap((id) => {
      const type = lightingType(id);
      const count = products.typeCounts[id] ?? 0;
      return type && count > 0 ? [{ key: id, name: pick(type.name, locale), purpose: pick(type.purpose, locale), count, href: `/products?family=${familySlug(type.family)}&type=${id}` }] : [];
    })
    .concat(
      (application.families ?? []).flatMap((family) => {
        const count = products.familyCounts[family] ?? 0;
        return count > 0
          ? [{ key: family, name: tFamily(family), purpose: pick(FAMILY_INTRO[family].body, locale).split(" — ")[0], count, href: `/products?family=${familySlug(family)}` }]
          : [];
      }),
    );

  const byId = new Map(projectsFor(locale).map((project) => [project.ProjectId, project]));
  const sectorProjects = application.sectors.flatMap((id) => SECTORS.find((sector) => sector.id === id)?.ids ?? []).flatMap((id) => byId.get(id) ?? []).slice(0, 4);
  const guides = guidesFor(application.guides);
  const index = APPLICATIONS.findIndex((entry) => entry.slug === application.slug);
  const next = APPLICATIONS[(index + 1) % APPLICATIONS.length];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name,
          description: pick(application.summary, locale),
          url: absoluteUrl(locale, `/applications/${application.slug}`),
          image: assetUrl(application.image),
          inLanguage: locale,
        }}
      />
      <PageHeader
        locale={locale}
        crumbs={[{ label: t("crumb"), href: "/applications" }, { label: name }]}
        eyebrow={t("eyebrow")}
        title={name}
        lede={<p>{pick(application.summary, locale)}</p>}
      />

      <figure className={SECTION_FRAME}>
        <div className="relative aspect-[16/9] overflow-hidden rounded-sm bg-muted lg:aspect-[21/9]">
          <Image
            src={application.image}
            alt={t("imageAlt", { name })}
            fill
            priority
            sizes="(min-width: 1536px) 1536px, 100vw"
            style={{ objectPosition: application.imagePosition }}
            className="object-cover"
          />
        </div>
      </figure>

      <section aria-labelledby="needs-heading" className={`${SECTION_FRAME} grid gap-10 py-20 lg:grid-cols-12 lg:gap-10 lg:py-28`}>
        <div className="lg:col-span-5">
          <p className="eyebrow">{t("needsEyebrow")}</p>
          <h2 id="needs-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
            {t("needsTitle")}
          </h2>
          <p className="lede mt-6">{pick(application.intro, locale)}</p>
        </div>
        <ol className="lg:col-span-6 lg:col-start-7">
          {application.needs.map((need, i) => (
            <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-t border-border py-7 last:border-b">
              <span className="index-numeral pt-1">{formatIndex(i + 1, locale)}</span>
              <div>
                <h3 className="text-[length:var(--text-lg)] font-semibold leading-snug">{pick(need.title, locale)}</h3>
                <p className="mt-2 text-pretty text-muted-foreground">{pick(need.body, locale)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {typeRows.length > 0 && (
        <section aria-labelledby="types-heading" className="border-t border-border bg-card/40">
          <div className={`${SECTION_FRAME} py-20 lg:py-28`}>
            <p className="eyebrow">{t("typesEyebrow")}</p>
            <h2 id="types-heading" className="mt-4 max-w-3xl text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
              {t("typesTitle")}
            </h2>
            <ul className="mt-12 border-t border-border">
              {typeRows.map((row) => (
                <li key={row.key} className="border-b border-border">
                  <Link href={row.href} className="group grid gap-2 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-center sm:gap-8">
                    <span className="text-[length:var(--text-lg)] font-semibold transition-colors duration-[var(--dur-hover)] group-hover:text-primary">{row.name}</span>
                    <span className="text-pretty text-muted-foreground">{row.purpose}</span>
                    <span className="inline-flex items-center gap-2 text-[length:var(--text-sm)] font-medium tabular-nums text-muted-foreground transition-colors duration-[var(--dur-hover)] group-hover:text-foreground">
                      {t("productCount", { count: row.count, formatted: n(row.count) })}
                      <Onward className="transition-transform duration-[var(--dur-hover)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <ProductRail id="application-products" title={t("productsTitle")} subtitle={t("productsSub", { name })} products={products.cards} locale={locale} />

      {sectorProjects.length > 0 && (
        <section aria-labelledby="sector-projects-heading" className={`${SECTION_FRAME} border-t border-border py-20 lg:py-28`}>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{application.sectors.map((id) => pick(SECTOR_COPY[id], locale)).join(" · ")}</p>
              <h2 id="sector-projects-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
                {t("projectsTitle")}
              </h2>
            </div>
            <SectionLink href="/all-projects">{t("allProjects")}</SectionLink>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sectorProjects.map((project) => (
              <li key={project.ProjectId}>
                <ProjectCard project={project} className="h-full min-h-72" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {guides.length > 0 && (
        <section aria-labelledby="app-guides-heading" className={`${SECTION_FRAME} border-t border-border py-20 lg:py-28`}>
          <p className="eyebrow">{tGuide("eyebrow")}</p>
          <h2 id="app-guides-heading" className="mt-4 text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
            {t("guidesTitle")}
          </h2>
          <ul className="mt-8 grid border-t border-border sm:grid-cols-2">
            {guides.map((article, i) => (
              <li key={article.slug} className={`border-b border-border ${i % 2 === 1 ? "sm:border-s sm:ps-8" : "sm:pe-8"}`}>
                <Link href={`/lighting-guide/${article.slug}`} className="group flex items-start justify-between gap-6 py-6">
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug transition-colors duration-[var(--dur-hover)] group-hover:text-primary">{pick(article.title, locale)}</span>
                    <span className="mt-1.5 block text-pretty text-[length:var(--text-sm)] text-muted-foreground">{pick(article.summary, locale)}</span>
                  </span>
                  <Onward className="mt-1 text-muted-foreground transition-[transform,color] duration-[var(--dur-hover)] group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label={t("nextLabel")} className={`${SECTION_FRAME} border-t border-border`}>
        <Link href={`/applications/${next.slug}`} className="group flex items-center justify-between gap-6 py-10">
          <span>
            <span className="eyebrow block">{t("next")}</span>
            <span className="mt-2 block font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-semibold leading-tight text-balance transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
              {pick(next.name, locale)}
            </span>
          </span>
          <Onward className="size-6 transition-transform duration-[var(--dur-hover)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </nav>

      <ClosingCta locale={locale} />
    </>
  );
}
