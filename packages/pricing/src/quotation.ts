import {
  applyRate,
  clampNonNegative,
  type MoneyInput,
  money,
  roundMoney,
  serializeMoney,
  subtractMoney,
  sumMoney,
} from "@repo/money";

/**
 * Quotation arithmetic, shared by the editor (live totals) and the server
 * (the figures that are stored and printed), so the number the admin watched
 * change is the number the customer reads.
 *
 * Order of operations, as on a paper quotation:
 *   line total = qty × unit price − line discount     (each line rounded)
 *   subtotal   = Σ line totals
 *   discount   = rate × subtotal, or a fixed amount   (never above subtotal)
 *   tax        = tax rate × (subtotal − discount)
 *   grand      = subtotal − discount + tax
 *
 * Every rate is a fraction (0.14 = 14%), the codebase's one convention.
 */

export interface QuotationLineInput {
  quantity: number;
  unitPrice: MoneyInput;
  /** 0.1 = 10%. */
  discountRate?: MoneyInput | null;
}

export type QuotationDiscountInput =
  | { type: "PERCENTAGE"; rate: MoneyInput }
  | { type: "FIXED"; amount: MoneyInput }
  | null;

export interface QuotationLineTotals {
  gross: string;
  discount: string;
  lineTotal: string;
}

export interface QuotationTotals {
  lines: QuotationLineTotals[];
  subtotal: string;
  discountTotal: string;
  taxableAmount: string;
  taxTotal: string;
  grandTotal: string;
}

export function computeQuotationTotals(input: {
  lines: QuotationLineInput[];
  discount?: QuotationDiscountInput;
  taxRate?: MoneyInput | null;
}): QuotationTotals {
  const lines = input.lines.map((line) => {
    const quantity = Number.isFinite(line.quantity) ? Math.max(0, Math.trunc(line.quantity)) : 0;
    const gross = roundMoney(money(line.unitPrice).times(quantity));
    const discount = applyRate(gross, line.discountRate ?? 0);
    return { gross, discount, lineTotal: clampNonNegative(subtractMoney(gross, discount)) };
  });

  const subtotal = sumMoney(lines.map((line) => line.lineTotal));

  const discount = input.discount;
  const rawDiscount =
    !discount
      ? money(0)
      : discount.type === "PERCENTAGE"
        ? applyRate(subtotal, discount.rate)
        : roundMoney(discount.amount);
  const discountTotal = clampNonNegative(
    rawDiscount.greaterThan(subtotal) ? subtotal : rawDiscount,
  );

  const taxableAmount = subtractMoney(subtotal, discountTotal);
  const taxTotal = applyRate(taxableAmount, input.taxRate ?? 0);
  const grandTotal = taxableAmount.plus(taxTotal);

  return {
    lines: lines.map((line) => ({
      gross: serializeMoney(line.gross),
      discount: serializeMoney(line.discount),
      lineTotal: serializeMoney(line.lineTotal),
    })),
    subtotal: serializeMoney(subtotal),
    discountTotal: serializeMoney(discountTotal),
    taxableAmount: serializeMoney(taxableAmount),
    taxTotal: serializeMoney(taxTotal),
    grandTotal: serializeMoney(grandTotal),
  };
}
