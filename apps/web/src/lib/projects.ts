import projectsDetailsAr from "@/data/projects-details-ar.json";
import projectsDetailsEn from "@/data/projects-details-en.json";
import type { ProjectSummary } from "@/components/project-card";

type ProjectsFile = { projects: Record<string, ProjectSummary> };

/** Every installed project with a name, in the file's order, for this locale. */
export function projectsFor(locale: string): ProjectSummary[] {
  const file = (locale === "ar" ? projectsDetailsAr : projectsDetailsEn) as ProjectsFile;
  return Object.values(file.projects ?? {}).filter(
    (project) => project?.ProjectName?.trim() && project.ProjectName !== `Project ${project.ProjectId}`,
  );
}

/** The projects the home page leads with, largest first. */
export const FEATURED_PROJECTS = ["al-galala-resort", "dar-misr", "tolip", "mansoura-hospital", "almaza-park"];
