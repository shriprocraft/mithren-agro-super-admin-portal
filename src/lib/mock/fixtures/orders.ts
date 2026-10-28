// DEMO DATA. Orders, vendor sub-orders, payment attempts, refunds, commission records and settlement
// batches are generated together from one seeded generator so that every relationship is consistent
// and the values are identical on every load (no Math.random, no device clock).
//
// Rules the generator follows are structural only:
// - a parent order's total is the sum of its sub-order line items (no fees, discounts or tax: the
//   source does not define how those compose an order total, docs/NEEDS_CLARIFICATION.md Q-ORDER-TOTAL);
// - a "paid" order has exactly one succeeded payment attempt for its total;
// - refund amounts are the value of the refunded line items;
// - commission records carry no amount, because no commission rate or formula is specified.
import type {
  CommissionRecord,
  FulfilmentStatus,
  LineItem,
  Order,
  OrderEvent,
  OrderStatus,
  PaymentAttempt,
  Refund,
  SettlementBatch,
  SubOrder,
} from "@/lib/types";
import { productsFixture } from "./catalogue";
import { customersFixture } from "./people";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CITY_ZONE: Record<string, string> = {
  Chennai: "zone-che",
  Bengaluru: "zone-blr",
  Hyderabad: "zone-hyd",
  Pune: "zone-pun",
  Mysuru: "zone-mys",
  Coimbatore: "zone-cbe",
};

const SELLER_PRODUCTS: Record<string, string[]> = {
  "sel-001": ["prd-001", "prd-002", "prd-010"],
  "sel-002": ["prd-003", "prd-004", "prd-005"],
  "sel-003": ["prd-006", "prd-007", "prd-008", "prd-016"],
  "sel-004": ["prd-009"],
};
const SELLER_SUSPENDED_AT = Date.parse("2026-10-18T10:15:00.000Z");

type Scenario =
  | "cancelled_refunded"
  | "payment_failed"
  | "retry_success"
  | "refund_requested"
  | "dispute_open"
  | "refund_processed"
  | "dispute_resolved"
  | "payment_pending";

const SCENARIOS: Record<number, Scenario> = {
  5: "cancelled_refunded",
  12: "payment_failed",
  18: "retry_success",
  22: "refund_requested",
  27: "dispute_open",
  31: "refund_processed",
  35: "dispute_resolved",
  41: "payment_pending",
};

export const ORDER_COUNT = 42;
const START = Date.parse("2026-08-01T04:00:00.000Z");
const END = Date.parse("2026-10-27T12:00:00.000Z");
const RECENT_START = Date.parse("2026-10-26T00:00:00.000Z");
const RECENT_COUNT = 6;
const REFERENCE = Date.parse("2026-10-28T00:00:00.000Z");
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

export const lineTotal = (item: LineItem) => item.quantity * item.unitPricePaise;
export const subOrderTotal = (sub: SubOrder) => sub.items.reduce((sum, item) => sum + lineTotal(item), 0);

export interface GeneratedOrders {
  orders: Order[];
  subOrders: SubOrder[];
  payments: PaymentAttempt[];
  refunds: Refund[];
  commissionRecords: CommissionRecord[];
  settlements: SettlementBatch[];
}

