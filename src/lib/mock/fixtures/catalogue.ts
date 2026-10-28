// DEMO DATA. Product images are generic studio photographs reused from the Mithren Agro storefront
// (see docs/IMAGE_CREDITS.md); they illustrate product types only, not real listings or farms.
// No origin, freshness or certification claim is made unless a mock review record says so.
import type { Category, InventoryAlert, Product, ProductReport } from "@/lib/types";

export const categoriesFixture: Category[] = [
  { id: "cat-fruits", name: "Fruits", slug: "fruits", description: "Whole fresh fruit.", status: "active", createdAt: "2026-01-15T05:00:00.000Z" },
  { id: "cat-vegetables", name: "Vegetables", slug: "vegetables", description: "Everyday fresh vegetables.", status: "active", createdAt: "2026-01-15T05:01:00.000Z" },
  { id: "cat-leafy-greens", name: "Leafy Greens", slug: "leafy-greens", description: "Spinach and other leafy greens.", status: "active", createdAt: "2026-01-15T05:02:00.000Z" },
  { id: "cat-exotic", name: "Exotic Produce", slug: "exotic-produce", description: "Less common fruit and vegetable varieties.", status: "active", createdAt: "2026-02-01T05:00:00.000Z" },
  { id: "cat-herbs", name: "Fresh Herbs", slug: "fresh-herbs", description: "Culinary herbs. No listings yet.", status: "inactive", createdAt: "2026-06-10T05:00:00.000Z" },
];

const img = (file: string, alt: string) => ({ src: `/images/products/${file}`, alt });
const v = (id: string, label: string, sku: string, rupees: number, stock: number) => ({ id, label, sku, pricePaise: rupees * 100, stock });

