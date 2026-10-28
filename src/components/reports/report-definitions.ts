// Report definitions: each report's rows and columns are defined once and drive both the on-screen
// table and the CSV export, so the two can never disagree. Only counts and sums of recorded values
// are used; nothing here encodes a GMV, net-sales, commission or tax formula.
import { inRange, istDay, type DateRange } from "@/lib/dates";
import { byId, orderSubOrders, orderTotal, subOrderTotal, lineTotal } from "@/lib/mock/selectors";
import { statusMeta } from "@/lib/status";
import type { DemoDb } from "@/lib/types";

export interface ReportColumn {
  header: string;
  /** Raw value used for sorting and CSV. Money is in paise and flagged with `money`. */
  value: (row: Row) => string | number | null;
  money?: boolean;
  align?: "right";
}
export type Row = Record<string, string | number | null>;

export interface ReportDefinition {
  id: string;
  label: string;
  description: string;
  /** Present when the report cannot be produced; the UI shows this instead of a table. */
  needsClarification?: { refId: string; text: string };
  rows: (db: DemoDb, range: DateRange) => Row[];
  columns: ReportColumn[];
}

const col = (header: string, key: string, opts: Partial<ReportColumn> = {}): ReportColumn => ({ header, value: (r) => r[key] ?? null, ...opts });
const label = (domain: Parameters<typeof statusMeta>[0], v: string) => statusMeta(domain, v).label;

