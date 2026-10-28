// Mock business actions. Every function is pure: (db, payload, ctx) → new db or an error. None of
// them contacts a real system; outcomes that would involve a provider (refund, payout) are labelled
// "demo". Each successful action appends an audit event (scope §4.17: actor, action, target,
// timestamp, before/after; no passwords, secrets or unnecessary personal data).
//
// Only transitions implied by the source are implemented. Cascades that the source does not define
// (e.g. suspending a seller unlisting their products) are deliberately NOT performed.
import { subOrderTotal } from "./fixtures/orders";
import type {
  AuditEvent,
  AuditTargetType,
  Banner,
  Campaign,
  CertificationReview,
  CommissionConfig,
  ContactDetails,
  Coupon,
  DemoDb,
  DocumentReviewStatus,
  Faq,
  Announcement,
  Order,
  PolicyPage,
  Settings,
  StaffRole,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";
import { humanize } from "@/lib/format";

export interface ActionContext {
  actor: { id: string; name: string };
  now: string;
  /** Unique id generator (random at action time; never used during render). */
  newId: (prefix: string) => string;
}

export type ActionResult = { ok: true; db: DemoDb; message: string } | { ok: false; error: string };
export type MockAction<P> = (db: DemoDb, payload: P, ctx: ActionContext) => ActionResult;

const fail = (error: string): ActionResult => ({ ok: false, error });

function withAudit(
  db: DemoDb,
  ctx: ActionContext,
  entry: { action: string; targetType: AuditTargetType; targetId: string; summary: string; before?: Record<string, string>; after?: Record<string, string> },
): AuditEvent[] {
  const event: AuditEvent = { id: ctx.newId("aud"), at: ctx.now, actorId: ctx.actor.id, actorName: ctx.actor.name, ...entry };
  return [event, ...db.audit];
}

function replace<T extends { id: string }>(list: readonly T[], id: string, next: T): T[] {
  return list.map((item) => (item.id === id ? next : item));
}

const required = (value: string | undefined, label: string) => (!value || !value.trim() ? `${label} is required.` : null);

// ================================================================ Session
export const recordSignIn: MockAction<{ event: "sign_in" | "sign_out" }> = (db, { event }, ctx) => ({
  ok: true,
  message: "",
  db: {
    ...db,
    audit: withAudit(db, ctx, {
      action: event === "sign_in" ? "session.sign_in" : "session.sign_out",
      targetType: "session",
      targetId: ctx.actor.id,
      summary: event === "sign_in" ? "Signed in to the Super Admin demo (mock authentication)" : "Signed out of the Super Admin demo",
    }),
  },
});

// ================================================================ Customers
export const restrictCustomer: MockAction<{ customerId: string; reason: string }> = (db, { customerId, reason }, ctx) => {
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return fail("Customer not found.");
  if (customer.status === "restricted") return fail("This account is already restricted.");
  const err = required(reason, "A restriction reason");
  if (err) return fail(err);
  const next = { ...customer, status: "restricted" as const, restriction: { reason: reason.trim(), at: ctx.now, by: ctx.actor.name } };
  return {
    ok: true,
    message: `${customer.name}'s account is now restricted (demo).`,
    db: {
      ...db,
      customers: replace(db.customers, customerId, next),
      audit: withAudit(db, ctx, { action: "customer.restrict", targetType: "customer", targetId: customerId, summary: `Restricted customer account ${customerId}`, before: { status: "active" }, after: { status: "restricted", reason: reason.trim() } }),
    },
  };
};

export const liftCustomerRestriction: MockAction<{ customerId: string }> = (db, { customerId }, ctx) => {
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return fail("Customer not found.");
  if (customer.status !== "restricted") return fail("This account is not restricted.");
  const { restriction: _removed, ...rest } = customer;
  void _removed;
  return {
    ok: true,
    message: `Restriction lifted for ${customer.name} (demo).`,
    db: {
      ...db,
      customers: replace(db.customers, customerId, { ...rest, status: "active" }),
      audit: withAudit(db, ctx, { action: "customer.lift_restriction", targetType: "customer", targetId: customerId, summary: `Lifted restriction on customer account ${customerId}`, before: { status: "restricted" }, after: { status: "active" } }),
    },
  };
};

// ================================================================ Sellers
export const setDocumentReview: MockAction<{ sellerId: string; documentId: string; status: DocumentReviewStatus; note?: string }> = (db, p, ctx) => {
  const seller = db.sellers.find((s) => s.id === p.sellerId);
  const document = seller?.documents.find((d) => d.id === p.documentId);
  if (!seller || !document) return fail("Document not found.");
  if (p.status === "issue_noted_mock" && !p.note?.trim()) return fail("Describe the issue so the applicant can act on it.");
  const documents = seller.documents.map((d) => (d.id === p.documentId ? { ...d, reviewStatus: p.status, reviewNote: p.note?.trim() || undefined } : d));
  return {
    ok: true,
    message: `Mock review recorded for ${document.type}. No external verification was performed.`,
    db: {
      ...db,
      sellers: replace(db.sellers, seller.id, { ...seller, documents }),
      audit: withAudit(db, ctx, { action: "seller.document_review", targetType: "seller", targetId: seller.id, summary: `Recorded mock review of "${document.type}" for ${seller.businessName}`, before: { reviewStatus: document.reviewStatus }, after: { reviewStatus: p.status } }),
    },
  };
};

function changeSellerStatus(
  db: DemoDb,
  ctx: ActionContext,
  sellerId: string,
  allowedFrom: readonly string[],
  to: "active" | "rejected" | "suspended",
  action: string,
  verb: string,
  note?: string,
): ActionResult {
  const seller = db.sellers.find((s) => s.id === sellerId);
  if (!seller) return fail("Seller not found.");
  if (!allowedFrom.includes(seller.status)) return fail(`Cannot ${verb.toLowerCase()} a seller whose status is "${humanize(seller.status)}".`);
  const next = {
    ...seller,
    status: to,
    rejectionReason: to === "rejected" ? note : seller.rejectionReason,
    suspensionReason: to === "suspended" ? note : to === "active" ? undefined : seller.suspensionReason,
    statusHistory: [...seller.statusHistory, { at: ctx.now, status: to, by: ctx.actor.name, note }],
  };
  return {
    ok: true,
    message: `${seller.businessName}: ${verb.toLowerCase()} (demo).`,
    db: {
      ...db,
      sellers: replace(db.sellers, sellerId, next),
      audit: withAudit(db, ctx, { action, targetType: "seller", targetId: sellerId, summary: `${verb} seller ${seller.businessName}`, before: { status: seller.status }, after: note ? { status: to, reason: note } : { status: to } }),
    },
  };
}

export const approveSeller: MockAction<{ sellerId: string }> = (db, { sellerId }, ctx) =>
  changeSellerStatus(db, ctx, sellerId, ["pending"], "active", "seller.approve", "Approved");

export const rejectSeller: MockAction<{ sellerId: string; reason: string }> = (db, { sellerId, reason }, ctx) => {
  const err = required(reason, "A rejection reason");
  return err ? fail(err) : changeSellerStatus(db, ctx, sellerId, ["pending"], "rejected", "seller.reject", "Rejected", reason.trim());
};

export const suspendSeller: MockAction<{ sellerId: string; reason: string }> = (db, { sellerId, reason }, ctx) => {
  const err = required(reason, "A suspension reason");
  return err ? fail(err) : changeSellerStatus(db, ctx, sellerId, ["active"], "suspended", "seller.suspend", "Suspended", reason.trim());
};

export const reinstateSeller: MockAction<{ sellerId: string; note?: string }> = (db, { sellerId, note }, ctx) =>
  changeSellerStatus(db, ctx, sellerId, ["suspended"], "active", "seller.reinstate", "Reinstated", note?.trim() || undefined);

// ================================================================ Products
export const approveProduct: MockAction<{ productId: string }> = (db, { productId }, ctx) => {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return fail("Product not found.");
  if (product.approvalStatus !== "pending") return fail("Only pending products can be approved.");
  return {
    ok: true,
    message: `${product.name} approved and listed (demo).`,
    db: {
      ...db,
      products: replace(db.products, productId, { ...product, approvalStatus: "approved", listingStatus: "listed", reviewedAt: ctx.now, rejectionReason: undefined }),
      audit: withAudit(db, ctx, { action: "product.approve", targetType: "product", targetId: productId, summary: `Approved product ${product.name}`, before: { approvalStatus: "pending", listingStatus: product.listingStatus }, after: { approvalStatus: "approved", listingStatus: "listed" } }),
    },
  };
};

export const rejectProduct: MockAction<{ productId: string; reason: string }> = (db, { productId, reason }, ctx) => {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return fail("Product not found.");
  if (product.approvalStatus !== "pending") return fail("Only pending products can be rejected.");
  const err = required(reason, "A rejection reason");
  if (err) return fail(err);
  return {
    ok: true,
    message: `${product.name} rejected (demo).`,
    db: {
      ...db,
      products: replace(db.products, productId, { ...product, approvalStatus: "rejected", listingStatus: "unlisted", rejectionReason: reason.trim(), reviewedAt: ctx.now }),
      audit: withAudit(db, ctx, { action: "product.reject", targetType: "product", targetId: productId, summary: `Rejected product ${product.name}`, before: { approvalStatus: "pending" }, after: { approvalStatus: "rejected", reason: reason.trim() } }),
    },
  };
};

export const reviewCertification: MockAction<{ productId: string; outcome: Extract<CertificationReview, "reviewed_mock" | "not_submitted"> }> = (db, { productId, outcome }, ctx) => {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return fail("Product not found.");
  if (product.certification !== "submitted_not_reviewed") return fail("There is no certification document awaiting review.");
  const next = outcome === "reviewed_mock" ? { ...product, certification: outcome } : { ...product, certification: outcome, certificationDocument: undefined };
  return {
    ok: true,
    message: outcome === "reviewed_mock" ? "Certification document marked as reviewed (mock). It has not been externally verified." : "Certification document not accepted (mock); no certification label will show.",
    db: {
      ...db,
      products: replace(db.products, productId, next),
      audit: withAudit(db, ctx, { action: "product.certification_review", targetType: "product", targetId: productId, summary: `Recorded mock certification review for ${product.name}`, before: { certification: product.certification }, after: { certification: outcome } }),
    },
  };
};

export const unlistProduct: MockAction<{ productId: string; reason: string }> = (db, { productId, reason }, ctx) => {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return fail("Product not found.");
  if (product.approvalStatus !== "approved" || product.listingStatus !== "listed") return fail("Only listed, approved products can be unlisted.");
  const err = required(reason, "A moderation reason");
  if (err) return fail(err);
  return {
    ok: true,
    message: `${product.name} unlisted (demo).`,
    db: {
      ...db,
      products: replace(db.products, productId, { ...product, listingStatus: "unlisted", moderationNote: reason.trim() }),
      audit: withAudit(db, ctx, { action: "product.unlist", targetType: "product", targetId: productId, summary: `Unlisted product ${product.name}`, before: { listingStatus: "listed" }, after: { listingStatus: "unlisted", reason: reason.trim() } }),
    },
  };
};

export const relistProduct: MockAction<{ productId: string }> = (db, { productId }, ctx) => {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return fail("Product not found.");
  if (product.approvalStatus !== "approved" || product.listingStatus !== "unlisted") return fail("Only unlisted, approved products can be relisted.");
  return {
    ok: true,
    message: `${product.name} relisted (demo).`,
    db: {
      ...db,
      products: replace(db.products, productId, { ...product, listingStatus: "listed", moderationNote: undefined }),
      audit: withAudit(db, ctx, { action: "product.relist", targetType: "product", targetId: productId, summary: `Relisted product ${product.name}`, before: { listingStatus: "unlisted" }, after: { listingStatus: "listed" } }),
    },
  };
};

export const resolveProductReport: MockAction<{ reportId: string; status: "resolved" | "dismissed"; note: string }> = (db, { reportId, status, note }, ctx) => {
  const report = db.productReports.find((r) => r.id === reportId);
  if (!report) return fail("Report not found.");
  if (report.status !== "open") return fail("This report is already closed.");
  const err = required(note, "A resolution note");
  if (err) return fail(err);
  return {
    ok: true,
    message: `Report ${reportId} ${status} (demo).`,
    db: {
      ...db,
      productReports: replace(db.productReports, reportId, { ...report, status, resolutionNote: note.trim() }),
      audit: withAudit(db, ctx, { action: `product_report.${status === "resolved" ? "resolve" : "dismiss"}`, targetType: "product", targetId: report.productId, summary: `${humanize(status)} product report ${reportId}`, before: { status: "open" }, after: { status } }),
    },
  };
};

export const acknowledgeInventoryAlert: MockAction<{ alertId: string }> = (db, { alertId }, ctx) => {
  const alert = db.inventoryAlerts.find((a) => a.id === alertId);
  if (!alert) return fail("Alert not found.");
  if (alert.status !== "open") return fail("This alert is already acknowledged.");
  return {
    ok: true,
    message: "Low-stock alert acknowledged (demo).",
    db: {
      ...db,
      inventoryAlerts: replace(db.inventoryAlerts, alertId, { ...alert, status: "acknowledged" }),
      audit: withAudit(db, ctx, { action: "inventory_alert.acknowledge", targetType: "inventory", targetId: alertId, summary: `Acknowledged low-stock alert for ${alert.variantId}`, before: { status: "open" }, after: { status: "acknowledged" } }),
    },
  };
};

// ================================================================ Categories
const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const saveCategory: MockAction<{ id?: string; name: string; description: string }> = (db, { id, name, description }, ctx) => {
  const err = required(name, "Category name");
  if (err) return fail(err);
  const slug = slugify(name);
  if (!slug) return fail("Category name must contain letters or numbers.");
  if (db.categories.some((c) => c.id !== id && (c.slug === slug || c.name.toLowerCase() === name.trim().toLowerCase()))) return fail("A category with this name already exists.");
  if (id) {
    const existing = db.categories.find((c) => c.id === id);
    if (!existing) return fail("Category not found.");
    return {
      ok: true,
      message: `Category "${name.trim()}" updated (demo).`,
      db: {
        ...db,
        categories: replace(db.categories, id, { ...existing, name: name.trim(), slug, description: description.trim() }),
        audit: withAudit(db, ctx, { action: "category.update", targetType: "category", targetId: id, summary: `Updated category ${name.trim()}`, before: { name: existing.name }, after: { name: name.trim() } }),
      },
    };
  }
  const newId = ctx.newId("cat");
  return {
    ok: true,
    message: `Category "${name.trim()}" created (demo).`,
    db: {
      ...db,
      categories: [...db.categories, { id: newId, name: name.trim(), slug, description: description.trim(), status: "active", createdAt: ctx.now }],
      audit: withAudit(db, ctx, { action: "category.create", targetType: "category", targetId: newId, summary: `Created category ${name.trim()}`, after: { name: name.trim(), status: "active" } }),
    },
  };
};

export const setCategoryStatus: MockAction<{ categoryId: string; status: "active" | "inactive" }> = (db, { categoryId, status }, ctx) => {
  const category = db.categories.find((c) => c.id === categoryId);
  if (!category) return fail("Category not found.");
  if (category.status === status) return fail(`Category is already ${status}.`);
  const linked = db.products.filter((p) => p.categoryId === categoryId).length;
  return {
    ok: true,
    message: `Category "${category.name}" ${status === "inactive" ? "deactivated" : "reactivated"} (demo). ${linked} linked product(s) were not changed.`,
    db: {
      ...db,
      categories: replace(db.categories, categoryId, { ...category, status }),
      audit: withAudit(db, ctx, { action: status === "inactive" ? "category.deactivate" : "category.reactivate", targetType: "category", targetId: categoryId, summary: `${status === "inactive" ? "Deactivated" : "Reactivated"} category ${category.name} (${linked} linked products)`, before: { status: category.status }, after: { status } }),
    },
  };
};

// ================================================================ Payments and refunds
export const reconcilePayment: MockAction<{ paymentId: string }> = (db, { paymentId }, ctx) => {
  const payment = db.payments.find((p) => p.id === paymentId);
  if (!payment) return fail("Payment attempt not found.");
  if (payment.status !== "succeeded") return fail("Only succeeded payment attempts can be reconciled.");
  if (payment.reconciliation === "matched") return fail("This payment is already reconciled.");
  return {
    ok: true,
    message: `${paymentId} marked as reconciled (demo). No gateway was contacted.`,
    db: {
      ...db,
      payments: replace(db.payments, paymentId, { ...payment, reconciliation: "matched", reconciledAt: ctx.now }),
      audit: withAudit(db, ctx, { action: "payment.reconcile", targetType: "payment", targetId: paymentId, summary: `Marked payment ${paymentId} as reconciled (demo)`, before: { reconciliation: "unreconciled" }, after: { reconciliation: "matched" } }),
    },
  };
};

/** Payment state that follows from the order's processed refunds. Provisional rule — see Q-REFUND-STATE. */
export function paymentStateAfterRefunds(db: DemoDb, order: Order): Order["paymentState"] {
  if (order.paymentState === "failed" || order.paymentState === "pending") return order.paymentState;
  const total = order.subOrderIds.reduce((sum, id) => {
    const sub = db.subOrders.find((s) => s.id === id);
    return sum + (sub ? subOrderTotal(sub) : 0);
  }, 0);
  const refunded = db.refunds.filter((r) => r.orderId === order.id && r.status === "processed_demo").reduce((sum, r) => sum + r.amountPaise, 0);
  if (refunded <= 0) return "paid";
  return refunded >= total ? "refunded" : "partially_refunded";
}

export const processRefund: MockAction<{ refundId: string }> = (db, { refundId }, ctx) => {
  const refund = db.refunds.find((r) => r.id === refundId);
  if (!refund) return fail("Refund not found.");
  if (refund.status !== "requested") return fail("Only requested refunds can be processed.");
  const payment = db.payments.find((p) => p.id === refund.paymentAttemptId);
  if (!payment || payment.status !== "succeeded") return fail("The linked payment attempt has not succeeded, so there is nothing to refund.");
  const order = db.orders.find((o) => o.id === refund.orderId);
  if (!order) return fail("The refund's order was not found.");
  const alreadyRefunded = db.refunds.filter((r) => r.paymentAttemptId === payment.id && r.status === "processed_demo").reduce((s, r) => s + r.amountPaise, 0);
  if (alreadyRefunded + refund.amountPaise > payment.amountPaise) return fail("This refund would exceed the amount captured by the linked payment.");

  const demoReference = `DEMO-RF-${ctx.newId("").replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const nextRefund = { ...refund, status: "processed_demo" as const, processedAt: ctx.now, demoReference };
  const interim: DemoDb = { ...db, refunds: replace(db.refunds, refundId, nextRefund) };
  const nextOrder: Order = {
    ...order,
    paymentState: paymentStateAfterRefunds(interim, order),
    events: [...order.events, { at: ctx.now, actor: ctx.actor.name, message: `Refund ${refundId} processed (demo, ${demoReference})` }],
  };
  return {
    ok: true,
    message: `Refund ${refundId} processed as a demo outcome (${demoReference}). No money moved and no gateway was contacted.`,
    db: {
      ...interim,
      orders: replace(db.orders, order.id, nextOrder),
      audit: withAudit(db, ctx, { action: "refund.process_demo", targetType: "refund", targetId: refundId, summary: `Processed refund ${refundId} for ${order.id} (demo)`, before: { status: "requested", orderPaymentState: order.paymentState }, after: { status: "processed_demo", orderPaymentState: nextOrder.paymentState, demoReference } }),
    },
  };
};

export const reconcileRefund: MockAction<{ refundId: string }> = (db, { refundId }, ctx) => {
  const refund = db.refunds.find((r) => r.id === refundId);
  if (!refund) return fail("Refund not found.");
  if (refund.status !== "processed_demo") return fail("Only processed refunds can be reconciled.");
  if (refund.reconciliation === "matched") return fail("This refund is already reconciled.");
  return {
    ok: true,
    message: `Refund ${refundId} marked as reconciled (demo).`,
    db: {
      ...db,
      refunds: replace(db.refunds, refundId, { ...refund, reconciliation: "matched" }),
      audit: withAudit(db, ctx, { action: "refund.reconcile", targetType: "refund", targetId: refundId, summary: `Marked refund ${refundId} as reconciled (demo)`, before: { reconciliation: "pending" }, after: { reconciliation: "matched" } }),
    },
  };
};

// ================================================================ Commission
export const addCommissionConfig: MockAction<Omit<CommissionConfig, "id" | "createdAt" | "createdBy">> = (db, input, ctx) => {
  if (input.scope !== "global" && !input.targetId) return fail(`Choose the ${input.scope} this override applies to.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) return fail("Enter an effective-from date.");
  if (input.ratePercent !== null && (!Number.isFinite(input.ratePercent) || input.ratePercent < 0 || input.ratePercent > 100)) return fail("A percentage must be between 0 and 100.");
  const id = ctx.newId("cfg");
  const config: CommissionConfig = { ...input, id, createdAt: ctx.now, createdBy: ctx.actor.name, note: input.note?.trim() || undefined };
  return {
    ok: true,
    message: "Commission configuration entry added (demo). Historical calculation records were not changed.",
    db: {
      ...db,
      // Historical records are intentionally untouched (scope §4.6: immutable historical calculation records).
      commissionConfigs: [...db.commissionConfigs, config],
      audit: withAudit(db, ctx, { action: "commission.config_add", targetType: "commission", targetId: id, summary: `Added ${input.scope} commission configuration effective ${input.effectiveFrom}`, after: { scope: input.scope, target: input.targetId ?? "all", rate: input.ratePercent === null ? "needs clarification" : `${input.ratePercent}%`, effectiveFrom: input.effectiveFrom } }),
    },
  };
};

