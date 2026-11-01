import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"

export interface ProjectSummary {
  ProjectId: string
  ProjectName: string
  ProjectDate: string
  ProjectImages: string[]
  ProjectDescription: string
}

/**
 * One installed project: the photograph, its name, when.
 *
 * Drawn the way the category tiles are — a veil rising from the bottom,
 * the name in the display face — so the two read as one site. The veil is
 * the home hero's warm night ground, not black, and the type on it is the
 * hero's warm white: a photograph is dark in either theme, so neither
 * follows the theme. (It once used the theme's foreground for the
 * description, which on the light theme put dark ink on a dark photograph.)
 */
export function ProjectCard({
  project,
  className,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  showDescription = false,
}: {
  project: ProjectSummary
  className?: string
  sizes?: string
  showDescription?: boolean
}) {
  return (
    <Link
      href={`/all-projects/${project.ProjectId}`}
      className={cn(
        "group relative isolate flex min-h-64 overflow-hidden rounded-sm bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <Image
        src={project.ProjectImages[0] || "/placeholder.svg"}
        alt=""
        fill
        sizes={sizes}
        className="-z-10 object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-[oklch(0.16_0.006_60/0.82)] via-[oklch(0.16_0.006_60/0.2)] to-transparent" />
      <div className="mt-auto w-full space-y-1 p-5 text-[oklch(0.975_0.002_80)]">
        <h3 className="line-clamp-2 font-[family-name:var(--font-display-face)] text-[length:var(--text-lg)] font-semibold leading-snug">
          {project.ProjectName}
        </h3>
        {showDescription && (
          <p className="line-clamp-2 text-[length:var(--text-sm)] text-[oklch(0.975_0.002_80/0.78)]">{project.ProjectDescription}</p>
        )}
        <p className="text-[length:var(--text-xs)] font-medium tabular-nums text-[oklch(0.975_0.002_80/0.68)]">{project.ProjectDate}</p>
      </div>
    </Link>
  )
}
