"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { formatMoney, moneySortKey } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@repo/database";
import { ShoppingBagIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";
import { ORDER_STATUSES, orderStatusTone } from "./order-status";

export interface RecentOrderRow extends Record<string, unknown> {
  id: number;
  customer: string | null;
  productName: string;
  /** Serialized money (see @repo/money): a string, never a float. */
  total: string;
  /** Epoch milliseconds: sorts as a number, formats as a date. */
  createdAt: number;
  status: OrderStatus;
  userId: string;
}

/** The dashboard's compact order feed: same table engine as the orders list. */
export function RecentOrders({ orders }: { orders: RecentOrderRow[] }) {
  const t = useTranslations("Dashboard");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("OrderStatus");
  const format = useFormatter();
  const locale = useLocale();

  const columns = useMemo<AdminColumn<RecentOrderRow>[]>(
    () => [
      {
        id: "order",
        accessorFn: (row) => `${row.id} ${row.customer ?? ""}`,
        filterFn: "includesString",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.orderId")} />,
        cell: ({ row }) => (
          <Link
            href={`/admin/dashboard/orders/${row.original.id}`}
            className="font-medium tabular-nums hover:underline"
            dir="ltr"
          >
            #{row.original.id}
          </Link>
        ),
      },
      {
        id: "customer",
        accessorFn: (row) => row.customer ?? "",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.customer")} />,
        cell: ({ row }) =>
          row.original.customer ? (
            <Link
              href={`/admin/dashboard/users/${row.original.userId}`}
              className="truncate hover:underline"
            >
              {row.original.customer}
            </Link>
          ) : (
            <span className="text-muted-foreground">{t("unknownCustomer")}</span>
          ),
      },
      {
        id: "product",
        accessorFn: (row) => row.productName,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.product")} />,
        cell: ({ row }) => (
          <span className="block max-w-[18rem] truncate">{row.original.productName}</span>
        ),
      },
      {
        id: "total",
        accessorFn: (row) => moneySortKey(row.total),
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("total")} />,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.total, { locale })}
          </span>
        ),
      },
      {
        id: "date",
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("date")} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {format.dateTime(new Date(row.original.createdAt), { dateStyle: "medium" })}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("status")} />,
        cell: ({ row }) => (
          <StatusBadge tone={orderStatusTone(row.original.status)}>
            {tStatus(row.original.status)}
          </StatusBadge>
        ),
      },
    ],
    [t, tCommon, tStatus, format],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      initialPageSize={10}
      searchColumnId="order"
      searchPlaceholder={t("searchPlaceholder")}
      columnLabels={{
        order: t("columns.orderId"),
        customer: t("columns.customer"),
        product: t("columns.product"),
        total: tCommon("total"),
        date: tCommon("date"),
        status: tCommon("status"),
      }}
      facets={[
        {
          columnId: "status",
          title: tCommon("status"),
          options: ORDER_STATUSES.map((status) => ({ value: status, label: tStatus(status) })),
        },
      ]}
      emptyState={
        <EmptyState icon={ShoppingBagIcon} title={t("empty.title")} description={t("empty.description")} />
      }
    />
  );
}
