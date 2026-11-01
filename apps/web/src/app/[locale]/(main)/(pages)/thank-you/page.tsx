import { auth } from "@/lib/auth-server"
import { orderForCustomer, toOrderView } from "@/lib/checkout.server"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { redirect } from "@/i18n/navigation"
import { PagePropsTypes } from "@/types"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import ThankYou from "./thank-you"

// Everything here is the signed-in customer's own order — nothing is shared
// between visitors to prefetch, so this page blocks instead.
export const instant = false

/**
 * After the order. Scoped to the signed-in customer: it found the order by
 * id alone, so any order's address and phone were one URL away.
 */
export default async function Page({ params, searchParams }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params)
  const orderId = Number((await searchParams)?.orderId)

  const { userId } = await auth()
  if (!userId) redirect({ href: "/sign-in", locale })

  const order = await orderForCustomer(orderId, userId!, locale)
  if (!order) notFound()
  // Not confirmed yet: the review step is where it is confirmed.
  if (!order.isCompleted) redirect({ href: `/complete?orderId=${order.id}`, locale })

  return <ThankYou order={toOrderView(order, locale)} />
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params)
  const t = await getTranslations({ locale, namespace: "thankYou" })
  return { title: t("pageTitle"), robots: { index: false, follow: false } }
}
