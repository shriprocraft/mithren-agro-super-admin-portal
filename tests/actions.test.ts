import { describe, expect, it } from "vitest";
import * as A from "@/lib/mock/actions";
import type { ActionContext, ActionResult } from "@/lib/mock/actions";
import { createInitialDb } from "@/lib/mock/initial-db";
import type { DemoDb } from "@/lib/types";

let seq = 0;
const ctx: ActionContext = {
  actor: { id: "stf-001", name: "Demo Super Admin" },
  now: "2026-10-28T06:00:00.000Z",
  newId: (prefix) => `${prefix}-test-${++seq}`,
};

function ok(result: ActionResult): DemoDb {
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
  return result.db;
}
function err(result: ActionResult): string {
  if (result.ok) throw new Error("expected failure");
  return result.error;
}

describe("seller approval workflow", () => {
  it("approves a pending seller, records history and an audit event", () => {
    const db = createInitialDb();
    const next = ok(A.approveSeller(db, { sellerId: "sel-005" }, ctx));
    const seller = next.sellers.find((s) => s.id === "sel-005")!;
    expect(seller.status).toBe("active");
    expect(seller.statusHistory.at(-1)).toMatchObject({ status: "active", by: "Demo Super Admin" });
    expect(next.audit[0]).toMatchObject({ action: "seller.approve", targetId: "sel-005", before: { status: "pending" }, after: { status: "active" } });
    expect(next.sellers.filter((s) => s.status === "pending").length).toBe(db.sellers.filter((s) => s.status === "pending").length - 1);
  });

  it("requires a rejection reason and only rejects pending applications", () => {
    const db = createInitialDb();
    expect(err(A.rejectSeller(db, { sellerId: "sel-005", reason: "  " }, ctx))).toMatch(/reason/i);
    expect(err(A.rejectSeller(db, { sellerId: "sel-001", reason: "x" }, ctx))).toMatch(/cannot/i);
    const next = ok(A.rejectSeller(db, { sellerId: "sel-005", reason: "Documents incomplete" }, ctx));
    expect(next.sellers.find((s) => s.id === "sel-005")).toMatchObject({ status: "rejected", rejectionReason: "Documents incomplete" });
  });

  it("suspends and reinstates without changing the seller's products", () => {
    const db = createInitialDb();
    const suspended = ok(A.suspendSeller(db, { sellerId: "sel-001", reason: "Quality complaints" }, ctx));
    expect(suspended.sellers.find((s) => s.id === "sel-001")?.status).toBe("suspended");
    expect(suspended.products).toEqual(db.products);
    const reinstated = ok(A.reinstateSeller(suspended, { sellerId: "sel-001" }, ctx));
    expect(reinstated.sellers.find((s) => s.id === "sel-001")).toMatchObject({ status: "active", suspensionReason: undefined });
  });

  it("requires a note when recording a document issue (mock review)", () => {
    const db = createInitialDb();
    expect(err(A.setDocumentReview(db, { sellerId: "sel-005", documentId: "doc-005-1", status: "issue_noted_mock" }, ctx))).toMatch(/issue/i);
    const next = ok(A.setDocumentReview(db, { sellerId: "sel-005", documentId: "doc-005-1", status: "reviewed_mock" }, ctx));
    expect(next.sellers.find((s) => s.id === "sel-005")?.documents[0]?.reviewStatus).toBe("reviewed_mock");
  });
});

