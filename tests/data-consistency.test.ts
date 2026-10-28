import { describe, expect, it } from "vitest";
import { createInitialDb } from "@/lib/mock/initial-db";
import { orderSubOrders, orderTotal, subOrderTotal } from "@/lib/mock/selectors";

const db = createInitialDb();

describe("fixture determinism", () => {
  it("produces identical data on every call (no random values per render)", () => {
    expect(JSON.stringify(createInitialDb())).toBe(JSON.stringify(createInitialDb()));
  });

  it("uses unique ids within each collection", () => {
    for (const key of ["customers", "sellers", "products", "orders", "subOrders", "payments", "refunds", "settlements", "reviews", "tickets", "audit"] as const) {
      const ids = (db[key] as readonly { id: string }[]).map((x) => x.id);
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });
});

describe("parent orders and vendor sub-orders", () => {
  it("links every sub-order to exactly one existing parent and back", () => {
    for (const sub of db.subOrders) {
      const parent = db.orders.find((o) => o.id === sub.parentId);
      expect(parent, sub.id).toBeDefined();
      expect(parent?.subOrderIds).toContain(sub.id);
    }
    for (const order of db.orders) expect(orderSubOrders(db, order)).toHaveLength(order.subOrderIds.length);
  });

  it("gives each sub-order a single seller with that seller's own products", () => {
    for (const sub of db.subOrders) {
      for (const item of sub.items) {
        const product = db.products.find((p) => p.id === item.productId);
        expect(product?.sellerId).toBe(sub.sellerId);
        expect(product?.variants.some((v) => v.id === item.variantId)).toBe(true);
      }
    }
  });

  it("keeps parent status consistent with sub-order fulfilment", () => {
    for (const order of db.orders) {
      const subs = orderSubOrders(db, order);
      if (order.status === "delivered") expect(subs.every((s) => s.fulfilmentStatus === "delivered")).toBe(true);
      if (order.status === "cancelled") expect(subs.every((s) => s.fulfilmentStatus === "cancelled")).toBe(true);
    }
  });

  it("does not assign orders to a suspended seller after the suspension", () => {
    const suspendedAt = "2026-10-18T10:15:00.000Z";
    for (const order of db.orders.filter((o) => o.placedAt > suspendedAt)) {
      expect(orderSubOrders(db, order).some((s) => s.sellerId === "sel-004")).toBe(false);
    }
  });
});

describe("payments and refunds", () => {
  it("has exactly one succeeded attempt equal to the order total for every paid or refunded order", () => {
    for (const order of db.orders) {
      const succeeded = db.payments.filter((p) => p.orderId === order.id && p.status === "succeeded");
      if (["paid", "partially_refunded", "refunded"].includes(order.paymentState)) {
        expect(succeeded, order.id).toHaveLength(1);
        expect(succeeded[0]?.amountPaise).toBe(orderTotal(db, order));
      } else {
        expect(succeeded, order.id).toHaveLength(0);
      }
    }
  });

  it("never refunds more than the captured payment and links refunds to their order's payment", () => {
    for (const refund of db.refunds) {
      const payment = db.payments.find((p) => p.id === refund.paymentAttemptId);
      expect(payment?.orderId).toBe(refund.orderId);
      expect(payment?.status).toBe("succeeded");
      const sub = db.subOrders.find((s) => s.id === refund.subOrderId);
      expect(sub?.parentId).toBe(refund.orderId);
      expect(refund.amountPaise).toBeLessThanOrEqual(subOrderTotal(sub!));
    }
    for (const payment of db.payments) {
      const refunded = db.refunds.filter((r) => r.paymentAttemptId === payment.id && r.status === "processed_demo").reduce((s, r) => s + r.amountPaise, 0);
      expect(refunded).toBeLessThanOrEqual(payment.amountPaise);
    }
  });

  it("marks processed refunds with a demo reference and the order payment state accordingly", () => {
    for (const refund of db.refunds.filter((r) => r.status === "processed_demo")) {
      expect(refund.demoReference).toMatch(/^DEMO-RF-/);
      const order = db.orders.find((o) => o.id === refund.orderId);
      expect(["refunded", "partially_refunded"]).toContain(order?.paymentState);
    }
  });
});

describe("commission and settlements", () => {
  it("creates one immutable commission record per delivered sub-order with no invented amount", () => {
    const delivered = db.subOrders.filter((s) => s.fulfilmentStatus === "delivered");
    expect(db.commissionRecords).toHaveLength(delivered.length);
    for (const record of db.commissionRecords) {
      expect(Object.isFrozen(record)).toBe(true);
      expect(record.commissionPaise).toBeNull();
      const sub = db.subOrders.find((s) => s.id === record.subOrderId);
      expect(record.baseAmountPaise).toBe(subOrderTotal(sub!));
    }
  });

  it("only settles delivered sub-orders of the batch's own seller, each at most once", () => {
    const seen = new Set<string>();
    for (const batch of db.settlements) {
      for (const id of batch.subOrderIds) {
        const sub = db.subOrders.find((s) => s.id === id);
        expect(sub?.sellerId).toBe(batch.sellerId);
        expect(sub?.fulfilmentStatus).toBe("delivered");
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
      if (batch.status === "processing_demo") expect(batch.payoutReference).toBeUndefined();
      if (batch.status === "failed") expect(batch.failureReason).toBeTruthy();
    }
  });
});

describe("catalogue claims", () => {
  it("only certification-reviewed products reference a certification document from their seller", () => {
    for (const product of db.products.filter((p) => p.certification !== "not_submitted")) {
      const seller = db.sellers.find((s) => s.id === product.sellerId);
      expect(seller?.documents.some((d) => d.fileName === product.certificationDocument)).toBe(true);
    }
  });

  it("links every product, alert and report to existing records", () => {
    for (const p of db.products) {
      expect(db.categories.some((c) => c.id === p.categoryId)).toBe(true);
      expect(db.sellers.some((s) => s.id === p.sellerId)).toBe(true);
    }
    for (const a of db.inventoryAlerts) expect(db.products.find((p) => p.id === a.productId)?.variants.some((v) => v.id === a.variantId)).toBe(true);
    for (const r of db.productReports) expect(db.products.some((p) => p.id === r.productId)).toBe(true);
  });
});

describe("support tickets", () => {
  it("raises order tickets from that order's customer", () => {
    for (const ticket of db.tickets.filter((t) => t.orderId)) {
      const order = db.orders.find((o) => o.id === ticket.orderId);
      expect(ticket.requesterId).toBe(order?.customerId);
    }
  });
});

describe("privacy", () => {
  it("stores no passwords or secrets in audit records", () => {
    const text = JSON.stringify(db.audit).toLowerCase();
    expect(text).not.toContain("password");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("token");
  });
});
