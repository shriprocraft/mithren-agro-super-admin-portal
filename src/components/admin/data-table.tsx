"use client";

import * as React from "react";
import { cn } from "cn";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { paginate, sortRows, type SortState, type SortValue } from "@/lib/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./primitives";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => SortValue;
  align?: "left" | "right";
  className?: string;
  /** Hidden header text (e.g. an actions column). */
  srOnlyHeader?: boolean;
}

export function DataTable<T>({
  caption,
  rows,
  columns,
  getRowId,
  initialSort,
  pageSize = 10,
  resetKey = "",
  emptyTitle = "No records match",
  emptyDescription = "Try a different search or clear the filters.",
  emptyAction,
  minWidth = 720,
}: {
  caption: string;
  rows: readonly T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  initialSort?: SortState;
  pageSize?: number;
  /** Changing this (e.g. a serialised filter state) returns the table to page 1. */
  resetKey?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  minWidth?: number;
}) {
  const [sort, setSort] = React.useState<SortState | undefined>(initialSort);
  const [pageState, setPageState] = React.useState({ key: resetKey, page: 1 });
  const currentPage = pageState.key === resetKey ? pageState.page : 1;
  const setPage = (page: number) => setPageState({ key: resetKey, page });

  const sorted = React.useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    return column?.sortValue && sort ? sortRows(rows, column.sortValue, sort.direction) : [...rows];
  }, [rows, columns, sort]);
  const { items, page, pageCount, total, start } = paginate(sorted, currentPage, pageSize);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, direction: s.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
    setPage(1);
  };

  if (!rows.length) return <EmptyState icon={SearchX} title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div className="min-w-0">
      <div className="scrollbar-thin relative overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label={`${caption} (scrolls horizontally on small screens)`}>
        <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-secondary/70">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : column.sortValue ? "none" : undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn("px-3.5 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase", column.align === "right" && "text-right", column.className)}
                  >
                    {column.srOnlyHeader ? (
                      <span className="sr-only">{column.header}</span>
                    ) : column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn("-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 uppercase hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", active && "text-foreground")}
                      >
                        {column.header}
                        {active ? sort.direction === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />}
                        <span className="sr-only">{active ? `, sorted ${sort.direction === "asc" ? "ascending" : "descending"}` : ", sortable"}</span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {items.map((row) => (
              <tr key={getRowId(row)} className="transition-colors hover:bg-soft">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3.5 py-3 align-middle text-foreground", column.align === "right" && "text-right tabular-nums", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} start={start} shown={items.length} onPage={setPage} />
    </div>
  );
}

export function Pagination({ page, pageCount, total, start, shown, onPage }: { page: number; pageCount: number; total: number; start: number; shown: number; onPage: (p: number) => void }) {
  return (
    <nav aria-label="Pagination" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <p aria-live="polite">
        Showing <span className="font-medium text-foreground">{total ? start + 1 : 0}–{start + shown}</span> of <span className="font-medium text-foreground">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
      )}
    </nav>
  );
}

/** A cell button that opens a record's detail view; keeps rows keyboard-accessible. */
export function RowLink({ onClick, children, sub }: { onClick: () => void; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <button type="button" onClick={onClick} className="cursor-pointer rounded-md text-left font-medium whitespace-nowrap text-primary underline-offset-4 hover:text-primary-hover hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        {children}
      </button>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
