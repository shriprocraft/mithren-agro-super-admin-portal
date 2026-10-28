import { siteConfig } from "@/config/site";

const wholeRupees = new Intl.NumberFormat(siteConfig.locale, { style: "currency", currency: siteConfig.currency, maximumFractionDigits: 0 });
const withPaise = new Intl.NumberFormat(siteConfig.locale, { style: "currency", currency: siteConfig.currency, minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat(siteConfig.locale);

/** Formats integer paise as INR, e.g. 4000 → "₹40", 4050 → "₹40.50", 1234500 → "₹12,345". */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? wholeRupees.format(rupees) : withPaise.format(rupees);
}

export const formatNumber = (n: number) => integer.format(n);

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: siteConfig.timezone, day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: siteConfig.timezone,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Accepts a full ISO timestamp or a plain YYYY-MM-DD date (treated as that IST calendar day). */
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
}

export const formatDate = (value: string) => dateFmt.format(toDate(value));
/** Date and time in Asia/Kolkata, e.g. "27 Oct 2026, 17:30 IST". */
export const formatDateTime = (value: string) => `${dateTimeFmt.format(toDate(value))} IST`;

/** "in_progress" → "In progress". */
export function humanize(value: string): string {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
