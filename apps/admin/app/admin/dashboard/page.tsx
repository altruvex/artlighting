import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { BanknoteIcon, ReceiptTextIcon, ShoppingBagIcon, UsersIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ORDER_STATUSES, orderStatusTone, REVENUE_STATUSES } from "./order-status";
import { RecentOrders, type RecentOrderRow } from "./recent-orders";

const RECENT_ORDERS_LIMIT = 10;

export default async function DashboardPage() {
  await requireAdminOrRedirect();

  const [t, tNav, tStatus, tSummary, format] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Nav"),
    getTranslations("OrderStatus"),
    getTranslations("Summary"),
    getFormatter(),
  ]);

  const [recentOrders, totalCustomers, totalOrders, revenue, statusGroups] = await Promise.all([
    prisma.order.findMany({
      where: { isCompleted: true },
      orderBy: { createdAt: "desc" },
      take: RECENT_ORDERS_LIMIT,
      include: {
        user: { select: { id: true } },
        shippingAddress: { select: { fullName: true } },
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

  const totalSales = revenue._sum.totalPrice ?? 0;
  const countedOrders = revenue._count._all;
  const averageOrder = countedOrders > 0 ? totalSales / countedOrders : 0;

  const countByStatus = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const statusRows = ORDER_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));

  const rows: RecentOrderRow[] = recentOrders.map((order) => ({
    id: order.id,
    customer: order.shippingAddress?.fullName ?? null,
    productName: order.productName,
    total: order.totalPrice,
    createdAt: order.createdAt.getTime(),
    status: order.status,
    userId: order.userId,
  }));

  const money = (value: number) => format.number(value, { style: "currency", currency: "EGP" });

  return (
    <PageShell>
      <PageHeader
        title={tNav("dashboard")}
        description={t("subtitle")}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/dashboard/orders">{t("viewAllOrders")}</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={tSummary("totalSales")}
          value={money(totalSales)}
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
          value={money(averageOrder)}
          hint={tSummary("averageOrderDescription")}
          icon={ReceiptTextIcon}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="recent-orders-heading" className="min-w-0 space-y-2">
          <div className="space-y-0.5">
            <h2 id="recent-orders-heading" className="text-sm font-semibold">
              {t("recentOrders")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("recentOrdersDescription")}</p>
          </div>
          <RecentOrders orders={rows} />
        </section>

        <Card className="h-fit gap-0 py-4">
          <CardHeader className="px-4 pb-3">
            <CardTitle className="text-sm">{t("statusBreakdown")}</CardTitle>
            <CardDescription className="text-xs">{t("statusBreakdownDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            {totalOrders === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">{t("statusEmpty")}</p>
            ) : (
              <ul className="divide-y">
                {statusRows.map(({ status, count }) => (
                  <li key={status} className="flex items-center justify-between gap-2 py-2">
                    <StatusBadge tone={orderStatusTone(status)}>{tStatus(status)}</StatusBadge>
                    <span className="text-sm font-medium tabular-nums">{format.number(count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