// ================================================================ Settlements
export const reconcileSettlement: MockAction<{ batchId: string }> = (db, { batchId }, ctx) => {
  const batch = db.settlements.find((b) => b.id === batchId);
  if (!batch) return fail("Settlement batch not found.");
  if (batch.status !== "paid_demo" || !batch.payoutReference) return fail("Only batches with a demo payout reference can be reconciled.");
  if (batch.reconciliation === "matched") return fail("This batch is already reconciled.");
  return {
    ok: true,
    message: `${batchId} marked as reconciled (demo). No bank or payout service was contacted.`,
    db: {
      ...db,
      settlements: replace(db.settlements, batchId, { ...batch, reconciliation: "matched", reconciledAt: ctx.now }),
      audit: withAudit(db, ctx, { action: "settlement.reconcile", targetType: "settlement", targetId: batchId, summary: `Marked settlement batch ${batchId} as reconciled (demo)`, before: { reconciliation: "unreconciled" }, after: { reconciliation: "matched" } }),
    },
  };
};

// ================================================================ Delivery
export const updateZone: MockAction<{ zoneId: string; feePaise: number; minOrderPaise: number }> = (db, { zoneId, feePaise, minOrderPaise }, ctx) => {
  const zone = db.zones.find((z) => z.id === zoneId);
  if (!zone) return fail("Zone not found.");
  if (!Number.isInteger(feePaise) || feePaise < 0) return fail("Delivery fee must be zero or more.");
  if (!Number.isInteger(minOrderPaise) || minOrderPaise < 0) return fail("Minimum order value must be zero or more.");
  return {
    ok: true,
    message: `${zone.name} updated (demo).`,
    db: {
      ...db,
      zones: replace(db.zones, zoneId, { ...zone, feePaise, minOrderPaise }),
      audit: withAudit(db, ctx, { action: "delivery.zone_update", targetType: "delivery", targetId: zoneId, summary: `Updated delivery zone ${zone.name}`, before: { feePaise: String(zone.feePaise), minOrderPaise: String(zone.minOrderPaise) }, after: { feePaise: String(feePaise), minOrderPaise: String(minOrderPaise) } }),
    },
  };
};

