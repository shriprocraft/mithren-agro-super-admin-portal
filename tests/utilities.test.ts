import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { designTokens } from "@/config/design-tokens";
import { escapeCsvField, toCsv } from "@/lib/csv";
import { inRange, presetRange, scheduleState, validateRange } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { matchesSearch, paginate, sortRows } from "@/lib/table";
import { safeNextPath, validateLogin } from "@/lib/auth/session";
import { dashboardMetrics } from "@/lib/mock/selectors";
import { createInitialDb } from "@/lib/mock/initial-db";

describe("CSV", () => {
  it("escapes commas, quotes and line breaks per RFC 4180", () => {
    expect(escapeCsvField("plain")).toBe("plain");
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(-12.5)).toBe("-12.5");
  });
  it("neutralises spreadsheet formula injection", () => {
    expect(escapeCsvField("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvField("@cmd")).toBe("'@cmd");
  });
  it("builds a header row and CRLF-separated rows", () => {
    expect(toCsv([{ a: 1, b: "x,y" }], [{ header: "A", value: (r) => r.a }, { header: "B", value: (r) => r.b }])).toBe('A,B\r\n1,"x,y"');
  });
});

describe("formatting and privacy", () => {
  it("formats paise as INR", () => {
    expect(formatINR(4000)).toBe("₹40");
    expect(formatINR(4050)).toBe("₹40.50");
    expect(formatINR(1234500)).toBe("₹12,345");
  });
  it("masks contact details", () => {
    expect(maskEmail("ananya.iyer@example.com")).toBe("an•••••••••@example.com");
    expect(maskPhone("+91 90000 10001")).toBe("+91 ••••• •0001");
  });
});

describe("dates", () => {
  it("measures presets back from the fixed demo reference date", () => {
    expect(presetRange("7d")).toEqual({ from: "2026-10-22", to: "2026-10-28" });
    expect(presetRange("all").from).toBe("2026-08-01");
  });
  it("uses IST calendar days for ranges", () => {
    // 20:00 UTC on 31 Oct is 01:30 IST on 1 Nov.
    expect(inRange("2026-10-31T20:00:00.000Z", { from: "2026-11-01", to: "2026-11-01" })).toBe(true);
  });
  it("rejects reversed or incomplete ranges", () => {
    expect(validateRange({ from: "2026-10-10", to: "2026-10-01" })).toMatch(/on or before/);
    expect(validateRange({ from: "", to: "2026-10-01" })).toMatch(/both/);
    expect(validateRange({ from: "2026-10-01", to: "2026-10-01" })).toBeNull();
  });
  it("derives schedule state by date only", () => {
    expect(scheduleState("2026-11-01", "2026-11-30")).toBe("scheduled");
    expect(scheduleState("2026-10-01", "2026-10-31")).toBe("running");
    expect(scheduleState("2026-04-01", "2026-07-31")).toBe("ended");
  });
});

describe("table helpers", () => {
  it("sorts numbers numerically, strings naturally, and keeps empty values last", () => {
    const rows = [{ v: 10 }, { v: 2 }, { v: null }, { v: 33 }];
    expect(sortRows(rows, (r) => r.v, "asc").map((r) => r.v)).toEqual([2, 10, 33, null]);
    expect(sortRows(rows, (r) => r.v, "desc").map((r) => r.v)).toEqual([33, 10, 2, null]);
    expect(sortRows([{ s: "ORD-10" }, { s: "ORD-9" }], (r) => r.s, "asc").map((r) => r.s)).toEqual(["ORD-9", "ORD-10"]);
  });
  it("clamps pages and reports totals", () => {
    const p = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(p).toMatchObject({ page: 3, pageCount: 3, total: 5, items: [5] });
    expect(paginate([], 1, 10)).toMatchObject({ page: 1, pageCount: 1, total: 0 });
  });
  it("matches every search term case-insensitively", () => {
    expect(matchesSearch("green farms", ["Green Valley Farms"])).toBe(true);
    expect(matchesSearch("green kaveri", ["Green Valley Farms"])).toBe(false);
    expect(matchesSearch("  ", ["anything"])).toBe(true);
  });
});

describe("mock authentication helpers", () => {
  it("validates required fields and email format", () => {
    expect(validateLogin("", "")).toEqual({ email: "Enter your email address.", password: "Enter your password." });
    expect(validateLogin("bad", "x").email).toMatch(/valid email/);
    expect(validateLogin("a@b.co", "x")).toEqual({});
  });
  it("only accepts same-app admin paths as a post-login redirect", () => {
    expect(safeNextPath("/admin/orders?order=ORD-10001")).toBe("/admin/orders?order=ORD-10001");
    expect(safeNextPath("https://evil.example")).toBe("/admin");
    expect(safeNextPath("//evil.example")).toBe("/admin");
    expect(safeNextPath("/admin/login")).toBe("/admin");
    expect(safeNextPath(null)).toBe("/admin");
  });
});

describe("dashboard metrics do not invent formulas", () => {
  it("returns needs-clarification for GMV, net sales and platform commission", () => {
    const m = dashboardMetrics(createInitialDb(), presetRange("all"));
    expect(m.gmv.status).toBe("needs_clarification");
    expect(m.netSales.status).toBe("needs_clarification");
    expect(m.platformCommission.status).toBe("needs_clarification");
    expect(m.totalOrders).toEqual({ status: "value", value: 42 });
    expect(m.pendingSellerApprovals).toBe(3);
    expect(m.pendingProductApprovals).toBe(3);
    expect(m.lowStockAlerts).toBe(4);
  });
  it("filters order counts by the date range", () => {
    const db = createInitialDb();
    const week = dashboardMetrics(db, presetRange("7d")).totalOrders;
    const all = dashboardMetrics(db, presetRange("all")).totalOrders;
    expect(week.status === "value" && all.status === "value" && week.value < all.value).toBe(true);
  });
});

describe("brand design tokens", () => {
  const css = readFileSync(path.resolve("src/app/globals.css"), "utf8").toLowerCase();

  it("keeps the storefront's Modern Sage brand colours", () => {
    expect(designTokens.colors.primary).toBe("#2E7D32");
    expect(designTokens.colors.primaryHover).toBe("#1B5E20");
    expect(designTokens.colors.textPrimary).toBe("#1F2D21");
  });

  it("mirrors every token in globals.css", () => {
    const pairs: [string, string][] = [
      ["--primary", designTokens.colors.primary], ["--primary-hover", designTokens.colors.primaryHover], ["--primary-active", designTokens.colors.primaryActive],
      ["--soft", designTokens.colors.softBackground], ["--secondary", designTokens.colors.secondary], ["--border", designTokens.colors.border],
      ["--input", designTokens.colors.inputBorder], ["--foreground", designTokens.colors.textPrimary], ["--muted-foreground", designTokens.colors.textMuted],
      ["--warning", designTokens.colors.warning], ["--destructive", designTokens.colors.error], ["--info", designTokens.colors.info],
    ];
    for (const [variable, hex] of pairs) expect(css, variable).toContain(`${variable}: ${hex.toLowerCase()};`);
  });

  it("uses no raw hex colours or Tailwind palette colours in components", () => {
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((f) => { const p = path.join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".tsx")) files.push(p); });
    walk(path.resolve("src/components"));
    for (const file of files) {
      // Comments may cite token values; only code is checked.
      const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      // Also catches URL-encoded hex (%23…) inside inline SVG data URLs.
      expect(text, file).not.toMatch(/(?:#|%23)[0-9a-fA-F]{6}\b/);
      expect(text, file).not.toMatch(/\b(?:bg|text|border|ring)-(?:green|emerald|lime|red|amber|blue|gray|slate|zinc)-\d{2,3}\b/);
    }
  });
});
