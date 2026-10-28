import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

const table = (page: Page, caption: string) => page.locator("table", { has: page.locator(`caption:text-is("${caption}")`) });

test.describe("tables: search, filters, sorting, pagination", () => {
  test("orders search, filter, sort and paginate the records", async ({ page }) => {
    await login(page, "/admin/orders");
    const orders = table(page, "Orders");
    await expect(page.getByText(/Showing 1–10 of 42/)).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText(/Showing 11–20 of 42/)).toBeVisible();

    // Filtering returns the table to page 1.
    await page.getByLabel("Order status").selectOption("cancelled");
    await expect(page.getByText(/Showing 1–2 of 2/)).toBeVisible();
    await expect(orders.locator("tbody tr")).toHaveCount(2);
    await page.getByRole("button", { name: "Clear filters" }).click();

    await page.getByLabel("Search orders").fill("ORD-10028");
    await expect(orders.locator("tbody tr")).toHaveCount(1);
    await page.getByLabel("Search orders").fill("zzz-no-match");
    await expect(page.getByText("No records match")).toBeVisible();
    await page.getByLabel("Search orders").fill("");

    // Sort by total ascending, then descending.
    const totalHeader = orders.getByRole("button", { name: /^Total/ });
    await totalHeader.click();
    await expect(orders.locator("th", { hasText: "Total" })).toHaveAttribute("aria-sort", "ascending");
    const values = async () => (await orders.locator("tbody tr td:nth-child(5)").allInnerTexts()).map((t) => Number(t.replace(/[^\d.]/g, "")));
    const asc = await values();
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    await totalHeader.click();
    const desc = await values();
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  test("order details show sub-orders, payments and audit trail", async ({ page }) => {
    await login(page, "/admin/orders?order=ORD-10006");
    const panel = page.getByRole("dialog");
    await expect(panel.getByText("Vendor sub-orders")).toBeVisible();
    await expect(panel.getByText(/Cancelled by customer/)).toBeVisible();
    await expect(panel.getByText(/Processed \(demo\)/).first()).toBeVisible();
    await expect(panel.getByText("Order timeline")).toBeVisible();
  });
});

test.describe("approval workflows and audit history", () => {
  test("approving a seller updates the queue, the badge and the audit log", async ({ page }) => {
    await login(page, "/admin/sellers/approvals");
    const queue = table(page, "Seller applications");
    await expect(queue.locator("tbody tr")).toHaveCount(3);
    await page.getByRole("button", { name: "Review Riverbend Organics" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Approve", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: /Approve Riverbend Organics/ });
    await expect(confirm.getByText(/Document review incomplete/)).toBeVisible();
    await confirm.getByRole("button", { name: "Approve seller" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Riverbend Organics: approved (demo)" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(queue.locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("link", { name: /^Seller approvals/ })).toContainText("2");

    await page.goto("/admin/audit-logs");
    await expect(page.getByText("Approved seller Riverbend Organics")).toBeVisible();
  });

  test("rejecting requires a reason and records it", async ({ page }) => {
    await login(page, "/admin/sellers/approvals");
    await page.getByRole("button", { name: "Review Meadow Root Farms" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: /Reject Meadow Root Farms/ });
    await confirm.getByRole("button", { name: "Reject application" }).click();
    await expect(confirm.getByText("Rejection reason is required.")).toBeVisible();
    await confirm.getByLabel(/^Rejection reason/).fill("Bank proof name mismatch");
    await confirm.getByRole("button", { name: "Reject application" }).click();
    await expect(page.getByRole("dialog").getByText("Bank proof name mismatch").first()).toBeVisible();
  });

  test("approving a product lists it and removes it from the queue", async ({ page }) => {
    await login(page, "/admin/products/approvals");
    await page.getByRole("button", { name: "Review Cherry Tomatoes" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByRole("dialog", { name: /Approve “Cherry Tomatoes”/ }).getByRole("button", { name: "Approve and list" }).click();
    await page.keyboard.press("Escape");
    await expect(table(page, "Product approval queue").locator("tbody tr")).toHaveCount(2);
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill("Cherry");
    await expect(table(page, "Product catalogue").getByText("Listed")).toBeVisible();
  });

  test("category deactivation shows the linked-product impact first", async ({ page }) => {
    await login(page, "/admin/categories");
    await page.getByRole("button", { name: "Deactivate Fruits" }).click();
    const confirm = page.getByRole("dialog", { name: /Deactivate “Fruits”/ });
    await expect(confirm.getByText(/product\(s\) are linked to this category/)).toBeVisible();
    await confirm.getByRole("button", { name: "Deactivate category" }).click();
    await expect(page.getByRole("button", { name: "Reactivate Fruits" })).toBeVisible();
  });
});

test.describe("financial consistency", () => {
  test("processing a refund updates the refund, the order and the audit log", async ({ page }) => {
    await login(page, "/admin/refunds");
    await page.getByLabel("Status").selectOption("requested");
    const rows = table(page, "Refunds").locator("tbody tr");
    await expect(rows).toHaveCount(2);
    const orderId = (await rows.first().locator("td:nth-child(2) a").innerText()).trim();
    await rows.first().getByRole("button", { name: /Process \(demo\)/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Process/ }).click();
    await expect(page.getByRole("status").filter({ hasText: /processed as a demo outcome \(DEMO-RF-/ })).toBeVisible();
    await expect(rows).toHaveCount(1);

    await page.goto(`/admin/orders?order=${orderId}`);
    await expect(page.getByRole("dialog").getByText(/Partially refunded|Refunded/).first()).toBeVisible();
    await page.goto("/admin/audit-logs");
    await expect(page.getByText(new RegExp(`Processed refund RF-\\d+ for ${orderId} \\(demo\\)`))).toBeVisible();
  });

  test("adding commission configuration does not change historical records", async ({ page }) => {
    await login(page, "/admin/commissions");
    const records = table(page, "Commission calculation records");
    const before = await records.locator("tbody").innerText();
    await page.getByRole("button", { name: "Add configuration entry" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Add entry" }).click();
    await expect(dialog.getByText("Choose a category.")).toBeVisible();
    await dialog.getByLabel(/^Category/).selectOption({ label: "Fruits" });
    await dialog.getByLabel(/^Rate/).fill("150");
    await dialog.getByLabel(/^Effective from/).fill("2026-11-01");
    await dialog.getByRole("button", { name: "Add entry" }).click();
    await expect(dialog.getByText(/between 0 and 100/)).toBeVisible();
    await dialog.getByLabel(/^Rate/).fill("8");
    await dialog.getByRole("button", { name: "Add entry" }).click();
    await expect(table(page, "Commission configuration").locator("tbody tr")).toHaveCount(4);
    expect(await records.locator("tbody").innerText()).toBe(before);
  });

  test("settlements show payout amount as needing clarification, never an invented figure", async ({ page }) => {
    await login(page, "/admin/settlements");
    await expect(table(page, "Settlement batches").getByText("Needs clarification").first()).toBeVisible();
    await expect(page.getByText(/settlement batch\(es\) failed/)).toBeVisible();
  });
});

test.describe("forms, persistence and export", () => {
  test("coupon form validates dates and limits, then saves", async ({ page }) => {
    await login(page, "/admin/coupons");
    await page.getByRole("button", { name: "New coupon" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Code/).fill("AB");
    await dialog.getByLabel(/^Discount \(%\)/).fill("120");
    await dialog.getByLabel(/^Usage limit/).fill("0");
    await dialog.getByLabel(/^Starts/).fill("2026-12-10");
    await dialog.getByLabel(/^Ends/).fill("2026-12-01");
    await dialog.getByRole("button", { name: "Create coupon" }).click();
    await expect(dialog.getByText(/4–20 letters/)).toBeVisible();
    await expect(dialog.getByText(/cannot exceed 100/)).toBeVisible();
    await expect(dialog.getByText(/at least 1/)).toBeVisible();
    await expect(dialog.getByText(/end date must be on or after/)).toBeVisible();
    await dialog.getByLabel(/^Code/).fill("winter25");
    await dialog.getByLabel(/^Discount \(%\)/).fill("25");
    await dialog.getByLabel(/^Usage limit/).fill("100");
    await dialog.getByLabel(/^Ends/).fill("2026-12-31");
    await dialog.getByRole("button", { name: "Create coupon" }).click();
    await expect(table(page, "Coupons").getByText("WINTER25", { exact: true })).toBeVisible();
  });

  test("demo changes persist across reloads and reset restores the original data", async ({ page }) => {
    await login(page, "/admin/support?ticket=TKT-1002");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Reply/).fill("We are processing your refund.");
    await dialog.getByRole("button", { name: "Add reply (demo)" }).click();
    await expect(page.getByRole("status").filter({ hasText: /No email, SMS or notification was sent/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("dialog").getByText("We are processing your refund.")).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset demo data" }).click();
    await page.goto("/admin/support?ticket=TKT-1002");
    await expect(page.getByRole("dialog").getByText("We are processing your refund.")).toHaveCount(0);
  });

  test("CSV export downloads the filtered report with escaped values", async ({ page }) => {
    await login(page, "/admin/reports");
    await page.getByLabel("Report", { exact: true }).selectOption("refunds");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^mithren-admin-refunds-report_2026-08-01_to_2026-10-28_demo\.csv$/);
    const text = readFileSync((await file.path())!, "utf8").replace(/^﻿/, "");
    const lines = text.split("\r\n");
    expect(lines[0]).toBe("Refund,Order,Sub-order,Amount (INR),Reason,Status,Demo reference,Requested (UTC)");
    expect(lines.length).toBeGreaterThan(1);
    expect(text).not.toContain("@example.com");

    await page.getByLabel("Report", { exact: true }).selectOption("taxes");
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });
});