export const setZoneServiceable: MockAction<{ zoneId: string; serviceable: boolean }> = (db, { zoneId, serviceable }, ctx) => {
  const zone = db.zones.find((z) => z.id === zoneId);
  if (!zone) return fail("Zone not found.");
  if (zone.serviceable === serviceable) return fail("No change.");
  return {
    ok: true,
    message: `${zone.name} marked ${serviceable ? "serviceable" : "not serviceable"} (demo).`,
    db: {
      ...db,
      zones: replace(db.zones, zoneId, { ...zone, serviceable }),
      audit: withAudit(db, ctx, { action: "delivery.zone_serviceability", targetType: "delivery", targetId: zoneId, summary: `Set ${zone.name} ${serviceable ? "serviceable" : "not serviceable"}`, before: { serviceable: String(zone.serviceable) }, after: { serviceable: String(serviceable) } }),
    },
  };
};

export const updateSlotCapacity: MockAction<{ slotId: string; capacity: number }> = (db, { slotId, capacity }, ctx) => {
  const slot = db.slots.find((s) => s.id === slotId);
  if (!slot) return fail("Slot not found.");
  if (!Number.isInteger(capacity) || capacity < 0) return fail("Capacity must be a whole number, zero or more.");
  return {
    ok: true,
    message: `Slot ${slot.window} capacity set to ${capacity} (demo).`,
    db: {
      ...db,
      slots: replace(db.slots, slotId, { ...slot, capacity }),
      audit: withAudit(db, ctx, { action: "delivery.slot_capacity", targetType: "delivery", targetId: slotId, summary: `Changed capacity of slot ${slot.window} in ${slot.zoneId}`, before: { capacity: String(slot.capacity) }, after: { capacity: String(capacity) } }),
    },
  };
};

