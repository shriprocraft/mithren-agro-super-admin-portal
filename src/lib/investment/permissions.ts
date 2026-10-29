// Investment permissions. They extend the existing staff roles (Super Admin, Admin) instead of
// adding a competing role system. The source only states that Super Admin has full platform access;
// the Admin role's investment rights are NOT defined, so the matrix grants Admin nothing beyond
// viewing the overview (least privilege) and marks every Admin cell "Needs clarification".
//
// Enforcement happens in the mock actions (src/lib/mock/investment-actions.ts), not only by hiding
// buttons. In this frontend-only demo that is still browser code: it is NOT a security boundary.
import type { DemoDb, StaffRole } from "@/lib/types";

export const INVESTMENT_PERMISSIONS = [
  { id: "inv.dashboard.view", label: "View investment dashboard" },
  { id: "inv.investors.view", label: "View investor records" },
  { id: "inv.investors.edit", label: "Edit investor profiles" },
  { id: "inv.applications.review", label: "Review investor applications" },
  { id: "inv.plans.manage", label: "Manage investment plans" },
  { id: "inv.projects.manage", label: "Manage projects and sectors" },
  { id: "inv.participations.approve", label: "Approve participations" },
  { id: "inv.allocations.manage", label: "Manage allocations" },
  { id: "inv.contributions.review", label: "Review contributions" },
  { id: "inv.contributions.verify", label: "Approve contribution verification" },
  { id: "inv.returns.review", label: "Review returns" },
  { id: "inv.payouts.approve", label: "Approve payouts" },
  { id: "inv.reports.export", label: "Export investment reports" },
  { id: "inv.audit.view", label: "View audit logs" },
  { id: "inv.settings.manage", label: "Manage investment-related settings" },
  { id: "inv.documents.private", label: "View private investor documents" },
] as const;

export type InvestmentPermission = (typeof INVESTMENT_PERMISSIONS)[number]["id"];

/** Draft matrix. Admin grants are unconfirmed: everything except the overview is withheld. */
const ROLE_GRANTS: Record<StaffRole, "all" | readonly InvestmentPermission[]> = {
  super_admin: "all",
  admin: ["inv.dashboard.view"],
};

export function roleCan(role: StaffRole | undefined, permission: InvestmentPermission): boolean {
  if (!role) return false;
  const grants = ROLE_GRANTS[role];
  return grants === "all" || grants.includes(permission);
}

/** The role used for checks: the staff record's role, lowered (never raised) by a preview cap. */
export function effectiveRole(db: DemoDb, staffId: string, cap?: StaffRole | null): StaffRole | undefined {
  const member = db.staff.find((s) => s.id === staffId && s.status === "active");
  if (!member) return undefined;
  return cap === "admin" ? "admin" : member.role;
}

export function can(db: DemoDb, staffId: string, permission: InvestmentPermission, cap?: StaffRole | null): boolean {
  return roleCan(effectiveRole(db, staffId, cap), permission);
}

export const PERMISSION_DENIED = "This action is not permitted for your role.";
