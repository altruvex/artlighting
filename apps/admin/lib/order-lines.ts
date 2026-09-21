/**
 * An order's products, for the tables that show one row per order.
 *
 * An order used to be one product, so the list read productName, the first
 * image and quantity straight off the order row. Orders now keep their
 * products as lines; a row names the first and counts the rest, and its
 * quantity is every unit in the order. Older orders were copied into lines
 * when lines were introduced, so this reads the same for all of them.
 */
export const orderLinesSelect = {
  orderBy: { id: "asc" as const },
  select: { productName: true, productImages: true, quantity: true },
};

export interface OrderLinesSummary {
  productName: string;
  /** Lines after the first. */
  moreProducts: number;
  imageUrl: string | null;
  /** Units across every line. */
  quantity: number;
}

export function summarizeLines(
  lines: { productName: string; productImages: string[]; quantity: number }[],
): OrderLinesSummary {
  const [first] = lines;
  return {
    productName: first?.productName ?? "",
    moreProducts: Math.max(0, lines.length - 1),
    imageUrl: first?.productImages[0] ?? null,
    quantity: lines.reduce((total, line) => total + line.quantity, 0),
  };
}