// ================================================================ Promotions
export function validateDates(startsAt: string, endsAt: string): string | null {
  if (!startsAt || !endsAt) return "Start and end dates are required.";
  if (endsAt < startsAt) return "The end date must be on or after the start date.";
  return null;
}

export const saveCoupon: MockAction<Omit<Coupon, "id" | "usedCount"> & { id?: string }> = (db, input, ctx) => {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,20}$/.test(code)) return fail("Code must be 4–20 letters or digits.");
  if (db.coupons.some((c) => c.code === code && c.id !== input.id)) return fail("Another coupon already uses this code.");
  const dateErr = validateDates(input.startsAt, input.endsAt);
  if (dateErr) return fail(dateErr);
  if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) return fail("Discount value must be greater than zero.");
  if (input.discountType === "percentage" && input.discountValue > 100) return fail("A percentage discount cannot exceed 100.");
  if (input.usageLimit !== null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)) return fail("Usage limit must be a whole number of at least 1, or left empty.");
  const existing = input.id ? db.coupons.find((c) => c.id === input.id) : undefined;
  if (input.id && !existing) return fail("Coupon not found.");
  if (existing && input.usageLimit !== null && input.usageLimit < existing.usedCount) return fail(`Usage limit cannot be below the ${existing.usedCount} uses already recorded.`);
  const id = existing?.id ?? ctx.newId("cpn");
  const coupon: Coupon = { ...input, id, code, description: input.description.trim(), usedCount: existing?.usedCount ?? 0 };
  return {
    ok: true,
    message: `Coupon ${code} ${existing ? "updated" : "created"} (demo).`,
    db: {
      ...db,
      coupons: existing ? replace(db.coupons, id, coupon) : [...db.coupons, coupon],
      audit: withAudit(db, ctx, { action: existing ? "coupon.update" : "coupon.create", targetType: "promotion", targetId: id, summary: `${existing ? "Updated" : "Created"} coupon ${code}`, before: existing ? { startsAt: existing.startsAt, endsAt: existing.endsAt, usageLimit: String(existing.usageLimit ?? "none") } : undefined, after: { startsAt: coupon.startsAt, endsAt: coupon.endsAt, usageLimit: String(coupon.usageLimit ?? "none") } }),
    },
  };
};

