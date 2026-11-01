"use client";

import { type AdminColumn, ServerDataTable, type TableParams } from "@/components/data-table";
import { formatMoney, moneySortKey } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { BulkPriceDialog } from "./bulk-price-dialog";
import { BulkTrackInventory } from "./bulk-track-inventory";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { PackageIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface ProductRow extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  /** Serialized money (see @repo/money): a string, never a float. */
  price: string;
  stock: number;
  lowStockThreshold: number;
  /** False: made or bought in to order; orders do not reserve its stock. */
  trackInventory: boolean;
  isActive: boolean;
  featured: boolean;
  imageUrl: string | null;
}

const NO_SELECTION = new Map<string, ProductRow>();

export function ProductsTable({
  products,
  total,
  params,
  categories,
  canEditPrices,
  canEditProducts,
}: {
  /** One page of rows; the server does the search, filters and sort. */
  products: ProductRow[];
  /** Rows matching the search and filters, across every page. */
  total: number;
  params: TableParams;
  categories: { id: string; label: string }[];
  /** ADMIN only: price:write. */
  canEditPrices: boolean;
  /** product:write — staff have it; turns on the inventory-tracking bulk action. */
  canEditProducts: boolean;
}) {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const tTable = useTranslations("DataTable");
  const format = useFormatter();
  const locale = useLocale();

  // Selection is kept here, by id, because the server table only ever holds
  // the current page: picking rows on page 1 and page 2 adds them up, as the
  // client table did. A new search or filter starts a fresh selection, so a
  // bulk action never reaches a row the admin can no longer see listed.
  const selectable = canEditPrices || canEditProducts;
  const scope = `${params.q}\u0000${JSON.stringify(params.filters)}`;
  const [selection, setSelection] = useState(() => ({ scope, rows: NO_SELECTION }));
  const selectedById = selection.scope === scope ? selection.rows : NO_SELECTION;
  // Prefer the row as the server last sent it, so a flag changed elsewhere
  // (e.g. trackInventory) is current when the bulk action reads it.
  const selected = useMemo(() => {
    const fresh = new Map(products.map((row) => [row.id, row]));
    return [...selectedById.values()].map((row) => fresh.get(row.id) ?? row);
  }, [selectedById, products]);

  const clear = () => setSelection({ scope, rows: NO_SELECTION });
  const toggle = (rows: ProductRow[], on: boolean) =>
    setSelection((current) => {
      const next = new Map(current.scope === scope ? current.rows : undefined);
      for (const row of rows) {
        if (on) next.set(row.id, row);
        else next.delete(row.id);
      }
      return { scope, rows: next };
    });
  const allOnPage = products.length > 0 && products.every((row) => selectedById.has(row.id));
  const someOnPage = products.some((row) => selectedById.has(row.id));

  const columns = useMemo<AdminColumn<ProductRow>[]>(
    () => [
      ...(selectable
        ? [
            {
              id: "select",
              enableSorting: false,
              enableHiding: false,
              header: () => (
                <Checkbox
                  checked={allOnPage || (someOnPage && "indeterminate")}
                  onCheckedChange={(value) => toggle(products, Boolean(value))}
                  aria-label={tTable("selectAll")}
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={selectedById.has(row.original.id)}
                  onCheckedChange={(value) => toggle([row.original], Boolean(value))}
                  aria-label={tTable("selectRow")}
                />
              ),
            } satisfies AdminColumn<ProductRow>,
          ]
        : []),
      {
        id: "product",
        accessorFn: (row) => `${row.name} ${row.sku}`,
        header: t("columns.product"),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <PackageIcon className="size-4 text-muted-foreground" />
              </span>
            )}
            <span className="grid min-w-0 leading-tight">
              <Link
                href={`/dashboard/products/${row.original.id}`}
                prefetch={false}
                className="truncate font-medium hover:underline"
              >
                {row.original.name}
              </Link>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {row.original.sku}
              </span>
            </span>
          </div>
        ),
      },
      {
        id: "category",
        accessorFn: (row) => row.categoryId,
        enableSorting: false,
        header: t("columns.category"),
        cell: ({ row }) => <span className="text-sm">{row.original.categoryLabel}</span>,
      },
      {
        id: "price",
        meta: { align: "end" },
        accessorFn: (row) => moneySortKey(row.price),
        header: tCommon("price"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.price, { locale })}
          </span>
        ),
      },
      {
        id: "stock",
        meta: { align: "end" },
        accessorFn: (row) => row.stock,
        // Sellable units are summed from the ledger, not a column the
        // database can order by.
        enableSorting: false,
        header: t("columns.stock"),
        cell: ({ row }) => {
          const { stock, lowStockThreshold, trackInventory } = row.original;
          // Untracked stock is never "out" or "low": it does not limit a sale.
          if (!trackInventory) return <StatusBadge tone="info">{t("stock.untracked")}</StatusBadge>;
          const tone = stock === 0 ? "danger" : stock <= lowStockThreshold ? "warning" : "neutral";
          const label = stock === 0 ? t("stock.out") : stock <= lowStockThreshold ? t("stock.low", { count: stock }) : String(stock);
          return tone === "neutral" ? (
            <span className="tabular-nums">{label}</span>
          ) : (
            <StatusBadge tone={tone}>{label}</StatusBadge>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "active" : "inactive"),
        enableSorting: false,
        header: tCommon("status"),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge tone={row.original.isActive ? "success" : "neutral"}>
              {row.original.isActive ? tCommon("active") : tCommon("inactive")}
            </StatusBadge>
            {row.original.featured && <StatusBadge tone="info">{t("featured")}</StatusBadge>}
          </div>
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
              <Link href={`/dashboard/products/${row.original.id}`} prefetch={false}>
                {tCommon("edit")}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    // toggle/selection change with every click; the columns must too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tCommon, tTable, format, locale, selectable, scope, selectedById, allOnPage, someOnPage, products],
  );

  return (
    <div className="space-y-3">
      {/* Same bar the client DataTable shows. STAFF without either write
          permission never gets a checkbox they could not act on. */}
      {selectable && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm tabular-nums">{tTable("selected", { count: selected.length })}</span>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {canEditProducts && <BulkTrackInventory selected={selected} clear={clear} />}
            {canEditPrices && <BulkPriceDialog selected={selected} clear={clear} />}
            <Button variant="ghost" size="sm" className="h-7" onClick={clear}>
              {tTable("clearSelection")}
            </Button>
          </div>
        </div>
      )}
      <ServerDataTable
        columns={columns}
        data={products}
        total={total}
        params={params}
        searchPlaceholder={t("searchPlaceholder")}
        facets={[
          {
            key: "category",
            title: t("columns.category"),
            options: categories.map((category) => ({ value: category.id, label: category.label })),
          },
          {
            key: "status",
            title: tCommon("status"),
            options: [
              { value: "active", label: tCommon("active") },
              { value: "inactive", label: tCommon("inactive") },
            ],
          },
        ]}
        emptyState={
          <EmptyState
            icon={PackageIcon}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/products/new">{t("newProduct")}</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
