import { siteConfig } from "@/config/site";

export interface DateRange {
  /** Inclusive start, YYYY-MM-DD (IST calendar day). */
  from: string;
  /** Inclusive end, YYYY-MM-DD (IST calendar day). */
  to: string;
}

export type RangePreset = "7d" | "30d" | "90d" | "all" | "custom";

const DAY = 86_400_000;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Earliest date in the mock dataset; "All demo data" starts here. */
export const DATA_START = "2026-08-01";

/** Ranges are measured back from the fixed demo reference date (siteConfig.demoReferenceDate). */
export function presetRange(preset: Exclude<RangePreset, "custom">): DateRange {
  const ref = Date.parse(`${siteConfig.demoReferenceDate}T00:00:00Z`);
  const to = siteConfig.demoReferenceDate;
  if (preset === "all") return { from: DATA_START, to };
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return { from: ymd(ref - (days - 1) * DAY), to };
}

/** IST calendar date (YYYY-MM-DD) of an ISO timestamp. */
export function istDay(iso: string): string {
  return new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 10);
}

export function inRange(iso: string, range: DateRange): boolean {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : istDay(iso);
  return day >= range.from && day <= range.to;
}

export function validateRange(range: DateRange): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.from) || !/^\d{4}-\d{2}-\d{2}$/.test(range.to)) return "Enter both a start and an end date.";
  if (range.from > range.to) return "The start date must be on or before the end date.";
  return null;
}

/** Schedule state of a dated item relative to the demo reference date: pure date comparison, no business rule. */
export function scheduleState(startsAt: string, endsAt: string): "scheduled" | "running" | "ended" {
  const today = siteConfig.demoReferenceDate;
  if (today < startsAt.slice(0, 10)) return "scheduled";
  if (today > endsAt.slice(0, 10)) return "ended";
  return "running";
}
