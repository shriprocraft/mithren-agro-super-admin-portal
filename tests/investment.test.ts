import { describe, expect, it } from "vitest";
import { STANDARD_PLAN_AMOUNTS_RUPEES } from "@/lib/mock/fixtures/investment";
import * as I from "@/lib/mock/investment-actions";
import type { ActionContext, ActionResult } from "@/lib/mock/actions";
import { createInitialDb, DB_VERSION, mergeInvestmentSeed, migrateDb } from "@/lib/mock/initial-db";
import { allocationTotals, byId, currentVersion, financialBreakdown, isVerified } from "@/lib/investment/selectors";
import { can } from "@/lib/investment/permissions";
import type { DemoDb } from "@/lib/types";

let seq = 0;
const ctx: ActionContext = { actor: { id: "stf-001", name: "Demo Super Admin" }, now: "2026-10-28T06:00:00.000Z", newId: (p) => `${p}-t${++seq}` };
const adminCtx: ActionContext = { ...ctx, actor: { id: "stf-002", name: "Kavya Raman" } };
const previewCtx: ActionContext = { ...ctx, roleCap: "admin" };

function ok(r: ActionResult): DemoDb {
  if (!r.ok) throw new Error(`expected success, got: ${r.error}`);
  return r.db;
}
function err(r: ActionResult): string {
  if (r.ok) throw new Error("expected failure");
  return r.error;
}

describe("investment seed", () => {
  const { investment: s } = createInitialDb();

  it("has exactly six sectors, each with two projects (12 total)", () => {
    expect(s.sectors.map((x) => x.name)).toEqual(["Crop Production", "Dairy Farming", "Fish Farming", "Poultry Farming", "Biogas & Composting", "Agri Forestry"]);
    expect(s.projects).toHaveLength(12);
    for (const sector of s.sectors) expect(s.projects.filter((p) => p.sectorId === sector.id)).toHaveLength(2);
    expect(new Set(s.projects.map((p) => p.id)).size).toBe(12);
  });

  it("has the five standard plans and no custom plan", () => {
    expect(s.plans.map((p) => currentVersion(p).amountPaise / 100)).toEqual([...STANDARD_PLAN_AMOUNTS_RUPEES]);
    expect(s.plans.some((p) => /custom/i.test(p.name))).toBe(false);
    for (const p of s.plans) {
      const v = currentVersion(p);
      expect(v).toMatchObject({ durationMonths: null, eligibleSectorIds: null, termsStatus: "needs_clarification" });
    }
  });

  it("does not record operational figures, durations, gateway references or calculated returns", () => {
    expect(s.projects.flatMap((p) => p.metrics).every((m) => m.value === null)).toBe(true);
    expect(s.projects.every((p) => p.plannedDurationMonths === null)).toBe(true);
    expect(s.transactions.every((t) => t.providerReference === null)).toBe(true);
    expect(s.returns.every((r) => r.calculatedAmountPaise === null)).toBe(true);
    expect(s.payouts.filter((p) => p.amountPaise !== null).every((p) => p.fictionalTest)).toBe(true);
  });

  it("repeated seeding never duplicates sectors, plans, projects or transactions", () => {
    const once = mergeInvestmentSeed(s);
    const twice = mergeInvestmentSeed(once);
    for (const key of ["sectors", "projects", "plans", "transactions", "rules"] as const) expect(twice[key]).toHaveLength(s[key].length);
  });

  it("re-adds a missing seeded record without touching edited ones", () => {
    const edited = { ...s, sectors: s.sectors.slice(1).map((x, i) => (i === 0 ? { ...x, description: "Edited" } : x)) };
    const merged = mergeInvestmentSeed(edited);
    expect(merged.sectors).toHaveLength(6);
    expect(merged.sectors.find((x) => x.id === "sec-dairy")?.description).toBe("Edited");
  });

  it("migrates a version-1 database without discarding marketplace changes", () => {
    const db = createInitialDb();
    const { investment: _i, ...v1 } = { ...db, version: 1, customers: db.customers.slice(0, 3) };
    void _i;
    const migrated = migrateDb(v1)!;
    expect(migrated.version).toBe(DB_VERSION);
    expect(migrated.customers).toHaveLength(3);
    expect(migrated.investment.projects).toHaveLength(12);
    expect(migrateDb({ version: 99 })).toBeNull();
  });

  it("keeps every reference resolvable (no orphans)", () => {
    const has = <T extends { id: string }>(list: T[], id: string | null) => id === null || list.some((x) => x.id === id);
    for (const p of s.projects) expect(has(s.sectors, p.sectorId)).toBe(true);
    for (const a of s.applications) expect(has(s.investors, a.investorId)).toBe(true);
    for (const p of s.participations) {
      expect(has(s.investors, p.investorId)).toBe(true);
      const plan = byId(s.plans, p.planId)!;
      expect(plan.versions.some((v) => v.version === p.planVersion)).toBe(true);
    }
    for (const a of s.allocations) expect(has(s.participations, a.participationId) && has(s.projects, a.projectId)).toBe(true);
    for (const t of s.transactions) expect(has(s.investors, t.investorId) && has(s.participations, t.participationId)).toBe(true);
    for (const r of s.returns) expect(has(s.participations, r.participationId) && has(s.projects, r.projectId)).toBe(true);
    for (const p of s.payouts) expect(has(s.participations, p.participationId) && has(s.returns, p.returnRecordId)).toBe(true);
  });

  it("is internally consistent: verified ⇔ verification record, active ⇔ verified contribution equal to the amount", () => {
    for (const t of s.transactions) expect(Boolean(t.verification)).toBe(["verified", "refunded", "partially_refunded"].includes(t.status));
    for (const p of s.participations.filter((x) => x.status === "active")) {
      const verified = s.transactions.filter((t) => t.participationId === p.id && isVerified(t)).reduce((sum, t) => sum + t.amountPaise, 0);
      expect(verified).toBe(p.amountPaise);
    }
    for (const p of s.participations.filter((x) => ["approved", "active"].includes(x.status))) expect(s.applications.find((a) => a.investorId === p.investorId)?.status).toBe("approved");
    for (const a of s.allocations.filter((x) => x.status === "approved")) expect(a.approvedAmountPaise).toBe(a.proposedAmountPaise);
    for (const a of s.allocations.filter((x) => x.status !== "approved")) expect(a.approvedAmountPaise).toBeNull();
  });
});

