// Read-only derivations over the demo database. Aggregates here are plain counts and sums of
// recorded values. Where the source does not define a metric's formula (GMV, net sales, platform
// commission, delivery-performance KPI) the selector returns { status: "needs_clarification" }
// instead of a number, so no invented figure can reach the UI.
import { inRange, istDay, type DateRange } from "@/lib/dates";
import type { DemoDb, Order, SubOrder } from "@/lib/types";
import { subOrderTotal } from "./fixtures/orders";

export { lineTotal, subOrderTotal } from "./fixtures/orders";

export function orderSubOrders(db: DemoDb, order: Order): SubOrder[] {
  return order.subOrderIds.map((id) => db.subOrders.find((s) => s.id === id)).filter((s): s is SubOrder => Boolean(s));
}

/** Parent order total = sum of its sub-order line items (see Q-ORDER-TOTAL). */
export function orderTotal(db: DemoDb, order: Order): number {
  return orderSubOrders(db, order).reduce((sum, s) => sum + subOrderTotal(s), 0);
}

export const byId = <T extends { id: string }>(list: readonly T[], id: string | null | undefined) => (id ? list.find((x) => x.id === id) : undefined);

export function sellerPerformance(db: DemoDb, sellerId: string) {
  const subs = db.subOrders.filter((s) => s.sellerId === sellerId);
  return {
    subOrders: subs.length,
    delivered: subs.filter((s) => s.fulfilmentStatus === "delivered").length,
    cancelled: subs.filter((s) => s.fulfilmentStatus === "cancelled").length,
    inProgress: subs.filter((s) => !["delivered", "cancelled"].includes(s.fulfilmentStatus)).length,
    refundRequests: db.refunds.filter((r) => subs.some((s) => s.id === r.subOrderId)).length,
    products: db.products.filter((p) => p.sellerId === sellerId).length,
  };
}

export type Metric =
  | { status: "value"; value: number; detail?: string }
  | { status: "needs_clarification"; reason: string };

export interface DashboardMetrics {
  totalOrders: Metric;
  gmv: Metric;
  platformCommission: Metric;
  refunds: { processedPaise: number; processedCount: number; requestedCount: number };
  netSales: Metric;
  activeCustomers: Metric;
  activeSellers: Metric;
  pendingSellerApprovals: number;
  pendingProductApprovals: number;
  lowStockAlerts: number;
  delivery: { delivered: number; inProgress: number; cancelled: number; total: number };
}

export function dashboardMetrics(db: DemoDb, range: DateRange): DashboardMetrics {
  const orders = db.orders.filter((o) => inRange(o.placedAt, range));
  const subs = orders.flatMap((o) => orderSubOrders(db, o));
  const processed = db.refunds.filter((r) => r.status === "processed_demo" && r.processedAt && inRange(r.processedAt, range));
  return {
    totalOrders: { status: "value", value: orders.length },
    gmv: { status: "needs_clarification", reason: "GMV definition (which order states, fees and cancellations count) is not specified." },
    platformCommission: { status: "needs_clarification", reason: "No commission rate or calculation formula is specified, so no commission is recorded." },
    refunds: {
      processedPaise: processed.reduce((s, r) => s + r.amountPaise, 0),
      processedCount: processed.length,
      requestedCount: db.refunds.filter((r) => inRange(r.requestedAt, range)).length,
    },
    netSales: { status: "needs_clarification", reason: "Net sales formula (deductions for refunds, commission, fees, taxes) is not specified." },
    activeCustomers: { status: "value", value: db.customers.filter((c) => c.status === "active").length, detail: "Accounts with status Active (not filtered by date)" },
    activeSellers: { status: "value", value: db.sellers.filter((s) => s.status === "active").length, detail: "Sellers with status Active (not filtered by date)" },
    pendingSellerApprovals: db.sellers.filter((s) => s.status === "pending").length,
    pendingProductApprovals: db.products.filter((p) => p.approvalStatus === "pending").length,
    lowStockAlerts: db.inventoryAlerts.filter((a) => a.status === "open").length,
    delivery: {
      delivered: subs.filter((s) => s.fulfilmentStatus === "delivered").length,
      inProgress: subs.filter((s) => ["pending", "packed", "dispatched"].includes(s.fulfilmentStatus)).length,
      cancelled: subs.filter((s) => s.fulfilmentStatus === "cancelled").length,
      total: subs.length,
    },
  };
}

/** Orders placed and their summed order totals per IST day within the range (for the trend chart). */
export function dailyOrderSeries(db: DemoDb, range: DateRange) {
  const days = new Map<string, { day: string; orders: number; valuePaise: number }>();
  for (let t = Date.parse(`${range.from}T00:00:00Z`); t <= Date.parse(`${range.to}T00:00:00Z`); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    days.set(day, { day, orders: 0, valuePaise: 0 });
  }
  for (const order of db.orders) {
    const entry = days.get(istDay(order.placedAt));
    if (!entry) continue;
    entry.orders += 1;
    entry.valuePaise += orderTotal(db, order);
  }
  return [...days.values()];
}

/** Delivered sub-orders that are not part of any settlement batch. A factual list, not an eligibility rule. */
export function unsettledDeliveredSubOrders(db: DemoDb): SubOrder[] {
  const settled = new Set(db.settlements.flatMap((b) => b.subOrderIds));
  return db.subOrders.filter((s) => s.fulfilmentStatus === "delivered" && !settled.has(s.id));
}
