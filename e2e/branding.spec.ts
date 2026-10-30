import { expect, test, type Page } from "@playwright/test";
import { login, overflow } from "./helpers";

const credit = (page: Page) => page.getByRole("link", { name: /^Powered by Shri Pro Craft/ });

/** The credit link's centre, the viewport centre, and the element actually painted at the link's centre. */
async function creditGeometry(page: Page) {
  const link = credit(page);
  await link.scrollIntoViewIfNeeded();
  return link.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { center: cx, viewport: document.documentElement.clientWidth / 2, onTop: Boolean(hit && el.contains(hit)), text: el.textContent?.replace(/\s+/g, " ").trim() };
  });
}

test.describe("branding", () => {
  test("footer credit is a safe external link with the exact visible text", async ({ page }) => {
    await login(page);
    const link = credit(page);
    await expect(link).toHaveAttribute("href", "https://shriprocraft.com/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const visible = await link.evaluate((el) => (el as HTMLElement).innerText.replace(/\s+/g, " ").trim());
    expect(visible).toBe("Powered by Shri Pro Craft");
    // The copyright row is a separate row above the credit.
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Mithren Agro Pvt. Ltd.");
    const copyright = await footer.getByText(/All rights reserved/).boundingBox();
    const creditBox = await link.boundingBox();
    expect(creditBox!.y).toBeGreaterThanOrEqual(copyright!.y + copyright!.height);
    // Keyboard reachable with a visible focus ring (arrive by keyboard so :focus-visible applies).
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    expect(await link.evaluate((el) => el.matches(":focus-visible") && getComputedStyle(el).boxShadow !== "none")).toBe(true);
  });

  for (const [label, width] of [["desktop", 1440], ["tablet", 820], ["mobile", 390]] as const) {
    test(`credit is centred across the full viewport and never covered (${label})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/admin", "/admin/investments/projects"]) {
        await login(page, path);
        // Pages grow while charts render, so re-measure until the credit is in place and on top.
        await expect.poll(async () => (await creditGeometry(page)).onTop, { message: `${path} credit is visible, not under the sidebar` }).toBe(true);
        const g = await creditGeometry(page);
        expect(Math.abs(g.center - g.viewport), `${path} centre offset`).toBeLessThanOrEqual(2);
        expect(await overflow(page)).toBeLessThanOrEqual(0);
        await page.evaluate(() => window.localStorage.removeItem("mithren-admin-demo-session"));
      }
      await page.goto("/admin/login");
      const g = await creditGeometry(page);
      expect(Math.abs(g.center - g.viewport)).toBeLessThanOrEqual(2);
      expect(g.onTop).toBe(true);
    });
  }

  test("headings render in Playfair Display and interface text in Montserrat", async ({ page }) => {
    await login(page, "/admin/orders");
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => {
      const family = (el: Element | null) => (el ? getComputedStyle(el).fontFamily : "");
      return {
        h1: family(document.querySelector("main h1")),
        cardTitle: family(document.querySelector("main h2")),
        nav: family(document.querySelector('nav[aria-label="Super Admin"] a')),
        table: family(document.querySelector("main td")),
        button: family(document.querySelector("main button")),
        input: family(document.querySelector("main input")),
        footer: family(document.querySelector("footer p")),
        playfairLoaded: [...document.fonts].some((f) => /Playfair/i.test(f.family) && f.status === "loaded"),
        montserratLoaded: [...document.fonts].some((f) => /Montserrat/i.test(f.family) && f.status === "loaded"),
      };
    });
    expect(fonts.h1).toMatch(/Playfair/);
    for (const key of ["nav", "table", "button", "input", "footer"] as const) expect(fonts[key], key).toMatch(/Montserrat/);
    expect(fonts.playfairLoaded).toBe(true);
    expect(fonts.montserratLoaded).toBe(true);
  });

  test("finalized logo and favicon are served from the supplied directory", async ({ page }) => {
    await page.goto("/admin/login");
    const logo = page.getByRole("img", { name: "Mithren Agro Pvt. Ltd." }).first();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => decodeURIComponent(img.currentSrc))).toContain("Mithren_Agro_Logos/Mithren_Agro_Pvt_Ltd_PNG.png");
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const icon = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(icon).toContain("/Mithren_Agro_Logos/Mithren_square.png");
    expect((await page.request.get(icon!)).status()).toBe(200);
  });
});
