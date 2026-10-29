"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Plus, Power } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DetailList, InlineAlert, NeedsClarification, PageHeader, SectionTitle, StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { byId, currentVersion, planParticipationCount } from "@/lib/investment/selectors";
import type { ContributionPlan } from "@/lib/investment/types";
import { savePlan, setPlanStatus } from "@/lib/mock/investment-actions";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { DocumentsTable, ParticipationsTable } from "./record-tables";
import { FormDialog, InvestmentNotice, NotPermitted, useInvestmentAdmin } from "./shared";

export function PlansView() {
  const { state, can, runAsync, confirm, confirmDialog } = useInvestmentAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [usage, setUsage] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("plan"));
  const [editing, setEditing] = React.useState<ContributionPlan | "new" | null>(null);
  const selected = byId(state.plans, selectedId);
  const used = (p: ContributionPlan) => planParticipationCount(state, p.id);
  const rows = state.plans.filter((p) => (!status || p.status === status) && (!usage || (usage === "used" ? used(p) > 0 : used(p) === 0)) && matchesSearch(query, [p.name, p.id, String(currentVersion(p).amountPaise / 100)]));
  const manage = can("inv.plans.manage");

  const toggle = (p: ContributionPlan) =>
    confirm(
      p.status === "active"
        ? { title: `Disable ${p.name}?`, description: "The plan can no longer be used for new participations. Existing participations keep the plan version they were created under.", confirmLabel: "Disable plan", tone: "danger", reason: { label: "Reason", placeholder: "Explain the reason for this decision" }, onConfirm: (reason) => runAsync(setPlanStatus, { planId: p.id, status: "disabled", reason }) }
        : { title: `Enable ${p.name}?`, description: "The plan becomes available for new participations again.", confirmLabel: "Enable plan", onConfirm: () => runAsync(setPlanStatus, { planId: p.id, status: "active" }) },
    );

  const columns: Column<ContributionPlan>[] = [
    { key: "id", header: "Plan ID", sortValue: (p) => p.id, cell: (p) => <span className="font-mono text-xs">{p.id}</span> },
    { key: "name", header: "Plan", sortValue: (p) => p.name, cell: (p) => <RowLink onClick={() => setSelectedId(p.id)}>{p.name}</RowLink> },
    { key: "amount", header: "Contribution amount", align: "right", sortValue: (p) => currentVersion(p).amountPaise, cell: (p) => <span className="font-semibold">{formatINR(currentVersion(p).amountPaise)}</span> },
    { key: "currency", header: "Currency", cell: (p) => p.currency },
    { key: "version", header: "Version", align: "right", sortValue: (p) => p.currentVersion, cell: (p) => `v${p.currentVersion}` },
    { key: "terms", header: "Financial terms", cell: () => <NeedsClarification compact /> },
    { key: "used", header: "Participations", align: "right", sortValue: used, cell: used },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge domain="plan" value={p.status} /> },
    { key: "updated", header: "Last updated", sortValue: (p) => p.updatedAt, cell: (p) => formatDate(p.updatedAt) },
  ];

  return (
    <>
      <PageHeader title="Investment plans" description="The standard contribution plan catalogue. Amounts are contribution amounts, not returns." actions={manage ? <Button onClick={() => setEditing("new")}><Plus aria-hidden="true" />New plan</Button> : undefined} />
      <InvestmentNotice>The catalogue holds the five standard contribution amounts supplied for the initial plans (₹1,000; ₹10,000; ₹25,000; ₹50,000; ₹1,00,000). The custom-amount plan is excluded. No rate of return, interest, maturity amount, payout schedule or duration is defined.</InvestmentNotice>
      <div className="mb-5">
        <NeedsClarification refId="Q-INV-PLAN-TERMS">Needs clarification — plan duration, minimum/maximum contribution rules, eligible projects or sectors, and every financial term must be approved by Mithren Agro before they can be used. They are not presented as approved anywhere in this demo.</NeedsClarification>
      </div>
      <Card>
        <Toolbar>
          <SearchField label="Search plans" placeholder="Search by plan name, ID or amount" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("plan")} />
          <FilterSelect label="Usage" value={usage} onChange={setUsage} options={[{ value: "used", label: "Referenced by participations" }, { value: "unused", label: "Not yet used" }]} allLabel="Any" />
          <ClearFilters active={Boolean(query || status || usage)} onClear={() => { setQuery(""); setStatus(""); setUsage(""); }} />
        </Toolbar>
        <DataTable caption="Contribution plans" rows={rows} columns={columns} getRowId={(p) => p.id} initialSort={{ key: "amount", direction: "asc" }} resetKey={`${query}|${status}|${usage}`} minWidth={1000} />
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.name} description={`${selected.id} · current version v${selected.currentVersion}`}>
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="plan" value={selected.status} />
                {manage ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(selected)}><Pencil aria-hidden="true" />Edit</Button>
                    <Button variant={selected.status === "active" ? "destructive" : "outline"} size="sm" onClick={() => toggle(selected)}><Power aria-hidden="true" />{selected.status === "active" ? "Disable" : "Enable"}</Button>
                  </>
                ) : <NotPermitted action="Managing plans" />}
              </div>
              <DetailList items={[
                { label: "Contribution amount", value: formatINR(currentVersion(selected).amountPaise) },
                { label: "Currency", value: selected.currency },
                { label: "Description", value: selected.description },
                { label: "Administrative notes", value: selected.notes || "—" },
                { label: "Investment duration", value: <NeedsClarification compact /> },
                { label: "Minimum / maximum contribution", value: <NeedsClarification compact /> },
                { label: "Eligible projects or sectors", value: <NeedsClarification compact /> },
                { label: "Effective date", value: currentVersion(selected).effectiveFrom ?? <NeedsClarification compact /> },
                { label: "Created", value: formatDateTime(selected.createdAt) },
                { label: "Last updated", value: formatDateTime(selected.updatedAt) },
              ]} />
              <section>
                <SectionTitle>Version history</SectionTitle>
                <ol className="divide-y divide-border rounded-xl border border-border text-sm">
                  {[...selected.versions].reverse().map((v) => (
                    <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                      <span className="font-medium">v{v.version}{v.version === selected.currentVersion && <span className="ml-1.5 text-xs text-success">(current)</span>}</span>
                      <span className="tabular-nums">{formatINR(v.amountPaise)}</span>
                      <span className="text-xs text-muted-foreground">{v.changeNote} · {v.createdBy}, {formatDate(v.createdAt)}</span>
                      <span className="text-xs">{state.participations.filter((p) => p.planId === selected.id && p.planVersion === v.version).length} participation(s)</span>
                    </li>
                  ))}
                </ol>
              </section>
              <section><SectionTitle>Participations using this plan</SectionTitle><ParticipationsTable rows={state.participations.filter((p) => p.planId === selected.id)} /></section>
              <section><SectionTitle>Plan documents</SectionTitle><DocumentsTable rows={state.documents.filter((d) => d.entityType === "plan" && d.entityId === selected.id)} showEntity={false} /></section>
            </div>
          </SheetContent>
        )}
      </Dialog>
      {editing && <PlanFormDialog plan={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {confirmDialog}
    </>
  );
}

