import { PromoBar } from "@/components/promo-bar"
import { activePromotions, byStrength } from "@/lib/promotions.server"
import Footer from "@/components/footer/footer"
import HeaderWrapper from "@/components/header/header-wrapper"
import type React from "react"

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

  return (
    <>
      <PromoBar promotions={promotions} />
      <HeaderWrapper locale={locale} />
      <main role="main">{children}</main>
      <Footer />
    </>
  );
}
