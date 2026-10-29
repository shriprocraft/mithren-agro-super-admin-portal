// Domain model for agricultural investment administration. Every entity is a SEPARATE record linked by
// stable IDs: an investor account is not an application, a participation is not a transaction, a
// proposed allocation is not an approved one. Money is integer paise; timestamps are ISO strings.
//
// Statuses are PROPOSED administrative states, not finalized business or legal rules. Anything whose
// rule Mithren Agro has not approved is stored as `null` and shown as "Needs clarification"
// (docs/INVESTMENT_MODULE.md, docs/NEEDS_CLARIFICATION.md Q-INV-*).
import type { ISODate, Paise } from "@/lib/types";

export interface Note {
  id: string;
  at: ISODate;
  by: string;
  body: string;
}

export interface StatusChange<S extends string = string> {
  at: ISODate;
  by: string;
  from: S | null;
  to: S;
  note?: string;
}

// ---------------------------------------------------------------- Sectors and projects
export interface AgriculturalSector {
  id: string;
  name: string;
  description: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "archived";

/** Operational metric definition for a project. `value` null = not recorded (never estimated). */
export interface OperationalMetric {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  /** Who entered the value and when; entered values are unverified administrative records. */
  recordedAt?: ISODate;
  recordedBy?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate: ISODate | null;
  status: "planned" | "in_progress" | "done";
  note?: string;
}

export interface AgriculturalProject {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  location: string;
  managerName: string | null;
  status: ProjectStatus;
  startDate: ISODate | null;
  /** null = not finalized ("Needs clarification"). */
  plannedDurationMonths: number | null;
  metrics: OperationalMetric[];
  milestones: ProjectMilestone[];
  notes: Note[];
  statusHistory: StatusChange<ProjectStatus>[];
  /** Fixture projects are illustrative demo records, not verified operating businesses. */
  illustrative: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---------------------------------------------------------------- Contribution plans
/**
 * One immutable version of a plan's contribution terms. Participations reference a plan ID AND a
 * version number, so changing a plan that is already in use creates a new version instead of
 * rewriting the terms an existing participation was created under.
 */
export interface ContributionPlanVersion {
  version: number;
  amountPaise: Paise;
  /** null = not finalized. Never defaulted. */
  durationMonths: number | null;
  minContributionPaise: Paise | null;
  maxContributionPaise: Paise | null;
  /** null = eligibility rules not finalized (NOT "all projects"). */
  eligibleSectorIds: string[] | null;
  effectiveFrom: ISODate | null;
  /** Financial terms (returns, payouts, maturity) are never stored here until approved. */
  termsStatus: "needs_clarification";
  createdAt: ISODate;
  createdBy: string;
  changeNote: string;
}

export interface ContributionPlan {
  id: string;
  name: string;
  currency: "INR";
  description: string;
  status: "active" | "disabled";
  notes: string;
  currentVersion: number;
  versions: ContributionPlanVersion[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---------------------------------------------------------------- Investors and applications
export interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  registeredAt: ISODate;
  accountStatus: "active" | "suspended";
  suspension?: { reason: string; at: ISODate; by: string };
  notes: Note[];
}

export type ApplicationStatus = "submitted" | "under_review" | "info_requested" | "approved" | "rejected";

export interface InvestorApplication {
  id: string;
  investorId: string;
  submittedAt: ISODate;
  status: ApplicationStatus;
  /** Manual review only. No external identity / KYC provider is connected. */
  reviewNotes: Note[];
  infoRequest?: { message: string; at: ISODate; by: string };
  rejectionReason?: string;
  decidedAt?: ISODate;
  decidedBy?: string;
  history: StatusChange<ApplicationStatus>[];
}

// ---------------------------------------------------------------- Participations and allocations
export type ParticipationStatus = "draft" | "submitted" | "awaiting_review" | "approved" | "active" | "completed" | "cancelled" | "rejected";

export interface InvestmentParticipation {
  id: string;
  investorId: string;
  planId: string;
  planVersion: number;
  /** Snapshot of the plan version's contribution amount when the participation was created. */
  amountPaise: Paise;
  createdAt: ISODate;
  updatedAt: ISODate;
  status: ParticipationStatus;
  notes: Note[];
  history: StatusChange<ParticipationStatus>[];
}

export type AllocationStatus = "proposed" | "approved" | "rejected" | "withdrawn";

export interface ProjectAllocation {
  id: string;
  participationId: string;
  projectId: string;
  proposedAmountPaise: Paise;
  /** Set only when approved. A proposal is never treated as approved. */
  approvedAmountPaise: Paise | null;
  status: AllocationStatus;
  proposedAt: ISODate;
  proposedBy: string;
  decidedAt?: ISODate;
  decidedBy?: string;
  decisionNote?: string;
  /** Version of the allocation-splitting rule in force when the decision was recorded. */
  ruleVersion?: number;
  notes: Note[];
}

// ---------------------------------------------------------------- Transactions
export type TransactionStatus =
  | "initiated"
  | "pending"
  | "successful"
  | "failed"
  | "under_verification"
  | "verified"
  | "rejected"
  | "refunded"
  | "partially_refunded";

export interface ContributionTransaction {
  /** Immutable transaction reference. */
  readonly id: string;
  readonly investorId: string;
  readonly participationId: string | null;
  readonly planId: string;
  readonly planVersion: number;
  readonly amountPaise: Paise;
  readonly currency: "INR";
  readonly type: "contribution";
  /** Payment method stated on the record; null when not available. */
  readonly method: "UPI" | "Bank transfer" | "Card" | null;
  /** Gateway / bank reference. Always null in the demo: no provider is connected. */
  readonly providerReference: string | null;
  readonly initiatedAt: ISODate;
  status: TransactionStatus;
  failureReason?: string;
  verification?: { at: ISODate; by: string; note?: string };
  rejection?: { at: ISODate; by: string; reason: string };
  refunds: { id: string; at: ISODate; by: string; amountPaise: Paise; reason: string }[];
  discrepancies: Note[];
  history: StatusChange<TransactionStatus>[];
}

// ---------------------------------------------------------------- Returns and payouts
export interface ReturnRecord {
  id: string;
  investorId: string;
  participationId: string;
  projectId: string | null;
  periodFrom: ISODate;
  periodTo: ISODate;
  planId: string;
  planVersion: number;
  /** Always null: no return formula has been approved. */
  calculatedAmountPaise: null;
  /** A conspicuously labelled FICTIONAL test value used only to exercise the review UI. */
  fictionalTestAmountPaise: Paise | null;
  calculationStatus: "formula_pending";
  reviewStatus: "pending_review" | "reviewed" | "rejected";
  review?: { at: ISODate; by: string; note: string };
  notes: Note[];
}

export type PayoutStatus = "requested" | "approved_unpaid" | "rejected" | "paid_simulated" | "failed";

export interface PayoutRecord {
  id: string;
  investorId: string;
  participationId: string;
  returnRecordId: string | null;
  /** Fictional test amount; null when it cannot be determined (no approved formula). */
  amountPaise: Paise | null;
  fictionalTest: boolean;
  currency: "INR";
  /** Payout types are not finalized; recorded as entered. */
  payoutType: "return_distribution";
  requestedAt: ISODate;
  status: PayoutStatus;
  approval?: { at: ISODate; by: string; note?: string };
  rejection?: { at: ISODate; by: string; reason: string };
  completion?: { at: ISODate; by: string; reference: string; evidenceDocumentId: string };
  failureReason?: string;
  history: StatusChange<PayoutStatus>[];
}

// ---------------------------------------------------------------- Documents
export type InvestmentEntityType = "investor" | "application" | "project" | "plan" | "participation" | "transaction" | "return" | "payout";

export type InvestmentDocumentType =
  | "project_document"
  | "project_progress_report"
  | "investor_submitted"
  | "plan_terms"
  | "contribution_evidence"
  | "transaction_evidence"
  | "return_calculation"
  | "payout_evidence"
  | "administrative_approval";

export interface InvestmentDocument {
  id: string;
  entityType: InvestmentEntityType;
  entityId: string;
  docType: InvestmentDocumentType;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: ISODate;
  uploadedBy: string;
  reviewStatus: "not_reviewed" | "reviewed_manual" | "issue_noted";
  reviewNote?: string;
  notes: string;
  /** Private investor documents need the "view investor documents" permission. */
  visibility: "private_investor" | "internal";
  /** The demo stores metadata only; no file content is uploaded anywhere. */
  storage: "reference_only";
}

// ---------------------------------------------------------------- Settings (business rules)
export type RuleKey =
  | "plans.financial_terms"
  | "eligibility.projects"
  | "contribution.validation"
  | "allocation.splitting"
  | "lifecycle.transitions"
  | "returns.formula"
  | "payouts.policy"
  | "applications.requirements"
  | "documents.requirements"
  | "notifications.alerts";

export interface RuleVersion {
  version: number;
  status: "needs_clarification" | "recorded";
  /** Free text, or for allocation.splitting one of "single_project" | "multi_project". */
  value: string | null;
  approvalReference: string | null;
  recordedAt: ISODate;
  recordedBy: string;
}

export interface BusinessRule {
  key: RuleKey;
  section: string;
  label: string;
  description: string;
  /** Rules that the demo will never apply as a calculation even if recorded (returns, payouts). */
  calculationLocked: boolean;
  currentVersion: number;
  versions: RuleVersion[];
}

// ---------------------------------------------------------------- Root
export interface InvestmentState {
  /** Seed marker so repeated seeding never duplicates records. */
  seedVersion: number;
  sectors: AgriculturalSector[];
  projects: AgriculturalProject[];
  plans: ContributionPlan[];
  investors: Investor[];
  applications: InvestorApplication[];
  participations: InvestmentParticipation[];
  allocations: ProjectAllocation[];
  transactions: ContributionTransaction[];
  returns: ReturnRecord[];
  payouts: PayoutRecord[];
  documents: InvestmentDocument[];
  rules: BusinessRule[];
}
