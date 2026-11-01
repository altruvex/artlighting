import { orderLinesCount, orderLinesSelect, summarizeLines } from "@/lib/order-lines";
import { PageHeader, PageShell } from "@/components/page-header";
import { formatMoney, money, type MoneyInput, roundMoney, serializeMoney } from "@repo/money";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { BanknoteIcon, ReceiptTextIcon, ShoppingBagIcon, UsersIcon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ORDER_STATUSES, orderStatusTone, REVENUE_STATUSES } from "./order-status";
import { RecentOrders, type RecentOrderRow } from "./recent-orders";

const RECENT_ORDERS_LIMIT = 10;
// The dashboard row shows no unit count, so it skips the quantity query.
const noQuantities = new Map<number, number>();

export default async function DashboardPage() {
  await requireAdminOrRedirect();

  const [t, tNav, tStatus, tSummary, format, locale] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Nav"),
    getTranslations("OrderStatus"),
    getTranslations("Summary"),
    getFormatter(),
    getLocale(),
  ]);

  const [recentOrders, totalCustomers, totalOrders, revenue, statusGroups] = await Promise.all([
    prisma.order.findMany({
      where: { isCompleted: true },
      orderBy: { createdAt: "desc" },
      take: RECENT_ORDERS_LIMIT,
      include: {
        user: { select: { id: true } },
        shippingAddress: { select: { fullName: true } },
        orderItems: orderLinesSelect,
        _count: orderLinesCount,
      },
    }),
    prisma.user.count(),
    prisma.order.count({ where: { isCompleted: true } }),
    // Cancelled and refunded orders never became revenue, so they stay out of
    // the sales figure and out of the average that divides by the same set.
    prisma.order.aggregate({
      where: { isCompleted: true, status: { in: [...REVENUE_STATUSES] } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { isCompleted: true },
      _count: { _all: true },
    }),
  ]);

  // Decimal, so the dashboard's totals match the sum of the orders exactly.
  const totalSales = money(revenue._sum.totalPrice ?? 0);
  const countedOrders = revenue._count._all;
  const averageOrder = countedOrders > 0 ? roundMoney(totalSales.dividedBy(countedOrders)) : money(0);

  const countByStatus = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const statusRows = ORDER_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));

  const rows: RecentOrderRow[] = recentOrders.map((order) => {
    // The first product and how many more — see lib/order-lines.
    const { productName, moreProducts } = summarizeLines(order, noQuantities);
    return {
      id: order.id,
      customer: order.shippingAddress?.fullName ?? null,
      productName,
      moreProducts,
      total: serializeMoney(order.totalPrice),
      createdAt: order.createdAt.getTime(),
      status: order.status,
      userId: order.userId,
    };
  });

  const currency = (value: MoneyInput) => formatMoney(value, { locale });

  return (
    <PageShell>
      <PageHeader
        title={tNav("dashboard")}
        description={t("subtitle")}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/orders">{t("viewAllOrders")}</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={tSummary("totalSales")}
          value={currency(totalSales)}
          hint={tSummary("totalSalesDescription")}
          icon={BanknoteIcon}
        />
        <StatCard
          label={tSummary("orders")}
          value={format.number(totalOrders)}
          hint={tSummary("ordersDescription")}
          icon={ShoppingBagIcon}
        />
        <StatCard
          label={tSummary("customers")}
          value={format.number(totalCustomers)}
          hint={tSummary("customersDescription")}
          icon={UsersIcon}
        />
        <StatCard
          label={tSummary("averageOrder")}
          value={currency(averageOrder)}
          hint={tSummary("averageOrderDescription")}
          icon={ReceiptTextIcon}
        />
      </div>

      {/* Side by side only when the table has the room it needs. At 1440px
          with the sidebar open the status panel squeezed the table until the
          status column was cut off behind a scrollbar; now the panel drops
          below it and lays its rows out across the width instead. A container
          query, so collapsing the sidebar also counts as room. */}
      <div className="@container">
        <div className="grid gap-5 @[82rem]:grid-cols-[minmax(0,1fr)_18rem] @[82rem]:gap-3">
          <section aria-labelledby="recent-orders-heading" className="min-w-0 space-y-2">
            <div className="space-y-0.5">
              <h2 id="recent-orders-heading" className="text-sm font-semibold">
                {t("recentOrders")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("recentOrdersDescription")}</p>
            </div>
            <RecentOrders orders={rows} />
          </section>

          <Card className="@container/status h-fit gap-0 py-4">
            <CardHeader className="px-4 pb-3">
              <CardTitle className="text-sm">{t("statusBreakdown")}</CardTitle>
              <CardDescription className="text-xs">{t("statusBreakdownDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              {totalOrders === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">{t("statusEmpty")}</p>
              ) : (
                // A hairline over every row rather than divide-y: in the
                // multi-column layout divide-y ruled all but the first cell.
                <ul className="grid gap-x-6 @md/status:grid-cols-2 @3xl/status:grid-cols-4">
                  {statusRows.map(({ status, count }) => (
                    <li key={status} className="flex items-center justify-between gap-2 border-t py-2">
                      <StatusBadge tone={orderStatusTone(status)}>{tStatus(status)}</StatusBadge>
                      <span className="text-sm font-medium tabular-nums">{format.number(count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
