import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { PageHeader } from "@/components/editorial/page-header";
import { SECTION_FRAME } from "@/components/section-heading";
import { AUDIENCES, MILESTONE_COPY, POSITIONING, PRINCIPLES, PROFILE_PROJECTS, SECTOR_COPY } from "@/content/company-copy";
import { pick } from "@/content/l10n";
import { Link } from "@/i18n/navigation";
import { BRANDS, DOCUMENTS, MILESTONES, SECTORS } from "@/lib/company";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatYear, formatIndex } from "@/lib/numbers";
import { projectsFor } from "@/lib/projects";
import { PagePropsTypes } from "@/types";
import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "about" });
  return constructMetadata({ locale, path: "/about-us", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * The company profile, as a page.
 *
 * The page it replaces opened on the words ART LIGHTING scaled with GSAP
 * over a stock warehouse photograph, counted up to "87 happy customers",
 * charted a sales percentage that no document records, and said the
 * mission was "to recognize the world about the actual lighting". Every
 * statement here now comes from the company profile, and the approvals
 * and certificates are the scans the company published.
 *
 * It reads like a printed profile: a statement, then sections set on a
 * twelve-column grid with a label in the margin and the content beside it.
 */
export default async function AboutUsPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "about" });
  const tPos = await getTranslations({ locale, namespace: "home.positioning" });
  const projects = new Map(projectsFor(locale).map((project) => [project.ProjectId, project]));

  return (
    <>
      <PageHeader
        locale={locale}
        crumbs={[{ label: t("crumb") }]}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lede={<p>{pick(POSITIONING.body, locale)}</p>}
      />

      <figure className={`${SECTION_FRAME}`}>
        <div className="relative aspect-[16/9] overflow-hidden rounded-sm bg-muted sm:aspect-[21/9]">
          <Image
            src="/balcom-landing/landing1.jpg"
            alt={t("imageAlt")}
            fill
            priority
            sizes="(min-width: 1536px) 1536px, 100vw"
            className="object-cover"
          />
        </div>
      </figure>

      {/* The belief, stated once, large. */}
      <section aria-labelledby="belief-heading" className={`${SECTION_FRAME} py-20 lg:py-32`}>
        <div className="grid gap-8 lg:grid-cols-12">
          <h2 id="belief-heading" className="eyebrow lg:col-span-3 lg:pt-3">{t("beliefLabel")}</h2>
          <p className="statement lg:col-span-9">{pick(POSITIONING.statement, locale)}</p>
        </div>
      </section>

      <Band id="approach" label={t("approachLabel")} title={t("approachTitle")}>
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {PRINCIPLES.map((principle, index) => (
            <li key={index} className="border-t border-border pt-6 pb-10">
              <span className="index-numeral">{formatIndex(index + 1, locale)}</span>
              <h3 className="mt-3 text-[length:var(--text-xl)] font-medium leading-snug">{pick(principle.title, locale)}</h3>
              <p className="mt-3 text-pretty text-muted-foreground">{pick(principle.body, locale)}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band id="brands" label={t("brandsLabel")} title={t("brandsTitle")} tinted>
        <ul className="grid gap-px overflow-hidden border-y border-border sm:grid-cols-2">
          {BRANDS.map((brand, index) => (
            <li key={brand.id} className={`py-8 ${index === 1 ? "border-t border-border sm:border-t-0 sm:border-s sm:ps-10" : "sm:pe-10"}`}>
              <span className="relative -ms-2 block size-24">
                <Image src={brand.logo.light} alt={brand.name} fill sizes="96px" className="object-contain dark:hidden" />
                <Image src={brand.logo.dark} alt="" fill sizes="96px" className="hidden object-contain dark:block" />
              </span>
              <p className="mt-6 font-semibold">
                {tPos(brand.sole ? "soleAgent" : "agent")} · {tPos("since", { year: formatYear(brand.since, locale) })}
              </p>
              <p className="mt-2 max-w-md text-pretty text-muted-foreground">{t(`brand.${brand.id}`)}</p>
              <Link
                href={`/products?brand=${brand.id}`}
                className="group mt-6 inline-flex items-center gap-2 border-b border-foreground/30 pb-0.5 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
              >
                {t("brandShop", { brand: brand.name })}
                <Onward />
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      <Band id="milestones" label={t("milestonesLabel")} title={t("milestonesTitle")}>
        <ol className="relative grid gap-10 sm:grid-cols-3 sm:gap-8">
          {MILESTONES.map((year) => {
            const copy = MILESTONE_COPY[year];
            return (
              <li key={year} className="border-t-2 border-primary pt-5">
                <p className="font-[family-name:var(--font-display-face)] text-[length:var(--text-3xl)] font-medium tabular-nums">
                  {formatYear(year, locale)}
                </p>
                <h3 className="mt-3 font-semibold">{pick(copy.title, locale)}</h3>
                <p className="mt-2 text-pretty text-muted-foreground">{pick(copy.body, locale)}</p>
              </li>
            );
          })}
        </ol>
      </Band>

      <Band id="clients" label={t("clientsLabel")} title={t("clientsTitle")} tinted>
        <p className="lede max-w-2xl">{t("clientsBody")}</p>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-sm)]">
          {AUDIENCES.map((audience) => (
            <li key={audience.en} className="font-medium">{pick(audience, locale)}</li>
          ))}
        </ul>
        <dl className="mt-12 border-t border-border">
          {SECTORS.map((sector) => (
            <div key={sector.id} className="grid gap-2 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8">
              <dt className="font-semibold">{pick(SECTOR_COPY[sector.id], locale)}</dt>
              <dd className="flex flex-wrap gap-x-5 gap-y-1.5 text-muted-foreground">
                {sector.ids.flatMap((id) => {
                  const project = projects.get(id);
                  return project
                    ? [
                        <Link key={id} href={`/all-projects/${id}`} className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline">
                          {project.ProjectName}
                        </Link>,
                      ]
                    : [];
                })}
              </dd>
            </div>
          ))}
          <div className="grid gap-2 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8">
            <dt className="font-semibold">{t("alsoSupplied")}</dt>
            <dd className="flex flex-wrap gap-x-5 gap-y-1.5 text-muted-foreground">
              {PROFILE_PROJECTS.map((name) => (
                <span key={name.en}>{pick(name, locale)}</span>
              ))}
            </dd>
          </div>
        </dl>
        <Link
          href="/all-projects"
          className="group mt-8 inline-flex items-center gap-2 border-b border-foreground/30 pb-0.5 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
        >
          {t("allProjects")}
          <Onward />
        </Link>
      </Band>

      <Band id="documents" label={t("documentsLabel")} title={t("documentsTitle")}>
        <p className="lede max-w-2xl">{t("documentsBody")}</p>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <DocumentGroup title={t("approvals")} images={DOCUMENTS.approvals} alt={t("approvalAlt")} />
          <DocumentGroup title={t("certificates")} images={DOCUMENTS.certificates} alt={t("certificateAlt")} />
        </div>
        <a
          href={DOCUMENTS.portfolio}
          download
          className="mt-12 inline-flex h-12 items-center gap-2.5 rounded-md bg-foreground px-6 font-semibold text-background transition-[transform,opacity] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.98]"
        >
          <DownloadIcon className="size-4" aria-hidden />
          {t("download")}
          <span className="text-[length:var(--text-xs)] font-normal tabular-nums opacity-70">PDF · 11 MB</span>
        </a>
      </Band>

      <section aria-labelledby="vision-heading" className="border-t border-border">
        <div className={`${SECTION_FRAME} grid gap-8 py-20 lg:grid-cols-12 lg:py-28`}>
          <h2 id="vision-heading" className="eyebrow lg:col-span-3 lg:pt-3">{t("visionLabel")}</h2>
          <p className="statement !text-[length:var(--text-2xl)] lg:col-span-8">{t("vision")}</p>
        </div>
      </section>

      <ClosingCta locale={locale} />
    </>
  );
}

/** A section of the profile: its label in the margin, the content beside it. */
function Band({
  id,
  label,
  title,
  tinted,
  children,
}: {
  id: string;
  label: string;
  title: string;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className={`border-t border-border ${tinted ? "bg-card/40" : ""}`}>
      <div className={`${SECTION_FRAME} grid gap-8 py-20 lg:grid-cols-12 lg:gap-10 lg:py-28`}>
        <div className="lg:col-span-3">
          <p className="eyebrow">{label}</p>
        </div>
        <div className="lg:col-span-9">
          <h2 id={`${id}-heading`} className="mb-10 max-w-3xl text-[length:var(--text-3xl)] font-medium leading-tight ltr:tracking-tight">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </section>
  );
}

function DocumentGroup({
  title,
  images,
  alt,
}: {
  title: string;
  images: readonly { src: string; width: number; height: number }[];
  alt: string;
}) {
  return (
    <figure>
      <figcaption className="mb-4 font-semibold">{title}</figcaption>
      <ul className="grid gap-4">
        {images.map((image) => (
          <li
            key={image.src}
            // A letter is portrait; left at full column width it would be the
            // tallest thing on the page. White in either theme on purpose:
            // it is the paper the scan was made from.
            className={`overflow-hidden rounded-sm border border-border bg-white ${image.height > image.width ? "max-w-xs" : ""}`}
          >
            <a href={image.src} target="_blank" rel="noopener noreferrer" className="block">
              <Image
                src={image.src}
                alt={alt}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1024px) 35vw, 100vw"
                className="h-auto w-full"
              />
            </a>
          </li>
        ))}
      </ul>
    </figure>
  );
}
