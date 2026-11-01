import { ClosingCta } from "@/components/closing-cta";
import { Onward } from "@/components/editorial/arrow";
import { PageHeader } from "@/components/editorial/page-header";
import { ProjectCard } from "@/components/project-card";
import { SECTION_FRAME } from "@/components/section-heading";
import { SECTOR_COPY } from "@/content/company-copy";
import { pick } from "@/content/l10n";
import projectsDetailsAr from "@/data/projects-details-ar.json";
import projectsDetailsEn from "@/data/projects-details-en.json";
import { Link } from "@/i18n/navigation";
import { SECTORS } from "@/lib/company";
import { getLocaleFromParams } from "@/lib/i18n/utils";
import { constructMetadata } from "@/lib/metadata";
import { projectsFor } from "@/lib/projects";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

type ProjectRecord = {
  ProjectId: string;
  ProjectName: string;
  ProjectDate: string;
  ProjectImages: string[];
  ProjectDescription: string;
  ProjectInfor?: string;
  ProjectInfor2?: string;
  usedProducts?: string;
};

type Props = { params: Promise<{ locale: string; projectId: string }> };

function projectFor(locale: string, id: string): ProjectRecord | null {
  const file = (locale === "ar" ? projectsDetailsAr : projectsDetailsEn) as { projects: Record<string, ProjectRecord> };
  const project = file.projects?.[id];
  return project?.ProjectName?.trim() ? project : null;
}

/**
 * The project data links "products used" to the old category funnel, in
 * two shapes — "/category/balcom/indoor/panel-light" and the brandless
 * "/category/indoor/linear", which never resolved. Both end in the lighting
 * type, which is what the shop filters by.
 */
function productsHref(usedProducts?: string) {
  const type = usedProducts?.split("/").filter(Boolean).pop();
  return type ? `/products?type=${encodeURIComponent(type.toLowerCase())}` : null;
}

export function generateStaticParams() {
  return projectsFor("en").map((project) => ({ projectId: project.ProjectId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const project = projectFor(locale, awaited.projectId);
  if (!project) return constructMetadata({ locale, noIndex: true });
  const t = await getTranslations({ locale, namespace: "project" });
  return constructMetadata({
    locale,
    path: `/all-projects/${project.ProjectId}`,
    title: t("metaTitle", { name: project.ProjectName }),
    description: (project.ProjectInfor ?? project.ProjectDescription).slice(0, 160),
    image: project.ProjectImages[0],
  });
}

/**
 * One project, as a reference: what the building is, what the company
 * supplied for it, and the photographs. The old page titled itself with the
 * project's one-line description and faded in on every visit.
 */
export default async function ProjectPage({ params }: Props) {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  const project = projectFor(locale, awaited.projectId);
  if (!project) notFound();

  const t = await getTranslations({ locale, namespace: "project" });
  const tAll = await getTranslations({ locale, namespace: "allProjects" });
  const sector = SECTORS.find((entry) => (entry.ids as readonly string[]).includes(project.ProjectId));
  const [hero, ...gallery] = project.ProjectImages;
  const products = productsHref(project.usedProducts);
  const byId = new Map(projectsFor(locale).map((entry) => [entry.ProjectId, entry]));
  const siblings = (sector?.ids ?? []).filter((id) => id !== project.ProjectId).flatMap((id) => byId.get(id) ?? []).slice(0, 3);

  return (
    <>
      <PageHeader
        locale={locale}
        crumbs={[{ label: tAll("crumb"), href: "/all-projects" }, { label: project.ProjectName }]}
        eyebrow={sector ? pick(SECTOR_COPY[sector.id], locale) : tAll("eyebrow")}
        title={project.ProjectName}
        lede={<p>{project.ProjectDescription}</p>}
        aside={
          <dl className="grid grid-cols-2 gap-4 border-s border-border ps-5 text-[length:var(--text-sm)]">
            <div>
              <dt className="text-muted-foreground">{t("date")}</dt>
              <dd className="mt-1 font-medium tabular-nums">{project.ProjectDate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("lighting")}</dt>
              <dd className="mt-1 font-medium">{t("supplier")}</dd>
            </div>
          </dl>
        }
      />

      {hero && (
        <figure className={SECTION_FRAME}>
          <div className="relative aspect-[16/9] overflow-hidden rounded-sm bg-muted lg:aspect-[21/9]">
            <Image src={hero} alt={project.ProjectName} fill priority sizes="(min-width: 1536px) 1536px, 100vw" className="object-cover" />
          </div>
        </figure>
      )}

      <section className={`${SECTION_FRAME} grid gap-10 py-16 lg:grid-cols-12 lg:py-24`}>
        <div className="doc lg:col-span-7">
          {project.ProjectInfor && <p>{project.ProjectInfor}</p>}
          {project.ProjectInfor2 && <p>{project.ProjectInfor2}</p>}
        </div>
        {products && (
          <div className="lg:col-span-4 lg:col-start-9">
            <Link
              href={products}
              className="group inline-flex items-center gap-2 border-b border-foreground/30 pb-1 font-medium transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
            >
              {t("used-products")}
              <Onward />
            </Link>
          </div>
        )}
      </section>

      {gallery.length > 0 && (
        <section aria-label={t("gallery")} className={`${SECTION_FRAME} pb-20 lg:pb-28`}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {gallery.map((src, index) => (
              <li key={src} className={gallery.length % 2 === 1 && index === gallery.length - 1 ? "sm:col-span-2" : undefined}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-muted">
                  <Image src={src} alt={`${project.ProjectName} — ${index + 2}`} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {siblings.length > 0 && (
        <section aria-labelledby="siblings-heading" className={`${SECTION_FRAME} border-t border-border py-20 lg:py-28`}>
          <h2 id="siblings-heading" className="mb-8 text-[length:var(--text-2xl)] font-medium leading-tight ltr:tracking-tight">
            {t("more", { sector: sector ? pick(SECTOR_COPY[sector.id], locale) : "" })}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {siblings.map((entry) => (
              <li key={entry.ProjectId}>
                <ProjectCard project={entry} className="h-full min-h-64" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ClosingCta locale={locale} />
    </>
  );
}
