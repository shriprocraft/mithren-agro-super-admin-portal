import { expect, test } from "@playwright/test";
import { login, overflow } from "./helpers";

const WIDTHS = [320, 375, 768, 1024, 1280, 1440];
const PAGES = ["/admin", "/admin/orders", "/admin/products", "/admin/payments", "/admin/settlements", "/admin/coupons", "/admin/reports", "/admin/settings"];

for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/admin/login");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await login(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await overflow(page), `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}

test("mobile navigation drawer opens, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await login(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Refunds" }).click();
  await expect(page).toHaveURL("/admin/refunds");
  await expect(drawer).toBeHidden();
});

test("dialogs fit within a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await login(page, "/admin/coupons");
  await page.getByRole("button", { name: "New coupon" }).click();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
});

test("keyboard users can reach the skip link and main content", async ({ page }) => {
  await login(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});
