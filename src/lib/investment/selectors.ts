// Read-only derivations for investment administration. Only counts and sums of recorded values are
// used, and each financial category is kept separate: proposed participation amounts, submitted
// (unverified) contributions, verified contributions, failed / rejected transactions, simulated
// refunds and payouts are never added together. A pending or failed contribution is never counted
// as money received. No return, yield or ratio is calculated anywhere.
import { inRange, istDay, type DateRange } from "@/lib/dates";
import type { DemoDb } from "@/lib/types";
import type {
  AgriculturalProject,
  ContributionPlan,
  ContributionPlanVersion,
  ContributionTransaction,
  InvestmentParticipation,
  InvestmentState,
  InvestorApplication,
  TransactionStatus,
} from "./types";

export const byId = <T extends { id: string }>(list: readonly T[], id: string | null | undefined) => (id ? list.find((x) => x.id === id) : undefined);

// ---------------------------------------------------------------- Plans
export function planVersion(plan: ContributionPlan, version: number): ContributionPlanVersion | undefined {
  return plan.versions.find((v) => v.version === version);
}
export function currentVersion(plan: ContributionPlan): ContributionPlanVersion {
  return planVersion(plan, plan.currentVersion) ?? plan.versions.at(-1)!;
}
export function planParticipationCount(state: InvestmentState, planId: string): number {
  return state.participations.filter((p) => p.planId === planId).length;
}

// ---------------------------------------------------------------- Transactions
/** Statuses whose money is still unconfirmed. Never counted as received. */
export const SUBMITTED_STATUSES: readonly TransactionStatus[] = ["initiated", "pending", "successful", "under_verification"];
/** Statuses that went through administrative verification (including later simulated refunds). */
export const VERIFIED_STATUSES: readonly TransactionStatus[] = ["verified", "partially_refunded", "refunded"];

export const isVerified = (t: ContributionTransaction) => VERIFIED_STATUSES.includes(t.status) && Boolean(t.verification);
export const refundedPaise = (t: ContributionTransaction) => t.refunds.reduce((s, r) => s + r.amountPaise, 0);
export const sumPaise = <T>(rows: readonly T[], value: (row: T) => number) => rows.reduce((s, r) => s + value(r), 0);

export interface FinancialBreakdown {
  /** Contribution amounts of open participations (not money). */
  proposedPaise: number;
  submittedPaise: number;
  submittedCount: number;
  verifiedPaise: number;
  verifiedCount: number;
  failedOrRejectedPaise: number;
  failedOrRejectedCount: number;
  refundedPaise: number;
  /** Fictional test values only; labelled as such in the UI. */
  payoutsApprovedUnpaidCount: number;
  payoutsCompletedCount: number;
}

export function financialBreakdown(participations: readonly InvestmentParticipation[], transactions: readonly ContributionTransaction[], state: InvestmentState): FinancialBreakdown {
  const open = participations.filter((p) => !["cancelled", "rejected", "completed"].includes(p.status));
  const submitted = transactions.filter((t) => SUBMITTED_STATUSES.includes(t.status));
  const verified = transactions.filter(isVerified);
  const bad = transactions.filter((t) => t.status === "failed" || t.status === "rejected");
  return {
    proposedPaise: sumPaise(open, (p) => p.amountPaise),
    submittedPaise: sumPaise(submitted, (t) => t.amountPaise),
    submittedCount: submitted.length,
    verifiedPaise: sumPaise(verified, (t) => t.amountPaise),
    verifiedCount: verified.length,
    failedOrRejectedPaise: sumPaise(bad, (t) => t.amountPaise),
    failedOrRejectedCount: bad.length,
    refundedPaise: sumPaise(transactions, refundedPaise),
    payoutsApprovedUnpaidCount: state.payouts.filter((p) => p.status === "approved_unpaid").length,
    payoutsCompletedCount: state.payouts.filter((p) => p.status === "paid_simulated").length,
  };
}

// ---------------------------------------------------------------- Allocations
export const liveAllocations = (state: InvestmentState, participationId: string) =>
  state.allocations.filter((a) => a.participationId === participationId && (a.status === "proposed" || a.status === "approved"));

export function allocationTotals(state: InvestmentState, participation: InvestmentParticipation) {
  const live = liveAllocations(state, participation.id);
  const approved = sumPaise(live.filter((a) => a.status === "approved"), (a) => a.approvedAmountPaise ?? 0);
  const proposed = sumPaise(live.filter((a) => a.status === "proposed"), (a) => a.proposedAmountPaise);
  return { approvedPaise: approved, proposedPaise: proposed, unallocatedPaise: Math.max(0, participation.amountPaise - approved - proposed) };
}

/** Projects a participation is linked to through proposed or approved allocations. */
export function participationProjectIds(state: InvestmentState, participationId: string): string[] {
  return [...new Set(liveAllocations(state, participationId).map((a) => a.projectId))];
}

