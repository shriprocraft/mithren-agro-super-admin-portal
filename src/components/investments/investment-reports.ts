// Investment report definitions. Rows and columns are defined once and drive both the on-screen table
// and the CSV export, so the exported file always contains exactly the filtered rows shown. Only counts
// and sums of recorded values are used; no ratio, yield or return is calculated. Proposed, pending and
// simulated amounts are labelled as such and never as verified contributions.
import { inRange, type DateRange } from "@/lib/dates";
import { allocationTotals, byId, isVerified, participationProjectIds, refundedPaise, sumPaise } from "@/lib/investment/selectors";
import { statusMeta } from "@/lib/status";
import type { DemoDb } from "@/lib/types";

export type ReportFilterKey = "investor" | "sector" | "project" | "plan" | "participationStatus" | "transactionStatus" | "allocationStatus" | "payoutStatus";
export interface ReportFilters {
  range: DateRange;
  investor: string;
  sector: string;
  project: string;
  plan: string;
  participationStatus: string;
  transactionStatus: string;
  allocationStatus: string;
  payoutStatus: string;
}
export type Row = Record<string, string | number | null>;
export interface InvColumn {
  key: string;
  header: string;
  money?: boolean;
  align?: "right";
}
export interface InvestmentReport {
  id: string;
  label: string;
  description: string;
  /** What the date range applies to. */
  dateField: string;
  filters: ReportFilterKey[];
  columns: InvColumn[];
  rows: (db: DemoDb, f: ReportFilters) => Row[];
}

const m = (d: Parameters<typeof statusMeta>[0], v: string) => statusMeta(d, v).label;
const c = (key: string, header: string, opts: Partial<InvColumn> = {}): InvColumn => ({ key, header, ...opts });
const money = (key: string, header: string) => c(key, header, { money: true, align: "right" });
const num = (key: string, header: string) => c(key, header, { align: "right" });

function participationInScope(db: DemoDb, participationId: string | null, f: ReportFilters) {
  if (!f.sector && !f.project) return true;
  if (!participationId) return false;
  return participationProjectIds(db.investment, participationId).some((pid) => (!f.project || pid === f.project) && (!f.sector || byId(db.investment.projects, pid)?.sectorId === f.sector));
}

