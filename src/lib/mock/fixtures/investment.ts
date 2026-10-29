// DEMO DATA for agricultural investment administration. Every investor is fictional (example.com
// emails, an obviously fake 90000 phone range). The 12 projects are ILLUSTRATIVE sample projects with
// editable names and descriptions; they are not verified operating businesses, and no operational or
// financial performance is recorded for them. Contribution amounts are the five standard plan amounts
// supplied for the initial catalogue; they are contribution amounts, not returns. No gateway or bank
// reference is invented: providerReference is null everywhere.
import type { AuditEvent } from "@/lib/types";
import type {
  AgriculturalProject,
  AgriculturalSector,
  AllocationStatus,
  ApplicationStatus,
  BusinessRule,
  ContributionPlan,
  ContributionTransaction,
  InvestmentDocument,
  InvestmentParticipation,
  InvestmentState,
  Investor,
  InvestorApplication,
  OperationalMetric,
  ParticipationStatus,
  PayoutRecord,
  ProjectAllocation,
  ProjectStatus,
  ReturnRecord,
  RuleKey,
  StatusChange,
  TransactionStatus,
} from "@/lib/investment/types";

/** Bump when new seed records are added; merging never duplicates or overwrites existing IDs. */
export const INVESTMENT_SEED_VERSION = 1;

const ADMIN = "Demo Super Admin";
const SEED_AT = "2026-08-01T04:30:00.000Z";
const rupees = (n: number) => n * 100;

// ---------------------------------------------------------------- Sectors
export const SECTOR_IDS = ["sec-crop", "sec-dairy", "sec-fish", "sec-poultry", "sec-biogas", "sec-forestry"] as const;

export const sectorsFixture: AgriculturalSector[] = [
  { id: "sec-crop", name: "Crop Production", description: "Cultivation of vegetables, fruits and other crops.", createdAt: SEED_AT, updatedAt: SEED_AT },
  { id: "sec-dairy", name: "Dairy Farming", description: "Dairy cattle care, milk collection and processing.", createdAt: SEED_AT, updatedAt: SEED_AT },
  { id: "sec-fish", name: "Fish Farming", description: "Freshwater fish cultivation and aquaculture facilities.", createdAt: SEED_AT, updatedAt: SEED_AT },
  { id: "sec-poultry", name: "Poultry Farming", description: "Layer and broiler poultry operations.", createdAt: SEED_AT, updatedAt: SEED_AT },
  { id: "sec-biogas", name: "Biogas & Composting", description: "Farm biogas generation and organic compost production.", createdAt: SEED_AT, updatedAt: SEED_AT },
  { id: "sec-forestry", name: "Agri Forestry", description: "Tree cultivation and agroforestry systems.", createdAt: SEED_AT, updatedAt: SEED_AT },
];

/** Operational metric definitions relevant to each sector. Values start unrecorded (null). */
export const SECTOR_METRICS: Record<string, [key: string, label: string, unit: string][]> = {
  "sec-crop": [["area", "Cultivated area", "acres"], ["production", "Production volume", "tonnes"]],
  "sec-dairy": [["herd", "Herd size", "cattle"], ["milk", "Milk volume", "litres per day"]],
  "sec-fish": [["pond_area", "Pond / water area", "acres"], ["fish_output", "Fish production", "tonnes"]],
  "sec-poultry": [["capacity", "Poultry capacity", "birds"], ["output", "Output", "eggs or birds per cycle"]],
  "sec-biogas": [["biogas", "Biogas output", "m³ per day"], ["compost", "Compost output", "tonnes"]],
  "sec-forestry": [["area", "Forestry area", "acres"], ["trees", "Trees planted", "trees"]],
};

export const metricsForSector = (sectorId: string): OperationalMetric[] =>
  (SECTOR_METRICS[sectorId] ?? []).map(([key, label, unit]) => ({ key, label, unit, value: null }));

// ---------------------------------------------------------------- Projects (illustrative)
const project = (
  id: string,
  sectorId: string,
  name: string,
  description: string,
  location: string,
  managerName: string | null,
  status: ProjectStatus,
  startDate: string | null,
  milestones: AgriculturalProject["milestones"] = [],
): AgriculturalProject => ({
  id,
  sectorId,
  name,
  description,
  location,
  managerName,
  status,
  startDate,
  plannedDurationMonths: null,
  metrics: metricsForSector(sectorId),
  milestones,
  notes: [],
  statusHistory: [{ at: SEED_AT, by: ADMIN, from: null, to: status, note: "Seeded illustrative demo project" }],
  illustrative: true,
  createdAt: SEED_AT,
  updatedAt: SEED_AT,
});

