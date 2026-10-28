"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, NeedsClarification, PageHeader } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatDate, formatDateTime, formatINR, humanize } from "@/lib/format";
import { addCommissionConfig } from "@/lib/mock/actions";
import { siteConfig } from "@/config/site";
import { istDay } from "@/lib/dates";
import { byId } from "@/lib/mock/selectors";
import { matchesSearch } from "@/lib/table";
import type { CommissionConfig, CommissionRecord, DemoDb } from "@/lib/types";

const targetName = (db: DemoDb, c: CommissionConfig) =>
  c.scope === "global" ? "All sellers and categories" : c.scope === "category" ? (byId(db.categories, c.targetId)?.name ?? c.targetId) : (byId(db.sellers, c.targetId)?.businessName ?? c.targetId);

const VALUE_OPTIONS = [
  { value: "small", label: "Under ₹100" },
  { value: "medium", label: "₹100 – ₹499" },
  { value: "large", label: "₹500 and above" },
];
const valueBandOf = (paise: number) => (paise < 10000 ? "small" : paise < 50000 ? "medium" : "large");

export function CommissionsView() {
  const { db, run, toast } = useAdmin();
  const [formOpen, setFormOpen] = React.useState(false);
  const [scope, setScope] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const [rateState, setRateState] = React.useState("");
  const [effective, setEffective] = React.useState("");
  const [valueBand, setValueBand] = React.useState("");
  const [month, setMonth] = React.useState("");

  const configs = db.commissionConfigs.filter(
    (c) =>
      (!scope || c.scope === scope) &&
      (!rateState || (rateState === "unset" ? c.ratePercent === null : c.ratePercent !== null)) &&
      // Date comparison only: whether an entry is "in effect" is not decided here (Q-COMMISSION-EFFECTIVE).
      (!effective || (effective === "past" ? c.effectiveFrom <= siteConfig.demoReferenceDate : c.effectiveFrom > siteConfig.demoReferenceDate)),
  );
  const months = [...new Set(db.commissionRecords.map((r) => istDay(r.recordedAt).slice(0, 7)))].sort();
  const records = db.commissionRecords.filter(
    (r) =>
      (!seller || r.sellerId === seller) &&
      (!valueBand || valueBandOf(r.baseAmountPaise) === valueBand) &&
      (!month || istDay(r.recordedAt).startsWith(month)) &&
      matchesSearch(query, [r.id, r.subOrderId]),
  );

  const configColumns: Column<CommissionConfig>[] = [
    { key: "scope", header: "Scope", sortValue: (c) => c.scope, cell: (c) => <span className="font-medium">{c.scope === "global" ? "Global default" : `${humanize(c.scope)} override`}</span> },
    { key: "target", header: "Applies to", sortValue: (c) => targetName(db, c), cell: (c) => targetName(db, c) },
    { key: "rate", header: "Rate", sortValue: (c) => c.ratePercent, cell: (c) => (c.ratePercent === null ? <NeedsClarification compact /> : <span>{c.ratePercent}% <span className="text-xs text-muted-foreground">(demo input)</span></span>) },
    { key: "effective", header: "Effective from", sortValue: (c) => c.effectiveFrom, cell: (c) => formatDate(c.effectiveFrom) },
    { key: "created", header: "Added", sortValue: (c) => c.createdAt, cell: (c) => <div><p>{formatDate(c.createdAt)}</p><p className="text-xs text-muted-foreground">{c.createdBy}</p></div> },
    { key: "note", header: "Note", cell: (c) => <span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">{c.note ?? "—"}</span> },
  ];
  const recordColumns: Column<CommissionRecord>[] = [
    { key: "id", header: "Record", sortValue: (r) => r.id, cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "sub", header: "Sub-order", sortValue: (r) => r.subOrderId, cell: (r) => <Link href={`/admin/orders?order=${byId(db.subOrders, r.subOrderId)?.parentId}`} className="text-primary hover:underline">{r.subOrderId}</Link> },
    { key: "seller", header: "Seller", sortValue: (r) => byId(db.sellers, r.sellerId)?.businessName, cell: (r) => byId(db.sellers, r.sellerId)?.businessName },
    { key: "base", header: "Sub-order value", align: "right", sortValue: (r) => r.baseAmountPaise, cell: (r) => formatINR(r.baseAmountPaise) },
    { key: "commission", header: "Commission", align: "right", cell: (r) => (r.commissionPaise === null ? <span className="text-xs text-warning">Not recorded</span> : formatINR(r.commissionPaise)) },
    { key: "at", header: "Recorded", sortValue: (r) => r.recordedAt, cell: (r) => formatDateTime(r.recordedAt) },
  ];

  return (
    <>
      <PageHeader title="Commissions" description="Commission configuration (global default, category and seller overrides, effective dates) and immutable historical calculation records." actions={<Button onClick={() => setFormOpen(true)}><Plus aria-hidden="true" />Add configuration entry</Button>} />
      <DemoNotice>No commission rate, fee rule or formula is defined in the requirements. Entries from the source fixtures therefore show <strong>Needs clarification</strong>; any rate you enter here is demo input and is not applied to any calculation.</DemoNotice>
      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <NeedsClarification refId="Q-COMMISSION-RATE">The global default rate, category rates and seller rates, and whether they are percentages, flat fees or both.</NeedsClarification>
        <NeedsClarification refId="Q-COMMISSION-PRECEDENCE">Which configuration wins when global, category and seller entries overlap, and how a multi-category sub-order is treated.</NeedsClarification>
        <NeedsClarification refId="Q-COMMISSION-EFFECTIVE">How effective dates apply (order date, delivery date or settlement date), rounding rules, and whether entries can be ended or edited.</NeedsClarification>
      </div>
      <Card title="Configuration" description="Entries are append-only in this demo, so earlier configuration is never overwritten.">
        <Toolbar>
          <FilterSelect label="Scope" value={scope} onChange={setScope} options={[{ value: "global", label: "Global default" }, { value: "category", label: "Category override" }, { value: "seller", label: "Seller override" }]} />
          <FilterSelect label="Rate" value={rateState} onChange={setRateState} options={[{ value: "unset", label: "Needs clarification" }, { value: "set", label: "Rate entered (demo input)" }]} allLabel="Any" />
          <FilterSelect label="Effective from" value={effective} onChange={setEffective} options={[{ value: "past", label: "On or before reference date" }, { value: "future", label: "After reference date" }]} allLabel="Any date" />
          <ClearFilters active={Boolean(scope || rateState || effective)} onClear={() => { setScope(""); setRateState(""); setEffective(""); }} />
        </Toolbar>
        <DataTable caption="Commission configuration" rows={configs} columns={configColumns} getRowId={(c) => c.id} initialSort={{ key: "effective", direction: "asc" }} resetKey={`${scope}|${rateState}|${effective}`} />
      </Card>
      <Card className="mt-6" title={<span className="inline-flex items-center gap-2"><Lock className="size-4 text-muted-foreground" aria-hidden="true" />Historical calculation records</span>} description="One record per delivered vendor sub-order. Records are immutable: adding configuration never rewrites them.">
        <Toolbar>
          <SearchField label="Search records" placeholder="Record or sub-order ID" value={query} onChange={setQuery} />
          <FilterSelect label="Seller" value={seller} onChange={setSeller} options={db.sellers.filter((s) => db.commissionRecords.some((r) => r.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
          <FilterSelect label="Sub-order value" value={valueBand} onChange={setValueBand} options={VALUE_OPTIONS} allLabel="Any value" />
          <FilterSelect label="Recorded in" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: formatDate(`${m}-15`).slice(3) }))} allLabel="Any month" />
          <ClearFilters active={Boolean(query || seller || valueBand || month)} onClear={() => { setQuery(""); setSeller(""); setValueBand(""); setMonth(""); }} />
        </Toolbar>
        <DataTable caption="Commission calculation records" rows={records} columns={recordColumns} getRowId={(r) => r.id} initialSort={{ key: "at", direction: "desc" }} resetKey={`${query}|${seller}|${valueBand}|${month}`} />
        <p className="mt-3 text-xs text-muted-foreground">“Not recorded” means no commission amount exists because the rate and formula are not specified. The demo does not back-fill these records.</p>
      </Card>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        {formOpen && (
          <ConfigForm
            db={db}
            onCancel={() => setFormOpen(false)}
            onSave={(input) => {
              const result = run(addCommissionConfig, input);
              if (result.ok) { toast.success(result.message); setFormOpen(false); return null; }
              return result.error;
            }}
          />
        )}
      </Dialog>
    </>
  );
}

