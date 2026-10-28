"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, InlineAlert, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { saveCategory, setCategoryStatus } from "@/lib/mock/actions";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { Category } from "@/lib/types";

export function CategoriesView() {
  const { db, run, confirm, confirmDialog, toast } = useAdmin();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [linkedFilter, setLinkedFilter] = React.useState("");
  const [pending, setPending] = React.useState("");
  const [editing, setEditing] = React.useState<Category | "new" | null>(null);

  const linked = (id: string) => db.products.filter((p) => p.categoryId === id);
  const rows = db.categories.filter((c) => {
    const products = linked(c.id);
    if (linkedFilter === "with" && !products.length) return false;
    if (linkedFilter === "none" && products.length) return false;
    const hasPending = products.some((p) => p.approvalStatus === "pending");
    if (pending === "yes" && !hasPending) return false;
    if (pending === "no" && hasPending) return false;
    return (!status || c.status === status) && matchesSearch(query, [c.name, c.slug, c.description]);
  });

  const toggle = (c: Category) => {
    const products = linked(c.id);
    const listed = products.filter((p) => p.approvalStatus === "approved" && p.listingStatus === "listed");
    if (c.status === "active") {
      confirm({
        title: `Deactivate “${c.name}”?`,
        description: "The category will be marked Inactive in this demo.",
        confirmLabel: "Deactivate category",
        tone: "danger",
        details: products.length ? (
          <div className="grid gap-3">
            <InlineAlert tone="warning" title={`${products.length} product(s) are linked to this category (${listed.length} currently listed)`}>
              <ul className="mt-1.5 list-disc pl-4 text-xs">
                {products.slice(0, 6).map((p) => <li key={p.id}>{p.name} — {p.approvalStatus === "approved" ? p.listingStatus : p.approvalStatus}</li>)}
                {products.length > 6 && <li>…and {products.length - 6} more</li>}
              </ul>
            </InlineAlert>
            <NeedsClarification refId="Q-CATEGORY">What deactivation does to linked products (hide them, block new listings, require reassignment) is not specified. This demo changes only the category&apos;s status; linked products are left as they are.</NeedsClarification>
          </div>
        ) : <InlineAlert tone="info">No products are linked to this category.</InlineAlert>,
        onConfirm: () => run(setCategoryStatus, { categoryId: c.id, status: "inactive" }),
      });
    } else {
      confirm({ title: `Reactivate “${c.name}”?`, description: "The category will be marked Active again.", confirmLabel: "Reactivate", onConfirm: () => run(setCategoryStatus, { categoryId: c.id, status: "active" }) });
    }
  };

  const columns: Column<Category>[] = [
    { key: "name", header: "Category", sortValue: (c) => c.name, cell: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">/{c.slug}</p></div> },
    { key: "description", header: "Description", cell: (c) => <span className="line-clamp-2 max-w-sm text-muted-foreground">{c.description || "—"}</span> },
    { key: "products", header: "Products", align: "right", sortValue: (c) => linked(c.id).length, cell: (c) => linked(c.id).length ? <Link href="/admin/products" className="text-primary hover:underline">{linked(c.id).length}</Link> : 0 },
    { key: "created", header: "Created", sortValue: (c) => c.createdAt, cell: (c) => formatDate(c.createdAt) },
    { key: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <StatusBadge domain="category" value={c.status} /> },
    {
      key: "actions", header: "Actions", srOnlyHeader: true, align: "right",
      cell: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil /></Button>
          <Button size="sm" variant={c.status === "active" ? "destructive" : "outline"} onClick={() => toggle(c)}>{c.status === "active" ? "Deactivate" : "Reactivate"}<span className="sr-only"> {c.name}</span></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Categories" description="Catalogue categories and the products linked to them." actions={<Button onClick={() => setEditing("new")}><Plus aria-hidden="true" />New category</Button>} />
      <DemoNotice>Changes are saved only in this browser. Category deletion is not offered because its rules are not specified.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search categories" placeholder="Name or description" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("category")} />
          <FilterSelect label="Linked products" value={linkedFilter} onChange={setLinkedFilter} options={[{ value: "with", label: "Has products" }, { value: "none", label: "No products" }]} allLabel="Any" />
          <FilterSelect label="Pending approvals" value={pending} onChange={setPending} options={[{ value: "yes", label: "Has products awaiting review" }, { value: "no", label: "None awaiting review" }]} allLabel="Any" />
          <ClearFilters active={Boolean(query || status || linkedFilter || pending)} onClear={() => { setQuery(""); setStatus(""); setLinkedFilter(""); setPending(""); }} />
        </Toolbar>
        <DataTable caption="Categories" rows={rows} columns={columns} getRowId={(c) => c.id} initialSort={{ key: "name", direction: "asc" }} resetKey={`${query}|${status}|${linkedFilter}|${pending}`} minWidth={760} />
      </Card>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <CategoryForm
            key={editing === "new" ? "new" : editing.id}
            category={editing === "new" ? null : editing}
            onSave={(input) => {
              const result = run(saveCategory, input);
              if (result.ok) { toast.success(result.message); setEditing(null); }
              return result.ok ? null : result.error;
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}

function CategoryForm({ category, onSave, onCancel }: { category: Category | null; onSave: (input: { id?: string; name: string; description: string }) => string | null; onCancel: () => void }) {
  const [name, setName] = React.useState(category?.name ?? "");
  const [description, setDescription] = React.useState(category?.description ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Category name is required.");
    if (name.trim().length > 40) return setError("Keep the name to 40 characters or fewer.");
    setError(onSave({ id: category?.id, name, description }));
  };
  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "New category"}</DialogTitle>
          <DialogDescription>Saved locally in this demo.</DialogDescription>
        </DialogHeader>
        <Field label="Name" required error={error}><Input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} maxLength={60} placeholder="e.g. Leafy Greens" /></Field>
        <Field label="Description" hint="Optional."><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="What belongs in this category (up to 200 characters)" /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{category ? "Save changes" : "Create category"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
