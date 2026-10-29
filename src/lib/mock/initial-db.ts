import type { InvestmentState } from "@/lib/investment/types";
import type { DemoDb } from "@/lib/types";
import { createInvestmentState, investmentAuditSeed } from "./fixtures/investment";
import { categoriesFixture, inventoryAlertsFixture, productReportsFixture, productsFixture } from "./fixtures/catalogue";
import {
  auditFixture,
  bannersFixture,
  campaignsFixture,
  contentFixture,
  couponsFixture,
  featuredFixture,
  partnersFixture,
  reviewsFixture,
  settingsFixture,
  slotsFixture,
  ticketsFixture,
  zonesFixture,
} from "./fixtures/operations";
import { generateOrders } from "./fixtures/orders";
import { customersFixture, sellersFixture, staffFixture } from "./fixtures/people";

/** Bump when the fixture shape changes so stale browser copies are discarded instead of mis-read. */
export const DB_VERSION = 2;

/**
 * Idempotent seed: adds any seeded sector, project or plan whose ID is missing and never duplicates
 * or overwrites an existing record. Running it repeatedly is safe. When there is no investment state
 * yet, the full demo seed (with its audit history) is created.
 */
export function mergeInvestmentSeed(existing: InvestmentState | undefined): InvestmentState {
  if (!existing) return createInvestmentState();
  const seed = createInvestmentState();
  const addMissing = <T extends { id: string }>(current: T[], seeded: T[]) => [...current, ...seeded.filter((s) => !current.some((c) => c.id === s.id))];
  return {
    ...existing,
    seedVersion: Math.max(existing.seedVersion, seed.seedVersion),
    sectors: addMissing(existing.sectors, seed.sectors),
    projects: addMissing(existing.projects, seed.projects),
    plans: addMissing(existing.plans, seed.plans),
    rules: [...existing.rules, ...seed.rules.filter((s) => !existing.rules.some((r) => r.key === s.key))],
  };
}

/**
 * Upgrades a stored copy without discarding the user's marketplace changes: a version-1 database
 * gains the investment slice and its seeded audit history. Returns null for anything unrecognised.
 */
export function migrateDb(raw: unknown): DemoDb | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as DemoDb).orders)) return null;
  const db = raw as DemoDb;
  if (db.version === DB_VERSION && db.investment) return { ...db, investment: mergeInvestmentSeed(db.investment) };
  if (db.version === 1) {
    const investment = mergeInvestmentSeed(undefined);
    return { ...db, version: DB_VERSION, investment, audit: [...db.audit, ...investmentAuditSeed(investment)].sort((a, b) => b.at.localeCompare(a.at)) };
  }
  return null;
}

/** A fresh, fully independent copy of the demo dataset. */
export function createInitialDb(): DemoDb {
  const investment = mergeInvestmentSeed(undefined);
  const generated = generateOrders();
  const customers = structuredClone(customersFixture);

  // Tickets about a specific order are raised by that order's customer.
  const tickets = structuredClone(ticketsFixture).map((ticket) => {
    if (!ticket.orderId) return ticket;
    const order = generated.orders.find((o) => o.id === ticket.orderId);
    const customer = order && customers.find((cu) => cu.id === order.customerId);
    if (!customer) return ticket;
    const previousName = ticket.messages.find((m) => m.author === "requester")?.authorName;
    const rename = (name: string) => (name === previousName ? customer.name : name);
    return {
      ...ticket,
      requesterId: customer.id,
      messages: ticket.messages.map((m) => ({ ...m, authorName: rename(m.authorName) })),
      history: ticket.history.map((h) => ({ ...h, actor: rename(h.actor) })),
    };
  });

  return {
    version: DB_VERSION,
    staff: structuredClone(staffFixture),
    customers,
    sellers: structuredClone(sellersFixture),
    categories: structuredClone(categoriesFixture),
    products: structuredClone(productsFixture),
    productReports: structuredClone(productReportsFixture),
    inventoryAlerts: structuredClone(inventoryAlertsFixture),
    orders: generated.orders,
    subOrders: generated.subOrders,
    payments: generated.payments,
    refunds: generated.refunds,
    commissionConfigs: [
      { id: "cfg-001", scope: "global", ratePercent: null, effectiveFrom: "2026-01-15", createdAt: "2026-01-15T05:00:00.000Z", createdBy: "Demo Super Admin", note: "Global default rate not specified by the source" },
      { id: "cfg-002", scope: "category", targetId: "cat-exotic", ratePercent: null, effectiveFrom: "2026-02-01", createdAt: "2026-02-01T05:00:00.000Z", createdBy: "Demo Super Admin", note: "Category override placeholder; rate not specified" },
      { id: "cfg-003", scope: "seller", targetId: "sel-003", ratePercent: null, effectiveFrom: "2026-04-01", createdAt: "2026-03-26T08:30:00.000Z", createdBy: "Kavya Raman", note: "Seller override placeholder; rate not specified" },
    ],
    commissionRecords: generated.commissionRecords,
    settlements: generated.settlements,
    zones: structuredClone(zonesFixture),
    slots: structuredClone(slotsFixture),
    partners: structuredClone(partnersFixture),
    coupons: structuredClone(couponsFixture),
    campaigns: structuredClone(campaignsFixture),
    featured: structuredClone(featuredFixture),
    banners: structuredClone(bannersFixture),
    reviews: structuredClone(reviewsFixture),
    tickets,
    content: structuredClone(contentFixture),
    settings: structuredClone(settingsFixture),
    audit: [...structuredClone(auditFixture), ...investmentAuditSeed(investment)].sort((a, b) => b.at.localeCompare(a.at)),
    investment,
  };
}
