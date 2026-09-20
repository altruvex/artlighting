import {
  addMoney,
  applyRate,
  clampNonNegative,
  money,
  multiplyMoney,
  roundMoney,
  serializeMoney,
  subtractMoney,
  sumMoney,
  type Decimal,
} from "@repo/money";
import type {
  AppliedDiscount,
  CartLine,
  DiscountRule,
  PricedLine,
  PricingInput,
  PricingResult,
  RejectedDiscount,
  RejectionReason,
} from "./types";

/**
 * What a cart costs.
 *
 * One pure function, used by the storefront to price a cart, by the
 * checkout to decide what to charge, and by the admin to preview "what
 * would this cart pay". Three implementations of these rules would be three
 * chances to disagree about a customer's total.
 *
 * Decimal throughout. A discount is rounded once, where it is computed,
 * rather than at every step.
 */

interface Candidate {
  rule: DiscountRule;
  /** The lines it covers. Empty for a CART-scoped discount. */
  lines: CartLine[];
  /** What it would take off, before any competition. */
  amount: Decimal;
}

function lineSubtotal(line: CartLine): Decimal {
  return multiplyMoney(line.unitPrice, line.quantity);
}

/** Which lines a discount covers. CART covers the order, not any line. */
function matchingLines(rule: DiscountRule, lines: CartLine[]): CartLine[] {
  switch (rule.scope) {
    case "PRODUCTS": {
      const ids = new Set(rule.productIds ?? []);
      return lines.filter((line) => ids.has(line.productId));
    }
    case "CATEGORIES": {
      const ids = new Set(rule.categoryIds ?? []);
      return lines.filter((line) => line.categoryIds.some((id) => ids.has(id)));
    }
    case "CART":
      return [];
  }
}

/**
 * Whether a rule is usable at all, ignoring what else is in the cart.
 *
 * Order matters for the message a customer sees: "expired" is more useful
 * than "below minimum order" when both are true.
 */
function rejectionFor(
  rule: DiscountRule,
  subtotal: Decimal,
  now: Date,
  customer: PricingInput["customer"],
): RejectionReason | null {
  if (rule.isActive === false) return "inactive";
  if (rule.startsAt && now < rule.startsAt) return "not_started";
  if (rule.endsAt && now >= rule.endsAt) return "expired";

  if (rule.usageLimit != null && (rule.usageCount ?? 0) >= rule.usageLimit) {
    return "usage_limit_reached";
  }
  if (rule.perCustomerLimit != null) {
    const used = customer?.redemptionsByDiscountId?.[rule.id] ?? 0;
    if (used >= rule.perCustomerLimit) return "customer_limit_reached";
  }
  // Against the undiscounted subtotal: a minimum that one discount can push
  // the cart below would let two discounts disagree about whether a third
  // qualifies, depending on the order they ran in.
  if (rule.minOrderValue != null && subtotal.lessThan(money(rule.minOrderValue))) {
    return "below_minimum_order";
  }
  return null;
}

/** What a rule takes off the base it applies to. Rounded once, here. */
function discountAmount(rule: DiscountRule, base: Decimal): Decimal {
  if (rule.type === "PERCENTAGE") {
    // `rate` is a rate: 0.13 is 13%. This is the one place that conversion
    // could go wrong, so it happens once.
    return roundMoney(applyRate(base, rule.rate ?? 0));
  }
  // A fixed amount never takes more than the base it applies to.
  return roundMoney(money(rule.amount ?? 0).greaterThan(base) ? base : money(rule.amount ?? 0));
}

