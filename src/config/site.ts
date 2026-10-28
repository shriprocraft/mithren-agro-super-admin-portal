export const siteConfig = {
  name: "Mithren Agro",
  legalName: "Mithren Agro Pvt. Ltd.",
  productName: "Mithren Agro Super Admin",
  locale: "en-IN",
  // Source-defined defaults (scope §4.15).
  currency: "INR",
  timezone: "Asia/Kolkata",
  /**
   * The mock dataset is fixed in time so dashboard ranges stay meaningful whenever the demo is opened.
   * Relative ranges ("last 30 days") are measured back from this date, not from the device clock.
   */
  demoReferenceDate: "2026-10-28",
} as const;
