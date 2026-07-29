/**
 * "Show more" paging for history lists (Tier 3).
 *
 * Cursor paging would be better for huge lists, but these lists are read
 * newest-first and never jumped into the middle of, so a growing limit in the
 * URL keeps the pages shareable and the server components simple. The hard
 * ceiling stops a crafted `?show=` from asking for the whole table.
 */

export const HISTORY_PAGE_SIZE = 20;
export const HISTORY_MAX_LIMIT = 500;

export function parseHistoryLimit(
  raw: string | undefined,
  pageSize: number = HISTORY_PAGE_SIZE,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return pageSize;
  // Round up to a whole page so the "show more" steps stay predictable.
  const pages = Math.ceil(n / pageSize);
  return Math.min(pages * pageSize, HISTORY_MAX_LIMIT);
}

export type HistoryPage<T> = {
  items: T[];
  /** True when the extra probe row came back, i.e. there is another page. */
  hasMore: boolean;
  nextLimit: number;
};

/**
 * Split rows fetched with `limit + 1` into a page plus a has-more flag.
 * Fetching one extra row avoids a second COUNT query just to draw a button.
 */
export function sliceHistoryPage<T>(
  rows: T[],
  limit: number,
  pageSize: number = HISTORY_PAGE_SIZE,
): HistoryPage<T> {
  const hasMore = rows.length > limit && limit < HISTORY_MAX_LIMIT;
  return {
    items: rows.slice(0, limit),
    hasMore,
    nextLimit: Math.min(limit + pageSize, HISTORY_MAX_LIMIT),
  };
}

/** Row count to request so `sliceHistoryPage` can detect another page. */
export function fetchLimit(limit: number): number {
  return limit + 1;
}
