"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, InlineAlert, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { byId } from "@/lib/investment/selectors";
import type { PayoutRecord, ReturnRecord } from "@/lib/investment/types";
import { approvePayout, recordPayoutCompletion, rejectPayout, reviewReturn } from "@/lib/mock/investment-actions";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { AddDocumentButton } from "./document-dialog";
import { FictionalBadge, FormDialog, InvestmentNotice, InvestorLink, NotPermitted, PlanLink, ProjectLink, routes, useInvestmentAdmin } from "./shared";

export function PayoutsView() {
  const { state, can, runAsync, confirm, confirmDialog } = useInvestmentAdmin();
  const params = useSearchParams();
  const focusPayout = params.get("payout");
  const focusReturn = params.get("return");
  const [query, setQuery] = React.useState(focusPayout ?? focusReturn ?? "");
  const [payoutStatus, setPayoutStatus] = React.useState("");
  const [reviewStatus, setReviewStatus] = React.useState("");
  const [reviewing, setReviewing] = React.useState<ReturnRecord | null>(null);
  const [completing, setCompleting] = React.useState<PayoutRecord | null>(null);
  const name = (id: string) => byId(state.investors, id)?.name;

  const returns = state.returns.filter((r) => (!reviewStatus || r.reviewStatus === reviewStatus) && matchesSearch(query, [r.id, r.investorId, name(r.investorId), r.participationId]));
  const payouts = state.payouts.filter((p) => (!payoutStatus || p.status === payoutStatus) && matchesSearch(query, [p.id, p.investorId, name(p.investorId), p.participationId, p.returnRecordId]));

  const returnColumns: Column<ReturnRecord>[] = [
    { key: "id", header: "Return record", sortValue: (r) => r.id, cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "investor", header: "Investor", cell: (r) => <InvestorLink id={r.investorId} /> },
    { key: "participation", header: "Participation", cell: (r) => <Link href={routes.participation(r.participationId)} className="font-mono text-xs text-primary hover:underline">{r.participationId}</Link> },
    { key: "project", header: "Project", cell: (r) => (r.projectId ? <ProjectLink id={r.projectId} /> : "—") },
    { key: "period", header: "Calculation period", sortValue: (r) => r.periodFrom, cell: (r) => `${formatDate(r.periodFrom)} – ${formatDate(r.periodTo)}` },
    { key: "terms", header: "Plan terms", cell: (r) => <PlanLink id={r.planId} version={r.planVersion} /> },
    { key: "amount", header: "Calculated amount", cell: (r) => <div className="grid gap-1"><span className="text-sm text-muted-foreground">Not calculated — formula pending</span>{r.fictionalTestAmountPaise !== null && <span className="flex items-center gap-1.5 text-xs">{formatINR(r.fictionalTestAmountPaise)} <FictionalBadge /></span>}</div> },
    { key: "review", header: "Review", sortValue: (r) => r.reviewStatus, cell: (r) => <StatusBadge domain="returnReview" value={r.reviewStatus} /> },
    { key: "actions", header: "Actions", srOnlyHeader: true, align: "right", cell: (r) => (r.reviewStatus === "pending_review" ? (can("inv.returns.review") ? <Button size="sm" variant="outline" onClick={() => setReviewing(r)}>Review<span className="sr-only"> {r.id}</span></Button> : <NotPermitted action="Reviewing" />) : <span className="text-xs text-muted-foreground">{r.review?.by}, {r.review && formatDate(r.review.at)}</span>) },
  ];

  const payoutColumns: Column<PayoutRecord>[] = [
    { key: "id", header: "Payout", sortValue: (p) => p.id, cell: (p) => <span className="font-mono text-xs">{p.id}</span> },
    { key: "investor", header: "Investor", cell: (p) => <InvestorLink id={p.investorId} /> },
    { key: "participation", header: "Participation", cell: (p) => <Link href={routes.participation(p.participationId)} className="font-mono text-xs text-primary hover:underline">{p.participationId}</Link> },
    { key: "amount", header: "Amount", align: "right", sortValue: (p) => p.amountPaise, cell: (p) => <div className="flex flex-col items-end gap-1">{p.amountPaise === null ? <span className="text-muted-foreground">Cannot be determined</span> : formatINR(p.amountPaise)}{p.fictionalTest && <FictionalBadge />}</div> },
    { key: "type", header: "Payout type", cell: () => <span className="text-sm">Return distribution <NeedsClarification compact /></span> },
    { key: "requested", header: "Requested", sortValue: (p) => p.requestedAt, cell: (p) => formatDate(p.requestedAt) },
    { key: "approval", header: "Approval", cell: (p) => (p.approval ? `${p.approval.by}, ${formatDate(p.approval.at)}` : "—") },
    { key: "status", header: "Payment status", sortValue: (p) => p.status, cell: (p) => <div><StatusBadge domain="payout" value={p.status} />{p.completion && <p className="mt-1 text-xs text-muted-foreground">Ref. {p.completion.reference} (simulated)</p>}{p.rejection && <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">{p.rejection.reason}</p>}</div> },
    {
      key: "actions",
      header: "Actions",
      srOnlyHeader: true,
      align: "right",
      cell: (p) =>
        !can("inv.payouts.approve") ? <NotPermitted action="Approving payouts" /> : (
          <span className="inline-flex flex-wrap justify-end gap-1.5">
            {p.status === "requested" && <Button size="sm" onClick={() => confirm({ title: `Approve payout ${p.id}?`, description: "Approval records a decision only. It is NOT a payment: no money is transferred, and the payout stays “Approved — not paid” until completion evidence is recorded. Payout rules need clarification.", confirmLabel: "Approve payout", details: p.fictionalTest ? <InlineAlert tone="warning">This payout carries a fictional test amount used only to exercise the workflow.</InlineAlert> : undefined, onConfirm: () => runAsync(approvePayout, { payoutId: p.id }) })}>Approve</Button>}
            {(p.status === "requested" || p.status === "approved_unpaid") && <Button size="sm" variant="outline" onClick={() => confirm({ title: `Reject payout ${p.id}?`, description: "The payout record is rejected and kept in the history.", confirmLabel: "Reject payout", tone: "danger", reason: { label: "Rejection reason", placeholder: "Explain the reason for this decision" }, onConfirm: (reason) => runAsync(rejectPayout, { payoutId: p.id, reason }) })}>Reject</Button>}
            {p.status === "approved_unpaid" && <Button size="sm" variant="outline" onClick={() => setCompleting(p)}>Record completion</Button>}
          </span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Returns & payouts" description="Return records and payout requests, ready for review once Mithren Agro approves the financial rules." />
      <InvestmentNotice>No return is calculated and no money is paid by this demo. Amounts marked <FictionalBadge /> are fictional test values used only to exercise the screens; they are excluded from every verified financial metric.</InvestmentNotice>
      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <NeedsClarification refId="Q-INV-RETURNS">Needs clarification — the return formula, any annual percentage, guaranteed or fixed returns, principal protection, maturity, reinvestment and project-specific returns must be approved by Mithren Agro before they can be used. None is assumed.</NeedsClarification>
        <NeedsClarification refId="Q-INV-PAYOUTS">Needs clarification — payout frequency, payout types, early withdrawal, tax treatment and the completion evidence required are not approved. Marking a payout as paid requires a reference and a payout evidence document, and remains a simulated record.</NeedsClarification>
      </div>
      <Card className="mb-6">
        <Toolbar className="mb-0">
          <SearchField label="Search returns and payouts" placeholder="Search by name, ID, participation or reference" value={query} onChange={setQuery} />
          <FilterSelect label="Return review status" value={reviewStatus} onChange={setReviewStatus} options={statusOptions("returnReview")} />
          <FilterSelect label="Payout status" value={payoutStatus} onChange={setPayoutStatus} options={statusOptions("payout")} />
          <ClearFilters active={Boolean(query || reviewStatus || payoutStatus)} onClear={() => { setQuery(""); setReviewStatus(""); setPayoutStatus(""); }} />
        </Toolbar>
      </Card>
      <Card title="Return records" className="mb-6">
        <DataTable caption="Return records" rows={returns} columns={returnColumns} getRowId={(r) => r.id} initialSort={{ key: "period", direction: "desc" }} resetKey={`${query}|${reviewStatus}`} minWidth={1200} emptyTitle="No return records" emptyDescription="Return records can only be produced once a return formula is approved." />
      </Card>
      <Card title="Payout records">
        <DataTable caption="Payout records" rows={payouts} columns={payoutColumns} getRowId={(p) => p.id} initialSort={{ key: "requested", direction: "desc" }} resetKey={`${query}|${payoutStatus}`} minWidth={1200} emptyTitle="No payout records" emptyDescription="No payouts match. Payout rules need clarification." />
        {payouts.some((p) => p.history.length > 1) && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-primary">Payout audit history</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {payouts.flatMap((p) => p.history.map((h) => ({ ...h, id: p.id }))).sort((a, b) => b.at.localeCompare(a.at)).map((h, i) => <li key={i}>{formatDateTime(h.at)} · {h.id}: {h.from ?? "—"} → {h.to} · {h.by}{h.note ? ` · ${h.note}` : ""}</li>)}
            </ul>
          </details>
        )}
      </Card>
      {reviewing && <ReviewReturnDialog record={reviewing} onClose={() => setReviewing(null)} />}
      {completing && <CompletionDialog payout={completing} onClose={() => setCompleting(null)} />}
      {confirmDialog}
    </>
  );
}

function ReviewReturnDialog({ record, onClose }: { record: ReturnRecord; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const [outcome, setOutcome] = React.useState<"reviewed" | "rejected">("reviewed");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Review return record ${record.id}`} description="Recording a review does not calculate, approve or pay any return." submitLabel="Record review" onSubmit={() => { if (!note.trim()) { setError("Explain the reason for this decision."); return null; } return runAsync(reviewReturn, { returnId: record.id, outcome, note }); }}>
      <Field label="Outcome" required><NativeSelect value={outcome} onChange={(e) => setOutcome(e.target.value as "reviewed" | "rejected")}><option value="reviewed">Reviewed</option><option value="rejected">Rejected</option></NativeSelect></Field>
      <Field label="Review note" required error={error}><Textarea value={note} onChange={(e) => { setNote(e.target.value); setError(null); }} placeholder="Explain the reason for this decision" maxLength={1000} /></Field>
    </FormDialog>
  );
}

function CompletionDialog({ payout, onClose }: { payout: PayoutRecord; onClose: () => void }) {
  const { state, runAsync } = useInvestmentAdmin();
  const evidence = state.documents.filter((d) => d.entityType === "payout" && d.entityId === payout.id && d.docType === "payout_evidence");
  const [reference, setReference] = React.useState("");
  const [docId, setDocId] = React.useState("");
  const [errors, setErrors] = React.useState<{ reference?: string; doc?: string }>({});
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Record completion of ${payout.id}`}
      description="Requires a payment reference and a payout evidence document reference. This records a SIMULATED completion; this demo never transfers money."
      submitLabel="Record simulated completion"
      onSubmit={() => {
        const next = { reference: reference.trim() ? undefined : "Enter the payment reference.", doc: docId ? undefined : "Choose the payout evidence document." };
        setErrors(next);
        if (next.reference || next.doc) return null;
        return runAsync(recordPayoutCompletion, { payoutId: payout.id, reference, evidenceDocumentId: docId });
      }}
    >
      <Field label="Payment reference" required error={errors.reference}><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Enter the bank or payment reference" maxLength={60} /></Field>
      <Field label="Payout evidence" required error={errors.doc} hint={evidence.length ? undefined : "No payout evidence reference exists yet. Add one first."}>
        <NativeSelect value={docId} onChange={(e) => setDocId(e.target.value)}>
          <option value="">Select a document</option>
          {evidence.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.fileName}</option>)}
        </NativeSelect>
      </Field>
      <div><AddDocumentButton entityType="payout" entityId={payout.id} defaultType="payout_evidence" label="Add payout evidence reference" /></div>
    </FormDialog>
  );
}
