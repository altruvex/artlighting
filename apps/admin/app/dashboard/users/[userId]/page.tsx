import {
  parseTableParams,
  type SearchParamsInput,
  toPrismaPagination,
} from "@/components/data-table";
import {
  loadLineQuantities,
  orderLinesCount,
  orderLinesSelect,
  summarizeLines,
} from "@/lib/order-lines";
import { ORDER_STATUSES } from "../../order-status";
import { EmptyState } from "@/components/empty-state";
import { formatMoney, roundMoney, serializeMoney } from "@repo/money";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import UserAvatar from "@/components/user-avatar";
import { requirePermissionOrRedirect } from "@/lib/auth";
import { type OrderStatus, type Prisma, prisma } from "@repo/database";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CircleCheckIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserClient, type CustomerOrderRow } from "./user-client";

/** One labelled field inside the profile / address cards. */
function Field({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string | null;
  ltr?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}

/** Columns the order history may sort by. Product, quantity and status are
 *  summaries of lines or filters, so they do not sort. */
const SORTABLE = {
  order: (desc: Prisma.SortOrder) => ({ id: desc }),
  total: (desc: Prisma.SortOrder) => ({ totalPrice: desc }),
  date: (desc: Prisma.SortOrder) => ({ createdAt: desc }),
} satisfies Record<
  string,
  (desc: Prisma.SortOrder) => Prisma.OrderOrderByWithRelationInput
>;

const UserPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<SearchParamsInput>;
}) => {
  await requirePermissionOrRedirect("customer:read");
  const resolvedParams = await params;

  const tableParams = parseTableParams(await searchParams, {
    sortableIds: Object.keys(SORTABLE),
    filterKeys: ["status"],
    defaultSort: { id: "date", desc: true },
    defaultPageSize: 10,
  });
  const statusFilter = (tableParams.filters.status ?? []).filter(
    (value): value is OrderStatus =>
      (ORDER_STATUSES as readonly string[]).includes(value),
  );
  // The table shows every order of the customer, completed or not, as before.
  const ordersWhere: Prisma.OrderWhereInput = {
    userId: resolvedParams.userId,
    ...(statusFilter.length > 0 ? { status: { in: statusFilter } } : {}),
    ...(tableParams.q
      ? {
          OR: [
            ...(/^\d+$/.test(tableParams.q)
              ? [{ id: Number.parseInt(tableParams.q, 10) }]
              : []),
            {
              orderItems: {
                some: {
                  productName: {
                    contains: tableParams.q,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const sortKey = (tableParams.sort?.id ?? "date") as keyof typeof SORTABLE;
  const orderBy = SORTABLE[sortKey](
    (tableParams.sort?.desc ?? true) ? "desc" : "asc",
  );

  const [t, tCommon, format, locale] = await Promise.all([
    getTranslations("CustomerDetail"),
    getTranslations("Common"),
    getFormatter(),
    getLocale(),
  ]);

  let user;
  let pageOrders;
  let filteredTotal;
  let allOrders;
  let completedOrders;
  try {
    // Stats come from aggregates over all of the customer's orders; only the
    // page of rows being shown is loaded.
    [user, filteredTotal, pageOrders, allOrders, completedOrders] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: resolvedParams.userId },
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            shippingAddress: {
              select: {
                fullName: true,
                phoneNumber: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
              },
            },
          },
        }),
        prisma.order.count({ where: ordersWhere }),
        prisma.order.findMany({
          where: ordersWhere,
          orderBy,
          ...toPrismaPagination(tableParams),
          select: {
            id: true,
            orderItems: orderLinesSelect,
            _count: orderLinesCount,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.order.aggregate({
          where: { userId: resolvedParams.userId },
          _count: { _all: true },
          _max: { createdAt: true },
        }),
        prisma.order.aggregate({
          where: { userId: resolvedParams.userId, isCompleted: true },
          _count: { _all: true },
          _sum: { totalPrice: true },
        }),
      ]);
  } catch (error) {
    console.error("Error fetching user:", error);
    return (
      <PageShell>
        <PageHeader title={t("loadError")} />
        <div className="rounded-lg border">
          <EmptyState icon={AlertTriangleIcon} title={t("loadError")} />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return notFound();
  }

  const quantities = await loadLineQuantities(
    pageOrders.map((order) => order.id),
  );
  const orders: CustomerOrderRow[] = pageOrders.map((order) => ({
    id: order.id,
    ...summarizeLines(order, quantities),
    total: serializeMoney(order.totalPrice),
    status: order.status,
    createdAt: order.createdAt,
  }));

  const orderCount = allOrders._count._all;
  const completedCount = completedOrders._count._all;
  const lifetimeValue = roundMoney(completedOrders._sum.totalPrice ?? 0);
  const lastOrderAt = allOrders._max.createdAt;

  const fullName =
    user.shippingAddress?.fullName?.trim() || user.name?.trim() || null;
  const phone = user.shippingAddress?.phoneNumber ?? user.phoneNumber ?? null;
  const postalAddress = user.shippingAddress
    ? [
        user.shippingAddress.address,
        user.shippingAddress.city,
        user.shippingAddress.state,
        user.shippingAddress.zipCode,
        user.shippingAddress.country,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <PageShell>
      <PageHeader
        title={fullName ?? user.email}
        description={
          <span dir="ltr" className="break-all">
            {user.email}
          </span>
        }
        actions={
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
            <Link href="/dashboard/users">
              <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
              {t("backToCustomers")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.orders")}
          value={orderCount}
          icon={ShoppingBagIcon}
        />
        <StatCard
          label={t("stats.completed")}
          value={completedCount}
          icon={CircleCheckIcon}
        />
        <StatCard
          label={t("stats.lifetimeValue")}
          value={formatMoney(lifetimeValue, { locale })}
          hint={t("lifetimeValueHint")}
          icon={WalletIcon}
        />
        <StatCard
          label={t("stats.lastOrder")}
          value={
            lastOrderAt
              ? format.dateTime(lastOrderAt, { dateStyle: "medium" })
              : t("noValue")
          }
          icon={CalendarIcon}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={fullName} email={user.email} size="lg" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">
                  {fullName ?? t("noValue")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("memberSince", {
                    date: format.dateTime(user.createdAt, {
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </p>
              </div>
            </div>
            <dl className="space-y-2.5 border-t pt-3">
              <Field label={t("fullName")} value={fullName} />
              <Field label={tCommon("email")} value={user.email} ltr />
              <Field label={tCommon("phone")} value={phone} ltr />
              <Field
                label={tCommon("date")}
                value={format.dateTime(user.createdAt, { dateStyle: "medium" })}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 lg:col-span-2">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">{t("addresses")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {postalAddress ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="space-y-2">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase rtl:tracking-normal">
                    {t("shippingAddress")}
                  </h2>
                  <dl className="space-y-2.5">
                    <Field label={t("fullName")} value={fullName} />
                    <Field label={tCommon("phone")} value={phone} ltr />
                    <Field label={t("addresses")} value={postalAddress} />
                  </dl>
                </section>
                <section className="space-y-2 sm:border-s sm:ps-4">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase rtl:tracking-normal">
                    {t("billingAddress")}
                  </h2>
                  <dl className="space-y-2.5">
                    <Field label={tCommon("email")} value={user.email} ltr />
                    <Field label={tCommon("phone")} value={phone} ltr />
                    <Field label={t("addresses")} value={postalAddress} />
                  </dl>
                </section>
              </div>
            ) : (
              <EmptyState title={t("noAddress")} className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* A heading over the table, as on the dashboard: the table is its own
          bordered surface, so a card around it was a box in a box. */}
      <section aria-labelledby="order-history-heading" className="space-y-2">
        <div className="space-y-0.5">
          <h2 id="order-history-heading" className="text-sm font-semibold">
            {t("orderHistory")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("orderHistoryDescription")}
          </p>
        </div>
        <UserClient
          orders={orders}
          total={filteredTotal}
          params={tableParams}
        />
      </section>
    </PageShell>
  );
};

export default UserPage;
