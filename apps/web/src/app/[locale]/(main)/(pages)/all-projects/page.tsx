import { ClosingCta } from "@/components/closing-cta";
import { PageHeader } from "@/components/editorial/page-header";
import { ProjectCard } from "@/components/project-card";
import { SECTION_FRAME } from "@/components/section-heading";
import { PROFILE_PROJECTS, SECTOR_COPY } from "@/content/company-copy";
import { pick } from "@/content/l10n";
import { SECTORS } from "@/lib/company";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { formatNumber } from "@/lib/numbers";
import { projectsFor } from "@/lib/projects";
import { PagePropsTypes } from "@/types";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "allProjects" });
  return constructMetadata({ locale, path: "/all-projects", title: t("metaTitle"), description: t("metaDescription") });
}

/**
 * The projects, grouped by the sector they belong to — the way a
 * consultant looks for a reference ("have they done a hospital?") — with
 * the other projects the company profile names listed after them.
 */
export default async function ProjectsPage({ params }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params);
  const t = await getTranslations({ locale, namespace: "allProjects" });
  const byId = new Map(projectsFor(locale).map((project) => [project.ProjectId, project]));

  return (
    <>
      <PageHeader locale={locale} crumbs={[{ label: t("crumb") }]} eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("lede")}</p>} />
      <div className={`${SECTION_FRAME} space-y-20 pb-20 lg:space-y-28 lg:pb-28`}>
        {SECTORS.map((sector) => {
          const projects = sector.ids.flatMap((id) => byId.get(id) ?? []);
          if (projects.length === 0) return null;
          return (
            <section key={sector.id} aria-labelledby={`sector-${sector.id}`}>
              <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-border pb-4">
                <h2 id={`sector-${sector.id}`} className="text-[length:var(--text-2xl)] font-medium ltr:tracking-tight">
                  {pick(SECTOR_COPY[sector.id], locale)}
                </h2>
                <span className="text-[length:var(--text-sm)] tabular-nums text-muted-foreground">
                  {formatNumber(projects.length, locale === "ar" ? "ar" : "en")}
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {projects.map((project) => (
                  <li key={project.ProjectId}>
                    <ProjectCard project={project} className="h-full min-h-72" />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <section aria-labelledby="also-heading" className="grid gap-6 border-t border-border pt-10 lg:grid-cols-12">
          <h2 id="also-heading" className="eyebrow lg:col-span-3">{t("also")}</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground lg:col-span-9">
            {PROFILE_PROJECTS.map((name) => (
              <li key={name.en}>{pick(name, locale)}</li>
            ))}
          </ul>
        </section>
      </div>
      <ClosingCta locale={locale} />
    </>
  );
}
