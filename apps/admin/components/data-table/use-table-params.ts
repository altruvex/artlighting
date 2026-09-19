"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FILTER_PREFIX, TABLE_PARAM_KEYS, type TableSort } from "./table-params";

/**
 * Writes table state to the URL (replace, no scroll) so the server can
 * re-render the page. Every change except paging resets to page 1.
 */
export function useTableParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const apply = useCallback(
    (mutate: (params: URLSearchParams) => void, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      if (resetPage) params.delete(TABLE_PARAM_KEYS.page);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      });
    },
    [router, searchParams],
  );

  const setQuery = useCallback(
    (value: string) =>
      apply((params) => {
        if (value) params.set(TABLE_PARAM_KEYS.query, value);
        else params.delete(TABLE_PARAM_KEYS.query);
      }),
    [apply],
  );

  const setFilter = useCallback(
    (key: string, values: string[]) =>
      apply((params) => {
        if (values.length > 0) params.set(`${FILTER_PREFIX}${key}`, values.join(","));
        else params.delete(`${FILTER_PREFIX}${key}`);
      }),
    [apply],
  );

  const setSort = useCallback(
    (sort: TableSort | undefined) =>
      apply((params) => {
        if (sort) params.set(TABLE_PARAM_KEYS.sort, `${sort.id}.${sort.desc ? "desc" : "asc"}`);
        else params.delete(TABLE_PARAM_KEYS.sort);
      }),
    [apply],
  );

  const setPage = useCallback(
    (page: number) =>
      apply(
        (params) => {
          if (page > 1) params.set(TABLE_PARAM_KEYS.page, String(page));
          else params.delete(TABLE_PARAM_KEYS.page);
        },
        { resetPage: false },
      ),
    [apply],
  );

  const setPageSize = useCallback(
    (pageSize: number) => apply((params) => params.set(TABLE_PARAM_KEYS.pageSize, String(pageSize))),
    [apply],
  );

  const reset = useCallback(
    () =>
      apply((params) => {
        for (const key of [...params.keys()]) {
          if (key.startsWith(FILTER_PREFIX) || key === TABLE_PARAM_KEYS.query) params.delete(key);
        }
      }),
    [apply],
  );

  return { isPending, setQuery, setFilter, setSort, setPage, setPageSize, reset };
}

/** Local input state that pushes to the URL after the user stops typing. */
export function useDebouncedQuery(initial: string, commit: (value: string) => void, delay = 300) {
  const [value, setValue] = useState(initial);

  useEffect(() => setValue(initial), [initial]);

  useEffect(() => {
    if (value === initial) return;
    const timer = setTimeout(() => commit(value), delay);
    return () => clearTimeout(timer);
    // `commit` and `initial` are stable enough here; re-running on every
    // render would restart the timer and the search would never fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return [value, setValue] as const;
}
