"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "cn";
import { ArrowUpRight, Download, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import { presetRange, validateRange, type DateRange, type RangePreset } from "@/lib/dates";
import { useToast } from "./toast";

export function MetricCard({ label, value, detail, icon: Icon, href, hrefLabel, children }: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  hrefLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface-card group relative flex min-w-0 flex-col rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</div>}
      {children}
      {href && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 self-start rounded-md text-[13px] font-medium text-primary after:absolute after:inset-0 after:rounded-2xl hover:text-primary-hover focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {hrefLabel ?? "View"}
          <span className="sr-only"> — {label}</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All demo data" },
  { value: "custom", label: "Custom range" },
];

/**
 * Date-range filter. Presets count back from the fixed demo reference date. Custom ranges are only
 * applied when valid; an invalid range shows an inline error and keeps the previous range.
 */
export function DateRangeFilter({ value, onChange, className }: { value: DateRange; onChange: (range: DateRange) => void; className?: string }) {
  const [preset, setPreset] = React.useState<RangePreset>(() => PRESETS.find((p) => p.value !== "custom" && JSON.stringify(presetRange(p.value as Exclude<RangePreset, "custom">)) === JSON.stringify(value))?.value ?? "custom");
  const [draft, setDraft] = React.useState<DateRange>(value);
  const [error, setError] = React.useState<string | null>(null);
  const id = React.useId();

  const choosePreset = (next: RangePreset) => {
    setPreset(next);
    setError(null);
    if (next !== "custom") {
      const range = presetRange(next);
      setDraft(range);
      onChange(range);
    }
  };
  const applyCustom = (next: DateRange) => {
    setDraft(next);
    const problem = validateRange(next);
    setError(problem);
    if (!problem) onChange(next);
  };

  return (
    <fieldset className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", className)}>
      <legend className="sr-only">Date range</legend>
      <div className="flex flex-col gap-1.5 sm:w-44">
        <label htmlFor={`${id}-preset`} className="text-xs font-medium text-muted-foreground">
          Date range
        </label>
        <NativeSelect id={`${id}-preset`} value={preset} onChange={(e) => choosePreset(e.target.value as RangePreset)}>
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {preset === "custom" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-from`} className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <Input id={`${id}-from`} type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => applyCustom({ ...draft, from: e.target.value })} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="sm:w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-to`} className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input id={`${id}-to`} type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => applyCustom({ ...draft, to: e.target.value })} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="sm:w-44" />
          </div>
        </>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive sm:basis-full">
          {error} Showing the previous valid range.
        </p>
      )}
    </fieldset>
  );
}

/** Real client-side CSV download of the given rows. Disabled with an explanation when there is nothing to export. */
export function CsvExportButton<T>({ filename, rows, columns, label = "Export CSV" }: { filename: string; rows: readonly T[]; columns: readonly CsvColumn<T>[]; label?: string }) {
  const toast = useToast();
  const empty = rows.length === 0;
  const onExport = () => {
    const done = downloadCsv(filename, toCsv(rows, columns));
    if (done) toast.success(`Downloaded ${filename} (${rows.length} row${rows.length === 1 ? "" : "s"}) generated in your browser from demo data.`);
    else toast.error("Your browser could not start the download. Nothing was exported.");
  };
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" onClick={onExport} disabled={empty} aria-describedby={empty ? `${filename}-empty` : undefined}>
        <Download aria-hidden="true" />
        {label}
      </Button>
      {empty && (
        <span id={`${filename}-empty`} className="text-xs text-muted-foreground">
          Nothing to export for the current filters.
        </span>
      )}
    </div>
  );
}
