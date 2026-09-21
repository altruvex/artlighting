import { PromoBar } from "@/components/promo-bar"
import { activePromotions, byStrength } from "@/lib/promotions.server"
import Footer from "@/components/footer/footer"
import HeaderWrapper from "@/components/header/header-wrapper"
import type React from "react"
import { getTranslations } from "next-intl/server"

export default async function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  // Read from the live Discount rows, so the bar offers exactly what the
  // cart will price. A promotion ending or running out drops off here too.
  const promotions = byStrength(await activePromotions());
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
      <PromoBar promotions={promotions} />
      <HeaderWrapper locale={locale} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
