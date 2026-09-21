import { auth } from "@/lib/auth-server"
import { orderForCustomer, toOrderView } from "@/lib/checkout.server"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { redirect } from "@/i18n/navigation"
import { PagePropsTypes } from "@/types"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import Complete from "./complete"

/**
 * The review step. Loaded here, scoped to the signed-in customer — it used
 * to find the order by id alone, so the number in the URL was the only
 * thing between a stranger and someone's name, phone and address.
 */
export default async function Page({ params, searchParams }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params)
  const orderId = Number((await searchParams)?.orderId)

  const { userId } = await auth()
  if (!userId) redirect({ href: "/sign-in", locale })

  const order = await orderForCustomer(orderId, userId!, locale)
  if (!order) notFound()
  if (order.isCompleted) redirect({ href: `/thank-you?orderId=${order.id}`, locale })

  const view = toOrderView(order, locale)
  // No address yet means the address step was skipped; it comes first.
  if (!view.shippingAddress) redirect({ href: `/confirm?orderId=${order.id}`, locale })

  return <Complete order={view} />
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params)
  const t = await getTranslations({ locale, namespace: "complete" })
  return { title: t("title"), robots: { index: false, follow: false } }
}
