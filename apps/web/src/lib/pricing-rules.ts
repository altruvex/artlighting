// Client-safe on purpose: the buy box prints the same figures the server
// stores, so both import this file. `import type` keeps the Prisma client
// out of the browser bundle.
import type { ProductIP } from "@repo/database"
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

export const IP_NUMERIC: Record<ProductIP, number> = {
    IP20: 20,
    IP44: 44,
    IP54: 54,
    IP65: 65,
    IP68: 68,
}

/** An unrecognised rating (the legacy spec column stored "20", not "IP20") reads as the floor. */
function ipRate(ip: ProductIP): number {
    return PRODUCT_IP_RULES[ip]?.increaseOnPricePercent ?? 0
}

/**
 * The IP upgrade, as serialized money. Rounded up to the piastre: the old
 * version used Math.ceil on a float, which rounded to whole pounds and gave
 * a different answer than the price shown next to the button.
 *
 * Measured from the fixture's own rating, not from IP20: a product stored
 * at IP44 is already priced as IP44, so IP44 costs nothing on it and IP65
 * costs only the step from 44 to 65. A base of IP20 gives the old figures.
 */
export function calculateIpPriceIncrease(basePrice: MoneyInput, ip: ProductIP, baseIp: ProductIP = "IP20"): string {
    const rate = Decimal.max(0, new Decimal(ipRate(ip)).minus(ipRate(baseIp)))
    return serializeMoney(money(basePrice).times(rate).toDecimalPlaces(2, Decimal.ROUND_UP))
}

/**
 * The ratings a customer may choose for a fixture: from its own rating up
 * to its maximum (the fixture's own rating is always offered, even when the
 * stored maximum is below it). The buy box lists exactly these chips; the
 * server accepts exactly these values.
 */
export function availableIps(baseIp: ProductIP, maxIP: number | null | undefined): ProductIP[] {
    const floor = IP_NUMERIC[baseIp] ?? IP_NUMERIC.IP20
    const ceiling = Math.max(floor, maxIP ?? IP_NUMERIC.IP20)
    return (Object.keys(IP_NUMERIC) as ProductIP[]).filter((ip) => IP_NUMERIC[ip] >= floor && IP_NUMERIC[ip] <= ceiling)
}