describe("product approval and moderation", () => {
  it("approves a pending product and lists it", () => {
    const db = createInitialDb();
    const next = ok(A.approveProduct(db, { productId: "prd-011" }, ctx));
    expect(next.products.find((p) => p.id === "prd-011")).toMatchObject({ approvalStatus: "approved", listingStatus: "listed" });
    expect(err(A.approveProduct(next, { productId: "prd-011" }, ctx))).toMatch(/pending/);
  });

  it("rejects with a reason", () => {
    const db = createInitialDb();
    expect(err(A.rejectProduct(db, { productId: "prd-013", reason: "" }, ctx))).toMatch(/reason/i);
    const next = ok(A.rejectProduct(db, { productId: "prd-013", reason: "Image mismatch" }, ctx));
    expect(next.products.find((p) => p.id === "prd-013")).toMatchObject({ approvalStatus: "rejected", rejectionReason: "Image mismatch" });
  });

  it("only allows a certification label after a mock review of a submitted document", () => {
    const db = createInitialDb();
    expect(err(A.reviewCertification(db, { productId: "prd-001", outcome: "reviewed_mock" }, ctx))).toMatch(/no certification/i);
    const next = ok(A.reviewCertification(db, { productId: "prd-012", outcome: "reviewed_mock" }, ctx));
    expect(next.products.find((p) => p.id === "prd-012")?.certification).toBe("reviewed_mock");
  });

  it("unlists with a reason and relists", () => {
    const db = createInitialDb();
    const unlisted = ok(A.unlistProduct(db, { productId: "prd-001", reason: "Under review" }, ctx));
    expect(unlisted.products.find((p) => p.id === "prd-001")?.listingStatus).toBe("unlisted");
    const relisted = ok(A.relistProduct(unlisted, { productId: "prd-001" }, ctx));
    expect(relisted.products.find((p) => p.id === "prd-001")?.listingStatus).toBe("listed");
  });
});

describe("categories", () => {
  it("rejects duplicate names and deactivates without altering linked products", () => {
    const db = createInitialDb();
    expect(err(A.saveCategory(db, { name: "fruits", description: "" }, ctx))).toMatch(/already exists/);
    const next = ok(A.setCategoryStatus(db, { categoryId: "cat-fruits", status: "inactive" }, ctx));
    expect(next.categories.find((c) => c.id === "cat-fruits")?.status).toBe("inactive");
    expect(next.products).toEqual(db.products);
  });
});

describe("refunds keep payment and order state consistent", () => {
  it("processes a requested refund as a demo outcome and updates the order", () => {
    const db = createInitialDb();
    const refund = db.refunds.find((r) => r.status === "requested")!;
    const next = ok(A.processRefund(db, { refundId: refund.id }, ctx));
    const updated = next.refunds.find((r) => r.id === refund.id)!;
    expect(updated.status).toBe("processed_demo");
    expect(updated.demoReference).toMatch(/^DEMO-RF-/);
    const order = next.orders.find((o) => o.id === refund.orderId)!;
    expect(["partially_refunded", "refunded"]).toContain(order.paymentState);
    expect(order.events.at(-1)?.message).toContain(refund.id);
    expect(next.audit[0]?.action).toBe("refund.process_demo");
    expect(err(A.processRefund(next, { refundId: refund.id }, ctx))).toMatch(/only requested/i);
  });

  it("reconciles succeeded payments only once", () => {
    const db = createInitialDb();
    const payment = db.payments.find((p) => p.status === "succeeded" && p.reconciliation === "unreconciled")!;
    const next = ok(A.reconcilePayment(db, { paymentId: payment.id }, ctx));
    expect(next.payments.find((p) => p.id === payment.id)?.reconciliation).toBe("matched");
    expect(err(A.reconcilePayment(next, { paymentId: payment.id }, ctx))).toMatch(/already/);
    const failed = db.payments.find((p) => p.status === "failed")!;
    expect(err(A.reconcilePayment(db, { paymentId: failed.id }, ctx))).toMatch(/succeeded/);
  });
});

describe("commission history is immutable", () => {
  it("adds a configuration without rewriting historical calculation records", () => {
    const db = createInitialDb();
    const before = JSON.stringify(db.commissionRecords);
    const next = ok(A.addCommissionConfig(db, { scope: "category", targetId: "cat-fruits", ratePercent: 8, effectiveFrom: "2026-11-01", note: "" }, ctx));
    expect(next.commissionConfigs).toHaveLength(db.commissionConfigs.length + 1);
    expect(JSON.stringify(next.commissionRecords)).toBe(before);
    expect(next.commissionRecords).toBe(db.commissionRecords);
  });

  it("validates scope target and percentage range", () => {
    const db = createInitialDb();
    expect(err(A.addCommissionConfig(db, { scope: "seller", ratePercent: 5, effectiveFrom: "2026-11-01" }, ctx))).toMatch(/choose/i);
    expect(err(A.addCommissionConfig(db, { scope: "global", ratePercent: 120, effectiveFrom: "2026-11-01" }, ctx))).toMatch(/between 0 and 100/);
  });
});

