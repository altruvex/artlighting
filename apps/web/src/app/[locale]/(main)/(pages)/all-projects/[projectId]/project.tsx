"use client"

import projectsDetailsAr from "@/data/projects-details-ar.json"
import projectsDetailsEn from "@/data/projects-details-en.json"
import { Link } from "@/i18n/navigation"
import type { SupportedLanguage } from "@/types/products"
import { Container } from "@/components/container"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useParams } from "next/navigation"
import type React from "react"

interface ProjectProps {
  ProjectId: string
  ProjectName: string
  ProjectDate: string
  ProjectImages: string[]
  ProjectDescription: string
  ProjectInfor: string
  ProjectInfor2: string
  usedProducts: string
}

interface ProjectsData {
  projects: {
    [key: string]: ProjectProps
  }
}

export default function Project({ children, locale }: { children?: React.ReactNode; locale: SupportedLanguage }) {
  const { projectId } = useParams() as { projectId: string }

  const projectsData: ProjectsData =
    locale === "ar" ? (projectsDetailsAr as ProjectsData) : (projectsDetailsEn as ProjectsData)

  const t = useTranslations("project")
  const tCompany = useTranslations("company")

  if (!projectId) {
    return <div>{t("project-not-found")}</div>
  }

  const project = projectsData.projects[projectId]

  if (!project) {
    return <div>{t("project-error").replace("{projectId}", projectId)}</div>
  }

  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, delay: 0.3 },
    },
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={variants}>
      {children}
      <div className="py-6">
        <Container>
          <div>
            <div className="space-y-3">
              <p className="text-muted-foreground">{project.ProjectDate}</p>
              <h1 className="font-medium lg:text-4xl md:text-2xl text-lg">{project.ProjectDescription}</h1>
              <p className="mb-5 -mt-1 md:text-lg text-sm tracking-wide text-muted-foreground">
                {project.ProjectInfor}
              </p>
            </div>
            <Image
              src={project.ProjectImages[0] || "/placeholder.svg"}
              alt={project.ProjectName}
              className="w-full lg:h-[43rem] h-auto rounded-md"
              height={688}
              width={1450}
            />
            <p className="my-5 md:text-lg text-sm tracking-wide text-muted-foreground">{project.ProjectDescription}</p>
            <div className="space-y-2 my-4 mb-6">
              <p className="text-lg text-gray-700 tracking-wide">
                {t('lighting')}: <span>{tCompany('name')}</span>
              </p>
              <p className="text-lg text-gray-700 tracking-wide">
                {t('project-name')}: <span>{project.ProjectName}</span>
              </p>
              {project.usedProducts && (
                <Link className="text-lg tracking-wide underline mt-5" href={project.usedProducts}>
                  {t('used-products')}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {project.ProjectImages[1] && (
                <div className="relative overflow-hidden rounded-lg shadow-lg">
                  <Image
                    src={project.ProjectImages[1] || "/placeholder.svg"}
                    alt={project.ProjectName}
                    width={500}
                    height={250}
                    className="object-cover h-full w-full transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}
              {project.ProjectImages[2] && (
                <div className="relative overflow-hidden rounded-lg shadow-lg">
                  <Image
                    src={project.ProjectImages[2] || "/placeholder.svg"}
                    alt={project.ProjectName}
                    width={500}
                    height={250}
                    className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}
            </div>
            {project.ProjectInfor2 && (
              <p className="my-5 md:text-lg text-sm tracking-wide text-muted-foreground">{project.ProjectInfor2}</p>
            )}
            {project.ProjectImages[3] && (
              <Image
                src={project.ProjectImages[3] || "/placeholder.svg"}
                alt={project.ProjectName}
                className="w-full lg:h-[43rem] h-auto rounded-md"
                height={688}
                width={1450}
              />
            )}
            {project.ProjectImages[4] && (
              <Image
                src={project.ProjectImages[4] || "/placeholder.svg"}
                alt={project.ProjectName}
                className="w-full lg:h-[43rem] h-auto rounded-md"
                height={688}
                width={1450}
              />
            )}
          </div>
        </Container>
      </div>
    </motion.div>
  )
}