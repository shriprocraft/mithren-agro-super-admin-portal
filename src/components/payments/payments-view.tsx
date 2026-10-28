"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleX, CreditCard, Scale, Webhook } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, InlineAlert, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { MetricCard } from "@/components/admin/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { formatDateTime, formatINR } from "@/lib/format";
import { reconcilePayment } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { PaymentAttempt } from "@/lib/types";

export function PaymentsView() {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(params.get("status") ?? "");
  const [webhook, setWebhook] = React.useState("");
  const [recon, setRecon] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("payment"));
  const selected = byId(db.payments, selectedId);

  const rows = db.payments.filter(
    (p) =>
      (!status || p.status === status) &&
      (!webhook || p.webhook.status === webhook) &&
      (!recon || p.reconciliation === recon) &&
      (!method || p.method === method) &&
      matchesSearch(query, [p.id, p.orderId, p.gatewayRef]),
  );
  const failed = db.payments.filter((p) => p.status === "failed").length;
  const unreconciled = db.payments.filter((p) => p.status === "succeeded" && p.reconciliation === "unreconciled").length;
  const noWebhook = db.payments.filter((p) => p.webhook.status === "not_received").length;

  const reconcile = (p: PaymentAttempt) =>
    confirm({
      title: `Mark ${p.id} as reconciled?`,
      description: `Records that ${formatINR(p.amountPaise)} (${p.gatewayRef}) matches the gateway settlement report. In this demo no gateway or report is contacted; this is a local status change.`,
      confirmLabel: "Mark reconciled (demo)",
      onConfirm: () => run(reconcilePayment, { paymentId: p.id }),
    });

  const columns: Column<PaymentAttempt>[] = [
    { key: "id", header: "Attempt", sortValue: (p) => p.id, cell: (p) => <RowLink onClick={() => setSelectedId(p.id)} sub={p.gatewayRef}>{p.id}</RowLink> },
    { key: "order", header: "Order", sortValue: (p) => p.orderId, cell: (p) => <Link href={`/admin/orders?order=${p.orderId}`} className="text-primary hover:underline">{p.orderId}</Link> },
    { key: "at", header: "Attempted", sortValue: (p) => p.attemptedAt, cell: (p) => <span className="whitespace-nowrap">{formatDateTime(p.attemptedAt)}</span> },
    { key: "method", header: "Method", sortValue: (p) => p.method, cell: (p) => p.method },
    { key: "amount", header: "Amount", align: "right", sortValue: (p) => p.amountPaise, cell: (p) => formatINR(p.amountPaise) },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge domain="attempt" value={p.status} /> },
    { key: "webhook", header: "Webhook", sortValue: (p) => p.webhook.status, cell: (p) => <StatusBadge domain="webhook" value={p.webhook.status} /> },
    { key: "recon", header: "Reconciliation", sortValue: (p) => p.reconciliation, cell: (p) => (p.status === "succeeded" ? <StatusBadge domain="reconciliation" value={p.reconciliation} /> : <span className="text-xs text-muted-foreground">n/a</span>) },
    { key: "act", header: "Actions", srOnlyHeader: true, align: "right", cell: (p) => (p.status === "succeeded" && p.reconciliation === "unreconciled" ? <Button size="sm" variant="outline" onClick={() => reconcile(p)}>Reconcile<span className="sr-only"> {p.id}</span></Button> : null) },
  ];

  return (
    <>
      <PageHeader title="Payments" description="Payment attempts with gateway references, webhook status, failed payments and reconciliation." />
      <DemoNotice>No payment gateway is connected. Gateway references beginning <code className="rounded bg-secondary px-1">mock_gw_</code> and “Received (mock)” webhooks are fixture data; no money has moved.</DemoNotice>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Payment attempts" icon={CreditCard} value={db.payments.length} />
        <MetricCard label="Failed attempts" icon={CircleX} value={failed} detail="Filter the table by status to review them." />
        <MetricCard label="Awaiting webhook" icon={Webhook} value={noWebhook} detail="No (mock) webhook received yet" />
        <MetricCard label="Unreconciled payments" icon={Scale} value={unreconciled} detail="Succeeded attempts not yet matched" />
      </div>
      <Card>
        <Toolbar>
          <SearchField label="Search payments" placeholder="Attempt ID, order ID or gateway ref" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("attempt")} />
          <FilterSelect label="Webhook" value={webhook} onChange={setWebhook} options={statusOptions("webhook")} />
          <FilterSelect label="Reconciliation" value={recon} onChange={setRecon} options={statusOptions("reconciliation").filter((o) => o.value !== "pending")} />
          <FilterSelect label="Method" value={method} onChange={setMethod} options={["UPI", "Card", "Net banking"].map((m) => ({ value: m, label: m }))} />
          <ClearFilters active={Boolean(query || status || webhook || recon || method)} onClear={() => { setQuery(""); setStatus(""); setWebhook(""); setRecon(""); setMethod(""); }} />
        </Toolbar>
        <DataTable caption="Payment attempts" rows={rows} columns={columns} getRowId={(p) => p.id} initialSort={{ key: "at", direction: "desc" }} resetKey={`${query}|${status}|${webhook}|${recon}|${method}`} minWidth={1000} />
      </Card>
      <div className="mt-6">
        <NeedsClarification refId="Q-FAILED-PAYMENT">Failed-payment handling (retry windows, automatic order cancellation, customer follow-up) is not specified. The demo lists failed attempts and their gateway reasons but offers no retry or follow-up action.</NeedsClarification>
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.id} description={`Payment attempt for ${selected.orderId}`}>
            <div className="grid gap-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge domain="attempt" value={selected.status} />
                <StatusBadge domain="webhook" value={selected.webhook.status} />
                {selected.status === "succeeded" && <StatusBadge domain="reconciliation" value={selected.reconciliation} />}
              </div>
              {selected.failureReason && <InlineAlert tone="danger" title="Failure reason (mock gateway response)">{selected.failureReason}</InlineAlert>}
              <DetailList
                items={[
                  { label: "Order", value: <Link href={`/admin/orders?order=${selected.orderId}`} className="text-primary hover:underline">{selected.orderId}</Link> },
                  { label: "Customer", value: byId(db.customers, byId(db.orders, selected.orderId)?.customerId)?.name },
                  { label: "Amount", value: formatINR(selected.amountPaise) },
                  { label: "Method", value: selected.method },
                  { label: "Gateway reference (mock)", value: <code className="text-xs">{selected.gatewayRef}</code> },
                  { label: "Attempted", value: formatDateTime(selected.attemptedAt) },
                  { label: "Webhook received", value: selected.webhook.at ? formatDateTime(selected.webhook.at) : "Not received" },
                  { label: "Reconciled", value: selected.reconciledAt ? formatDateTime(selected.reconciledAt) : "—" },
                ]}
              />
              {selected.status === "succeeded" && selected.reconciliation === "unreconciled" && (
                <Button onClick={() => reconcile(selected)} className="justify-self-start">Mark reconciled (demo)</Button>
              )}
            </div>
          </SheetContent>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}
