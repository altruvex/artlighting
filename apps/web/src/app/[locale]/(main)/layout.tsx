import { PromoBar } from "@/components/promo-bar"
import { activePromotions, byStrength } from "@/lib/promotions.server"
import Footer from "@/components/footer/footer"
import HeaderWrapper from "@/components/header/header-wrapper"
import { AssuranceStrip } from "@/components/assurance-strip"
import { OrganizationSchema } from "@/components/editorial/organization-schema"
import type React from "react"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

export default async function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>
}) {
  // Read from the live Discount rows, so the bar offers exactly what the
  // cart will price. A promotion ending or running out drops off here too.
  const promotions = byStrength(await activePromotions());

  return (
    <>
      {/* Only the skip-link text and the JSON-LD need the locale; both are
          invisible until focused or parsed, so an empty fallback matches
          what's on screen while they stream in. */}
      <Suspense>
        <LocaleAccessories params={params} />
      </Suspense>
      <PromoBar promotions={promotions} />
      <HeaderWrapper />
      <AssuranceStrip />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

async function LocaleAccessories({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "a11y" });

  return (
    <>
      {/* The first thing a keyboard reaches: past the promo bar, the mega
          menu and the search field, straight to the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-2 focus:z-[100] focus:mx-auto focus:w-max focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <OrganizationSchema locale={locale} />
    </>
  );
}