const ms = (id: string, title: string, targetDate: string | null, status: "planned" | "in_progress" | "done" = "planned") => ({ id, title, targetDate, status });

export const projectsFixture: AgriculturalProject[] = [
  project("prj-crop-01", "sec-crop", "Organic Vegetable Cultivation", "Sample project for organic vegetable cultivation. Illustrative description; edit when actual project details are confirmed.", "Hosur, Tamil Nadu (sample location)", "Sample Manager A", "active", "2026-07-01", [ms("mil-crop-01-1", "Site assessment (demo milestone)", "2026-11-30", "in_progress"), ms("mil-crop-01-2", "First planting plan (demo milestone)", "2027-01-15")]),
  project("prj-crop-02", "sec-crop", "Fruit Orchard Development", "Sample project for developing a fruit orchard. Illustrative description.", "Krishnagiri, Tamil Nadu (sample location)", null, "planning", null),
  project("prj-dairy-01", "sec-dairy", "Dairy Cattle Operations", "Sample project for dairy cattle operations. Illustrative description.", "Erode, Tamil Nadu (sample location)", "Sample Manager B", "active", "2026-07-15", [ms("mil-dairy-01-1", "Shed readiness review (demo milestone)", "2026-12-15")]),
  project("prj-dairy-02", "sec-dairy", "Milk Collection and Processing", "Sample project for milk collection and processing. Illustrative description.", "Namakkal, Tamil Nadu (sample location)", "Sample Manager B", "on_hold", "2026-08-01"),
  project("prj-fish-01", "sec-fish", "Freshwater Fish Cultivation", "Sample project for freshwater fish cultivation. Illustrative description.", "Thanjavur, Tamil Nadu (sample location)", "Sample Manager C", "active", "2026-07-20", [ms("mil-fish-01-1", "Pond preparation (demo milestone)", "2026-11-20", "in_progress")]),
  project("prj-fish-02", "sec-fish", "Aquaculture Infrastructure", "Sample project for aquaculture infrastructure. Illustrative description.", "Nagapattinam, Tamil Nadu (sample location)", null, "planning", null),
  project("prj-poultry-01", "sec-poultry", "Layer Poultry Operations", "Sample project for layer poultry operations. Illustrative description.", "Namakkal, Tamil Nadu (sample location)", "Sample Manager D", "active", "2026-08-01"),
  project("prj-poultry-02", "sec-poultry", "Broiler Poultry Operations", "Sample project for broiler poultry operations. Illustrative description.", "Palladam, Tamil Nadu (sample location)", "Sample Manager D", "active", "2026-08-10"),
  project("prj-biogas-01", "sec-biogas", "Farm Biogas Production", "Sample project for farm biogas production. Illustrative description.", "Salem, Tamil Nadu (sample location)", "Sample Manager E", "active", "2026-08-05", [ms("mil-biogas-01-1", "Digester design review (demo milestone)", "2026-12-01")]),
  project("prj-biogas-02", "sec-biogas", "Organic Compost Manufacturing", "Sample project for organic compost manufacturing. Illustrative description.", "Dindigul, Tamil Nadu (sample location)", null, "planning", null),
  project("prj-forestry-01", "sec-forestry", "Timber and Tree Cultivation", "Sample project for timber and tree cultivation. Illustrative description.", "Nilgiris, Tamil Nadu (sample location)", "Sample Manager F", "active", "2026-07-25"),
  project("prj-forestry-02", "sec-forestry", "Agroforestry Development", "Sample project for agroforestry development. Illustrative description.", "Vellore, Tamil Nadu (sample location)", null, "planning", null),
];

// ---------------------------------------------------------------- Standard contribution plans
// The five standard amounts supplied for the initial catalogue. The brochure's custom plan is
// intentionally NOT seeded. Duration, min/max rules, eligibility and all financial terms are null.
const plan = (id: string, amountRupees: number, label: string): ContributionPlan => ({
  id,
  name: `Standard Contribution Plan — ${label}`,
  currency: "INR",
  description: `Standard contribution amount of ${label}. This is a contribution amount, not a return or maturity value.`,
  status: "active",
  notes: "",
  currentVersion: 1,
  versions: [
    {
      version: 1,
      amountPaise: rupees(amountRupees),
      durationMonths: null,
      minContributionPaise: null,
      maxContributionPaise: null,
      eligibleSectorIds: null,
      effectiveFrom: null,
      termsStatus: "needs_clarification",
      createdAt: SEED_AT,
      createdBy: ADMIN,
      changeNote: "Initial standard plan catalogue",
    },
  ],
  createdAt: SEED_AT,
  updatedAt: SEED_AT,
});

