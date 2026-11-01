import "server-only";

import {
  sellableFrom,
  discountsForCart,
  InsufficientStockError,
  inventorySelect,
  redeemDiscount,
  redemptionsByCustomer,
  syncOrderStock,
  toCartLine,
} from "@repo/catalog";
import { prisma } from "@repo/database";
import { addMoney, money, serializeMoney } from "@repo/money";
import { computePricing, type PricingResult } from "@repo/pricing";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import type { OrderView } from "@/lib/order-view";
import { formatNumber } from "@/lib/numbers";
import { familySlug } from "@repo/catalog/families";

/**
 * Checkout: from what the customer chose to an order, priced on the server.
 *
 * An order used to hold exactly one product, in columns on the order row.
 * A customer with three products in the cart could only buy them one at a
 * time — three orders, three shipping charges, three rows the admin could
 * not connect. And the path to that one order created it twice: the preview
 * step wrote an order, then the address step posted a second one to
 * /api/orders carrying a total the browser had computed, which is the total
 * that was stored.
 *
 * Now there is one order per checkout, a header with a line per product.
 * The cart and "order now" are two sources of the same thing, lines, and
 * everything that costs money is computed here from the database: the unit
 * price from the product and the customer's saved configuration, the
 * discounts by the engine over all the lines together, the shipping once.
 * Nothing the browser sends is a price.
 */

/** Standard delivery, charged once per order however many lines it has. */
export const STANDARD_SHIPPING = "69.00";

const productInclude = {
  images: productImageSelect(),
  // The variant stock is taken from, and what it has left to sell.
  variants: { where: { isDefault: true }, select: { id: true, inventory: inventorySelect() }, take: 1 },
} as const;

type ProductRow = NonNullable<Awaited<ReturnType<typeof loadProduct>>>;

async function loadProduct(where: { id: string } | { productId: string }) {
  return prisma.product.findUnique({ where, include: productInclude });
}

type ConfigurationRow = NonNullable<Awaited<ReturnType<typeof prisma.configuration.findFirst>>>;

/** One product about to be priced: what it is, how it is configured, how many. */
export interface LineDraft {
  /** Stable within one pricing call: the cart item id, or "line". */
  key: string;
  product: ProductRow;
  configuration: ConfigurationRow | null;
  quantity: number;
}

/**
 * One unit as the customer configured it: the product, plus the wattage or
 * IP upgrade, plus the bulbs. The single formula both the cart and the
 * order use, so the two cannot quote different units for the same choice.
 */
export function configuredUnitPrice(product: ProductRow, configuration: ConfigurationRow | null): string {
  const upgrade = configuration?.priceIncrease ?? product.priceIncrease ?? 0;
  const bulbs = configuration?.lampPriceIncrease ?? 0;
  return serializeMoney(addMoney(product.price, upgrade, bulbs));
}

/**
 * The customer's latest configuration of each product, by product code.
 * The product page saves the bulb, IP and colour choices there as they are
 * made, so a product added to the cart carries the choices made before it.
 */
async function configurationsFor(userId: string, productCodes: string[]) {
  if (productCodes.length === 0) return new Map<string, ConfigurationRow>();
  const rows = await prisma.configuration.findMany({
    where: { userId, productId: { in: productCodes } },
    orderBy: { updatedAt: "desc" },
  });
  const latest = new Map<string, ConfigurationRow>();
  for (const row of rows) if (!latest.has(row.productId)) latest.set(row.productId, row);
  return latest;
}

/** The signed-in customer's cart, as lines. */
export async function cartDrafts(userId: string): Promise<LineDraft[]> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: { include: productInclude } }, orderBy: { id: "asc" } } },
  });
  if (!cart) return [];

  const configurations = await configurationsFor(
    userId,
    cart.items.map((item) => item.product.productId),
  );
  return cart.items.map((item) => ({
    key: item.id,
    product: item.product,
    configuration: configurations.get(item.product.productId) ?? null,
    quantity: item.quantity,
  }));
}

/** Prices lines together — one engine call, the same one the order is placed with. */
export async function priceDrafts(
  drafts: LineDraft[],
  options: { userId: string; email?: string | null; coupon?: string | null; shipping?: string } ,
): Promise<PricingResult> {
  const rules = await discountsForCart(options.coupon ?? null, prisma);
  const redemptions = options.email
    ? await redemptionsByCustomer({ userId: options.userId, email: options.email }, prisma)
    : {};
  return computePricing({
    lines: drafts.map((draft) =>
      toCartLine(draft.product, {
        id: draft.key,
        quantity: draft.quantity,
        unitPrice: configuredUnitPrice(draft.product, draft.configuration),
      }),
    ),
    discounts: rules,
    coupon: options.coupon ?? null,
    customer: { userId: options.userId, email: options.email ?? undefined, redemptionsByDiscountId: redemptions },
    shipping: options.shipping ?? "0",
    now: new Date(),
  });
}

