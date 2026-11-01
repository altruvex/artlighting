"use client"

import NormalPrice from "@/components/price/normal-price"
import { Link } from "@/i18n/navigation"
import { formatNumber } from "@/lib/numbers"
import type { OrderLineView, OrderView } from "@/lib/order-view"
import { cn } from "@/lib/utils"
import { money } from "@repo/money"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"

/**
 * The products in an order, one row each.
 *
 * The same rows on the address step, the review and the thank-you page:
 * what it is, what was chosen for it, how many at what unit price, what the
 * discount took off and what the line came to — every figure the one
 * stored on the order.
 */
export function OrderLines({ lines }: { lines: OrderLineView[] }) {
  const t = useTranslations("order")

  return (
    <section aria-labelledby="order-lines-heading">
      <h2 id="order-lines-heading" className="eyebrow pb-3">
        {t("products")}
      </h2>
      <ul className="divide-y divide-border border-y border-border">
        {lines.map((line) => (
          <OrderLineRow key={line.id} line={line} />
        ))}
      </ul>
    </section>
  )
}

function OrderLineRow({ line }: { line: OrderLineView }) {
  const t = useTranslations("order")
  const locale = useLocale()
  const n = (value: number) => formatNumber(value, locale === "ar" ? "ar" : "en")
  const discounted = money(line.discountAmount).greaterThan(0)

  const name = line.href ? (
    <Link href={line.href} className="font-semibold underline-offset-4 transition-colors duration-[var(--dur-hover)] hover:underline">
      {line.name}
    </Link>
  ) : (
    <span className="font-semibold">{line.name}</span>
  )

  return (
    <li className="flex gap-4 py-5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-muted sm:size-24">
        {line.image && <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {name}
        {(line.bulb || line.productIp) && (
          <p className="text-[length:var(--text-sm)] text-muted-foreground">
            {line.bulb && (
              <span>
                {t("bulb")}: {line.bulb.name}
              </span>
            )}
            {line.bulb && line.productIp && <span aria-hidden> · </span>}
            {line.productIp && (
              <span>
                {t("protection")}: <span dir="ltr">{line.productIp}</span>
              </span>
            )}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-1 text-[length:var(--text-sm)] tabular-nums text-muted-foreground">
          <span className="sr-only">{t("quantity")}: </span>
          {n(line.quantity)} <span aria-hidden>×</span> <NormalPrice price={line.unitPrice} />
          <span className="sr-only"> {t("each")}</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-end">
        <span className="font-semibold tabular-nums">
          <NormalPrice price={line.lineTotal} />
        </span>
        {discounted && (
          <span className="text-[length:var(--text-xs)] font-medium tabular-nums text-primary">
            −<NormalPrice price={line.discountAmount} />
          </span>
        )}
      </div>
    </li>
  )
}

/** What the order comes to: subtotal, discounts, shipping, total. */
export function OrderTotals({ order, children }: { order: OrderView; children?: React.ReactNode }) {
  const t = useTranslations("order")
  const locale = useLocale()
  const hasDiscount = money(order.discountTotal).greaterThan(0)

  return (
    <section
      aria-labelledby="order-totals-heading"
      className="rounded-md border border-border bg-card/40 p-5 sm:p-6 lg:sticky lg:top-24"
    >
      <h2 id="order-totals-heading" className="eyebrow mb-4">
        {t("summary")}
      </h2>
      <p className="mb-4 text-[length:var(--text-sm)] text-muted-foreground">
        {t("count", {
          count: order.itemCount,
          formatted: formatNumber(order.itemCount, locale === "ar" ? "ar" : "en"),
        })}
      </p>
      <dl className="space-y-3 text-[length:var(--text-sm)]">
        <Row label={t("subtotal")}>
          <NormalPrice price={order.subtotal} />
        </Row>
        {hasDiscount && (
          <Row label={t("discounts")} accent>
            −<NormalPrice price={order.discountTotal} />
          </Row>
        )}
        <Row label={t("shipping")}>
          <NormalPrice price={order.shippingPrice} />
        </Row>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="text-[length:var(--text-base)] font-semibold">{t("total")}</dt>
          <dd className="text-end font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold tabular-nums">
            <NormalPrice price={order.totalPrice} />
          </dd>
        </div>
      </dl>
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}

/** A label and its figure. `accent` marks the one figure that is in the shopper's favour — the figure, not the label. */
function Row({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-end tabular-nums", accent && "font-medium text-primary")}>{children}</dd>
    </div>
  )
}
