"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect } from "@/components/admin/filters";
import { Card, PageHeader } from "@/components/admin/primitives";
import { DateRangeFilter } from "@/components/admin/widgets";
import { presetRange } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { statusOptions } from "@/lib/status";
import { csvCell, INVESTMENT_REPORTS, type ReportFilterKey, type ReportFilters, type Row } from "./investment-reports";
import { AuditedCsvExport, InvestmentNotice, NotPermitted, useInvestmentAdmin } from "./shared";

const EMPTY: Omit<ReportFilters, "range"> = { investor: "", sector: "", project: "", plan: "", participationStatus: "", transactionStatus: "", allocationStatus: "", payoutStatus: "" };

export function InvestmentReportsView() {
  const { db, state, can } = useInvestmentAdmin();
  const [reportId, setReportId] = React.useState(INVESTMENT_REPORTS[0]!.id);
  const [filters, setFilters] = React.useState<ReportFilters>(() => ({ range: presetRange("all"), ...EMPTY }));
  const report = INVESTMENT_REPORTS.find((r) => r.id === reportId) ?? INVESTMENT_REPORTS[0]!;
  const rows = report.rows(db, filters);
  const set = (k: ReportFilterKey) => (v: string) => setFilters((f) => ({ ...f, [k]: v, ...(k === "sector" ? { project: "" } : {}) }));

  if (!can("inv.investors.view")) return <><PageHeader title="Investment reports" /><NotPermitted action="Viewing investment reports" /></>;

  const FILTER_UI: Record<ReportFilterKey, React.ReactNode> = {
    investor: <FilterSelect key="investor" label="Investor" value={filters.investor} onChange={set("investor")} options={state.investors.map((i) => ({ value: i.id, label: `${i.name} (${i.id})` }))} allLabel="All investors" className="sm:w-56" />,
    sector: <FilterSelect key="sector" label="Sector" value={filters.sector} onChange={set("sector")} options={state.sectors.map((s) => ({ value: s.id, label: s.name }))} allLabel="All sectors" />,
    project: <FilterSelect key="project" label="Project" value={filters.project} onChange={set("project")} options={state.projects.filter((p) => !filters.sector || p.sectorId === filters.sector).map((p) => ({ value: p.id, label: p.name }))} allLabel="All projects" className="sm:w-56" />,
    plan: <FilterSelect key="plan" label="Plan" value={filters.plan} onChange={set("plan")} options={state.plans.map((p) => ({ value: p.id, label: p.name.replace("Standard Contribution Plan — ", "") }))} allLabel="All plans" />,
    participationStatus: <FilterSelect key="ps" label="Participation status" value={filters.participationStatus} onChange={set("participationStatus")} options={statusOptions("participation")} />,
    transactionStatus: <FilterSelect key="ts" label="Transaction status" value={filters.transactionStatus} onChange={set("transactionStatus")} options={statusOptions("transaction").filter((o) => !["verified", "refunded", "partially_refunded"].includes(o.value))} className="sm:w-56" />,
    allocationStatus: <FilterSelect key="as" label="Allocation status" value={filters.allocationStatus} onChange={set("allocationStatus")} options={statusOptions("allocation")} />,
    payoutStatus: <FilterSelect key="pos" label="Payout status" value={filters.payoutStatus} onChange={set("payoutStatus")} options={statusOptions("payout")} />,
  };
  const activeFilters = report.filters.filter((k) => filters[k]);
  const filterSummary = `${filters.range.from}..${filters.range.to}; ${report.filters.map((k) => `${k}=${filters[k] || "all"}`).join("; ")}`;

  const columns: Column<Row>[] = report.columns.map((col) => ({
    key: col.key,
    header: col.header,
    align: col.align,
    sortValue: (r) => r[col.key],
    cell: (r) => {
      const v = r[col.key];
      if (col.money) return typeof v === "number" ? formatINR(v) : "—";
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDate(v);
      return v === null || v === "" ? "—" : v;
    },
  }));

  return (
    <>
      <PageHeader title="Investment reports" description="Filterable reports on investors, plans, contributions, projects, allocations, payouts and activity, exportable as CSV." />
      <InvestmentNotice>Reports use fictional demo records and only counts and sums of recorded values. Proposed, pending and simulated amounts are labelled as such and are never reported as verified contributions. No financial ratio is calculated because no formula is approved. Exports exclude contact details and are recorded in the audit trail.</InvestmentNotice>
      <Card>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <FilterSelect label="Report" value={reportId} onChange={(v) => { setReportId(v); setFilters((f) => ({ range: f.range, ...EMPTY })); }} options={INVESTMENT_REPORTS.map((r) => ({ value: r.id, label: r.label }))} allLabel={null} className="sm:w-72" />
            <DateRangeFilter value={filters.range} onChange={(range) => setFilters((f) => ({ ...f, range }))} label={`Date range (${report.dateField})`} />
            {report.filters.map((k) => FILTER_UI[k])}
            <ClearFilters active={activeFilters.length > 0} onClear={() => setFilters((f) => ({ range: f.range, ...EMPTY }))} />
          </div>
          <AuditedCsvExport reportId={report.id} label={report.label} filename={`mithren-investment-${report.id}_${filters.range.from}_to_${filters.range.to}_demo.csv`} rows={rows} columns={report.columns.map((col) => ({ header: col.header, value: (r: Row) => csvCell(col, r) }))} filters={filterSummary} />
        </div>
        <h2 className="text-base font-semibold">{report.label} report</h2>
        <p className="mt-0.5 mb-4 text-[13px] text-muted-foreground">{report.description} {formatDate(filters.range.from)} – {formatDate(filters.range.to)}.</p>
        <DataTable key={report.id} caption={`${report.label} report`} rows={rows} columns={columns} getRowId={(r) => JSON.stringify(r)} resetKey={filterSummary} pageSize={12} minWidth={Math.max(700, report.columns.length * 140)} emptyTitle="No records for these filters" emptyDescription="Choose a wider date range or clear the filters." />
      </Card>
    </>
  );
}
