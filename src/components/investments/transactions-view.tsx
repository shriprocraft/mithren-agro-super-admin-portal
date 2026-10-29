"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BadgeCheck, CircleX, PlayCircle, Undo2 } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DetailList, InlineAlert, PageHeader, SectionTitle, StatusBadge, Timeline } from "@/components/admin/primitives";
import { DateRangeFilter } from "@/components/admin/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { inRange, presetRange, type DateRange } from "@/lib/dates";
import { formatDate, formatDateTime, formatINR, humanize } from "@/lib/format";
import { byId, isVerified, participationProjectIds, refundedPaise, SUBMITTED_STATUSES } from "@/lib/investment/selectors";
import type { ContributionTransaction, TransactionStatus } from "@/lib/investment/types";
import { recordDiscrepancy, recordSimulatedRefund, rejectContribution, startContributionReview, verifyContribution } from "@/lib/mock/investment-actions";
import { statusMeta, statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { AddDocumentButton } from "./document-dialog";
import { DocumentsTable } from "./record-tables";
import { AuditedCsvExport, FormDialog, InvestmentNotice, InvestorLink, NotPermitted, PlanLink, routes, useInvestmentAdmin } from "./shared";

/** Meaning of each transaction state; shown in the UI and docs/INVESTMENT_MODULE.md. */
export const TRANSACTION_STATE_MEANING: Record<TransactionStatus, string> = {
  initiated: "Record created; no payment outcome yet.",
  pending: "Awaiting a payment or bank outcome.",
  successful: "A mock payment record reports success. NOT administratively verified and not counted as received.",
  failed: "The payment attempt failed. Never counted as received.",
  under_verification: "An administrator is checking the contribution.",
  verified: "Verified through the (simulated) administrative workflow. Counted as a verified contribution.",
  rejected: "Rejected by an administrator with a reason.",
  partially_refunded: "Part of a verified contribution has a simulated refund recorded.",
  refunded: "The whole verified contribution has a simulated refund recorded.",
};

export function TransactionsView() {
  const { state, can, runAsync, confirm, confirmDialog } = useInvestmentAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [plan, setPlan] = React.useState("");
  const [project, setProject] = React.useState("");
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("transaction"));
  const [dialog, setDialog] = React.useState<null | "refund" | "discrepancy">(null);
  const selected = byId(state.transactions, selectedId);
  const name = (t: ContributionTransaction) => byId(state.investors, t.investorId)?.name ?? t.investorId;
  const rows = state.transactions.filter((t) => (!status || (status === "awaiting" ? SUBMITTED_STATUSES.includes(t.status) : t.status === status)) && (!plan || t.planId === plan) && (!project || (t.participationId && participationProjectIds(state, t.participationId).includes(project))) && inRange(t.initiatedAt, range) && matchesSearch(query, [t.id, t.investorId, name(t), t.participationId]));
  const verifiedTotal = rows.filter(isVerified).reduce((s, t) => s + t.amountPaise, 0);
  const awaitingTotal = rows.filter((t) => SUBMITTED_STATUSES.includes(t.status)).reduce((s, t) => s + t.amountPaise, 0);

  const columns: Column<ContributionTransaction>[] = [
    { key: "id", header: "Transaction", sortValue: (t) => t.id, cell: (t) => <RowLink onClick={() => setSelectedId(t.id)}>{t.id}</RowLink> },
    { key: "investor", header: "Investor", sortValue: (t) => name(t), cell: (t) => <InvestorLink id={t.investorId} /> },
    { key: "participation", header: "Participation", sortValue: (t) => t.participationId, cell: (t) => (t.participationId ? <Link href={routes.participation(t.participationId)} className="font-mono text-xs text-primary hover:underline">{t.participationId}</Link> : "—") },
    { key: "plan", header: "Plan", sortValue: (t) => t.planId, cell: (t) => <PlanLink id={t.planId} version={t.planVersion} /> },
    { key: "amount", header: "Amount", align: "right", sortValue: (t) => t.amountPaise, cell: (t) => formatINR(t.amountPaise) },
    { key: "currency", header: "Currency", cell: (t) => t.currency },
    { key: "type", header: "Type", cell: (t) => humanize(t.type) },
    { key: "method", header: "Method", sortValue: (t) => t.method, cell: (t) => t.method ?? <span className="text-muted-foreground">Not available</span> },
    { key: "ref", header: "Gateway / bank ref.", cell: (t) => t.providerReference ?? <span className="text-xs text-muted-foreground">Not available</span> },
    { key: "date", header: "Date", sortValue: (t) => t.initiatedAt, cell: (t) => formatDate(t.initiatedAt) },
    { key: "status", header: "Verification status", sortValue: (t) => t.status, cell: (t) => <StatusBadge domain="transaction" value={t.status} /> },
    { key: "refund", header: "Refund (simulated)", align: "right", sortValue: (t) => refundedPaise(t), cell: (t) => (refundedPaise(t) ? formatINR(refundedPaise(t)) : <span className="text-muted-foreground">—</span>) },
    { key: "open", header: "Actions", srOnlyHeader: true, align: "right", cell: (t) => <Button size="sm" variant={t.status === "successful" || t.status === "under_verification" ? "default" : "outline"} onClick={() => setSelectedId(t.id)}>{t.status === "successful" || t.status === "under_verification" ? "Review" : "View"}<span className="sr-only"> {t.id}</span></Button> },
  ];

  const startReview = (t: ContributionTransaction) => confirm({ title: `Start verifying ${t.id}?`, description: "The contribution moves to Under verification. It is still not counted as received.", confirmLabel: "Start verification", onConfirm: () => runAsync(startContributionReview, { transactionId: t.id }) });
  const verify = (t: ContributionTransaction) =>
    confirm({
      title: `Mark ${t.id} as verified?`,
      description: `${formatINR(t.amountPaise)} will count as a verified contribution in this demo. This is a SIMULATED administrative verification: no bank statement, gateway confirmation or proof of payment is created or checked.`,
      confirmLabel: "Mark verified (simulated)",
      onConfirm: () => runAsync(verifyContribution, { transactionId: t.id }),
    });
  const reject = (t: ContributionTransaction) => confirm({ title: `Reject contribution ${t.id}?`, description: "The contribution is marked Rejected and never counted as received.", confirmLabel: "Reject contribution", tone: "danger", reason: { label: "Rejection reason", placeholder: "Explain the reason for this decision" }, onConfirm: (reason) => runAsync(rejectContribution, { transactionId: t.id, reason }) });

  return (
    <>
      <PageHeader title="Contributions & transactions" description="Contribution transactions and their verification. A proposed participation is not money received, and a gateway-style “successful” record is not a verification." />
      <InvestmentNotice>All transactions are <strong>demo records</strong>. No gateway or bank is connected: references show “Not available”, verification and refunds are <strong>simulated</strong>, and no money moves.</InvestmentNotice>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="surface-card rounded-2xl px-4 py-3"><p className="text-[13px] text-muted-foreground">Verified contributions (filtered)</p><p className="text-xl font-semibold tabular-nums">{formatINR(verifiedTotal)}</p></div>
        <div className="surface-card rounded-2xl px-4 py-3"><p className="text-[13px] text-muted-foreground">Unconfirmed — not counted as received (filtered)</p><p className="text-xl font-semibold tabular-nums">{formatINR(awaitingTotal)}</p></div>
      </div>
      <Card
        title={`${rows.length} transaction${rows.length === 1 ? "" : "s"}`}
        actions={<AuditedCsvExport reportId="transactions" label="Contribution transactions" filename="mithren-contribution-transactions_demo.csv" rows={rows} filters={`status=${status}; plan=${plan}; project=${project}; ${range.from}..${range.to}; search=${query}`} columns={[{ header: "Transaction ID", value: (t: ContributionTransaction) => t.id }, { header: "Investor ID", value: (t) => t.investorId }, { header: "Participation ID", value: (t) => t.participationId }, { header: "Plan", value: (t) => `${t.planId} v${t.planVersion}` }, { header: "Amount (INR)", value: (t) => (t.amountPaise / 100).toFixed(2) }, { header: "Currency", value: (t) => t.currency }, { header: "Method", value: (t) => t.method }, { header: "Initiated (UTC)", value: (t) => t.initiatedAt }, { header: "Status", value: (t) => statusMeta("transaction", t.status).label }, { header: "Refunded, simulated (INR)", value: (t) => (refundedPaise(t) / 100).toFixed(2) }, { header: "Record type", value: () => "Demo record" }]} />}
      >
        <Toolbar>
          <SearchField label="Search transactions" placeholder="Search by name, ID, project, or reference" value={query} onChange={setQuery} />
          <FilterSelect label="Transaction status" value={status} onChange={setStatus} options={[{ value: "awaiting", label: "Unconfirmed (not received)" }, ...statusOptions("transaction")]} className="sm:w-56" />
          <FilterSelect label="Plan" value={plan} onChange={setPlan} options={state.plans.map((p) => ({ value: p.id, label: p.name.replace("Standard Contribution Plan — ", "") }))} allLabel="All plans" />
          <FilterSelect label="Project" value={project} onChange={setProject} options={state.projects.map((p) => ({ value: p.id, label: p.name }))} allLabel="All projects" />
          <DateRangeFilter value={range} onChange={setRange} />
          <ClearFilters active={Boolean(query || status || plan || project)} onClear={() => { setQuery(""); setStatus(""); setPlan(""); setProject(""); }} />
        </Toolbar>
        <DataTable caption="Contribution transactions" rows={rows} columns={columns} getRowId={(t) => t.id} initialSort={{ key: "date", direction: "desc" }} resetKey={`${query}|${status}|${plan}|${project}|${range.from}|${range.to}`} minWidth={1500} />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-primary">What each status means</summary>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {(Object.keys(TRANSACTION_STATE_MEANING) as TransactionStatus[]).map((s) => <div key={s}><dt><StatusBadge domain="transaction" value={s} /></dt><dd className="mt-0.5 text-xs text-muted-foreground">{TRANSACTION_STATE_MEANING[s]}</dd></div>)}
          </dl>
        </details>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={`Transaction ${selected.id}`} description={`${name(selected)} · ${formatINR(selected.amountPaise)} · demo record`}>
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="transaction" value={selected.status} />
                {can("inv.contributions.review") && selected.status === "successful" && <Button size="sm" variant="outline" onClick={() => startReview(selected)}><PlayCircle aria-hidden="true" />Start verification</Button>}
                {can("inv.contributions.verify") && selected.status === "under_verification" && <Button size="sm" onClick={() => verify(selected)}><BadgeCheck aria-hidden="true" />Mark verified</Button>}
                {can("inv.contributions.verify") && (selected.status === "successful" || selected.status === "under_verification") && <Button size="sm" variant="destructive" onClick={() => reject(selected)}><CircleX aria-hidden="true" />Reject</Button>}
                {can("inv.contributions.verify") && (selected.status === "verified" || selected.status === "partially_refunded") && <Button size="sm" variant="outline" onClick={() => setDialog("refund")}><Undo2 aria-hidden="true" />Record simulated refund</Button>}
                {can("inv.contributions.review") && <Button size="sm" variant="ghost" onClick={() => setDialog("discrepancy")}><AlertTriangle aria-hidden="true" />Record discrepancy</Button>}
                {!can("inv.contributions.review") && <NotPermitted action="Reviewing contributions" />}
              </div>
              <p className="text-xs text-muted-foreground">{TRANSACTION_STATE_MEANING[selected.status]}</p>
              <DetailList items={[
                { label: "Transaction ID (immutable)", value: <span className="font-mono">{selected.id}</span> },
                { label: "Investor", value: <InvestorLink id={selected.investorId} /> },
                { label: "Participation", value: selected.participationId ? <Link href={routes.participation(selected.participationId)} className="font-mono text-primary hover:underline">{selected.participationId}</Link> : "—" },
                { label: "Plan reference", value: <PlanLink id={selected.planId} version={selected.planVersion} /> },
                { label: "Amount", value: `${formatINR(selected.amountPaise)} ${selected.currency}` },
                { label: "Transaction type", value: humanize(selected.type) },
                { label: "Payment method", value: selected.method ?? "Not available" },
                { label: "Gateway / bank reference", value: selected.providerReference ?? "Not available — no provider connected" },
                { label: "Initiated", value: formatDateTime(selected.initiatedAt) },
                { label: "Verification", value: selected.verification ? `${selected.verification.by}, ${formatDateTime(selected.verification.at)} (simulated)` : "Not verified" },
              ]} />
              {selected.failureReason && <InlineAlert tone="danger" title="Failure reason">{selected.failureReason}</InlineAlert>}
              {selected.rejection && <InlineAlert tone="danger" title="Rejected">{selected.rejection.reason}</InlineAlert>}
              {selected.refunds.length > 0 && <section><SectionTitle>Simulated refunds</SectionTitle><Timeline items={selected.refunds.map((r) => ({ at: formatDateTime(r.at), title: `${formatINR(r.amountPaise)} — ${r.reason}`, meta: `${r.by} · simulated, no money moved` }))} /></section>}
              {selected.discrepancies.length > 0 && <section><SectionTitle>Recorded discrepancies</SectionTitle><Timeline items={selected.discrepancies.map((d) => ({ at: formatDateTime(d.at), title: d.body, meta: d.by }))} /></section>}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><SectionTitle className="mb-0">Supporting evidence</SectionTitle>{can("inv.contributions.review") && <AddDocumentButton entityType="transaction" entityId={selected.id} defaultType="contribution_evidence" label="Add evidence reference" />}</div>
                <DocumentsTable rows={state.documents.filter((d) => d.entityType === "transaction" && d.entityId === selected.id)} showEntity={false} caption="Transaction evidence" />
                <p className="mt-2 text-xs text-muted-foreground">Evidence entries are file references supplied by investors or administrators. They are not proof of payment.</p>
              </section>
              <section><SectionTitle>Administrative history</SectionTitle><Timeline items={[...selected.history].reverse().map((h) => ({ at: formatDateTime(h.at), title: `${h.from ? `${humanize(h.from)} → ` : ""}${humanize(h.to)}${h.note ? ` — ${h.note}` : ""}`, meta: h.by }))} /></section>
            </div>
          </SheetContent>
        )}
      </Dialog>
      {selected && dialog === "refund" && <RefundDialog transaction={selected} onClose={() => setDialog(null)} />}
      {selected && dialog === "discrepancy" && <DiscrepancyDialog transaction={selected} onClose={() => setDialog(null)} />}
      {confirmDialog}
    </>
  );
}

