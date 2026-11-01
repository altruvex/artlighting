"use client"

import { Container } from "@/components/container"
import { Button } from "@repo/ui/components/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@repo/ui/components/navigation-menu"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet"
import { ChandelierItems, IndoorItems, OutdoorItems } from "@/constants"
import { Link, usePathname } from "@/i18n/navigation"
import { familySlug, type ProductFamily } from "@repo/catalog/families"
import { cn } from "@/lib/utils"
import type { Application } from "@/content/applications"
import { pick } from "@/content/l10n"
import { MenuIcon, TagIcon, XIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { CartSidebar } from "../cart-sidebar"
import LanguageSwitcher from "../language-switcher"
import AuthSection from "./auth-section"
import { AuthSectionWrapper } from "./auth-section-wrapper"
import { SearchHeader } from "./search-header"


/**
 * The header: how a customer understands the company, not how the
 * database is organised.
 *
 * Products first — this is still where most visits go — then the way in
 * for people who start from a space (applications), what the company does
 * besides sell (services), the proof (projects), the knowledge (the
 * guide), and the company itself. Offers live inside the products menu and
 * in the promo bar above, rather than as a top-level item next to the
 * company's name.
 *
 * The controls stay in their own group outside the navigation list — a
 * `<ul>` may only hold `<li>`, and nesting them was a hydration error. The
 * current section is marked, so a visitor can tell where they are.
 */
/** What the applications menu shows of each application (passed from header-wrapper). */
export type MenuApplication = Pick<Application, "slug" | "name" | "summary">

export default function Header({ applications }: { applications: MenuApplication[] }) {
  const t = useTranslations("header")
  const tNav = useTranslations("nav")
  const tProducts = useTranslations("products")
  const tFamily = useTranslations("family")
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === "ar"

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const company = [
    { href: "/services", label: tNav("services") },
    { href: "/all-projects", label: tNav("projects") },
    { href: "/lighting-guide", label: tNav("guide"), wide: true },
    { href: "/about-us", label: tNav("about") },
    { href: "/contact-us", label: tNav("contact"), wide: true },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center" prefetch={false} aria-label={t("home")}>
            <Image
              width={80}
              height={80}
              src={locale === "ar" ? "/logo-ar.png" : "/logo-en.png"}
              className="h-12 w-12 sm:h-14 sm:w-14"
              alt={t("logo")}
              priority
            />
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="flex items-center gap-0.5">
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(navTrigger, isCurrent("/products") && navCurrent)}>
                  {tNav("products")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[min(44rem,calc(100vw-3rem))] grid-cols-[repeat(3,minmax(0,1fr))] gap-6 p-6">
                    <ShopColumn
                      title={tFamily("INDOOR")}
                      href={`/products?family=${familySlug("INDOOR")}`}
                      links={IndoorItems.map((item) => ({
                        key: item.id,
                        label: tProducts(`indoor.${item.id}`),
                        href: shopHref("INDOOR", item.id),
                      }))}
                      browse={t("browse")}
                    />
                    <ShopColumn
                      title={tFamily("OUTDOOR")}
                      href={`/products?family=${familySlug("OUTDOOR")}`}
                      links={OutdoorItems.map((item) => ({
                        key: item.id,
                        label: tProducts(`outdoor.${item.id}`),
                        href: shopHref("OUTDOOR", item.id),
                      }))}
                      browse={t("browse")}
                    />
                    <ShopColumn
                      title={tFamily("CHANDELIER")}
                      href={`/products?family=${familySlug("CHANDELIER")}`}
                      links={ChandelierItems.slice(0, 8).map((item) => ({
                        key: item.id,
                        label: tProducts(`chandelier.${item.id}`),
                        href: shopHref("CHANDELIER", item.id),
                      }))}
                      browse={t("browse")}
                      more={{ label: t("models"), href: `/products?family=${familySlug("CHANDELIER")}` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
                    <Link
                      href="/products"
                      className="text-[length:var(--text-sm)] font-semibold underline-offset-4 hover:underline"
                    >
                      {t("all-products")}
                    </Link>
                    <Link
                      href="/products?sale=1&sort=discount"
                      className="inline-flex items-center gap-2 text-[length:var(--text-sm)] font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <TagIcon className="size-4" aria-hidden />
                      {t("see-offers")}
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(navTrigger, isCurrent("/applications") && navCurrent)}>
                  {tNav("applications")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[min(40rem,calc(100vw-3rem))] p-6">
                    <p className="mb-4 text-[length:var(--text-sm)] text-muted-foreground">{tNav("applicationsIntro")}</p>
                    <ul className="grid grid-cols-2 gap-x-6">
                      {applications.map((application) => (
                        <li key={application.slug} className="border-t border-border">
                          <Link href={`/applications/${application.slug}`} className="group block py-3">
                            <span className="block text-[length:var(--text-sm)] font-semibold transition-colors duration-[var(--dur-hover)] group-hover:text-primary">
                              {pick(application.name, locale)}
                            </span>
                            <span className="mt-0.5 line-clamp-1 block text-[length:var(--text-xs)] text-muted-foreground">
                              {pick(application.summary, locale)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-border px-6 py-4">
                    <Link href="/applications" className="text-[length:var(--text-sm)] font-semibold underline-offset-4 hover:underline">
                      {tNav("allApplications")}
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {company.map((item) => (
                <NavigationMenuItem key={item.href} className={item.wide ? "hidden xl:block" : undefined}>
                  <NavLink href={item.href} current={isCurrent(item.href)}>
                    {item.label}
                  </NavLink>
                </NavigationMenuItem>
              ))}
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
                <Button variant="outline" size="icon" className="size-10 bg-transparent lg:hidden" aria-label={t("menu")}>
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side={isRTL ? "left" : "right"} showCloseButton={false} className="w-[88vw] max-w-sm overflow-y-auto">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <SheetHeader className="px-0 py-0">
                    <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
                    <LanguageSwitcher currentLocale={locale} />
                  </SheetHeader>
                  <SheetClose className="grid size-10 cursor-pointer place-items-center rounded-md transition-colors duration-[var(--dur-hover)] hover:bg-accent">
                    <XIcon className="size-5" aria-hidden />
                    <span className="sr-only">{t("close")}</span>
                  </SheetClose>
                </div>

                <div className="border-y border-border px-4 py-4">
                  <SearchHeader isMobileSheet />
                </div>

                <nav aria-label={t("menu")} className="px-4 py-2">
                  <p className="eyebrow pt-4 pb-2">{tNav("shopSection")}</p>
                  <ul>
                    {[
                      { href: "/products", label: t("all-products") },
                      { href: `/products?family=${familySlug("INDOOR")}`, label: tFamily("INDOOR") },
                      { href: `/products?family=${familySlug("OUTDOOR")}`, label: tFamily("OUTDOOR") },
                      { href: `/products?family=${familySlug("CHANDELIER")}`, label: tFamily("CHANDELIER") },
                      { href: "/products?sale=1&sort=discount", label: tNav("offers"), accent: true },
                    ].map((item) => (
                      <li key={item.href} className="border-b border-border/70">
                        <SheetClose asChild>
                          <Link href={item.href} className={cn(sheetLink, item.accent && "text-primary")} prefetch={false}>
                            {item.label}
                          </Link>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>

                  <p className="eyebrow pt-8 pb-2">{tNav("companySection")}</p>
                  <ul>
                    {[{ href: "/applications", label: tNav("applications") }, ...company].map((item) => (
                      <li key={item.href} className="border-b border-border/70">
                        <SheetClose asChild>
                          <Link
                            href={item.href}
                            aria-current={isCurrent(item.href) ? "page" : undefined}
                            className={cn(sheetLink, isCurrent(item.href) && "text-primary")}
                            prefetch={false}
                          >
                            {item.label}
                          </Link>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="mt-4 border-t border-border p-4">
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

/** A lighting type, as the shop addresses it: the family plus the type facet. */
function shopHref(family: ProductFamily, typeId: string) {
  return `/products?family=${familySlug(family)}&type=${encodeURIComponent(typeId.toLowerCase())}`
}

const navTrigger =
  "h-9 bg-transparent px-3 text-[length:var(--text-sm)] font-medium hover:bg-accent/60 data-[state=open]:bg-accent/60"

const navCurrent = "text-primary"

const sheetLink =
  "flex items-center justify-between py-3.5 text-[length:var(--text-base)] font-medium transition-colors duration-[var(--dur-hover)] hover:text-primary"

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

/** One family in the products menu: the family itself, then its types. */
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
