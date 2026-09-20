import { ProductIP } from "@repo/database"
import { Decimal, money, type MoneyInput, serializeMoney } from "@repo/money"

export const PRODUCT_IP_RULES: Record<
    ProductIP,
    {
        increaseOnPricePercent: number
    }
> = {
    IP20: {
        increaseOnPricePercent: 0,
    },
    IP44: {
        increaseOnPricePercent: 0.02,
    },
    IP54: {
        increaseOnPricePercent: 0.04,
    },
    IP65: {
        increaseOnPricePercent: 0.06,
    },
    IP68: {
        increaseOnPricePercent: 0.08,
    },
}

/**
 * The IP upgrade, as serialized money. Rounded up to the piastre: the old
 * version used Math.ceil on a float, which rounded to whole pounds and gave
 * a different answer than the price shown next to the button.
 */
export function calculateIpPriceIncrease(basePrice: MoneyInput, ip: ProductIP): string {
    const rule = PRODUCT_IP_RULES[ip]
    if (!rule) return serializeMoney(0)
    return serializeMoney(money(basePrice).times(rule.increaseOnPricePercent).toDecimalPlaces(2, Decimal.ROUND_UP))
}
