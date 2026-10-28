"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Star } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, EmptyState, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { sellerPerformance } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { Seller } from "@/lib/types";
import { SellerDetailDrawer } from "./seller-detail";

const RATING_OPTIONS = [
  { value: "high", label: "4.5 and above" },
  { value: "mid", label: "4.0 – 4.4" },
  { value: "low", label: "Below 4.0" },
  { value: "none", label: "No ratings yet" },
];
const ratingBand = (r: number | null) => (r === null ? "none" : r >= 4.5 ? "high" : r >= 4 ? "mid" : "low");
const DOC_OPTIONS = [
  { value: "complete", label: "All reviewed (mock)" },
  { value: "awaiting", label: "Awaiting review" },
  { value: "issue", label: "Issue noted" },
];
const docReview = (s: Seller) =>
  s.documents.some((d) => d.reviewStatus === "issue_noted_mock") ? "issue" : s.documents.some((d) => d.reviewStatus === "not_reviewed") ? "awaiting" : "complete";

export function SellersView({ mode }: { mode: "all" | "approvals" }) {
  const { db, run, act, confirm, confirmDialog } = useAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(mode === "approvals" ? "pending" : "");
  const [category, setCategory] = React.useState("");
  const [state, setState] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [docs, setDocs] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("seller"));

  const rows = db.sellers.filter(
    (s) =>
      (mode === "all" || ["pending", "rejected"].includes(s.status)) &&
      (!status || s.status === status) &&
      (!category || s.categoryIds.includes(category)) &&
      (!state || s.state === state) &&
      (!rating || ratingBand(s.rating) === rating) &&
      (!docs || docReview(s) === docs) &&
      matchesSearch(query, [s.businessName, s.id, s.city, s.state, s.contactName]),
  );
  const pendingCount = db.sellers.filter((s) => s.status === "pending").length;

  const columns: Column<Seller>[] =
    mode === "approvals"
      ? [
          { key: "name", header: "Applicant", sortValue: (s) => s.businessName, cell: (s) => <RowLink onClick={() => setSelectedId(s.id)} sub={`${s.city}, ${s.state}`}>{s.businessName}</RowLink> },
          { key: "applied", header: "Applied", sortValue: (s) => s.appliedAt, cell: (s) => formatDate(s.appliedAt) },
          {
            key: "docs",
            header: "Documents (mock review)",
            cell: (s) => {
              const reviewed = s.documents.filter((d) => d.reviewStatus === "reviewed_mock").length;
              const issues = s.documents.filter((d) => d.reviewStatus === "issue_noted_mock").length;
              return (
                <span className="text-sm">
                  {reviewed}/{s.documents.length} reviewed{issues ? <span className="text-warning"> · {issues} issue{issues > 1 ? "s" : ""}</span> : null}
                </span>
              );
            },
          },
          { key: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <StatusBadge domain="seller" value={s.status} /> },
          { key: "review", header: "Review", srOnlyHeader: true, align: "right", cell: (s) => <button type="button" onClick={() => setSelectedId(s.id)} className={buttonVariants({ size: "sm", variant: s.status === "pending" ? "default" : "outline" })}>{s.status === "pending" ? "Review" : "View"}<span className="sr-only"> {s.businessName}</span></button> },
        ]
      : [
          { key: "name", header: "Seller", sortValue: (s) => s.businessName, cell: (s) => <RowLink onClick={() => setSelectedId(s.id)} sub={s.id}>{s.businessName}</RowLink> },
          { key: "location", header: "Location", sortValue: (s) => s.city, cell: (s) => `${s.city}, ${s.state}` },
          {
            key: "rating",
            header: "Rating",
            sortValue: (s) => s.rating,
            cell: (s) => (s.rating === null ? <span className="text-muted-foreground">—</span> : <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-highlight text-warning" aria-hidden="true" />{s.rating.toFixed(1)} <span className="text-xs text-muted-foreground">({s.ratingCount})</span></span>),
          },
          { key: "subs", header: "Sub-orders", align: "right", sortValue: (s) => sellerPerformance(db, s.id).subOrders, cell: (s) => sellerPerformance(db, s.id).subOrders },
          { key: "delivered", header: "Delivered", align: "right", sortValue: (s) => sellerPerformance(db, s.id).delivered, cell: (s) => sellerPerformance(db, s.id).delivered },
          { key: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <StatusBadge domain="seller" value={s.status} /> },
        ];

  return (
    <>
      <PageHeader
        title={mode === "approvals" ? "Seller approvals" : "Sellers"}
        description={
          mode === "approvals"
            ? "Review seller applications and their documents, then approve or reject with a reason."
            : "All marketplace sellers with status, recorded ratings and order performance. Suspend or reinstate from a seller's details."
        }
        actions={
          mode === "all" ? (
            <Link href="/admin/sellers/approvals" className={buttonVariants({ variant: "outline" })}>
              <ClipboardCheck aria-hidden="true" />
              Applications ({pendingCount} pending)
            </Link>
          ) : undefined
        }
      />
      <DemoNotice>Seller records are fictional. Document review is a <strong>mock review</strong>: no KYC, bank or identity check is performed, and approvals or rejections are not communicated to anyone.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search sellers" placeholder="Business, contact, city or ID" value={query} onChange={setQuery} />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={mode === "approvals" ? statusOptions("seller").filter((o) => ["pending", "rejected"].includes(o.value)) : statusOptions("seller")}
          />
          <FilterSelect label="Category" value={category} onChange={setCategory} options={db.categories.map((c) => ({ value: c.id, label: c.name }))} />
          {mode === "all" ? (
            <FilterSelect label="Rating (recorded)" value={rating} onChange={setRating} options={RATING_OPTIONS} allLabel="Any rating" />
          ) : (
            <FilterSelect label="Document review" value={docs} onChange={setDocs} options={DOC_OPTIONS} allLabel="Any" />
          )}
          <FilterSelect label="State" value={state} onChange={setState} options={[...new Set(db.sellers.map((s) => s.state))].sort().map((v) => ({ value: v, label: v }))} />
          <ClearFilters active={Boolean(query || category || state || rating || docs || status !== (mode === "approvals" ? "pending" : ""))} onClear={() => { setQuery(""); setCategory(""); setState(""); setRating(""); setDocs(""); setStatus(mode === "approvals" ? "pending" : ""); }} />
        </Toolbar>
        {mode === "approvals" && status === "pending" && !rows.length && !query ? (
          <EmptyState icon={ClipboardCheck} title="No pending applications" description="Every seller application has a decision. New applications will appear here." />
        ) : (
          <DataTable caption={mode === "approvals" ? "Seller applications" : "Sellers"} rows={rows} columns={columns} getRowId={(s) => s.id} initialSort={mode === "approvals" ? { key: "applied", direction: "asc" } : { key: "name", direction: "asc" }} resetKey={`${query}|${status}|${category}|${state}|${rating}|${docs}`} />
        )}
      </Card>
      <SellerDetailDrawer db={db} sellerId={selectedId} onClose={() => setSelectedId(null)} run={run} act={act} confirm={confirm} />
      {confirmDialog}
    </>
  );
}