export const REPORTS: ReportDefinition[] = [
  {
    id: "sales",
    label: "Sales",
    description: "Orders placed and summed order totals per day (IST). The summed totals are not GMV, whose definition is not specified.",
    rows: (db, range) => {
      const days = new Map<string, Row>();
      for (const o of db.orders.filter((x) => inRange(x.placedAt, range))) {
        const d = istDay(o.placedAt);
        const row = days.get(d) ?? { day: d, orders: 0, cancelled: 0, total: 0 };
        row.orders = (row.orders as number) + 1;
        if (o.status === "cancelled") row.cancelled = (row.cancelled as number) + 1;
        row.total = (row.total as number) + orderTotal(db, o);
        days.set(d, row);
      }
      return [...days.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
    },
    columns: [col("Date (IST)", "day"), col("Orders placed", "orders", { align: "right" }), col("Of which cancelled", "cancelled", { align: "right" }), col("Sum of order totals (INR)", "total", { money: true, align: "right" })],
  },
  {
    id: "orders",
    label: "Orders",
    description: "Every parent order placed in the range. Customers are identified by ID only.",
    rows: (db, range) =>
      db.orders
        .filter((o) => inRange(o.placedAt, range))
        .map((o) => ({ id: o.id, placed: o.placedAt, customer: o.customerId, status: label("order", o.status), payment: label("payment", o.paymentState), subs: o.subOrderIds.length, total: orderTotal(db, o) })),
    columns: [col("Order", "id"), col("Placed (UTC)", "placed"), col("Customer ID", "customer"), col("Status", "status"), col("Payment state", "payment"), col("Sub-orders", "subs", { align: "right" }), col("Order total (INR)", "total", { money: true, align: "right" })],
  },
  {
    id: "products",
    label: "Products",
    description: "Units and line-item value per product from orders placed in the range, excluding cancelled sub-orders.",
    rows: (db, range) => {
      const subs = db.orders.filter((o) => inRange(o.placedAt, range)).flatMap((o) => orderSubOrders(db, o)).filter((s) => s.fulfilmentStatus !== "cancelled");
      return db.products.map((p) => {
        const items = subs.flatMap((s) => s.items).filter((it) => it.productId === p.id);
        return {
          id: p.id,
          name: p.name,
          seller: byId(db.sellers, p.sellerId)?.businessName ?? "",
          category: byId(db.categories, p.categoryId)?.name ?? "",
          approval: label("approval", p.approvalStatus),
          listing: p.approvalStatus === "approved" ? label("listing", p.listingStatus) : "—",
          units: items.reduce((s, it) => s + it.quantity, 0),
          value: items.reduce((s, it) => s + lineTotal(it), 0),
        };
      });
    },
    columns: [col("Product ID", "id"), col("Product", "name"), col("Seller", "seller"), col("Category", "category"), col("Approval", "approval"), col("Listing", "listing"), col("Units ordered", "units", { align: "right" }), col("Line-item value (INR)", "value", { money: true, align: "right" })],
  },
  {
    id: "sellers",
    label: "Sellers",
    description: "Vendor sub-order counts and values per seller for orders placed in the range.",
    rows: (db, range) => {
      const subs = db.orders.filter((o) => inRange(o.placedAt, range)).flatMap((o) => orderSubOrders(db, o));
      return db.sellers
        .filter((s) => s.status !== "pending" && s.status !== "rejected")
        .map((s) => {
          const mine = subs.filter((x) => x.sellerId === s.id);
          return {
            seller: s.businessName,
            status: label("seller", s.status),
            subs: mine.length,
            delivered: mine.filter((x) => x.fulfilmentStatus === "delivered").length,
            cancelled: mine.filter((x) => x.fulfilmentStatus === "cancelled").length,
            value: mine.filter((x) => x.fulfilmentStatus !== "cancelled").reduce((sum, x) => sum + subOrderTotal(x), 0),
            refunds: db.refunds.filter((r) => mine.some((x) => x.id === r.subOrderId)).length,
          };
        });
    },
    columns: [col("Seller", "seller"), col("Status", "status"), col("Sub-orders", "subs", { align: "right" }), col("Delivered", "delivered", { align: "right" }), col("Cancelled", "cancelled", { align: "right" }), col("Sub-order value excl. cancelled (INR)", "value", { money: true, align: "right" }), col("Refund records", "refunds", { align: "right" })],
  },
  {
    id: "commissions",
    label: "Commissions",
    description: "Historical commission calculation records in the range. No commission amount is recorded because no rate is specified.",
    rows: (db, range) =>
      db.commissionRecords
        .filter((r) => inRange(r.recordedAt, range))
        .map((r) => ({ id: r.id, sub: r.subOrderId, seller: byId(db.sellers, r.sellerId)?.businessName ?? "", base: r.baseAmountPaise, commission: r.commissionPaise === null ? "Not recorded (needs clarification)" : r.commissionPaise, recorded: r.recordedAt })),
    columns: [col("Record", "id"), col("Sub-order", "sub"), col("Seller", "seller"), col("Sub-order value (INR)", "base", { money: true, align: "right" }), col("Commission", "commission"), col("Recorded (UTC)", "recorded")],
  },
  {
    id: "settlements",
    label: "Settlements",
    description: "Settlement batches created in the range with demo payout references. Payout amounts are not specified.",
    rows: (db, range) =>
      db.settlements
        .filter((b) => inRange(b.createdAt, range))
        .map((b) => ({
          id: b.id,
          seller: byId(db.sellers, b.sellerId)?.businessName ?? "",
          subs: b.subOrderIds.length,
          value: b.subOrderIds.reduce((s, id) => s + (byId(db.subOrders, id) ? subOrderTotal(byId(db.subOrders, id)!) : 0), 0),
          status: label("settlement", b.status),
          ref: b.payoutReference ?? "",
          recon: label("reconciliation", b.reconciliation),
          failure: b.failureReason ?? "",
        })),
    columns: [col("Batch", "id"), col("Seller", "seller"), col("Sub-orders", "subs", { align: "right" }), col("Sub-order value (INR)", "value", { money: true, align: "right" }), col("Status", "status"), col("Payout reference (demo)", "ref"), col("Reconciliation", "recon"), col("Failure reason", "failure")],
  },
  {
    id: "refunds",
    label: "Refunds",
    description: "Refund records requested in the range.",
    rows: (db, range) =>
      db.refunds
        .filter((r) => inRange(r.requestedAt, range))
        .map((r) => ({ id: r.id, order: r.orderId, sub: r.subOrderId, amount: r.amountPaise, reason: r.reason, status: label("refund", r.status), ref: r.demoReference ?? "", requested: r.requestedAt })),
    columns: [col("Refund", "id"), col("Order", "order"), col("Sub-order", "sub"), col("Amount (INR)", "amount", { money: true, align: "right" }), col("Reason", "reason"), col("Status", "status"), col("Demo reference", "ref"), col("Requested (UTC)", "requested")],
  },
  {
    id: "cancellations",
    label: "Cancellations",
    description: "Orders cancelled in the range, with who cancelled and why.",
    rows: (db, range) =>
      db.orders
        .filter((o) => o.cancellation && inRange(o.cancellation.at, range))
        .map((o) => ({ id: o.id, at: o.cancellation!.at, by: o.cancellation!.by, reason: o.cancellation!.reason, payment: label("payment", o.paymentState), total: orderTotal(db, o) })),
    columns: [col("Order", "id"), col("Cancelled (UTC)", "at"), col("Cancelled by", "by"), col("Reason", "reason"), col("Payment state", "payment"), col("Order total (INR)", "total", { money: true, align: "right" })],
  },
  {
    id: "taxes",
    label: "Taxes",
    description: "Tax collected and payable.",
    needsClarification: { refId: "Q-TAX", text: "No tax rates, GST treatment per product category, or tax-inclusive/exclusive pricing rules are specified, and the mock orders carry no tax lines. A tax report cannot be produced without inventing figures, so export is disabled." },
    rows: () => [],
    columns: [],
  },
  {
    id: "delivery",
    label: "Delivery metrics",
    description: "Vendor sub-order fulfilment status per delivery zone for orders placed in the range.",
    rows: (db, range) => {
      const orders = db.orders.filter((o) => inRange(o.placedAt, range));
      return db.zones.map((z) => {
        const subs = orders.filter((o) => o.zoneId === z.id).flatMap((o) => orderSubOrders(db, o));
        return {
          zone: z.name,
          serviceable: z.serviceable ? "Yes" : "No",
          subs: subs.length,
          delivered: subs.filter((s) => s.fulfilmentStatus === "delivered").length,
          inProgress: subs.filter((s) => ["pending", "packed", "dispatched"].includes(s.fulfilmentStatus)).length,
          cancelled: subs.filter((s) => s.fulfilmentStatus === "cancelled").length,
        };
      });
    },
    columns: [col("Zone", "zone"), col("Serviceable", "serviceable"), col("Sub-orders", "subs", { align: "right" }), col("Delivered", "delivered", { align: "right" }), col("In progress", "inProgress", { align: "right" }), col("Cancelled", "cancelled", { align: "right" })],
  },
];

/** CSV value of a column: money as rupees with two decimals, everything else as-is. */
export function csvValue(column: ReportColumn, row: Row): string | number | null {
  const v = column.value(row);
  return column.money && typeof v === "number" ? (v / 100).toFixed(2) : v;
}