export const STANDARD_PLAN_AMOUNTS_RUPEES = [1_000, 10_000, 25_000, 50_000, 1_00_000] as const;

export const plansFixture: ContributionPlan[] = [
  plan("pln-001", 1_000, "₹1,000"),
  plan("pln-002", 10_000, "₹10,000"),
  plan("pln-003", 25_000, "₹25,000"),
  plan("pln-004", 50_000, "₹50,000"),
  plan("pln-005", 1_00_000, "₹1,00,000"),
];
const PLAN_AMOUNT: Record<string, number> = Object.fromEntries(plansFixture.map((p) => [p.id, p.versions[0]!.amountPaise]));

// ---------------------------------------------------------------- Investors and applications
type AppSpec = { status: ApplicationStatus; decidedAt?: string; reason?: string; info?: string };
const investorSpecs: [id: string, name: string, handle: string, tail: string, city: string, registeredAt: string, app: AppSpec][] = [
  ["inv-001", "Aarav Subramanian", "aarav.s", "30001", "Chennai", "2026-08-02T05:10:00.000Z", { status: "approved", decidedAt: "2026-08-05T06:00:00.000Z" }],
  ["inv-002", "Bhavana Rao", "bhavana.rao", "30002", "Bengaluru", "2026-08-04T07:30:00.000Z", { status: "approved", decidedAt: "2026-08-08T06:00:00.000Z" }],
  ["inv-003", "Charan Kumar", "charan.k", "30003", "Hyderabad", "2026-08-07T09:15:00.000Z", { status: "approved", decidedAt: "2026-08-11T06:00:00.000Z" }],
  ["inv-004", "Deepa Natarajan", "deepa.n", "30004", "Coimbatore", "2026-08-12T04:45:00.000Z", { status: "approved", decidedAt: "2026-08-16T06:00:00.000Z" }],
  ["inv-005", "Eshan Verma", "eshan.v", "30005", "Pune", "2026-08-20T10:20:00.000Z", { status: "approved", decidedAt: "2026-08-25T06:00:00.000Z" }],
  ["inv-006", "Farah Ali", "farah.ali", "30006", "Hyderabad", "2026-08-28T08:05:00.000Z", { status: "approved", decidedAt: "2026-09-02T06:00:00.000Z" }],
  ["inv-007", "Gopal Iyengar", "gopal.i", "30007", "Mysuru", "2026-09-01T06:40:00.000Z", { status: "approved", decidedAt: "2026-09-05T06:00:00.000Z" }],
  ["inv-008", "Harini Venkat", "harini.v", "30008", "Chennai", "2026-08-24T11:00:00.000Z", { status: "approved", decidedAt: "2026-08-29T06:00:00.000Z" }],
  ["inv-009", "Ishaan Bose", "ishaan.b", "30009", "Kolkata", "2026-09-10T05:55:00.000Z", { status: "approved", decidedAt: "2026-09-14T06:00:00.000Z" }],
  ["inv-010", "Jaya Prakash", "jaya.p", "30010", "Madurai", "2026-09-18T07:10:00.000Z", { status: "approved", decidedAt: "2026-09-23T06:00:00.000Z" }],
  ["inv-011", "Kiran Shetty", "kiran.s", "30011", "Mangaluru", "2026-09-25T09:30:00.000Z", { status: "approved", decidedAt: "2026-09-30T06:00:00.000Z" }],
  ["inv-012", "Leela Thomas", "leela.t", "30012", "Kochi", "2026-08-15T06:25:00.000Z", { status: "approved", decidedAt: "2026-08-19T06:00:00.000Z" }],
  ["inv-013", "Manoj Pillai", "manoj.p", "30013", "Thiruvananthapuram", "2026-10-05T08:50:00.000Z", { status: "submitted" }],
  ["inv-014", "Nandini Joshi", "nandini.j", "30014", "Pune", "2026-10-12T10:15:00.000Z", { status: "under_review" }],
  ["inv-015", "Omkar Patil", "omkar.p", "30015", "Nashik", "2026-10-18T05:35:00.000Z", { status: "info_requested", info: "Please re-submit the address document; the uploaded file reference is illegible (demo request)." }],
  ["inv-016", "Pooja Desai", "pooja.d", "30016", "Ahmedabad", "2026-10-22T07:45:00.000Z", { status: "submitted" }],
  ["inv-017", "Rakesh Menon", "rakesh.m", "30017", "Kozhikode", "2026-09-14T06:00:00.000Z", { status: "rejected", decidedAt: "2026-09-19T06:00:00.000Z", reason: "Submitted details did not match across documents during manual review (demo record)." }],
];

