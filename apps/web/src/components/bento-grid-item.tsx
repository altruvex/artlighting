import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface Project {
    ProjectId: string
    ProjectName: string
    ProjectDate: string
    ProjectImages: string[]
    ProjectDescription: string
    ProjectInfor?: string
    ProjectInfor2?: string
    usedProducts?: string
}

interface BentoGridItemProps {
    project: Project
    className?: string
    locale?: string
}

export function BentoGridItem({ project, className, locale = "en" }: BentoGridItemProps) {
    const isRTL = locale === "ar"

    return (
        <Link
            href={`/all-projects/${project.ProjectId}`}
            className={cn(
                "group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-border transition-all duration-500 ease-out",
                "hover:shadow-2xl hover:shadow-black/10",
                                "min-h-[280px] h-full",
                className,
            )}
            dir={isRTL ? "rtl" : "ltr"} 
        >
            <div className="relative h-full w-full flex flex-col">
                <div className="relative flex-1 min-h-64 overflow-hidden">
                    <Image
                        src={project.ProjectImages[0] || "/placeholder.svg"}
                        alt={project.ProjectName}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
                        priority={false}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-linear-to-t from-primary/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <div className="space-y-2">
                        <h3
                            className={cn(
                                "font-bold text-lg md:text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300",
                                isRTL && "text-right font-medium",
                            )}
                        >
                            {project.ProjectName}
                        </h3>
                        <p
                            className={cn(
                                "text-sm md:text-base text-foreground line-clamp-2 leading-relaxed group-hover:text-foreground transition-colors duration-300",
                                isRTL && "text-right",
                            )}
                        >
                            {project.ProjectDescription}
                        </p>
                        <div
                            className={cn(
                                "flex items-center gap-2 mt-3",
                                isRTL && "flex-row-reverse", 
                            )}
                        >
                            <div className="w-1 h-4 bg-primary rounded-full opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                            <p className="figureDate text-xs md:text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors duration-300">
                                {project.ProjectDate}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-4 right-4 w-2 h-2 bg-card/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100" />
            </div>
        </Link>
    )
}