export function generateOrders(): GeneratedOrders {
  const rng = mulberry32(20261028);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;
  const ref = () => Math.floor(rng() * 36 ** 8).toString(36).padStart(8, "0");

  const orders: Order[] = [];
  const subOrders: SubOrder[] = [];
  const payments: PaymentAttempt[] = [];
  const refunds: Refund[] = [];
  let paymentSeq = 50001;
  let refundSeq = 70001;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const scenario = SCENARIOS[i];
    // The first orders spread across Aug–Oct; the last RECENT_COUNT fall in the final 36 hours so the
    // demo has orders still in progress on the reference date.
    const spread = ORDER_COUNT - RECENT_COUNT;
    const placed =
      i < spread
        ? Math.round(START + ((RECENT_START - 2 * 24 * HOUR - START) * i) / (spread - 1) + (rng() - 0.5) * 6 * HOUR)
        : Math.round(RECENT_START + ((END - RECENT_START) * (i - spread)) / (RECENT_COUNT - 1));
    const orderId = `ORD-${10001 + i}`;
    const eligibleCustomers = customersFixture.filter((cu) => CITY_ZONE[cu.city] && Date.parse(cu.joinedAt) < placed);
    const customer = pick(eligibleCustomers);
    const zoneId = CITY_ZONE[customer.city] as string;
    const slotId = `${zoneId}-slot-${1 + Math.floor(rng() * 3)}`;
    const ageHours = (REFERENCE - placed) / HOUR;
    const recent = ageHours < 48;

    // Sellers that could take the order at that time.
    const sellers = Object.keys(SELLER_PRODUCTS).filter((s) => s !== "sel-004" || placed < SELLER_SUSPENDED_AT);
    const sellerCount = Math.min(sellers.length, rng() < 0.55 ? 1 : rng() < 0.8 ? 2 : 3);
    const chosenSellers: string[] = [];
    while (chosenSellers.length < sellerCount) {
      const s = pick(sellers);
      if (!chosenSellers.includes(s)) chosenSellers.push(s);
    }

    // Status for this order.
    let status: OrderStatus = "delivered";
    let fulfilment: FulfilmentStatus = "delivered";
    if (scenario === "cancelled_refunded" || scenario === "payment_failed") {
      status = "cancelled";
      fulfilment = "cancelled";
    } else if (scenario === "payment_pending") {
      status = "placed";
      fulfilment = "pending";
    } else if (recent) {
      const stage = i % 3;
      status = stage === 0 ? "confirmed" : stage === 1 ? "out_for_delivery" : "placed";
      fulfilment = stage === 0 ? "packed" : stage === 1 ? "dispatched" : "pending";
    }
    const deliveredAt = status === "delivered" ? iso(placed + 20 * HOUR) : undefined;

    const subs: SubOrder[] = chosenSellers.map((sellerId, k) => {
      const productIds = SELLER_PRODUCTS[sellerId] as string[];
      const itemCount = Math.min(productIds.length, rng() < 0.6 ? 1 : 2);
      const items: LineItem[] = [];
      while (items.length < itemCount) {
        const product = productsFixture.find((p) => p.id === pick(productIds));
        if (!product || items.some((it) => it.productId === product.id)) continue;
        const variant = pick(product.variants);
        items.push({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantLabel: variant.label,
          quantity: 1 + Math.floor(rng() * 3),
          unitPricePaise: variant.pricePaise,
        });
      }
      return { id: `${orderId}-${k + 1}`, parentId: orderId, sellerId, items, fulfilmentStatus: fulfilment, deliveredAt };
    });
    subOrders.push(...subs);
    const total = subs.reduce((sum, s) => sum + subOrderTotal(s), 0);

    const events: OrderEvent[] = [{ at: iso(placed), actor: "Customer", message: "Order placed" }];
    const method = pick(["UPI", "Card", "Net banking"] as const);
    const attempt = (offsetMin: number, statusA: PaymentAttempt["status"], extra: Partial<PaymentAttempt> = {}): PaymentAttempt => {
      const at = placed + offsetMin * 60_000;
      const p: PaymentAttempt = {
        id: `PAY-${paymentSeq++}`,
        orderId,
        attemptedAt: iso(at),
        amountPaise: total,
        method,
        gatewayRef: `mock_gw_${ref()}`,
        status: statusA,
        webhook: statusA === "pending" ? { status: "not_received" } : { status: "received_mock", at: iso(at + 60_000) },
        reconciliation: statusA === "succeeded" && placed < Date.parse("2026-10-22T00:00:00.000Z") ? "matched" : "unreconciled",
        ...extra,
      };
      if (p.reconciliation === "matched") p.reconciledAt = iso(at + 26 * HOUR);
      payments.push(p);
      return p;
    };

    let paymentState: Order["paymentState"] = "paid";
    let successful: PaymentAttempt | undefined;
    if (scenario === "payment_failed") {
      attempt(1, "failed", { failureReason: "Transaction declined by issuing bank (mock gateway response)" });
      paymentState = "failed";
      events.push({ at: iso(placed + 2 * 60_000), actor: "Payment gateway (mock)", message: "Payment attempt failed" });
    } else if (scenario === "payment_pending") {
      attempt(1, "pending");
      paymentState = "pending";
      events.push({ at: iso(placed + 60_000), actor: "Payment gateway (mock)", message: "Payment attempt started; no webhook received yet" });
    } else {
      if (scenario === "retry_success") {
        attempt(1, "failed", { failureReason: "UPI request expired before approval (mock gateway response)" });
        events.push({ at: iso(placed + 2 * 60_000), actor: "Payment gateway (mock)", message: "Payment attempt failed" });
        successful = attempt(6, "succeeded");
      } else {
        successful = attempt(1, "succeeded");
      }
      events.push({ at: successful.attemptedAt, actor: "Payment gateway (mock)", message: `Payment succeeded (${successful.id})` });
    }

    let cancellation: Order["cancellation"];
    let dispute: Order["dispute"];

    if (status === "delivered" || status === "out_for_delivery" || status === "confirmed") {
      events.push({ at: iso(placed + 2 * HOUR), actor: "Marketplace", message: "Order confirmed" });
    }
    if (status === "out_for_delivery" || status === "delivered") {
      events.push({ at: iso(placed + 10 * HOUR), actor: "Sellers", message: "All sub-orders dispatched" });
    }
    if (deliveredAt) events.push({ at: deliveredAt, actor: "Delivery partner", message: "All sub-orders delivered" });

    const newRefund = (subOrder: SubOrder, items: LineItem[], reason: string, requestedAt: number, processed: boolean): Refund => {
      const r: Refund = {
        id: `RF-${refundSeq++}`,
        orderId,
        subOrderId: subOrder.id,
        paymentAttemptId: (successful as PaymentAttempt).id,
        amountPaise: items.reduce((sum, it) => sum + lineTotal(it), 0),
        reason,
        requestedAt: iso(requestedAt),
        status: processed ? "processed_demo" : "requested",
        reconciliation: "pending",
      };
      if (processed) {
        r.processedAt = iso(requestedAt + 5 * HOUR);
        r.demoReference = `DEMO-RF-${ref().toUpperCase()}`;
        r.reconciliation = "matched";
      }
      refunds.push(r);
      events.push({ at: r.requestedAt, actor: "Customer", message: `Refund requested for ${subOrder.id} (${r.id})` });
      if (processed) events.push({ at: r.processedAt as string, actor: "Demo Super Admin", message: `Refund ${r.id} processed (demo)` });
      return r;
    };

    const first = subs[0] as SubOrder;
    switch (scenario) {
      case "cancelled_refunded": {
        const at = placed + HOUR;
        cancellation = { at: iso(at), by: "customer", reason: "Ordered by mistake" };
        events.push({ at: iso(at), actor: "Customer", message: "Order cancelled before dispatch" });
        subs.forEach((s) => newRefund(s, s.items, "Order cancelled before dispatch", at + 10 * 60_000, true));
        paymentState = "refunded";
        break;
      }
      case "payment_failed":
        cancellation = { at: iso(placed + 3 * HOUR), by: "customer", reason: "Payment was not completed" };
        events.push({ at: cancellation.at, actor: "Customer", message: "Order cancelled" });
        break;
      case "refund_requested":
        newRefund(first, [first.items[0] as LineItem], "Item arrived damaged", placed + 26 * HOUR, false);
        break;
      case "dispute_open": {
        const at = placed + 24 * HOUR;
        dispute = { id: `DSP-${orderId.slice(4)}`, openedAt: iso(at), reason: "Customer reports items missing from the delivery", status: "open" };
        events.push({ at: iso(at), actor: "Customer", message: `Dispute ${dispute.id} opened` });
        newRefund(first, first.items, "Items missing from delivery (dispute)", at + 30 * 60_000, false);
        break;
      }
      case "refund_processed":
        newRefund(first, [first.items[0] as LineItem], "Quality below expectation", placed + 30 * HOUR, true);
        paymentState = first.items[0] && lineTotal(first.items[0]) === total ? "refunded" : "partially_refunded";
        break;
      case "dispute_resolved": {
        const at = placed + 25 * HOUR;
        dispute = { id: `DSP-${orderId.slice(4)}`, openedAt: iso(at), reason: "Customer reported a late delivery", status: "resolved" };
        events.push({ at: iso(at), actor: "Customer", message: `Dispute ${dispute.id} opened` });
        events.push({ at: iso(at + 6 * HOUR), actor: "Arjun Mehta", message: `Dispute ${dispute.id} resolved after the customer confirmed receipt` });
        break;
      }
    }

    events.sort((a, b) => a.at.localeCompare(b.at));
    orders.push({
      id: orderId,
      customerId: customer.id,
      placedAt: iso(placed),
      status,
      paymentState,
      zoneId,
      slotId,
      subOrderIds: subs.map((s) => s.id),
      cancellation,
      dispute,
      events,
    });
  }

  const commissionRecords: CommissionRecord[] = subOrders
    .filter((s) => s.fulfilmentStatus === "delivered")
    .map((s) =>
      Object.freeze({
        id: `COM-${s.id.slice(4)}`,
        subOrderId: s.id,
        sellerId: s.sellerId,
        baseAmountPaise: subOrderTotal(s),
        commissionPaise: null,
        recordedAt: s.deliveredAt as string,
      }),
    );

  const windows = [
    { key: "202608", from: "2026-08-01", to: "2026-09-01", created: "2026-09-04T06:00:00.000Z" },
    { key: "202609", from: "2026-09-01", to: "2026-10-01", created: "2026-10-04T06:00:00.000Z" },
    { key: "202610A", from: "2026-10-01", to: "2026-10-16", created: "2026-10-19T06:00:00.000Z" },
  ];
  const settlements: SettlementBatch[] = [];
  for (const w of windows) {
    for (const sellerId of Object.keys(SELLER_PRODUCTS)) {
      const included = subOrders.filter(
        (s) => s.sellerId === sellerId && s.deliveredAt && s.deliveredAt >= w.from && s.deliveredAt < w.to,
      );
      if (!included.length) continue;
      const batch: SettlementBatch = {
        id: `STL-${w.key}-${sellerId.slice(4)}`,
        sellerId,
        createdAt: w.created,
        subOrderIds: included.map((s) => s.id),
        status: "paid_demo",
        payoutReference: `MOCK-PAYOUT-${ref().toUpperCase()}`,
        reconciliation: "matched",
        reconciledAt: iso(Date.parse(w.created) + 48 * HOUR),
      };
      if (w.key === "202610A") {
        if (sellerId === "sel-001") {
          batch.status = "processing_demo";
          batch.payoutReference = undefined;
          batch.reconciliation = "unreconciled";
          batch.reconciledAt = undefined;
        } else if (sellerId === "sel-002") {
          batch.reconciliation = "unreconciled";
          batch.reconciledAt = undefined;
        } else if (sellerId === "sel-003") {
          batch.status = "failed";
          batch.payoutReference = `MOCK-PAYOUT-${ref().toUpperCase()}`;
          batch.failureReason = "Beneficiary name mismatch reported by the (mock) payout service";
          batch.reconciliation = "unreconciled";
          batch.reconciledAt = undefined;
        }
      }
      settlements.push(batch);
    }
  }

  return { orders, subOrders, payments, refunds, commissionRecords, settlements };
}
