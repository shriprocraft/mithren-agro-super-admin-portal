import type { DemoDb } from "@/lib/types";
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
export const DB_VERSION = 1;

/** A fresh, fully independent copy of the demo dataset. */
export function createInitialDb(): DemoDb {
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
    audit: structuredClone(auditFixture),
  };
}
