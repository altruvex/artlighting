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
import { Link, usePathname } from "@/i18n/navigation"
import { familySlug } from "@repo/catalog/families"
import { cn } from "@/lib/utils"
import {
  BoxIcon,
  BriefcaseIcon,
  MailIcon,
  MenuIcon,
  MoveRight,
  NewspaperIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "lucide-react"
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

/**
 * The header, as a shop's header.
 *
 * Three things were wrong with the old one. The account, search and
 * language controls were `<div>`s inside the navigation `<ul>` — invalid
 * nesting, and the hydration error every page logged. The order put "about
 * us" first and the catalogue third, which is the order of a brochure. And
 * the first menu entry a shopper wants — everything, on sale — did not
 * exist at all.
 *
 * Now: brand, then the shop, the offers and the proof, then the controls
 * in their own group outside the list. The current section is marked, so a
 * shopper can tell where they are.
 */
export default function Header({ projectsForHeader }: HeaderProps) {
  const t = useTranslations("header")
  const tProducts = useTranslations("products")
  const tFamily = useTranslations("family")
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === "ar"

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center" prefetch={false} aria-label="Art Lighting - Home">
            <Image
              width={80}
              height={80}
              src={locale === "ar" ? "/logo-ar.png" : "/logo-en.png"}
              className="h-12 w-12 sm:h-14 sm:w-14"
              alt="Art Lighting Logo"
              priority
            />
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="flex items-center gap-1">
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(navTrigger, isCurrent("/products") && navCurrent)}>
                  {t("shop")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[min(40rem,calc(100vw-3rem))] grid-cols-[repeat(3,minmax(0,1fr))] gap-5 p-6">
                    <ShopColumn
                      title={tFamily("INDOOR")}
                      href={`/products?family=${familySlug("INDOOR")}`}
                      links={IndoorItems.map((item) => ({
                        key: item.id,
                        label: tProducts(`indoor.${item.id}`),
                        href: item.href,
                      }))}
                      browse={t("browse")}
                    />
                    <ShopColumn
                      title={tFamily("OUTDOOR")}
                      href={`/products?family=${familySlug("OUTDOOR")}`}
                      links={OutdoorItems.map((item) => ({
                        key: item.id,
                        label: tProducts(`outdoor.${item.id}`),
                        href: item.href,
                      }))}
                      browse={t("browse")}
                    />
                    <ShopColumn
                      title={tFamily("CHANDELIER")}
                      href={`/products?family=${familySlug("CHANDELIER")}`}
                      links={ChandelierItems.slice(0, 8).map((item) => ({
                        key: item.id,
                        label: tProducts(`chandelier.${item.id}`),
                        href: item.href,
                      }))}
                      browse={t("browse")}
                      more={{ label: t("models"), href: `/products?family=${familySlug("CHANDELIER")}` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border bg-card/60 px-6 py-4">
                    <Link
                      href="/products"
                      className="text-[length:var(--text-sm)] font-semibold underline-offset-4 hover:underline"
                    >
                      {t("all-products")}
                    </Link>
                    <Link
                      href="/products?sale=1&sort=discount"
                      className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1.5 text-[length:var(--text-sm)] font-medium text-primary transition-colors duration-[var(--dur-hover)] hover:bg-primary hover:text-primary-foreground"
                    >
                      <TagIcon className="size-4" aria-hidden />
                      {t("see-offers")}
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavLink href="/products?sale=1&sort=discount" className="text-primary">
                  {t("offers")}
                </NavLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(navTrigger, isCurrent("/all-projects") && navCurrent)}>
                  {t("projects")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[min(40rem,calc(100vw-3rem))] grid-cols-3 gap-4 p-5">
                    {projectsForHeader.map((project) => (
                      <li key={project.ProjectId}>
                        <Link
                          href={`/all-projects/${project.ProjectId}`}
                          className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors duration-[var(--dur-hover)] hover:border-primary/50"
                        >
                          <Image
                            width={300}
                            height={200}
                            className="h-32 w-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                            src={project.ProjectImages[0] || "/placeholder.svg"}
                            alt={project.ProjectName}
                          />
                          <div className="space-y-1.5 p-4">
                            <h3 className="line-clamp-2 text-[length:var(--text-sm)] font-semibold">
                              {project.ProjectName}
                            </h3>
                            <p className="line-clamp-2 text-[length:var(--text-xs)] text-muted-foreground">
                              {project.ProjectDescription}
                            </p>
                            <span className="inline-flex items-center gap-2 text-[length:var(--text-xs)] text-primary group-hover:underline">
                              {t("view-details")}
                              <MoveRight className={isRTL ? "rotate-180" : ""} size={14} aria-hidden />
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavLink href="/blog" current={isCurrent("/blog")}>
                  {t("blog")}
                </NavLink>
              </NavigationMenuItem>

              <NavigationMenuItem className="hidden xl:block">
                <NavLink href="/about-us" current={isCurrent("/about-us")}>
                  {t("about-us")}
                </NavLink>
              </NavigationMenuItem>

              <NavigationMenuItem className="hidden xl:block">
                <NavLink href="/contact-us" current={isCurrent("/contact-us")}>
                  {t("contact-us")}
                </NavLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* The controls, outside the navigation list — a `<ul>` may only
              hold `<li>`, and the browser moving these out of it was the
              hydration mismatch. */}
          <div className="ms-auto flex items-center gap-2">
            <div className="hidden lg:block">
              <SearchHeader />
            </div>
            <AuthSectionWrapper>
              <AuthSection />
            </AuthSectionWrapper>
            <CartSidebar />
            <div className="hidden lg:block">
              <LanguageSwitcher currentLocale={locale} />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent lg:hidden" aria-label={t("menu")}>
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side={isRTL ? "left" : "right"} className="w-[85vw] max-w-sm overflow-y-auto">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <SheetHeader className="px-0 py-0">
                    <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
                    <LanguageSwitcher currentLocale={locale} />
                  </SheetHeader>
                  <SheetClose className="cursor-pointer">
                    <XIcon className="size-5" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>

                <div className="border-y border-border px-3 py-4">
                  <SearchHeader isMobileSheet />
                </div>

                <nav className="flex flex-col gap-1 p-3">
                  <SheetClose asChild>
                    <Link href="/products" className={sheetLink} prefetch={false}>
                      <BoxIcon className="size-4 shrink-0" aria-hidden />
                      {t("all-products")}
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link href="/products?sale=1&sort=discount" className={cn(sheetLink, "text-primary")} prefetch={false}>
                      <TagIcon className="size-4 shrink-0" aria-hidden />
                      {t("offers")}
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link href="/all-projects" className={sheetLink} prefetch={false}>
                      <BriefcaseIcon className="size-4 shrink-0" aria-hidden />
                      {t("projects")}
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link href="/blog" className={sheetLink} prefetch={false}>
                      <NewspaperIcon className="size-4 shrink-0" aria-hidden />
                      {t("blog")}
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link href="/about-us" className={sheetLink} prefetch={false}>
                      <UserIcon className="size-4 shrink-0" aria-hidden />
                      {t("about-us")}
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link href="/contact-us" className={sheetLink} prefetch={false}>
                      <MailIcon className="size-4 shrink-0" aria-hidden />
                      {t("contact-us")}
                    </Link>
                  </SheetClose>
                </nav>

                <div className="border-t border-border p-3">
                  <AuthSectionWrapper>
                    <AuthSection variant="sheet" />
                  </AuthSectionWrapper>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  )
}

const navTrigger =
  "h-9 bg-transparent px-3 text-[length:var(--text-sm)] font-medium hover:bg-accent/60 data-[state=open]:bg-accent/60"

const navCurrent = "text-primary"

const sheetLink =
  "flex items-center gap-3 rounded-md p-3 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)] hover:bg-accent"

function NavLink({
  href,
  children,
  current,
  className,
}: {
  href: string
  children: React.ReactNode
  current?: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-md px-3 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--dur-hover)] hover:bg-accent/60",
        current && navCurrent,
        className,
      )}
    >
      {children}
    </Link>
  )
}

/** One family in the shop menu: the family itself, then its types. */
function ShopColumn({
  title,
  href,
  links,
  browse,
  more,
}: {
  title: string
  href: string
  links: { key: string; label: string; href: string }[]
  browse: string
  more?: { label: string; href: string }
}) {
  return (
    <div>
      <Link
        href={href}
        className="font-[family-name:var(--font-display-face)] text-[length:var(--text-base)] font-semibold underline-offset-4 hover:underline"
      >
        {title}
      </Link>
      <p className="mt-1 mb-3 text-[length:var(--text-xs)] text-muted-foreground">{browse}</p>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              className="text-[length:var(--text-sm)] text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
        {more && (
          <li>
            <Link
              href={more.href}
              className="text-[length:var(--text-sm)] font-medium text-primary underline-offset-4 hover:underline"
            >
              {more.label}
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