function PlanFormDialog({ plan, onClose }: { plan?: ContributionPlan; onClose: () => void }) {
  const { state, runAsync } = useInvestmentAdmin();
  const current = plan ? currentVersion(plan) : undefined;
  const [form, setForm] = React.useState({ name: plan?.name ?? "", description: plan?.description ?? "", notes: plan?.notes ?? "", amount: current ? String(current.amountPaise / 100) : "", changeNote: "" });
  const [confirmVersion, setConfirmVersion] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form | "confirm", string>>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); };
  const amount = Number(form.amount);
  const amountChanged = Boolean(current) && Number.isFinite(amount) && amount * 100 !== current!.amountPaise;
  const referenced = plan ? planParticipationCount(state, plan.id) > 0 : false;

  const submit = () => {
    const next: typeof errors = {
      name: form.name.trim() ? undefined : "Enter the plan name.",
      description: form.description.trim() ? undefined : "Enter a plan description.",
      amount: !form.amount.trim() || !Number.isInteger(amount) || amount <= 0 ? "Enter a valid contribution amount in whole rupees." : state.plans.some((p) => p.id !== plan?.id && currentVersion(p).amountPaise === amount * 100) ? `A standard plan for ${formatINR(amount * 100)} already exists.` : undefined,
      changeNote: amountChanged && !form.changeNote.trim() ? "Explain the reason for changing the contribution amount." : undefined,
      confirm: amountChanged && referenced && !confirmVersion ? "This plan is already referenced by existing participations. Confirm that a new version should be created." : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return null;
    return runAsync(savePlan, { id: plan?.id, name: form.name, description: form.description, notes: form.notes, amountRupees: amount, changeNote: form.changeNote, confirmNewVersion: confirmVersion });
  };

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={plan ? `Edit ${plan.name}` : "New contribution plan"} description="Plans hold a fixed contribution amount. Return, interest, maturity and payout terms cannot be configured." submitLabel="Save plan" onSubmit={submit} wide>
      <Field label="Plan name" required error={errors.name}><Input value={form.name} onChange={set("name")} placeholder="Enter plan name" maxLength={80} /></Field>
      <Field label="Contribution amount (INR)" required error={errors.amount} hint="Whole rupees. This is a contribution amount, not a return."><Input type="number" inputMode="numeric" min={1} step={1} value={form.amount} onChange={set("amount")} placeholder="Enter amount in INR" /></Field>
      {amountChanged && (
        <>
          <InlineAlert tone="warning" title={`This creates version ${(plan?.currentVersion ?? 0) + 1}`}>The amount is not changed in place. Existing participations keep version {current?.version} ({formatINR(current!.amountPaise)}).</InlineAlert>
          <Field label="Reason for the change" required error={errors.changeNote}><Input value={form.changeNote} onChange={set("changeNote")} placeholder="Explain the reason for this decision" maxLength={200} /></Field>
          {referenced && (
            <div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmVersion} onChange={(e) => { setConfirmVersion(e.target.checked); setErrors({ ...errors, confirm: undefined }); }} className="mt-1 size-4 accent-[var(--primary)]" />
                This plan is referenced by {planParticipationCount(state, plan!.id)} participation(s). Create a new version; do not rewrite their terms.
              </label>
              {errors.confirm && <p className="mt-1 text-xs font-medium text-destructive">{errors.confirm}</p>}
            </div>
          )}
        </>
      )}
      <Field label="Description" required error={errors.description}><Textarea value={form.description} onChange={set("description")} placeholder="Describe the plan for administrators" maxLength={500} /></Field>
      <Field label="Administrative notes"><Textarea value={form.notes} onChange={set("notes")} placeholder="Internal notes (optional)" maxLength={500} /></Field>
    </FormDialog>
  );
}