export type CheckoutSource =
  | { kind: "cart" }
  | { kind: "configuration"; configurationId: string; quantity: number };

export class CheckoutError extends Error {
  constructor(
    public readonly code: "empty" | "not_found" | "not_yours" | "unavailable" | "out_of_stock",
    /** For out_of_stock: which product, and how many are left to sell. */
    public readonly detail?: { product: string; available: number },
  ) {
    super(code);
  }
}

async function draftsFor(userId: string, source: CheckoutSource): Promise<LineDraft[]> {
  if (source.kind === "cart") {
    const drafts = await cartDrafts(userId);
    if (drafts.length === 0) throw new CheckoutError("empty");
    return drafts;
  }

  const configuration = await prisma.configuration.findUnique({ where: { id: source.configurationId } });
  if (!configuration) throw new CheckoutError("not_found");
  // A configuration belongs to whoever touched it first; another customer's
  // id in the request is not a way to buy at their configured price.
  if (configuration.userId && configuration.userId !== userId) throw new CheckoutError("not_yours");

  const product = await loadProduct({ productId: configuration.productId });
  if (!product) throw new CheckoutError("not_found");
  return [
    {
      key: "line",
      product,
      configuration,
      quantity: Math.min(100, Math.max(1, Math.floor(source.quantity))),
    },
  ];
}

/**
 * Places one order for everything the source holds, and returns its id.
 *
 * The header, every line and every discount redemption are written in one
 * transaction: a redemption against an order that failed to save is a use
 * nobody can account for, and redeemDiscount locks the discount row before
 * it counts, so two checkouts cannot both take the last use.
 */
export async function placeOrder(
  userId: string,
  source: CheckoutSource,
  options: { coupon?: string | null; customerLanguage?: string } = {},
): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const drafts = await draftsFor(userId, source);
  if (drafts.some((draft) => !draft.product.isActive)) throw new CheckoutError("unavailable");
  // Said now, before the customer types an address. The binding check is
  // the reservation when they confirm; this only spares them the form.
  for (const draft of drafts) {
    const available = sellableFrom(draft.product, draft.product.variants[0]?.inventory);
    if (available !== null && draft.quantity > available) {
      throw new CheckoutError("out_of_stock", { product: draft.product.productName, available });
    }
  }

  const priced = await priceDrafts(drafts, {
    userId,
    email: user.email,
    coupon: options.coupon,
    shipping: STANDARD_SHIPPING,
  });
  const pricedByKey = new Map(priced.lines.map((line) => [line.id, line]));

  // The address from the last order, if there is one. The address step
  // replaces it; an order must point at a row from the start.
  const address =
    (await prisma.shippingAddress.findUnique({ where: { userId } })) ??
    (await prisma.shippingAddress.create({
      data: {
        userId,
        fullName: user.name,
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        phoneNumber: user.phoneNumber ?? "",
      },
    }));

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        status: "awaiting_shipment",
        shippingAddressId: address.id,
        customerLanguage: options.customerLanguage ?? "ar",
        subtotal: priced.subtotal,
        discountTotal: priced.discountTotal,
        shippingPrice: priced.shipping,
        totalPrice: priced.grandTotal,
        discountApplied: priced.applied.length > 0,
        discountRate: money(priced.subtotal).isZero()
          ? "0"
          : money(priced.discountTotal).dividedBy(priced.subtotal).toFixed(4),
        orderItems: {
          create: drafts.map((draft) => {
            const line = pricedByKey.get(draft.key)!;
            return {
              productId: draft.product.id,
              productVariantId: draft.product.variants[0]?.id ?? null,
              quantity: draft.quantity,
              configPrice: line.unitPrice,
              configurationId: draft.configuration?.id ?? null,
              productName: draft.product.productName,
              productImages: imageUrls(draft.product),
              brand: draft.product.brand,
              productIp: draft.configuration?.productIp ?? draft.product.productIp ?? null,
              // The customer's choice; the product's default when they made none.
              productColorTemp: draft.configuration?.colorTemp ?? draft.product.productColor ?? null,
              bulbId: draft.configuration?.bulbId ?? null,
              discountAmount: line.discount,
              lineTotal: line.total,
            };
          }),
        },
      },
    });

    for (const applied of priced.applied) {
      await redeemDiscount(tx, {
        discountId: applied.discountId,
        orderId: created.id,
        userId,
        customerEmail: user.email,
        amount: applied.amount,
      });
    }

    return created;
  });

  return order.id;
}