function ConfigForm({ db, onSave, onCancel }: { db: DemoDb; onSave: (input: Omit<CommissionConfig, "id" | "createdAt" | "createdBy">) => string | null; onCancel: () => void }) {
  const [scope, setScope] = React.useState<CommissionConfig["scope"]>("category");
  const [targetId, setTargetId] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const targets = scope === "category" ? db.categories.map((c) => ({ value: c.id, label: c.name })) : scope === "seller" ? db.sellers.filter((s) => s.status === "active" || s.status === "suspended").map((s) => ({ value: s.id, label: s.businessName })) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (scope !== "global" && !targetId) next.target = `Choose a ${scope}.`;
    if (!effectiveFrom) next.effectiveFrom = "Enter an effective-from date.";
    const ratePercent = rate.trim() === "" ? null : Number(rate);
    if (ratePercent !== null && (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100)) next.rate = "Enter a percentage between 0 and 100, or leave it empty.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setFormError(onSave({ scope, targetId: scope === "global" ? undefined : targetId, ratePercent, effectiveFrom, note }));
  };

  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader>
          <DialogTitle>Add configuration entry</DialogTitle>
          <DialogDescription>Appended to the configuration list in this demo. Historical records are not changed and no calculation uses this entry.</DialogDescription>
        </DialogHeader>
        <Field label="Scope" required>
          <NativeSelect value={scope} onChange={(e) => { setScope(e.target.value as CommissionConfig["scope"]); setTargetId(""); }}>
            <option value="global">Global default</option>
            <option value="category">Category override</option>
            <option value="seller">Seller override</option>
          </NativeSelect>
        </Field>
        {scope !== "global" && (
          <Field label={scope === "category" ? "Category" : "Seller"} required error={errors.target}>
            <NativeSelect value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Choose…</option>
              {targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </NativeSelect>
          </Field>
        )}
        <Field label="Rate (%) — demo input" error={errors.rate} hint="Leave empty to record the entry as “Needs clarification”. Whether commission is a percentage is itself unconfirmed.">
          <Input type="number" inputMode="decimal" min={0} max={100} step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0–100, e.g. 8.5 (optional)" />
        </Field>
        <Field label="Effective from" required error={errors.effectiveFrom} hint="DD/MM/YYYY">
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </Field>
        <Field label="Note" hint="Optional."><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="min-h-16" placeholder="Why this entry was added (optional)" /></Field>
        {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Add entry</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
