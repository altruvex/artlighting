"use client"

import { Container } from "@/components/container"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ChandelierItems, IndoorItems, OutdoorItems } from "@/constants"
import { Link } from "@/i18n/navigation"
import { BoxIcon, BriefcaseIcon, MailIcon, MenuIcon, MoveRight, NewspaperIcon, UserIcon, XIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { CartSidebar } from "../cart-sidebar"
import LanguageSwitcher from "../language-switcher"
import AuthSection from "./auth-section"
import { AuthSectionWrapper } from "./auth-section-wrapper"
import { SearchHeader } from "./search-header"

interface Project {
  ProjectId: string
  ProjectName: string
  ProjectImages: string[]
  ProjectDescription: string
}

interface HeaderProps {
  projectsForHeader: Project[]
}

export default function Header({ projectsForHeader }: HeaderProps) {
  const t = useTranslations("header")
  const tProducts = useTranslations("products")
  const locale = useLocale()
  const isRTL = locale === 'ar'

  return (
    <header className="sticky top-0 z-50 w-full bg-white/20 dark:bg-black/20 backdrop-blur-md">
      <Container className="container">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* TEMP: placeholder wordmark for the test branch — restore the logo image before merging */}
          <Link href="/" className="flex items-center gap-2 shrink-0" prefetch={false} aria-label="Linktich - Home">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight" dir="ltr">
              linktich
            </span>
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="flex items-center gap-3 rtl:flex-row-reverse">
              <NavigationMenuItem>
                <Link href="/about-us" prefetch={false}>
                  <Button
                    variant="ghost"
                    className="h-10 px-3 py-2 text-sm font-medium hover:bg-transparent hover:underline"
                  >
                    {t("about-us")}
                  </Button>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 px-3 py-2 text-sm font-medium bg-transparent hover:underline hover:bg-transparent">
                  {t("projects")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[800px] grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {projectsForHeader.map((project) => (
                      <div
                        className="group relative overflow-hidden rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors"
                        key={project.ProjectId}
                      >
                        <Link href={`/all-projects/${project.ProjectId}`} className="block p-4">
                          <div className="relative mb-3">
                            <Image
                              width={300}
                              height={200}
                              className="w-full h-32 object-cover rounded-md"
                              src={project.ProjectImages[0] || "/placeholder.svg"}
                              alt={project.ProjectName}
                            />
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-[15px] line-clamp-2 text-right rtl:text-right ltr:text-left">
                              {project.ProjectName}
                            </h3>
                            <p className="text-[13px] text-muted-foreground line-clamp-2 text-right rtl:text-right ltr:text-left">
                              {project.ProjectDescription}
                            </p>
                            <span className="text-[13px] text-primary mt-2 inline-flex items-center rtl:flex-row-reverse gap-2 group-hover:underline">
                              {t('view-details')}
                              <MoveRight className={isRTL ? "rotate-180" : ""} size={16} />
                            </span>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10 px-3 py-2 text-sm font-medium bg-transparent hover:underline hover:bg-transparent">
                  {t("products")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[700px] grid-cols-3 gap-6 p-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-primary text-base mb-3">
                        <Link href="/category/balcom/indoor" className="hover:underline">
                          {tProducts("indoor.title") || "Indoor"}
                        </Link>
                      </h4>
                      <ul className="space-y-2">
                        {IndoorItems.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                            >
                              {tProducts(`indoor.${item.id}`)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-primary text-base mb-3">
                        <Link href="/category/balcom/outdoor" className="hover:underline">
                          {tProducts("outdoor.title") || "Outdoor"}
                        </Link>
                      </h4>
                      <ul className="space-y-2">
                        {OutdoorItems.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                            >
                              {tProducts(`outdoor.${item.id}`)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-primary text-base mb-3">
                        <Link href="/category/mister-led/chandelier" className="hover:underline">
                          {tProducts("chandelier.title") || "Chandelier"}
                        </Link>
                      </h4>
                      <ul className="space-y-2">
                        {ChandelierItems.slice(0, 12).map((item) => (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                            >
                              {tProducts(`chandelier.${item.id}`)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/blog" prefetch={false}>
                  <Button
                    variant="ghost"
                    className="h-10 px-3 py-2 text-sm font-medium hover:bg-transparent hover:underline"
                  >
                    {t("blog")}
                  </Button>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/contact-us" prefetch={false}>
                  <Button
                    variant="ghost"
                    className="h-10 px-3 py-2 text-sm font-medium hover:bg-transparent hover:underline"
                  >
                    {t("contact-us")}
                  </Button>
                </Link>
              </NavigationMenuItem>

              <div className="hidden lg:flex items-center gap-3 rtl:flex-row-reverse">
                <SearchHeader />
                <AuthSectionWrapper>
                  <AuthSection />
                </AuthSectionWrapper>
                <LanguageSwitcher currentLocale={locale} />
              </div>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-2 lg:hidden ">
            <Sheet>
              <SheetTrigger asChild>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <LanguageSwitcher currentLocale={locale} />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-transparent"
                    aria-label="Open navigation menu"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                </div>
              </SheetTrigger>

              <SheetContent side={isRTL ? "left" : "right"} className="w-[85vw] max-w-sm overflow-y-auto">
                <div className="flex justify-between px-3 py-2 rtl:flex-row-reverse">
                  <SheetHeader className="py-0 px-0">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <AuthSectionWrapper>
                      <AuthSection />
                    </AuthSectionWrapper>
                  </SheetHeader>
                  <SheetClose className="cursor-pointer">
                    <XIcon className="size-5" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>

                <div className="flex flex-col h-full">
                  <div className="px-3 border-b border-t">
                    <div className="py-4">
                      <SearchHeader isMobileSheet />
                    </div>
                  </div>

                  <nav className="flex flex-col space-y-1 pt-6 flex-1">
                    <SheetClose asChild>
                      <Link
                        href="/about-us"
                        className="flex items-center gap-3 p-3 text-sm font-medium rounded-md hover:bg-accent rtl:flex-row-reverse"
                        prefetch={false}
                      >
                        <UserIcon className="h-4 w-4 shrink-0" />
                        {t("about-us")}
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link
                        href="/all-projects"
                        className="flex items-center gap-3 p-3 text-sm font-medium rounded-md hover:bg-accent rtl:flex-row-reverse"
                        prefetch={false}
                      >
                        <BriefcaseIcon className="h-4 w-4 shrink-0" />
                        {t("projects")}
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link
                        href="/category"
                        className="flex items-center gap-3 p-3 text-sm font-medium rounded-md hover:bg-accent rtl:flex-row-reverse"
                        prefetch={false}
                      >
                        <BoxIcon className="h-4 w-4 shrink-0" />
                        {t("products")}
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link
                        href="/blog"
                        className="flex items-center gap-3 p-3 text-sm font-medium rounded-md hover:bg-accent rtl:flex-row-reverse"
                        prefetch={false}
                      >
                        <NewspaperIcon className="h-4 w-4 shrink-0" />
                        {t("blog")}
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link
                        href="/contact-us"
                        className="flex items-center gap-3 p-3 text-sm font-medium rounded-md hover:bg-accent rtl:flex-row-reverse"
                        prefetch={false}
                      >
                        <MailIcon className="h-4 w-4 shrink-0" />
                        {t("contact-us")}
                      </Link>
                    </SheetClose>

                    <div className="px-1.5 py-3">
                      <CartSidebar />
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  )
}