"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { formatMoney, moneySortKey } from "@/lib/money";
import { QUOTATION_STATUSES, type QuotationStatus } from "@/lib/quotations/schema";
import { quotationStatusTone } from "@/lib/quotations/view";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

export interface QuotationRow extends Record<string, unknown> {
  id: string;
  number: string;
  status: QuotationStatus;
  currency: string;
  /** Serialized money. */
  grandTotal: string;
  issueDate: string;
  validUntil: string;
  subject: string | null;
  customer: string;
  contact: string | null;
  createdBy: string;
  /** Who answers for it. */
  owner: string;
  lineCount: number;
}

/**
 * `showOwner` for those who see everyone's quotations (managers, engineering,
 * accounts); a salesperson's list is all theirs, so the column would say
 * their own name on every row.
 */
export function QuotationsTable({ rows, canWrite, showOwner }: { rows: QuotationRow[]; canWrite: boolean; showOwner: boolean }) {
  const t = useTranslations("Quotations");
  const tStatus = useTranslations("QuotationStatus");
  const locale = useLocale();
  const format = useFormatter();
  const day = (value: string) => format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" });

  const columns = useMemo<AdminColumn<QuotationRow>[]>(
    () => [
      {
        id: "number",
        accessorFn: (row) => `${row.number} ${row.customer} ${row.contact ?? ""} ${row.subject ?? ""}`,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.number")} />,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/quotations/${row.original.id}`}
            className="font-mono text-sm font-medium underline-offset-4 hover:underline"
            dir="ltr"
          >
            {row.original.number}
          </Link>
        ),
      },
      {
        id: "customer",
        accessorFn: (row) => row.customer,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.customer")} />,
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[260px]">
            {/* <bdi>: a Latin company name in the Arabic table kept the cell's
                right alignment but lost its full stop to the wrong end. */}
            <span className="block truncate font-medium"><bdi>{row.original.customer}</bdi></span>
            {(row.original.subject || row.original.contact) && (
              <span className="block truncate text-xs text-muted-foreground">
                <bdi>{row.original.subject ?? row.original.contact}</bdi>
              </span>
            )}
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        filterFn: "arrIncludesSome",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.status")} />,
        cell: ({ row }) => (
          <StatusBadge tone={quotationStatusTone(row.original.status)}>{tStatus(row.original.status)}</StatusBadge>
        ),
      },
      ...(showOwner
        ? [
            {
              id: "owner",
              accessorFn: (row: QuotationRow) => row.owner,
              filterFn: "arrIncludesSome" as const,
              header: ({ column }) => <ColumnHeader column={column} title={t("columns.owner")} />,
              cell: ({ row }) => <span className="whitespace-nowrap">{row.original.owner}</span>,
            } satisfies AdminColumn<QuotationRow>,
          ]
        : []),
      {
        id: "issueDate",
        accessorFn: (row) => row.issueDate,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.issueDate")} />,
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{day(row.original.issueDate)}</span>,
      },
      {
        id: "validUntil",
        accessorFn: (row) => row.validUntil,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.validUntil")} />,
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{day(row.original.validUntil)}</span>,
      },
      {
        id: "lines",
        meta: { align: "end" },
        accessorFn: (row) => row.lineCount,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.lines")} />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.lineCount}</span>,
      },
      {
        id: "total",
        meta: { align: "end" },
        accessorFn: (row) => moneySortKey(row.grandTotal),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.total")} />,
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap tabular-nums">
            {formatMoney(row.original.grandTotal, { locale, currency: row.original.currency })}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, t, tStatus, showOwner],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchColumnId="number"
      searchPlaceholder={t("searchPlaceholder")}
      facets={[
        {
          columnId: "status",
          title: t("columns.status"),
          options: QUOTATION_STATUSES.map((status) => ({ label: tStatus(status), value: status })),
        },
        ...(showOwner
          ? [
              {
                columnId: "owner",
                title: t("columns.owner"),
                options: [...new Set(rows.map((r) => r.owner))].sort().map((owner) => ({ label: owner, value: owner })),
              },
            ]
          : []),
      ]}
      columnLabels={{
        number: t("columns.number"),
        customer: t("columns.customer"),
        status: t("columns.status"),
        owner: t("columns.owner"),
        issueDate: t("columns.issueDate"),
        validUntil: t("columns.validUntil"),
        lines: t("columns.lines"),
        total: t("columns.total"),
      }}
      emptyState={
        <EmptyState
          icon={FileTextIcon}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            canWrite && (
              <Button asChild size="sm">
                <Link href="/dashboard/quotations/new">
                  <PlusIcon aria-hidden className="size-4" />
                  {t("new")}
                </Link>
              </Button>
            )
          }
        />
      }
    />
  );
}
