"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, MessageSquareWarning, PlayCircle } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DetailList, NeedsClarification, PageHeader, SectionTitle, StatusBadge, Timeline } from "@/components/admin/primitives";
import { DateRangeFilter } from "@/components/admin/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { inRange, presetRange, type DateRange } from "@/lib/dates";
import { formatDate, formatDateTime, humanize } from "@/lib/format";
import { byId } from "@/lib/investment/selectors";
import type { InvestorApplication } from "@/lib/investment/types";
import { addApplicationNote, transitionApplication } from "@/lib/mock/investment-actions";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { DocumentsTable } from "./record-tables";
import { InvestmentNotice, NotesSection, NotPermitted, routes, useInvestmentAdmin } from "./shared";

const OPEN = ["submitted", "under_review", "info_requested"];

export function ApplicationsView() {
  const { state, can, runAsync, confirm, confirmDialog, act } = useInvestmentAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(params.get("application") ? "" : "open");
  const [docs, setDocs] = React.useState("");
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("application"));
  const selected = byId(state.applications, selectedId);
  const investorOf = (a: InvestorApplication) => byId(state.investors, a.investorId);
  const docsOf = (a: InvestorApplication) => state.documents.filter((d) => d.entityType === "application" && d.entityId === a.id);
  const docState = (a: InvestorApplication) => (docsOf(a).some((d) => d.reviewStatus === "issue_noted") ? "issue" : docsOf(a).some((d) => d.reviewStatus === "not_reviewed") ? "awaiting" : "reviewed");

  const rows = state.applications.filter(
    (a) =>
      (status === "open" ? OPEN.includes(a.status) : !status || a.status === status) &&
      (!docs || docState(a) === docs) &&
      inRange(a.submittedAt, range) &&
      matchesSearch(query, [a.id, a.investorId, investorOf(a)?.name, investorOf(a)?.city]),
  );

  const columns: Column<InvestorApplication>[] = [
    { key: "id", header: "Application", sortValue: (a) => a.id, cell: (a) => <RowLink onClick={() => setSelectedId(a.id)} sub={a.investorId}>{a.id}</RowLink> },
    { key: "investor", header: "Applicant", sortValue: (a) => investorOf(a)?.name, cell: (a) => <div><p className="font-medium">{investorOf(a)?.name}</p><p className="text-xs text-muted-foreground">{investorOf(a)?.city}</p></div> },
    { key: "submitted", header: "Submitted", sortValue: (a) => a.submittedAt, cell: (a) => formatDate(a.submittedAt) },
    { key: "docs", header: "Documents (manual review)", sortValue: (a) => docState(a), cell: (a) => <span className="text-sm">{docsOf(a).filter((d) => d.reviewStatus === "reviewed_manual").length}/{docsOf(a).length} reviewed{docState(a) === "issue" && <span className="text-warning"> · issue noted</span>}</span> },
    { key: "updated", header: "Last update", sortValue: (a) => a.history.at(-1)?.at, cell: (a) => formatDate(a.history.at(-1)!.at) },
    { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <StatusBadge domain="application" value={a.status} /> },
    { key: "review", header: "Review", srOnlyHeader: true, align: "right", cell: (a) => <Button size="sm" variant={OPEN.includes(a.status) ? "default" : "outline"} onClick={() => setSelectedId(a.id)}>{OPEN.includes(a.status) ? "Review" : "View"}<span className="sr-only"> {a.id}</span></Button> },
  ];

  const canReview = can("inv.applications.review");
  const move = (a: InvestorApplication, to: InvestorApplication["status"]) => {
    const name = investorOf(a)?.name ?? a.investorId;
    if (to === "approved")
      return confirm({ title: `Approve ${name}'s application?`, description: "The investor becomes eligible for participation review in this demo. This is a manual administrative decision; no identity or KYC verification is performed.", confirmLabel: "Approve application", onConfirm: () => runAsync(transitionApplication, { applicationId: a.id, to }) });
    if (to === "rejected")
      return confirm({ title: `Reject ${name}'s application?`, description: "The application is marked Rejected. No message is sent to the applicant in this demo.", confirmLabel: "Reject application", tone: "danger", reason: { label: "Rejection reason", placeholder: "Explain the reason for this decision", hint: "Recorded in the application history and the audit trail." }, onConfirm: (reason) => runAsync(transitionApplication, { applicationId: a.id, to, reason }) });
    if (to === "info_requested")
      return confirm({ title: "Request additional information?", description: "The application waits for the applicant. Nothing is sent to the applicant from this demo.", confirmLabel: "Request information", reason: { label: "Information required", placeholder: "Describe exactly what the applicant must provide" }, onConfirm: (reason) => runAsync(transitionApplication, { applicationId: a.id, to, reason }) });
    return confirm({ title: a.status === "info_requested" ? "Resume the review?" : "Start reviewing this application?", description: a.status === "info_requested" ? "Use this when the requested information has been received." : "The application moves to Under review.", confirmLabel: a.status === "info_requested" ? "Resume review" : "Start review", onConfirm: () => runAsync(transitionApplication, { applicationId: a.id, to }) });
  };

  return (
    <>
      <PageHeader title="Investor applications" description="Review applicant profiles and documents, record notes, request information, and approve or reject with a reason." />
      <InvestmentNotice>Applications are reviewed <strong>manually in this demo</strong>. No external identity, KYC or document-verification service is connected, and no status here means that an external provider verified anyone.</InvestmentNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search applications" placeholder="Search by name, application ID, investor ID or city" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "open", label: "Open (needs action)" }, ...statusOptions("application")]} allLabel="All statuses" className="sm:w-56" />
          <FilterSelect label="Document review" value={docs} onChange={setDocs} options={[{ value: "awaiting", label: "Awaiting review" }, { value: "issue", label: "Issue noted" }, { value: "reviewed", label: "All reviewed" }]} allLabel="Any" />
          <DateRangeFilter value={range} onChange={setRange} label="Submitted" />
          <ClearFilters active={Boolean(query || docs || status !== "open")} onClear={() => { setQuery(""); setDocs(""); setStatus("open"); setRange(presetRange("all")); }} />
        </Toolbar>
        <DataTable caption="Investor applications" rows={rows} columns={columns} getRowId={(a) => a.id} initialSort={{ key: "submitted", direction: "asc" }} resetKey={`${query}|${status}|${docs}|${range.from}|${range.to}`} minWidth={900} emptyTitle={status === "open" ? "No open applications" : "No applications match"} emptyDescription={status === "open" ? "Every application has a decision." : "Try a different search or clear the filters."} />
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={`Application ${selected.id}`} description={`${investorOf(selected)?.name ?? selected.investorId} · manual review`}>
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="application" value={selected.status} />
                <Link href={routes.investor(selected.investorId)} className="text-sm font-medium text-primary hover:underline">Open investor record</Link>
              </div>
              {canReview ? (
                <div className="flex flex-wrap gap-2">
                  {(selected.status === "submitted" || selected.status === "info_requested") && <Button variant="outline" onClick={() => move(selected, "under_review")}><PlayCircle aria-hidden="true" />{selected.status === "submitted" ? "Start review" : "Resume review"}</Button>}
                  {selected.status === "under_review" && <Button onClick={() => move(selected, "approved")}><CircleCheck aria-hidden="true" />Approve</Button>}
                  {(selected.status === "submitted" || selected.status === "under_review") && <Button variant="outline" onClick={() => move(selected, "info_requested")}><MessageSquareWarning aria-hidden="true" />Request information</Button>}
                  {OPEN.includes(selected.status) && <Button variant="destructive" onClick={() => move(selected, "rejected")}><CircleX aria-hidden="true" />Reject</Button>}
                  {!OPEN.includes(selected.status) && <p className="text-sm text-muted-foreground">A decision has been recorded. Decisions cannot be reversed in this demo.</p>}
                </div>
              ) : (
                <NotPermitted action="Reviewing applications" />
              )}
              {selected.infoRequest && selected.status === "info_requested" && <p className="rounded-xl bg-warning/5 px-3.5 py-2.5 text-sm"><strong>Information requested:</strong> {selected.infoRequest.message}</p>}
              {selected.rejectionReason && <p className="rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm"><strong>Rejection reason:</strong> {selected.rejectionReason}</p>}
              <section>
                <SectionTitle>Applicant profile</SectionTitle>
                {(() => {
                  const inv = investorOf(selected);
                  return inv ? <DetailList items={[{ label: "Name", value: inv.name }, { label: "Investor ID", value: inv.id }, { label: "Email (masked)", value: maskEmail(inv.email) }, { label: "Phone (masked)", value: maskPhone(inv.phone) }, { label: "City", value: inv.city }, { label: "Submitted", value: formatDateTime(selected.submittedAt) }]} /> : null;
                })()}
              </section>
              <section>
                <SectionTitle>Submitted documents</SectionTitle>
                <DocumentsTable rows={docsOf(selected)} showEntity={false} caption="Application documents" />
              </section>
              <NeedsClarification refId="Q-INV-KYC">Mandatory documents, KYC requirements and eligibility conditions are not approved, so the demo does not enforce any checklist before approval.</NeedsClarification>
              <section>
                <SectionTitle>Review notes</SectionTitle>
                <NotesSection notes={selected.reviewNotes} canAdd={canReview} placeholder="Record what you checked and any concerns" onAdd={(body) => act("note", addApplicationNote, { applicationId: selected.id, body })} />
              </section>
              <section>
                <SectionTitle>Application history</SectionTitle>
                <Timeline items={[...selected.history].reverse().map((h) => ({ at: formatDateTime(h.at), title: `${h.from ? `${humanize(h.from)} → ` : ""}${humanize(h.to)}${h.note ? ` — ${h.note}` : ""}`, meta: h.by }))} />
              </section>
            </div>
          </SheetContent>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}
