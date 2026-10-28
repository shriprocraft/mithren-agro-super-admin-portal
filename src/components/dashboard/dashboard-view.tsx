"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Boxes, ClipboardCheck, IndianRupee, Landmark, PackageCheck, Percent, Receipt, ShoppingCart, Store, Truck, Undo2, Users } from "lucide-react";
import { Card, DemoNotice, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { DateRangeFilter, MetricCard } from "@/components/admin/widgets";
import { siteConfig } from "@/config/site";
import { presetRange, type DateRange } from "@/lib/dates";
import { formatDate, formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { byId, dailyOrderSeries, dashboardMetrics, orderTotal, type Metric } from "@/lib/mock/selectors";
import { useDb } from "@/lib/store/demo-store";
import { OrderTrendChart } from "./order-trend-chart";

function MetricValue({ metric }: { metric: Metric }) {
  return metric.status === "value" ? <>{formatNumber(metric.value)}</> : <NeedsClarification compact />;
}

export function DashboardView() {
  const db = useDb();
  const [range, setRange] = React.useState<DateRange>(() => presetRange("30d"));
  const m = dashboardMetrics(db, range);
  const series = dailyOrderSeries(db, range);
  const pendingSellers = db.sellers.filter((s) => s.status === "pending");
  const pendingProducts = db.products.filter((p) => p.approvalStatus === "pending");
  const alerts = db.inventoryAlerts.filter((a) => a.status === "open");
  const recentOrders = [...db.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 5);
  const deliveredShare = m.delivery.total ? `${m.delivery.delivered} of ${m.delivery.total}` : "0";

  return (
    <>
      <PageHeader
        title="Marketplace overview"
        description={
          <>
            <p>Operational summary from demo fixtures.</p>
            <p className="mt-1">Date ranges count back from the demo reference date, {formatDate(siteConfig.demoReferenceDate)}.</p>
          </>
        }
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />
      <DemoNotice>
        Values are computed from fictional mock records in this browser. Metrics whose formula the requirements do not define are shown as <strong>Needs clarification</strong> rather than estimated.
      </DemoNotice>

      <h2 className="sr-only">Sales and orders for the selected range</h2>
      {/* 3 + 2 wider cards until 2xl, then one row of five, so the five sales cards never leave a gap. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:*:col-span-2 lg:[&>*:nth-child(n+4)]:col-span-3 2xl:grid-cols-5 2xl:*:col-span-1 2xl:[&>*:nth-child(n+4)]:col-span-1">
        <MetricCard label="Total orders" icon={ShoppingCart} value={<MetricValue metric={m.totalOrders} />} detail="Parent orders placed in range" href="/admin/orders" hrefLabel="View orders" />
        <MetricCard label="Gross merchandise value (GMV)" icon={IndianRupee} value={<MetricValue metric={m.gmv} />} detail={m.gmv.status === "needs_clarification" ? m.gmv.reason : undefined} />
        <MetricCard label="Platform commission" icon={Percent} value={<MetricValue metric={m.platformCommission} />} detail={m.platformCommission.status === "needs_clarification" ? m.platformCommission.reason : undefined} href="/admin/commissions" hrefLabel="Commission setup" />
        <MetricCard
          label="Refunds"
          icon={Undo2}
          value={formatINR(m.refunds.processedPaise)}
          detail={`${m.refunds.processedCount} processed (demo) · ${m.refunds.requestedCount} requested in range`}
          href="/admin/refunds"
          hrefLabel="View refunds"
        />
        <MetricCard label="Net sales" icon={Receipt} value={<MetricValue metric={m.netSales} />} detail={m.netSales.status === "needs_clarification" ? m.netSales.reason : undefined} />
      </div>

      <h2 className="sr-only">Marketplace health</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Active customers" icon={Users} value={<MetricValue metric={m.activeCustomers} />} detail={m.activeCustomers.status === "value" ? m.activeCustomers.detail : undefined} href="/admin/customers" hrefLabel="Customers" />
        <MetricCard label="Active sellers" icon={Store} value={<MetricValue metric={m.activeSellers} />} detail={m.activeSellers.status === "value" ? m.activeSellers.detail : undefined} href="/admin/sellers" hrefLabel="Sellers" />
        <MetricCard label="Pending seller approvals" icon={ClipboardCheck} value={m.pendingSellerApprovals} detail="Awaiting a decision · current count, not date-filtered" href="/admin/sellers/approvals" hrefLabel="Review applications" />
        <MetricCard label="Pending product approvals" icon={PackageCheck} value={m.pendingProductApprovals} detail="Awaiting review · current count, not date-filtered" href="/admin/products/approvals" hrefLabel="Review products" />
        <MetricCard label="Low-stock alerts" icon={Boxes} value={m.lowStockAlerts} detail="Open alerts from the (mock) inventory feed · current, not date-filtered" href="/admin/products?view=low-stock" hrefLabel="View alerts" />
        <MetricCard label="Delivery performance" icon={Truck} value={deliveredShare} detail="Sub-orders delivered of those placed in range. A KPI formula (e.g. on-time rate) is not specified." href="/admin/delivery" hrefLabel="Delivery setup" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Order trend" description={`${formatDate(range.from)} – ${formatDate(range.to)}`} className="xl:col-span-2">
          <OrderTrendChart points={series} />
        </Card>
        <Card title="Delivery status" description="Vendor sub-orders from orders placed in range">
          <ul className="space-y-3">
            {[
              { label: "Delivered", value: m.delivery.delivered, domain: "delivered" },
              { label: "In progress (pending, packed, dispatched)", value: m.delivery.inProgress, domain: "dispatched" },
              { label: "Cancelled", value: m.delivery.cancelled, domain: "cancelled" },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-soft px-3.5 py-3">
                <StatusBadge domain="fulfilment" value={row.domain} />
                <span className="sr-only">{row.label}:</span>
                <span className="text-lg font-semibold text-foreground tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <NeedsClarification refId="Q-DELIVERY-KPI">The definition of “delivery performance” (on-time rate, slot adherence, failed attempts) is not specified, so only status counts are shown.</NeedsClarification>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SummaryList
          title="Seller applications"
          href="/admin/sellers/approvals"
          empty="No pending applications."
          items={pendingSellers.map((s) => ({ id: s.id, primary: s.businessName, secondary: `${s.city} · applied ${formatDate(s.appliedAt)}`, badge: <StatusBadge domain="seller" value={s.status} /> }))}
        />
        <SummaryList
          title="Products awaiting review"
          href="/admin/products/approvals"
          empty="No products awaiting review."
          items={pendingProducts.map((p) => ({ id: p.id, primary: p.name, secondary: `${byId(db.sellers, p.sellerId)?.businessName ?? "Unknown seller"} · submitted ${formatDate(p.submittedAt)}`, badge: <StatusBadge domain="approval" value={p.approvalStatus} /> }))}
        />
        <SummaryList
          title="Low-stock alerts"
          href="/admin/products?view=low-stock"
          empty="No open low-stock alerts."
          items={alerts.map((a) => {
            const product = byId(db.products, a.productId);
            const variant = product?.variants.find((v) => v.id === a.variantId);
            return { id: a.id, primary: `${product?.name ?? a.productId} · ${variant?.label ?? ""}`, secondary: `Stock ${a.stockAtAlert} when raised · ${formatDate(a.raisedAt)}`, badge: <StatusBadge domain="alert" value={a.status} /> };
          })}
        />
      </div>

      <Card title="Latest orders" className="mt-6" actions={<Link href="/admin/orders" className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">All orders <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>}>
        <ul className="divide-y divide-border">
          {recentOrders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Link href={`/admin/orders?order=${o.id}`} className="rounded-md font-medium text-primary hover:text-primary-hover hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  {o.id}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {byId(db.customers, o.customerId)?.name} · {o.subOrderIds.length} sub-order{o.subOrderIds.length > 1 ? "s" : ""} · {formatDateTime(o.placedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="order" value={o.status} />
                <StatusBadge domain="payment" value={o.paymentState} />
                <span className="w-20 text-right font-medium tabular-nums">{formatINR(orderTotal(db, o))}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Landmark className="size-3.5" aria-hidden="true" />
        Settlement and payout figures are on the Settlements page; no money moves in this demo.
      </p>
    </>
  );
}

function SummaryList({ title, href, items, empty }: { title: string; href: string; empty: string; items: { id: string; primary: string; secondary: string; badge: React.ReactNode }[] }) {
  return (
    <Card
      title={title}
      description={`${items.length} open`}
      actions={
        <Link href={href} className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          Open <span className="sr-only">{title}</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      }
    >
      {items.length ? (
        <ul className="space-y-2.5">
          {items.slice(0, 4).map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>
              </div>
              {item.badge}
            </li>
          ))}
          {items.length > 4 && <li className="text-xs text-muted-foreground">+{items.length - 4} more</li>}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </Card>
  );
}