describe("financial breakdown", () => {
  it("never counts pending or failed contributions as verified", () => {
    const { investment: s } = createInitialDb();
    const b = financialBreakdown(s.participations, s.transactions, s);
    const verifiedIds = s.transactions.filter(isVerified).map((t) => t.id).sort();
    expect(verifiedIds).toEqual(["txn-001", "txn-003", "txn-004", "txn-008", "txn-009", "txn-011"]);
    expect(b.verifiedPaise).toBe(s.transactions.filter(isVerified).reduce((x, t) => x + t.amountPaise, 0));
    expect(b.failedOrRejectedCount).toBe(2);
    // txn-002, 006, 007, 012, 013: initiated / pending / successful / under verification.
    expect(b.submittedCount).toBe(5);
    expect(b.refundedPaise).toBe(10_000 * 100);
  });

  it("contribution verification updates the verified total exactly once", () => {
    const db = createInitialDb();
    const before = financialBreakdown(db.investment.participations, db.investment.transactions, db.investment);
    const next = ok(I.verifyContribution(db, { transactionId: "txn-002" }, ctx));
    const after = financialBreakdown(next.investment.participations, next.investment.transactions, next.investment);
    expect(after.verifiedPaise - before.verifiedPaise).toBe(1_000 * 100);
    expect(after.submittedPaise).toBe(before.submittedPaise - 1_000 * 100);
    expect(err(I.verifyContribution(next, { transactionId: "txn-002" }, ctx))).toMatch(/already been verified/);
    expect(next.audit[0]).toMatchObject({ action: "inv.contribution.verify", targetId: "txn-002", actorId: "stf-001" });
  });

  it("cannot verify a pending or failed contribution", () => {
    const db = createInitialDb();
    expect(err(I.verifyContribution(db, { transactionId: "txn-007" }, ctx))).toMatch(/verification before/);
    expect(err(I.verifyContribution(db, { transactionId: "txn-005" }, ctx))).toMatch(/verification before/);
  });

  it("blocks duplicate and excessive simulated refunds", () => {
    const db = createInitialDb();
    expect(err(I.recordSimulatedRefund(db, { transactionId: "txn-001", amountRupees: 20_000, reason: "x" }, ctx))).toMatch(/exceeds/);
    const partial = ok(I.recordSimulatedRefund(db, { transactionId: "txn-001", amountRupees: 4_000, reason: "Partial" }, ctx));
    expect(byId(partial.investment.transactions, "txn-001")?.status).toBe("partially_refunded");
    const full = ok(I.recordSimulatedRefund(partial, { transactionId: "txn-001", amountRupees: 6_000, reason: "Rest" }, ctx));
    expect(byId(full.investment.transactions, "txn-001")?.status).toBe("refunded");
    expect(err(I.recordSimulatedRefund(full, { transactionId: "txn-001", amountRupees: 1, reason: "Again" }, ctx))).toMatch(/already been fully refunded/);
  });
});