const plusHours = (iso: string, hours: number) => new Date(Date.parse(iso) + hours * 3_600_000).toISOString();

export const investorsFixture: Investor[] = investorSpecs.map(([id, name, handle, tail, city, registeredAt]) => ({
  id,
  name,
  email: `${handle}@example.com`,
  phone: `+91 90000 ${tail}`,
  city,
  registeredAt,
  accountStatus: id === "inv-012" ? "suspended" : "active",
  suspension: id === "inv-012" ? { reason: "Contact details could not be confirmed during periodic manual review (demo record).", at: "2026-10-14T09:00:00.000Z", by: ADMIN } : undefined,
  notes: id === "inv-003" ? [{ id: "note-inv-003-1", at: "2026-10-10T06:30:00.000Z", by: ADMIN, body: "Investor asked about project updates; directed to the investor portal team (demo note)." }] : [],
}));

export const applicationsFixture: InvestorApplication[] = investorSpecs.map(([id, , , , , registeredAt, app], i) => {
  const appId = `app-${String(i + 1).padStart(3, "0")}`;
  const history: StatusChange<ApplicationStatus>[] = [{ at: registeredAt, by: "Investor (demo)", from: null, to: "submitted" }];
  if (app.status !== "submitted") history.push({ at: plusHours(registeredAt, 20), by: ADMIN, from: "submitted", to: "under_review" });
  if (app.status === "info_requested") history.push({ at: plusHours(registeredAt, 44), by: ADMIN, from: "under_review", to: "info_requested", note: app.info });
  if (app.status === "approved" || app.status === "rejected") history.push({ at: app.decidedAt!, by: ADMIN, from: "under_review", to: app.status, note: app.reason });
  return {
    id: appId,
    investorId: id,
    submittedAt: registeredAt,
    status: app.status,
    reviewNotes: app.status === "under_review" ? [{ id: `rn-${appId}-1`, at: plusHours(registeredAt, 22), by: ADMIN, body: "Started manual review of the submitted profile (demo)." }] : [],
    infoRequest: app.info ? { message: app.info, at: plusHours(registeredAt, 44), by: ADMIN } : undefined,
    rejectionReason: app.reason,
    decidedAt: app.decidedAt,
    decidedBy: app.decidedAt ? ADMIN : undefined,
    history,
  };
});

// ---------------------------------------------------------------- Participations
const PARTICIPATION_FLOW: ParticipationStatus[] = ["draft", "submitted", "awaiting_review", "approved", "active"];

function participation(id: string, investorId: string, planId: string, createdAt: string, status: ParticipationStatus, note?: string): InvestmentParticipation {
  const history: StatusChange<ParticipationStatus>[] = [];
  const target = status === "cancelled" ? "approved" : status === "rejected" ? "awaiting_review" : status;
  let hour = 0;
  let previous: ParticipationStatus | null = null;
  for (const step of PARTICIPATION_FLOW) {
    history.push({ at: plusHours(createdAt, hour), by: step === "draft" || step === "submitted" ? "Investor (demo)" : ADMIN, from: previous, to: step });
    previous = step;
    hour += step === "approved" ? 30 : 6;
    if (step === target) break;
  }
  if (status === "cancelled" || status === "rejected") history.push({ at: plusHours(createdAt, hour + 24), by: ADMIN, from: previous, to: status, note });
  return { id, investorId, planId, planVersion: 1, amountPaise: PLAN_AMOUNT[planId]!, createdAt, updatedAt: history.at(-1)!.at, status, notes: [], history };
}