export const INVESTMENT_REPORTS: InvestmentReport[] = [
  {
    id: "investor-registrations",
    label: "Investor registration",
    description: "Investor accounts registered in the range. Contact details are excluded.",
    dateField: "registration date",
    filters: ["investor"],
    columns: [c("id", "Investor ID"), c("name", "Name"), c("city", "City"), c("registered", "Registered (UTC)"), c("account", "Account status"), num("participations", "Participations")],
    rows: (db, f) =>
      db.investment.investors
        .filter((i) => inRange(i.registeredAt, f.range) && (!f.investor || i.id === f.investor))
        .map((i) => ({ id: i.id, name: i.name, city: i.city, registered: i.registeredAt, account: m("investorAccount", i.accountStatus), participations: db.investment.participations.filter((p) => p.investorId === i.id).length })),
  },
  {
    id: "application-status",
    label: "Investor application status",
    description: "Applications submitted in the range and their manual-review status.",
    dateField: "submission date",
    filters: ["investor"],
    columns: [c("id", "Application"), c("investor", "Investor ID"), c("submitted", "Submitted (UTC)"), c("status", "Status"), c("decided", "Decided (UTC)"), c("reason", "Rejection reason")],
    rows: (db, f) =>
      db.investment.applications
        .filter((a) => inRange(a.submittedAt, f.range) && (!f.investor || a.investorId === f.investor))
        .map((a) => ({ id: a.id, investor: a.investorId, submitted: a.submittedAt, status: m("application", a.status), decided: a.decidedAt ?? "", reason: a.rejectionReason ?? "" })),
  },
  {
    id: "plan-usage",
    label: "Contribution plan usage",
    description: "Participation records per plan (created in the range). Proposed amounts are plan amounts, not money received.",
    dateField: "participation creation date",
    filters: ["plan", "participationStatus", "sector"],
    columns: [c("plan", "Plan ID"), c("name", "Plan"), num("version", "Current version"), c("status", "Plan status"), num("participations", "Participations"), money("proposed", "Proposed contribution amounts (INR)"), money("verified", "Verified contributions (INR)")],
    rows: (db, f) =>
      db.investment.plans
        .filter((p) => !f.plan || p.id === f.plan)
        .map((plan) => {
          const parts = db.investment.participations.filter((p) => p.planId === plan.id && inRange(p.createdAt, f.range) && (!f.participationStatus || p.status === f.participationStatus) && participationInScope(db, p.id, f));
          const txns = db.investment.transactions.filter((t) => parts.some((p) => p.id === t.participationId) && isVerified(t));
          return { plan: plan.id, name: plan.name, version: plan.currentVersion, status: m("plan", plan.status), participations: parts.length, proposed: sumPaise(parts, (p) => p.amountPaise), verified: sumPaise(txns, (t) => t.amountPaise) };
        }),
  },
  {
    id: "verified-contributions",
    label: "Contributions received and verified",
    description: "Contributions verified (simulated workflow) in the range, by verification date. Simulated refunds are shown separately.",
    dateField: "verification date",
    filters: ["investor", "plan", "sector", "project"],
    columns: [c("id", "Transaction"), c("investor", "Investor ID"), c("participation", "Participation"), c("plan", "Plan"), money("amount", "Verified amount (INR)"), money("refunded", "Refunded, simulated (INR)"), c("verified", "Verified (UTC)"), c("status", "Status")],
    rows: (db, f) =>
      db.investment.transactions
        .filter((t) => isVerified(t) && inRange(t.verification!.at, f.range) && (!f.investor || t.investorId === f.investor) && (!f.plan || t.planId === f.plan) && participationInScope(db, t.participationId, f))
        .map((t) => ({ id: t.id, investor: t.investorId, participation: t.participationId, plan: `${t.planId} v${t.planVersion}`, amount: t.amountPaise, refunded: refundedPaise(t), verified: t.verification!.at, status: m("transaction", t.status) })),
  },
  {
    id: "unconfirmed-transactions",
    label: "Failed and pending transactions",
    description: "Transactions that are not verified: initiated, pending, successful (unverified), under verification, failed or rejected. None of these is money received.",
    dateField: "initiation date",
    filters: ["investor", "plan", "transactionStatus"],
    columns: [c("id", "Transaction"), c("investor", "Investor ID"), c("plan", "Plan"), money("amount", "Amount, not received (INR)"), c("initiated", "Initiated (UTC)"), c("status", "Status"), c("reason", "Failure / rejection reason")],
    rows: (db, f) =>
      db.investment.transactions
        .filter((t) => !isVerified(t) && inRange(t.initiatedAt, f.range) && (!f.investor || t.investorId === f.investor) && (!f.plan || t.planId === f.plan) && (!f.transactionStatus || t.status === f.transactionStatus))
        .map((t) => ({ id: t.id, investor: t.investorId, plan: `${t.planId} v${t.planVersion}`, amount: t.amountPaise, initiated: t.initiatedAt, status: m("transaction", t.status), reason: t.failureReason ?? t.rejection?.reason ?? "" })),
  },
  {
    id: "sector-portfolio",
    label: "Sector-wise project portfolio",
    description: "Projects per sector by status, with approved allocation decisions. Not a valuation or performance figure.",
    dateField: "— (current state)",
    filters: ["sector"],
    columns: [c("sector", "Sector"), num("projects", "Projects"), num("active", "Active"), num("planning", "Planning"), num("onHold", "On hold"), num("archived", "Archived"), money("approved", "Approved allocations (INR)")],
    rows: (db, f) =>
      db.investment.sectors
        .filter((s) => !f.sector || s.id === f.sector)
        .map((s) => {
          const ps = db.investment.projects.filter((p) => p.sectorId === s.id);
          const count = (st: string) => ps.filter((p) => p.status === st).length;
          return { sector: s.name, projects: ps.length, active: count("active"), planning: count("planning"), onHold: count("on_hold"), archived: count("archived"), approved: sumPaise(db.investment.allocations.filter((a) => a.status === "approved" && ps.some((p) => p.id === a.projectId)), (a) => a.approvedAmountPaise ?? 0) };
        }),
  },
  {
    id: "project-participations",
    label: "Project-wise participation",
    description: "Participations linked to each project through allocations proposed in the range.",
    dateField: "allocation proposal date",
    filters: ["sector", "project"],
    columns: [c("project", "Project ID"), c("name", "Project"), c("sector", "Sector"), c("status", "Project status"), num("participations", "Participations"), money("proposed", "Proposed, not approved (INR)"), money("approved", "Approved allocations (INR)")],
    rows: (db, f) =>
      db.investment.projects
        .filter((p) => (!f.sector || p.sectorId === f.sector) && (!f.project || p.id === f.project))
        .map((p) => {
          const al = db.investment.allocations.filter((a) => a.projectId === p.id && inRange(a.proposedAt, f.range));
          return { project: p.id, name: p.name, sector: byId(db.investment.sectors, p.sectorId)?.name ?? "", status: m("project", p.status), participations: new Set(al.filter((a) => a.status === "proposed" || a.status === "approved").map((a) => a.participationId)).size, proposed: sumPaise(al.filter((a) => a.status === "proposed"), (a) => a.proposedAmountPaise), approved: sumPaise(al.filter((a) => a.status === "approved"), (a) => a.approvedAmountPaise ?? 0) };
        }),
  },
  {
    id: "allocations",
    label: "Project allocation",
    description: "Every allocation proposed in the range with its decision. Proposed amounts are not approved amounts.",
    dateField: "proposal date",
    filters: ["sector", "project", "allocationStatus", "investor"],
    columns: [c("id", "Allocation"), c("participation", "Participation"), c("investor", "Investor ID"), c("project", "Project ID"), money("proposed", "Proposed (INR)"), money("approved", "Approved (INR)"), c("status", "Status"), money("unallocated", "Participation unallocated (INR)"), c("decided", "Decided (UTC)")],
    rows: (db, f) =>
      db.investment.allocations
        .filter((a) => {
          const p = byId(db.investment.projects, a.projectId);
          const par = byId(db.investment.participations, a.participationId);
          return inRange(a.proposedAt, f.range) && (!f.sector || p?.sectorId === f.sector) && (!f.project || a.projectId === f.project) && (!f.allocationStatus || a.status === f.allocationStatus) && (!f.investor || par?.investorId === f.investor);
        })
        .map((a) => {
          const par = byId(db.investment.participations, a.participationId);
          return { id: a.id, participation: a.participationId, investor: par?.investorId ?? "", project: a.projectId, proposed: a.proposedAmountPaise, approved: a.approvedAmountPaise, status: m("allocation", a.status), unallocated: par ? allocationTotals(db.investment, par).unallocatedPaise : null, decided: a.decidedAt ?? "" };
        }),
  },
  {
    id: "payouts",
    label: "Return and payout status",
    description: "Payout records requested in the range. Amounts are FICTIONAL TEST values; no return formula is approved and no money is paid.",
    dateField: "payout request date",
    filters: ["payoutStatus", "investor"],
    columns: [c("id", "Payout"), c("investor", "Investor ID"), c("participation", "Participation"), c("returnRecord", "Return record"), money("amount", "Amount — fictional test (INR)"), c("status", "Status"), c("requested", "Requested (UTC)"), c("data", "Data type")],
    rows: (db, f) =>
      db.investment.payouts
        .filter((p) => inRange(p.requestedAt, f.range) && (!f.payoutStatus || p.status === f.payoutStatus) && (!f.investor || p.investorId === f.investor))
        .map((p) => ({ id: p.id, investor: p.investorId, participation: p.participationId, returnRecord: p.returnRecordId ?? "", amount: p.amountPaise, status: m("payout", p.status), requested: p.requestedAt, data: p.fictionalTest ? "Fictional test data" : "Record" })),
  },
  {
    id: "audit",
    label: "Investment activity audit",
    description: "Investment-administration audit events in the range (browser-local demo log; not tamper-proof).",
    dateField: "event time",
    filters: [],
    columns: [c("at", "Timestamp (UTC)"), c("actor", "Actor"), c("action", "Action"), c("entity", "Entity type"), c("target", "Entity ID"), c("summary", "Summary"), c("note", "Reason / note")],
    rows: (db, f) =>
      db.audit
        .filter((e) => (e.action.startsWith("inv.") || e.action === "staff.role_change") && inRange(e.at, { ...f.range, to: f.range.to >= "2026-10-28" ? "9999-12-31" : f.range.to }))
        .map((e) => ({ at: e.at, actor: e.actorName, action: e.action, entity: e.targetType, target: e.targetId, summary: e.summary, note: e.note ?? "" })),
  },
];

export function csvCell(col: InvColumn, row: Row): string | number | null {
  const v = row[col.key] ?? null;
  return col.money && typeof v === "number" ? (v / 100).toFixed(2) : v;
}