// ---------------------------------------------------------------- Investors
export function latestApplication(state: InvestmentState, investorId: string): InvestorApplication | undefined {
  return state.applications.filter((a) => a.investorId === investorId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

export function investorStats(state: InvestmentState, investorId: string) {
  const participations = state.participations.filter((p) => p.investorId === investorId);
  const transactions = state.transactions.filter((t) => t.investorId === investorId);
  const application = latestApplication(state, investorId);
  const pendingActions =
    (application && ["submitted", "under_review", "info_requested"].includes(application.status) ? 1 : 0) +
    participations.filter((p) => p.status === "submitted" || p.status === "awaiting_review").length +
    transactions.filter((t) => t.status === "successful" || t.status === "under_verification").length +
    state.allocations.filter((a) => a.status === "proposed" && participations.some((p) => p.id === a.participationId)).length;
  return {
    participations,
    transactions,
    application,
    verifiedPaise: sumPaise(transactions.filter(isVerified), (t) => t.amountPaise),
    pendingActions,
  };
}

// ---------------------------------------------------------------- Projects and sectors
export function projectStats(state: InvestmentState, projectId: string) {
  const allocations = state.allocations.filter((a) => a.projectId === projectId);
  const participationIds = new Set(allocations.filter((a) => a.status === "proposed" || a.status === "approved").map((a) => a.participationId));
  return {
    allocations,
    participationIds: [...participationIds],
    approvedAllocatedPaise: sumPaise(allocations.filter((a) => a.status === "approved"), (a) => a.approvedAmountPaise ?? 0),
    proposedPaise: sumPaise(allocations.filter((a) => a.status === "proposed"), (a) => a.proposedAmountPaise),
  };
}

export function sectorStats(state: InvestmentState, sectorId: string) {
  const projects = state.projects.filter((p) => p.sectorId === sectorId);
  const stats = projects.map((p) => projectStats(state, p.id));
  return {
    projects,
    participationCount: new Set(stats.flatMap((s) => s.participationIds)).size,
    approvedAllocatedPaise: sumPaise(stats, (s) => s.approvedAllocatedPaise),
  };
}

export const projectAcceptsAllocations = (p: AgriculturalProject) => p.status === "active";

// ---------------------------------------------------------------- Dashboard filtering
export interface InvestmentFilters {
  range: DateRange;
  sectorId: string;
  projectId: string;
  planId: string;
  investorStatus: string;
  transactionStatus: string;
}

function participationMatchesProject(state: InvestmentState, p: InvestmentParticipation, f: InvestmentFilters) {
  if (!f.sectorId && !f.projectId) return true;
  return participationProjectIds(state, p.id).some((pid) => {
    const project = byId(state.projects, pid);
    return (!f.projectId || pid === f.projectId) && (!f.sectorId || project?.sectorId === f.sectorId);
  });
}

export function filteredInvestmentData(db: DemoDb, f: InvestmentFilters) {
  const state = db.investment;
  const investorOk = (id: string) => !f.investorStatus || byId(state.investors, id)?.accountStatus === f.investorStatus;
  const participations = state.participations.filter((p) => inRange(p.createdAt, f.range) && (!f.planId || p.planId === f.planId) && investorOk(p.investorId) && participationMatchesProject(state, p, f));
  const transactions = state.transactions.filter((t) => {
    const p = byId(state.participations, t.participationId);
    return inRange(t.initiatedAt, f.range) && (!f.planId || t.planId === f.planId) && (!f.transactionStatus || t.status === f.transactionStatus) && investorOk(t.investorId) && (!p || participationMatchesProject(state, p, f) || (!f.sectorId && !f.projectId));
  });
  const investors = state.investors.filter((i) => inRange(i.registeredAt, f.range) && investorOk(i.id));
  const applications = state.applications.filter((a) => inRange(a.submittedAt, f.range) && investorOk(a.investorId));
  const projects = state.projects.filter((p) => (!f.sectorId || p.sectorId === f.sectorId) && (!f.projectId || p.id === f.projectId));
  const allocations = state.allocations.filter((a) => projects.some((p) => p.id === a.projectId) && participations.some((p) => p.id === a.participationId));
  return { participations, transactions, investors, applications, projects, allocations };
}

/** Weekly buckets (week commencing) between range.from and range.to. */
export function weeklySeries<T>(rows: readonly T[], date: (row: T) => string | undefined, value: (row: T) => number, range: DateRange) {
  const start = Date.parse(`${range.from}T00:00:00Z`);
  const end = Date.parse(`${range.to}T00:00:00Z`);
  const buckets: { day: string; value: number }[] = [];
  for (let t = start; t <= end; t += 7 * 86_400_000) buckets.push({ day: new Date(t).toISOString().slice(0, 10), value: 0 });
  for (const row of rows) {
    const d = date(row);
    if (!d) continue;
    const day = istDay(d);
    if (day < range.from || day > range.to) continue;
    const index = Math.floor((Date.parse(`${day}T00:00:00Z`) - start) / (7 * 86_400_000));
    const bucket = buckets[index];
    if (bucket) bucket.value += value(row);
  }
  return buckets;
}

export function countBy<T>(rows: readonly T[], key: (row: T) => string, order: readonly string[]): { key: string; value: number }[] {
  const counts = new Map(order.map((k) => [k, 0]));
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return [...counts.entries()].map(([k, value]) => ({ key: k, value }));
}

