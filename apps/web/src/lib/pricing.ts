import { addMoney, applyRate, clampNonNegative, money, type MoneyInput, multiplyMoney, subtractMoney } from "@repo/money";

/**
 * The one place that knows how a line's price is assembled, so the cart, the
 * configure flow and order creation can't drift apart.
 *
 * `Product.discount` (and `Configuration.discount`) is a RATE: 0.13 means
 * 13%. The cart used to compute `price * qty * (1 - discount / 100)`, which
 * turned a 13% discount into 0.13% — the storefront was charging nearly full
 * price on discounted products. Everything now goes through `applyRate`.
 *
 * Phase 3 replaces this with the shared discounts engine; until then this is
 * deliberately small and has one owner.
 */
export interface LinePricingInput {
  unitPrice: MoneyInput;
  quantity: number;
  /** Extras added to the unit price (wattage upgrade, lamp choice). */
  priceIncrease?: MoneyInput | null;
  lampPriceIncrease?: MoneyInput | null;
  /** Fraction, not percent: 0.13 = 13%. */
  discountRate?: MoneyInput | null;
  shippingPrice?: MoneyInput | null;
}

export interface LinePricing {
  unitConfigPrice: string;
  subtotal: string;
  discountAmount: string;
  shippingPrice: string;
  total: string;
}

export function priceLine({
  unitPrice,
  quantity,
  priceIncrease = 0,
  lampPriceIncrease = 0,
  discountRate = 0,
  shippingPrice = 0,
}: LinePricingInput): LinePricing {
  const unitConfigPrice = addMoney(unitPrice, priceIncrease ?? 0, lampPriceIncrease ?? 0);
  const subtotal = multiplyMoney(unitConfigPrice, quantity);
  const discountAmount = applyRate(subtotal, discountRate ?? 0);
  const shipping = money(shippingPrice ?? 0);
  const total = clampNonNegative(addMoney(subtractMoney(subtotal, discountAmount), shipping));

  // Strings: these cross API responses, the cache and client components.
  return {
    unitConfigPrice: unitConfigPrice.toFixed(2),
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    shippingPrice: shipping.toFixed(2),
    total: total.toFixed(2),
  };
}

/** Unit price after its discount rate — what a cart row shows per item. */
export function discountedUnitPrice(unitPrice: MoneyInput, discountRate: MoneyInput | null | undefined): string {
  const price = money(unitPrice);
  return clampNonNegative(price.minus(applyRate(price, discountRate ?? 0))).toFixed(2);
}
