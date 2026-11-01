"use client";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { flexRender, useTable } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";
import { FacetFilterMenu, type FacetOption } from "./faceted-filter";
import { type AdminColumn, adminTableFeatures } from "./features";
import { PAGE_SIZES, pageCount, type TableParams } from "./table-params";
import { useDebouncedQuery, useTableParams } from "./use-table-params";

export interface ServerFacet {
  /** Filter key, must be in the page's filterKeys allow-list. */
  key: string;
  title: string;
  options: FacetOption[];
}

/**
 * Table for lists that are paginated, sorted and filtered IN THE DATABASE.
 * State lives in the URL (see table-params.ts); this component only renders
 * the current page and writes the next state back to the URL.
 *
 * Use it once a list can grow past a few hundred rows (orders, customers).
 * Small, bounded lists can stay on the client-side DataTable.
 */
export function ServerDataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  total,
  params,
  searchPlaceholder,
  facets = [],
  emptyState,
}: {
  columns: AdminColumn<TData>[];
  data: TData[];
  total: number;
  params: TableParams;
  searchPlaceholder?: string;
  facets?: ServerFacet[];
  emptyState?: ReactNode;
}) {
  const t = useTranslations("DataTable");
  const { isPending, setQuery, setFilter, setSort, setPage, setPageSize, reset } = useTableParams();
  const [queryValue, setQueryValue] = useDebouncedQuery(params.q, setQuery);

  const pages = pageCount(total, params.pageSize);
  const isFiltered = Boolean(params.q) || Object.keys(params.filters).length > 0;
  const from = total === 0 ? 0 : (params.page - 1) * params.pageSize + 1;
  const to = Math.min(params.page * params.pageSize, total);

  const table = useTable({
    features: adminTableFeatures,
    data,
    columns,
    rowCount: total,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      pagination: { pageIndex: params.page - 1, pageSize: params.pageSize },
      sorting: params.sort ? [{ id: params.sort.id, desc: params.sort.desc }] : [],
    },
  });

  return (
    <div
      className={cn("space-y-3 transition-opacity duration-(--dur-hover) ease-(--ease-out)", isPending && "opacity-70")}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <SearchIcon aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={queryValue}
            onChange={(event) => setQueryValue(event.target.value)}
            placeholder={searchPlaceholder ?? t("search")}
            aria-label={searchPlaceholder ?? t("search")}
            className="h-8 ps-8"
          />
        </div>
        {facets.map((facet) => (
          <FacetFilterMenu
            key={facet.key}
            title={facet.title}
            options={facet.options}
            selected={params.filters[facet.key] ?? []}
            onChange={(values) => setFilter(facet.key, values)}
          />
        ))}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              setQueryValue("");
              reset();
            }}
          >
            <XIcon className="size-3.5" />
            {t("reset")}
          </Button>
        )}
      </div>

      {/* bg-card: the rows sit on the same surface as the sticky header, and
          overflow-hidden keeps that header inside the rounded corners. */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="relative max-h-[70svh] overflow-auto">
          <Table className="min-w-[720px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const sortable = header.column.columnDef.enableSorting !== false;
                    const active = params.sort?.id === header.column.id ? params.sort : undefined;
                    const Icon = active ? (active.desc ? ArrowDownIcon : ArrowUpIcon) : ChevronsUpDownIcon;
                    const content = header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext());
                    const alignEnd = header.column.columnDef.meta?.align === "end";
                    return (
                      <TableHead key={header.id} className={cn("h-9 whitespace-nowrap", alignEnd && "text-end")}>
                        {sortable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-7 gap-1 px-2", alignEnd ? "-me-2" : "-ms-2")}
                            onClick={() =>
                              setSort(active && active.desc ? undefined : { id: header.column.id, desc: Boolean(active) })
                            }
                          >
                            <span>{content}</span>
                            <Icon className={cn("size-3.5", active ? "text-foreground" : "text-muted-foreground")} />
                          </Button>
                        ) : (
                          content
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0">
                    {emptyState ?? <EmptyState title={t("empty")} />}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn("py-2", cell.column.columnDef.meta?.align === "end" && "text-end")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{t("showing", { from, to, total })}</span>
          <Select value={String(params.pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="h-8 w-auto gap-1" aria-label={t("rowsPerPage")}>
              <SelectValue>{t("rowsPerPageValue", { size: params.pageSize })}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {t("rowsPerPageValue", { size })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setPage(params.page - 1)}
            disabled={params.page <= 1 || isPending}
          >
            <ChevronLeftIcon className="size-4 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{t("previous")}</span>
          </Button>
          <span className="px-2 tabular-nums">{t("page", { page: params.page, pages })}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setPage(params.page + 1)}
            disabled={params.page >= pages || isPending}
          >
            <span className="hidden sm:inline">{t("next")}</span>
            <ChevronRightIcon className="size-4 rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
    </div>
  );
}
