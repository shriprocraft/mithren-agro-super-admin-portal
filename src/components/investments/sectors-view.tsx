"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Pencil } from "lucide-react";
import { Field } from "@/components/admin/field";
import { Card, DetailList, EmptyState, InlineAlert, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatDate, formatINR } from "@/lib/format";
import { byId, sectorStats } from "@/lib/investment/selectors";
import type { AgriculturalSector } from "@/lib/investment/types";
import { updateSector } from "@/lib/mock/investment-actions";
import { ProjectsTable } from "./projects-view";
import { AllocationsTable } from "./record-tables";
import { FormDialog, InvestmentNotice, NotPermitted, routes, useInvestmentAdmin } from "./shared";

export function SectorsView() {
  const { state, can } = useInvestmentAdmin();
  const [editing, setEditing] = React.useState<AgriculturalSector | null>(null);
  return (
    <>
      <PageHeader title="Agricultural sectors" description="The six sectors of the investment model. Each contains two separately managed projects." />
      <InvestmentNotice>The six sectors are fixed by the business model, so new sectors cannot be added and seeding never creates duplicates. Sector descriptions are editable.</InvestmentNotice>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.sectors.map((s) => {
          const st = sectorStats(state, s.id);
          return (
            <Card
              key={s.id}
              title={<Link href={routes.sector(s.id)} className="hover:text-primary hover:underline">{s.name}</Link>}
              description={<span className="font-mono">{s.id}</span>}
              actions={can("inv.projects.manage") ? <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil aria-hidden="true" />Edit</Button> : undefined}
            >
              <p className="text-sm text-muted-foreground">{s.description}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-soft px-2 py-2"><dt className="text-[11px] text-muted-foreground">Projects</dt><dd className="font-semibold tabular-nums">{st.projects.length}</dd></div>
                <div className="rounded-xl bg-soft px-2 py-2"><dt className="text-[11px] text-muted-foreground">Participations</dt><dd className="font-semibold tabular-nums">{st.participationCount}</dd></div>
                <div className="rounded-xl bg-soft px-2 py-2"><dt className="text-[11px] text-muted-foreground">Approved allocations</dt><dd className="font-semibold tabular-nums">{formatINR(st.approvedAllocatedPaise)}</dd></div>
              </dl>
              <ul className="mt-4 space-y-1.5">
                {st.projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={routes.project(p.id)} className="truncate text-primary hover:underline">{p.name}</Link>
                    <StatusBadge domain="project" value={p.status} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">Created {formatDate(s.createdAt)} · updated {formatDate(s.updatedAt)}</p>
              <Link href={routes.sector(s.id)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">View sector<span className="sr-only"> {s.name}</span><ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
            </Card>
          );
        })}
      </div>
      {editing && <EditSectorDialog sector={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditSectorDialog({ sector, onClose }: { sector: AgriculturalSector; onClose: () => void }) {
  const { state, runAsync } = useInvestmentAdmin();
  const [name, setName] = React.useState(sector.name);
  const [description, setDescription] = React.useState(sector.description);
  const [errors, setErrors] = React.useState<{ name?: string; description?: string }>({});
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Edit ${sector.name}`}
      submitLabel="Save sector"
      onSubmit={() => {
        const next = {
          name: !name.trim() ? "Enter the sector name." : state.sectors.some((s) => s.id !== sector.id && s.name.toLowerCase() === name.trim().toLowerCase()) ? "A sector with this name already exists." : undefined,
          description: description.trim() ? undefined : "Enter a sector description.",
        };
        setErrors(next);
        if (next.name || next.description) return null;
        return runAsync(updateSector, { sectorId: sector.id, name, description });
      }}
    >
      <Field label="Sector name" required error={errors.name}><Input value={name} onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: undefined }); }} placeholder="Enter sector name" maxLength={60} /></Field>
      <Field label="Description" required error={errors.description}><Textarea value={description} onChange={(e) => { setDescription(e.target.value); setErrors({ ...errors, description: undefined }); }} placeholder="Describe the sector" maxLength={500} /></Field>
    </FormDialog>
  );
}

export function SectorDetailView({ sectorId }: { sectorId: string }) {
  const { state, can } = useInvestmentAdmin();
  const [editing, setEditing] = React.useState(false);
  const sector = byId(state.sectors, sectorId);
  if (!sector) return <EmptyState title="Sector not found" description={`No sector has the ID “${sectorId}”.`} action={<Link href="/admin/investments/sectors" className={buttonVariants({ variant: "outline" })}>Back to sectors</Link>} />;
  const st = sectorStats(state, sector.id);
  const allocations = state.allocations.filter((a) => st.projects.some((p) => p.id === a.projectId));
  return (
    <>
      <Link href="/admin/investments/sectors" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />All sectors</Link>
      <PageHeader title={sector.name} description={sector.description} actions={can("inv.projects.manage") ? <Button variant="outline" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Edit sector</Button> : <NotPermitted action="Editing sectors" />} />
      <InvestmentNotice />
      <Card title="Sector details" className="mb-6">
        <DetailList items={[
          { label: "Sector ID", value: <span className="font-mono">{sector.id}</span> },
          { label: "Projects", value: st.projects.length },
          { label: "Participations with allocations here", value: st.participationCount },
          { label: "Approved allocations (demo)", value: formatINR(st.approvedAllocatedPaise) },
          { label: "Created", value: formatDate(sector.createdAt) },
          { label: "Last updated", value: formatDate(sector.updatedAt) },
        ]} />
        <InlineAlert tone="info" className="mt-4">“Approved allocations” sums approved allocation decisions. It is not a verified contribution total or a valuation.</InlineAlert>
      </Card>
      <Card title="Projects in this sector" className="mb-6"><ProjectsTable rows={st.projects} /></Card>
      <Card title="Allocations to this sector's projects"><AllocationsTable rows={allocations} /></Card>
      {editing && <EditSectorDialog sector={sector} onClose={() => setEditing(false)} />}
    </>
  );
}
