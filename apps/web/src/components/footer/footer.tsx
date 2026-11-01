import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { COMPANY, DOCUMENTS, POLICIES, displayPhone } from "@/lib/company";
import { SHOWROOM_MAP, SHOWROOM_SOCIAL, SHOWROOM_WHATSAPP } from "@/lib/showroom";
import { familySlug } from "@repo/catalog/families";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ChangeTheme from "../theme-changer";
import { cacheLife } from "next/cache";

/**
 * The footer, as the company's index.
 *
 * It had four columns — shop, company, help — which was right for a shop
 * and left out most of what a company has: its applications, services, the
 * guide, its policies. Now it is the whole site in one place, grouped the
 * way the header is, with every link a real route and every contact line
 * from lib/company. No model codes: the search finds those faster.
 */
export default async function Footer() {
  const [t, tNav, tCta, tFamily, tPolicies, year] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getTranslations("cta"),
    getTranslations("family"),
    getTranslations("policies"),
    copyrightYear(),
  ]);

  const columns: { title: string; links: { name: string; href: string; download?: boolean }[] }[] = [
    {
      title: tNav("products"),
      links: [
        { name: t("allProducts"), href: "/products" },
        { name: tFamily("INDOOR"), href: `/products?family=${familySlug("INDOOR")}` },
        { name: tFamily("OUTDOOR"), href: `/products?family=${familySlug("OUTDOOR")}` },
        { name: tFamily("CHANDELIER"), href: `/products?family=${familySlug("CHANDELIER")}` },
        { name: t("offers"), href: "/products?sale=1&sort=discount" },
      ],
    },
    {
      title: t("solutions"),
      links: [
        { name: tNav("applications"), href: "/applications" },
        { name: tNav("services"), href: "/services" },
        { name: tNav("projects"), href: "/all-projects" },
      ],
    },
    {
      title: t("company"),
      links: [
        { name: tNav("about"), href: "/about-us" },
        { name: tNav("contact"), href: "/contact-us" },
      ],
    },
    {
      title: t("resources"),
      links: [
        { name: tNav("guide"), href: "/lighting-guide" },
        { name: t("faqs"), href: "/faqs" },
        { name: t("profile"), href: DOCUMENTS.portfolio, download: true },
      ],
    },
    {
      title: tPolicies("crumb"),
      links: POLICIES.map((policy) => ({ name: tPolicies(`names.${policy.id}`), href: policy.href })),
    },
  ];

  const social = [
    { icon: Instagram, label: "Instagram", href: SHOWROOM_SOCIAL.instagram },
    { icon: Facebook, label: "Facebook", href: SHOWROOM_SOCIAL.facebook },
    { icon: Youtube, label: "YouTube", href: SHOWROOM_SOCIAL.youtube },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <Container>
        <div className="grid gap-12 py-16 lg:grid-cols-12 lg:gap-10 lg:py-20">
          <div className="space-y-6 lg:col-span-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold transition-colors duration-[var(--dur-hover)] hover:text-primary"
            >
              {t("brandName")}
            </Link>
            <p className="max-w-sm text-pretty text-[length:var(--text-sm)] text-muted-foreground">{t("brandDescription")}</p>

            <address className="space-y-3 text-[length:var(--text-sm)] not-italic">
              <a
                href={`tel:${COMPANY.phones.showroom}`}
                dir="ltr"
                className="block font-[family-name:var(--font-display-face)] text-[length:var(--text-lg)] font-medium tabular-nums transition-colors duration-[var(--dur-hover)] hover:text-primary rtl:text-right"
              >
                {displayPhone(COMPANY.phones.showroom)}
              </a>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <a href={SHOWROOM_WHATSAPP} target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline">
                  {t("whatsapp")}
                </a>
                <a href={SHOWROOM_MAP} target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline">
                  {t("directions")}
                </a>
              </p>
              <p className="text-muted-foreground">{tCta("address")}</p>
              <p className="text-muted-foreground">{tCta("workingHours")}</p>
            </address>

            <ul className="flex gap-2">
              {social.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-md border border-border text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label={t("sitemap")} className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-5">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-[length:var(--text-xs)] font-semibold text-muted-foreground">{column.title}</h2>
                <ul className="mt-4 space-y-2.5 text-[length:var(--text-sm)]">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {link.download ? (
                        <a href={link.href} download className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline">
                          {link.name}
                        </a>
                      ) : (
                        <Link href={link.href} className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline">
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-border py-6 text-[length:var(--text-xs)] text-muted-foreground sm:flex-row sm:items-center">
          <p>{t("copyright", { year, brand: t("legalName") })}</p>
          <p>{t("agency")}</p>
          <ChangeTheme />
        </div>
      </Container>
    </footer>
  );
}

/**
 * The year, cached for a day. Reading the clock while rendering keeps a
 * page from prerendering, and this footer is on every page.
 */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
