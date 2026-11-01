import { prisma } from "@repo/database";

/**
 * An order's products, for the tables that show one row per order.
 *
 * An order used to be one product, so the list read productName, the first
 * image and quantity straight off the order row. Orders now keep their
 * products as lines; a row names the first and counts the rest, and its
 * quantity is every unit in the order. Older orders were copied into lines
 * when lines were introduced, so this reads the same for all of them.
 *
 * A row needs only the first line and a count, so the query takes one line
 * and `_count`; the unit total comes from one grouped sum for the page
 * (see loadLineQuantities), not from loading every line.
 */
export const orderLinesSelect = {
  orderBy: { id: "asc" as const },
  take: 1,
  select: { productName: true, productImages: true },
};

/** Spread into an order's `select`/`include` next to `orderItems`. */
export const orderLinesCount = { select: { orderItems: true } };

export interface OrderLinesSummary {
  productName: string;
  /** Lines after the first. */
  moreProducts: number;
  imageUrl: string | null;
  /** Units across every line. */
  quantity: number;
}

/** Units per order for the orders on a page: one grouped query. */
export async function loadLineQuantities(
  orderIds: number[],
): Promise<Map<number, number>> {
  if (orderIds.length === 0) return new Map();
  const groups = await prisma.orderItem.groupBy({
    by: ["orderId"],
    where: { orderId: { in: orderIds } },
    _sum: { quantity: true },
  });
  return new Map(
    groups.map((group) => [group.orderId, group._sum.quantity ?? 0]),
  );
}

export function summarizeLines(
  order: {
    id: number;
    orderItems: { productName: string; productImages: string[] }[];
    _count: { orderItems: number };
  },
  quantities: Map<number, number>,
): OrderLinesSummary {
  const [first] = order.orderItems;
  return {
    productName: first?.productName ?? "",
    moreProducts: Math.max(0, order._count.orderItems - 1),
    imageUrl: first?.productImages[0] ?? null,
    quantity: quantities.get(order.id) ?? 0,
  };
}