function RefundDialog({ transaction: t, onClose }: { transaction: ContributionTransaction; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const remaining = t.amountPaise - refundedPaise(t);
  const [amount, setAmount] = React.useState(String(remaining / 100));
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<{ amount?: string; reason?: string }>({});
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Record a simulated refund for ${t.id}`}
      description="This only records a refund in the demo. No bank transfer, gateway refund or payout is executed."
      submitLabel="Record simulated refund"
      tone="danger"
      onSubmit={() => {
        const n = Number(amount);
        const next = { amount: !Number.isInteger(n) || n <= 0 ? "Enter a valid amount in whole rupees." : n * 100 > remaining ? `Enter at most ${formatINR(remaining)}.` : undefined, reason: reason.trim() ? undefined : "Explain the reason for this decision." };
        setErrors(next);
        if (next.amount || next.reason) return null;
        return runAsync(recordSimulatedRefund, { transactionId: t.id, amountRupees: n, reason });
      }}
    >
      <InlineAlert tone="warning">Refund eligibility rules need clarification (Q-INV-REFUND). Remaining refundable: {formatINR(remaining)}.</InlineAlert>
      <Field label="Refund amount (INR)" required error={errors.amount}><Input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount in INR" /></Field>
      <Field label="Reason" required error={errors.reason}><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for this decision" maxLength={1000} /></Field>
    </FormDialog>
  );
}

function DiscrepancyDialog({ transaction: t, onClose }: { transaction: ContributionTransaction; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Record a payment discrepancy on ${t.id}`} description="Discrepancies are added to the record's history. The transaction itself is not modified." submitLabel="Record discrepancy" onSubmit={() => { if (!body.trim()) { setError("Describe the discrepancy."); return null; } return runAsync(recordDiscrepancy, { transactionId: t.id, body }); }}>
      <Field label="Discrepancy" required error={error}><Textarea value={body} onChange={(e) => { setBody(e.target.value); setError(null); }} placeholder="e.g. The amount in the evidence differs from the plan amount" maxLength={1000} /></Field>
    </FormDialog>
  );
}