export const participationsFixture: InvestmentParticipation[] = [
  participation("par-001", "inv-001", "pln-002", "2026-08-10T05:00:00.000Z", "active"),
  participation("par-002", "inv-001", "pln-001", "2026-10-02T06:00:00.000Z", "approved"),
  participation("par-003", "inv-002", "pln-003", "2026-08-18T07:00:00.000Z", "active"),
  participation("par-004", "inv-003", "pln-005", "2026-08-25T05:30:00.000Z", "active"),
  participation("par-005", "inv-004", "pln-004", "2026-09-05T04:30:00.000Z", "approved"),
  participation("par-006", "inv-005", "pln-002", "2026-10-20T08:00:00.000Z", "awaiting_review"),
  participation("par-007", "inv-006", "pln-001", "2026-10-24T09:00:00.000Z", "submitted"),
  participation("par-008", "inv-007", "pln-003", "2026-09-12T05:15:00.000Z", "active"),
  participation("par-009", "inv-008", "pln-002", "2026-09-02T06:10:00.000Z", "cancelled", "Cancelled at the investor's request before allocation (demo record)."),
  participation("par-010", "inv-009", "pln-004", "2026-09-20T07:20:00.000Z", "rejected", "Contribution evidence did not match the selected plan (demo record)."),
  participation("par-011", "inv-010", "pln-005", "2026-10-15T05:45:00.000Z", "awaiting_review"),
  participation("par-012", "inv-012", "pln-002", "2026-08-30T06:30:00.000Z", "active"),
  participation("par-013", "inv-011", "pln-001", "2026-10-26T10:00:00.000Z", "draft"),
  participation("par-014", "inv-003", "pln-002", "2026-10-10T05:00:00.000Z", "approved"),
];

// ---------------------------------------------------------------- Transactions
function txn(
  id: string,
  participationId: string,
  initiatedAt: string,
  status: TransactionStatus,
  method: ContributionTransaction["method"],
  extra: { failureReason?: string; rejectionReason?: string; refundReason?: string } = {},
): ContributionTransaction {
  const p = participationsFixture.find((x) => x.id === participationId)!;
  const history: StatusChange<TransactionStatus>[] = [{ at: initiatedAt, by: "Investor (demo)", from: null, to: "initiated" }];
  const add = (to: TransactionStatus, hours: number, by = "Mock payment record", note?: string) => history.push({ at: plusHours(initiatedAt, hours), by, from: history.at(-1)!.to, to, note });
  let verification: ContributionTransaction["verification"];
  let rejection: ContributionTransaction["rejection"];
  const refunds: ContributionTransaction["refunds"] = [];
  if (status !== "initiated") add("pending", 0.1);
  if (status === "failed") add("failed", 0.3, "Mock payment record", extra.failureReason);
  if (["successful", "under_verification", "verified", "rejected", "refunded", "partially_refunded"].includes(status)) add("successful", 0.3);
  if (["under_verification", "verified", "rejected", "refunded", "partially_refunded"].includes(status)) add("under_verification", 4, ADMIN);
  if (["verified", "refunded", "partially_refunded"].includes(status)) {
    add("verified", 20, ADMIN, "Demo verification. No bank statement or gateway confirmation exists for this fictional record.");
    verification = { at: plusHours(initiatedAt, 20), by: ADMIN, note: "Demo verification (manual, simulated)." };
  }
  if (status === "rejected") {
    add("rejected", 20, ADMIN, extra.rejectionReason);
    rejection = { at: plusHours(initiatedAt, 20), by: ADMIN, reason: extra.rejectionReason! };
  }
  if (status === "refunded") {
    add("refunded", 200, ADMIN, extra.refundReason);
    refunds.push({ id: `rfd-${id}`, at: plusHours(initiatedAt, 200), by: ADMIN, amountPaise: p.amountPaise, reason: extra.refundReason! });
  }
  return {
    id,
    investorId: p.investorId,
    participationId,
    planId: p.planId,
    planVersion: p.planVersion,
    amountPaise: p.amountPaise,
    currency: "INR",
    type: "contribution",
    method,
    providerReference: null,
    initiatedAt,
    status,
    failureReason: extra.failureReason,
    verification,
    rejection,
    refunds,
    discrepancies: [],
    history,
  };
}

export const transactionsFixture: ContributionTransaction[] = [
  txn("txn-001", "par-001", "2026-08-11T06:00:00.000Z", "verified", "UPI"),
  txn("txn-002", "par-002", "2026-10-03T07:00:00.000Z", "under_verification", "UPI"),
  txn("txn-003", "par-003", "2026-08-19T08:00:00.000Z", "verified", "Bank transfer"),
  txn("txn-004", "par-004", "2026-08-26T05:00:00.000Z", "verified", "Bank transfer"),
  txn("txn-005", "par-005", "2026-09-06T05:00:00.000Z", "failed", "Card", { failureReason: "Mock payment record: payment declined (no real gateway involved)." }),
  txn("txn-006", "par-005", "2026-09-07T06:00:00.000Z", "successful", "UPI"),
  txn("txn-007", "par-006", "2026-10-21T09:00:00.000Z", "pending", "UPI"),
  txn("txn-008", "par-008", "2026-09-13T06:00:00.000Z", "verified", "UPI"),
  txn("txn-009", "par-009", "2026-09-03T07:00:00.000Z", "refunded", "UPI", { refundReason: "Participation cancelled before allocation; simulated refund recorded (no money moved)." }),
  txn("txn-010", "par-010", "2026-09-21T08:00:00.000Z", "rejected", "Bank transfer", { rejectionReason: "Amount in the submitted evidence did not match the plan amount (demo record)." }),
  txn("txn-011", "par-012", "2026-08-31T07:00:00.000Z", "verified", "Bank transfer"),
  txn("txn-012", "par-014", "2026-10-11T06:00:00.000Z", "initiated", null),
  txn("txn-013", "par-011", "2026-10-16T06:30:00.000Z", "under_verification", "Bank transfer"),
];

