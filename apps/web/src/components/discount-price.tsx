"use client"

import { money, type MoneyInput } from "@repo/money"
import type { ProductFamily } from "@repo/catalog/families";
import { formatNumberWithConversion } from "@/lib/numbers"
import { priceLine } from "@/lib/pricing"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

interface DiscountPriceProps {
  price: MoneyInput
  /** Rate, not percent: 0.13 = 13%. */
  discount?: MoneyInput
  quantity?: number
  shippingPrice?: MoneyInput
  sectionType?: ProductFamily
  priceIncrease?: MoneyInput
  lampPriceIncrease?: MoneyInput
  className?: string
}

export default function DiscountPrice({
  price,
  discount = 0,
  quantity = 1,
  shippingPrice = 0,
  priceIncrease = 0,
  lampPriceIncrease = 0,
  className,
}: DiscountPriceProps) {
  const locale = useLocale()

  // Through priceLine, the one owner of how a line is assembled. This used
  // to discount the base price and then add the wattage and bulb upgrades
  // on top undiscounted, so a configured chandelier was quoted more here
  // than the cart and the order went on to charge.
  const { total } = priceLine({
    unitPrice: price,
    quantity: Math.max(1, quantity),
    priceIncrease,
    lampPriceIncrease,
    discountRate: discount,
    shippingPrice,
  })

  return <span className={cn("tabular-nums", className)}>{formatNumberWithConversion(money(total), locale)}</span>
}
