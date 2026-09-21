"use client"

import { BentoGridItem } from "@/components/bento-grid-item"
import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { TextPlugin } from "gsap/TextPlugin"
import { useEffect, useState } from "react"

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

interface ProjectsClientProps {
  projects: Project[]
  locale: string
  sectionTitle: string
  sectionDescription: string
  exploreAllText: string
}

export default function ProjectsClient({
  projects,
  locale,
  sectionTitle,
  sectionDescription,
  exploreAllText,
}: ProjectsClientProps) {
  const [isClicked, setIsClicked] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger, TextPlugin)

      const projectCards = gsap.utils.toArray(".bento-grid-item") as HTMLElement[]

      gsap.fromTo(
        projectCards,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".projectsContainer",
            start: "top 80%",
            toggleActions: "play none none reverse",
            once: true,
          },
        },
      )

      projectCards.forEach((card: HTMLElement) => {
        const dateElement = card.querySelector(".figureDate")
        if (dateElement) {
          gsap.fromTo(
            dateElement,
            { text: "" },
            {
              text: dateElement.textContent || "",
              duration: 1,
              ease: "power1.out",
              delay: 0.2,
              scrollTrigger: {
                trigger: dateElement,
                start: "top 90%",
                toggleActions: "play none none reverse",
                once: true,
              },
            },
          )
        }
      })
    }
  }, [projects])

  const HandleClickedButtons = () => {
    setIsClicked(true)
  }

  const getGridSpanClasses = (index: number) => {
    const patterns = [
      "md:col-span-2 md:row-span-2",
      "md:col-span-1 md:row-span-1",
      "md:col-span-1 md:row-span-1",
      "md:col-span-2 md:row-span-1",
      "md:col-span-1 md:row-span-1",
      "md:col-span-1 md:row-span-1",
      "md:col-span-1 md:row-span-1",
      "md:col-span-1 md:row-span-1",
    ]
    return patterns[index % patterns.length]
  }

  return (
    <section className="py-12 md:py-14 lg:py-16" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">{sectionTitle}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{sectionDescription}</p>
        </div>
        {projects && projects.length > 0 ? (
          <div className="flex items-center justify-center flex-col">
            <div className="projectsContainer grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full auto-rows-[minmax(280px,auto)]">
              {projects.map((project, index) => (
                <BentoGridItem
                  key={project.ProjectId}
                  project={project}
                  locale={locale} // Pass locale to component
                  className={cn("bento-grid-item", getGridSpanClasses(index))}
                />
              ))}
            </div>
            <div className="flex items-center justify-center mt-10">
              <Link
                className={cn(
                  "flex items-center justify-center transition-colors border-[1.5px] font-medium h-14 md:px-10 px-7 md:text-lg text-sm w-full rounded",
                  "bg-background text-foreground border-border hover:bg-foreground hover:text-muted hover:border-foreground",
                  "dark:bg-background dark:text-foreground dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground",
                  {
                    "bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground border-foreground":
                      isClicked,
                  },
                )}
                href={"/all-projects"}
                onClick={HandleClickedButtons}
              >
                {exploreAllText}
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {locale === "ar" ? "لا توجد مشاريع متاحة" : "No projects available"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Debug: Projects array length is {projects?.length || 0}
            </p>
          </div>
        )}
      </Container>
    </section>
  )
}
