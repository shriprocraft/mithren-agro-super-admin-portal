export type SortDirection = "asc" | "desc";
export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

export type SortValue = string | number | null | undefined;

/** Stable sort. Numbers compare numerically, strings with natural ordering; empty values always go last. */
export function sortRows<T>(rows: readonly T[], getValue: (row: T) => SortValue, direction: SortDirection): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((a, b) => {
      const av = a.value;
      const bv = b.value;
      const aEmpty = av === null || av === undefined || av === "";
      const bEmpty = bv === null || bv === undefined || bv === "";
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "en-IN", { numeric: true, sensitivity: "base" });
      return cmp === 0 ? a.index - b.index : cmp * factor;
    })
    .map((entry) => entry.row);
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { page: current, pageCount, total: rows.length, start, items: rows.slice(start, start + pageSize) };
}

/** Case-insensitive match of every whitespace-separated term against any of the given fields. */
export function matchesSearch(query: string, fields: readonly (string | null | undefined)[]): boolean {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
