"use client"

import { addMoney, type MoneyInput, multiplyMoney } from "@repo/money"
import { formatNumberWithConversion } from "@/lib/numbers"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

type ProductPrices = {
  price: MoneyInput
  quantity?: number
  shippingPrice?: MoneyInput
  sectionType?: string
  className?: string
}

export default function NormalPrice({ price, quantity = 1, shippingPrice = 0, className }: ProductPrices) {
  const locale = useLocale()

  // Decimal arithmetic: price × quantity + shipping, no float rounding.
  const total = addMoney(multiplyMoney(price, quantity), shippingPrice)
  const formattedTotalPrice = formatNumberWithConversion(total, locale)

  return (
    <div>
      <p className={cn("", className)}>{formattedTotalPrice}</p>
    </div>
  )
}
