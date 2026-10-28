"use client";

import * as React from "react";
import { cn } from "cn";
import { Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", className)}>{children}</div>;
}

export function SearchField({ value, onChange, label, placeholder, className }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; className?: string }) {
  const id = React.useId();
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-sm sm:min-w-64", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-input bg-card pr-10 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-soft hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Radix Select cannot use "" as an item value, so "no filter" is represented internally by this sentinel. */
const ALL = "__all__";

/**
 * Branded filter dropdown (Radix Select). `value === ""` means "no filter"; the first option shows
 * `allLabel`. The visible label names the combobox for assistive technology.
 */
export function FilterSelect({ label, value, onChange, options, allLabel = "All", className }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  /** Label of the "no filter" option; pass null when a value is always required. */
  allLabel?: string | null;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 sm:w-48", className)}>
      <span id={`${id}-label`} className="text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger aria-labelledby={`${id}-label`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allLabel !== null && <SelectItem value={ALL}>{allLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ClearFilters({ active, onClear }: { active: boolean; onClear: () => void }) {
  if (!active) return null;
  return (
    <button type="button" onClick={onClear} className="h-11 cursor-pointer self-start rounded-full px-3 text-sm font-medium text-primary hover:bg-soft hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:self-end">
      Clear filters
    </button>
  );
}