export const saveCampaign: MockAction<Omit<Campaign, "id"> & { id?: string }> = (db, input, ctx) => {
  const err = required(input.name, "Campaign name") ?? validateDates(input.startsAt, input.endsAt);
  if (err) return fail(err);
  const existing = input.id ? db.campaigns.find((c) => c.id === input.id) : undefined;
  if (input.id && !existing) return fail("Campaign not found.");
  const id = existing?.id ?? ctx.newId("cmp");
  const campaign: Campaign = { ...input, id, name: input.name.trim(), description: input.description.trim() };
  return {
    ok: true,
    message: `Campaign "${campaign.name}" ${existing ? "updated" : "created"} (demo).`,
    db: {
      ...db,
      campaigns: existing ? replace(db.campaigns, id, campaign) : [...db.campaigns, campaign],
      audit: withAudit(db, ctx, { action: existing ? "campaign.update" : "campaign.create", targetType: "promotion", targetId: id, summary: `${existing ? "Updated" : "Created"} ${campaign.kind} campaign ${campaign.name}`, after: { startsAt: campaign.startsAt, endsAt: campaign.endsAt } }),
    },
  };
};

export const saveBanner: MockAction<Omit<Banner, "id"> & { id?: string }> = (db, input, ctx) => {
  const err = required(input.title, "Banner title") ?? required(input.imageAlt, "Image description (alt text)") ?? validateDates(input.startsAt, input.endsAt);
  if (err) return fail(err);
  const existing = input.id ? db.banners.find((b) => b.id === input.id) : undefined;
  if (input.id && !existing) return fail("Banner not found.");
  const id = existing?.id ?? ctx.newId("bnr");
  const banner: Banner = { ...input, id, title: input.title.trim(), imageAlt: input.imageAlt.trim() };
  return {
    ok: true,
    message: `Banner "${banner.title}" ${existing ? "updated" : "created"} (demo).`,
    db: {
      ...db,
      banners: existing ? replace(db.banners, id, banner) : [...db.banners, banner],
      audit: withAudit(db, ctx, { action: existing ? "banner.update" : "banner.create", targetType: "promotion", targetId: id, summary: `${existing ? "Updated" : "Created"} banner ${banner.title}`, after: { startsAt: banner.startsAt, endsAt: banner.endsAt } }),
    },
  };
};