describe("settlements, delivery, promotions", () => {
  it("reconciles only paid demo batches", () => {
    const db = createInitialDb();
    const failed = db.settlements.find((b) => b.status === "failed")!;
    expect(err(A.reconcileSettlement(db, { batchId: failed.id }, ctx))).toMatch(/payout reference/);
    const unreconciled = db.settlements.find((b) => b.status === "paid_demo" && b.reconciliation === "unreconciled")!;
    expect(ok(A.reconcileSettlement(db, { batchId: unreconciled.id }, ctx)).settlements.find((b) => b.id === unreconciled.id)?.reconciliation).toBe("matched");
  });

  it("validates delivery configuration values", () => {
    const db = createInitialDb();
    expect(err(A.updateZone(db, { zoneId: "zone-che", feePaise: -100, minOrderPaise: 0 }, ctx))).toMatch(/fee/i);
    expect(err(A.updateSlotCapacity(db, { slotId: "zone-che-slot-1", capacity: 2.5 }, ctx))).toMatch(/whole number/);
    expect(ok(A.updateZone(db, { zoneId: "zone-che", feePaise: 4000, minOrderPaise: 25000 }, ctx)).zones.find((z) => z.id === "zone-che")).toMatchObject({ feePaise: 4000, minOrderPaise: 25000 });
  });

  it("validates coupon dates, codes and limits", () => {
    const db = createInitialDb();
    const base = { code: "NEWCODE", description: "", discountType: "flat" as const, discountValue: 1000, startsAt: "2026-11-01", endsAt: "2026-11-30", usageLimit: 10, enabled: true };
    expect(err(A.saveCoupon(db, { ...base, endsAt: "2026-10-01" }, ctx))).toMatch(/end date/);
    expect(err(A.saveCoupon(db, { ...base, code: "FRESH50" }, ctx))).toMatch(/already uses/);
    expect(err(A.saveCoupon(db, { ...base, discountType: "percentage", discountValue: 150 }, ctx))).toMatch(/100/);
    expect(err(A.saveCoupon(db, { ...base, usageLimit: 0 }, ctx))).toMatch(/usage limit/i);
    expect(err(A.saveCoupon(db, { ...base, id: "cpn-001", code: "FRESH50", usageLimit: 5 }, ctx))).toMatch(/already recorded/);
    const next = ok(A.saveCoupon(db, base, ctx));
    expect(next.coupons.at(-1)).toMatchObject({ code: "NEWCODE", usedCount: 0 });
  });
});

describe("support, staff, audit", () => {
  it("adds replies and status changes to ticket history", () => {
    const db = createInitialDb();
    const replied = ok(A.replyToTicket(db, { ticketId: "TKT-1002", body: "Looking into it." }, ctx));
    const ticket = replied.tickets.find((t) => t.id === "TKT-1002")!;
    expect(ticket.messages.at(-1)).toMatchObject({ author: "staff", body: "Looking into it." });
    const resolved = ok(A.setTicketStatus(replied, { ticketId: "TKT-1002", status: "resolved" }, ctx));
    expect(resolved.tickets.find((t) => t.id === "TKT-1002")?.history.at(-1)?.change).toBe("Status changed from Open to Resolved");
    expect(err(A.assignTicket(db, { ticketId: "TKT-1002", assigneeId: "stf-005" }, ctx))).toMatch(/active staff/);
  });

  it("prevents changing your own role", () => {
    const db = createInitialDb();
    expect(err(A.changeStaffRole(db, { staffId: "stf-001", role: "admin" }, ctx))).toMatch(/own role/);
    expect(ok(A.changeStaffRole(db, { staffId: "stf-002", role: "super_admin" }, ctx)).staff.find((s) => s.id === "stf-002")?.role).toBe("super_admin");
  });

  it("records actor, target, timestamp and before/after for consequential actions", () => {
    const db = createInitialDb();
    const next = ok(A.restrictCustomer(db, { customerId: "cus-001", reason: "Test reason" }, ctx));
    expect(next.audit[0]).toMatchObject({ actorId: "stf-001", actorName: "Demo Super Admin", targetType: "customer", targetId: "cus-001", at: ctx.now, before: { status: "active" } });
    expect(next.audit).toHaveLength(db.audit.length + 1);
  });
});
