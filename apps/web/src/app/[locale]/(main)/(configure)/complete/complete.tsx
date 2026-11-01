"use client"

import { confirmOrder } from "@/actions/checkout"
import { CHECKOUT_GRID, CheckoutHeader } from "@/components/order/checkout-header"
import { OrderLines, OrderTotals } from "@/components/order/order-lines"
import { orderErrorText } from "@/components/order/order-error"
import { Button } from "@repo/ui/components/button"
import { useRouter } from "@/i18n/navigation"
import { notifyCartChanged } from "@/lib/cart-events"
import { calculateEstimatedDeliveryDate } from "@/lib/date"
import type { OrderView } from "@/lib/order-view"
import { CheckCircle, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useTransition } from "react"
import { toast } from "sonner"

/**
 * The review step: every product, where it is going, what it comes to,
 * and one button to place it.
 *
 * It rendered a table built for a single product — one row, a column set
 * chosen by that product's brand — and recomputed the price in the browser
 * from the configuration row. It renders the order's lines and the totals
 * stored when the order was placed.
 */
export default function Complete({ order }: { order: OrderView }) {
  const t = useTranslations("complete")
  const tOrder = useTranslations("order")
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startConfirm] = useTransition()

  const estimatedDelivery = useMemo(() => calculateEstimatedDeliveryDate(locale === "ar" ? "ar" : "en"), [locale])
  const address = order.shippingAddress!
  // Delivery inside Cairo is the flat rate on the order; anywhere else the
  // showroom calls with a price, as it always has.
  const inCairo = /cairo|القاهرة/i.test(`${address.state} ${address.city}`.replace(/\s/g, ""))

  const onConfirm = () =>
    startConfirm(async () => {
      const result = await confirmOrder(order.id)
      if (!result.ok) {
        toast.error(t("complete-notifications.error.title"), { description: orderErrorText(tOrder as never, locale, result) })
        return
      }
      // The server took these products out of the cart; the header's badge
      // has to hear it, or it keeps counting them on the thank-you page.
      notifyCartChanged()
      toast.success(t("complete-notifications.success"))
      router.push(`/thank-you?orderId=${order.id}`)
    })

  return (
    <>
      <CheckoutHeader eyebrow={t("eyebrow")} title={t("title")} lede={<p>{t("description")}</p>} />
        <div className={CHECKOUT_GRID}>
          <div className="space-y-12">
            <OrderLines lines={order.lines} />

            <section aria-labelledby="delivery-heading">
              <h2 id="delivery-heading" className="eyebrow pb-3">
                {t("shippingInformation")}
              </h2>
              <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="font-semibold">{t("shippingAddress")}</p>
                <address className="text-[length:var(--text-sm)] not-italic leading-relaxed text-muted-foreground">
                  {address.fullName}
                  <br />
                  <span dir="ltr">{address.phoneNumber}</span>
                  <br />
                  {address.address}
                  <br />
                  {[address.city, address.state, address.country].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
                </address>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">{t("deliveryDetails")}</p>
                <p className="text-[length:var(--text-sm)] text-muted-foreground">
                  {inCairo ? t("cairoDelivery") : t("willContactForShippingPrice")}
                </p>
                {inCairo && (
                  <p className="text-[length:var(--text-sm)] text-muted-foreground">
                    {t("estimatedDeliveryDate")} <span className="tabular-nums text-foreground">{estimatedDelivery}</span>
                  </p>
                )}
                <p className="text-[length:var(--text-sm)] text-muted-foreground">{t("payment")}</p>
              </div>
              </div>
            </section>
          </div>

          <OrderTotals order={order}>
            <Button onClick={onConfirm} disabled={isPending} className="h-12 w-full text-base font-semibold">
              {isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  {t("orderProcessing")}
                </>
              ) : (
                <>
                  <CheckCircle className="size-5" aria-hidden />
                  {t("completeYourOrder")}
                </>
              )}
            </Button>
          </OrderTotals>
        </div>
    </>
  )
}
