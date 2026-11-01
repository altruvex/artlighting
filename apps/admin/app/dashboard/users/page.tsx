import { parseTableParams, type SearchParamsInput, toPrismaPagination } from "@/components/data-table";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requirePermissionOrRedirect } from "@/lib/auth";
import { type Prisma, prisma } from "@repo/database";
import { ShoppingBagIcon, UserCheckIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UsersClient, type CustomerRow } from "./users-client";

/** Sortable columns → Prisma order. Name sorts on the account name; the
 *  table shows the shipping name when there is one. */
const SORTABLE = {
  customer: (desc: Prisma.SortOrder) => ({ name: desc }),
  orders: (desc: Prisma.SortOrder) => ({ orders: { _count: desc } }),
  joined: (desc: Prisma.SortOrder) => ({ createdAt: desc }),
} satisfies Record<string, (desc: Prisma.SortOrder) => Prisma.UserOrderByWithRelationInput>;

/** "Has ordered / ordering / never ordered" expressed as queries, so the
 *  filter runs in the database instead of over one page of rows. */
const STATE_FILTERS: Record<string, Prisma.UserWhereInput> = {
  ordered: { orders: { some: { isCompleted: true } } },
  pending: { AND: [{ orders: { some: {} } }, { orders: { none: { isCompleted: true } } }] },
  none: { orders: { none: {} } },
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  await requirePermissionOrRedirect("customer:read");

  const params = parseTableParams(await searchParams, {
    sortableIds: Object.keys(SORTABLE),
    filterKeys: ["state"],
    defaultSort: { id: "joined", desc: true },
  });

  const states = (params.filters.state ?? []).filter((value) => value in STATE_FILTERS);
  const where: Prisma.UserWhereInput = {
    ...(states.length > 0 ? { OR: states.map((state) => STATE_FILTERS[state]) } : {}),
    ...(params.q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: params.q, mode: "insensitive" as const } },
                { email: { contains: params.q, mode: "insensitive" as const } },
                { phoneNumber: { contains: params.q, mode: "insensitive" as const } },
                { shippingAddress: { fullName: { contains: params.q, mode: "insensitive" as const } } },
              ],
            },
          ],
        }
      : {}),
  };

  const sortKey = (params.sort?.id ?? "joined") as keyof typeof SORTABLE;
  const orderBy = SORTABLE[sortKey]((params.sort?.desc ?? true) ? "desc" : "asc");

  const [t, total, customers, allCustomers, withOrders, totalOrders] = await Promise.all([
    getTranslations("Customers"),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      ...toPrismaPagination(params),
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        shippingAddress: { select: { fullName: true, phoneNumber: true, address: true, city: true } },
        orders: { select: { isCompleted: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { orders: { some: {} } } }),
    prisma.order.count(),
  ]);

  const rows: CustomerRow[] = customers.map((user) => {
    const completedCount = user.orders.filter((order) => order.isCompleted).length;
    return {
      id: user.id,
      name: user.shippingAddress?.fullName?.trim() || user.name?.trim() || null,
      email: user.email,
      phone: user.shippingAddress?.phoneNumber ?? user.phoneNumber ?? null,
      address: user.shippingAddress
        ? [user.shippingAddress.address, user.shippingAddress.city].filter(Boolean).join(", ")
        : null,
      ordersCount: user.orders.length,
      completedCount,
      state: user.orders.length === 0 ? "none" : completedCount > 0 ? "ordered" : "pending",
      createdAt: user.createdAt,
    };
  });

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("stats.total")} value={allCustomers} icon={UsersIcon} />
        <StatCard label={t("stats.withOrders")} value={withOrders} icon={UserCheckIcon} />
        <StatCard label={t("stats.orders")} value={totalOrders} icon={ShoppingBagIcon} />
      </div>

      <UsersClient customers={rows} total={total} params={params} />
    </PageShell>
  );
}
