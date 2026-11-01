"use client";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
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
import { type ColumnVisibilityState, flexRender, useTable } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
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

// Same-tab writes to localStorage fire no "storage" event, so the table
// announces its own.
const VISIBILITY_EVENT = "admin-table-columns";

function subscribeToVisibility(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VISIBILITY_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VISIBILITY_EVENT, onChange);
  };
}

function readStored(key: string | undefined): string {
  if (!key) return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * Hidden columns, remembered in this browser under `storageKey` when one is
 * given. Storage can be missing or throw (private window, blocked site data);
 * the table then keeps the choice for this visit only. The server render
 * shows every column, and the stored choice applies once the page hydrates.
 */
function useColumnVisibility(storageKey: string | undefined) {
  const [local, setLocal] = useState<ColumnVisibilityState>({});
  const raw = useSyncExternalStore(subscribeToVisibility, () => readStored(storageKey), () => "");
  const stored = useMemo(() => {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as ColumnVisibilityState;
    } catch {
      return undefined;
    }
  }, [raw]);

  const setVisibility = (next: ColumnVisibilityState) => {
    setLocal(next);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event(VISIBILITY_EVENT));
    } catch {
      // Not remembered; `local` still holds it for this visit.
    }
  };

  return [stored ?? local, setVisibility] as const;
}

const NO_SELECTION = new Map<string, never>();

/**
 * Table for lists that are paginated, sorted and filtered IN THE DATABASE.
 * State lives in the URL (see table-params.ts); this component only renders
 * the current page and writes the next state back to the URL.
 *
 * Use it once a list can grow past a few hundred rows (orders, customers).
 * Small, bounded lists can stay on the client-side DataTable.
 *
 * Optional, as on DataTable: `columnMenu` adds the column-visibility menu,
 * `bulkActions` adds row selection with a bulk-action bar.
 */
export function ServerDataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  total,
  params,
  searchPlaceholder,
  facets = [],
  emptyState,
  columnMenu = false,
  columnLabels = {},
  columnStorageKey,
  bulkActions,
  getRowId = (row) => String(row.id),
}: {
  columns: AdminColumn<TData>[];
  data: TData[];
  total: number;
  params: TableParams;
  searchPlaceholder?: string;
  facets?: ServerFacet[];
  emptyState?: ReactNode;
  /** Show the column-visibility menu. */
  columnMenu?: boolean;
  /** Human labels for the column menu, keyed by column id. Defaults to a string header. */
  columnLabels?: Record<string, string>;
  /** Remember hidden columns in this browser under this localStorage key. */
  columnStorageKey?: string;
  /** Turns on row selection; renders the actions for the selected rows. */
  bulkActions?: (selected: TData[], clear: () => void) => ReactNode;
  /** Stable row key for selection. Defaults to `row.id`. */
  getRowId?: (row: TData) => string;
}) {
  const t = useTranslations("DataTable");
  const { isPending, setQuery, setFilter, setSort, setPage, setPageSize, reset } = useTableParams();
  const [queryValue, setQueryValue] = useDebouncedQuery(params.q, setQuery);
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(columnStorageKey);

  const pages = pageCount(total, params.pageSize);
  const isFiltered = Boolean(params.q) || Object.keys(params.filters).length > 0;
  const from = total === 0 ? 0 : (params.page - 1) * params.pageSize + 1;
  const to = Math.min(params.page * params.pageSize, total);

  // Selection is kept here by row id, because the table only ever holds the
  // current page: rows picked on page 1 and page 2 add up, and survive a
  // re-sort. A new search or filter starts a fresh selection, so a bulk
  // action never reaches a row the admin can no longer see listed.
  const selectable = Boolean(bulkActions);
  const scope = `${params.q}\u0000${JSON.stringify(params.filters)}`;
  const [selection, setSelection] = useState<{ scope: string; rows: Map<string, TData> }>(() => ({
    scope,
    rows: NO_SELECTION,
  }));
  const selectedById: Map<string, TData> = selection.scope === scope ? selection.rows : NO_SELECTION;
  // Prefer the row as the server last sent it, so a flag changed elsewhere
  // is current when the bulk action reads it.
  const selected = useMemo(() => {
    const fresh = new Map(data.map((row) => [getRowId(row), row]));
    return [...selectedById.entries()].map(([id, row]) => fresh.get(id) ?? row);
  }, [selectedById, data, getRowId]);
  const clearSelection = () => setSelection({ scope, rows: NO_SELECTION });
  const toggleRows = (rows: TData[], on: boolean) =>
    setSelection((current) => {
      const next = new Map(current.scope === scope ? current.rows : undefined);
      for (const row of rows) {
        if (on) next.set(getRowId(row), row);
        else next.delete(getRowId(row));
      }
      return { scope, rows: next };
    });
  const allOnPage = data.length > 0 && data.every((row) => selectedById.has(getRowId(row)));
  const someOnPage = data.some((row) => selectedById.has(getRowId(row)));

  const selectionColumn: AdminColumn<TData> = {
    id: "select",
    header: () => (
      <Checkbox
        checked={allOnPage || (someOnPage && "indeterminate")}
        onCheckedChange={(value) => toggleRows(data, Boolean(value))}
        aria-label={t("selectAll")}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedById.has(getRowId(row.original))}
        onCheckedChange={(value) => toggleRows([row.original], Boolean(value))}
        aria-label={t("selectRow")}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const table = useTable({
    features: adminTableFeatures,
    data,
    columns: selectable ? [selectionColumn, ...columns] : columns,
    rowCount: total,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      pagination: { pageIndex: params.page - 1, pageSize: params.pageSize },
      sorting: params.sort ? [{ id: params.sort.id, desc: params.sort.desc }] : [],
      columnVisibility,
    },
  });

  const hideableColumns = columnMenu ? table.getAllLeafColumns().filter((column) => column.getCanHide()) : [];
  const columnLabel = (id: string, header: unknown) =>
    columnLabels[id] ?? (typeof header === "string" ? header : id);

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
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ms-auto h-8 gap-1.5">
                <SettingsIcon className="size-3.5" />
                <span className="hidden sm:inline">{t("columns")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>{t("columns")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, [column.id]: Boolean(value) })}
                >
                  {columnLabel(column.id, column.columnDef.header)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {selectable && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm tabular-nums">{t("selected", { count: selected.length })}</span>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {bulkActions?.(selected, clearSelection)}
            <Button variant="ghost" size="sm" className="h-7" onClick={clearSelection}>
              {t("clearSelection")}
            </Button>
          </div>
        </div>
      )}

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
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0">
                    {emptyState ?? <EmptyState title={t("empty")} />}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={selectable && selectedById.has(getRowId(row.original)) ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-2",
                          cell.column.id === "select" && "w-10",
                          cell.column.columnDef.meta?.align === "end" && "text-end",
                        )}
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
