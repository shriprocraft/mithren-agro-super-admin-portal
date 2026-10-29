"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, Send } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DetailList, EmptyState, InlineAlert, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatDate, formatINR } from "@/lib/format";
import { allocationTotals, byId } from "@/lib/investment/selectors";
import type { InvestmentParticipation, ProjectAllocation } from "@/lib/investment/types";
import { decideAllocation, proposeAllocation, ruleValue } from "@/lib/mock/investment-actions";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { InvestmentNotice, InvestorLink, NotPermitted, PlanLink, ProjectLink, routes, useInvestmentAdmin } from "./shared";

export function AllocationsView() {
  const { state, can, runAsync, confirm, confirmDialog } = useInvestmentAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [sector, setSector] = React.useState("");
  const [project, setProject] = React.useState("");
  const [focusId, setFocusId] = React.useState<string | null>(params.get("participation"));
  const focus = byId(state.participations, focusId);
  const split = ruleValue(state, "allocation.splitting");
  const manage = can("inv.allocations.manage");

  const participationOf = (a: ProjectAllocation) => byId(state.participations, a.participationId);
  const rows = state.allocations.filter((a) => {
    const p = byId(state.projects, a.projectId);
    const par = participationOf(a);
    return (!status || a.status === status) && (!sector || p?.sectorId === sector) && (!project || a.projectId === project) && matchesSearch(query, [a.id, a.participationId, par?.investorId, byId(state.investors, par?.investorId)?.name, p?.name]);
  });

  const decide = (a: ProjectAllocation, decision: "approved" | "rejected") =>
    confirm({
      title: decision === "approved" ? `Approve allocation ${a.id}?` : `Reject allocation ${a.id}?`,
      description:
        decision === "approved"
          ? `Records an approved allocation of ${formatINR(a.proposedAmountPaise)} to ${byId(state.projects, a.projectId)?.name}. The project must be Active and the investor eligible. This is a demo decision; allocation rules need clarification.`
          : "The proposal is rejected and kept in the history. It is never deleted.",
      confirmLabel: decision === "approved" ? "Approve allocation" : "Reject allocation",
      tone: decision === "rejected" ? "danger" : "default",
      reason: decision === "rejected" ? { label: "Reason", placeholder: "Explain the reason for this decision" } : undefined,
      onConfirm: (reason) => runAsync(decideAllocation, { allocationId: a.id, decision, note: reason }),
    });

  const columns: Column<ProjectAllocation>[] = [
    { key: "id", header: "Allocation", sortValue: (a) => a.id, cell: (a) => <RowLink onClick={() => setFocusId(a.participationId)} sub={`Proposed ${formatDate(a.proposedAt)}`}>{a.id}</RowLink> },
    { key: "investor", header: "Investor", cell: (a) => (participationOf(a) ? <InvestorLink id={participationOf(a)!.investorId} /> : "—") },
    { key: "participation", header: "Participation", sortValue: (a) => a.participationId, cell: (a) => <Link href={routes.participation(a.participationId)} className="font-mono text-xs text-primary hover:underline">{a.participationId}</Link> },
    { key: "project", header: "Project", sortValue: (a) => byId(state.projects, a.projectId)?.name, cell: (a) => <ProjectLink id={a.projectId} /> },
    { key: "proposed", header: "Proposed", align: "right", sortValue: (a) => a.proposedAmountPaise, cell: (a) => formatINR(a.proposedAmountPaise) },
    { key: "approved", header: "Approved", align: "right", sortValue: (a) => a.approvedAmountPaise, cell: (a) => (a.approvedAmountPaise === null ? <span className="text-muted-foreground">—</span> : formatINR(a.approvedAmountPaise)) },
    { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <StatusBadge domain="allocation" value={a.status} /> },
    {
      key: "decision",
      header: "Decision",
      align: "right",
      cell: (a) =>
        a.status === "proposed" && manage ? (
          <span className="inline-flex gap-1.5">
            <Button size="sm" onClick={() => decide(a, "approved")}>Approve<span className="sr-only"> {a.id}</span></Button>
            <Button size="sm" variant="outline" onClick={() => decide(a, "rejected")}>Reject<span className="sr-only"> {a.id}</span></Button>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{a.decidedAt ? `${a.decidedBy}, ${formatDate(a.decidedAt)}` : "Awaiting decision"}</span>
        ),
    },
  ];

  const candidates = state.participations.filter((p) => ["approved", "active"].includes(p.status));

  return (
    <>
      <PageHeader title="Project allocations" description="Propose, review and decide how participations are allocated to projects. Proposals are kept separate from approved allocations." />
      <InvestmentNotice />
      <div className="mb-5">
        {split.status === "needs_clarification" ? (
          <NeedsClarification refId="Q-INV-ALLOCATION">Needs clarification — allocation limits, percentages, eligibility and splitting rules must be approved by Mithren Agro before they can be used. Until then the demo accepts at most one open allocation per participation, never more than its contribution amount, and only to Active projects.</NeedsClarification>
        ) : (
          <InlineAlert tone="success" title={`Recorded allocation rule (v${split.version})`}>{split.value === "multi_project" ? "A participation may be split between several projects; the approved total may not exceed the contribution amount." : "One project per participation, for the full contribution amount."}</InlineAlert>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title="Allocation records" className="min-w-0">
          <Toolbar>
            <SearchField label="Search allocations" placeholder="Search by allocation, participation, investor or project" value={query} onChange={setQuery} />
            <FilterSelect label="Allocation status" value={status} onChange={setStatus} options={statusOptions("allocation")} />
            <FilterSelect label="Sector" value={sector} onChange={(v) => { setSector(v); setProject(""); }} options={state.sectors.map((s) => ({ value: s.id, label: s.name }))} allLabel="All sectors" />
            <FilterSelect label="Project" value={project} onChange={setProject} options={state.projects.filter((p) => !sector || p.sectorId === sector).map((p) => ({ value: p.id, label: p.name }))} allLabel="All projects" />
            <ClearFilters active={Boolean(query || status || sector || project)} onClear={() => { setQuery(""); setStatus(""); setSector(""); setProject(""); }} />
          </Toolbar>
          <DataTable caption="Project allocations" rows={rows} columns={columns} getRowId={(a) => a.id} initialSort={{ key: "id", direction: "desc" }} resetKey={`${query}|${status}|${sector}|${project}`} minWidth={1080} />
        </Card>

        <Card title="Allocation workspace" description="Select a participation to review or propose an allocation.">
          <Field label="Participation">
            <NativeSelect value={focusId ?? ""} onChange={(e) => setFocusId(e.target.value || null)}>
              <option value="">Select an approved or active participation</option>
              {candidates.map((p) => <option key={p.id} value={p.id}>{p.id} · {byId(state.investors, p.investorId)?.name} · {formatINR(p.amountPaise)}</option>)}
            </NativeSelect>
          </Field>
          {focus ? <Workspace key={focus.id} participation={focus} manage={manage} onDecide={decide} /> : <div className="mt-4"><EmptyState title="No participation selected" description="Choose a participation to see its allocations and remaining amount." /></div>}
        </Card>
      </div>
      {confirmDialog}
    </>
  );
}

function Workspace({ participation: p, manage, onDecide }: { participation: InvestmentParticipation; manage: boolean; onDecide: (a: ProjectAllocation, d: "approved" | "rejected") => void }) {
  const { state, runAsync, toast } = useInvestmentAdmin();
  const totals = allocationTotals(state, p);
  const allocations = state.allocations.filter((a) => a.participationId === p.id);
  const investor = byId(state.investors, p.investorId);
  const [projectId, setProjectId] = React.useState("");
  const [amount, setAmount] = React.useState(String(totals.unallocatedPaise / 100 || ""));
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<{ project?: string; amount?: string }>({});
  const [pending, setPending] = React.useState(false);
  const activeProjects = state.projects.filter((x) => x.status === "active");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const n = Number(amount);
    const next = { project: projectId ? undefined : "Choose an eligible project.", amount: !amount.trim() || !Number.isInteger(n) || n <= 0 ? "Enter a valid contribution amount in whole rupees." : n * 100 > totals.unallocatedPaise ? `Enter at most ${formatINR(totals.unallocatedPaise)} (the unallocated amount).` : undefined };
    setErrors(next);
    if (next.project || next.amount) { toast.error("Check the highlighted fields."); return; }
    setPending(true);
    const r = await runAsync(proposeAllocation, { participationId: p.id, projectId, amountRupees: n, note });
    setPending(false);
    if (r.ok) { toast.success(r.message); setProjectId(""); setNote(""); } else toast.error(r.error);
  };

  return (
    <div className="mt-4 grid gap-4">
      <DetailList columns={1} items={[
        { label: "Investor", value: <InvestorLink id={p.investorId} /> },
        { label: "Selected plan", value: <PlanLink id={p.planId} version={p.planVersion} /> },
        { label: "Contribution amount", value: formatINR(p.amountPaise) },
        { label: "Approved allocation", value: formatINR(totals.approvedPaise) },
        { label: "Proposed (not approved)", value: formatINR(totals.proposedPaise) },
        { label: "Remaining unallocated", value: <span className="font-semibold">{formatINR(totals.unallocatedPaise)}</span> },
      ]} />
      {investor?.accountStatus === "suspended" && <InlineAlert tone="danger">The investor account is suspended: no new allocations can be proposed or approved.</InlineAlert>}
      <ul className="divide-y divide-border rounded-xl border border-border text-sm">
        {allocations.length ? allocations.map((a) => (
          <li key={a.id} className="grid gap-1.5 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2"><ProjectLink id={a.projectId} /><StatusBadge domain="allocation" value={a.status} /></div>
            <p className="text-xs text-muted-foreground">{a.id} · proposed {formatINR(a.proposedAmountPaise)}{a.approvedAmountPaise !== null && ` · approved ${formatINR(a.approvedAmountPaise)}`}{a.decisionNote && ` · ${a.decisionNote}`}</p>
            {a.status === "proposed" && manage && (
              <span className="flex gap-1.5">
                <Button size="sm" onClick={() => onDecide(a, "approved")}><CircleCheck aria-hidden="true" />Approve</Button>
                <Button size="sm" variant="outline" onClick={() => onDecide(a, "rejected")}><CircleX aria-hidden="true" />Reject</Button>
              </span>
            )}
          </li>
        )) : <li className="px-3 py-2.5 text-muted-foreground">No allocations yet.</li>}
      </ul>
      {manage ? (
        <form onSubmit={submit} noValidate className="grid gap-3 rounded-2xl border border-border bg-soft/60 p-3.5">
          <p className="text-sm font-semibold">Propose an allocation</p>
          <Field label="Project" required error={errors.project} hint="Only Active projects can receive allocations.">
            <NativeSelect value={projectId} onChange={(e) => { setProjectId(e.target.value); setErrors({ ...errors, project: undefined }); }}>
              <option value="">Choose an eligible project</option>
              {activeProjects.map((x) => <option key={x.id} value={x.id}>{x.name} ({byId(state.sectors, x.sectorId)?.name})</option>)}
            </NativeSelect>
          </Field>
          <Field label="Amount (INR)" required error={errors.amount}><Input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => { setAmount(e.target.value); setErrors({ ...errors, amount: undefined }); }} placeholder="Enter amount in INR" /></Field>
          <Field label="Administrative note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this project? (optional)" maxLength={500} className="min-h-16" /></Field>
          <Button type="submit" loading={pending} className="justify-self-start"><Send aria-hidden="true" />Propose allocation</Button>
        </form>
      ) : <NotPermitted action="Managing allocations" />}
    </div>
  );
}
