"use client"

import { addMoney, type MoneyInput, multiplyMoney } from "@repo/money"
import type { ProductFamily } from "@repo/catalog/families";
import { formatNumberWithConversion } from "@/lib/numbers"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

type ProductPrices = {
  price: MoneyInput
  quantity?: number
  shippingPrice?: MoneyInput
  sectionType?: ProductFamily
  className?: string
}

/**
 * A price, inline.
 *
 * It rendered a `<div>` wrapping a `<p>`, so every caller that put a price
 * inside a sentence — "save 1,496.70", a struck-through was-price — nested
 * a block inside phrasing content and logged a hydration error. A price is
 * a phrase; it is a span, and the caller styles it.
 */
export default function NormalPrice({ price, quantity = 1, shippingPrice = 0, className }: ProductPrices) {
  const locale = useLocale()

  // Decimal arithmetic: price × quantity + shipping, no float rounding.
  const total = addMoney(multiplyMoney(price, quantity), shippingPrice)

  return <span className={cn("tabular-nums", className)}>{formatNumberWithConversion(total, locale)}</span>
}