// ---------------------------------------------------------------- Allocations
function allocation(id: string, participationId: string, projectId: string, status: AllocationStatus, proposedAt: string, decisionNote?: string): ProjectAllocation {
  const amount = participationsFixture.find((p) => p.id === participationId)!.amountPaise;
  const decided = status !== "proposed";
  return {
    id,
    participationId,
    projectId,
    proposedAmountPaise: amount,
    approvedAmountPaise: status === "approved" ? amount : null,
    status,
    proposedAt,
    proposedBy: ADMIN,
    decidedAt: decided ? plusHours(proposedAt, 26) : undefined,
    decidedBy: decided ? ADMIN : undefined,
    decisionNote: decisionNote ?? (status === "approved" ? "Demo allocation decision. Allocation rules need clarification." : undefined),
    ruleVersion: decided ? 1 : undefined,
    notes: [],
  };
}

export const allocationsFixture: ProjectAllocation[] = [
  allocation("alc-001", "par-001", "prj-crop-01", "approved", "2026-08-12T06:00:00.000Z"),
  allocation("alc-002", "par-003", "prj-dairy-01", "approved", "2026-08-20T06:00:00.000Z"),
  allocation("alc-003", "par-004", "prj-fish-01", "approved", "2026-08-28T06:00:00.000Z"),
  allocation("alc-004", "par-008", "prj-poultry-01", "approved", "2026-09-14T06:00:00.000Z"),
  allocation("alc-005", "par-012", "prj-dairy-02", "approved", "2026-09-01T06:00:00.000Z", "Approved while the project was active (demo). The project was later put on hold; this historical decision is preserved."),
  allocation("alc-006", "par-005", "prj-biogas-01", "proposed", "2026-09-09T06:00:00.000Z"),
  allocation("alc-007", "par-002", "prj-crop-01", "proposed", "2026-10-05T06:00:00.000Z"),
  allocation("alc-008", "par-014", "prj-forestry-01", "proposed", "2026-10-12T06:00:00.000Z"),
  allocation("alc-009", "par-009", "prj-poultry-02", "withdrawn", "2026-09-04T06:00:00.000Z", "Withdrawn: participation cancelled (demo record)."),
  allocation("alc-010", "par-010", "prj-fish-02", "rejected", "2026-09-22T06:00:00.000Z", "Rejected: the project is in planning and cannot receive allocations (demo record)."),
];

// ---------------------------------------------------------------- Returns and payouts (fictional)
export const returnsFixture: ReturnRecord[] = [
  {
    id: "ret-001",
    investorId: "inv-003",
    participationId: "par-004",
    projectId: "prj-fish-01",
    periodFrom: "2026-08-27",
    periodTo: "2026-10-27",
    planId: "pln-005",
    planVersion: 1,
    calculatedAmountPaise: null,
    fictionalTestAmountPaise: null,
    calculationStatus: "formula_pending",
    reviewStatus: "pending_review",
    notes: [],
  },
  {
    id: "ret-002",
    investorId: "inv-002",
    participationId: "par-003",
    projectId: "prj-dairy-01",
    periodFrom: "2026-08-19",
    periodTo: "2026-10-19",
    planId: "pln-003",
    planVersion: 1,
    calculatedAmountPaise: null,
    fictionalTestAmountPaise: rupees(500),
    calculationStatus: "formula_pending",
    reviewStatus: "pending_review",
    notes: [{ id: "note-ret-002-1", at: "2026-10-20T06:00:00.000Z", by: ADMIN, body: "FICTIONAL TEST VALUE entered only to exercise the payout review screens. It is not a calculated or promised return." }],
  },
];

export const payoutsFixture: PayoutRecord[] = [
  {
    id: "pay-001",
    investorId: "inv-002",
    participationId: "par-003",
    returnRecordId: "ret-002",
    amountPaise: rupees(500),
    fictionalTest: true,
    currency: "INR",
    payoutType: "return_distribution",
    requestedAt: "2026-10-21T06:00:00.000Z",
    status: "requested",
    history: [{ at: "2026-10-21T06:00:00.000Z", by: ADMIN, from: null, to: "requested", note: "Fictional test payout record for UI testing." }],
  },
];