export const productsFixture: Product[] = [
  {
    id: "prd-001", name: "Tomatoes", description: "Round red tomatoes.", categoryId: "cat-vegetables", sellerId: "sel-001",
    images: [img("tomatoes-studio.jpg", "Red tomatoes on a white background")],
    variants: [v("var-001-1", "500 g", "GVF-TOM-500", 30, 120), v("var-001-2", "1 kg", "GVF-TOM-1000", 56, 64)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-02-15T06:00:00.000Z", reviewedAt: "2026-02-16T06:00:00.000Z",
  },
  {
    id: "prd-002", name: "Banganapalli Mangoes", description: "Banganapalli variety mangoes, sold by weight.", categoryId: "cat-fruits", sellerId: "sel-001",
    images: [img("banganapalli-mangoes-studio.jpg", "Mangoes on a white background")],
    variants: [v("var-002-1", "1 kg", "GVF-MAN-1000", 180, 40), v("var-002-2", "3 kg", "GVF-MAN-3000", 510, 4)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-02-15T06:10:00.000Z", reviewedAt: "2026-02-16T06:10:00.000Z",
  },
  {
    id: "prd-003", name: "Carrots", description: "Orange carrots, washed.", categoryId: "cat-vegetables", sellerId: "sel-002",
    images: [img("carrots-studio.jpg", "Bunch of carrots with stalks on a white background")],
    variants: [v("var-003-1", "500 g", "SOC-CAR-500", 38, 90)],
    approvalStatus: "approved", listingStatus: "listed", certification: "reviewed_mock", certificationDocument: "sunrise-organic-cert.pdf",
    submittedAt: "2026-03-06T06:00:00.000Z", reviewedAt: "2026-03-07T06:00:00.000Z",
  },
  {
    id: "prd-004", name: "Spinach", description: "Spinach bunches.", categoryId: "cat-leafy-greens", sellerId: "sel-002",
    images: [img("spinach-studio.jpg", "Spinach leaves on a white background")],
    variants: [v("var-004-1", "250 g bunch", "SOC-SPN-250", 25, 3)],
    approvalStatus: "approved", listingStatus: "listed", certification: "reviewed_mock", certificationDocument: "sunrise-organic-cert.pdf",
    submittedAt: "2026-03-06T06:05:00.000Z", reviewedAt: "2026-03-07T06:05:00.000Z",
  },
  {
    id: "prd-005", name: "Okra", description: "Tender okra (lady's finger).", categoryId: "cat-vegetables", sellerId: "sel-002",
    images: [img("okra-studio.jpg", "Okra pod on a white background")],
    variants: [v("var-005-1", "500 g", "SOC-OKR-500", 40, 75)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-03-06T06:10:00.000Z", reviewedAt: "2026-03-07T06:10:00.000Z",
  },
  {
    id: "prd-006", name: "Robusta Bananas", description: "Robusta bananas, sold per dozen.", categoryId: "cat-fruits", sellerId: "sel-003",
    images: [img("robusta-bananas-studio.jpg", "Bunch of bananas on a white background")],
    variants: [v("var-006-1", "1 dozen", "KFG-BAN-12", 70, 55)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-03-27T06:00:00.000Z", reviewedAt: "2026-03-28T06:00:00.000Z",
  },
  {
    id: "prd-007", name: "Pomegranates", description: "Whole pomegranates, sold by weight.", categoryId: "cat-fruits", sellerId: "sel-003",
    images: [img("pomegranates-studio.jpg", "Pomegranates on a white background")],
    variants: [v("var-007-1", "1 kg", "KFG-POM-1000", 220, 18), v("var-007-2", "500 g", "KFG-POM-500", 115, 2)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-03-27T06:05:00.000Z", reviewedAt: "2026-03-28T06:05:00.000Z",
  },
  {
    id: "prd-008", name: "Papaya", description: "Whole papaya, approximately 1 kg each.", categoryId: "cat-fruits", sellerId: "sel-003",
    images: [img("papaya-studio.jpg", "Whole papaya on a white background")],
    variants: [v("var-008-1", "1 piece", "KFG-PAP-1", 65, 30)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-03-27T06:10:00.000Z", reviewedAt: "2026-03-28T06:10:00.000Z",
  },
  {
    id: "prd-009", name: "Red Onions", description: "Red onions, sold by weight.", categoryId: "cat-vegetables", sellerId: "sel-004",
    images: [img("red-onions-studio.jpg", "Red onions on a white background")],
    variants: [v("var-009-1", "1 kg", "HHC-ONI-1000", 45, 200)],
    approvalStatus: "approved", listingStatus: "unlisted", moderationNote: "Unlisted while the seller is suspended (demo record)",
    certification: "not_submitted", submittedAt: "2026-04-19T06:00:00.000Z", reviewedAt: "2026-04-20T06:00:00.000Z",
  },
  {
    id: "prd-010", name: "Green Chillies", description: "Green chillies.", categoryId: "cat-vegetables", sellerId: "sel-001",
    images: [img("green-chillies-studio.jpg", "Green chillies on a white background")],
    variants: [v("var-010-1", "250 g", "GVF-CHI-250", 20, 150)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-02-15T06:20:00.000Z", reviewedAt: "2026-02-16T06:20:00.000Z",
  },
  {
    id: "prd-011", name: "Cherry Tomatoes", description: "Cherry tomatoes in a punnet.", categoryId: "cat-exotic", sellerId: "sel-003",
    images: [img("tomatoes-studio.jpg", "Tomatoes on a white background (seller-supplied placeholder)")],
    variants: [v("var-011-1", "250 g", "KFG-CTM-250", 90, 40)],
    approvalStatus: "pending", listingStatus: "unlisted", certification: "not_submitted", submittedAt: "2026-10-25T08:00:00.000Z",
  },
  {
    id: "prd-012", name: "Baby Spinach", description: "Young spinach leaves.", categoryId: "cat-leafy-greens", sellerId: "sel-002",
    images: [img("spinach-studio.jpg", "Spinach leaves on a white background")],
    variants: [v("var-012-1", "200 g", "SOC-BSP-200", 45, 50)],
    approvalStatus: "pending", listingStatus: "unlisted", certification: "submitted_not_reviewed", certificationDocument: "sunrise-organic-cert.pdf",
    submittedAt: "2026-10-26T07:30:00.000Z",
  },
  {
    id: "prd-013", name: "Totapuri Mangoes", description: "Totapuri variety mangoes, sold by weight.", categoryId: "cat-fruits", sellerId: "sel-001",
    images: [img("banganapalli-mangoes-studio.jpg", "Mangoes on a white background (seller-supplied placeholder)")],
    variants: [v("var-013-1", "1 kg", "GVF-TOT-1000", 140, 60)],
    approvalStatus: "pending", listingStatus: "unlisted", certification: "not_submitted", submittedAt: "2026-10-27T05:45:00.000Z",
  },
  {
    id: "prd-014", name: "Tender Okra", description: "Okra, small pods.", categoryId: "cat-vegetables", sellerId: "sel-001",
    images: [img("okra-studio.jpg", "Okra pod on a white background")],
    variants: [v("var-014-1", "500 g", "GVF-OKR-500", 42, 30)],
    approvalStatus: "rejected", rejectionReason: "Listing duplicates an existing product from the same seller (demo record)",
    listingStatus: "unlisted", certification: "not_submitted", submittedAt: "2026-10-02T06:00:00.000Z", reviewedAt: "2026-10-03T09:00:00.000Z",
  },
  {
    id: "prd-015", name: "Pomegranate Pack", description: "Two pomegranates, packed.", categoryId: "cat-exotic", sellerId: "sel-003",
    images: [img("pomegranates-studio.jpg", "Pomegranates on a white background")],
    variants: [v("var-015-1", "2 pieces", "KFG-PMP-2", 140, 25)],
    approvalStatus: "approved", listingStatus: "unlisted", moderationNote: "Unlisted after a weight complaint, pending seller response (demo record)",
    certification: "not_submitted", submittedAt: "2026-06-01T06:00:00.000Z", reviewedAt: "2026-06-02T06:00:00.000Z",
  },
  {
    id: "prd-016", name: "Raw Bananas", description: "Raw (cooking) bananas.", categoryId: "cat-vegetables", sellerId: "sel-003",
    images: [img("robusta-bananas-studio.jpg", "Bananas on a white background")],
    variants: [v("var-016-1", "500 g", "KFG-RBN-500", 35, 0)],
    approvalStatus: "approved", listingStatus: "listed", certification: "not_submitted", submittedAt: "2026-04-02T06:00:00.000Z", reviewedAt: "2026-04-03T06:00:00.000Z",
  },
];

export const productReportsFixture: ProductReport[] = [
  { id: "rpt-001", productId: "prd-015", customerId: "cus-003", reason: "Pack weighed noticeably less than expected.", reportedAt: "2026-10-14T08:30:00.000Z", status: "open" },
  { id: "rpt-002", productId: "prd-001", customerId: "cus-010", reason: "Is this product certified organic? The listing does not say.", reportedAt: "2026-10-22T10:00:00.000Z", status: "open" },
  { id: "rpt-003", productId: "prd-006", customerId: "cus-005", reason: "Bananas arrived overripe.", reportedAt: "2026-09-18T07:20:00.000Z", status: "dismissed", resolutionNote: "Handled as a support ticket instead (demo record)" },
];

/**
 * Low-stock alerts as raised by the (mock) inventory system. The threshold that raises an alert is not
 * defined by the source (docs/NEEDS_CLARIFICATION.md Q-STOCK), so the demo does not compute alerts itself.
 */
export const inventoryAlertsFixture: InventoryAlert[] = [
  { id: "inv-001", productId: "prd-002", variantId: "var-002-2", raisedAt: "2026-10-26T05:00:00.000Z", stockAtAlert: 4, status: "open" },
  { id: "inv-002", productId: "prd-004", variantId: "var-004-1", raisedAt: "2026-10-27T05:00:00.000Z", stockAtAlert: 3, status: "open" },
  { id: "inv-003", productId: "prd-007", variantId: "var-007-2", raisedAt: "2026-10-25T05:00:00.000Z", stockAtAlert: 2, status: "open" },
  { id: "inv-004", productId: "prd-016", variantId: "var-016-1", raisedAt: "2026-10-23T05:00:00.000Z", stockAtAlert: 0, status: "open" },
  { id: "inv-005", productId: "prd-010", variantId: "var-010-1", raisedAt: "2026-09-12T05:00:00.000Z", stockAtAlert: 5, status: "acknowledged" },
];
