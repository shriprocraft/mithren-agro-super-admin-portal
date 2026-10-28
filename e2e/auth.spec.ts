import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD, login } from "./helpers";

test.describe("mock authentication", () => {
  test("shows required-field errors for an empty form", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("validates the email format", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/^Email address/).fill("not-an-email");
    await page.getByLabel(/^Password/).fill("x");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Enter a valid email address/)).toBeVisible();
    await expect(page.getByLabel(/^Email address/)).toHaveAttribute("aria-invalid", "true");
  });

  test("requires a password when the email is valid", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/^Email address/).fill(DEMO_EMAIL);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter your password.")).toBeVisible();
  });

  test("rejects invalid demo credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/^Email address/).fill(DEMO_EMAIL);
    await page.getByLabel(/^Password/).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in failed" })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("toggles password visibility", async ({ page }) => {
    await page.goto("/admin/login");
    const password = page.getByLabel(/^Password/);
    await password.fill(DEMO_PASSWORD);
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
  });

  test("forgot password is simulated and sends nothing", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Email address/).fill("bad");
    await dialog.getByRole("button", { name: "Simulate reset request" }).click();
    await expect(dialog.getByText(/valid email/)).toBeVisible();
    await dialog.getByLabel(/^Email address/).fill(DEMO_EMAIL);
    await dialog.getByRole("button", { name: "Simulate reset request" }).click();
    await expect(dialog.getByText("Demo outcome: no email was sent")).toBeVisible();
  });

  test("redirects direct navigation to login and returns after sign-in", async ({ page }) => {
    await page.goto("/admin/refunds");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Frefunds/);
    await page.getByLabel(/^Email address/).fill(DEMO_EMAIL);
    await page.getByLabel(/^Password/).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin/refunds");
  });

  test("ignores external post-login redirects", async ({ page }) => {
    await page.goto("/admin/login?next=https://example.com");
    await page.getByLabel(/^Email address/).fill(DEMO_EMAIL);
    await page.getByLabel(/^Password/).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin");
  });

  test("keeps the session on refresh and logs out", async ({ page }) => {
    await login(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Marketplace overview" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/admin/login");
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("has no public registration route", async ({ page }) => {
    await page.goto("/admin/register");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.goto("/admin/login");
    await expect(page.getByRole("link", { name: /register|sign up/i })).toHaveCount(0);
  });
});
