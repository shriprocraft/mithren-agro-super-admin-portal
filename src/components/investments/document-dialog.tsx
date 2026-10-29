"use client";

import * as React from "react";
import { FilePlus2 } from "lucide-react";
import { Field } from "@/components/admin/field";
import { InlineAlert } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { humanize } from "@/lib/format";
import type { InvestmentDocumentType, InvestmentEntityType } from "@/lib/investment/types";
import { addDocumentReference, DOCUMENT_LIMITS, validateDocumentFile } from "@/lib/mock/investment-actions";
import { FormDialog, useInvestmentAdmin } from "./shared";

export const DOC_TYPES: InvestmentDocumentType[] = ["project_document", "project_progress_report", "investor_submitted", "plan_terms", "contribution_evidence", "transaction_evidence", "return_calculation", "payout_evidence", "administrative_approval"];
const ENTITY_TYPES: InvestmentEntityType[] = ["investor", "application", "project", "plan", "participation", "transaction", "return", "payout"];

/**
 * Demo-only document reference. The chosen file is read for its name, type and size only; its
 * content is never read, stored or uploaded, and the record says so.
 */
export function AddDocumentButton({ entityType, entityId, defaultType, label = "Add document reference" }: { entityType?: InvestmentEntityType; entityId?: string; defaultType?: InvestmentDocumentType; label?: string }) {
  const { state, runAsync } = useInvestmentAdmin();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ entityType: entityType ?? ("project" as InvestmentEntityType), entityId: entityId ?? "", docType: defaultType ?? ("project_document" as InvestmentDocumentType), notes: "" });
  const [file, setFile] = React.useState<{ name: string; type: string; size: number } | null>(null);
  const [errors, setErrors] = React.useState<{ entityId?: string; file?: string }>({});

  const options: Record<InvestmentEntityType, { id: string; label: string }[]> = {
    investor: state.investors.map((x) => ({ id: x.id, label: `${x.id} · ${x.name}` })),
    application: state.applications.map((x) => ({ id: x.id, label: `${x.id} · ${x.investorId}` })),
    project: state.projects.map((x) => ({ id: x.id, label: `${x.id} · ${x.name}` })),
    plan: state.plans.map((x) => ({ id: x.id, label: `${x.id} · ${x.name}` })),
    participation: state.participations.map((x) => ({ id: x.id, label: `${x.id} · ${x.investorId}` })),
    transaction: state.transactions.map((x) => ({ id: x.id, label: `${x.id} · ${x.investorId}` })),
    return: state.returns.map((x) => ({ id: x.id, label: `${x.id} · ${x.participationId}` })),
    payout: state.payouts.map((x) => ({ id: x.id, label: `${x.id} · ${x.investorId}` })),
  };

  const submit = () => {
    const next = { entityId: form.entityId ? undefined : "Choose the related record.", file: file ? (validateDocumentFile(file) ?? undefined) : "Choose a file (PDF, JPEG or PNG, up to 5 MB)." };
    setErrors(next);
    if (next.entityId || next.file || !file) return null;
    return runAsync(addDocumentReference, { entityType: form.entityType, entityId: form.entityId, docType: form.docType, fileName: file.name, mimeType: file.type, sizeBytes: file.size, notes: form.notes, visibility: "internal" });
  };

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); setFile(null); setErrors({}); }}>
        <FilePlus2 aria-hidden="true" />
        {label}
      </Button>
      <FormDialog open={open} onOpenChange={setOpen} title="Add a document reference" description="Records the file's name, type and size only. The file is not uploaded or stored anywhere in this demo." submitLabel="Record reference" onSubmit={submit}>
        {!entityType && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Related record type" required>
              <NativeSelect value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value as InvestmentEntityType, entityId: "" })}>
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Related record" required error={errors.entityId}>
              <NativeSelect value={form.entityId} onChange={(e) => { setForm({ ...form, entityId: e.target.value }); setErrors((er) => ({ ...er, entityId: undefined })); }}>
                <option value="">Select a record</option>
                {options[form.entityType].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </NativeSelect>
            </Field>
          </div>
        )}
        <Field label="Document type" required>
          <NativeSelect value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value as InvestmentDocumentType })}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="File" required error={errors.file} hint={`Accepted: ${Object.values(DOCUMENT_LIMITS.types).join(", ")}; maximum 5 MB. Only the file name, type and size are recorded.`}>
          <Input
            type="file"
            accept={Object.keys(DOCUMENT_LIMITS.types).join(",")}
            className="h-auto py-2 file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ? { name: f.name, type: f.type, size: f.size } : null);
              setErrors((er) => ({ ...er, file: f ? (validateDocumentFile({ name: f.name, type: f.type, size: f.size }) ?? undefined) : undefined }));
            }}
          />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Describe what this document is for" maxLength={500} />
        </Field>
        <InlineAlert tone="info">Investor documents and contribution evidence are stored as private records visible only to roles with the “View private investor documents” permission.</InlineAlert>
      </FormDialog>
    </>
  );
}
