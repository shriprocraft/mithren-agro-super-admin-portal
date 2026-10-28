// DEMO DATA for delivery, promotions, reviews, support, content, settings and seed audit events.
// Fees, minimum order values and capacities are configuration values an administrator would enter;
// they are illustrative and do not encode any fee formula or serviceability rule.
import type {
  AuditEvent,
  Banner,
  Campaign,
  ContentState,
  Coupon,
  DeliveryPartner,
  DeliverySlot,
  DeliveryZone,
  FeaturedProduct,
  Review,
  Settings,
  SupportTicket,
} from "@/lib/types";

export const zonesFixture: DeliveryZone[] = [
  { id: "zone-che", name: "Chennai Central", pincodes: ["600001", "600004", "600017", "600020"], feePaise: 3000, minOrderPaise: 19900, serviceable: true },
  { id: "zone-blr", name: "Bengaluru South", pincodes: ["560004", "560011", "560041", "560076"], feePaise: 3500, minOrderPaise: 24900, serviceable: true },
  { id: "zone-hyd", name: "Hyderabad West", pincodes: ["500032", "500081", "500084"], feePaise: 3000, minOrderPaise: 19900, serviceable: true },
  { id: "zone-pun", name: "Pune Central", pincodes: ["411001", "411004", "411038"], feePaise: 4000, minOrderPaise: 29900, serviceable: true },
  { id: "zone-mys", name: "Mysuru City", pincodes: ["570001", "570009", "570017"], feePaise: 2500, minOrderPaise: 14900, serviceable: true },
  { id: "zone-cbe", name: "Coimbatore North", pincodes: ["641004", "641012", "641035"], feePaise: 3000, minOrderPaise: 19900, serviceable: false },
];

const windows = ["07:00–10:00", "12:00–15:00", "17:00–20:00"];
export const slotsFixture: DeliverySlot[] = zonesFixture.flatMap((zone, zi) =>
  windows.map((window, wi) => ({
    id: `${zone.id}-slot-${wi + 1}`,
    zoneId: zone.id,
    window,
    capacity: [40, 30, 40][wi] as number,
    booked: zone.serviceable ? ([31, 12, 38, 22, 9, 17][(zi + wi) % 6] as number) : 0,
  })),
);

export const partnersFixture: DeliveryPartner[] = [
  { id: "dp-001", name: "SwiftCart Logistics (demo)", phone: "+91 90000 30001", status: "active", zoneIds: ["zone-che", "zone-cbe"] },
  { id: "dp-002", name: "GreenMile Couriers (demo)", phone: "+91 90000 30002", status: "active", zoneIds: ["zone-blr", "zone-mys"] },
  { id: "dp-003", name: "Deccan Express Riders (demo)", phone: "+91 90000 30003", status: "active", zoneIds: ["zone-hyd"] },
  { id: "dp-004", name: "Sahyadri Dispatch (demo)", phone: "+91 90000 30004", status: "inactive", zoneIds: ["zone-pun"] },
];

export const couponsFixture: Coupon[] = [
  { id: "cpn-001", code: "FRESH50", description: "Flat ₹50 off for first orders (demo coupon)", discountType: "flat", discountValue: 5000, startsAt: "2026-09-01", endsAt: "2026-12-31", usageLimit: 500, usedCount: 212, enabled: true },
  { id: "cpn-002", code: "MANGO10", description: "10% off mangoes during the mango season (demo coupon)", discountType: "percentage", discountValue: 10, startsAt: "2026-04-01", endsAt: "2026-07-31", usageLimit: 1000, usedCount: 874, enabled: true },
  { id: "cpn-003", code: "DIWALI15", description: "15% festive offer (demo coupon)", discountType: "percentage", discountValue: 15, startsAt: "2026-11-01", endsAt: "2026-11-15", usageLimit: 300, usedCount: 0, enabled: true },
  { id: "cpn-004", code: "GREENS20", description: "₹20 off leafy greens (demo coupon)", discountType: "flat", discountValue: 2000, startsAt: "2026-10-01", endsAt: "2026-10-31", usageLimit: null, usedCount: 46, enabled: false },
];

