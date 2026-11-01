"use client"

import { Onward } from "@/components/editorial/arrow"
import { CHECKOUT_GRID } from "@/components/order/checkout-header"
import { OrderLines, OrderTotals } from "@/components/order/order-lines"
import { SECTION_FRAME } from "@/components/section-heading"
import { Link } from "@/i18n/navigation"
import { COMPANY, displayPhone } from "@/lib/company"
import { calculateEstimatedDeliveryDate } from "@/lib/date"
import { formatIndex, formatNumber } from "@/lib/numbers"
import type { OrderView } from "@/lib/order-view"
import { useLocale, useTranslations } from "next-intl"
import { useMemo } from "react"

/**
 * The order, placed: its number, what happens next, and every product in
 * it with the figures stored on the order.
 *
 * It closed with "an industry-leading 3-year warranty on all our
 * products" — a promise nothing the company has written makes. What
 * happens next is now the same three steps the confirmation email lists.
 */
export default function ThankYou({ order }: { order: OrderView }) {
  const t = useTranslations("thankYou")
  const locale = useLocale()
  const estimatedDelivery = useMemo(() => calculateEstimatedDeliveryDate(locale === "ar" ? "ar" : "en"), [locale])
  const address = order.shippingAddress
  const steps = [t("next1"), t("next2"), t("next3")]

  return (
    <>
      <header className={`${SECTION_FRAME} pt-12 pb-10 lg:pt-16 lg:pb-14`}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-3 text-[length:var(--text-4xl)] font-medium leading-[1.05] ltr:tracking-tight rtl:leading-[1.3]">{t("pageTitle")}</h1>
        <p className="lede mt-4 max-w-2xl">{t("orderReceived")}</p>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6 text-[length:var(--text-sm)]">
          <div>
            <dt className="text-muted-foreground">{t("orderNumber")}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold tabular-nums">
              #{formatNumber(order.id, locale === "ar" ? "ar" : "en")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("estimatedDeliveryDate")}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold tabular-nums">{estimatedDelivery}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("payment")}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold">{t("cod")}</dd>
          </div>
        </dl>
      </header>

      <div className={CHECKOUT_GRID}>
        <div className="space-y-12">
          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="eyebrow pb-3">{t("nextTitle")}</h2>
            <ol className="border-t border-border">
              {steps.map((step, index) => (
                <li key={index} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-border py-5">
                  <span className="index-numeral pt-0.5">{formatIndex(index + 1, locale)}</span>
                  <p className="text-pretty">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[length:var(--text-sm)] text-muted-foreground">{t("emailNote")}</p>
          </section>

          <OrderLines lines={order.lines} />

          {address && (
            <section aria-labelledby="address-heading">
              <h2 id="address-heading" className="eyebrow pb-3">{t("shippingAddress")}</h2>
              <address className="border-t border-border pt-5 text-[length:var(--text-sm)] not-italic leading-relaxed text-muted-foreground">
                {address.fullName}
                <br />
                <span dir="ltr">{address.phoneNumber}</span>
                <br />
                {address.address}
                <br />
                {[address.city, address.state, address.country].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
              </address>
            </section>
          )}
        </div>

        <OrderTotals order={order}>
          <div className="space-y-3">
            <Link
              href="/products"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-[transform,background-color] duration-[var(--dur-press)] ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.98]"
            >
              {t("continueShopping")}
              <Onward />
            </Link>
            <p className="text-center text-[length:var(--text-sm)] text-muted-foreground">
              {t("questions")}{" "}
              <a href={`tel:${COMPANY.phones.showroom}`} dir="ltr" className="font-medium tabular-nums text-foreground transition-colors duration-[var(--dur-hover)] hover:text-primary">
                {displayPhone(COMPANY.phones.showroom)}
              </a>
            </p>
          </div>
        </OrderTotals>
      </div>
    </>
  )
}