type PromoKind = "coupon" | "campaign" | "banner";
export const setPromotionEnabled: MockAction<{ kind: PromoKind; id: string; enabled: boolean }> = (db, { kind, id, enabled }, ctx) => {
  const key = kind === "coupon" ? "coupons" : kind === "campaign" ? "campaigns" : "banners";
  const list = db[key] as { id: string; enabled: boolean }[];
  const item = list.find((x) => x.id === id);
  if (!item) return fail(`${humanize(kind)} not found.`);
  const label = "code" in item ? String(item.code) : "name" in item ? String(item.name) : "title" in item ? String(item.title) : id;
  return {
    ok: true,
    message: `${humanize(kind)} ${label} ${enabled ? "enabled" : "disabled"} (demo).`,
    db: {
      ...db,
      [key]: list.map((x) => (x.id === id ? { ...x, enabled } : x)),
      audit: withAudit(db, ctx, { action: `${kind}.${enabled ? "enable" : "disable"}`, targetType: "promotion", targetId: id, summary: `${enabled ? "Enabled" : "Disabled"} ${kind} ${label}`, before: { enabled: String(item.enabled) }, after: { enabled: String(enabled) } }),
    },
  };
};

export const setFeatured: MockAction<{ productId: string; featured: boolean }> = (db, { productId, featured }, ctx) => {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return fail("Product not found.");
  const isFeatured = db.featured.some((f) => f.productId === productId);
  if (featured && isFeatured) return fail("Product is already featured.");
  if (!featured && !isFeatured) return fail("Product is not featured.");
  if (featured && (product.approvalStatus !== "approved" || product.listingStatus !== "listed")) return fail("Only approved, listed products can be featured.");
  return {
    ok: true,
    message: `${product.name} ${featured ? "added to" : "removed from"} featured products (demo).`,
    db: {
      ...db,
      featured: featured ? [...db.featured, { productId, addedAt: ctx.now }] : db.featured.filter((f) => f.productId !== productId),
      audit: withAudit(db, ctx, { action: featured ? "featured.add" : "featured.remove", targetType: "promotion", targetId: productId, summary: `${featured ? "Featured" : "Unfeatured"} product ${product.name}` }),
    },
  };
};

// ================================================================ Reviews
export const hideReview: MockAction<{ reviewId: string; reason: string }> = (db, { reviewId, reason }, ctx) => {
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) return fail("Review not found.");
  if (review.status === "hidden") return fail("Review is already hidden.");
  const err = required(reason, "A moderation reason");
  if (err) return fail(err);
  return {
    ok: true,
    message: `Review ${reviewId} hidden (demo).`,
    db: {
      ...db,
      reviews: replace(db.reviews, reviewId, { ...review, status: "hidden", hiddenReason: reason.trim(), reports: review.reports.map((r) => (r.status === "open" ? { ...r, status: "actioned" as const } : r)) }),
      audit: withAudit(db, ctx, { action: "review.hide", targetType: "review", targetId: reviewId, summary: `Hid review ${reviewId}`, before: { status: "published" }, after: { status: "hidden", reason: reason.trim() } }),
    },
  };
};

export const restoreReview: MockAction<{ reviewId: string }> = (db, { reviewId }, ctx) => {
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) return fail("Review not found.");
  if (review.status !== "hidden") return fail("Review is not hidden.");
  return {
    ok: true,
    message: `Review ${reviewId} restored (demo).`,
    db: {
      ...db,
      reviews: replace(db.reviews, reviewId, { ...review, status: "published", hiddenReason: undefined }),
      audit: withAudit(db, ctx, { action: "review.restore", targetType: "review", targetId: reviewId, summary: `Restored review ${reviewId}`, before: { status: "hidden" }, after: { status: "published" } }),
    },
  };
};

export const dismissReviewReports: MockAction<{ reviewId: string }> = (db, { reviewId }, ctx) => {
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) return fail("Review not found.");
  const open = review.reports.filter((r) => r.status === "open").length;
  if (!open) return fail("There are no open reports on this review.");
  return {
    ok: true,
    message: `${open} report(s) dismissed; review stays published (demo).`,
    db: {
      ...db,
      reviews: replace(db.reviews, reviewId, { ...review, reports: review.reports.map((r) => (r.status === "open" ? { ...r, status: "dismissed" as const } : r)) }),
      audit: withAudit(db, ctx, { action: "review.dismiss_reports", targetType: "review", targetId: reviewId, summary: `Dismissed ${open} report(s) on review ${reviewId}`, before: { openReports: String(open) }, after: { openReports: "0" } }),
    },
  };
};

// ================================================================ Support
const ticketHistory = (actor: string, at: string, change: string) => ({ at, actor, change });

export const replyToTicket: MockAction<{ ticketId: string; body: string }> = (db, { ticketId, body }, ctx) => {
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail("Ticket not found.");
  const err = required(body, "Reply text");
  if (err) return fail(err);
  if (body.trim().length > 2000) return fail("Reply must be 2,000 characters or fewer.");
  return {
    ok: true,
    message: "Reply added to the ticket (demo). No email, SMS or notification was sent.",
    db: {
      ...db,
      tickets: replace(db.tickets, ticketId, {
        ...ticket,
        updatedAt: ctx.now,
        messages: [...ticket.messages, { id: ctx.newId("msg"), author: "staff", authorName: ctx.actor.name, body: body.trim(), at: ctx.now }],
        history: [...ticket.history, ticketHistory(ctx.actor.name, ctx.now, "Reply added (demo, not sent)")],
      }),
      audit: withAudit(db, ctx, { action: "ticket.reply", targetType: "ticket", targetId: ticketId, summary: `Replied to ticket ${ticketId}` }),
    },
  };
};