export const campaignsFixture: Campaign[] = [
  { id: "cmp-001", name: "Monsoon Greens Week", kind: "discount", description: "Highlights leafy greens from approved sellers.", startsAt: "2026-08-10", endsAt: "2026-08-17", productIds: ["prd-004"], enabled: true },
  { id: "cmp-002", name: "Winter Citrus & Fruit Festival", kind: "seasonal", description: "Seasonal fruit showcase.", startsAt: "2026-12-01", endsAt: "2027-01-15", productIds: ["prd-006", "prd-007", "prd-008"], enabled: true },
  { id: "cmp-003", name: "Diwali Fresh Baskets", kind: "seasonal", description: "Festive produce collection.", startsAt: "2026-10-25", endsAt: "2026-11-10", productIds: ["prd-002", "prd-007"], enabled: true },
];

export const featuredFixture: FeaturedProduct[] = [
  { productId: "prd-002", addedAt: "2026-10-01T06:00:00.000Z" },
  { productId: "prd-003", addedAt: "2026-10-05T06:00:00.000Z" },
  { productId: "prd-007", addedAt: "2026-10-12T06:00:00.000Z" },
];

export const bannersFixture: Banner[] = [
  { id: "bnr-001", title: "Fresh pomegranates this week", imageSrc: "/images/products/pomegranates-studio.jpg", imageAlt: "Pomegranates on a white background", startsAt: "2026-10-20", endsAt: "2026-11-05", enabled: true },
  { id: "bnr-002", title: "Leafy greens from local sellers", imageSrc: "/images/products/spinach-studio.jpg", imageAlt: "Spinach leaves on a white background", startsAt: "2026-11-06", endsAt: "2026-11-30", enabled: true },
  { id: "bnr-003", title: "Mango season", imageSrc: "/images/products/banganapalli-mangoes-studio.jpg", imageAlt: "Mangoes on a white background", startsAt: "2026-04-01", endsAt: "2026-07-31", enabled: false },
];

export const reviewsFixture: Review[] = [
  { id: "rev-001", productId: "prd-002", customerId: "cus-001", rating: 5, title: "Sweet and well packed", body: "The mangoes were sweet and arrived without bruises.", createdAt: "2026-08-12T10:00:00.000Z", status: "published", reports: [] },
  { id: "rev-002", productId: "prd-003", customerId: "cus-002", rating: 4, title: "Good carrots", body: "Fresh and crunchy. One or two were small.", createdAt: "2026-08-20T08:30:00.000Z", status: "published", reports: [] },
  {
    id: "rev-003", productId: "prd-006", customerId: "cus-004", rating: 1, title: "Terrible seller!!!", body: "Worst bananas ever. This seller is a fraud, avoid them and call them at their home number.",
    createdAt: "2026-09-15T12:00:00.000Z", status: "published",
    reports: [
      { id: "rr-003-1", reason: "Abusive language", reportedAt: "2026-09-15T14:00:00.000Z", status: "open" },
      { id: "rr-003-2", reason: "Encourages harassment", reportedAt: "2026-09-16T09:00:00.000Z", status: "open" },
      { id: "rr-003-3", reason: "Abusive language", reportedAt: "2026-09-17T07:30:00.000Z", status: "open" },
    ],
  },
  {
    id: "rev-004", productId: "prd-001", customerId: "cus-010", rating: 5, title: "Buy now at discount link", body: "Great tomatoes! Visit my channel for discount codes on other sites.",
    createdAt: "2026-10-02T09:00:00.000Z", status: "published",
    reports: [{ id: "rr-004-1", reason: "Spam or advertising", reportedAt: "2026-10-02T11:00:00.000Z", status: "open" }],
  },
  { id: "rev-005", productId: "prd-007", customerId: "cus-005", rating: 4, title: "Juicy pomegranates", body: "Good colour inside. Slightly expensive.", createdAt: "2026-10-05T06:00:00.000Z", status: "published", reports: [] },
  {
    id: "rev-006", productId: "prd-004", customerId: "cus-003", rating: 2, title: "Wilted on arrival", body: "The spinach was wilted when it arrived in the evening slot.",
    createdAt: "2026-10-09T15:00:00.000Z", status: "published",
    reports: [{ id: "rr-006-1", reason: "Seller disputes the claim", reportedAt: "2026-10-10T07:00:00.000Z", status: "dismissed" }],
  },
  { id: "rev-007", productId: "prd-008", customerId: "cus-009", rating: 3, title: "Okay", body: "Papaya was fine but not fully ripe.", createdAt: "2026-10-11T05:00:00.000Z", status: "published", reports: [] },
  {
    id: "rev-008", productId: "prd-010", customerId: "cus-012", rating: 1, title: "Removed content", body: "Insulting message directed at a delivery person.",
    createdAt: "2026-10-19T10:00:00.000Z", status: "hidden", hiddenReason: "Personal abuse directed at delivery staff (demo record)",
    reports: [{ id: "rr-008-1", reason: "Abusive language", reportedAt: "2026-10-19T11:00:00.000Z", status: "actioned" }],
  },
  { id: "rev-009", productId: "prd-005", customerId: "cus-011", rating: 5, title: "Fresh okra", body: "Tender okra, cooked well.", createdAt: "2026-10-21T06:30:00.000Z", status: "published", reports: [] },
  { id: "rev-010", productId: "prd-002", customerId: "cus-013", rating: 4, title: "Nice mangoes", body: "Tasty, a few were overripe.", createdAt: "2026-10-24T13:00:00.000Z", status: "published", reports: [] },
];

