"use client";

import * as React from "react";
import { Check, Eye, Lock } from "lucide-react";
import { Field } from "@/components/admin/field";
import { Badge, Card, InlineAlert, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { INVESTMENT_PERMISSIONS, roleCan } from "@/lib/investment/permissions";
import type { BusinessRule } from "@/lib/investment/types";
import { recordRule } from "@/lib/mock/investment-actions";
import { rolePreviewStore } from "@/lib/store/demo-store";
import { FormDialog, InvestmentNotice, NotPermitted, useInvestmentAdmin } from "./shared";

export const NC_TEXT = "Needs clarification — this rule must be approved by Mithren Agro before it can be used.";

export function InvestmentSettingsView() {
  const { state, can, preview } = useInvestmentAdmin();
  const [recording, setRecording] = React.useState<BusinessRule | null>(null);
  const manage = can("inv.settings.manage");

  return (
    <>
      <PageHeader title="Investment rules & settings" description="Business rules for the investment programme, recorded only after Mithren Agro approves them, plus the draft permission matrix." />
      <InvestmentNotice>Recording a rule stores the approved wording and its approval reference with a version number. Entering a value here does <strong>not</strong> make it an approved legal or financial policy, and the demo never calculates returns or moves money, whatever is recorded.</InvestmentNotice>

      <div className="grid gap-4 lg:grid-cols-2">
        {state.rules.map((rule) => {
          const v = rule.versions.find((x) => x.version === rule.currentVersion)!;
          return (
            <Card key={rule.key} title={rule.section} description={rule.label} actions={<StatusBadge domain="rule" value={v.status} />}>
              <p className="text-sm text-muted-foreground">{rule.description}</p>
              <div className="mt-3">
                {v.status === "needs_clarification" ? (
                  <NeedsClarification>{NC_TEXT}</NeedsClarification>
                ) : (
                  <InlineAlert tone="success" title={`Recorded rule (v${v.version})`}>
                    <p>{rule.key === "allocation.splitting" ? (v.value === "multi_project" ? "Split between several projects allowed; total may not exceed the contribution amount." : "One project per participation, for the full amount.") : v.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Approval reference {v.approvalReference} · recorded by {v.recordedBy}, {formatDateTime(v.recordedAt)}</p>
                  </InlineAlert>
                )}
              </div>
              {rule.calculationLocked && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" aria-hidden="true" />The demo never applies this as a calculation, even when recorded.</p>}
              {rule.versions.length > 1 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-primary">Version history ({rule.versions.length})</summary>
                  <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {[...rule.versions].reverse().map((x) => <li key={x.version}>v{x.version} · {x.status === "recorded" ? `${x.value} (ref. ${x.approvalReference})` : "Needs clarification"} · {x.recordedBy}, {formatDateTime(x.recordedAt)}</li>)}
                  </ol>
                </details>
              )}
              <div className="mt-4">
                {manage ? <Button size="sm" variant="outline" onClick={() => setRecording(rule)}>Record approved rule</Button> : <NotPermitted action="Managing investment settings" />}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6" title="Investment permission matrix (draft)" description="Extends the existing staff roles. Enforced by the demo's actions as well as the UI.">
        <div className="mb-4"><NeedsClarification refId="Q-PERMISSIONS">The source defines only that Super Admin has full platform access. The Admin role&apos;s investment permissions are not approved, so the demo withholds everything except viewing the overview (least privilege). Changes to this matrix are not offered.</NeedsClarification></div>
        <div className="scrollbar-thin overflow-x-auto rounded-xl border border-border" role="region" aria-label="Investment permission matrix" tabIndex={0}>
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Investment permissions by role</caption>
            <thead className="bg-secondary/70 text-left text-[13px] font-semibold text-muted-foreground"><tr><th scope="col" className="px-3.5 py-2.5">Permission</th><th scope="col" className="px-3.5 py-2.5">Super Admin</th><th scope="col" className="px-3.5 py-2.5">Admin</th></tr></thead>
            <tbody className="divide-y divide-border">
              {INVESTMENT_PERMISSIONS.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-3.5 py-2.5 text-left font-medium">{p.label}</th>
                  <td className="px-3.5 py-2.5"><span className="inline-flex items-center gap-1 text-success"><Check className="size-4" aria-hidden="true" />Granted</span></td>
                  <td className="px-3.5 py-2.5">{roleCan("admin", p.id) ? <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" aria-hidden="true" />Granted (draft)</span> : <span className="inline-flex flex-wrap items-center gap-1.5"><Badge tone="neutral">Withheld</Badge><NeedsClarification compact /></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-soft/60 px-4 py-3">
          <div>
            <p id="preview-label" className="flex items-center gap-1.5 text-sm font-medium"><Eye className="size-4 text-primary" aria-hidden="true" />Preview investment screens with Admin permissions</p>
            <p className="text-xs text-muted-foreground">Downgrade only: it lowers your permissions in this browser to test restrictions, and can never raise them. Actions are still recorded under your name.</p>
          </div>
          <Switch aria-labelledby="preview-label" checked={preview === "admin"} onCheckedChange={(on) => rolePreviewStore.set(on ? "admin" : null)} />
        </div>
      </Card>
      {recording && <RecordRuleDialog rule={recording} onClose={() => setRecording(null)} />}
    </>
  );
}

function RecordRuleDialog({ rule, onClose }: { rule: BusinessRule; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const [value, setValue] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [ack, setAck] = React.useState(false);
  const [errors, setErrors] = React.useState<{ value?: string; reference?: string; ack?: string }>({});
  const splitting = rule.key === "allocation.splitting";
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Record approved rule: ${rule.label}`}
      description="Creates a new rule version. Decisions already made keep the version they were made under."
      submitLabel="Record rule"
      onSubmit={() => {
        const next = { value: value.trim() ? undefined : splitting ? "Choose an allocation splitting option." : "Enter the approved rule.", reference: reference.trim() ? undefined : "Enter the approval reference.", ack: ack ? undefined : "Confirm that Mithren Agro has approved this rule." };
        setErrors(next);
        if (next.value || next.reference || next.ack) return null;
        return runAsync(recordRule, { key: rule.key, value, approvalReference: reference, acknowledged: ack });
      }}
      wide
    >
      {rule.calculationLocked && <InlineAlert tone="warning">This rule is recorded for reference only. The demo will not calculate returns or execute payouts from it.</InlineAlert>}
      {splitting ? (
        <Field label="Approved allocation rule" required error={errors.value}>
          <NativeSelect value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Select the approved option</option>
            <option value="single_project">One project per participation, for the full amount</option>
            <option value="multi_project">Split between several projects; total may not exceed the amount</option>
          </NativeSelect>
        </Field>
      ) : (
        <Field label="Approved rule wording" required error={errors.value}><Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Copy the rule exactly as approved by Mithren Agro" maxLength={1000} /></Field>
      )}
      <Field label="Approval reference" required error={errors.reference} hint="e.g. the approved policy document or board resolution ID"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Enter the approval reference" maxLength={80} /></Field>
      <div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />I confirm that Mithren Agro has formally approved this rule. My own choice is not an approved policy.</label>
        {errors.ack && <p className="mt-1 text-xs font-medium text-destructive">{errors.ack}</p>}
      </div>
    </FormDialog>
  );
}
