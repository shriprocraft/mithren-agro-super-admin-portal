"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "cn";
import { ArrowUpRight, CalendarDays, Download, Pencil, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import { DATA_START, presetRange, type DateRange, type RangePreset } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { Field } from "./field";
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

const PRESETS: { value: Exclude<RangePreset, "custom">; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All demo data" },
];

/** "29 Sept – 28 Oct 2026" (year shown once when both dates share it), so the trigger never truncates. */
function compactRange(range: DateRange): string {
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${sameYear ? formatDate(range.from).replace(/ \d{4}$/, "") : formatDate(range.from)} – ${formatDate(range.to)}`;
}
const sameRange = (a: DateRange, b: DateRange) => a.from === b.from && a.to === b.to;
const isRealDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/**
 * Branded date-range selector. Presets count back from the fixed demo reference date. "Custom range"
 * opens a popover with Start/End dates; the range is only applied after validation, so an invalid
 * entry never changes the data on screen.
 */
export function DateRangeFilter({ value, onChange, className, label = "Date range" }: { value: DateRange; onChange: (range: DateRange) => void; className?: string; label?: string }) {
  const toast = useToast();
  const id = React.useId();
  const [preset, setPreset] = React.useState<RangePreset>(() => PRESETS.find((p) => sameRange(presetRange(p.value), value))?.value ?? "custom");
  const [customOpen, setCustomOpen] = React.useState(false);
  const openingCustom = React.useRef(false);

  const choose = (next: string) => {
    if (next === "custom") {
      // Let the menu finish closing before the popover takes focus.
      openingCustom.current = true;
      requestAnimationFrame(() => setCustomOpen(true));
      return;
    }
    const p = next as Exclude<RangePreset, "custom">;
    setPreset(p);
    onChange(presetRange(p));
  };

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1.5 sm:w-64", className)}>
      <span id={`${id}-label`} className="text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverAnchor asChild>
          <div className="flex items-center gap-2">
            <Select value={preset} onValueChange={choose}>
              <SelectTrigger aria-labelledby={`${id}-label`} className="flex-1">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                <SelectValue>{preset === "custom" ? compactRange(value) : undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent
                onCloseAutoFocus={(e) => {
                  if (openingCustom.current) {
                    e.preventDefault();
                    openingCustom.current = false;
                  }
                }}
              >
                {PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="custom">Custom range…</SelectItem>
              </SelectContent>
            </Select>
            {preset === "custom" && (
              // A real PopoverTrigger: Radix never treats its own trigger as an outside click, so
              // reopening works even while the previous panel is still animating closed.
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Edit custom date range">
                  <Pencil aria-hidden="true" />
                </Button>
              </PopoverTrigger>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent aria-label="Custom date range">
          {customOpen && (
            <CustomRangeForm
              initial={value}
              onCancel={() => setCustomOpen(false)}
              onApply={(range) => {
                setPreset("custom");
                onChange(range);
                setCustomOpen(false);
                toast.success(`Date range applied: ${formatDate(range.from)} – ${formatDate(range.to)}.`);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CustomRangeForm({ initial, onApply, onCancel }: { initial: DateRange; onApply: (range: DateRange) => void; onCancel: () => void }) {
  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [errors, setErrors] = React.useState<{ from?: string; to?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: { from?: string; to?: string } = {
      from: !from ? "Choose a start date." : !isRealDate(from) ? "Enter a valid start date." : undefined,
      to: !to ? "Choose an end date." : !isRealDate(to) ? "Enter a valid end date." : undefined,
    };
    if (!next.from && !next.to && to < from) next.to = "The end date must be on or after the start date.";
    setErrors(next);
    if (next.from || next.to) return;
    onApply({ from, to });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div>
        <p className="font-semibold text-foreground">Custom date range</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Demo data runs from {formatDate(DATA_START)} to {formatDate(presetRange("all").to)}.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date" required error={errors.from} hint="DD/MM/YYYY">
          <Input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setErrors((er) => ({ ...er, from: undefined })); }} />
        </Field>
        <Field label="End date" required error={errors.to} hint="On or after the start date">
          <Input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setErrors((er) => ({ ...er, to: undefined })); }} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Apply range</Button>
      </div>
    </form>
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
