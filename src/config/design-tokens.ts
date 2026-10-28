// Mithren Agro "Modern Sage" palette, copied value-for-value from the customer storefront
// (mithren-agro-customer/src/config/design-tokens.ts, docs/DESIGN_SYSTEM.md). The storefront is the
// visual source of truth; do not introduce other brand greens. globals.css mirrors these values and
// tests/design-tokens.test.ts fails if the two drift. Contrast ratios are against #FFFFFF.
export const designTokens = {
  colors: {
    // Brand (identical to the storefront)
    primary: "#2E7D32", // primary buttons, links, active navigation (white text 5.13:1)
    primaryHover: "#1B5E20", // primary hover (white text 7.87:1)
    primaryActive: "#154A19", // pressed state
    primaryForeground: "#FFFFFF",
    accentGreen: "#A7D96C", // decorative only, never text
    highlight: "#FFD88A", // decorative fills with dark text
    gold: "#F5A51C", // logo gold; storefront reserves it for "Buy now", so the admin panel does not use it for actions
    // Surfaces
    background: "#FFFFFF",
    softBackground: "#F5FDF7", // admin content canvas and hover surfaces
    secondary: "#F0F9F4", // tinted cards, chips, table header band
    secondaryForeground: "#1B5E20",
    border: "#E8F1EA", // dividers (decorative, 1.15:1)
    inputBorder: "#7A8C7D", // form-control outlines need 3:1 (3.57:1)
    // Text
    textPrimary: "#1F2D21", // headings and important text (14.43:1)
    textMuted: "#667085", // secondary text (4.97:1)
    // Semantic (identical to the storefront)
    success: "#2E7D32",
    warning: "#B54708",
    error: "#B42318",
    info: "#175CD3",
  },
  fonts: { heading: "Poppins", body: "Poppins" },
  radii: { sm: "0.5rem", md: "0.75rem", lg: "1rem", pill: "9999px" },
  shadows: {
    card: "0 1px 2px rgb(31 45 33 / 0.04), 0 4px 16px rgb(31 45 33 / 0.06)",
    overlay: "0 12px 40px rgb(31 45 33 / 0.14)",
  },
} as const;

export type DesignTokens = typeof designTokens;
