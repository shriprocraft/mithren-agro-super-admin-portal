"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatDate, formatINR } from "@/lib/format";
import { byId, projectStats } from "@/lib/investment/selectors";
import type { AgriculturalProject } from "@/lib/investment/types";
import { saveProject, validateProject, type ProjectInput } from "@/lib/mock/investment-actions";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { FormDialog, InvestmentNotice, routes, useInvestmentAdmin } from "./shared";

export function ProjectsTable({ rows, resetKey }: { rows: AgriculturalProject[]; resetKey?: string }) {
  const { state } = useInvestmentAdmin();
  const stats = (id: string) => projectStats(state, id);
  const columns: Column<AgriculturalProject>[] = [
    { key: "id", header: "Project ID", sortValue: (p) => p.id, cell: (p) => <span className="font-mono text-xs">{p.id}</span> },
    { key: "name", header: "Project", sortValue: (p) => p.name, cell: (p) => <Link href={routes.project(p.id)} className="font-medium text-primary hover:underline">{p.name}</Link> },
    { key: "sector", header: "Sector", sortValue: (p) => byId(state.sectors, p.sectorId)?.name, cell: (p) => byId(state.sectors, p.sectorId)?.name ?? "—" },
    { key: "location", header: "Location", sortValue: (p) => p.location, cell: (p) => <span className="block max-w-[14rem] truncate" title={p.location}>{p.location}</span> },
    { key: "manager", header: "Manager", sortValue: (p) => p.managerName, cell: (p) => p.managerName ?? <span className="text-muted-foreground">Not assigned</span> },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge domain="project" value={p.status} /> },
    { key: "start", header: "Start date", sortValue: (p) => p.startDate, cell: (p) => (p.startDate ? formatDate(p.startDate) : "—") },
    { key: "duration", header: "Planned duration", sortValue: (p) => p.plannedDurationMonths, cell: (p) => (p.plannedDurationMonths ? `${p.plannedDurationMonths} months` : <NeedsClarification compact />) },
    { key: "participations", header: "Participations", align: "right", sortValue: (p) => stats(p.id).participationIds.length, cell: (p) => stats(p.id).participationIds.length },
    { key: "allocated", header: "Approved allocations", align: "right", sortValue: (p) => stats(p.id).approvedAllocatedPaise, cell: (p) => formatINR(stats(p.id).approvedAllocatedPaise) },
    { key: "updated", header: "Last updated", sortValue: (p) => p.updatedAt, cell: (p) => formatDate(p.updatedAt) },
    { key: "view", header: "Actions", srOnlyHeader: true, align: "right", cell: (p) => <Link href={routes.project(p.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>View<span className="sr-only"> {p.name}</span></Link> },
  ];
  return <DataTable caption="Projects" rows={rows} columns={columns} getRowId={(p) => p.id} initialSort={{ key: "id", direction: "asc" }} resetKey={resetKey} minWidth={1300} emptyDescription="No projects match the search or filters." />;
}

export function ProjectsView() {
  const { state, can } = useInvestmentAdmin();
  const [query, setQuery] = React.useState("");
  const [sector, setSector] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [manager, setManager] = React.useState("");
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [creating, setCreating] = React.useState(false);
  const managers = [...new Set(state.projects.map((p) => p.managerName ?? "__none"))].sort();
  const rows = state.projects.filter((p) => (!sector || p.sectorId === sector) && (!status || p.status === status) && (!manager || (p.managerName ?? "__none") === manager) && matchesSearch(query, [p.name, p.id, p.location, p.managerName]));

  return (
    <>
      <PageHeader
        title="Project portfolio"
        description="All agricultural projects across the six sectors. Operational information is kept separate from financial records."
        actions={can("inv.projects.manage") ? <Button onClick={() => setCreating(true)}><Plus aria-hidden="true" />New project</Button> : undefined}
      />
      <InvestmentNotice>The 12 initial projects are <strong>illustrative demo projects</strong> with sample names, descriptions and locations. They are not verified operating businesses, and no production or financial performance is recorded for them.</InvestmentNotice>
      <Card
        title={`${rows.length} project${rows.length === 1 ? "" : "s"}`}
        actions={
          <div role="radiogroup" aria-label="Layout" className="inline-flex rounded-full border border-border bg-card p-1">
            {(["table", "cards"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>
                {v === "table" ? <Table2 className="size-3.5" aria-hidden="true" /> : <LayoutGrid className="size-3.5" aria-hidden="true" />}
                {v === "table" ? "Table" : "Cards"}
              </button>
            ))}
          </div>
        }
      >
        <Toolbar>
          <SearchField label="Search projects" placeholder="Search by name, project ID, location or manager" value={query} onChange={setQuery} />
          <FilterSelect label="Sector" value={sector} onChange={setSector} options={state.sectors.map((s) => ({ value: s.id, label: s.name }))} allLabel="All sectors" />
          <FilterSelect label="Project status" value={status} onChange={setStatus} options={statusOptions("project")} />
          <FilterSelect label="Manager" value={manager} onChange={setManager} options={managers.map((m) => ({ value: m, label: m === "__none" ? "Not assigned" : m }))} allLabel="Any manager" />
          <ClearFilters active={Boolean(query || sector || status || manager)} onClear={() => { setQuery(""); setSector(""); setStatus(""); setManager(""); }} />
        </Toolbar>
        {view === "table" ? (
          <ProjectsTable rows={rows} resetKey={`${query}|${sector}|${status}|${manager}`} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => {
              const st = projectStats(state, p.id);
              return (
                <li key={p.id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={routes.project(p.id)} className="font-semibold text-primary hover:underline">{p.name}</Link>
                      <p className="text-xs text-muted-foreground">{p.id} · {byId(state.sectors, p.sectorId)?.name}</p>
                    </div>
                    <StatusBadge domain="project" value={p.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{p.location} · {p.managerName ?? "No manager assigned"}</p>
                  <p className="mt-auto pt-3 text-xs">{st.participationIds.length} participation(s) · {formatINR(st.approvedAllocatedPaise)} approved allocations</p>
                </li>
              );
            })}
            {!rows.length && <li className="text-sm text-muted-foreground">No projects match the search or filters.</li>}
          </ul>
        )}
      </Card>
      {creating && <ProjectFormDialog onClose={() => setCreating(false)} />}
    </>
  );
}

/** Create or edit a project. Validation runs inline and again in the action. */
export function ProjectFormDialog({ project, onClose }: { project?: AgriculturalProject; onClose: () => void }) {
  const { db, state, runAsync } = useInvestmentAdmin();
  const [form, setForm] = React.useState({
    sectorId: project?.sectorId ?? "",
    name: project?.name ?? "",
    description: project?.description ?? "",
    location: project?.location ?? "",
    managerName: project?.managerName ?? "",
    startDate: project?.startDate ?? "",
    duration: project?.plannedDurationMonths ? String(project.plannedDurationMonths) : "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof ProjectInput, string>>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const hasHistory = project ? state.allocations.some((a) => a.projectId === project.id) : false;

  const submit = () => {
    const duration = form.duration.trim() === "" ? null : Number(form.duration);
    const input: ProjectInput = { id: project?.id, sectorId: form.sectorId, name: form.name, description: form.description, location: form.location, managerName: form.managerName, startDate: form.startDate, plannedDurationMonths: duration === null || Number.isNaN(duration) ? (form.duration.trim() ? -1 : null) : duration };
    const next = validateProject(db, input);
    setErrors(next);
    if (Object.keys(next).length) return null;
    return runAsync(saveProject, input);
  };

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={project ? `Edit ${project.name}` : "New project"} description={project ? undefined : "New projects start in Planning status and cannot receive allocations until made Active."} submitLabel={project ? "Save project" : "Create project"} onSubmit={submit} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agricultural sector" required error={errors.sectorId} hint={hasHistory ? "Locked: this project has allocation history." : undefined}>
          <NativeSelect value={form.sectorId} onChange={set("sectorId")} disabled={hasHistory}>
            <option value="">Select an agricultural sector</option>
            {state.sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Project name" required error={errors.name}><Input value={form.name} onChange={set("name")} placeholder="Enter project name" maxLength={100} /></Field>
      </div>
      <Field label="Description" required error={errors.description}><Textarea value={form.description} onChange={set("description")} placeholder="Describe the project's purpose and scope" maxLength={1000} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" required error={errors.location}><Input value={form.location} onChange={set("location")} placeholder="Enter village / district, state" maxLength={120} /></Field>
        <Field label="Project manager" hint="Optional"><Input value={form.managerName} onChange={set("managerName")} placeholder="Enter the project manager's name" maxLength={80} /></Field>
        <Field label="Start date" error={errors.startDate} hint="Optional"><Input type="date" value={form.startDate} onChange={set("startDate")} /></Field>
        <Field label="Planned duration (months)" error={errors.plannedDurationMonths} hint="Leave blank while it is not finalized"><Input type="number" inputMode="numeric" min={1} max={600} value={form.duration} onChange={set("duration")} placeholder="e.g. 24" /></Field>
      </div>
    </FormDialog>
  );
}
