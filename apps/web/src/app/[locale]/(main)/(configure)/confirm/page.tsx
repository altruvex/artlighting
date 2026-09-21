import { auth } from "@/lib/auth-server"
import { orderForCustomer, toOrderView } from "@/lib/checkout.server"
import { getLocaleFromParams } from "@/lib/i18n/utils"
import { redirect } from "@/i18n/navigation"
import { PagePropsTypes } from "@/types"
import { prisma } from "@repo/database"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import Confirm from "./confirm"

/**
 * The address step.
 *
 * It loaded the order by id alone — anyone could read anyone's order by
 * changing the number in the URL — and then rendered it on the client from
 * a second fetch. The order is loaded here, scoped to the signed-in
 * customer, and handed to the form.
 */
export default async function Page({ params, searchParams }: PagePropsTypes) {
  const locale = getLocaleFromParams(await params)
  const orderId = Number((await searchParams)?.orderId)

  const { userId } = await auth()
  if (!userId) redirect({ href: "/sign-in", locale })

  const order = await orderForCustomer(orderId, userId!, locale)
  if (!order) notFound()
  if (order.isCompleted) redirect({ href: `/thank-you?orderId=${order.id}`, locale })

  // The customer's saved address, including the name and phone the account
  // already has when no address has been typed yet.
  const saved = await prisma.shippingAddress.findUnique({ where: { userId: userId! } })

  return (
    <Confirm
      order={toOrderView(order, locale)}
      prefill={{
        fullName: saved?.fullName ?? "",
        phoneNumber: saved?.phoneNumber ?? "",
        address: saved?.address ?? "",
        city: saved?.city ?? "",
        state: saved?.state ?? "",
        zipCode: saved?.zipCode ?? "",
        country: saved?.country ?? "",
      }}
    />
  )
}

export async function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  const locale = getLocaleFromParams(await params)
  const t = await getTranslations({ locale, namespace: "confirm" })
  // A checkout step is the customer's own page; nothing here belongs in search.
  return { title: t("title"), robots: { index: false, follow: false } }
}
