"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/primitives";
import { formatDate, formatDateTime, formatINR, humanize } from "@/lib/format";
import { allocationTotals } from "@/lib/investment/selectors";
import type { ContributionTransaction, InvestmentDocument, InvestmentParticipation, PayoutRecord, ProjectAllocation, ReturnRecord } from "@/lib/investment/types";
import type { AuditEvent } from "@/lib/types";
import { FictionalBadge, InvestorLink, PlanLink, ProjectLink, routes, useInvestmentAdmin } from "./shared";

const idLink = (href: string, id: string) => (
  <Link href={href} className="font-mono text-xs font-medium text-primary hover:underline">
    {id}
  </Link>
);

export function ParticipationsTable({ rows, showInvestor = true, caption = "Investment participations" }: { rows: InvestmentParticipation[]; showInvestor?: boolean; caption?: string }) {
  const { state } = useInvestmentAdmin();
  const columns: Column<InvestmentParticipation>[] = [
    { key: "id", header: "Participation", sortValue: (p) => p.id, cell: (p) => idLink(routes.participation(p.id), p.id) },
    ...(showInvestor ? [{ key: "investor", header: "Investor", sortValue: (p: InvestmentParticipation) => p.investorId, cell: (p: InvestmentParticipation) => <InvestorLink id={p.investorId} /> }] : []),
    { key: "plan", header: "Plan / version", sortValue: (p) => p.planId, cell: (p) => <PlanLink id={p.planId} version={p.planVersion} /> },
    { key: "amount", header: "Contribution amount", align: "right", sortValue: (p) => p.amountPaise, cell: (p) => formatINR(p.amountPaise) },
    { key: "allocated", header: "Approved allocation", align: "right", sortValue: (p) => allocationTotals(state, p).approvedPaise, cell: (p) => formatINR(allocationTotals(state, p).approvedPaise) },
    { key: "created", header: "Created", sortValue: (p) => p.createdAt, cell: (p) => formatDate(p.createdAt) },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge domain="participation" value={p.status} /> },
  ];
  return <DataTable caption={caption} rows={rows} columns={columns} getRowId={(p) => p.id} initialSort={{ key: "created", direction: "desc" }} pageSize={8} minWidth={760} emptyTitle="No participations" emptyDescription="No participation records are linked here." />;
}

export function TransactionsTable({ rows, caption = "Contributions and transactions" }: { rows: ContributionTransaction[]; caption?: string }) {
  const columns: Column<ContributionTransaction>[] = [
    { key: "id", header: "Transaction", sortValue: (t) => t.id, cell: (t) => idLink(routes.transaction(t.id), t.id) },
    { key: "participation", header: "Participation", sortValue: (t) => t.participationId, cell: (t) => (t.participationId ? idLink(routes.participation(t.participationId), t.participationId) : "—") },
    { key: "amount", header: "Amount", align: "right", sortValue: (t) => t.amountPaise, cell: (t) => formatINR(t.amountPaise) },
    { key: "date", header: "Initiated", sortValue: (t) => t.initiatedAt, cell: (t) => formatDate(t.initiatedAt) },
    { key: "status", header: "Status", sortValue: (t) => t.status, cell: (t) => <StatusBadge domain="transaction" value={t.status} /> },
  ];
  return <DataTable caption={caption} rows={rows} columns={columns} getRowId={(t) => t.id} initialSort={{ key: "date", direction: "desc" }} pageSize={8} minWidth={640} emptyTitle="No transactions" emptyDescription="No contribution transactions are linked here." />;
}

export function AllocationsTable({ rows, caption = "Project allocations", showProject = true }: { rows: ProjectAllocation[]; caption?: string; showProject?: boolean }) {
  const columns: Column<ProjectAllocation>[] = [
    { key: "id", header: "Allocation", sortValue: (a) => a.id, cell: (a) => idLink(routes.allocation(a.participationId), a.id) },
    { key: "participation", header: "Participation", sortValue: (a) => a.participationId, cell: (a) => idLink(routes.participation(a.participationId), a.participationId) },
    ...(showProject ? [{ key: "project", header: "Project", sortValue: (a: ProjectAllocation) => a.projectId, cell: (a: ProjectAllocation) => <ProjectLink id={a.projectId} /> }] : []),
    { key: "proposed", header: "Proposed", align: "right", sortValue: (a) => a.proposedAmountPaise, cell: (a) => formatINR(a.proposedAmountPaise) },
    { key: "approved", header: "Approved", align: "right", sortValue: (a) => a.approvedAmountPaise, cell: (a) => (a.approvedAmountPaise === null ? <span className="text-muted-foreground">—</span> : formatINR(a.approvedAmountPaise)) },
    { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <StatusBadge domain="allocation" value={a.status} /> },
  ];
  return <DataTable caption={caption} rows={rows} columns={columns} getRowId={(a) => a.id} initialSort={{ key: "id", direction: "asc" }} pageSize={8} minWidth={720} emptyTitle="No allocations" emptyDescription="No project allocations are linked here." />;
}

