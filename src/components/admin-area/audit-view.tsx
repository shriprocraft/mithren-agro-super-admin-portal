"use client";

import * as React from "react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, PageHeader } from "@/components/admin/primitives";
import { DateRangeFilter, CsvExportButton } from "@/components/admin/widgets";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { inRange, presetRange, type DateRange } from "@/lib/dates";
import { formatDateTime, humanize } from "@/lib/format";
import { byId } from "@/lib/mock/selectors";
import { useDb } from "@/lib/store/demo-store";
import { matchesSearch } from "@/lib/table";
import type { AuditEvent } from "@/lib/types";

export function AuditView() {
  const db = useDb();
  const [query, setQuery] = React.useState("");
  const [actor, setActor] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [action, setAction] = React.useState("");
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = byId(db.audit, selectedId);

  const actors = [...new Map(db.audit.map((a) => [a.actorId, a.actorName])).entries()];
  const targets = [...new Set(db.audit.map((a) => a.targetType))].sort();
  const actions = [...new Set(db.audit.map((a) => a.action))].sort();

  // The reference date bounds presets, but events created during this session are later than it,
  // so "All" includes everything up to today.
  const effectiveRange = range.to === presetRange("all").to ? { ...range, to: "9999-12-31" } : range;
  const rows = db.audit.filter((a) => (!actor || a.actorId === actor) && (!target || a.targetType === target) && (!action || a.action === action) && inRange(a.at, effectiveRange) && matchesSearch(query, [a.summary, a.targetId, a.action, a.actorName]));

  const columns: Column<AuditEvent>[] = [
    { key: "at", header: "Timestamp", sortValue: (a) => a.at, cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.at)}</span> },
    { key: "actor", header: "Actor", sortValue: (a) => a.actorName, cell: (a) => a.actorName },
    { key: "action", header: "Action", sortValue: (a) => a.action, cell: (a) => <RowLink onClick={() => setSelectedId(a.id)} sub={<code className="text-[11px]">{a.action}</code>}>{a.summary}</RowLink> },
    { key: "target", header: "Target", sortValue: (a) => `${a.targetType}:${a.targetId}`, cell: (a) => <div><p>{humanize(a.targetType)}</p><p className="text-xs text-muted-foreground">{a.targetId}</p></div> },
    { key: "change", header: "Before → after", cell: (a) => (a.before || a.after ? <ChangeSummary event={a} /> : <span className="text-muted-foreground">—</span>) },
  ];

  return (
    <>
      <PageHeader title="Audit logs" description="Who did what, to which record, and when — including before and after values for changes." />
      <DemoNotice>The log records demo actions taken in this browser plus seeded history. It never stores passwords, secrets or customer contact details. It lives in browser storage and is <strong>not tamper-proof</strong>; a production audit log must be written server-side.</DemoNotice>
      <Card actions={<CsvExportButton filename={`mithren-admin-audit-log_demo.csv`} rows={rows} columns={[{ header: "Timestamp (UTC)", value: (a: AuditEvent) => a.at }, { header: "Actor", value: (a) => a.actorName }, { header: "Action", value: (a) => a.action }, { header: "Target type", value: (a) => a.targetType }, { header: "Target ID", value: (a) => a.targetId }, { header: "Summary", value: (a) => a.summary }, { header: "Before", value: (a) => (a.before ? JSON.stringify(a.before) : "") }, { header: "After", value: (a) => (a.after ? JSON.stringify(a.after) : "") }]} />} title={`${rows.length} event${rows.length === 1 ? "" : "s"}`}>
        <Toolbar>
          <SearchField label="Search the log" placeholder="Summary, target ID or action" value={query} onChange={setQuery} />
          <FilterSelect label="Actor" value={actor} onChange={setActor} options={actors.map(([id, name]) => ({ value: id, label: name }))} />
          <FilterSelect label="Target type" value={target} onChange={setTarget} options={targets.map((t) => ({ value: t, label: humanize(t) }))} />
          <FilterSelect label="Action" value={action} onChange={setAction} options={actions.map((a) => ({ value: a, label: a }))} />
          <ClearFilters active={Boolean(query || actor || target || action)} onClear={() => { setQuery(""); setActor(""); setTarget(""); setAction(""); }} />
        </Toolbar>
        <DateRangeFilter value={range} onChange={setRange} className="mb-4" />
        <DataTable caption="Audit log" rows={rows} columns={columns} getRowId={(a) => a.id} initialSort={{ key: "at", direction: "desc" }} resetKey={`${query}|${actor}|${target}|${action}|${range.from}|${range.to}`} pageSize={15} minWidth={960} />
      </Card>
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.summary} description={formatDateTime(selected.at)}>
            <div className="grid gap-5">
              <DetailList items={[
                { label: "Actor", value: `${selected.actorName} (${selected.actorId})` },
                { label: "Action", value: <code className="text-xs">{selected.action}</code> },
                { label: "Target", value: `${humanize(selected.targetType)} · ${selected.targetId}` },
                { label: "Timestamp", value: `${formatDateTime(selected.at)} (${selected.at})` },
              ]} />
              {(selected.before || selected.after) && (
                <div className="relative overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[420px] text-sm">
                    <caption className="sr-only">Changed fields</caption>
                    <thead className="bg-secondary/70 text-left text-xs text-muted-foreground uppercase"><tr><th scope="col" className="px-3 py-2">Field</th><th scope="col" className="px-3 py-2">Before</th><th scope="col" className="px-3 py-2">After</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {[...new Set([...Object.keys(selected.before ?? {}), ...Object.keys(selected.after ?? {})])].map((k) => (
                        <tr key={k}><th scope="row" className="px-3 py-2 text-left font-medium">{k}</th><td className="px-3 py-2 break-words text-muted-foreground">{selected.before?.[k] ?? "—"}</td><td className="px-3 py-2 break-words">{selected.after?.[k] ?? "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Dialog>
    </>
  );
}

function ChangeSummary({ event }: { event: AuditEvent }) {
  const keys = [...new Set([...Object.keys(event.before ?? {}), ...Object.keys(event.after ?? {})])].slice(0, 2);
  return (
    <ul className="space-y-0.5 text-xs">
      {keys.map((k) => (
        <li key={k} className="max-w-[16rem] truncate">
          <span className="text-muted-foreground">{k}:</span> {event.before?.[k] ?? "—"} → <span className="font-medium">{event.after?.[k] ?? "—"}</span>
        </li>
      ))}
    </ul>
  );
}