export const assignTicket: MockAction<{ ticketId: string; assigneeId: string | null }> = (db, { ticketId, assigneeId }, ctx) => {
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail("Ticket not found.");
  if (ticket.assigneeId === assigneeId) return fail("No change.");
  const staff = assigneeId ? db.staff.find((s) => s.id === assigneeId) : undefined;
  if (assigneeId && !staff) return fail("Staff member not found.");
  if (staff && staff.status !== "active") return fail("Tickets can only be assigned to active staff.");
  const name = (id: string | null) => (id ? (db.staff.find((s) => s.id === id)?.name ?? id) : "Unassigned");
  return {
    ok: true,
    message: staff ? `Ticket assigned to ${staff.name} (demo).` : "Ticket unassigned (demo).",
    db: {
      ...db,
      tickets: replace(db.tickets, ticketId, { ...ticket, assigneeId, updatedAt: ctx.now, history: [...ticket.history, ticketHistory(ctx.actor.name, ctx.now, staff ? `Assigned to ${staff.name}` : "Unassigned")] }),
      audit: withAudit(db, ctx, { action: "ticket.assign", targetType: "ticket", targetId: ticketId, summary: `Changed assignee of ${ticketId}`, before: { assignee: name(ticket.assigneeId) }, after: { assignee: name(assigneeId) } }),
    },
  };
};

export const setTicketStatus: MockAction<{ ticketId: string; status: TicketStatus }> = (db, { ticketId, status }, ctx) => {
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail("Ticket not found.");
  if (ticket.status === status) return fail("No change.");
  const change = `Status changed from ${humanize(ticket.status)} to ${humanize(status)}`;
  return {
    ok: true,
    message: `${ticketId}: ${change.toLowerCase()} (demo).`,
    db: {
      ...db,
      tickets: replace(db.tickets, ticketId, { ...ticket, status, updatedAt: ctx.now, history: [...ticket.history, ticketHistory(ctx.actor.name, ctx.now, change)] }),
      audit: withAudit(db, ctx, { action: "ticket.status", targetType: "ticket", targetId: ticketId, summary: `${change} on ${ticketId}`, before: { status: ticket.status }, after: { status } }),
    },
  };
};

export const setTicketPriority: MockAction<{ ticketId: string; priority: TicketPriority }> = (db, { ticketId, priority }, ctx) => {
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (!ticket) return fail("Ticket not found.");
  if (ticket.priority === priority) return fail("No change.");
  const change = `Priority changed from ${humanize(ticket.priority)} to ${humanize(priority)}`;
  return {
    ok: true,
    message: `${ticketId}: ${change.toLowerCase()} (demo).`,
    db: {
      ...db,
      tickets: replace(db.tickets, ticketId, { ...ticket, priority, updatedAt: ctx.now, history: [...ticket.history, ticketHistory(ctx.actor.name, ctx.now, change)] }),
      audit: withAudit(db, ctx, { action: "ticket.priority", targetType: "ticket", targetId: ticketId, summary: `${change} on ${ticketId}`, before: { priority: ticket.priority }, after: { priority } }),
    },
  };
};

// ================================================================ Content
export const setHomepageSection: MockAction<{ sectionId: string; enabled?: boolean; move?: "up" | "down" }> = (db, { sectionId, enabled, move }, ctx) => {
  const sections = [...db.content.homepageSections].sort((a, b) => a.position - b.position);
  const index = sections.findIndex((s) => s.id === sectionId);
  const section = sections[index];
  if (!section) return fail("Section not found.");
  if (move) {
    const swapWith = move === "up" ? index - 1 : index + 1;
    const other = sections[swapWith];
    if (!other) return fail("Section cannot move further.");
    sections[index] = { ...other, position: section.position };
    sections[swapWith] = { ...section, position: other.position };
  } else if (enabled !== undefined) {
    sections[index] = { ...section, enabled };
  }
  return {
    ok: true,
    message: move ? `"${section.title}" moved ${move} (local draft, demo).` : `"${section.title}" ${enabled ? "shown" : "hidden"} (local draft, demo).`,
    db: {
      ...db,
      content: { ...db.content, homepageSections: sections },
      audit: withAudit(db, ctx, { action: move ? "content.section_move" : "content.section_toggle", targetType: "content", targetId: sectionId, summary: move ? `Moved homepage section ${section.title} ${move}` : `${enabled ? "Enabled" : "Disabled"} homepage section ${section.title}`, before: move ? { position: String(section.position) } : { enabled: String(section.enabled) }, after: move ? { position: String(sections.find((s) => s.id === sectionId)?.position) } : { enabled: String(enabled) } }),
    },
  };
};

export const savePolicy: MockAction<{ policyId: string; title: string; body: string; publish: boolean }> = (db, { policyId, title, body, publish }, ctx) => {
  const policy = db.content.policies.find((p) => p.id === policyId);
  if (!policy) return fail("Policy page not found.");
  const err = required(title, "Title") ?? required(body, "Body text");
  if (err) return fail(err);
  const next: PolicyPage = { ...policy, title: title.trim(), body: body.trim(), updatedAt: ctx.now, state: publish ? "published_demo" : "draft" };
  return {
    ok: true,
    message: publish ? `"${next.title}" marked as published in this demo only. The customer storefront was not changed.` : `Draft of "${next.title}" saved locally (demo).`,
    db: {
      ...db,
      content: { ...db.content, policies: replace(db.content.policies, policyId, next) },
      audit: withAudit(db, ctx, { action: publish ? "content.policy_publish_demo" : "content.policy_save_draft", targetType: "content", targetId: policyId, summary: `${publish ? "Published (demo)" : "Saved draft of"} policy ${next.title}`, before: { state: policy.state }, after: { state: next.state } }),
    },
  };
};

export const saveFaq: MockAction<Omit<Faq, "id"> & { id?: string }> = (db, input, ctx) => {
  const err = required(input.question, "Question") ?? required(input.answer, "Answer");
  if (err) return fail(err);
  const existing = input.id ? db.content.faqs.find((f) => f.id === input.id) : undefined;
  if (input.id && !existing) return fail("FAQ not found.");
  const id = existing?.id ?? ctx.newId("faq");
  const faq: Faq = { id, question: input.question.trim(), answer: input.answer.trim() };
  return {
    ok: true,
    message: `FAQ ${existing ? "updated" : "added"} (local draft, demo).`,
    db: {
      ...db,
      content: { ...db.content, faqs: existing ? replace(db.content.faqs, id, faq) : [...db.content.faqs, faq] },
      audit: withAudit(db, ctx, { action: existing ? "content.faq_update" : "content.faq_create", targetType: "content", targetId: id, summary: `${existing ? "Updated" : "Added"} FAQ "${faq.question}"` }),
    },
  };
};