describe("applications", () => {
  it("approves after review and requires a reason to reject", () => {
    const db = createInitialDb();
    expect(err(I.transitionApplication(db, { applicationId: "app-014", to: "rejected", reason: " " }, ctx))).toMatch(/reason/);
    const approved = ok(I.transitionApplication(db, { applicationId: "app-014", to: "approved" }, ctx));
    expect(byId(approved.investment.applications, "app-014")).toMatchObject({ status: "approved", decidedBy: "Demo Super Admin" });
    expect(approved.audit[0]).toMatchObject({ action: "inv.application.approve", targetType: "investor_application" });
    expect(err(I.transitionApplication(db, { applicationId: "app-013", to: "approved" }, ctx))).toMatch(/cannot move/);
    const rejected = ok(I.transitionApplication(db, { applicationId: "app-013", to: "rejected", reason: "Incomplete" }, ctx));
    expect(byId(rejected.investment.applications, "app-013")?.rejectionReason).toBe("Incomplete");
    expect(rejected.audit[0]?.note).toBe("Incomplete");
  });
});

describe("investors", () => {
  it("suspension requires a reason, keeps financial history and blocks new activity", () => {
    const db = createInitialDb();
    expect(err(I.suspendInvestor(db, { investorId: "inv-001", reason: "" }, ctx))).toMatch(/reason/);
    const next = ok(I.suspendInvestor(db, { investorId: "inv-001", reason: "Review" }, ctx));
    expect(next.investment.transactions).toEqual(db.investment.transactions);
    expect(next.investment.participations).toEqual(db.investment.participations);
    expect(err(I.createParticipation(next, { investorId: "inv-001", planId: "pln-001" }, ctx))).toMatch(/suspended/);
    expect(err(I.decideAllocation(next, { allocationId: "alc-007", decision: "approved" }, ctx))).toMatch(/suspended/);
  });
});

