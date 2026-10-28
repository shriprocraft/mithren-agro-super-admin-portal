// Domain models for the Super Admin demo. All money is stored as integer paise (₹1 = 100 paise),
// all timestamps as ISO-8601 strings. Status vocabularies below are PROVISIONAL: the source scope
// names the concepts (approval, suspension, restriction, moderation…) but does not define a status
// list, so these are the minimum needed to represent them. See docs/NEEDS_CLARIFICATION.md (Q-STATUS).

export type ISODate = string;
export type Paise = number;

// ---------------------------------------------------------------- Staff, audit
export type StaffRole = "super_admin" | "admin";
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: "active" | "inactive";
  lastActiveAt: ISODate;
}

export interface AuditEvent {
  id: string;
  at: ISODate;
  actorId: string;
  actorName: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  summary: string;
  before?: Record<string, string>;
  after?: Record<string, string>;
}
export type AuditTargetType =
  | "customer"
  | "seller"
  | "product"
  | "category"
  | "order"
  | "payment"
  | "refund"
  | "commission"
  | "settlement"
  | "delivery"
  | "promotion"
  | "review"
  | "ticket"
  | "content"
  | "staff"
  | "settings"
  | "session"
  | "inventory";

// ---------------------------------------------------------------- Customers
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: ISODate;
  status: "active" | "restricted";
  restriction?: { reason: string; at: ISODate; by: string };
}

// ---------------------------------------------------------------- Sellers
export type SellerStatus = "pending" | "active" | "rejected" | "suspended";
export type DocumentReviewStatus = "not_reviewed" | "reviewed_mock" | "issue_noted_mock";
export interface SellerDocument {
  id: string;
  type: string;
  fileName: string;
  uploadedAt: ISODate;
  reviewStatus: DocumentReviewStatus;
  reviewNote?: string;
}
export interface Seller {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  appliedAt: ISODate;
  status: SellerStatus;
  /** Recorded rating from fixture data; the rating calculation itself is not defined by the source. */
  rating: number | null;
  ratingCount: number;
  categoryIds: string[];
  documents: SellerDocument[];
  rejectionReason?: string;
  suspensionReason?: string;
  statusHistory: { at: ISODate; status: SellerStatus; by: string; note?: string }[];
}

// ---------------------------------------------------------------- Catalogue
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
  createdAt: ISODate;
}
export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  pricePaise: Paise;
  stock: number;
}
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type CertificationReview = "not_submitted" | "submitted_not_reviewed" | "reviewed_mock";
export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  sellerId: string;
  images: { src: string; alt: string }[];
  variants: ProductVariant[];
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  listingStatus: "listed" | "unlisted";
  moderationNote?: string;
  /** Organic certification state from the mock review record. Only "reviewed_mock" may show a certification label. */
  certification: CertificationReview;
  certificationDocument?: string;
  submittedAt: ISODate;
  reviewedAt?: ISODate;
}
export interface ProductReport {
  id: string;
  productId: string;
  customerId: string;
  reason: string;
  reportedAt: ISODate;
  status: "open" | "resolved" | "dismissed";
  resolutionNote?: string;
}
export interface InventoryAlert {
  id: string;
  productId: string;
  variantId: string;
  raisedAt: ISODate;
  stockAtAlert: number;
  status: "open" | "acknowledged";
}

// ---------------------------------------------------------------- Orders
export type OrderStatus = "placed" | "confirmed" | "out_for_delivery" | "delivered" | "cancelled";
export type FulfilmentStatus = "pending" | "packed" | "dispatched" | "delivered" | "cancelled";
export type PaymentState = "pending" | "paid" | "failed" | "partially_refunded" | "refunded";
export interface LineItem {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPricePaise: Paise;
}
export interface SubOrder {
  id: string;
  parentId: string;
  sellerId: string;
  items: LineItem[];
  fulfilmentStatus: FulfilmentStatus;
  deliveredAt?: ISODate;
}
export interface OrderEvent {
  at: ISODate;
  actor: string;
  message: string;
}
export interface Order {
  id: string;
  customerId: string;
  placedAt: ISODate;
  status: OrderStatus;
  paymentState: PaymentState;
  zoneId: string;
  slotId: string;
  subOrderIds: string[];
  cancellation?: { at: ISODate; by: "customer" | "admin"; reason: string };
  dispute?: { id: string; openedAt: ISODate; reason: string; status: "open" | "resolved" };
  events: OrderEvent[];
}

// ---------------------------------------------------------------- Payments, refunds
export interface PaymentAttempt {
  id: string;
  orderId: string;
  attemptedAt: ISODate;
  amountPaise: Paise;
  method: "UPI" | "Card" | "Net banking";
  gatewayRef: string;
  status: "succeeded" | "failed" | "pending";
  failureReason?: string;
  webhook: { status: "received_mock" | "not_received" ; at?: ISODate };
  reconciliation: "matched" | "unreconciled";
  reconciledAt?: ISODate;
}
export interface Refund {
  id: string;
  orderId: string;
  subOrderId: string;
  paymentAttemptId: string;
  amountPaise: Paise;
  reason: string;
  requestedAt: ISODate;
  status: "requested" | "processed_demo";
  processedAt?: ISODate;
  demoReference?: string;
  reconciliation: "pending" | "matched";
}

