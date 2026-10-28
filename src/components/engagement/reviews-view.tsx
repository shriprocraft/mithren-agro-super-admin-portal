"use client";

import * as React from "react";
import { Flag, Star } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Badge, Card, DemoNotice, DetailList, InlineAlert, NeedsClarification, PageHeader, SectionTitle, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/format";
import { dismissReviewReports, hideReview, restoreReview } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { Review } from "@/lib/types";

const openReports = (r: Review) => r.reports.filter((x) => x.status === "open").length;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`size-3.5 ${i <= rating ? "fill-highlight text-warning" : "text-border"}`} aria-hidden="true" />)}
    </span>
  );
}

export function ReviewsView() {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [reported, setReported] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = byId(db.reviews, selectedId);

  const rows = db.reviews.filter(
    (r) =>
      (!status || r.status === status) &&
      (!rating || String(r.rating) === rating) &&
      (!reported || (reported === "open" ? openReports(r) > 0 : r.reports.length === 0)) &&
      matchesSearch(query, [r.title, r.body, r.id, byId(db.products, r.productId)?.name]),
  );

  const hide = (r: Review) =>
    confirm({
      title: `Hide review ${r.id}?`,
      description: "The review is hidden from the product page in this demo and its open reports are marked Actioned. The reviewer is not notified.",
      confirmLabel: "Hide review",
      tone: "danger",
      reason: { label: "Moderation reason", placeholder: "e.g. Abusive language" },
      onConfirm: (reason) => run(hideReview, { reviewId: r.id, reason }),
    });
  const restore = (r: Review) => confirm({ title: `Restore review ${r.id}?`, description: "The review is published again in this demo.", confirmLabel: "Restore review", onConfirm: () => run(restoreReview, { reviewId: r.id }) });
  const dismiss = (r: Review) => confirm({ title: `Dismiss ${openReports(r)} report(s) on ${r.id}?`, description: "The reports are closed and the review stays published.", confirmLabel: "Dismiss reports", onConfirm: () => run(dismissReviewReports, { reviewId: r.id }) });

  const columns: Column<Review>[] = [
    { key: "title", header: "Review", sortValue: (r) => r.title, cell: (r) => <RowLink onClick={() => setSelectedId(r.id)} sub={<span className="line-clamp-1 max-w-[18rem]">{r.body}</span>}>{r.title}</RowLink> },
    { key: "product", header: "Product", sortValue: (r) => byId(db.products, r.productId)?.name, cell: (r) => byId(db.products, r.productId)?.name },
    { key: "rating", header: "Rating", sortValue: (r) => r.rating, cell: (r) => <Stars rating={r.rating} /> },
    { key: "date", header: "Posted", sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
    { key: "reports", header: "Open reports", align: "right", sortValue: openReports, cell: (r) => (openReports(r) ? <Badge tone="warning"><Flag className="inline size-3" aria-hidden="true" /> {openReports(r)}</Badge> : <span className="text-muted-foreground">0</span>) },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge domain="review" value={r.status} /> },
  ];

  return (
    <>
      <PageHeader title="Reviews" description="Product reviews, customer reports on reviews, and moderation." />
      <DemoNotice>Reviews are demo records. Moderation changes apply only in this browser. Reviewer identities are shown by name only.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search reviews" placeholder="Title, text, product or ID" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("review")} />
          <FilterSelect label="Reports" value={reported} onChange={setReported} options={[{ value: "open", label: "Has open reports" }, { value: "none", label: "Never reported" }]} allLabel="Any" />
          <FilterSelect label="Rating" value={rating} onChange={setRating} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? "s" : ""}` }))} />
          <ClearFilters active={Boolean(query || status || reported || rating)} onClear={() => { setQuery(""); setStatus(""); setReported(""); setRating(""); }} />
        </Toolbar>
        <DataTable caption="Reviews" rows={rows} columns={columns} getRowId={(r) => r.id} initialSort={{ key: "reports", direction: "desc" }} resetKey={`${query}|${status}|${reported}|${rating}`} minWidth={860} />
      </Card>
      <div className="mt-6">
        <NeedsClarification refId="Q-REVIEW-POLICY">The moderation policy (what must be hidden), automated abuse prevention (spam or profanity detection, rate limits, verified-purchase rules) and how ratings feed seller and product scores are not specified. The demo surfaces report counts and lets an administrator decide.</NeedsClarification>
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.title} description={`${selected.id} · ${byId(db.products, selected.productId)?.name}`}>
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge domain="review" value={selected.status} /><Stars rating={selected.rating} /></div>
              {selected.status === "hidden" && selected.hiddenReason && <InlineAlert tone="warning" title="Hidden">{selected.hiddenReason}</InlineAlert>}
              <blockquote className="rounded-2xl bg-soft px-4 py-3 text-sm leading-relaxed">{selected.body}</blockquote>
              <DetailList items={[
                { label: "Reviewer", value: byId(db.customers, selected.customerId)?.name },
                { label: "Posted", value: formatDateTime(selected.createdAt) },
                { label: "Product", value: byId(db.products, selected.productId)?.name },
                { label: "Seller", value: byId(db.sellers, byId(db.products, selected.productId)?.sellerId)?.businessName },
              ]} />
              <section>
                <SectionTitle>Reports ({selected.reports.length})</SectionTitle>
                {selected.reports.length ? (
                  <ul className="space-y-2">
                    {selected.reports.map((rep) => (
                      <li key={rep.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm">
                        <span>{rep.reason} <span className="text-xs text-muted-foreground">· {formatDate(rep.reportedAt)}</span></span>
                        <StatusBadge domain="report" value={rep.status} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">No reports.</p>}
              </section>
              <div className="flex flex-wrap gap-2">
                {selected.status === "published" ? <Button variant="destructive" onClick={() => hide(selected)}>Hide review</Button> : <Button variant="outline" onClick={() => restore(selected)}>Restore review</Button>}
                {selected.status === "published" && openReports(selected) > 0 && <Button variant="ghost" onClick={() => dismiss(selected)}>Dismiss reports</Button>}
              </div>
            </div>
          </SheetContent>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}
