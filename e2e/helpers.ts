import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = "superadmin@mithrenagro.example";
export const DEMO_PASSWORD = "DemoAdmin#2026";

export const ROUTES: [string, string][] = [
  ["/admin", "Marketplace overview"],
  ["/admin/customers", "Customers"],
  ["/admin/sellers", "Sellers"],
  ["/admin/sellers/approvals", "Seller approvals"],
  ["/admin/products", "Products"],
  ["/admin/products/approvals", "Product approvals"],
  ["/admin/categories", "Categories"],
  ["/admin/orders", "Orders"],
  ["/admin/payments", "Payments"],
  ["/admin/refunds", "Refunds"],
  ["/admin/commissions", "Commissions"],
  ["/admin/settlements", "Seller settlements"],
  ["/admin/delivery", "Delivery"],
  ["/admin/coupons", "Promotions"],
  ["/admin/reviews", "Reviews"],
  ["/admin/support", "Support"],
  ["/admin/content", "Content"],
  ["/admin/reports", "Reports"],
  ["/admin/staff", "Staff & permissions"],
  ["/admin/audit-logs", "Audit logs"],
  ["/admin/settings", "Settings"],
];

export async function login(page: Page, next = "/admin") {
  await page.goto(next === "/admin" ? "/admin/login" : `/admin/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/^Email address/).fill(DEMO_EMAIL);
  await page.getByLabel(/^Password/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(next);
  // The panel has rendered (a deep-linked detail drawer may be open over the page heading).
  await expect(page.locator("#main")).toBeAttached();
}

/** Horizontal overflow of the document in CSS pixels (0 = none). */
export const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
