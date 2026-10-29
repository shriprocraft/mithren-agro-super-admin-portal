"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ClipboardCheck, Pencil, PlusCircle, ShieldCheck } from "lucide-react";
import { Field } from "@/components/admin/field";
import { Card, DetailList, EmptyState, InlineAlert, NeedsClarification, PageHeader, StatusBadge, Timeline } from "@/components/admin/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { Input, NativeSelect } from "@/components/ui/input";
import { formatDate, formatDateTime, formatINR, humanize } from "@/lib/format";
import { byId, currentVersion, investorStats } from "@/lib/investment/selectors";
import type { Investor } from "@/lib/investment/types";
import { addInvestorNote, createParticipation, INDIAN_MOBILE, reactivateInvestor, suspendInvestor, updateInvestorProfile } from "@/lib/mock/investment-actions";
import { EMAIL } from "@/lib/mock/actions";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { AddDocumentButton } from "./document-dialog";
import { AllocationsTable, DocumentsTable, EntityAuditList, ParticipationsTable, ReturnsPayoutsList, TransactionsTable } from "./record-tables";
import { FormDialog, InvestmentNotice, NotesSection, NotPermitted, routes, useInvestmentAdmin } from "./shared";

export function InvestorDetailView({ investorId }: { investorId: string }) {
  const admin = useInvestmentAdmin();
  const { state, can, runAsync, confirm, confirmDialog, act } = admin;
  const investor = byId(state.investors, investorId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [participationOpen, setParticipationOpen] = React.useState(false);

  if (!can("inv.investors.view")) return <NotPermitted action="Viewing investor records" />;
  if (!investor) {
    return (
      <EmptyState
        title="Investor not found"
        description={`No investor record has the ID “${investorId}”.`}
        action={<Link href="/admin/investments/investors" className={buttonVariants({ variant: "outline" })}>Back to investors</Link>}
      />
    );
  }

  const st = investorStats(state, investor.id);
  const app = st.application;
  const participationIds = st.participations.map((p) => p.id);
  const allocations = state.allocations.filter((a) => participationIds.includes(a.participationId));
  const returns = state.returns.filter((r) => r.investorId === investor.id);
  const payouts = state.payouts.filter((p) => p.investorId === investor.id);
  const documents = state.documents.filter(
    (d) =>
      (d.entityType === "investor" && d.entityId === investor.id) ||
      (d.entityType === "application" && state.applications.some((a) => a.id === d.entityId && a.investorId === investor.id)) ||
      (d.entityType === "participation" && participationIds.includes(d.entityId)) ||
      (d.entityType === "transaction" && st.transactions.some((t) => t.id === d.entityId)),
  );
  const canEdit = can("inv.investors.edit");

  const suspend = () =>
    confirm({
      title: `Suspend ${investor.name}'s investor account?`,
      description: "New participations, allocations and payout approvals are blocked while suspended. Existing participations, contributions and allocations are kept unchanged.",
      confirmLabel: "Suspend account",
      tone: "danger",
      reason: { label: "Reason for suspension", placeholder: "Explain the reason for this decision", hint: "Recorded in the audit trail." },
      onConfirm: (reason) => runAsync(suspendInvestor, { investorId: investor.id, reason }),
    });
  const reactivate = () =>
    confirm({
      title: `Reactivate ${investor.name}'s account?`,
      description: "The account returns to Active in this demo.",
      confirmLabel: "Reactivate account",
      onConfirm: () => runAsync(reactivateInvestor, { investorId: investor.id }),
    });

  return (
    <>
      <Link href="/admin/investments/investors" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All investors
      </Link>
      <PageHeader
        title={investor.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{investor.id}</span>
            <StatusBadge domain="investorAccount" value={investor.accountStatus} />
            {app && <StatusBadge domain="application" value={app.status} />}
          </span>
        }
        actions={
          canEdit ? (
            <>
              <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil aria-hidden="true" />Edit profile</Button>
              {can("inv.participations.approve") && (
                <Button variant="outline" onClick={() => setParticipationOpen(true)} disabled={investor.accountStatus === "suspended"} title={investor.accountStatus === "suspended" ? "Suspended investors cannot start new participations" : undefined}>
                  <PlusCircle aria-hidden="true" />Record participation
                </Button>
              )}
              {investor.accountStatus === "active" ? (
                <Button variant="destructive" onClick={suspend}><Ban aria-hidden="true" />Suspend</Button>
              ) : (
                <Button variant="outline" onClick={reactivate}><ShieldCheck aria-hidden="true" />Reactivate</Button>
              )}
            </>
          ) : (
            <NotPermitted action="Editing investors" />
          )
        }
      />
      <InvestmentNotice>Fictional investor record. Verification statuses come from <strong>manual demo review</strong>, not from any identity, KYC or bank provider.</InvestmentNotice>
      {investor.suspension && (
        <InlineAlert tone="danger" title="Account suspended" className="mb-5">
          {investor.suspension.reason}
          <span className="mt-1 block text-xs text-muted-foreground">By {investor.suspension.by} · {formatDateTime(investor.suspension.at)}. Financial history is preserved.</span>
        </InlineAlert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Participations", value: st.participations.length },
          { label: "Verified contributions", value: formatINR(st.verifiedPaise) },
          { label: "Transactions", value: st.transactions.length },
          { label: "Open admin actions", value: st.pendingActions },
        ].map((m) => (
          <div key={m.label} className="surface-card rounded-2xl px-4 py-3">
            <p className="text-[13px] text-muted-foreground">{m.label}</p>
            <p className="text-xl font-semibold tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="profile">
        <TabsList aria-label="Investor record sections">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="participations">Participations ({st.participations.length})</TabsTrigger>
          <TabsTrigger value="transactions">Contributions ({st.transactions.length})</TabsTrigger>
          <TabsTrigger value="allocations">Allocations ({allocations.length})</TabsTrigger>
          <TabsTrigger value="payouts">Returns & payouts</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="notes">Notes ({investor.notes.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit history</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card title="Profile">
            <DetailList
              items={[
                { label: "Investor ID", value: <span className="font-mono">{investor.id}</span> },
                { label: "Name", value: investor.name },
                { label: "Email (masked)", value: maskEmail(investor.email) },
                { label: "Phone (masked)", value: maskPhone(investor.phone) },
                { label: "City", value: investor.city },
                { label: "Registered", value: formatDateTime(investor.registeredAt) },
              ]}
            />
          </Card>
        </TabsContent>
        <TabsContent value="application">
          <Card title="Application and verification" actions={app && <Link href={routes.application(app.id)} className={buttonVariants({ variant: "outline", size: "sm" })}><ClipboardCheck aria-hidden="true" />Open review</Link>}>
            {app ? (
              <div className="grid gap-4">
                <DetailList items={[{ label: "Application", value: <span className="font-mono">{app.id}</span> }, { label: "Status", value: <StatusBadge domain="application" value={app.status} /> }, { label: "Submitted", value: formatDateTime(app.submittedAt) }, { label: "Decision", value: app.decidedAt ? `${app.decidedBy} · ${formatDateTime(app.decidedAt)}` : "No decision yet" }]} />
                {app.rejectionReason && <InlineAlert tone="danger" title="Rejection reason">{app.rejectionReason}</InlineAlert>}
                <NeedsClarification refId="Q-INV-KYC">Mandatory KYC documents and eligibility criteria are not defined. Review here is manual and does not represent external identity verification.</NeedsClarification>
                <Timeline items={[...app.history].reverse().map((h) => ({ at: formatDateTime(h.at), title: `${h.from ? `${humanize(h.from)} → ` : ""}${humanize(h.to)}${h.note ? ` — ${h.note}` : ""}`, meta: h.by }))} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No application on record.</p>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="participations"><Card title="Investment participations"><ParticipationsTable rows={st.participations} showInvestor={false} /></Card></TabsContent>
        <TabsContent value="transactions"><Card title="Contributions and transactions"><TransactionsTable rows={st.transactions} /></Card></TabsContent>
        <TabsContent value="allocations"><Card title="Project allocations"><AllocationsTable rows={allocations} /></Card></TabsContent>
        <TabsContent value="payouts"><Card title="Approved return and payout records"><ReturnsPayoutsList returns={returns} payouts={payouts} /></Card></TabsContent>
        <TabsContent value="documents">
          <Card title="Uploaded documents" actions={can("inv.applications.review") && <AddDocumentButton entityType="investor" entityId={investor.id} defaultType="investor_submitted" />}>
            <DocumentsTable rows={documents} showEntity />
          </Card>
        </TabsContent>
        <TabsContent value="communication">
          <Card title="Communication history">
            <EmptyState title="Not available" description="No messaging provider is connected and investor communication is not implemented in this demo, so no messages exist." />
          </Card>
        </TabsContent>
        <TabsContent value="notes">
          <Card title="Administrative notes" description="Internal only; not visible to the investor.">
            <NotesSection notes={investor.notes} canAdd={canEdit} onAdd={(body) => act("note", addInvestorNote, { investorId: investor.id, body })} />
          </Card>
        </TabsContent>
        <TabsContent value="audit"><Card title="Audit history"><EntityAuditList ids={[investor.id, ...state.applications.filter((a) => a.investorId === investor.id).map((a) => a.id), ...participationIds, ...st.transactions.map((t) => t.id)]} /></Card></TabsContent>
      </Tabs>

      {editOpen && <EditInvestorDialog investor={investor} onClose={() => setEditOpen(false)} />}
      {participationOpen && <RecordParticipationDialog investor={investor} onClose={() => setParticipationOpen(false)} />}
      {confirmDialog}
    </>
  );
}

function EditInvestorDialog({ investor, onClose }: { investor: Investor; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const [form, setForm] = React.useState({ name: investor.name, email: investor.email, phone: investor.phone, city: investor.city });
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form, string>>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); };
  const submit = () => {
    const next = {
      name: form.name.trim() ? undefined : "Enter the investor's name.",
      email: EMAIL.test(form.email.trim()) ? undefined : "Enter a valid email address.",
      phone: INDIAN_MOBILE.test(form.phone.trim()) ? undefined : "Enter a valid 10-digit mobile number.",
      city: form.city.trim() ? undefined : "Enter the investor's city.",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return null;
    return runAsync(updateInvestorProfile, { investorId: investor.id, ...form });
  };
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Edit investor profile" description="Only profile fields can be edited. Contact details are not written to the audit log." submitLabel="Save profile" onSubmit={submit}>
      <Field label="Full name" required error={errors.name}><Input value={form.name} onChange={set("name")} placeholder="Enter the investor's full name" maxLength={80} /></Field>
      <Field label="Email" required error={errors.email}><Input type="email" value={form.email} onChange={set("email")} placeholder="name@example.com" /></Field>
      <Field label="Mobile number" required error={errors.phone} hint="Indian mobile number, optionally with +91"><Input type="tel" value={form.phone} onChange={set("phone")} placeholder="Enter 10-digit mobile number" /></Field>
      <Field label="City" required error={errors.city}><Input value={form.city} onChange={set("city")} placeholder="Enter city" maxLength={60} /></Field>
    </FormDialog>
  );
}

function RecordParticipationDialog({ investor, onClose }: { investor: Investor; onClose: () => void }) {
  const { state, runAsync } = useInvestmentAdmin();
  const [planId, setPlanId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const plans = state.plans.filter((p) => p.status === "active");
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Record a draft participation for ${investor.name}`}
      description="Creates a Draft participation at the plan's current version. It does not record any payment."
      submitLabel="Record draft"
      onSubmit={() => {
        if (!planId) {
          setError("Select a contribution plan.");
          return null;
        }
        return runAsync(createParticipation, { investorId: investor.id, planId });
      }}
    >
      <Field label="Contribution plan" required error={error}>
        <NativeSelect value={planId} onChange={(e) => { setPlanId(e.target.value); setError(null); }}>
          <option value="">Select a plan</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (v{p.currentVersion}, {formatINR(currentVersion(p).amountPaise)})</option>)}
        </NativeSelect>
      </Field>
      <NeedsClarification refId="Q-INV-COMBINE">Whether an investor may hold several participations or combine plans is not approved. The demo allows recording drafts so the review workflow can be exercised.</NeedsClarification>
      <p className="text-xs text-muted-foreground">Registered {formatDate(investor.registeredAt)}.</p>
    </FormDialog>
  );
}