// ---------------------------------------------------------------- Commission, settlements
export interface CommissionConfig {
  id: string;
  scope: "global" | "category" | "seller";
  targetId?: string;
  /** null = not specified by the source; displayed as "Needs clarification". */
  ratePercent: number | null;
  effectiveFrom: ISODate;
  createdAt: ISODate;
  createdBy: string;
  note?: string;
}
/** Immutable historical record. Never updated after creation. */
export interface CommissionRecord {
  readonly id: string;
  readonly subOrderId: string;
  readonly sellerId: string;
  readonly baseAmountPaise: Paise;
  /** null: no commission was recorded because the rate/formula is not specified. */
  readonly commissionPaise: Paise | null;
  readonly recordedAt: ISODate;
}
export interface SettlementBatch {
  id: string;
  sellerId: string;
  createdAt: ISODate;
  subOrderIds: string[];
  status: "paid_demo" | "failed" | "processing_demo";
  payoutReference?: string;
  failureReason?: string;
  reconciliation: "matched" | "unreconciled";
  reconciledAt?: ISODate;
}

// ---------------------------------------------------------------- Delivery
export interface DeliveryZone {
  id: string;
  name: string;
  pincodes: string[];
  feePaise: Paise;
  minOrderPaise: Paise;
  serviceable: boolean;
}
export interface DeliverySlot {
  id: string;
  zoneId: string;
  window: string;
  capacity: number;
  booked: number;
}
export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  status: "active" | "inactive";
  zoneIds: string[];
}

// ---------------------------------------------------------------- Promotions
export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  /** Percentage points for "percentage"; paise for "flat". */
  discountValue: number;
  startsAt: ISODate;
  endsAt: ISODate;
  usageLimit: number | null;
  usedCount: number;
  enabled: boolean;
}
export interface Campaign {
  id: string;
  name: string;
  kind: "discount" | "seasonal";
  description: string;
  startsAt: ISODate;
  endsAt: ISODate;
  productIds: string[];
  enabled: boolean;
}
export interface FeaturedProduct {
  productId: string;
  addedAt: ISODate;
}
export interface Banner {
  id: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  startsAt: ISODate;
  endsAt: ISODate;
  enabled: boolean;
}

// ---------------------------------------------------------------- Reviews
export interface ReviewReport {
  id: string;
  reason: string;
  reportedAt: ISODate;
  status: "open" | "dismissed" | "actioned";
}
export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  createdAt: ISODate;
  status: "published" | "hidden";
  hiddenReason?: string;
  reports: ReviewReport[];
}

// ---------------------------------------------------------------- Support
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export interface TicketMessage {
  id: string;
  author: "requester" | "staff";
  authorName: string;
  body: string;
  at: ISODate;
}
export interface SupportTicket {
  id: string;
  subject: string;
  requesterType: "customer" | "seller";
  requesterId: string;
  orderId?: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  messages: TicketMessage[];
  history: { at: ISODate; actor: string; change: string }[];
}

// ---------------------------------------------------------------- Content
export interface HomepageSection {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  position: number;
}
export interface PolicyPage {
  id: string;
  title: string;
  slug: string;
  body: string;
  updatedAt: ISODate;
  state: "draft" | "published_demo";
}
export interface Faq {
  id: string;
  question: string;
  answer: string;
}
export interface Announcement {
  id: string;
  message: string;
  startsAt: ISODate;
  endsAt: ISODate;
  enabled: boolean;
}
export interface ContactDetails {
  email: string;
  phone: string;
  address: string;
  hours: string;
}
export interface ContentState {
  homepageSections: HomepageSection[];
  policies: PolicyPage[];
  faqs: Faq[];
  contact: ContactDetails;
  announcements: Announcement[];
}

// ---------------------------------------------------------------- Settings
export interface Settings {
  branding: { marketplaceName: string; tagline: string };
  currency: "INR";
  timezone: "Asia/Kolkata";
  contact: { supportEmail: string; supportPhone: string };
  paymentOptions: { id: string; label: string; enabled: boolean }[];
  featureToggles: { id: string; label: string; description: string; enabled: boolean }[];
  notificationTemplates: { id: string; name: string; channel: "Email" | "SMS" | "WhatsApp" | "Push"; subject: string }[];
}

// ---------------------------------------------------------------- Database
export interface DemoDb {
  version: number;
  staff: StaffMember[];
  customers: Customer[];
  sellers: Seller[];
  categories: Category[];
  products: Product[];
  productReports: ProductReport[];
  inventoryAlerts: InventoryAlert[];
  orders: Order[];
  subOrders: SubOrder[];
  payments: PaymentAttempt[];
  refunds: Refund[];
  commissionConfigs: CommissionConfig[];
  commissionRecords: readonly CommissionRecord[];
  settlements: SettlementBatch[];
  zones: DeliveryZone[];
  slots: DeliverySlot[];
  partners: DeliveryPartner[];
  coupons: Coupon[];
  campaigns: Campaign[];
  featured: FeaturedProduct[];
  banners: Banner[];
  reviews: Review[];
  tickets: SupportTicket[];
  content: ContentState;
  settings: Settings;
  audit: AuditEvent[];
}
