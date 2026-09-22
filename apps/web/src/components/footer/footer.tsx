import { SHOWROOM_PHONE, SHOWROOM_SOCIAL, SHOWROOM_WHATSAPP } from "@/lib/showroom"
import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@repo/catalog/families";
import { Facebook, Instagram, MessageCircle, Phone, Youtube } from "lucide-react";
import { useTranslations } from "next-intl";
import ChangeTheme from "../theme-changer";

/**
 * The footer.
 *
 * It was a link farm: five columns, twenty-seven chandelier model codes
 * among them, every heading bold gold at 20px — the widest, loudest part
 * of the page, on every page. Nobody navigates a shop by model code; the
 * shop page filters by family and type, and the search finds a code
 * faster than a column of them.
 *
 * What is left is what a footer is for: the four ways into the catalogue,
 * the company pages, a way to reach a human, and the legal line.
 */
export default function Footer() {
  const t = useTranslations("footer");
  const tCta = useTranslations("cta");
  const tFamily = useTranslations("family");

  const shop = [
    { name: t("allProducts"), href: "/products" },
    { name: tFamily("CHANDELIER"), href: `/products?family=${familySlug("CHANDELIER")}` },
    { name: tFamily("INDOOR"), href: `/products?family=${familySlug("INDOOR")}` },
    { name: tFamily("OUTDOOR"), href: `/products?family=${familySlug("OUTDOOR")}` },
    { name: t("offers"), href: "/products?sale=1&sort=discount" },
  ];

  const company = [
    { name: t("aboutUs"), href: "/about-us" },
    { name: t("projects"), href: "/all-projects" },
    { name: t("blog"), href: "/blog" },
    { name: t("faqs"), href: "/faqs" },
    { name: t("privacyPolicy"), href: "/privacy" },
  ];

  const social = [
    { icon: Instagram, label: "Instagram", href: SHOWROOM_SOCIAL.instagram },
    { icon: Facebook, label: "Facebook", href: SHOWROOM_SOCIAL.facebook },
    { icon: Youtube, label: "YouTube", href: SHOWROOM_SOCIAL.youtube },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="space-y-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold transition-colors duration-[var(--dur-hover)] hover:text-primary"
            >
              {t("brandName")}
            </Link>
            <p className="max-w-xs text-[length:var(--text-sm)] text-muted-foreground">{t("brandDescription")}</p>
            <ul className="flex gap-2">
              {social.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:border-primary hover:text-primary"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterColumn title={t("shop")} links={shop} />
          <FooterColumn title={t("company")} links={company} />

          <div className="space-y-4">
            <h3 className="text-[length:var(--text-sm)] font-semibold tracking-wide text-muted-foreground">
              {t("help")}
            </h3>
            <ul className="space-y-3 text-[length:var(--text-sm)]">
              <li>
                <a
                  href={`tel:${SHOWROOM_PHONE}`}
                  className="inline-flex items-center gap-2 transition-colors duration-[var(--dur-hover)] hover:text-primary"
                >
                  <Phone className="size-4 text-primary" aria-hidden />
                  <span dir="ltr" className="tabular-nums">+20 115 446 6259</span>
                </a>
              </li>
              <li>
                <a
                  href={SHOWROOM_WHATSAPP}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 transition-colors duration-[var(--dur-hover)] hover:text-primary"
                >
                  <MessageCircle className="size-4 text-primary" aria-hidden />
                  {t("whatsapp")}
                </a>
              </li>
              <li className="text-muted-foreground">{tCta("workingHours")}</li>
              <li className="text-muted-foreground">{tCta("address")}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <p className="text-[length:var(--text-sm)] text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear(), brand: t("brandName") })}
          </p>
          <ChangeTheme />
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[length:var(--text-sm)] font-semibold tracking-wide text-muted-foreground">{title}</h3>
      <ul className="space-y-2.5 text-[length:var(--text-sm)]">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:text-primary hover:underline"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
