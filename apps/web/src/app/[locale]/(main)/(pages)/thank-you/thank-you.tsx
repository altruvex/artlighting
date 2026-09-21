"use client"

import { Container } from "@/components/container"
import { OrderLines, OrderTotals } from "@/components/order/order-lines"
import { Link } from "@/i18n/navigation"
import { calculateEstimatedDeliveryDate } from "@/lib/date"
import { formatNumber } from "@/lib/numbers"
import type { OrderView } from "@/lib/order-view"
import { CheckCircle2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useMemo } from "react"

/**
 * The order, placed. Its number, every product in it, where it is going
 * and what it came to — the figures stored on the order, not recomputed.
 */
export default function ThankYou({ order }: { order: OrderView }) {
  const t = useTranslations("thankYou")
  const locale = useLocale()
  const estimatedDelivery = useMemo(() => calculateEstimatedDeliveryDate(locale === "ar" ? "ar" : "en"), [locale])
  const address = order.shippingAddress

  return (
    <div className="py-10 md:py-14">
      <Container>
        <header className="mb-10 flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary/12 text-primary">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <h1 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-3xl)] font-semibold">
            {t("pageTitle")}
          </h1>
          <p className="max-w-xl text-muted-foreground">{t("orderReceived")}</p>
          <p className="rounded-full border border-border px-4 py-1.5 text-[length:var(--text-sm)]">
            {t("orderNumber")}{" "}
            <span className="font-semibold tabular-nums">#{formatNumber(order.id, locale === "ar" ? "ar" : "en")}</span>
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="space-y-8">
            <OrderLines lines={order.lines} />
            {address && (
              <section className="grid gap-6 rounded-2xl border border-border bg-card/50 p-5 sm:grid-cols-2 sm:p-6">
                <div className="space-y-2">
                  <h2 className="font-semibold">{t("shippingAddress")}</h2>
                  <address className="text-[length:var(--text-sm)] not-italic leading-relaxed text-muted-foreground">
                    {address.fullName}
                    <br />
                    <span dir="ltr">{address.phoneNumber}</span>
                    <br />
                    {address.address}
                    <br />
                    {[address.city, address.state, address.country].filter(Boolean).join("، ")}
                  </address>
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold">{t("estimatedDeliveryDate")}</h2>
                  <p className="text-[length:var(--text-sm)] text-muted-foreground">{estimatedDelivery}</p>
                </div>
              </section>
            )}
            <p className="text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{t("greatChoice")}</span> {t("qualityDescription")}
            </p>
          </div>

          <OrderTotals order={order}>
            <Link
              href="/products"
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground transition-transform duration-[var(--dur-press)] active:scale-[0.98]"
            >
              {t("continueShopping")}
            </Link>
          </OrderTotals>
        </div>
      </Container>
    </div>
  )
}
