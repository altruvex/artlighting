"use client"

import { addMoney, applyRate, clampNonNegative, money, type MoneyInput, multiplyMoney, subtractMoney } from "@repo/money"
import { formatNumberWithConversion } from "@/lib/numbers"
import { useLocale } from "next-intl"

type RoundingMode = "round" | "ceil" | "floor"

interface DiscountPriceProps {
  price: MoneyInput
  /** Rate, not percent: 0.13 = 13%. */
  discount?: MoneyInput
  quantity?: number
  shippingPrice?: MoneyInput
  sectionType?: string
  priceIncrease?: MoneyInput
  lampPriceIncrease?: MoneyInput
}

export default function DiscountPrice({
  price,
  discount = 0,
  quantity = 1,
  shippingPrice = 0,
  priceIncrease = 0,
  lampPriceIncrease = 0,
}: DiscountPriceProps) {
  const locale = useLocale()

  // `discount` is a rate (0.13 = 13%). This used to guess with
  // `discount > 1 ? discount / 100 : discount` and round each step with
  // Math.ceil, which drifted from what the server charged.
  const discountedBase = clampNonNegative(subtractMoney(price, applyRate(price, discount)))
  const unitPriceWithIncreases = addMoney(discountedBase, priceIncrease, lampPriceIncrease)
  const itemsTotal = multiplyMoney(unitPriceWithIncreases, Math.max(1, quantity))
  const finalTotal = addMoney(itemsTotal, money(shippingPrice))

  const formattedFinal = formatNumberWithConversion(finalTotal, locale)

  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-destructive">
        {formattedFinal}
      </p>
    </div>
  )
}