export function computePricing(input: PricingInput): PricingResult {
  const now = input.now ?? new Date();
  const lines = input.lines;
  const typedCoupon = input.coupon?.trim().toUpperCase() || null;

  const subtotal = sumMoney(lines.map(lineSubtotal));

  const applied: AppliedDiscount[] = [];
  const rejected: RejectedDiscount[] = [];
  const reject = (rule: DiscountRule, reason: RejectionReason) =>
    rejected.push({ discountId: rule.id, name: rule.name, code: rule.code ?? null, reason });

  // A coupon the customer typed that matches nothing is the one rejection
  // with no rule behind it, and the one they most need to be told about.
  if (typedCoupon && !input.discounts.some((rule) => rule.code?.toUpperCase() === typedCoupon)) {
    rejected.push({ discountId: "", name: typedCoupon, code: typedCoupon, reason: "unknown_code" });
  }

  const candidates: Candidate[] = [];

  for (const rule of input.discounts) {
    // A coupon only counts when its code was typed; an automatic one never
    // needs to be.
    if (rule.mode === "COUPON") {
      const code = rule.code?.toUpperCase() ?? null;
      if (!code || code !== typedCoupon) {
        if (code && typedCoupon === null) continue; // not offered, not rejected
        reject(rule, "not_a_coupon");
        continue;
      }
    }

    const reason = rejectionFor(rule, subtotal, now, input.customer);
    if (reason) {
      reject(rule, reason);
      continue;
    }

    const covered = matchingLines(rule, lines);
    if (rule.scope !== "CART" && covered.length === 0) {
      reject(rule, "no_matching_lines");
      continue;
    }

    const base = rule.scope === "CART" ? subtotal : sumMoney(covered.map(lineSubtotal));
    const amount = discountAmount(rule, base);
    if (amount.lessThanOrEqualTo(0)) {
      reject(rule, "no_matching_lines");
      continue;
    }

    candidates.push({ rule, lines: covered, amount });
  }

  const stackable = candidates.filter((c) => c.rule.stackable === true);
  const exclusive = candidates.filter((c) => c.rule.stackable !== true);

  // Non-stackable discounts compete, and the customer wins: the biggest
  // saving applies and the rest are told they were outranked. Ties break on
  // priority, then id, so the outcome does not depend on input order.
  const winner = exclusive.length
    ? exclusive.reduce((best, c) => {
        const diff = c.amount.comparedTo(best.amount);
        if (diff > 0) return c;
        if (diff < 0) return best;
        const byPriority = (c.rule.priority ?? 0) - (best.rule.priority ?? 0);
        if (byPriority !== 0) return byPriority < 0 ? c : best;
        return c.rule.id < best.rule.id ? c : best;
      })
    : null;

  for (const candidate of exclusive) {
    if (candidate !== winner) reject(candidate.rule, "outranked");
  }

  // Stackable discounts all apply, in priority order so the result does not
  // depend on the order they were passed in.
  const ordered = [...stackable].sort(
    (a, b) => (a.rule.priority ?? 0) - (b.rule.priority ?? 0) || a.rule.id.localeCompare(b.rule.id),
  );
  const chosen = winner ? [winner, ...ordered] : ordered;

  // Attribute each discount to the lines it covers, so a line total is
  // explainable and so tax is charged on what was actually paid.
  const discountByLine = new Map<string, Decimal>(lines.map((line) => [line.id, money(0)]));
  let discountTotal = money(0);

  for (const candidate of chosen) {
    const remainingBase =
      candidate.rule.scope === "CART"
        ? clampNonNegative(subtractMoney(subtotal, discountTotal))
        : clampNonNegative(
            subtractMoney(
              sumMoney(candidate.lines.map(lineSubtotal)),
              sumMoney(candidate.lines.map((line) => discountByLine.get(line.id) ?? money(0))),
            ),
          );

    // Recomputed against what is left: two stacked discounts must not take
    // more than the cart is worth.
    const amount = discountAmount(candidate.rule, remainingBase);
    if (amount.lessThanOrEqualTo(0)) {
      reject(candidate.rule, "no_matching_lines");
      continue;
    }

    const spread = candidate.rule.scope === "CART" ? lines : candidate.lines;
    const spreadBase = sumMoney(spread.map(lineSubtotal));

    // Largest-remainder: split the discount across lines in proportion to
    // their value, then give the rounding remainder to the largest line, so
    // the parts always add back up to the whole.
    let allocated = money(0);
    const shares = spread.map((line, index) => {
      const isLast = index === spread.length - 1;
      const share = isLast
        ? subtractMoney(amount, allocated)
        : spreadBase.isZero()
          ? money(0)
          : roundMoney(amount.times(lineSubtotal(line)).dividedBy(spreadBase));
      allocated = addMoney(allocated, share);
      return { line, share };
    });

    for (const { line, share } of shares) {
      discountByLine.set(line.id, addMoney(discountByLine.get(line.id) ?? money(0), share));
    }
    discountTotal = addMoney(discountTotal, amount);

    applied.push({
      discountId: candidate.rule.id,
      name: candidate.rule.name,
      code: candidate.rule.code ?? null,
      scope: candidate.rule.scope,
      amount: serializeMoney(amount),
    });
  }

  const pricedLines: PricedLine[] = lines.map((line) => {
    const discount = discountByLine.get(line.id) ?? money(0);
    return {
      id: line.id,
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: serializeMoney(line.unitPrice),
      compareAtPrice: line.compareAtPrice == null ? null : serializeMoney(line.compareAtPrice),
      discount: serializeMoney(discount),
      total: serializeMoney(clampNonNegative(subtractMoney(lineSubtotal(line), discount))),
    };
  });

  const discounted = clampNonNegative(subtractMoney(subtotal, discountTotal));
  const tax = roundMoney(applyRate(discounted, input.taxRate ?? 0));
  const shipping = money(input.shipping ?? 0);
  const grandTotal = addMoney(discounted, tax, shipping);

  return {
    lines: pricedLines,
    applied,
    rejected,
    subtotal: serializeMoney(subtotal),
    discountTotal: serializeMoney(discountTotal),
    tax: serializeMoney(tax),
    shipping: serializeMoney(shipping),
    grandTotal: serializeMoney(grandTotal),
  };
}
