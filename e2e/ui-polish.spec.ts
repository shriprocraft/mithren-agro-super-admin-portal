import { expect, test, type Page } from "@playwright/test";
import { choose, login, overflow, ROUTES } from "./helpers";

const totalOrders = async (page: Page) =>
  Number(await page.locator(".surface-card", { hasText: "Total orders" }).locator(".text-2xl").innerText());
const dateTrigger = (page: Page) => page.getByRole("combobox", { name: "Date range", exact: true });

test.describe("dashboard date-range selector", () => {
  test("every preset updates the trigger and the date-filtered metrics", async ({ page }) => {
    await login(page);
    await expect(dateTrigger(page)).toContainText("Last 30 days");
    const d30 = await totalOrders(page);
    await choose(page, "Date range", "Last 7 days");
    await expect(dateTrigger(page)).toContainText("Last 7 days");
    const d7 = await totalOrders(page);
    await choose(page, "Date range", "Last 90 days");
    const d90 = await totalOrders(page);
    await choose(page, "Date range", "All demo data");
    const all = await totalOrders(page);
    expect(d7).toBeLessThan(d30);
    expect(d30).toBeLessThanOrEqual(d90);
    expect(all).toBe(42);
    await expect(page.getByText(/current count, not date-filtered/).first()).toBeVisible();
  });

  test("custom range validates, cancels without changes and applies with a success toast", async ({ page }) => {
    await login(page);
    const before = await totalOrders(page);
    await choose(page, "Date range", "Custom range…");
    const popover = page.getByRole("dialog", { name: "Custom date range" });
    await expect(popover).toBeVisible();

    await popover.getByLabel(/^Start date/).fill("");
    await popover.getByRole("button", { name: "Apply range" }).click();
    await expect(popover.getByText("Choose a start date.")).toBeVisible();

    await popover.getByLabel(/^Start date/).fill("2026-10-20");
    await popover.getByLabel(/^End date/).fill("2026-10-01");
    await popover.getByRole("button", { name: "Apply range" }).click();
    await expect(popover.getByText("The end date must be on or after the start date.")).toBeVisible();

    await popover.getByRole("button", { name: "Cancel" }).click();
    await expect(popover).toBeHidden();
    await expect(dateTrigger(page)).toContainText("Last 30 days");
    expect(await totalOrders(page)).toBe(before);

    await choose(page, "Date range", "Custom range…");
    await popover.getByLabel(/^Start date/).fill("2026-10-01");
    await popover.getByLabel(/^End date/).fill("2026-10-15");
    await popover.getByRole("button", { name: "Apply range" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Date range applied: 01 Oct 2026 – 15 Oct 2026" })).toBeVisible();
    await expect(dateTrigger(page)).toContainText("01 Oct – 15 Oct 2026");
    expect(await totalOrders(page)).toBeLessThan(before);

    await page.getByRole("button", { name: "Edit custom date range" }).click();
    await expect(popover.getByLabel(/^Start date/)).toHaveValue("2026-10-01");
  });

  test("works with the keyboard and closes on Escape", async ({ page }) => {
    await login(page);
    await dateTrigger(page).focus();
    await page.keyboard.press("Enter");
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await expect(page.getByRole("option", { name: "Last 30 days" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(listbox).toBeHidden();
    await expect(dateTrigger(page)).toBeFocused();

    await page.keyboard.press("Enter");
    // Radix moves focus to the selected option once the menu has opened.
    await expect(page.getByRole("option", { name: "Last 30 days" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("option", { name: "Last 7 days" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dateTrigger(page)).toContainText("Last 7 days");
  });

  test("the open menu stays inside a 320px viewport and is not clipped", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await login(page);
    await dateTrigger(page).click();
    const box = await page.getByRole("listbox").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.y + box!.height).toBeLessThanOrEqual(640);
    await expect(page.getByRole("option", { name: "Custom range…" })).toBeVisible();
  });
});

test.describe("shell layout", () => {
  test("sidebar shows the logo with the Super Admin badge on its own line below", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page);
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    // The visible logo is the link's frame; the <img> inside is intentionally larger and cropped by it.
    const logo = await sidebar.getByRole("link", { name: "Mithren Agro Super Admin dashboard" }).boundingBox();
    const badge = await sidebar.getByText("Super Admin", { exact: true }).boundingBox();
    expect(logo && badge).toBeTruthy();
    expect(badge!.y).toBeGreaterThanOrEqual(logo!.y + logo!.height - 1);
  });

  test("header shows the breadcrumb above the page title", async ({ page }) => {
    await login(page, "/admin/orders");
    const header = page.getByRole("banner");
    const crumbs = await header.getByRole("navigation", { name: "Breadcrumb" }).boundingBox();
    const title = await header.getByText("Orders", { exact: true }).last().boundingBox();
    expect(crumbs!.y + crumbs!.height).toBeLessThanOrEqual(title!.y + 1);
    await expect(header.getByRole("button", { name: "Log out" })).toBeVisible();
  });

  test("the page scrollbar is hidden but the page still scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await login(page);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth)).toBe("none");
    // Wait until the full dashboard has rendered, so the page is tall enough to scroll.
    await expect(page.getByRole("heading", { name: "Latest orders" })).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeGreaterThan(500);
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.keyboard.press("End");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  });

  test("every route renders without horizontal overflow at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page);
    for (const [path] of ROUTES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await overflow(page), path).toBeLessThanOrEqual(0);
    }
  });
});