// ---------------------------------------------------------------- Documents (metadata only)
const doc = (
  id: string,
  entityType: InvestmentDocument["entityType"],
  entityId: string,
  docType: InvestmentDocument["docType"],
  fileName: string,
  uploadedAt: string,
  uploadedBy: string,
  visibility: InvestmentDocument["visibility"],
  reviewStatus: InvestmentDocument["reviewStatus"] = "not_reviewed",
  notes = "",
): InvestmentDocument => ({ id, entityType, entityId, docType, fileName, mimeType: fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg", sizeBytes: null, uploadedAt, uploadedBy, reviewStatus, notes, visibility, storage: "reference_only" });

export const documentsFixture: InvestmentDocument[] = [
  ...investorSpecs.slice(0, 16).map(([id, , , , , registeredAt], i) =>
    doc(`idoc-${String(i + 1).padStart(3, "0")}`, "application", `app-${String(i + 1).padStart(3, "0")}`, "investor_submitted", `identity-document-${id}.pdf`, registeredAt, "Investor (demo)", "private_investor", i < 12 ? "reviewed_manual" : "not_reviewed", "Demo file reference; no file content exists."),
  ),
  doc("idoc-017", "application", "app-017", "investor_submitted", "identity-document-inv-017.pdf", "2026-09-14T06:00:00.000Z", "Investor (demo)", "private_investor", "issue_noted", "Details did not match during manual review (demo)."),
  doc("idoc-018", "project", "prj-crop-01", "project_document", "organic-vegetable-cultivation-brief-SAMPLE.pdf", "2026-08-02T06:00:00.000Z", ADMIN, "internal", "reviewed_manual", "Illustrative project brief placeholder."),
  doc("idoc-019", "project", "prj-dairy-01", "project_document", "dairy-cattle-operations-brief-SAMPLE.pdf", "2026-08-02T06:00:00.000Z", ADMIN, "internal"),
  doc("idoc-020", "plan", "pln-003", "plan_terms", "standard-plan-terms-DRAFT-needs-clarification.pdf", "2026-08-01T06:00:00.000Z", ADMIN, "internal", "not_reviewed", "Draft placeholder. Financial terms are not approved."),
  doc("idoc-021", "transaction", "txn-002", "contribution_evidence", "investor-payment-reference-txn-002.jpg", "2026-10-03T07:30:00.000Z", "Investor (demo)", "private_investor", "not_reviewed", "Reference only. Not proof of payment."),
  doc("idoc-022", "transaction", "txn-013", "contribution_evidence", "investor-payment-reference-txn-013.pdf", "2026-10-16T07:00:00.000Z", "Investor (demo)", "private_investor", "not_reviewed", "Reference only. Not proof of payment."),
];

// ---------------------------------------------------------------- Business rules
const rule = (key: RuleKey, section: string, label: string, description: string, calculationLocked = false): BusinessRule => ({
  key,
  section,
  label,
  description,
  calculationLocked,
  currentVersion: 1,
  versions: [{ version: 1, status: "needs_clarification", value: null, approvalReference: null, recordedAt: SEED_AT, recordedBy: "Initial setup" }],
});

export const rulesFixture: BusinessRule[] = [
  rule("plans.financial_terms", "Standard contribution plans", "Plan financial terms", "Investment duration, minimum / maximum contributions and any terms attached to the five standard plans."),
  rule("eligibility.projects", "Project eligibility", "Plan–project eligibility", "Which projects or sectors each plan may be allocated to. Not assumed to be all 12 projects."),
  rule("contribution.validation", "Contribution validation", "Contribution rules", "Whether a contribution must equal the plan amount, whether it is collected before or after participation approval, and whether investors may hold several participations or combine plans."),
  rule("allocation.splitting", "Allocation rules", "Allocation splitting", "Whether one participation may be split between several projects. Until recorded, only a single approved allocation per participation is accepted."),
  rule("lifecycle.transitions", "Participation lifecycle", "Lifecycle conditions", "Conditions for activating, completing or cancelling a participation, and any contractual effect of each state."),
  rule("returns.formula", "Return calculation policy", "Return formula", "How returns are calculated, if at all. The demo never calculates returns, even after a reference is recorded.", true),
  rule("payouts.policy", "Payout policy", "Payout policy", "Payout frequency, types, principal treatment, early withdrawal, tax treatment and completion evidence. The demo never transfers money.", true),
  rule("applications.requirements", "Investor application workflow", "Application requirements", "Mandatory documents, KYC requirements and eligibility conditions for investor applications."),
  rule("documents.requirements", "Document requirements", "Document requirements", "Accepted document types, retention and review requirements for investment documents."),
  rule("notifications.alerts", "Notifications and administrative alerts", "Notifications", "Which events notify investors or administrators, and through which channels. No messaging provider is connected."),
];

// ---------------------------------------------------------------- Audit seed (derived from the histories above)
/** Audit events for the seeded history, derived from the fixture records so the two always agree. */
export function investmentAuditSeed(state: Pick<InvestmentState, "applications" | "participations" | "transactions" | "allocations" | "investors">): AuditEvent[] {
  const events: Omit<AuditEvent, "id">[] = [];
  const base = { actorId: "stf-001", actorName: ADMIN };
  for (const a of state.applications) {
    for (const h of a.history.filter((x) => x.by === ADMIN && (x.to === "approved" || x.to === "rejected" || x.to === "info_requested"))) {
      events.push({ ...base, at: h.at, action: `inv.application.${h.to === "info_requested" ? "request_info" : h.to === "approved" ? "approve" : "reject"}`, targetType: "investor_application", targetId: a.id, summary: `Application ${a.id} (${a.investorId}) ${h.to === "info_requested" ? "— additional information requested" : h.to}`, note: h.note, before: { status: h.from ?? "" }, after: { status: h.to } });
    }
  }
  for (const inv of state.investors.filter((i) => i.suspension)) {
    events.push({ ...base, at: inv.suspension!.at, action: "inv.investor.suspend", targetType: "investor", targetId: inv.id, summary: `Suspended investor account ${inv.id}`, note: inv.suspension!.reason, before: { accountStatus: "active" }, after: { accountStatus: "suspended" } });
  }
  for (const p of state.participations) {
    for (const h of p.history.filter((x) => x.by === ADMIN && ["approved", "active", "cancelled", "rejected"].includes(x.to))) {
      events.push({ ...base, at: h.at, action: `inv.participation.${h.to === "approved" ? "approve" : h.to === "active" ? "activate" : h.to === "cancelled" ? "cancel" : "reject"}`, targetType: "investment_participation", targetId: p.id, summary: `Participation ${p.id} → ${h.to}`, note: h.note, before: { status: h.from ?? "" }, after: { status: h.to } });
    }
  }
  for (const t of state.transactions) {
    for (const h of t.history.filter((x) => x.by === ADMIN && ["verified", "rejected", "refunded"].includes(x.to))) {
      events.push({ ...base, at: h.at, action: `inv.contribution.${h.to === "verified" ? "verify" : h.to === "rejected" ? "reject" : "refund_simulated"}`, targetType: "contribution", targetId: t.id, summary: `Contribution ${t.id} ${h.to === "refunded" ? "refunded (simulated)" : `${h.to} (demo)`}`, note: h.note, before: { status: h.from ?? "" }, after: { status: h.to } });
    }
  }
  for (const al of state.allocations) {
    events.push({ ...base, at: al.proposedAt, action: "inv.allocation.propose", targetType: "project_allocation", targetId: al.id, summary: `Proposed allocation of ${al.participationId} to ${al.projectId}`, after: { status: "proposed", amountPaise: String(al.proposedAmountPaise) } });
    if (al.decidedAt && al.status !== "proposed") {
      events.push({ ...base, at: al.decidedAt, action: `inv.allocation.${al.status === "approved" ? "approve" : al.status === "rejected" ? "reject" : "withdraw"}`, targetType: "project_allocation", targetId: al.id, summary: `Allocation ${al.id} ${al.status}`, note: al.decisionNote, before: { status: "proposed" }, after: { status: al.status } });
    }
  }
  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((e, i, all) => ({ id: `aud-inv-seed-${String(all.length - i).padStart(3, "0")}`, ...e }));
}

/** A fresh, independent copy of the full investment seed. */
export function createInvestmentState(): InvestmentState {
  return structuredClone({
    seedVersion: INVESTMENT_SEED_VERSION,
    sectors: sectorsFixture,
    projects: projectsFixture,
    plans: plansFixture,
    investors: investorsFixture,
    applications: applicationsFixture,
    participations: participationsFixture,
    allocations: allocationsFixture,
    transactions: transactionsFixture,
    returns: returnsFixture,
    payouts: payoutsFixture,
    documents: documentsFixture,
    rules: rulesFixture,
  });
}