export interface AddressInput {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * The address step. Saves the customer's address and points their order at
 * it — it no longer creates a second order to do so. Returns false when the
 * order is not this customer's, which callers answer like a missing one.
 */
export async function saveShippingAddress(orderId: number, userId: string, input: AddressInput): Promise<boolean> {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId, isCompleted: false } });
  if (!order) return false;

  const address = await prisma.shippingAddress.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input },
  });
  await prisma.order.update({ where: { id: orderId }, data: { shippingAddressId: address.id } });
  return true;
}

/**
 * The customer confirms. Marks the order complete, reserves its stock, and
 * takes what it bought out of their cart — one transaction, so a confirmed
 * order always holds its units, and a product that ran out between the
 * cart and the button fails the confirmation instead of being sold twice.
 *
 * Confirming twice (a double click, a retry) is not an error: the second
 * finds the order complete and its stock already reserved, and answers
 * "already" — so only the confirmation that completed the order sends the
 * order emails.
 */
export async function completeOrder(orderId: number, userId: string): Promise<"completed" | "already" | false> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, userId },
          select: { isCompleted: true, status: true },
        });
        if (!order) return false;
        if (order.isCompleted) return "already" as const;

        await tx.order.update({ where: { id: orderId }, data: { isCompleted: true } });
        await syncOrderStock(orderId, order.status, `customer:${userId}`, tx);

        const items = await tx.orderItem.findMany({ where: { orderId }, select: { productId: true } });
        const cart = await tx.cart.findUnique({ where: { userId }, select: { id: true } });
        if (cart && items.length > 0) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, productId: { in: items.map((item) => item.productId) } },
          });
        }
        return "completed" as const;
      },
      // A reservation per line over a remote database; the default five
      // seconds is short for a large cart.
      { timeout: 20_000 },
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      const line = await prisma.orderItem.findFirst({
        where: { orderId, variant: { sku: error.sku } },
        select: { productName: true },
      });
      throw new CheckoutError("out_of_stock", { product: line?.productName ?? error.sku, available: error.available });
    }
    throw error;
  }
}

/**
 * The customer's own order with its lines, or null. Scoped by userId: an
 * order that is someone else's answers exactly like one that does not
 * exist, so ids cannot be probed.
 */
export async function orderForCustomer(orderId: number, userId: string, locale: string) {
  if (!Number.isInteger(orderId)) return null;
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      shippingAddress: true,
      orderItems: {
        orderBy: { id: "asc" },
        include: {
          product: {
            select: {
              productId: true,
              brand: true,
              sectionType: true,
              spotlightType: true,
              translations: { where: { language: locale }, select: { name: true } },
            },
          },
          bulb: { select: { wattage: true, translations: { where: { language: locale }, select: { name: true } } } },
        },
      },
    },
  });
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof orderForCustomer>>>;

/** The order as the order pages render it — see lib/order-view. */
export function toOrderView(order: CustomerOrder, locale: string): OrderView {
  const watts = (wattage: number) =>
    locale === "ar" ? `${formatNumber(wattage, "ar")} وات` : `${wattage} W`;
  const lines = order.orderItems.map((item) => {
    const product = item.product;
    return {
      id: item.id,
      productId: product.productId,
      name: product.translations[0]?.name || item.productName,
      image: item.productImages[0] ?? null,
      brand: item.brand,
      href: product.brand
        ? `/category/${product.brand}/${familySlug(product.sectionType)}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`
        : null,
      quantity: item.quantity,
      unitPrice: serializeMoney(item.configPrice),
      discountAmount: serializeMoney(item.discountAmount),
      lineTotal: serializeMoney(item.lineTotal),
      productIp: item.productIp,
      // Named the way the product page names it: the kind, then the wattage.
      bulb: item.bulb
        ? {
            name: [item.bulb.translations[0]?.name, watts(item.bulb.wattage)].filter(Boolean).join(" "),
            wattage: item.bulb.wattage,
          }
        : null,
    };
  });

  const address = order.shippingAddress;
  return {
    id: order.id,
    isCompleted: order.isCompleted,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    subtotal: serializeMoney(order.subtotal),
    discountTotal: serializeMoney(order.discountTotal),
    shippingPrice: serializeMoney(order.shippingPrice),
    totalPrice: serializeMoney(order.totalPrice),
    // An address row with nothing in it is the placeholder placeOrder makes
    // before the address step; to a page, that is "no address yet".
    shippingAddress:
      address && address.address
        ? {
            fullName: address.fullName,
            phoneNumber: address.phoneNumber,
            address: address.address,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            country: address.country,
          }
        : null,
    lines,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
  };
}
