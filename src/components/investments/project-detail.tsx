"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gauge, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Field } from "@/components/admin/field";
import { Card, DetailList, EmptyState, InlineAlert, NeedsClarification, PageHeader, StatusBadge, Timeline } from "@/components/admin/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatDate, formatDateTime, formatINR, formatNumber, humanize } from "@/lib/format";
import { byId, projectStats } from "@/lib/investment/selectors";
import type { AgriculturalProject, ProjectStatus } from "@/lib/investment/types";
import { addMilestone, addProjectNote, deleteProject, setMilestoneStatus, setProjectStatus, updateProjectMetrics } from "@/lib/mock/investment-actions";
import { statusMeta } from "@/lib/status";
import { AddDocumentButton } from "./document-dialog";
import { ProjectFormDialog } from "./projects-view";
import { AllocationsTable, DocumentsTable, EntityAuditList, ParticipationsTable, TransactionsTable } from "./record-tables";
import { FormDialog, InvestmentNotice, NotesSection, NotPermitted, routes, useInvestmentAdmin } from "./shared";

const NEXT_STATUS: Record<ProjectStatus, ProjectStatus[]> = { planning: ["active", "on_hold", "archived"], active: ["on_hold", "archived"], on_hold: ["active", "archived"], archived: [] };

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { state, can, act, runAsync, confirm, confirmDialog, pendingKey, toast } = useInvestmentAdmin();
  const router = useRouter();
  const [dialog, setDialog] = React.useState<null | "edit" | "status" | "metrics" | "milestone">(null);
  const project = byId(state.projects, projectId);
  if (!project) return <EmptyState title="Project not found" description={`No project has the ID “${projectId}”.`} action={<Link href="/admin/investments/projects" className={buttonVariants({ variant: "outline" })}>Back to projects</Link>} />;

  const sector = byId(state.sectors, project.sectorId);
  const stats = projectStats(state, project.id);
  const participations = state.participations.filter((p) => stats.participationIds.includes(p.id));
  const transactions = state.transactions.filter((t) => t.participationId && stats.participationIds.includes(t.participationId));
  const documents = state.documents.filter((d) => d.entityType === "project" && d.entityId === project.id);
  const manage = can("inv.projects.manage");
  const deletable = !project.illustrative && !stats.allocations.length && !documents.length;

  const remove = () =>
    deletable
      ? confirm({ title: `Delete ${project.name}?`, description: "This project has no allocation, financial or document history, so it can be deleted permanently.", confirmLabel: "Delete project", tone: "danger", onConfirm: async () => { const r = await runAsync(deleteProject, { projectId: project.id }); if (r.ok) router.push("/admin/investments/projects"); return r; } })
      : toast.error(project.illustrative ? "Initial sector projects cannot be deleted. Archive the project instead; its history is preserved." : "This project has allocation, financial or document history and cannot be deleted. Archive it instead.");

  return (
    <>
      <Link href="/admin/investments/projects" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Project portfolio</Link>
      <PageHeader
        title={project.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{project.id}</span>
            <Link href={routes.sector(project.sectorId)} className="text-sm text-primary hover:underline">{sector?.name}</Link>
            <StatusBadge domain="project" value={project.status} />
          </span>
        }
        actions={
          manage ? (
            <>
              <Button variant="outline" onClick={() => setDialog("edit")} disabled={project.status === "archived"}><Pencil aria-hidden="true" />Edit</Button>
              <Button variant="outline" onClick={() => setDialog("status")} disabled={project.status === "archived"}><RefreshCcw aria-hidden="true" />Change status</Button>
              <Button variant="ghost" onClick={remove} aria-describedby="delete-hint"><Trash2 aria-hidden="true" />Delete</Button>
            </>
          ) : (
            <NotPermitted action="Managing projects" />
          )
        }
      />
      <InvestmentNotice />
      {project.illustrative && <InlineAlert tone="warning" title="Illustrative demo project" className="mb-5">Name, description and location are sample values. They do not describe a verified operating business. Edit them when actual project details are confirmed.</InlineAlert>}
      {project.status !== "active" && <InlineAlert tone="info" className="mb-5">This project is {statusMeta("project", project.status).label.toLowerCase()}: it cannot receive new allocations. Existing allocations and their history are preserved.</InlineAlert>}
      <p id="delete-hint" className="sr-only">Projects with participation, allocation or document history cannot be deleted; archive them instead.</p>

      <Tabs defaultValue="overview">
        <TabsList aria-label="Project sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Project details</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({project.milestones.length})</TabsTrigger>
          <TabsTrigger value="participations">Participations ({participations.length})</TabsTrigger>
          <TabsTrigger value="allocations">Allocations ({stats.allocations.length})</TabsTrigger>
          <TabsTrigger value="contributions">Contributions ({transactions.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="notes">Updates & notes ({project.notes.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit history</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Operational information" description="Recorded by administrators; unverified. Separate from financial records." actions={manage && project.status !== "archived" ? <Button size="sm" variant="outline" onClick={() => setDialog("metrics")}><Gauge aria-hidden="true" />Update metrics</Button> : undefined}>
              <ul className="divide-y divide-border">
                {project.metrics.map((m) => (
                  <li key={m.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm">{m.label} <span className="text-xs text-muted-foreground">({m.unit})</span></span>
                    {m.value === null ? <span className="text-sm text-muted-foreground">Not recorded</span> : <span className="text-right"><span className="font-semibold tabular-nums">{formatNumber(m.value)}</span><span className="block text-[11px] text-muted-foreground">Entered by {m.recordedBy}{m.recordedAt ? `, ${formatDate(m.recordedAt)}` : ""}</span></span>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Investment records" description="Allocation decisions and linked contributions. Not project performance.">
              <DetailList items={[
                { label: "Participations with allocations", value: stats.participationIds.length },
                { label: "Approved allocations (demo)", value: formatINR(stats.approvedAllocatedPaise) },
                { label: "Proposed (not approved)", value: formatINR(stats.proposedPaise) },
                { label: "Linked contribution transactions", value: transactions.length },
              ]} />
              <div className="mt-4"><NeedsClarification refId="Q-INV-RETURNS">Project-level return or yield figures are not calculated. No return formula has been approved.</NeedsClarification></div>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="details">
          <Card title="Project details">
            <DetailList items={[
              { label: "Project ID", value: <span className="font-mono">{project.id}</span> },
              { label: "Sector", value: sector?.name },
              { label: "Description", value: project.description },
              { label: "Location", value: project.location },
              { label: "Project manager", value: project.managerName ?? "Not assigned" },
              { label: "Status", value: <StatusBadge domain="project" value={project.status} /> },
              { label: "Start date", value: project.startDate ? formatDate(project.startDate) : "Not set" },
              { label: "Planned duration", value: project.plannedDurationMonths ? `${project.plannedDurationMonths} months` : <NeedsClarification compact /> },
              { label: "Created", value: formatDateTime(project.createdAt) },
              { label: "Last updated", value: formatDateTime(project.updatedAt) },
            ]} />
            <h3 className="mt-6 mb-3 text-sm font-semibold">Status history</h3>
            <Timeline items={[...project.statusHistory].reverse().map((h) => ({ at: formatDateTime(h.at), title: `${h.from ? `${humanize(h.from)} → ` : ""}${humanize(h.to)}${h.note ? ` — ${h.note}` : ""}`, meta: h.by }))} />
          </Card>
        </TabsContent>
        <TabsContent value="milestones">
          <Card title="Operational milestones" actions={manage && project.status !== "archived" ? <Button size="sm" variant="outline" onClick={() => setDialog("milestone")}><Plus aria-hidden="true" />Add milestone</Button> : undefined}>
            {project.milestones.length ? (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {project.milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
                    <div><p className="text-sm font-medium">{m.title}</p><p className="text-xs text-muted-foreground">Target {m.targetDate ? formatDate(m.targetDate) : "not set"}</p></div>
                    {manage ? (
                      <NativeSelect aria-label={`Status of ${m.title}`} value={m.status} disabled={pendingKey === m.id} onChange={(e) => act(m.id, setMilestoneStatus, { projectId: project.id, milestoneId: m.id, status: e.target.value as "planned" | "in_progress" | "done" })} className="h-9 w-40 text-sm">
                        <option value="planned">Planned</option><option value="in_progress">In progress</option><option value="done">Done</option>
                      </NativeSelect>
                    ) : <StatusBadge domain="milestone" value={m.status} />}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No milestones recorded.</p>}
          </Card>
        </TabsContent>
        <TabsContent value="participations"><Card title="Investment participations"><ParticipationsTable rows={participations} /></Card></TabsContent>
        <TabsContent value="allocations"><Card title="Project allocations"><AllocationsTable rows={stats.allocations} showProject={false} /></Card></TabsContent>
        <TabsContent value="contributions"><Card title="Contributions associated with this project" description="Transactions of participations that have an allocation to this project."><TransactionsTable rows={transactions} /></Card></TabsContent>
        <TabsContent value="documents"><Card title="Documents" actions={manage && <AddDocumentButton entityType="project" entityId={project.id} />}><DocumentsTable rows={documents} showEntity={false} /></Card></TabsContent>
        <TabsContent value="notes"><Card title="Updates and notes"><NotesSection notes={project.notes} canAdd={manage} placeholder="Record a project update or internal note" onAdd={(body) => act("note", addProjectNote, { projectId: project.id, body })} /></Card></TabsContent>
        <TabsContent value="audit"><Card title="Audit history"><EntityAuditList ids={[project.id, ...stats.allocations.map((a) => a.id)]} /></Card></TabsContent>
      </Tabs>

      {dialog === "edit" && <ProjectFormDialog project={project} onClose={() => setDialog(null)} />}
      {dialog === "status" && <StatusDialog project={project} onClose={() => setDialog(null)} />}
      {dialog === "metrics" && <MetricsDialog project={project} onClose={() => setDialog(null)} />}
      {dialog === "milestone" && <MilestoneDialog project={project} onClose={() => setDialog(null)} />}
      {confirmDialog}
    </>
  );
}

function StatusDialog({ project, onClose }: { project: AgriculturalProject; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const options = NEXT_STATUS[project.status];
  const [status, setStatus] = React.useState<ProjectStatus | "">("");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<{ status?: string; reason?: string }>({});
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Change the status of ${project.name}`}
      description="Allocations, contributions and documents are never removed by a status change."
      submitLabel={status === "archived" ? "Archive project" : "Change status"}
      tone={status === "archived" || status === "on_hold" ? "danger" : "default"}
      onSubmit={() => {
        const next = { status: status ? undefined : "Choose the new status.", reason: reason.trim() ? undefined : "Explain the reason for this decision." };
        setErrors(next);
        if (next.status || next.reason || !status) return null;
        return runAsync(setProjectStatus, { projectId: project.id, status, reason });
      }}
    >
      <Field label="New status" required error={errors.status}>
        <NativeSelect value={status} onChange={(e) => { setStatus(e.target.value as ProjectStatus); setErrors({ ...errors, status: undefined }); }}>
          <option value="">Select a status</option>
          {options.map((s) => <option key={s} value={s}>{statusMeta("project", s).label}</option>)}
        </NativeSelect>
      </Field>
      {status === "archived" && <InlineAlert tone="warning" title="Archiving cannot be undone in this demo">The project keeps its full history but can no longer be edited or receive allocations.</InlineAlert>}
      {(status === "on_hold" || status === "archived") && <p className="text-sm text-muted-foreground">Proposed allocations to this project stay recorded but cannot be approved while it is not Active.</p>}
      <Field label="Reason" required error={errors.reason}><Textarea value={reason} onChange={(e) => { setReason(e.target.value); setErrors({ ...errors, reason: undefined }); }} placeholder="Explain the reason for this decision" maxLength={1000} /></Field>
    </FormDialog>
  );
}

function MetricsDialog({ project, onClose }: { project: AgriculturalProject; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const [values, setValues] = React.useState<Record<string, string>>(Object.fromEntries(project.metrics.map((m) => [m.key, m.value === null ? "" : String(m.value)])));
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Update operational metadata"
      description="Values are recorded as unverified administrative entries. Leave a field blank if it is not known; nothing is estimated."
      submitLabel="Save metrics"
      onSubmit={() => {
        const next: Record<string, string | undefined> = {};
        const parsed: Record<string, number | null> = {};
        for (const m of project.metrics) {
          const raw = values[m.key]?.trim() ?? "";
          const n = raw === "" ? null : Number(raw);
          if (n !== null && (!Number.isFinite(n) || n < 0)) next[m.key] = `Enter a valid, non-negative number for ${m.label}.`;
          parsed[m.key] = n;
        }
        setErrors(next);
        if (Object.values(next).some(Boolean)) return null;
        return runAsync(updateProjectMetrics, { projectId: project.id, values: parsed });
      }}
    >
      {project.metrics.map((m) => (
        <Field key={m.key} label={`${m.label} (${m.unit})`} error={errors[m.key]}>
          <Input type="number" inputMode="decimal" min={0} value={values[m.key] ?? ""} onChange={(e) => setValues({ ...values, [m.key]: e.target.value })} placeholder={`Enter ${m.label.toLowerCase()} in ${m.unit}`} />
        </Field>
      ))}
    </FormDialog>
  );
}

function MilestoneDialog({ project, onClose }: { project: AgriculturalProject; onClose: () => void }) {
  const { runAsync } = useInvestmentAdmin();
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Add a milestone" submitLabel="Add milestone" onSubmit={() => { if (!title.trim()) { setError("Enter the milestone title."); return null; } return runAsync(addMilestone, { projectId: project.id, title, targetDate: date }); }}>
      <Field label="Milestone" required error={error}><Input value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} placeholder="e.g. Site assessment completed" maxLength={120} /></Field>
      <Field label="Target date" hint="Optional"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
    </FormDialog>
  );
}

