"use client";

import { type AdminColumn, ServerDataTable, type TableParams } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/user-avatar";
import { UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

export type CustomerState = "ordered" | "pending" | "none";

export interface CustomerRow extends Record<string, unknown> {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  ordersCount: number;
  completedCount: number;
  state: CustomerState;
  createdAt: Date;
}

const STATE_TONES: Record<CustomerState, StatusTone> = {
  ordered: "success",
  pending: "warning",
  none: "neutral",
};

export function UsersClient({
  customers,
  total,
  params,
}: {
  customers: CustomerRow[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations("Customers");
  const tCommon = useTranslations("Common");
  const format = useFormatter();

  const columns = useMemo<AdminColumn<CustomerRow>[]>(
    () => [
      {
        id: "customer",
        accessorFn: (row) => [row.name, row.email, row.phone].filter(Boolean).join(" "),
        filterFn: "includesString",
        header: t("columns.customer"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} email={row.original.email} />
            <span className="grid min-w-0 leading-tight">
              <Link
                href={`/admin/dashboard/users/${row.original.id}`}
                className="truncate font-medium hover:underline"
              >
                {row.original.name ?? t("unnamed")}
              </Link>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {row.original.email ?? "—"}
              </span>
            </span>
          </div>
        ),
      },
      {
        id: "phone",
        accessorFn: (row) => row.phone ?? "",
        enableSorting: false,
        header: t("columns.phone"),
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="tabular-nums" dir="ltr">
              {row.original.phone}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "address",
        accessorFn: (row) => row.address ?? "",
        enableSorting: false,
        header: t("columns.address"),
        cell: ({ row }) => (
          <span className="block max-w-[22ch] truncate text-sm text-muted-foreground">
            {row.original.address ?? "—"}
          </span>
        ),
      },
      {
        id: "orders",
        accessorFn: (row) => row.ordersCount,
        header: t("columns.orders"),
        cell: ({ row }) => (
          <span className="grid leading-tight">
            <span className="tabular-nums">{row.original.ordersCount}</span>
            {row.original.completedCount > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("completedOf", { count: row.original.completedCount })}
              </span>
            )}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.state,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: tCommon("status"),
        cell: ({ row }) => (
          <StatusBadge tone={STATE_TONES[row.original.state]}>
            {t(`state.${row.original.state}`)}
          </StatusBadge>
        ),
      },
      {
        id: "joined",
        accessorFn: (row) => row.createdAt.getTime(),
        header: t("columns.joined"),
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {format.dateTime(row.original.createdAt, { dateStyle: "medium" })}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm" className="h-7">
              <Link href={`/admin/dashboard/users/${row.original.id}`}>{t("view")}</Link>
            </Button>
          </div>
        ),
      },
    ],
    [t, tCommon, format],
  );

  return (
    <ServerDataTable
      columns={columns}
      data={customers}
      total={total}
      params={params}
      searchPlaceholder={t("searchPlaceholder")}
      facets={[
        {
          key: "state",
          title: tCommon("status"),
          options: [
            { value: "ordered", label: t("state.ordered") },
            { value: "pending", label: t("state.pending") },
            { value: "none", label: t("state.none") },
          ],
        },
      ]}
      emptyState={
        <EmptyState icon={UsersIcon} title={t("empty.title")} description={t("empty.description")} />
      }
    />
  );
}