export const deleteFaq: MockAction<{ faqId: string }> = (db, { faqId }, ctx) => {
  const faq = db.content.faqs.find((f) => f.id === faqId);
  if (!faq) return fail("FAQ not found.");
  return {
    ok: true,
    message: "FAQ removed (local draft, demo).",
    db: {
      ...db,
      content: { ...db.content, faqs: db.content.faqs.filter((f) => f.id !== faqId) },
      audit: withAudit(db, ctx, { action: "content.faq_delete", targetType: "content", targetId: faqId, summary: `Removed FAQ "${faq.question}"` }),
    },
  };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s-]{7,16}$/;

export const updateContact: MockAction<ContactDetails> = (db, input, ctx) => {
  if (!EMAIL.test(input.email.trim())) return fail("Enter a valid contact email.");
  if (!PHONE.test(input.phone.trim())) return fail("Enter a valid contact phone number.");
  const err = required(input.address, "Address") ?? required(input.hours, "Support hours");
  if (err) return fail(err);
  const next = { email: input.email.trim(), phone: input.phone.trim(), address: input.address.trim(), hours: input.hours.trim() };
  return {
    ok: true,
    message: "Contact details saved (local draft, demo).",
    db: {
      ...db,
      content: { ...db.content, contact: next },
      audit: withAudit(db, ctx, { action: "content.contact_update", targetType: "content", targetId: "contact", summary: "Updated storefront contact details", before: { ...db.content.contact }, after: next }),
    },
  };
};

export const saveAnnouncement: MockAction<Omit<Announcement, "id"> & { id?: string }> = (db, input, ctx) => {
  const err = required(input.message, "Message") ?? validateDates(input.startsAt, input.endsAt);
  if (err) return fail(err);
  if (input.message.trim().length > 160) return fail("Keep announcements to 160 characters or fewer.");
  const existing = input.id ? db.content.announcements.find((a) => a.id === input.id) : undefined;
  if (input.id && !existing) return fail("Announcement not found.");
  const id = existing?.id ?? ctx.newId("ann");
  const next: Announcement = { ...input, id, message: input.message.trim() };
  return {
    ok: true,
    message: `Announcement ${existing ? "updated" : "added"} (local draft, demo).`,
    db: {
      ...db,
      content: { ...db.content, announcements: existing ? replace(db.content.announcements, id, next) : [...db.content.announcements, next] },
      audit: withAudit(db, ctx, { action: existing ? "content.announcement_update" : "content.announcement_create", targetType: "content", targetId: id, summary: `${existing ? "Updated" : "Added"} announcement`, after: { startsAt: next.startsAt, endsAt: next.endsAt, enabled: String(next.enabled) } }),
    },
  };
};

// ================================================================ Staff
export const changeStaffRole: MockAction<{ staffId: string; role: StaffRole }> = (db, { staffId, role }, ctx) => {
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) return fail("Staff member not found.");
  if (member.role === role) return fail("No change.");
  // Technical safeguard: the signed-in demo account cannot remove its own Super Admin role.
  if (staffId === ctx.actor.id) return fail("You cannot change your own role.");
  return {
    ok: true,
    message: `${member.name} is now ${role === "super_admin" ? "a Super Admin" : "an Admin"} (demo; not enforced by any server).`,
    db: {
      ...db,
      staff: replace(db.staff, staffId, { ...member, role }),
      audit: withAudit(db, ctx, { action: "staff.role_change", targetType: "staff", targetId: staffId, summary: `Changed role of ${member.name}`, before: { role: member.role }, after: { role } }),
    },
  };
};

// ================================================================ Settings
export const updateSettings: MockAction<Pick<Settings, "branding" | "contact">> = (db, input, ctx) => {
  const err = required(input.branding.marketplaceName, "Marketplace name");
  if (err) return fail(err);
  if (!EMAIL.test(input.contact.supportEmail.trim())) return fail("Enter a valid support email.");
  if (!PHONE.test(input.contact.supportPhone.trim())) return fail("Enter a valid support phone number.");
  const before = { marketplaceName: db.settings.branding.marketplaceName, tagline: db.settings.branding.tagline, supportEmail: db.settings.contact.supportEmail, supportPhone: db.settings.contact.supportPhone };
  const after = { marketplaceName: input.branding.marketplaceName.trim(), tagline: input.branding.tagline.trim(), supportEmail: input.contact.supportEmail.trim(), supportPhone: input.contact.supportPhone.trim() };
  const changedKeys = (Object.keys(after) as (keyof typeof after)[]).filter((k) => before[k] !== after[k]);
  if (!changedKeys.length) return fail("No changes to save.");
  const pickKeys = (o: Record<string, string>) => Object.fromEntries(changedKeys.map((k) => [k, o[k] as string]));
  return {
    ok: true,
    message: "Settings saved in this browser (demo).",
    db: {
      ...db,
      settings: { ...db.settings, branding: { marketplaceName: after.marketplaceName, tagline: after.tagline }, contact: { supportEmail: after.supportEmail, supportPhone: after.supportPhone } },
      audit: withAudit(db, ctx, { action: "settings.update", targetType: "settings", targetId: "general", summary: `Updated settings: ${changedKeys.join(", ")}`, before: pickKeys(before), after: pickKeys(after) }),
    },
  };
};

export const toggleSettingsItem: MockAction<{ group: "paymentOptions" | "featureToggles"; id: string; enabled: boolean }> = (db, { group, id, enabled }, ctx) => {
  const item = db.settings[group].find((x) => x.id === id);
  if (!item) return fail("Setting not found.");
  return {
    ok: true,
    message: `${item.label} ${enabled ? "enabled" : "disabled"} (demo setting; no provider is connected).`,
    db: {
      ...db,
      settings: { ...db.settings, [group]: db.settings[group].map((x) => (x.id === id ? { ...x, enabled } : x)) },
      audit: withAudit(db, ctx, { action: group === "paymentOptions" ? "settings.payment_option" : "settings.feature_toggle", targetType: "settings", targetId: id, summary: `${enabled ? "Enabled" : "Disabled"} ${item.label}`, before: { enabled: String(item.enabled) }, after: { enabled: String(enabled) } }),
    },
  };
};
