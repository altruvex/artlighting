import ProjectExample from "@/components/project-example";
import { ProjectCard } from "@/components/project-card";
import { SECTION_FRAME, SectionHeading } from "@/components/section-heading";
import { projectsFor } from "@/lib/projects";
import type { ReactNode } from "react";

/**
 * Every installed project.
 *
 * Rendered on the server: it was a client component that faded the whole
 * page in with framer-motion, logged the project list to the console, and
 * told shoppers "Debug: Found 0 projects" when it had none.
 */
export default function AllProject({
  children,
  locale,
  allProjectsTitle,
  noProjectsText,
}: {
  children: ReactNode;
  locale: string;
  allProjectsTitle: string;
  noProjectsText: string;
}) {
  const projects = projectsFor(locale);

  return (
    <div>
      {children}
      <div className={`${SECTION_FRAME} pb-16`}>
        <ProjectExample />
        <section aria-labelledby="all-projects-heading">
          <SectionHeading id="all-projects-heading" title={allProjectsTitle} />
          {projects.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((project) => (
                <li key={project.ProjectId}>
                  <ProjectCard project={project} className="h-full min-h-72" showDescription />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-12 text-center text-muted-foreground">{noProjectsText}</p>
          )}
        </section>
      </div>
    </div>
  );
}
