"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Badge, Card, PageHeader } from "@/components/admin/primitives";
import { DateRangeFilter } from "@/components/admin/widgets";
import { inRange, presetRange, type DateRange } from "@/lib/dates";
import { formatDateTime, humanize } from "@/lib/format";
import { matchesSearch } from "@/lib/table";
import type { AuditEvent } from "@/lib/types";
import { AuditedCsvExport, InvestmentNotice, NotPermitted, useInvestmentAdmin } from "./shared";

/** Investment-related events, plus staff role changes because they change investment permissions. */
export const isInvestmentEvent = (e: AuditEvent) => e.action.startsWith("inv.") || e.action === "staff.role_change";

export function InvestmentAuditView() {
  const { db, can } = useInvestmentAdmin();
  const [query, setQuery] = React.useState("");
  const [entity, setEntity] = React.useState("");
  const [action, setAction] = React.useState("");
  const [actor, setActor] = React.useState("");
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  if (!can("inv.audit.view")) return <><PageHeader title="Investment audit trail" /><NotPermitted action="Viewing audit logs" /></>;

  const events = db.audit.filter(isInvestmentEvent);
  // Events recorded during this session are later than the demo reference date; "All" includes them.
  const effective = range.to === presetRange("all").to ? { ...range, to: "9999-12-31" } : range;
  const rows = events.filter((e) => (!entity || e.targetType === entity) && (!action || e.action === action) && (!actor || e.actorId === actor) && inRange(e.at, effective) && matchesSearch(query, [e.summary, e.targetId, e.action, e.actorName, e.note]));

  const columns: Column<AuditEvent>[] = [
    { key: "id", header: "Audit ID", sortValue: (e) => e.id, cell: (e) => <span className="font-mono text-[11px]">{e.id}</span> },
    { key: "at", header: "Timestamp", sortValue: (e) => e.at, cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.at)}</span> },
    { key: "actor", header: "Actor", sortValue: (e) => e.actorName, cell: (e) => <div><p>{e.actorName}</p><p className="text-xs text-muted-foreground">{e.actorId}</p></div> },
    { key: "action", header: "Action", sortValue: (e) => e.action, cell: (e) => <div><p>{e.summary}</p><code className="text-[11px] text-muted-foreground">{e.action}</code></div> },
    { key: "entity", header: "Entity", sortValue: (e) => `${e.targetType}:${e.targetId}`, cell: (e) => <div><p>{humanize(e.targetType)}</p><p className="font-mono text-xs text-muted-foreground">{e.targetId}</p></div> },
    { key: "note", header: "Reason / note", cell: (e) => <span className="block max-w-[16rem] text-xs text-muted-foreground">{e.note ?? "—"}</span> },
    { key: "change", header: "Previous → new", cell: (e) => <ul className="space-y-0.5 text-xs">{[...new Set([...Object.keys(e.before ?? {}), ...Object.keys(e.after ?? {})])].slice(0, 3).map((k) => <li key={k} className="max-w-[16rem] truncate"><span className="text-muted-foreground">{k}:</span> {e.before?.[k] ?? "—"} → <span className="font-medium">{e.after?.[k] ?? "—"}</span></li>)}</ul> },
    { key: "context", header: "Context", cell: () => <Badge tone="info" icon={false}>Demo · browser-local</Badge> },
  ];

  return (
    <>
      <PageHeader title="Investment audit trail" description="Every sensitive investment-administration action: who did it, to which record, when, why, and what changed." />
      <InvestmentNotice>This trail lives in browser storage alongside the <Link href="/admin/audit-logs" className="font-medium text-primary underline">marketplace audit log</Link>. It is a demo record and is <strong>not tamper-proof</strong>; a production audit trail must be written server-side.</InvestmentNotice>
      <Card title={`${rows.length} event${rows.length === 1 ? "" : "s"}`} actions={<AuditedCsvExport reportId="investment-audit" label="Investment audit trail" filename="mithren-investment-audit_demo.csv" rows={rows} filters={`entity=${entity}; action=${action}; actor=${actor}; ${range.from}..${range.to}; search=${query}`} columns={[{ header: "Audit ID", value: (e: AuditEvent) => e.id }, { header: "Timestamp (UTC)", value: (e) => e.at }, { header: "Actor ID", value: (e) => e.actorId }, { header: "Actor", value: (e) => e.actorName }, { header: "Action", value: (e) => e.action }, { header: "Entity type", value: (e) => e.targetType }, { header: "Entity ID", value: (e) => e.targetId }, { header: "Summary", value: (e) => e.summary }, { header: "Reason / note", value: (e) => e.note }, { header: "Before", value: (e) => (e.before ? JSON.stringify(e.before) : "") }, { header: "After", value: (e) => (e.after ? JSON.stringify(e.after) : "") }, { header: "Context", value: () => "Demo (browser-local)" }]} />}>
        <Toolbar>
          <SearchField label="Search the trail" placeholder="Search by summary, entity ID, action or note" value={query} onChange={setQuery} />
          <FilterSelect label="Entity type" value={entity} onChange={setEntity} options={[...new Set(events.map((e) => e.targetType))].sort().map((t) => ({ value: t, label: humanize(t) }))} className="sm:w-56" />
          <FilterSelect label="Action" value={action} onChange={setAction} options={[...new Set(events.map((e) => e.action))].sort().map((a) => ({ value: a, label: a }))} className="sm:w-56" />
          <FilterSelect label="Actor" value={actor} onChange={setActor} options={[...new Map(events.map((e) => [e.actorId, e.actorName])).entries()].map(([id, n]) => ({ value: id, label: n }))} />
          <DateRangeFilter value={range} onChange={setRange} />
          <ClearFilters active={Boolean(query || entity || action || actor)} onClear={() => { setQuery(""); setEntity(""); setAction(""); setActor(""); }} />
        </Toolbar>
        <DataTable caption="Investment audit trail" rows={rows} columns={columns} getRowId={(e) => e.id} initialSort={{ key: "at", direction: "desc" }} resetKey={`${query}|${entity}|${action}|${actor}|${range.from}|${range.to}`} pageSize={15} minWidth={1400} />
      </Card>
    </>
  );
}
