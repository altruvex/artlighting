/**
 * URL-driven table state, shared by the server page (which turns it into a
 * Prisma query) and the client table (which writes it back to the URL).
 *
 * Keeping it in the URL means a filtered list is linkable, survives a
 * refresh and a back/forward step, and the server can render exactly one
 * page of rows instead of shipping the whole table to the browser.
 */
export interface TableSort {
  id: string;
  desc: boolean;
}

export interface TableParams {
  page: number;
  pageSize: number;
  sort?: TableSort;
  q: string;
  filters: Record<string, string[]>;
}

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export const TABLE_PARAM_KEYS = { page: "page", pageSize: "per", sort: "sort", query: "q" } as const;
/** Filter params are namespaced so they can't collide with other query keys. */
export const FILTER_PREFIX = "f_";

export type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses and VALIDATES search params. `sortableIds` and `filterKeys` are
 * allow-lists: anything else is dropped, so a crafted URL can't reach an
 * arbitrary column (these values end up in `orderBy`/`where`).
 */
export function parseTableParams(
  searchParams: SearchParamsInput,
  options: {
    sortableIds?: readonly string[];
    filterKeys?: readonly string[];
    defaultSort?: TableSort;
    defaultPageSize?: number;
  } = {},
): TableParams {
  const { sortableIds = [], filterKeys = [], defaultSort, defaultPageSize = DEFAULT_PAGE_SIZE } = options;

  const pageRaw = Number.parseInt(firstValue(searchParams[TABLE_PARAM_KEYS.page]) ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeRaw = Number.parseInt(firstValue(searchParams[TABLE_PARAM_KEYS.pageSize]) ?? "", 10);
  const pageSize = (PAGE_SIZES as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : defaultPageSize;

  let sort = defaultSort;
  const sortRaw = firstValue(searchParams[TABLE_PARAM_KEYS.sort]);
  if (sortRaw) {
    const [id, direction] = sortRaw.split(".");
    if (id && sortableIds.includes(id)) sort = { id, desc: direction !== "asc" };
  }

  const filters: Record<string, string[]> = {};
  for (const key of filterKeys) {
    const raw = firstValue(searchParams[`${FILTER_PREFIX}${key}`]);
    const values = (raw ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length > 0) filters[key] = values;
  }

  return { page, pageSize, sort, q: (firstValue(searchParams[TABLE_PARAM_KEYS.query]) ?? "").trim(), filters };
}

/** Rows to skip / take for Prisma. */
export function toPrismaPagination(params: TableParams) {
  return { skip: (params.page - 1) * params.pageSize, take: params.pageSize };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