export const ticketsFixture: SupportTicket[] = [
  {
    id: "TKT-1001", subject: "Items missing from my delivery", requesterType: "customer", requesterId: "cus-005", orderId: "ORD-10028",
    status: "in_progress", priority: "high", assigneeId: "stf-003", createdAt: "2026-10-12T07:00:00.000Z", updatedAt: "2026-10-13T09:00:00.000Z",
    messages: [
      { id: "m-1001-1", author: "requester", authorName: "Meera Krishnan", body: "Two items were missing from my order. Please help.", at: "2026-10-12T07:00:00.000Z" },
      { id: "m-1001-2", author: "staff", authorName: "Arjun Mehta", body: "We are checking with the seller and will update you.", at: "2026-10-13T09:00:00.000Z" },
    ],
    history: [
      { at: "2026-10-12T07:00:00.000Z", actor: "Meera Krishnan", change: "Ticket created" },
      { at: "2026-10-12T08:00:00.000Z", actor: "Kavya Raman", change: "Assigned to Arjun Mehta" },
      { at: "2026-10-13T09:00:00.000Z", actor: "Arjun Mehta", change: "Status changed from Open to In progress" },
    ],
  },
  {
    id: "TKT-1002", subject: "Refund status for damaged item", requesterType: "customer", requesterId: "cus-002", orderId: "ORD-10023",
    status: "open", priority: "medium", assigneeId: null, createdAt: "2026-10-22T10:30:00.000Z", updatedAt: "2026-10-22T10:30:00.000Z",
    messages: [{ id: "m-1002-1", author: "requester", authorName: "Rahul Nair", body: "I requested a refund for a damaged item. When will it be processed?", at: "2026-10-22T10:30:00.000Z" }],
    history: [{ at: "2026-10-22T10:30:00.000Z", actor: "Rahul Nair", change: "Ticket created" }],
  },
  {
    id: "TKT-1003", subject: "Settlement payout not received", requesterType: "seller", requesterId: "sel-003",
    status: "open", priority: "urgent", assigneeId: "stf-005", createdAt: "2026-10-21T06:00:00.000Z", updatedAt: "2026-10-21T06:00:00.000Z",
    messages: [{ id: "m-1003-1", author: "requester", authorName: "Kaveri Fresh Growers", body: "Our October payout shows as failed. Please advise.", at: "2026-10-21T06:00:00.000Z" }],
    history: [
      { at: "2026-10-21T06:00:00.000Z", actor: "Kaveri Fresh Growers", change: "Ticket created" },
      { at: "2026-10-21T06:30:00.000Z", actor: "Kavya Raman", change: "Assigned to Rohan Desai" },
    ],
  },
  {
    id: "TKT-1004", subject: "Change delivery slot", requesterType: "customer", requesterId: "cus-001",
    status: "resolved", priority: "low", assigneeId: "stf-003", createdAt: "2026-09-05T05:00:00.000Z", updatedAt: "2026-09-05T08:00:00.000Z",
    messages: [
      { id: "m-1004-1", author: "requester", authorName: "Ananya Iyer", body: "Can I move my delivery to the evening slot?", at: "2026-09-05T05:00:00.000Z" },
      { id: "m-1004-2", author: "staff", authorName: "Arjun Mehta", body: "Your delivery has been moved to the 17:00–20:00 slot.", at: "2026-09-05T08:00:00.000Z" },
    ],
    history: [
      { at: "2026-09-05T05:00:00.000Z", actor: "Ananya Iyer", change: "Ticket created" },
      { at: "2026-09-05T08:00:00.000Z", actor: "Arjun Mehta", change: "Status changed from Open to Resolved" },
    ],
  },
  {
    id: "TKT-1005", subject: "Bananas arrived overripe", requesterType: "customer", requesterId: "cus-005",
    status: "closed", priority: "low", assigneeId: "stf-002", createdAt: "2026-09-18T07:30:00.000Z", updatedAt: "2026-09-20T07:30:00.000Z",
    messages: [{ id: "m-1005-1", author: "requester", authorName: "Meera Krishnan", body: "The bananas were overripe on arrival.", at: "2026-09-18T07:30:00.000Z" }],
    history: [
      { at: "2026-09-18T07:30:00.000Z", actor: "Meera Krishnan", change: "Ticket created" },
      { at: "2026-09-20T07:30:00.000Z", actor: "Kavya Raman", change: "Status changed from Open to Closed" },
    ],
  },
  {
    id: "TKT-1006", subject: "Account restricted — requesting review", requesterType: "customer", requesterId: "cus-006",
    status: "open", priority: "medium", assigneeId: "stf-002", createdAt: "2026-10-14T12:00:00.000Z", updatedAt: "2026-10-14T12:00:00.000Z",
    messages: [{ id: "m-1006-1", author: "requester", authorName: "Sanjay Gupta", body: "My account was restricted. Can you review it?", at: "2026-10-14T12:00:00.000Z" }],
    history: [{ at: "2026-10-14T12:00:00.000Z", actor: "Sanjay Gupta", change: "Ticket created" }],
  },
  {
    id: "TKT-1007", subject: "How do I list a new product variant?", requesterType: "seller", requesterId: "sel-002",
    status: "in_progress", priority: "low", assigneeId: "stf-004", createdAt: "2026-10-25T09:00:00.000Z", updatedAt: "2026-10-25T10:00:00.000Z",
    messages: [{ id: "m-1007-1", author: "requester", authorName: "Sunrise Organic Collective", body: "We want to add a 1 kg variant for carrots.", at: "2026-10-25T09:00:00.000Z" }],
    history: [
      { at: "2026-10-25T09:00:00.000Z", actor: "Sunrise Organic Collective", change: "Ticket created" },
      { at: "2026-10-25T10:00:00.000Z", actor: "Nisha Varghese", change: "Status changed from Open to In progress" },
    ],
  },
];

