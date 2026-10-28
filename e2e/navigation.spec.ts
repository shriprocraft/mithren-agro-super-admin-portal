import { expect, test } from "@playwright/test";
import { login, ROUTES } from "./helpers";

test.describe("routes and navigation", () => {
  test("every required route renders its page and highlights its nav item", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await login(page);
    for (const [path, heading] of ROUTES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      const active = page.getByRole("navigation", { name: "Super Admin" }).locator('[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toHaveAttribute("href", path);
    }
    expect(errors).toEqual([]);
  });

  test("sidebar links navigate between related pages", async ({ page }) => {
    await login(page);
    const nav = page.getByRole("navigation", { name: "Super Admin" });
    await nav.getByRole("link", { name: /^Seller approvals/ }).click();
    await expect(page).toHaveURL("/admin/sellers/approvals");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Sellers");
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Sellers" }).click();
    await expect(page).toHaveURL("/admin/sellers");
    await page.getByRole("link", { name: /Applications \(3 pending\)/ }).click();
    await expect(page).toHaveURL("/admin/sellers/approvals");
  });

  test("dashboard cards link to management pages", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /Review products/ }).click();
    await expect(page).toHaveURL("/admin/products/approvals");
    await page.goBack();
    await page.getByRole("link", { name: /View alerts/ }).first().click();
    await expect(page).toHaveURL("/admin/products?view=low-stock");
    await expect(page.getByRole("tab", { name: /Low-stock alerts/ })).toHaveAttribute("aria-selected", "true");
  });

  test("refresh on a deep route keeps the page", async ({ page }) => {
    await login(page);
    await page.goto("/admin/settlements");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Seller settlements" })).toBeVisible();
  });

  test("unknown routes show the not-found page", async ({ page }) => {
    await login(page);
    await page.goto("/admin/does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Go to the dashboard" }).click();
    await expect(page).toHaveURL("/admin");
  });

  test("root redirects to the admin panel", async ({ page }) => {
    await login(page);
    await page.goto("/");
    await expect(page).toHaveURL("/admin");
  });
});
