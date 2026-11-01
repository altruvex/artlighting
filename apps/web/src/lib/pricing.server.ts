import { applyRate, clampNonNegative, compareMoney, money, type MoneyInput, multiplyMoney, roundMoney, serializeMoney, subtractMoney } from "@repo/money";

/**
 * Order/configuration pricing shown in the configure flow. Despite the file
 * name it runs on both sides, so it
 * stays free of server-only imports.
 *
 * Money in and out is a string (or Decimal); nothing here goes through a JS
 * number. `discount` is a RATE: 0.13 = 13%. The old version accepted either
 * a rate or a percentage and guessed with `discount > 1`, which silently
 * turned a 1.5% rate into 150%.
 */
export interface PricingCalculation {
  configPrice: string;
  totalPrice: string;
  quantity: number;
  discount: string;
  unitPriceAfterDiscount: string;
  hasDiscount: boolean;
  /** Whole percent, for display only ("13% off"). */
  discountPercentage: number;
  subtotal: string;
  discountAmount: string;
  finalTotal: string;
  shippingCost: string;
}

export class PricingService {
  private static readonly DEFAULT_SHIPPING_COST = "69";

  static calculateOrderPricing(
    configPrice: MoneyInput,
    totalPrice: MoneyInput,
    quantity: number,
    discount: MoneyInput,
    shippingCost: MoneyInput = PricingService.DEFAULT_SHIPPING_COST,
  ): PricingCalculation {
    const unitPrice = money(configPrice);
    const orderTotal = money(totalPrice);
    const rate = money(discount);
    const shipping = money(shippingCost);

    const subtotal = multiplyMoney(unitPrice, quantity);
    const hasDiscount = rate.greaterThan(0);
    const discountAmount = applyRate(subtotal, rate);
    const unitPriceAfterDiscount = quantity > 0 ? roundMoney(orderTotal.dividedBy(quantity)) : money(0);
    const finalTotal = clampNonNegative(orderTotal.plus(shipping));

    return {
      configPrice: serializeMoney(unitPrice),
      totalPrice: serializeMoney(orderTotal),
      quantity,
      discount: rate.toString(),
      unitPriceAfterDiscount: serializeMoney(unitPriceAfterDiscount),
      hasDiscount,
      discountPercentage: Math.round(rate.times(100).toNumber()),
      subtotal: serializeMoney(subtotal),
      discountAmount: serializeMoney(discountAmount),
      finalTotal: serializeMoney(finalTotal),
      shippingCost: serializeMoney(shipping),
    };
  }

  /** Line total after its discount, before shipping. */
  static calculateConfigurationPrice(
    basePrice: MoneyInput,
    priceIncrease: MoneyInput,
    lampPriceIncrease: MoneyInput,
    quantity: number,
    discount: MoneyInput,
  ): string {
    const unitPrice = money(basePrice).plus(money(priceIncrease)).plus(money(lampPriceIncrease));
    const subtotal = multiplyMoney(unitPrice, quantity);
    return serializeMoney(clampNonNegative(subtractMoney(subtotal, applyRate(subtotal, discount))));
  }

  /** True when two amounts differ — never compare money with `!==`. */
  static differs(a: MoneyInput, b: MoneyInput): boolean {
    return compareMoney(a, b) !== 0;
  }
}
