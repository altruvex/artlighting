import type { StatusTone } from "@/components/status-badge";
import type { OrderStatus } from "@repo/database";

// Plain string literals, not Object.values(OrderStatus) — importing the
// Prisma enum as a runtime value would pull the entire @repo/database module
// (including the live PrismaClient instantiation) into every "use client"
// bundle that touches an order, which crashes in the browser. The type-only
// import above is erased at compile time, so it costs nothing.
export const ORDER_STATUSES = [
  "awaiting_shipment",
  "processing",
  "shipped",
  "delivered",
  "fulfilled",
  "cancelled",
  "refunded",
] as const satisfies readonly OrderStatus[];

/** Statuses that count towards revenue: money actually collected and kept. */
export const REVENUE_STATUSES = ORDER_STATUSES.filter(
  (status) => status !== "cancelled" && status !== "refunded",
);

const TONES: Record<OrderStatus, StatusTone> = {
  delivered: "success",
  fulfilled: "success",
  shipped: "info",
  processing: "info",
  awaiting_shipment: "warning",
  cancelled: "danger",
  refunded: "danger",
};

/** Badge tone for an order status. The label always carries the meaning. */
export function orderStatusTone(status: OrderStatus): StatusTone {
  return TONES[status] ?? "neutral";
}