export function ReturnsPayoutsList({ returns, payouts }: { returns: ReturnRecord[]; payouts: PayoutRecord[] }) {
  if (!returns.length && !payouts.length) return <p className="text-sm text-muted-foreground">No return or payout records. Return and payout rules need clarification.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border text-sm">
      {returns.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
          <Link href={`/admin/investments/payouts?return=${r.id}`} className="font-mono text-xs font-medium text-primary hover:underline">{r.id}</Link>
          <span className="text-xs text-muted-foreground">Return record · {formatDate(r.periodFrom)} – {formatDate(r.periodTo)}</span>
          <span className="text-xs">Amount: not calculated (formula pending)</span>
          <StatusBadge domain="returnReview" value={r.reviewStatus} />
        </li>
      ))}
      {payouts.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
          <Link href={routes.payout(p.id)} className="font-mono text-xs font-medium text-primary hover:underline">{p.id}</Link>
          <span className="text-xs text-muted-foreground">Payout · requested {formatDate(p.requestedAt)}</span>
          <span className="flex items-center gap-1.5">{p.amountPaise === null ? "—" : formatINR(p.amountPaise)}{p.fictionalTest && <FictionalBadge />}</span>
          <StatusBadge domain="payout" value={p.status} />
        </li>
      ))}
    </ul>
  );
}

const ENTITY_ROUTE: Record<InvestmentDocument["entityType"], (id: string) => string> = {
  investor: routes.investor,
  application: routes.application,
  project: routes.project,
  plan: routes.plan,
  participation: routes.participation,
  transaction: routes.transaction,
  return: (id) => `/admin/investments/payouts?return=${id}`,
  payout: routes.payout,
};

/** Documents table. Private investor documents are withheld from roles without the permission. */
export function DocumentsTable({ rows, caption = "Investment documents", showEntity = true, actions }: { rows: InvestmentDocument[]; caption?: string; showEntity?: boolean; actions?: (d: InvestmentDocument) => React.ReactNode }) {
  const { can } = useInvestmentAdmin();
  const privateOk = can("inv.documents.private");
  const columns: Column<InvestmentDocument>[] = [
    { key: "id", header: "Document", sortValue: (d) => d.id, cell: (d) => <span className="font-mono text-xs">{d.id}</span> },
    {
      key: "file",
      header: "File (reference only)",
      sortValue: (d) => d.fileName,
      cell: (d) =>
        d.visibility === "private_investor" && !privateOk ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="size-3.5" aria-hidden="true" />Restricted investor document</span>
        ) : (
          <div className="min-w-0"><p className="max-w-[18rem] truncate font-medium">{d.fileName}</p>{d.notes && <p className="max-w-[18rem] truncate text-xs text-muted-foreground">{d.notes}</p>}</div>
        ),
    },
    { key: "type", header: "Type", sortValue: (d) => d.docType, cell: (d) => humanize(d.docType) },
    ...(showEntity ? [{ key: "entity", header: "Related record", sortValue: (d: InvestmentDocument) => `${d.entityType}:${d.entityId}`, cell: (d: InvestmentDocument) => <span className="text-sm">{humanize(d.entityType)} · {idLink(ENTITY_ROUTE[d.entityType](d.entityId), d.entityId)}</span> }] : []),
    { key: "uploaded", header: "Added", sortValue: (d) => d.uploadedAt, cell: (d) => <div><p>{formatDate(d.uploadedAt)}</p><p className="text-xs text-muted-foreground">{d.uploadedBy}</p></div> },
    { key: "review", header: "Review", sortValue: (d) => d.reviewStatus, cell: (d) => <StatusBadge domain="invDocument" value={d.reviewStatus} /> },
    ...(actions ? [{ key: "actions", header: "Actions", srOnlyHeader: true, align: "right" as const, cell: actions }] : []),
  ];
  return <DataTable caption={caption} rows={rows} columns={columns} getRowId={(d) => d.id} initialSort={{ key: "uploaded", direction: "desc" }} pageSize={8} minWidth={820} emptyTitle="No documents" emptyDescription="No document references are linked here." />;
}

/** Audit events for one or more entity IDs. */
export function EntityAuditList({ ids }: { ids: string[] }) {
  const { db } = useInvestmentAdmin();
  const events = db.audit.filter((e) => ids.includes(e.targetId));
  const columns: Column<AuditEvent>[] = [
    { key: "at", header: "Timestamp", sortValue: (e) => e.at, cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.at)}</span> },
    { key: "actor", header: "Actor", sortValue: (e) => e.actorName, cell: (e) => e.actorName },
    { key: "summary", header: "Action", cell: (e) => <div><p>{e.summary}</p><code className="text-[11px] text-muted-foreground">{e.action}</code></div> },
    { key: "note", header: "Reason / note", cell: (e) => <span className="text-xs text-muted-foreground">{e.note ?? "—"}</span> },
  ];
  return <DataTable caption="Audit history" rows={events} columns={columns} getRowId={(e) => e.id} initialSort={{ key: "at", direction: "desc" }} pageSize={8} minWidth={720} emptyTitle="No audit events" emptyDescription="No administrative actions have been recorded for this record." />;
}
