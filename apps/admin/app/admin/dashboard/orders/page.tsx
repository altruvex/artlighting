import { parseTableParams, type SearchParamsInput, toPrismaPagination } from "@/components/data-table";
import { serializeMoney } from "@repo/money";
import { PageHeader, PageShell } from "@/components/page-header";
import { requireAdminOrRedirect } from "@/lib/auth";
import { OrderStatus, type Prisma, prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";
import { ORDER_STATUSES } from "../order-status";
import OrdersClient, { type OrderRow } from "./orders-client";

/** Columns a URL may sort by, mapped to the Prisma field they order on. */
const SORTABLE = {
  order: (desc: boolean) => ({ id: dir(desc) }),
  customer: (desc: boolean) => ({ shippingAddress: { fullName: dir(desc) } }),
  product: (desc: boolean) => ({ productName: dir(desc) }),
  quantity: (desc: boolean) => ({ quantity: dir(desc) }),
  shipping: (desc: boolean) => ({ shippingPrice: dir(desc) }),
  total: (desc: boolean) => ({ totalPrice: dir(desc) }),
  date: (desc: boolean) => ({ createdAt: dir(desc) }),
  expected: (desc: boolean) => ({ orderTimeReceived: dir(desc) }),
} satisfies Record<string, (desc: boolean) => Prisma.OrderOrderByWithRelationInput>;

function dir(desc: boolean): Prisma.SortOrder {
  return desc ? "desc" : "asc";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  await requireAdminOrRedirect();

  const params = parseTableParams(await searchParams, {
    sortableIds: Object.keys(SORTABLE),
    filterKeys: ["status"],
    defaultSort: { id: "date", desc: true },
  });

  const statusFilter = (params.filters.status ?? []).filter((value): value is OrderStatus =>
    (ORDER_STATUSES as readonly string[]).includes(value),
  );

  const where: Prisma.OrderWhereInput = {
    isCompleted: true,
    ...(statusFilter.length > 0 ? { status: { in: statusFilter } } : {}),
    ...(params.q
      ? {
          OR: [
            // The order number is what staff read off an email or a call.
            ...(/^\d+$/.test(params.q) ? [{ id: Number.parseInt(params.q, 10) }] : []),
            { productName: { contains: params.q, mode: "insensitive" as const } },
            { shippingAddress: { fullName: { contains: params.q, mode: "insensitive" as const } } },
            { user: { email: { contains: params.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const sortKey = (params.sort?.id ?? "date") as keyof typeof SORTABLE;
  const orderBy = SORTABLE[sortKey](params.sort?.desc ?? true);

  const [t, total, orders] = await Promise.all([
    getTranslations("Orders"),
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      ...toPrismaPagination(params),
      include: {
        user: { select: { id: true } },
        shippingAddress: { select: { fullName: true, phoneNumber: true } },
      },
    }),
  ]);

  const rows: OrderRow[] = orders.map((order) => ({
    id: order.id,
    userId: order.userId,
    customer: order.shippingAddress?.fullName ?? null,
    phone: order.shippingAddress?.phoneNumber ?? null,
    productName: order.productName,
    imageUrl: order.productImages[0] ?? null,
    quantity: order.quantity,
    shippingPrice: serializeMoney(order.shippingPrice),
    total: serializeMoney(order.totalPrice),
    createdAt: order.createdAt.getTime(),
    expectedAt: order.orderTimeReceived?.getTime() ?? null,
    status: order.status,
  }));

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <OrdersClient orders={rows} total={total} params={params} />
    </PageShell>
  );
}
