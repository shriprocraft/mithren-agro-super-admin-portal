"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { FilterSelect } from "@/components/admin/filters";
import { Card, DemoNotice, NeedsClarification, PageHeader } from "@/components/admin/primitives";
import { CsvExportButton, DateRangeFilter } from "@/components/admin/widgets";
import { presetRange, type DateRange } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { useDb } from "@/lib/store/demo-store";
import { csvValue, REPORTS, type Row } from "./report-definitions";

export function ReportsView() {
  const db = useDb();
  const [reportId, setReportId] = React.useState(REPORTS[0]!.id);
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const report = REPORTS.find((r) => r.id === reportId) ?? REPORTS[0]!;
  const rows = report.rows(db, range);

  const columns: Column<Row>[] = report.columns.map((c, i) => ({
    key: String(i),
    header: c.header,
    align: c.align,
    sortValue: (r) => c.value(r),
    cell: (r) => {
      const v = c.value(r);
      if (c.money && typeof v === "number") return formatINR(v);
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return formatDate(v);
      return v ?? "—";
    },
  }));
  const csvColumns = report.columns.map((c) => ({ header: c.header, value: (r: Row) => csvValue(c, r) }));
  const filename = `mithren-admin-${report.id}-report_${range.from}_to_${range.to}_demo.csv`;

  return (
    <>
      <PageHeader title="Reports" description="Marketplace reports from demo data, filterable by date and exportable as CSV." />
      <DemoNotice>Reports use fictional demo records and only counts and sums of recorded values. CSV files are generated in your browser and exclude customer contact details. Access control for exports (“CSV export with authorization”) is not enforced by this frontend-only demo.</DemoNotice>
      <Card>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <FilterSelect label="Report" value={reportId} onChange={setReportId} options={REPORTS.map((r) => ({ value: r.id, label: r.label }))} allLabel={null} className="sm:w-56" />
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
          {report.needsClarification ? (
            <div className="flex flex-col items-start gap-1">
              <button type="button" disabled className="inline-flex h-11 cursor-not-allowed items-center rounded-full border border-border px-5 text-sm font-medium text-muted-foreground opacity-60" aria-describedby="export-disabled">Export CSV</button>
              <span id="export-disabled" className="text-xs text-muted-foreground">Unavailable: report needs clarification.</span>
            </div>
          ) : (
            <CsvExportButton filename={filename} rows={rows} columns={csvColumns} />
          )}
        </div>
        <h2 className="text-base font-semibold">{report.label} report</h2>
        <p className="mt-0.5 mb-4 text-[13px] text-muted-foreground">{report.description} {formatDate(range.from)} – {formatDate(range.to)}.</p>
        {report.needsClarification ? (
          <NeedsClarification refId={report.needsClarification.refId}>{report.needsClarification.text}</NeedsClarification>
        ) : (
          <DataTable key={report.id} caption={`${report.label} report`} rows={rows} columns={columns} getRowId={(r) => JSON.stringify(r)} resetKey={`${range.from}|${range.to}`} pageSize={12} minWidth={Math.max(640, report.columns.length * 130)} emptyTitle="No data in this range" emptyDescription="Choose a wider date range." />
        )}
      </Card>
    </>
  );
}
