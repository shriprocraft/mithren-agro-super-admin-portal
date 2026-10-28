export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** RFC 4180 field escaping: quote when the value contains a comma, quote, CR or LF; double inner quotes. */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Neutralise spreadsheet formula injection for text that begins with a formula trigger.
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeCsvField(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escapeCsvField(c.value(row))).join(","));
  return lines.join("\r\n");
}

/** Triggers a real browser download of the CSV. Returns false when the browser cannot download. */
export function downloadCsv(filename: string, csv: string): boolean {
  if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") return false;
  // A BOM makes spreadsheet apps read ₹ and other UTF-8 characters correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
