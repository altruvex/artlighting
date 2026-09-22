import { ProjectCard } from "@/components/project-card";
import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import { FEATURED_PROJECTS, projectsFor } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

/**
 * Installed projects, as proof the fittings are real.
 *
 * It was a client component that loaded GSAP with three plugins to fade
 * the cards in and type the dates out letter by letter, and printed
 * "Debug: Projects array length is 0" to shoppers when the list was empty.
 * It is rendered on the server now, headed like every other section, with
 * the first project given the space the first category tile gets.
 */
export async function ProjectsSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "news-projects" });
  const byId = new Map(projectsFor(locale).map((project) => [project.ProjectId, project]));
  const projects = FEATURED_PROJECTS.flatMap((id) => byId.get(id) ?? []);
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="projects-heading" className={`${SECTION_FRAME} py-12 lg:py-16`}>
      <SectionHeading
        id="projects-heading"
        title={t("title")}
        subtitle={t("description")}
        href="/all-projects"
        hrefLabel={t("exploreAllProjects")}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        {projects.map((project, index) => (
          <li key={project.ProjectId} className={cn(index === 0 && "sm:col-span-2 lg:row-span-2")}>
            <ProjectCard
              project={project}
              className={cn("h-full", index === 0 && "min-h-80")}
              sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
              showDescription={index === 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
