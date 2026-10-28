"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, InlineAlert, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { formatDateTime, formatINR } from "@/lib/format";
import { processRefund, reconcileRefund } from "@/lib/mock/actions";
import { byId, orderTotal } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { Refund } from "@/lib/types";

const AMOUNT_OPTIONS = [
  { value: "small", label: "Under ₹100" },
  { value: "medium", label: "₹100 – ₹499" },
  { value: "large", label: "₹500 and above" },
];
const amountBand = (paise: number) => (paise < 10000 ? "small" : paise < 50000 ? "medium" : "large");

export function RefundsView() {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(params.get("status") ?? "");
  const [recon, setRecon] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("refund"));
  const selected = byId(db.refunds, selectedId);

  const rows = db.refunds.filter(
    (r) =>
      (!status || r.status === status) &&
      (!recon || r.reconciliation === recon) &&
      (!amount || amountBand(r.amountPaise) === amount) &&
      (!seller || byId(db.subOrders, r.subOrderId)?.sellerId === seller) &&
      matchesSearch(query, [r.id, r.orderId, r.subOrderId, r.demoReference, r.reason]),
  );

  const process = (r: Refund) => {
    const order = byId(db.orders, r.orderId);
    const payment = byId(db.payments, r.paymentAttemptId);
    confirm({
      title: `Process refund ${r.id} as a demo outcome?`,
      description: "The refund will be marked “Processed (demo)” with a demo reference, and the order's payment state updated. No gateway is contacted and no money moves.",
      confirmLabel: `Process ${formatINR(r.amountPaise)} (demo)`,
      details: (
        <DetailList
          items={[
            { label: "Order", value: `${r.orderId} · total ${order ? formatINR(orderTotal(db, order)) : "—"}` },
            { label: "Sub-order", value: r.subOrderId },
            { label: "Linked payment", value: payment ? `${payment.id} · ${formatINR(payment.amountPaise)}` : "—" },
            { label: "Reason", value: r.reason },
          ]}
        />
      ),
      onConfirm: () => run(processRefund, { refundId: r.id }),
    });
  };
  const reconcile = (r: Refund) =>
    confirm({
      title: `Mark refund ${r.id} as reconciled?`,
      description: "Records that the demo refund matches the (mock) gateway report. Local status change only.",
      confirmLabel: "Mark reconciled (demo)",
      onConfirm: () => run(reconcileRefund, { refundId: r.id }),
    });

  const columns: Column<Refund>[] = [
    { key: "id", header: "Refund", sortValue: (r) => r.id, cell: (r) => <RowLink onClick={() => setSelectedId(r.id)} sub={r.demoReference ?? "No reference yet"}>{r.id}</RowLink> },
    { key: "order", header: "Order", sortValue: (r) => r.orderId, cell: (r) => <div><Link href={`/admin/orders?order=${r.orderId}`} className="text-primary hover:underline">{r.orderId}</Link><p className="text-xs text-muted-foreground">{r.subOrderId}</p></div> },
    { key: "reason", header: "Reason", cell: (r) => <span className="line-clamp-2 max-w-[14rem]">{r.reason}</span> },
    { key: "requested", header: "Requested", sortValue: (r) => r.requestedAt, cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.requestedAt)}</span> },
    { key: "amount", header: "Amount", align: "right", sortValue: (r) => r.amountPaise, cell: (r) => formatINR(r.amountPaise) },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge domain="refund" value={r.status} /> },
    { key: "recon", header: "Reconciliation", sortValue: (r) => r.reconciliation, cell: (r) => <StatusBadge domain="reconciliation" value={r.reconciliation} /> },
    {
      key: "act", header: "Actions", srOnlyHeader: true, align: "right",
      cell: (r) =>
        r.status === "requested" ? <Button size="sm" onClick={() => process(r)}>Process (demo)<span className="sr-only"> {r.id}</span></Button>
        : r.reconciliation === "pending" ? <Button size="sm" variant="outline" onClick={() => reconcile(r)}>Reconcile<span className="sr-only"> {r.id}</span></Button>
        : null,
    },
  ];

  return (
    <>
      <PageHeader title="Refunds" description="Refund records with their orders, amounts, status, transaction references and reconciliation." />
      <DemoNotice>Processing a refund here is a <strong>simulated outcome</strong>: it creates a <code className="rounded bg-secondary px-1">DEMO-RF-</code> reference and updates local records only. No payment gateway is contacted and no money is returned.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search refunds" placeholder="Refund, order or sub-order ID, reason" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("refund")} />
          <FilterSelect label="Reconciliation" value={recon} onChange={setRecon} options={statusOptions("reconciliation").filter((o) => o.value !== "unreconciled")} />
          <FilterSelect label="Amount" value={amount} onChange={setAmount} options={AMOUNT_OPTIONS} allLabel="Any amount" />
          <FilterSelect label="Seller" value={seller} onChange={setSeller} options={db.sellers.filter((s) => db.refunds.some((r) => byId(db.subOrders, r.subOrderId)?.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
          <ClearFilters active={Boolean(query || status || recon || amount || seller)} onClear={() => { setQuery(""); setStatus(""); setRecon(""); setAmount(""); setSeller(""); }} />
        </Toolbar>
        <DataTable caption="Refunds" rows={rows} columns={columns} getRowId={(r) => r.id} initialSort={{ key: "requested", direction: "desc" }} resetKey={`${query}|${status}|${recon}|${amount}|${seller}`} minWidth={980} />
      </Card>
      <div className="mt-6">
        <NeedsClarification refId="Q-REFUND-RULES">Refund eligibility, approval/rejection of requests, partial-refund limits beyond the captured amount, and timelines are not specified. The demo only processes existing refund requests and blocks refunds that exceed the captured payment.</NeedsClarification>
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.id} description={`Refund for ${selected.orderId}`}>
            <div className="grid gap-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge domain="refund" value={selected.status} />
                <StatusBadge domain="reconciliation" value={selected.reconciliation} />
              </div>
              {selected.status === "processed_demo" && <InlineAlert tone="success" title="Demo outcome">Marked processed with reference {selected.demoReference}. No money moved.</InlineAlert>}
              <DetailList
                items={[
                  { label: "Order", value: <Link href={`/admin/orders?order=${selected.orderId}`} className="text-primary hover:underline">{selected.orderId}</Link> },
                  { label: "Sub-order", value: selected.subOrderId },
                  { label: "Seller", value: byId(db.sellers, byId(db.subOrders, selected.subOrderId)?.sellerId)?.businessName },
                  { label: "Amount", value: formatINR(selected.amountPaise) },
                  { label: "Linked payment", value: <Link href={`/admin/payments?payment=${selected.paymentAttemptId}`} className="text-primary hover:underline">{selected.paymentAttemptId}</Link> },
                  { label: "Order payment state", value: <StatusBadge domain="payment" value={byId(db.orders, selected.orderId)?.paymentState ?? "paid"} /> },
                  { label: "Requested", value: formatDateTime(selected.requestedAt) },
                  { label: "Processed", value: selected.processedAt ? formatDateTime(selected.processedAt) : "Not processed" },
                  { label: "Demo reference", value: selected.demoReference ?? "—" },
                  { label: "Reason", value: selected.reason },
                ]}
              />
              <div className="flex flex-wrap gap-2">
                {selected.status === "requested" && <Button onClick={() => process(selected)}>Process refund (demo)</Button>}
                {selected.status === "processed_demo" && selected.reconciliation === "pending" && <Button variant="outline" onClick={() => reconcile(selected)}>Mark reconciled (demo)</Button>}
              </div>
            </div>
          </SheetContent>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}