describe("projects and allocations", () => {
  const base = { sectorId: "sec-crop", name: "Millet Trials", description: "Sample", location: "Sample", managerName: "", startDate: "", plannedDurationMonths: null };

  it("validates project fields and duplicate names", () => {
    const db = createInitialDb();
    expect(I.validateProject(db, { ...base, name: "", sectorId: "" })).toMatchObject({ name: "Enter the project name.", sectorId: "Select an agricultural sector." });
    expect(err(I.saveProject(db, { ...base, name: "Organic Vegetable Cultivation" }, ctx))).toMatch(/already exists/);
    const created = ok(I.saveProject(db, base, ctx));
    expect(created.investment.projects).toHaveLength(13);
    expect(created.investment.projects.at(-1)?.status).toBe("planning");
  });

  it("archives instead of deleting projects with history", () => {
    const db = createInitialDb();
    expect(err(I.deleteProject(db, { projectId: "prj-crop-01" }, ctx))).toMatch(/Archive/);
    const archived = ok(I.setProjectStatus(db, { projectId: "prj-crop-01", status: "archived", reason: "Closed" }, ctx));
    expect(archived.investment.allocations).toEqual(db.investment.allocations);
  });

  it("refuses new allocations to inactive projects and while splitting needs clarification", () => {
    const db = createInitialDb();
    expect(err(I.proposeAllocation(db, { participationId: "par-014", projectId: "prj-fish-02", amountRupees: 10_000 }, ctx))).toMatch(/planning/);
    // par-014 already has a proposed allocation (alc-008): splitting is not assumed.
    expect(err(I.proposeAllocation(db, { participationId: "par-014", projectId: "prj-crop-01", amountRupees: 1_000 }, ctx))).toMatch(/needs clarification/);
    const onHold = ok(I.setProjectStatus(db, { projectId: "prj-forestry-01", status: "on_hold", reason: "Pause" }, ctx));
    expect(err(I.decideAllocation(onHold, { allocationId: "alc-008", decision: "approved" }, ctx))).toMatch(/on hold/);
  });

  it("keeps proposals separate from approvals and validates against the amount", () => {
    const db = createInitialDb();
    const rejected = ok(I.decideAllocation(db, { allocationId: "alc-008", decision: "rejected", note: "Re-plan" }, ctx));
    expect(err(I.proposeAllocation(rejected, { participationId: "par-014", projectId: "prj-crop-01", amountRupees: 20_000 }, ctx))).toMatch(/exceeds/);
    const proposed = ok(I.proposeAllocation(rejected, { participationId: "par-014", projectId: "prj-crop-01", amountRupees: 10_000 }, ctx));
    const alloc = proposed.investment.allocations.at(-1)!;
    expect(alloc).toMatchObject({ status: "proposed", approvedAmountPaise: null });
    const approved = ok(I.decideAllocation(proposed, { allocationId: alloc.id, decision: "approved" }, ctx));
    expect(byId(approved.investment.allocations, alloc.id)).toMatchObject({ status: "approved", approvedAmountPaise: 1_000_000, ruleVersion: 1 });
    expect(allocationTotals(approved.investment, byId(approved.investment.participations, "par-014")!).unallocatedPaise).toBe(0);
    expect(err(I.decideAllocation(approved, { allocationId: alloc.id, decision: "approved" }, ctx))).toMatch(/already been decided/);
  });

  it("applies a recorded multi-project rule and validates the sum", () => {
    const db = createInitialDb();
    expect(err(I.recordRule(db, { key: "allocation.splitting", value: "multi_project", approvalReference: "RES-1", acknowledged: false }, ctx))).toMatch(/Confirm/);
    const ruled = ok(I.recordRule(db, { key: "allocation.splitting", value: "multi_project", approvalReference: "RES-1", acknowledged: true }, ctx));
    const r = ok(I.decideAllocation(ruled, { allocationId: "alc-008", decision: "rejected", note: "Split instead" }, ctx));
    const a = ok(I.proposeAllocation(r, { participationId: "par-014", projectId: "prj-crop-01", amountRupees: 6_000 }, ctx));
    const b = ok(I.proposeAllocation(a, { participationId: "par-014", projectId: "prj-poultry-01", amountRupees: 4_000 }, ctx));
    expect(err(I.proposeAllocation(b, { participationId: "par-014", projectId: "prj-biogas-01", amountRupees: 1 }, ctx))).toMatch(/exceeds/);
    expect(b.investment.rules.find((x) => x.key === "allocation.splitting")?.versions).toHaveLength(2);
  });
});

describe("plans", () => {
  it("validates amounts, rejects duplicates, and versions plans already in use", () => {
    const db = createInitialDb();
    const plan = byId(db.investment.plans, "pln-002")!;
    const input = { id: plan.id, name: plan.name, description: plan.description, notes: "", amountRupees: 12_000, changeNote: "" };
    expect(err(I.savePlan(db, { ...input, amountRupees: -5 }, ctx))).toMatch(/valid contribution amount/);
    expect(err(I.savePlan(db, { ...input, amountRupees: 25_000 }, ctx))).toMatch(/already exists/);
    expect(err(I.savePlan(db, input, ctx))).toMatch(/already referenced by existing participations/);
    const next = ok(I.savePlan(db, { ...input, changeNote: "Board update", confirmNewVersion: true }, ctx));
    const updated = byId(next.investment.plans, "pln-002")!;
    expect(updated.currentVersion).toBe(2);
    expect(updated.versions[0]!.amountPaise).toBe(1_000_000);
    // Existing participations keep their original version and amount.
    expect(next.investment.participations.filter((p) => p.planId === "pln-002").every((p) => p.planVersion === 1 && p.amountPaise === 1_000_000)).toBe(true);
  });

  it("disabling a plan preserves history and blocks new participations", () => {
    const db = ok(I.setPlanStatus(createInitialDb(), { planId: "pln-001", status: "disabled", reason: "Paused" }, ctx));
    expect(db.investment.participations.filter((p) => p.planId === "pln-001")).toHaveLength(3);
    expect(err(I.createParticipation(db, { investorId: "inv-002", planId: "pln-001" }, ctx))).toMatch(/disabled/);
  });
});

