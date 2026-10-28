/**
 * DEMO-ONLY credentials for the mock Super Admin sign-in.
 *
 * These values are bundled into browser JavaScript and are visible to anyone who opens the app.
 * They are NOT secrets and provide no security. Real authentication (server-verified sessions,
 * hashed credentials, MFA) is outside this frontend-only phase. See README.md → "Demo login".
 */
export const demoAdminAccount = {
  email: "superadmin@mithrenagro.example",
  password: "DemoAdmin#2026",
  staffId: "stf-001",
  name: "Demo Super Admin",
} as const;
