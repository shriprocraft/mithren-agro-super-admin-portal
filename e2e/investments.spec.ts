import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { login, overflow } from "./helpers";

const INV_ROUTES = ["/admin/investments", "/admin/investments/investors", "/admin/investments/applications", "/admin/investments/plans", "/admin/investments/sectors", "/admin/investments/projects", "/admin/investments/participations", "/admin/investments/transactions", "/admin/investments/allocations", "/admin/investments/payouts", "/admin/investments/reports", "/admin/investments/documents", "/admin/investments/audit", "/admin/investments/settings", "/admin/investments/investors/inv-003", "/admin/investments/projects/prj-crop-01", "/admin/investments/sectors/sec-dairy"];

const toast = (page: Page, text: RegExp | string) => page.getByRole("status").filter({ hasText: text }).first();

test.describe("investment management", () => {
  test("six sectors with two projects each, and the five standard plans without a custom plan", async ({ page }) => {
    await login(page, "/admin/investments/sectors");
    for (const name of ["Crop Production", "Dairy Farming", "Fish Farming", "Poultry Farming", "Biogas & Composting", "Agri Forestry"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await page.goto("/admin/investments/projects");
    await expect(page.getByText("Showing 1–10 of 12")).toBeVisible();
    await page.goto("/admin/investments/plans");
    for (const amount of ["₹1,000", "₹10,000", "₹25,000", "₹50,000", "₹1,00,000"]) await expect(page.getByRole("cell", { name: amount, exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Contribution plans" })).not.toContainText(/custom/i);
    await expect(page.getByRole("table", { name: "Contribution plans" }).getByRole("row")).toHaveCount(6);
  });

  test("investor search and pagination", async ({ page }) => {
    await login(page, "/admin/investments/investors");
    await expect(page.getByText("Showing 1–10 of 17")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("Showing 11–17 of 17")).toBeVisible();
    await page.getByLabel("Search investors").fill("Leela");
    await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();
    await page.getByRole("link", { name: "Leela Thomas", exact: true }).click();
    await expect(page).toHaveURL("/admin/investments/investors/inv-012");
    await expect(page.getByText("Account suspended")).toBeVisible();
  });

  test("application approval updates the queue, investor record, overview and audit trail; rejection requires a reason", async ({ page }) => {
    await login(page, "/admin/investments/applications");
    await page.getByRole("button", { name: "Review app-014" }).click();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByRole("button", { name: "Approve application" }).click();
    await expect(toast(page, "Investor application approved.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Review app-014" })).toHaveCount(0);

    await page.getByRole("button", { name: "Review app-013" }).click();
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByRole("button", { name: "Reject application" }).click();
    await expect(page.getByText("Rejection reason is required.")).toBeVisible();
    await page.getByLabel(/Rejection reason/).fill("Incomplete details (e2e)");
    await page.getByRole("button", { name: "Reject application" }).click();
    await expect(toast(page, "Investor application rejected.")).toBeVisible();

    await page.goto("/admin/investments/investors/inv-014");
    await expect(page.getByText("Approved (manual review)").first()).toBeVisible();
    await page.goto("/admin/investments/audit");
    await expect(page.getByText("inv.application.approve").first()).toBeVisible();
    await expect(page.getByText("Incomplete details (e2e)")).toBeVisible();
  });

  test("contribution verification moves money from unconfirmed to verified", async ({ page }) => {
    await login(page, "/admin/investments/transactions");
    const verified = page.getByText("Verified contributions (filtered)").locator("..");
    await expect(verified).toContainText("₹1,80,000");
    await page.getByRole("button", { name: "Review txn-002" }).click();
    await page.getByRole("button", { name: "Mark verified" }).click();
    await page.getByRole("button", { name: "Mark verified (simulated)" }).click();
    await expect(toast(page, /Contribution marked as verified/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(verified).toContainText("₹1,81,000");
    // A second verification is not offered.
    await page.getByRole("button", { name: "View txn-002" }).click();
    await expect(page.getByRole("button", { name: "Mark verified" })).toHaveCount(0);
  });

  test("project creation validates required fields", async ({ page }) => {
    await login(page, "/admin/investments/projects");
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText("Select an agricultural sector.")).toBeVisible();
    await expect(page.getByText("Enter the project name.")).toBeVisible();
    await page.getByLabel(/Agricultural sector/).selectOption("sec-crop");
    await page.getByLabel(/Project name/).fill("Millet Trials (e2e)");
    await page.getByLabel(/Description/).fill("Sample");
    await page.getByLabel(/Location/).fill("Sample district");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(toast(page, /created in planning status/)).toBeVisible();
    await expect(page.getByText("13 projects")).toBeVisible();
  });

  test("inactive projects are not offered for new allocations and the illustrative projects cannot be deleted", async ({ page }) => {
    await login(page, "/admin/investments/allocations?participation=par-002");
    const options = await page.getByLabel(/^Project/).last().locator("option").allTextContents();
    expect(options.some((o) => o.includes("Fruit Orchard Development"))).toBe(false); // planning
    expect(options.some((o) => o.includes("Milk Collection and Processing"))).toBe(false); // on hold
    await page.goto("/admin/investments/projects/prj-crop-01");
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /cannot be deleted/ })).toBeVisible();
  });

  test("CSV export contains exactly the filtered rows", async ({ page }) => {
    await login(page, "/admin/investments/investors");
    await page.getByLabel("Search investors").fill("Chennai");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const file = await (await download).path();
    const csv = (await readFile(file, "utf8")).replace(/^﻿/, "");
    const lines = csv.trim().split(/\r\n/);
    expect(lines[0]).toContain("Investor ID");
    expect(lines.slice(1).every((l) => l.includes("Chennai"))).toBe(true);
    expect(lines).toHaveLength(3);
    expect(csv).not.toContain("@example.com");
    await expect(toast(page, "Report exported successfully")).toBeVisible();
  });

  test("the Admin permission preview blocks restricted actions", async ({ page }) => {
    await login(page, "/admin/investments/settings");
    await page.getByRole("switch", { name: /Preview investment screens/ }).click();
    await page.goto("/admin/investments/applications");
    await page.getByRole("button", { name: "Review app-016" }).click();
    await expect(page.getByText("Reviewing applications is not permitted for your role.")).toBeVisible();
    await page.goto("/admin/investments/payouts");
    await expect(page.getByText("Approving payouts is not permitted for your role.").first()).toBeVisible();
    await page.goto("/admin/investments/settings");
    await page.getByRole("switch", { name: /Preview investment screens/ }).click();
  });

  test("investment routes have no errors and no horizontal overflow at phone and desktop widths", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await login(page);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of INV_ROUTES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await overflow(page), `${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    }
    expect(errors).toEqual([]);
  });
});