describe("participations", () => {
  it("activation requires verified contributions equal to the amount; completion needs clarification", () => {
    const db = createInitialDb();
    expect(err(I.transitionParticipation(db, { participationId: "par-002", to: "active" }, ctx))).toMatch(/verified contributions/);
    const verified = ok(I.verifyContribution(db, { transactionId: "txn-002" }, ctx));
    expect(byId(ok(I.transitionParticipation(verified, { participationId: "par-002", to: "active" }, ctx)).investment.participations, "par-002")?.status).toBe("active");
    expect(err(I.transitionParticipation(db, { participationId: "par-001", to: "completed" }, ctx))).toMatch(/clarification/);
    expect(err(I.transitionParticipation(db, { participationId: "par-001", to: "draft" }, ctx))).toMatch(/cannot move/);
  });

  it("rejecting withdraws proposed allocations without deleting them", () => {
    const db = createInitialDb();
    const next = ok(I.transitionParticipation(db, { participationId: "par-014", to: "cancelled", reason: "Investor request" }, ctx));
    expect(byId(next.investment.allocations, "alc-008")?.status).toBe("withdrawn");
    expect(next.investment.allocations).toHaveLength(db.investment.allocations.length);
  });
});

describe("payouts", () => {
  it("never completes a payout without approval, a reference and evidence", () => {
    const db = createInitialDb();
    expect(err(I.recordPayoutCompletion(db, { payoutId: "pay-001", reference: "X", evidenceDocumentId: "none" }, ctx))).toMatch(/approved/);
    const approved = ok(I.approvePayout(db, { payoutId: "pay-001" }, ctx));
    expect(byId(approved.investment.payouts, "pay-001")?.status).toBe("approved_unpaid");
    expect(err(I.recordPayoutCompletion(approved, { payoutId: "pay-001", reference: "REF", evidenceDocumentId: "idoc-018" }, ctx))).toMatch(/evidence/);
    const withDoc = ok(I.addDocumentReference(approved, { entityType: "payout", entityId: "pay-001", docType: "payout_evidence", fileName: "evidence.pdf", mimeType: "application/pdf", sizeBytes: 1000, notes: "", visibility: "internal" }, ctx));
    const docId = withDoc.investment.documents.at(-1)!.id;
    const paid = ok(I.recordPayoutCompletion(withDoc, { payoutId: "pay-001", reference: "REF-1", evidenceDocumentId: docId }, ctx));
    expect(byId(paid.investment.payouts, "pay-001")?.status).toBe("paid_simulated");
    expect(err(I.recordPayoutCompletion(paid, { payoutId: "pay-001", reference: "REF-1", evidenceDocumentId: docId }, ctx))).toMatch(/already been recorded/);
  });
});

describe("documents", () => {
  it("validates file type and size", () => {
    expect(I.validateDocumentFile({ name: "a.exe", type: "application/x-msdownload", size: 10 })).toMatch(/PDF, JPEG or PNG/);
    expect(I.validateDocumentFile({ name: "a.pdf", type: "application/pdf", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(I.validateDocumentFile({ name: "a.pdf", type: "application/pdf", size: 1024 })).toBeNull();
  });
});

describe("permissions", () => {
  it("refuses restricted actions for the Admin role and for the downgrade preview", () => {
    const db = createInitialDb();
    for (const c of [adminCtx, previewCtx]) {
      expect(err(I.verifyContribution(db, { transactionId: "txn-002" }, c))).toBe("This action is not permitted for your role.");
      expect(err(I.approvePayout(db, { payoutId: "pay-001" }, c))).toMatch(/not permitted/);
      expect(err(I.transitionApplication(db, { applicationId: "app-014", to: "approved" }, c))).toMatch(/not permitted/);
      expect(err(I.recordRule(db, { key: "allocation.splitting", value: "multi_project", approvalReference: "R", acknowledged: true }, c))).toMatch(/not permitted/);
    }
    expect(can(db, "stf-001", "inv.payouts.approve")).toBe(true);
    expect(can(db, "stf-001", "inv.payouts.approve", "admin")).toBe(false);
    expect(can(db, "stf-002", "inv.dashboard.view")).toBe(true);
    // Inactive staff have no permissions at all.
    expect(can(db, "stf-005", "inv.dashboard.view")).toBe(false);
  });

  it("records report exports in the audit trail", () => {
    const next = ok(I.recordReportExport(createInitialDb(), { reportId: "contributions", label: "Contributions", rows: 4, filters: "all" }, ctx));
    expect(next.audit[0]).toMatchObject({ action: "inv.report.export", targetType: "investment_report" });
  });
});