export const contentFixture: ContentState = {
  homepageSections: [
    { id: "hs-hero", title: "Hero banner", description: "Rotating banners from Promotions.", enabled: true, position: 1 },
    { id: "hs-categories", title: "Shop by category", description: "Active categories.", enabled: true, position: 2 },
    { id: "hs-featured", title: "Featured products", description: "Products chosen in Promotions → Featured.", enabled: true, position: 3 },
    { id: "hs-seasonal", title: "Seasonal campaign", description: "The running seasonal campaign.", enabled: true, position: 4 },
    { id: "hs-sellers", title: "Meet our sellers", description: "Approved seller profiles.", enabled: false, position: 5 },
  ],
  policies: [
    { id: "pol-terms", title: "Terms and Conditions", slug: "terms-and-conditions", body: "These terms govern use of the marketplace.\n\n[Draft text — to be supplied by the business.]", updatedAt: "2026-09-01T06:00:00.000Z", state: "published_demo" },
    { id: "pol-privacy", title: "Privacy Policy", slug: "privacy-policy", body: "This policy explains how personal data is handled.\n\n[Draft text — to be supplied by the business.]", updatedAt: "2026-09-01T06:00:00.000Z", state: "published_demo" },
    { id: "pol-refund", title: "Cancellation and Refund Policy", slug: "cancellation-refund-policy", body: "[Refund eligibility rules are not yet defined — see docs/NEEDS_CLARIFICATION.md.]", updatedAt: "2026-10-10T06:00:00.000Z", state: "draft" },
    { id: "pol-shipping", title: "Shipping Policy", slug: "shipping-policy", body: "[Delivery fee and serviceability rules are not yet defined.]", updatedAt: "2026-10-10T06:05:00.000Z", state: "draft" },
  ],
  faqs: [
    { id: "faq-001", question: "Which areas do you deliver to?", answer: "Delivery is available in the serviceable zones listed at checkout." },
    { id: "faq-002", question: "How do I report a problem with my order?", answer: "Open a support ticket from your account with your order number." },
    { id: "faq-003", question: "Can I choose a delivery slot?", answer: "Yes, available slots are shown at checkout." },
  ],
  contact: { email: "support@mithrenagro.example", phone: "+91 90000 00000", address: "Demo address — to be supplied by the business", hours: "Mon–Sat, 08:00–20:00 IST" },
  announcements: [
    { id: "ann-001", message: "Diwali week: orders may take an extra day in some zones.", startsAt: "2026-10-28", endsAt: "2026-11-05", enabled: true },
    { id: "ann-002", message: "Coimbatore North deliveries are paused temporarily.", startsAt: "2026-10-15", endsAt: "2026-11-15", enabled: false },
  ],
};

