"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, InlineAlert, NeedsClarification, PageHeader, SectionTitle, StatusBadge, Timeline } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { DateRangeFilter } from "@/components/admin/widgets";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { inRange, presetRange, type DateRange } from "@/lib/dates";
import { formatDateTime, formatINR } from "@/lib/format";
import { byId, lineTotal, orderSubOrders, orderTotal, subOrderTotal } from "@/lib/mock/selectors";
import { maskEmail } from "@/lib/privacy";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { DemoDb, Order } from "@/lib/types";

const ISSUE_OPTIONS = [
  { value: "cancelled", label: "Has cancellation" },
  { value: "refund", label: "Has refund" },
  { value: "dispute", label: "Has dispute" },
];

export function OrdersView() {
  const { db } = useAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(params.get("status") ?? "");
  const [payment, setPayment] = React.useState("");
  const [issue, setIssue] = React.useState("");
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("order"));

  const rows = db.orders.filter((o) => {
    if (status && o.status !== status) return false;
    if (payment && o.paymentState !== payment) return false;
    if (!inRange(o.placedAt, range)) return false;
    if (issue === "cancelled" && !o.cancellation) return false;
    if (issue === "refund" && !db.refunds.some((r) => r.orderId === o.id)) return false;
    if (issue === "dispute" && !o.dispute) return false;
    const subs = orderSubOrders(db, o);
    return matchesSearch(query, [o.id, byId(db.customers, o.customerId)?.name, ...subs.map((s) => s.id), ...subs.map((s) => byId(db.sellers, s.sellerId)?.businessName)]);
  });

  const columns: Column<Order>[] = [
    { key: "id", header: "Order", sortValue: (o) => o.id, cell: (o) => <RowLink onClick={() => setSelectedId(o.id)} sub={`${o.subOrderIds.length} vendor sub-order${o.subOrderIds.length > 1 ? "s" : ""}`}>{o.id}</RowLink> },
    { key: "placed", header: "Placed", sortValue: (o) => o.placedAt, cell: (o) => <span className="whitespace-nowrap">{formatDateTime(o.placedAt)}</span> },
    { key: "customer", header: "Customer", sortValue: (o) => byId(db.customers, o.customerId)?.name, cell: (o) => byId(db.customers, o.customerId)?.name },
    { key: "sellers", header: "Sellers", cell: (o) => <span className="line-clamp-2 max-w-[14rem] text-muted-foreground">{orderSubOrders(db, o).map((s) => byId(db.sellers, s.sellerId)?.businessName).join(", ")}</span> },
    { key: "total", header: "Total", align: "right", sortValue: (o) => orderTotal(db, o), cell: (o) => formatINR(orderTotal(db, o)) },
    { key: "status", header: "Status", sortValue: (o) => o.status, cell: (o) => <StatusBadge domain="order" value={o.status} /> },
    {
      key: "payment", header: "Payment", sortValue: (o) => o.paymentState,
      cell: (o) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge domain="payment" value={o.paymentState} />
          {o.dispute?.status === "open" && <StatusBadge domain="dispute" value="open" />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Orders" description="All marketplace orders with their vendor sub-orders, payment state, fulfilment, cancellations, refunds, disputes and audit trail." />
      <DemoNotice>Orders are demo records. Order and sub-order statuses are view-only here: the transitions an administrator may make are not specified (Q-ORDER-TRANSITIONS), so the demo does not change them independently. Refunds are processed on the Refunds page.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search orders" placeholder="Order or sub-order ID, customer, seller" value={query} onChange={setQuery} />
          <FilterSelect label="Order status" value={status} onChange={setStatus} options={statusOptions("order")} />
          <FilterSelect label="Payment state" value={payment} onChange={setPayment} options={statusOptions("payment")} />
          <FilterSelect label="Issues" value={issue} onChange={setIssue} options={ISSUE_OPTIONS} allLabel="Any" />
          <DateRangeFilter value={range} onChange={setRange} />
          <ClearFilters active={Boolean(query || status || payment || issue)} onClear={() => { setQuery(""); setStatus(""); setPayment(""); setIssue(""); }} />
        </Toolbar>
        <DataTable caption="Orders" rows={rows} columns={columns} getRowId={(o) => o.id} initialSort={{ key: "placed", direction: "desc" }} resetKey={`${query}|${status}|${payment}|${issue}|${range.from}|${range.to}`} minWidth={900} />
      </Card>
      <Dialog open={Boolean(byId(db.orders, selectedId))} onOpenChange={(o) => !o && setSelectedId(null)}>
        {byId(db.orders, selectedId) && (
          <SheetContent title={`Order ${selectedId}`} description={`Placed ${formatDateTime(byId(db.orders, selectedId)!.placedAt)}`}>
            <OrderDetail db={db} order={byId(db.orders, selectedId)!} />
          </SheetContent>
        )}
      </Dialog>
    </>
  );
}

function OrderDetail({ db, order }: { db: DemoDb; order: Order }) {
  const customer = byId(db.customers, order.customerId);
  const subs = orderSubOrders(db, order);
  const payments = db.payments.filter((p) => p.orderId === order.id);
  const refunds = db.refunds.filter((r) => r.orderId === order.id);
  const zone = byId(db.zones, order.zoneId);
  const slot = byId(db.slots, order.slotId);
  const auditEntries = db.audit.filter((a) => a.targetId === order.id || refunds.some((r) => r.id === a.targetId) || payments.some((p) => p.id === a.targetId));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <StatusBadge domain="order" value={order.status} />
        <StatusBadge domain="payment" value={order.paymentState} />
        {order.dispute && <StatusBadge domain="dispute" value={order.dispute.status} />}
      </div>
      <DetailList
        items={[
          { label: "Customer", value: customer ? <Link href="/admin/customers" className="text-primary hover:underline">{customer.name}</Link> : "—" },
          { label: "Customer email (masked)", value: customer ? maskEmail(customer.email) : "—" },
          { label: "Delivery zone", value: zone?.name },
          { label: "Delivery slot", value: slot?.window },
          { label: "Order total", value: <span className="font-semibold">{formatINR(orderTotal(db, order))}</span> },
          { label: "Refunded (processed, demo)", value: formatINR(refunds.filter((r) => r.status === "processed_demo").reduce((s, r) => s + r.amountPaise, 0)) },
        ]}
      />
      <NeedsClarification refId="Q-ORDER-TOTAL">The order total here is the sum of vendor sub-order line items. How delivery fees, discounts and taxes combine into the order total is not specified, so they are not included.</NeedsClarification>
      {order.cancellation && (
        <InlineAlert tone="warning" title={`Cancelled by ${order.cancellation.by}`}>
          {order.cancellation.reason} · {formatDateTime(order.cancellation.at)}
        </InlineAlert>
      )}
      {order.dispute && (
        <InlineAlert tone={order.dispute.status === "open" ? "danger" : "info"} title={`Dispute ${order.dispute.id} (${order.dispute.status})`}>
          {order.dispute.reason} · opened {formatDateTime(order.dispute.openedAt)}
        </InlineAlert>
      )}

      <section>
        <SectionTitle>Vendor sub-orders ({subs.length})</SectionTitle>
        <div className="space-y-3">
          {subs.map((s) => (
            <div key={s.id} className="rounded-xl border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-soft px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium">{s.id}</p>
                  <p className="text-xs text-muted-foreground">{byId(db.sellers, s.sellerId)?.businessName}</p>
                </div>
                <StatusBadge domain="fulfilment" value={s.fulfilmentStatus} />
              </div>
              <table className="w-full text-sm">
                <caption className="sr-only">Line items for {s.id}</caption>
                <thead className="sr-only"><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Line total</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {s.items.map((it) => (
                    <tr key={it.variantId}>
                      <td className="px-3.5 py-2">{it.name} <span className="text-muted-foreground">· {it.variantLabel}</span></td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap text-muted-foreground tabular-nums">{it.quantity} × {formatINR(it.unitPricePaise)}</td>
                      <td className="px-3.5 py-2 text-right tabular-nums">{formatINR(lineTotal(it))}</td>
                    </tr>
                  ))}
                  <tr className="bg-soft/60">
                    <td className="px-3.5 py-2 font-medium" colSpan={2}>Sub-order total{s.deliveredAt ? ` · delivered ${formatDateTime(s.deliveredAt)}` : ""}</td>
                    <td className="px-3.5 py-2 text-right font-medium tabular-nums">{formatINR(subOrderTotal(s))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Payment attempts ({payments.length})</SectionTitle>
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id} className="rounded-xl border border-border px-3.5 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/payments?payment=${p.id}`} className="font-medium text-primary hover:underline">{p.id}</Link>
                <StatusBadge domain="attempt" value={p.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.method} · {formatINR(p.amountPaise)} · {p.gatewayRef} · {formatDateTime(p.attemptedAt)}</p>
              {p.failureReason && <p className="mt-1 text-xs text-destructive">{p.failureReason}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Refunds ({refunds.length})</SectionTitle>
        {refunds.length ? (
          <ul className="space-y-2">
            {refunds.map((r) => (
              <li key={r.id} className="rounded-xl border border-border px-3.5 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/refunds?refund=${r.id}`} className="font-medium text-primary hover:underline">{r.id} · {formatINR(r.amountPaise)}</Link>
                  <StatusBadge domain="refund" value={r.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.subOrderId} · {r.reason}{r.demoReference ? ` · ${r.demoReference}` : ""}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No refunds.</p>}
      </section>

      <section>
        <SectionTitle>Order timeline</SectionTitle>
        <Timeline items={[...order.events].reverse().map((e) => ({ at: formatDateTime(e.at), title: e.message, meta: e.actor }))} />
      </section>
      <section>
        <SectionTitle>Admin audit trail</SectionTitle>
        {auditEntries.length ? <Timeline items={auditEntries.map((a) => ({ at: formatDateTime(a.at), title: a.summary, meta: a.actorName }))} /> : <p className="text-sm text-muted-foreground">No administrative actions recorded for this order.</p>}
      </section>
    </div>
  );
}
