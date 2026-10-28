import { defineConfig } from "@playwright/test";

// Uses the locally installed Google Chrome (channel "chrome") so no browser download is needed.
// Start the production server first (npm run build && npm run start), or let webServer do it.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    channel: "chrome",
    trace: "off",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: "http://localhost:3100/admin/login", reuseExistingServer: true, timeout: 120_000 },
});