export const settingsFixture: Settings = {
  branding: { marketplaceName: "Mithren Agro", tagline: "Organic fruits and vegetables from trusted sellers" },
  currency: "INR",
  timezone: "Asia/Kolkata",
  contact: { supportEmail: "support@mithrenagro.example", supportPhone: "+91 90000 00000" },
  paymentOptions: [
    { id: "pay-upi", label: "UPI", enabled: true },
    { id: "pay-card", label: "Credit / debit card", enabled: true },
    { id: "pay-netbanking", label: "Net banking", enabled: true },
  ],
  featureToggles: [
    { id: "ft-reviews", label: "Product reviews", description: "Show the review section on product pages.", enabled: true },
    { id: "ft-coupons", label: "Coupons at checkout", description: "Allow customers to enter coupon codes.", enabled: true },
    { id: "ft-seller-applications", label: "Seller applications", description: "Accept new seller applications.", enabled: true },
    { id: "ft-announcements", label: "Announcement bar", description: "Show active announcements on the storefront.", enabled: true },
  ],
  notificationTemplates: [
    { id: "nt-001", name: "Order confirmation", channel: "Email", subject: "Your order {{orderId}} is confirmed" },
    { id: "nt-002", name: "Out for delivery", channel: "SMS", subject: "Your order {{orderId}} is out for delivery" },
    { id: "nt-003", name: "Refund processed", channel: "Email", subject: "Refund for {{orderId}} processed" },
    { id: "nt-004", name: "Seller application update", channel: "Email", subject: "Update on your seller application" },
  ],
};

export const auditFixture: AuditEvent[] = [
  { id: "aud-seed-001", at: "2026-09-06T07:00:00.000Z", actorId: "stf-002", actorName: "Kavya Raman", action: "seller.reject", targetType: "seller", targetId: "sel-007", summary: "Rejected seller application Bluebell Agro Partners", before: { status: "pending" }, after: { status: "rejected" } },
  { id: "aud-seed-002", at: "2026-10-03T09:00:00.000Z", actorId: "stf-004", actorName: "Nisha Varghese", action: "product.reject", targetType: "product", targetId: "prd-014", summary: "Rejected product Tender Okra", before: { approvalStatus: "pending" }, after: { approvalStatus: "rejected" } },
  { id: "aud-seed-003", at: "2026-10-12T09:00:00.000Z", actorId: "stf-002", actorName: "Kavya Raman", action: "customer.restrict", targetType: "customer", targetId: "cus-006", summary: "Restricted customer account cus-006", before: { status: "active" }, after: { status: "restricted" } },
  { id: "aud-seed-004", at: "2026-10-15T06:00:00.000Z", actorId: "stf-004", actorName: "Nisha Varghese", action: "product.unlist", targetType: "product", targetId: "prd-015", summary: "Unlisted product Pomegranate Pack", before: { listingStatus: "listed" }, after: { listingStatus: "unlisted" } },
  { id: "aud-seed-005", at: "2026-10-18T10:15:00.000Z", actorId: "stf-001", actorName: "Demo Super Admin", action: "seller.suspend", targetType: "seller", targetId: "sel-004", summary: "Suspended seller Hilltop Harvest Co.", before: { status: "active" }, after: { status: "suspended" } },
  { id: "aud-seed-006", at: "2026-10-18T10:16:00.000Z", actorId: "stf-001", actorName: "Demo Super Admin", action: "product.unlist", targetType: "product", targetId: "prd-009", summary: "Unlisted product Red Onions", before: { listingStatus: "listed" }, after: { listingStatus: "unlisted" } },
  { id: "aud-seed-007", at: "2026-10-19T11:30:00.000Z", actorId: "stf-003", actorName: "Arjun Mehta", action: "review.hide", targetType: "review", targetId: "rev-008", summary: "Hid review rev-008", before: { status: "published" }, after: { status: "hidden" } },
  { id: "aud-seed-008", at: "2026-10-20T06:30:00.000Z", actorId: "stf-003", actorName: "Arjun Mehta", action: "customer.restrict", targetType: "customer", targetId: "cus-012", summary: "Restricted customer account cus-012", before: { status: "active" }, after: { status: "restricted" } },
];
