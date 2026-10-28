"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, InlineAlert, NeedsClarification, PageHeader, SectionTitle, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { istDay, presetRange } from "@/lib/dates";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { reconcileSettlement } from "@/lib/mock/actions";
import { byId, subOrderTotal, unsettledDeliveredSubOrders } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { DemoDb, SettlementBatch, SubOrder } from "@/lib/types";

const batchValue = (db: DemoDb, b: SettlementBatch) => b.subOrderIds.reduce((s, id) => s + (byId(db.subOrders, id) ? subOrderTotal(byId(db.subOrders, id)!) : 0), 0);

export function SettlementsView() {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const [recon, setRecon] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = byId(db.settlements, selectedId);
  const [uSeller, setUSeller] = React.useState("");
  const [uRefunds, setURefunds] = React.useState("");
  const [uDelivered, setUDelivered] = React.useState("");
  const unsettledAll = unsettledDeliveredSubOrders(db);
  const weekAgo = presetRange("7d").from;
  const unsettled = unsettledAll.filter((s) => {
    const refunds = db.refunds.some((r) => r.subOrderId === s.id);
    if (uRefunds === "with" && !refunds) return false;
    if (uRefunds === "none" && refunds) return false;
    const day = s.deliveredAt ? istDay(s.deliveredAt) : "";
    if (uDelivered === "recent" && day < weekAgo) return false;
    if (uDelivered === "older" && day >= weekAgo) return false;
    return !uSeller || s.sellerId === uSeller;
  });

  const rows = db.settlements.filter((b) => (!status || b.status === status) && (!seller || b.sellerId === seller) && (!recon || b.reconciliation === recon) && matchesSearch(query, [b.id, b.payoutReference, byId(db.sellers, b.sellerId)?.businessName]));

  const reconcile = (b: SettlementBatch) =>
    confirm({
      title: `Mark ${b.id} as reconciled?`,
      description: `Records that payout ${b.payoutReference} matches the (mock) bank statement. No bank or payout service is contacted.`,
      confirmLabel: "Mark reconciled (demo)",
      onConfirm: () => run(reconcileSettlement, { batchId: b.id }),
    });

  const columns: Column<SettlementBatch>[] = [
    { key: "id", header: "Batch", sortValue: (b) => b.id, cell: (b) => <RowLink onClick={() => setSelectedId(b.id)} sub={formatDate(b.createdAt)}>{b.id}</RowLink> },
    { key: "seller", header: "Seller", sortValue: (b) => byId(db.sellers, b.sellerId)?.businessName, cell: (b) => byId(db.sellers, b.sellerId)?.businessName },
    { key: "subs", header: "Sub-orders", align: "right", sortValue: (b) => b.subOrderIds.length, cell: (b) => b.subOrderIds.length },
    { key: "value", header: "Sub-order value", align: "right", sortValue: (b) => batchValue(db, b), cell: (b) => formatINR(batchValue(db, b)) },
    { key: "payout", header: "Payout amount", cell: () => <NeedsClarification compact /> },
    { key: "ref", header: "Payout reference", cell: (b) => (b.payoutReference ? <code className="text-xs">{b.payoutReference}</code> : <span className="text-xs text-muted-foreground">Not issued</span>) },
    { key: "status", header: "Status", sortValue: (b) => b.status, cell: (b) => <StatusBadge domain="settlement" value={b.status} /> },
    { key: "recon", header: "Reconciliation", sortValue: (b) => b.reconciliation, cell: (b) => <StatusBadge domain="reconciliation" value={b.reconciliation} /> },
    { key: "act", header: "Actions", srOnlyHeader: true, align: "right", cell: (b) => (b.status === "paid_demo" && b.reconciliation === "unreconciled" ? <Button size="sm" variant="outline" onClick={() => reconcile(b)}>Reconcile<span className="sr-only"> {b.id}</span></Button> : null) },
  ];

  const unsettledColumns: Column<SubOrder>[] = [
    { key: "id", header: "Sub-order", sortValue: (s) => s.id, cell: (s) => <Link href={`/admin/orders?order=${s.parentId}`} className="text-primary hover:underline">{s.id}</Link> },
    { key: "seller", header: "Seller", sortValue: (s) => byId(db.sellers, s.sellerId)?.businessName, cell: (s) => byId(db.sellers, s.sellerId)?.businessName },
    { key: "delivered", header: "Delivered", sortValue: (s) => s.deliveredAt, cell: (s) => (s.deliveredAt ? formatDateTime(s.deliveredAt) : "—") },
    { key: "value", header: "Sub-order value", align: "right", sortValue: subOrderTotal, cell: (s) => formatINR(subOrderTotal(s)) },
    { key: "refunds", header: "Refund requests", align: "right", cell: (s) => db.refunds.filter((r) => r.subOrderId === s.id).length },
  ];

  const failed = db.settlements.filter((b) => b.status === "failed");

  return (
    <>
      <PageHeader title="Seller settlements" description="Settlement batches with payout references, failures and reconciliation, plus delivered sub-orders not yet in any batch." />
      <DemoNotice>No payout has been initiated or completed. “Paid (demo)” batches and <code className="rounded bg-secondary px-1">MOCK-PAYOUT-</code> references are fixture data; no bank or payout service is connected.</DemoNotice>
      {failed.length > 0 && (
        <InlineAlert tone="danger" title={`${failed.length} settlement batch(es) failed`} className="mb-6">
          {failed.map((b) => `${b.id} (${byId(db.sellers, b.sellerId)?.businessName}): ${b.failureReason}`).join(" · ")} Retrying a failed payout is not offered because the retry procedure is not specified (Q-PAYOUT-RETRY).
        </InlineAlert>
      )}
      <Card title="Settlement batches">
        <Toolbar>
          <SearchField label="Search batches" placeholder="Batch ID, payout ref or seller" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("settlement")} />
          <FilterSelect label="Seller" value={seller} onChange={setSeller} options={db.sellers.filter((s) => db.settlements.some((b) => b.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
          <FilterSelect label="Reconciliation" value={recon} onChange={setRecon} options={statusOptions("reconciliation").filter((o) => o.value !== "pending")} />
          <ClearFilters active={Boolean(query || status || seller || recon)} onClear={() => { setQuery(""); setStatus(""); setSeller(""); setRecon(""); }} />
        </Toolbar>
        <DataTable caption="Settlement batches" rows={rows} columns={columns} getRowId={(b) => b.id} initialSort={{ key: "id", direction: "desc" }} resetKey={`${query}|${status}|${seller}|${recon}`} minWidth={1060} />
        <p className="mt-3 text-xs text-muted-foreground">“Sub-order value” is the sum of the batch&apos;s sub-order line items. It is not the payout amount, which depends on commission and refund deductions that are not specified.</p>
      </Card>

      <Card className="mt-6" title="Delivered sub-orders not in any batch" description={`${unsettledAll.length} sub-order(s)`}>
        <div className="mb-4">
          <NeedsClarification refId="Q-SETTLEMENT-ELIGIBILITY">The eligible balance, payout schedule, holding period and refund/commission deductions are not specified. This list is factual (delivered and not yet batched) and is not an eligibility decision.</NeedsClarification>
        </div>
        <Toolbar>
          <FilterSelect label="Seller" value={uSeller} onChange={setUSeller} options={db.sellers.filter((s) => unsettledAll.some((x) => x.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
          <FilterSelect label="Refund requests" value={uRefunds} onChange={setURefunds} options={[{ value: "with", label: "Has refund records" }, { value: "none", label: "No refund records" }]} allLabel="Any" />
          <FilterSelect label="Delivered" value={uDelivered} onChange={setUDelivered} options={[{ value: "recent", label: "In the last 7 days" }, { value: "older", label: "More than 7 days ago" }]} allLabel="Any time" />
          <ClearFilters active={Boolean(uSeller || uRefunds || uDelivered)} onClear={() => { setUSeller(""); setURefunds(""); setUDelivered(""); }} />
        </Toolbar>
        <DataTable caption="Delivered sub-orders not yet settled" resetKey={`${uSeller}|${uRefunds}|${uDelivered}`} rows={unsettled} columns={unsettledColumns} getRowId={(s) => s.id} initialSort={{ key: "delivered", direction: "asc" }} pageSize={8} emptyTitle={unsettledAll.length ? "No records match" : "Nothing outstanding"} emptyDescription={unsettledAll.length ? "Try different filters." : "Every delivered sub-order is in a settlement batch."} />
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.id} description={byId(db.sellers, selected.sellerId)?.businessName}>
            <div className="grid gap-5">
              <div className="flex flex-wrap gap-2"><StatusBadge domain="settlement" value={selected.status} /><StatusBadge domain="reconciliation" value={selected.reconciliation} /></div>
              {selected.failureReason && <InlineAlert tone="danger" title="Payout failure (mock)">{selected.failureReason}</InlineAlert>}
              <DetailList
                items={[
                  { label: "Created", value: formatDateTime(selected.createdAt) },
                  { label: "Payout reference", value: selected.payoutReference ?? "Not issued" },
                  { label: "Sub-orders", value: selected.subOrderIds.length },
                  { label: "Sub-order value", value: formatINR(batchValue(db, selected)) },
                  { label: "Payout amount", value: <NeedsClarification compact /> },
                  { label: "Reconciled", value: selected.reconciledAt ? formatDateTime(selected.reconciledAt) : "—" },
                ]}
              />
              <section>
                <SectionTitle>Included sub-orders</SectionTitle>
                <ul className="divide-y divide-border rounded-xl border border-border text-sm">
                  {selected.subOrderIds.map((id) => {
                    const sub = byId(db.subOrders, id);
                    const refunds = db.refunds.filter((r) => r.subOrderId === id);
                    return (
                      <li key={id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2">
                        <Link href={`/admin/orders?order=${sub?.parentId}`} className="text-primary hover:underline">{id}</Link>
                        <span className="text-xs text-muted-foreground">{refunds.length ? `${refunds.length} refund record(s)` : ""}</span>
                        <span className="tabular-nums">{sub ? formatINR(subOrderTotal(sub)) : "—"}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
              {selected.status === "paid_demo" && selected.reconciliation === "unreconciled" && <Button className="justify-self-start" onClick={() => reconcile(selected)}>Mark reconciled (demo)</Button>}
            </div>
          </SheetContent>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}
