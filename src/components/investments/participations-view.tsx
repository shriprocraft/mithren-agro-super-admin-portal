"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DetailList, NeedsClarification, PageHeader, SectionTitle, StatusBadge, Timeline } from "@/components/admin/primitives";
import { DateRangeFilter } from "@/components/admin/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { inRange, presetRange, type DateRange } from "@/lib/dates";
import { formatDate, formatDateTime, formatINR, humanize } from "@/lib/format";
import { allocationTotals, byId, isVerified, participationProjectIds } from "@/lib/investment/selectors";
import type { InvestmentParticipation, ParticipationStatus } from "@/lib/investment/types";
import { participationNextStates, transitionParticipation } from "@/lib/mock/investment-actions";
import { statusMeta, statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { AllocationsTable, TransactionsTable } from "./record-tables";
import { AuditedCsvExport, InvestmentNotice, InvestorLink, NotPermitted, PlanLink, routes, useInvestmentAdmin } from "./shared";

const ACTION_LABEL: Partial<Record<ParticipationStatus, string>> = { submitted: "Mark submitted", awaiting_review: "Start review", approved: "Approve", active: "Activate", cancelled: "Cancel", rejected: "Reject" };

export function ParticipationsView() {
  const { state, can, runAsync, confirm, confirmDialog } = useInvestmentAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [plan, setPlan] = React.useState("");
  const [sector, setSector] = React.useState("");
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("participation"));
  const selected = byId(state.participations, selectedId);
  const name = (p: InvestmentParticipation) => byId(state.investors, p.investorId)?.name ?? p.investorId;
  const inSector = (p: InvestmentParticipation) => participationProjectIds(state, p.id).some((pid) => byId(state.projects, pid)?.sectorId === sector);
  const rows = state.participations.filter((p) => (!status || p.status === status) && (!plan || p.planId === plan) && (!sector || inSector(p)) && inRange(p.createdAt, range) && matchesSearch(query, [p.id, p.investorId, name(p)]));

  const columns: Column<InvestmentParticipation>[] = [
    { key: "id", header: "Participation", sortValue: (p) => p.id, cell: (p) => <RowLink onClick={() => setSelectedId(p.id)}>{p.id}</RowLink> },
    { key: "investor", header: "Investor", sortValue: (p) => name(p), cell: (p) => <InvestorLink id={p.investorId} /> },
    { key: "plan", header: "Plan / version", sortValue: (p) => p.planId, cell: (p) => <PlanLink id={p.planId} version={p.planVersion} /> },
    { key: "amount", header: "Contribution amount", align: "right", sortValue: (p) => p.amountPaise, cell: (p) => formatINR(p.amountPaise) },
    { key: "projects", header: "Projects (allocations)", cell: (p) => { const ids = participationProjectIds(state, p.id); return ids.length ? <span className="text-sm">{ids.map((id) => byId(state.projects, id)?.name ?? id).join(", ")}</span> : <span className="text-muted-foreground">None</span>; } },
    { key: "created", header: "Created", sortValue: (p) => p.createdAt, cell: (p) => formatDate(p.createdAt) },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge domain="participation" value={p.status} /> },
  ];

  const move = (p: InvestmentParticipation, to: ParticipationStatus) => {
    const needsReason = to === "rejected" || to === "cancelled";
    confirm({
      title: `${ACTION_LABEL[to]} participation ${p.id}?`,
      description:
        to === "active"
          ? "Activation requires verified contributions equal to the participation amount. Contractual effects of activation need clarification."
          : to === "approved"
            ? "Approval requires an active investor account and an approved application. This is a demo decision with no contractual effect."
            : `The participation moves to ${statusMeta("participation", to).label}.${needsReason ? " Proposed allocations are withdrawn; approved allocations and all transactions are kept." : ""}`,
      confirmLabel: ACTION_LABEL[to] ?? "Confirm",
      tone: needsReason ? "danger" : "default",
      reason: needsReason ? { label: "Reason", placeholder: "Explain the reason for this decision" } : undefined,
      onConfirm: (reason) => runAsync(transitionParticipation, { participationId: p.id, to, reason }),
    });
  };

  return (
    <>
      <PageHeader title="Investment participations" description="An investor's participation in a plan version. Participation records are separate from the money actually received." />
      <InvestmentNotice />
      <div className="mb-5"><NeedsClarification refId="Q-INV-LIFECYCLE">The lifecycle states are proposed. Completion conditions and the contractual effect of each state are not approved, so participations cannot be completed in this demo.</NeedsClarification></div>
      <Card
        title={`${rows.length} participation${rows.length === 1 ? "" : "s"}`}
        actions={<AuditedCsvExport reportId="participations" label="Participations" filename="mithren-participations_demo.csv" rows={rows} filters={`status=${status}; plan=${plan}; sector=${sector}; ${range.from}..${range.to}; search=${query}`} columns={[{ header: "Participation ID", value: (p: InvestmentParticipation) => p.id }, { header: "Investor ID", value: (p) => p.investorId }, { header: "Plan ID", value: (p) => p.planId }, { header: "Plan version", value: (p) => p.planVersion }, { header: "Contribution amount (INR)", value: (p) => (p.amountPaise / 100).toFixed(2) }, { header: "Status", value: (p) => p.status }, { header: "Created (UTC)", value: (p) => p.createdAt }]} />}
      >
        <Toolbar>
          <SearchField label="Search participations" placeholder="Search by participation ID, investor name or ID" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("participation")} />
          <FilterSelect label="Plan" value={plan} onChange={setPlan} options={state.plans.map((p) => ({ value: p.id, label: p.name.replace("Standard Contribution Plan — ", "") }))} allLabel="All plans" />
          <FilterSelect label="Sector" value={sector} onChange={setSector} options={state.sectors.map((s) => ({ value: s.id, label: s.name }))} allLabel="All sectors" />
          <DateRangeFilter value={range} onChange={setRange} label="Created" />
          <ClearFilters active={Boolean(query || status || plan || sector)} onClear={() => { setQuery(""); setStatus(""); setPlan(""); setSector(""); }} />
        </Toolbar>
        <DataTable caption="Investment participations" rows={rows} columns={columns} getRowId={(p) => p.id} initialSort={{ key: "created", direction: "desc" }} resetKey={`${query}|${status}|${plan}|${sector}|${range.from}|${range.to}`} minWidth={980} />
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (() => {
          const totals = allocationTotals(state, selected);
          const txns = state.transactions.filter((t) => t.participationId === selected.id);
          const verified = txns.filter(isVerified).reduce((s, t) => s + t.amountPaise, 0);
          const next = participationNextStates(selected.status).filter((s) => s !== "submitted");
          return (
            <SheetContent title={`Participation ${selected.id}`} description={`${name(selected)} · ${formatINR(selected.amountPaise)}`}>
              <div className="grid gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge domain="participation" value={selected.status} />
                  {can("inv.participations.approve") ? (
                    next.map((to) => (
                      <Button key={to} size="sm" variant={to === "cancelled" || to === "rejected" ? "destructive" : to === "approved" || to === "active" ? "default" : "outline"} onClick={() => move(selected, to)}>
                        {ACTION_LABEL[to]}
                      </Button>
                    ))
                  ) : (
                    <NotPermitted action="Changing participation status" />
                  )}
                  {selected.status === "active" && <span className="text-xs text-muted-foreground">Completion needs clarification.</span>}
                </div>
                <DetailList items={[
                  { label: "Investor", value: <InvestorLink id={selected.investorId} /> },
                  { label: "Plan and version", value: <PlanLink id={selected.planId} version={selected.planVersion} /> },
                  { label: "Contribution amount (plan v" + selected.planVersion + ")", value: formatINR(selected.amountPaise) },
                  { label: "Approved terms", value: <span className="text-sm">Plan {selected.planId} v{selected.planVersion} · financial terms <NeedsClarification compact /></span> },
                  { label: "Verified contributions", value: formatINR(verified) },
                  { label: "Approved allocations", value: formatINR(totals.approvedPaise) },
                  { label: "Proposed allocations", value: formatINR(totals.proposedPaise) },
                  { label: "Unallocated", value: formatINR(totals.unallocatedPaise) },
                  { label: "Created", value: formatDateTime(selected.createdAt) },
                  { label: "Last updated", value: formatDateTime(selected.updatedAt) },
                ]} />
                <section>
                  <div className="mb-3 flex items-center justify-between"><SectionTitle className="mb-0">Project allocations</SectionTitle><Link href={routes.allocation(selected.id)} className="text-sm font-medium text-primary hover:underline">Open allocation workspace</Link></div>
                  <AllocationsTable rows={state.allocations.filter((a) => a.participationId === selected.id)} />
                </section>
                <section><SectionTitle>Contributions</SectionTitle><TransactionsTable rows={txns} /></section>
                {selected.notes.length > 0 && <section><SectionTitle>Notes</SectionTitle><Timeline items={selected.notes.map((n) => ({ at: formatDateTime(n.at), title: n.body, meta: n.by }))} /></section>}
                <section>
                  <SectionTitle>Status history</SectionTitle>
                  <Timeline items={[...selected.history].reverse().map((h) => ({ at: formatDateTime(h.at), title: `${h.from ? `${humanize(h.from)} → ` : ""}${humanize(h.to)}${h.note ? ` — ${h.note}` : ""}`, meta: h.by }))} />
                </section>
              </div>
            </SheetContent>
          );
        })()}
      </Dialog>
      {confirmDialog}
    </>
  );
}
