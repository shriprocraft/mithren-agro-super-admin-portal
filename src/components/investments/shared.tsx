"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "cn";
import { Download, FlaskConical, Lock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Field } from "@/components/admin/field";
import { Badge, Card, DemoNotice, EmptyState, InlineAlert, Timeline } from "@/components/admin/primitives";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useSession } from "@/lib/auth/session";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";
import { formatDate, formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { can as canFor, type InvestmentPermission } from "@/lib/investment/permissions";
import { byId } from "@/lib/investment/selectors";
import type { Note } from "@/lib/investment/types";
import type { ActionResult, MockAction } from "@/lib/mock/actions";
import { recordReportExport } from "@/lib/mock/investment-actions";
import { useDb, useRolePreview, useRunAction } from "@/lib/store/demo-store";

/** Short artificial delay so loading states are visible; every action is still local and simulated. */
export const SIMULATED_LATENCY_MS = 350;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Everything an investment page needs: data, permission checks, async actions with toasts, confirm dialog. */
export function useInvestmentAdmin() {
  const db = useDb();
  const run = useRunAction();
  const toast = useToast();
  const session = useSession();
  const preview = useRolePreview();
  const { confirm, dialog } = useConfirm(toast.success);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const staffId = session.status === "signed_in" ? session.session.staffId : "";

  const can = React.useCallback((permission: InvestmentPermission) => canFor(db, staffId, permission, preview), [db, staffId, preview]);

  /** Runs an action after the simulated latency. Use inside ConfirmDialog (which shows its own feedback). */
  const runAsync = React.useCallback(
    async <P,>(action: MockAction<P>, payload: P): Promise<ActionResult> => {
      await wait(SIMULATED_LATENCY_MS);
      return run(action, payload);
    },
    [run],
  );

  /** Runs an action with a pending key (to disable its button), then toasts the outcome. */
  const act = React.useCallback(
    async <P,>(key: string, action: MockAction<P>, payload: P): Promise<ActionResult> => {
      setPendingKey(key);
      try {
        const result = await runAsync(action, payload);
        if (result.ok) toast.success(result.message);
        else toast.error(result.error);
        return result;
      } finally {
        setPendingKey(null);
      }
    },
    [runAsync, toast],
  );

  return { db, state: db.investment, can, preview, run, runAsync, act, pendingKey, toast, confirm, confirmDialog: dialog };
}

export function InvestmentNotice({ children }: { children?: React.ReactNode }) {
  return (
    <DemoNotice>
      {children ?? (
        <>
          Investment records are <strong>fictional demo data</strong> and every action is <strong>simulated</strong> in this browser. No payment, bank, payout, KYC or
          messaging provider is connected, no money moves, and the 12 projects are illustrative samples, not verified operating businesses.
        </>
      )}
    </DemoNotice>
  );
}

/** Shown in place of controls the current role may not use. */
export function NotPermitted({ action = "This action", className }: { action?: string; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Lock className="size-3.5" aria-hidden="true" />
      {action} is not permitted for your role.
    </p>
  );
}

export function FictionalBadge({ children = "Fictional test data" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-highlight/40 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-foreground ring-1 ring-warning/30 ring-inset">
      <FlaskConical className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}

export const inr = (paise: number | null | undefined) => (paise === null || paise === undefined ? "—" : formatINR(paise));

// ---------------------------------------------------------------- Entity links (stable IDs everywhere)
const linkClass = "rounded-md font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export const routes = {
  investor: (id: string) => `/admin/investments/investors/${id}`,
  project: (id: string) => `/admin/investments/projects/${id}`,
  sector: (id: string) => `/admin/investments/sectors/${id}`,
  plan: (id: string) => `/admin/investments/plans?plan=${id}`,
  participation: (id: string) => `/admin/investments/participations?participation=${id}`,
  transaction: (id: string) => `/admin/investments/transactions?transaction=${id}`,
  application: (id: string) => `/admin/investments/applications?application=${id}`,
  allocation: (participationId: string) => `/admin/investments/allocations?participation=${participationId}`,
  payout: (id: string) => `/admin/investments/payouts?payout=${id}`,
};

export function EntityLink({ href, id, label }: { href: string; id: string; label?: string }) {
  return (
    <Link href={href} className={linkClass}>
      {label ?? id}
      {label && <span className="ml-1 text-xs font-normal whitespace-nowrap text-muted-foreground">{id}</span>}
    </Link>
  );
}

export function InvestorLink({ id, showName = true }: { id: string; showName?: boolean }) {
  const db = useDb();
  const inv = byId(db.investment.investors, id);
  return <EntityLink href={routes.investor(id)} id={id} label={showName ? inv?.name : undefined} />;
}
export function ProjectLink({ id }: { id: string }) {
  const db = useDb();
  return <EntityLink href={routes.project(id)} id={id} label={byId(db.investment.projects, id)?.name} />;
}
export function PlanLink({ id, version }: { id: string; version?: number }) {
  return <EntityLink href={routes.plan(id)} id={version ? `${id} v${version}` : id} />;
}

// ---------------------------------------------------------------- Charts
export interface ChartDatum {
  label: string;
  value: number;
  /** Optional longer label for the tooltip / table. */
  full?: string;
}

/**
 * Single-series bar chart card with a title, axis labels, a tooltip, an empty state and a
 * "Show as table" alternative. Brand colour only; values are counts or recorded sums.
 */
export function BarChartCard({ title, description, data, valueLabel, money = false, layout = "vertical", emptyText, className }: {
  title: string;
  description?: string;
  data: ChartDatum[];
  valueLabel: string;
  money?: boolean;
  layout?: "vertical" | "horizontal";
  emptyText: string;
  className?: string;
}) {
  const id = React.useId();
  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt = (n: number) => (money ? formatINR(n) : formatNumber(n));
  const horizontal = layout === "horizontal";
  return (
    <Card title={title} description={description} className={className}>
      {total === 0 ? (
        <EmptyState title="No data for these filters" description={emptyText} />
      ) : (
        <>
          <figure aria-labelledby={`${id}-cap`}>
            <div className="w-full" style={{ height: horizontal ? Math.max(180, data.length * 34 + 40) : 220 }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="var(--border)" />
                  {horizontal ? (
                    <>
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(n: number) => (money ? `₹${formatNumber(n / 100)}` : String(n))} />
                      <YAxis type="category" dataKey="label" width={128} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={12} />
                      <YAxis tickLine={false} axisLine={false} width={money ? 72 : 32} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(n: number) => (money ? `₹${formatNumber(n / 100)}` : String(n))} />
                    </>
                  )}
                  <Tooltip
                    cursor={{ fill: "var(--soft)" }}
                    content={({ active, payload }) => {
                      const d = active && (payload?.[0]?.payload as ChartDatum | undefined);
                      if (!d) return null;
                      return (
                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-overlay">
                          <p className="font-medium text-foreground">{d.full ?? d.label}</p>
                          <p className="mt-0.5 text-muted-foreground">
                            {valueLabel}: <span className="font-semibold text-foreground">{fmt(d.value)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <figcaption id={`${id}-cap`} className="mt-2 text-xs text-muted-foreground">
              {valueLabel}. Demo data.
            </figcaption>
          </figure>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer rounded-md font-medium text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Show as table</summary>
            <table className="mt-2 w-full text-left text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="py-1">Category</th>
                  <th scope="col" className="py-1 text-right">{valueLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((d) => (
                  <tr key={d.label}>
                    <td className="py-1">{d.full ?? d.label}</td>
                    <td className="py-1 text-right tabular-nums">{fmt(d.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Forms
/** Dialog with a form whose submit returns an ActionResult (possibly async). Errors stay in the dialog. */
export function FormDialog({ open, onOpenChange, title, description, submitLabel, tone = "default", onSubmit, children, wide = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  submitLabel: string;
  tone?: "default" | "danger";
  /** Return null when client-side validation failed (field errors are shown by the caller). */
  onSubmit: () => Promise<ActionResult | null> | ActionResult | null;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const running = React.useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Portalled dialogs still bubble React events; keep a nested dialog's submit from reaching an outer form.
    e.stopPropagation();
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError(null);
    let result: ActionResult | null;
    try {
      result = await onSubmit();
    } catch {
      result = { ok: false, error: "The action could not be completed. Nothing was changed." };
    }
    running.current = false;
    setPending(false);
    if (!result) {
      toast.error("Check the highlighted fields.");
      return;
    }
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      {open && (
        <DialogContent className={wide ? "max-w-2xl" : undefined}>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
            </DialogHeader>
            {children}
            {error && (
              <InlineAlert tone="danger" title="Not applied">
                {error}
              </InlineAlert>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} variant={tone === "danger" ? "destructive-solid" : "default"}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Notes
export function NotesSection({ notes, onAdd, canAdd, placeholder = "Add an internal note visible only to administrators", emptyText = "No notes yet." }: {
  notes: Note[];
  onAdd: (body: string) => Promise<ActionResult>;
  canAdd: boolean;
  placeholder?: string;
  emptyText?: string;
}) {
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError("Enter a note before saving.");
      return;
    }
    setPending(true);
    const result = await onAdd(body);
    setPending(false);
    if (result.ok) setBody("");
  };
  return (
    <div className="grid gap-4">
      <Timeline items={[...notes].reverse().map((n) => ({ at: formatDateTime(n.at), title: n.body, meta: n.by }))} />
      {notes.length === 0 && <p className="sr-only">{emptyText}</p>}
      {canAdd ? (
        <form onSubmit={submit} noValidate className="grid gap-2">
          <Field label="New note" error={error}>
            <Textarea value={body} onChange={(e) => { setBody(e.target.value); setError(null); }} placeholder={placeholder} maxLength={1000} />
          </Field>
          <Button type="submit" variant="outline" loading={pending} className="justify-self-start">
            Save note
          </Button>
        </form>
      ) : (
        <NotPermitted action="Adding notes" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- CSV export (audited)
/**
 * Real client-side CSV download of exactly the rows given (the filtered rows on screen). The export is
 * recorded in the audit trail and requires the export permission.
 */
export function AuditedCsvExport<T>({ reportId, label, filename, rows, columns, filters }: {
  reportId: string;
  label: string;
  filename: string;
  rows: readonly T[];
  columns: readonly CsvColumn<T>[];
  filters: string;
}) {
  const { can, runAsync, toast } = useInvestmentAdmin();
  const [pending, setPending] = React.useState(false);
  if (!can("inv.reports.export")) return <NotPermitted action="Exporting" />;
  const empty = rows.length === 0;
  const onExport = async () => {
    if (pending) return;
    setPending(true);
    // The permission check and audit entry come first; the success message only after the download starts.
    const recorded = await runAsync(recordReportExport, { reportId, label, rows: rows.length, filters });
    if (!recorded.ok) toast.error(recorded.error);
    else if (downloadCsv(filename, toCsv(rows, columns))) toast.success(`Report exported successfully: ${filename} (${rows.length} row${rows.length === 1 ? "" : "s"}, demo data).`);
    else toast.error("Your browser could not start the download. Nothing was exported.");
    setPending(false);
  };
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" onClick={onExport} disabled={empty} loading={pending}>
        {!pending && <Download aria-hidden="true" />}
        Export CSV
      </Button>
      {empty && <span className="text-xs text-muted-foreground">Nothing to export for the current filters.</span>}
    </div>
  );
}

export const dateCell = (iso: string | null | undefined) => (iso ? formatDate(iso) : "—");

export function KeyValueBadges({ items }: { items: { label: string; tone?: "neutral" | "warning" | "info" | "success" | "danger" }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Badge key={i.label} tone={i.tone ?? "neutral"}>
          {i.label}
        </Badge>
      ))}
    </div>
  );
}
