// Mock investment-administration actions. Same contract as ./actions.ts: pure (db, payload, ctx) →
// new db or a refusal, and every successful change prepends an audit event (actor, action, entity,
// timestamp, reason, before/after).
//
// Safeguards applied here (not just in the UI):
// - a permission check on every action (src/lib/investment/permissions.ts);
// - only the documented transitions are accepted; anything else is refused;
// - completed financial history is never rewritten or deleted (transactions are immutable apart from
//   their status trail; plans are versioned; allocations keep their decisions);
// - repeating an operation (double click) is refused instead of applied twice;
// - nothing here moves money: verification, refunds and payouts are SIMULATED records.
import { formatINR, humanize } from "@/lib/format";
import { can, PERMISSION_DENIED, type InvestmentPermission } from "@/lib/investment/permissions";
import { allocationTotals, byId, currentVersion, isVerified, liveAllocations, planParticipationCount, refundedPaise } from "@/lib/investment/selectors";
import type {
  AgriculturalProject,
  ApplicationStatus,
  BusinessRule,
  ContributionPlan,
  ContributionTransaction,
  InvestmentDocument,
  InvestmentEntityType,
  InvestmentParticipation,
  InvestmentState,
  Note,
  ParticipationStatus,
  PayoutRecord,
  ProjectStatus,
  RuleKey,
  StatusChange,
  TransactionStatus,
} from "@/lib/investment/types";
import type { AuditTargetType, DemoDb } from "@/lib/types";
import { EMAIL, fail, replace, required, withAudit, type ActionContext, type ActionResult, type MockAction } from "./actions";
import { metricsForSector } from "./fixtures/investment";

type AuditEntry = { action: string; targetType: AuditTargetType; targetId: string; summary: string; note?: string; before?: Record<string, string>; after?: Record<string, string> };

/** Applies an investment-state change together with its audit event. */
function commit(db: DemoDb, ctx: ActionContext, investment: InvestmentState, message: string, entry: AuditEntry): ActionResult {
  return { ok: true, message, db: { ...db, investment, audit: withAudit(db, ctx, entry) } };
}

const denied = (db: DemoDb, ctx: ActionContext, permission: InvestmentPermission) => !can(db, ctx.actor.id, permission, ctx.roleCap);
const note = (ctx: ActionContext, body: string): Note => ({ id: ctx.newId("note"), at: ctx.now, by: ctx.actor.name, body: body.trim() });
const change = <S extends string>(ctx: ActionContext, from: S, to: S, text?: string): StatusChange<S> => ({ at: ctx.now, by: ctx.actor.name, from, to, note: text?.trim() || undefined });
const MAX_NOTE = 1000;
const tooLong = (text: string) => (text.trim().length > MAX_NOTE ? `Keep this to ${MAX_NOTE} characters or fewer.` : null);

/** Whole rupees → paise, or an error message. */
function rupeesToPaise(value: number, label: string): number | string {
  if (!Number.isFinite(value) || value <= 0) return `Enter a valid ${label} in INR.`;
  if (!Number.isInteger(value)) return `Enter the ${label} in whole rupees.`;
  if (value > 10_00_00_000) return `The ${label} is too large.`;
  return value * 100;
}

// ================================================================ Investors
export const INDIAN_MOBILE = /^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;

export const updateInvestorProfile: MockAction<{ investorId: string; name: string; email: string; phone: string; city: string }> = (db, input, ctx) => {
  if (denied(db, ctx, "inv.investors.edit")) return fail(PERMISSION_DENIED);
  const inv = byId(db.investment.investors, input.investorId);
  if (!inv) return fail("Investor not found.");
  const next = { name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim(), city: input.city.trim() };
  if (!next.name) return fail("Enter the investor's name.");
  if (!EMAIL.test(next.email)) return fail("Enter a valid email address.");
  if (!INDIAN_MOBILE.test(next.phone)) return fail("Enter a valid 10-digit mobile number.");
  if (!next.city) return fail("Enter the investor's city.");
  const keys = (Object.keys(next) as (keyof typeof next)[]).filter((k) => inv[k] !== next[k]);
  if (!keys.length) return fail("No changes to save.");
  // Contact details are not copied into the audit log; only which fields changed.
  const safe = (o: Record<string, string>) => Object.fromEntries(keys.map((k) => [k, k === "email" || k === "phone" ? "(changed)" : (o[k] ?? "")]));
  return commit(db, ctx, { ...db.investment, investors: replace(db.investment.investors, inv.id, { ...inv, ...next }) }, "Investor profile updated (demo).", {
    action: "inv.investor.update",
    targetType: "investor",
    targetId: inv.id,
    summary: `Updated investor profile fields: ${keys.join(", ")}`,
    before: safe(inv as unknown as Record<string, string>),
    after: safe(next),
  });
};

export const suspendInvestor: MockAction<{ investorId: string; reason: string }> = (db, { investorId, reason }, ctx) => {
  if (denied(db, ctx, "inv.investors.edit")) return fail(PERMISSION_DENIED);
  const inv = byId(db.investment.investors, investorId);
  if (!inv) return fail("Investor not found.");
  if (inv.accountStatus === "suspended") return fail("This investor account is already suspended.");
  const err = required(reason, "A suspension reason") ?? tooLong(reason);
  if (err) return fail(err);
  // Financial history is untouched: participations, transactions and allocations are kept as they are.
  return commit(db, ctx, { ...db.investment, investors: replace(db.investment.investors, inv.id, { ...inv, accountStatus: "suspended", suspension: { reason: reason.trim(), at: ctx.now, by: ctx.actor.name } }) }, `${inv.name}'s investor account is suspended (demo). Financial history is preserved.`, {
    action: "inv.investor.suspend",
    targetType: "investor",
    targetId: inv.id,
    summary: `Suspended investor account ${inv.id}`,
    note: reason.trim(),
    before: { accountStatus: "active" },
    after: { accountStatus: "suspended" },
  });
};

export const reactivateInvestor: MockAction<{ investorId: string; note?: string }> = (db, { investorId, note: text }, ctx) => {
  if (denied(db, ctx, "inv.investors.edit")) return fail(PERMISSION_DENIED);
  const inv = byId(db.investment.investors, investorId);
  if (!inv) return fail("Investor not found.");
  if (inv.accountStatus !== "suspended") return fail("This investor account is not suspended.");
  const { suspension: _removed, ...rest } = inv;
  void _removed;
  return commit(db, ctx, { ...db.investment, investors: replace(db.investment.investors, inv.id, { ...rest, accountStatus: "active" }) }, `${inv.name}'s investor account is reactivated (demo).`, {
    action: "inv.investor.reactivate",
    targetType: "investor",
    targetId: inv.id,
    summary: `Reactivated investor account ${inv.id}`,
    note: text?.trim() || undefined,
    before: { accountStatus: "suspended" },
    after: { accountStatus: "active" },
  });
};

export const addInvestorNote: MockAction<{ investorId: string; body: string }> = (db, { investorId, body }, ctx) => {
  if (denied(db, ctx, "inv.investors.edit")) return fail(PERMISSION_DENIED);
  const inv = byId(db.investment.investors, investorId);
  if (!inv) return fail("Investor not found.");
  const err = required(body, "Note") ?? tooLong(body);
  if (err) return fail(err);
  return commit(db, ctx, { ...db.investment, investors: replace(db.investment.investors, inv.id, { ...inv, notes: [...inv.notes, note(ctx, body)] }) }, "Internal note added.", {
    action: "inv.investor.note",
    targetType: "investor",
    targetId: inv.id,
    summary: `Added an internal note to investor ${inv.id}`,
  });
};

// ================================================================ Applications
const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  submitted: ["under_review", "info_requested", "rejected"],
  under_review: ["approved", "info_requested", "rejected"],
  info_requested: ["under_review", "rejected"],
  approved: [],
  rejected: [],
};

export const transitionApplication: MockAction<{ applicationId: string; to: ApplicationStatus; reason?: string }> = (db, { applicationId, to, reason }, ctx) => {
  if (denied(db, ctx, "inv.applications.review")) return fail(PERMISSION_DENIED);
  const app = byId(db.investment.applications, applicationId);
  if (!app) return fail("Application not found.");
  if (app.status === to) return fail(`This application is already "${humanize(to)}".`);
  if (!APPLICATION_TRANSITIONS[app.status].includes(to)) return fail(`An application that is "${humanize(app.status)}" cannot move to "${humanize(to)}".`);
  if (to === "rejected" && !reason?.trim()) return fail("Provide a reason before rejecting this application.");
  if (to === "info_requested" && !reason?.trim()) return fail("Describe the additional information required.");
  if (reason) {
    const err = tooLong(reason);
    if (err) return fail(err);
  }
  const decided = to === "approved" || to === "rejected";
  const next = {
    ...app,
    status: to,
    history: [...app.history, change(ctx, app.status, to, reason)],
    rejectionReason: to === "rejected" ? reason!.trim() : app.rejectionReason,
    infoRequest: to === "info_requested" ? { message: reason!.trim(), at: ctx.now, by: ctx.actor.name } : app.infoRequest,
    decidedAt: decided ? ctx.now : app.decidedAt,
    decidedBy: decided ? ctx.actor.name : app.decidedBy,
  };
  const verb: Record<ApplicationStatus, string> = { under_review: "moved to review", info_requested: "additional information requested", approved: "approved", rejected: "rejected", submitted: "submitted" };
  return commit(db, ctx, { ...db.investment, applications: replace(db.investment.applications, app.id, next) }, `Investor application ${verb[to]}.`, {
    action: `inv.application.${to === "under_review" ? "start_review" : to === "info_requested" ? "request_info" : to === "approved" ? "approve" : "reject"}`,
    targetType: "investor_application",
    targetId: app.id,
    summary: `Application ${app.id} (${app.investorId}) ${verb[to]}`,
    note: reason?.trim() || undefined,
    before: { status: app.status },
    after: { status: to },
  });
};

export const addApplicationNote: MockAction<{ applicationId: string; body: string }> = (db, { applicationId, body }, ctx) => {
  if (denied(db, ctx, "inv.applications.review")) return fail(PERMISSION_DENIED);
  const app = byId(db.investment.applications, applicationId);
  if (!app) return fail("Application not found.");
  const err = required(body, "Review note") ?? tooLong(body);
  if (err) return fail(err);
  return commit(db, ctx, { ...db.investment, applications: replace(db.investment.applications, app.id, { ...app, reviewNotes: [...app.reviewNotes, note(ctx, body)] }) }, "Review note recorded.", {
    action: "inv.application.note",
    targetType: "investor_application",
    targetId: app.id,
    summary: `Added a review note to application ${app.id}`,
  });
};

// ================================================================ Sectors
export const updateSector: MockAction<{ sectorId: string; name: string; description: string }> = (db, { sectorId, name, description }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const sector = byId(db.investment.sectors, sectorId);
  if (!sector) return fail("Sector not found.");
  const n = name.trim();
  if (!n) return fail("Enter the sector name.");
  if (!description.trim()) return fail("Enter a sector description.");
  if (db.investment.sectors.some((s) => s.id !== sectorId && s.name.toLowerCase() === n.toLowerCase())) return fail(`A sector named "${n}" already exists.`);
  if (n === sector.name && description.trim() === sector.description) return fail("No changes to save.");
  return commit(db, ctx, { ...db.investment, sectors: replace(db.investment.sectors, sectorId, { ...sector, name: n, description: description.trim(), updatedAt: ctx.now }) }, "Sector details updated.", {
    action: "inv.sector.update",
    targetType: "investment_sector",
    targetId: sectorId,
    summary: `Updated sector ${sectorId}`,
    before: { name: sector.name, description: sector.description },
    after: { name: n, description: description.trim() },
  });
};

// ================================================================ Projects
export interface ProjectInput {
  id?: string;
  sectorId: string;
  name: string;
  description: string;
  location: string;
  managerName: string;
  startDate: string;
  plannedDurationMonths: number | null;
}

export function validateProject(db: DemoDb, input: ProjectInput): Partial<Record<keyof ProjectInput, string>> {
  const errors: Partial<Record<keyof ProjectInput, string>> = {};
  if (!byId(db.investment.sectors, input.sectorId)) errors.sectorId = "Select an agricultural sector.";
  if (!input.name.trim()) errors.name = "Enter the project name.";
  else if (input.name.trim().length > 100) errors.name = "Keep the project name to 100 characters or fewer.";
  else if (db.investment.projects.some((p) => p.id !== input.id && p.sectorId === input.sectorId && p.name.trim().toLowerCase() === input.name.trim().toLowerCase())) errors.name = "A project with this name already exists in the sector.";
  if (!input.description.trim()) errors.description = "Enter a project description.";
  if (!input.location.trim()) errors.location = "Enter the project location.";
  if (input.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) errors.startDate = "Enter a valid start date.";
  if (input.plannedDurationMonths !== null && (!Number.isInteger(input.plannedDurationMonths) || input.plannedDurationMonths < 1 || input.plannedDurationMonths > 600)) errors.plannedDurationMonths = "Enter a whole number of months between 1 and 600, or leave it blank.";
  return errors;
}

export const saveProject: MockAction<ProjectInput> = (db, input, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const errors = Object.values(validateProject(db, input));
  if (errors.length) return fail(errors[0]!);
  const existing = input.id ? byId(db.investment.projects, input.id) : undefined;
  if (input.id && !existing) return fail("Project not found.");
  if (existing && existing.sectorId !== input.sectorId && db.investment.allocations.some((a) => a.projectId === existing.id)) return fail("A project with allocation history cannot move to another sector.");
  const fields = {
    sectorId: input.sectorId,
    name: input.name.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    managerName: input.managerName.trim() || null,
    startDate: input.startDate || null,
    plannedDurationMonths: input.plannedDurationMonths,
  };
  if (existing) {
    const keys = (Object.keys(fields) as (keyof typeof fields)[]).filter((k) => existing[k] !== fields[k]);
    if (!keys.length) return fail("No changes to save.");
    const pick = (o: Record<string, unknown>) => Object.fromEntries(keys.map((k) => [k, o[k] === null || o[k] === undefined ? "—" : String(o[k])]));
    const metrics = existing.sectorId === fields.sectorId ? existing.metrics : metricsForSector(fields.sectorId);
    return commit(db, ctx, { ...db.investment, projects: replace(db.investment.projects, existing.id, { ...existing, ...fields, metrics, updatedAt: ctx.now }) }, "Project details updated.", {
      action: keys.includes("managerName") && keys.length === 1 ? "inv.project.assign_manager" : "inv.project.update",
      targetType: "investment_project",
      targetId: existing.id,
      summary: `Updated project ${existing.id}: ${keys.join(", ")}`,
      before: pick(existing as unknown as Record<string, unknown>),
      after: pick(fields),
    });
  }
  const id = ctx.newId("prj");
  const created: AgriculturalProject = {
    id,
    ...fields,
    status: "planning",
    metrics: metricsForSector(fields.sectorId),
    milestones: [],
    notes: [],
    statusHistory: [{ at: ctx.now, by: ctx.actor.name, from: null, to: "planning", note: "Created" }],
    illustrative: false,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  return commit(db, ctx, { ...db.investment, projects: [...db.investment.projects, created] }, `Project "${created.name}" created in planning status.`, {
    action: "inv.project.create",
    targetType: "investment_project",
    targetId: id,
    summary: `Created project ${created.name}`,
    after: { sectorId: created.sectorId, status: "planning" },
  });
};

const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  planning: ["active", "on_hold", "archived"],
  active: ["on_hold", "archived"],
  on_hold: ["active", "archived"],
  archived: [],
};

export const setProjectStatus: MockAction<{ projectId: string; status: ProjectStatus; reason: string }> = (db, { projectId, status, reason }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.projects, projectId);
  if (!p) return fail("Project not found.");
  if (p.status === status) return fail(`The project is already "${humanize(status)}".`);
  if (!PROJECT_TRANSITIONS[p.status].includes(status)) return fail(p.status === "archived" ? "Archived projects cannot be reopened in this demo." : `A "${humanize(p.status)}" project cannot move to "${humanize(status)}".`);
  const err = required(reason, "A reason for the status change") ?? tooLong(reason);
  if (err) return fail(err);
  // Existing allocations (approved or proposed) are left untouched: history is never rewritten.
  return commit(
    db,
    ctx,
    { ...db.investment, projects: replace(db.investment.projects, p.id, { ...p, status, statusHistory: [...p.statusHistory, change(ctx, p.status, status, reason)], updatedAt: ctx.now }) },
    status === "archived" ? "Project archived. Its allocation and contribution history is preserved." : `Project status changed to ${humanize(status)}.`,
    { action: status === "archived" ? "inv.project.archive" : "inv.project.status", targetType: "investment_project", targetId: p.id, summary: `Project ${p.id} status ${p.status} → ${status}`, note: reason.trim(), before: { status: p.status }, after: { status } },
  );
};

/** Hard delete, only for a project created in this demo that has no participation, allocation or document history. */
export const deleteProject: MockAction<{ projectId: string }> = (db, { projectId }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.projects, projectId);
  if (!p) return fail("Project not found.");
  if (p.illustrative) return fail("The initial sector projects cannot be deleted. Archive the project instead.");
  if (db.investment.allocations.some((a) => a.projectId === projectId) || db.investment.returns.some((r) => r.projectId === projectId)) return fail("This project has allocation or financial history and cannot be deleted. Archive it instead.");
  if (db.investment.documents.some((d) => d.entityType === "project" && d.entityId === projectId)) return fail("This project has documents attached and cannot be deleted. Archive it instead.");
  return commit(db, ctx, { ...db.investment, projects: db.investment.projects.filter((x) => x.id !== projectId) }, `Project "${p.name}" deleted.`, {
    action: "inv.project.delete",
    targetType: "investment_project",
    targetId: projectId,
    summary: `Deleted project ${p.name} (no history)`,
    before: { name: p.name, status: p.status },
  });
};

export const updateProjectMetrics: MockAction<{ projectId: string; values: Record<string, number | null> }> = (db, { projectId, values }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.projects, projectId);
  if (!p) return fail("Project not found.");
  const changed = p.metrics.filter((m) => m.key in values && values[m.key] !== m.value);
  for (const m of changed) {
    const v = values[m.key];
    if (v !== null && v !== undefined && (!Number.isFinite(v) || v < 0)) return fail(`Enter a valid, non-negative value for ${m.label}.`);
  }
  if (!changed.length) return fail("No changes to save.");
  const metrics = p.metrics.map((m) => (changed.includes(m) ? { ...m, value: values[m.key] ?? null, recordedAt: ctx.now, recordedBy: ctx.actor.name } : m));
  return commit(db, ctx, { ...db.investment, projects: replace(db.investment.projects, p.id, { ...p, metrics, updatedAt: ctx.now }) }, "Operational metadata recorded (unverified administrative entry).", {
    action: "inv.project.metrics",
    targetType: "investment_project",
    targetId: p.id,
    summary: `Recorded operational metadata for ${p.id}`,
    before: Object.fromEntries(changed.map((m) => [m.key, m.value === null ? "not recorded" : String(m.value)])),
    after: Object.fromEntries(changed.map((m) => [m.key, values[m.key] === null ? "not recorded" : String(values[m.key])])),
  });
};

export const addMilestone: MockAction<{ projectId: string; title: string; targetDate: string }> = (db, { projectId, title, targetDate }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.projects, projectId);
  if (!p) return fail("Project not found.");
  if (p.status === "archived") return fail("Milestones cannot be added to an archived project.");
  const err = required(title, "Milestone title");
  if (err) return fail(err);
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return fail("Enter a valid target date.");
  const milestone = { id: ctx.newId("mil"), title: title.trim(), targetDate: targetDate || null, status: "planned" as const };
  return commit(db, ctx, { ...db.investment, projects: replace(db.investment.projects, p.id, { ...p, milestones: [...p.milestones, milestone], updatedAt: ctx.now }) }, "Milestone added.", {
    action: "inv.project.milestone_add",
    targetType: "investment_project",
    targetId: p.id,
    summary: `Added milestone "${milestone.title}" to ${p.id}`,
    after: { targetDate: milestone.targetDate ?? "—" },
  });
};

export const setMilestoneStatus: MockAction<{ projectId: string; milestoneId: string; status: "planned" | "in_progress" | "done" }> = (db, { projectId, milestoneId, status }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.projects, projectId);
  const m = p?.milestones.find((x) => x.id === milestoneId);
  if (!p || !m) return fail("Milestone not found.");
  if (m.status === status) return fail("No change.");
  return commit(db, ctx, { ...db.investment, projects: replace(db.investment.projects, p.id, { ...p, milestones: p.milestones.map((x) => (x.id === milestoneId ? { ...x, status } : x)), updatedAt: ctx.now }) }, "Milestone updated.", {
    action: "inv.project.milestone_status",
    targetType: "investment_project",
    targetId: p.id,
    summary: `Milestone "${m.title}" ${m.status} → ${status}`,
    before: { status: m.status },
    after: { status },
  });
};

export const addProjectNote: MockAction<{ projectId: string; body: string }> = (db, { projectId, body }, ctx) => {
  if (denied(db, ctx, "inv.projects.manage")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.projects, projectId);
  if (!p) return fail("Project not found.");
  const err = required(body, "Update note") ?? tooLong(body);
  if (err) return fail(err);
  return commit(db, ctx, { ...db.investment, projects: replace(db.investment.projects, p.id, { ...p, notes: [...p.notes, note(ctx, body)], updatedAt: ctx.now }) }, "Project update recorded.", {
    action: "inv.project.note",
    targetType: "investment_project",
    targetId: p.id,
    summary: `Added an update note to ${p.id}`,
  });
};

// ================================================================ Plans
export interface PlanInput {
  id?: string;
  name: string;
  description: string;
  notes: string;
  amountRupees: number;
  /** Required when the change creates a new version. */
  changeNote: string;
  /** Must be true to version a plan that existing participations already reference. */
  confirmNewVersion?: boolean;
}

export const savePlan: MockAction<PlanInput> = (db, input, ctx) => {
  if (denied(db, ctx, "inv.plans.manage")) return fail(PERMISSION_DENIED);
  const name = input.name.trim();
  if (!name) return fail("Enter the plan name.");
  if (!input.description.trim()) return fail("Enter a plan description.");
  const amount = rupeesToPaise(input.amountRupees, "contribution amount");
  if (typeof amount === "string") return fail(amount);
  const plans = db.investment.plans;
  const existing = input.id ? byId(plans, input.id) : undefined;
  if (input.id && !existing) return fail("Plan not found.");
  if (plans.some((p) => p.id !== input.id && p.name.trim().toLowerCase() === name.toLowerCase())) return fail("A plan with this name already exists.");
  if (plans.some((p) => p.id !== input.id && currentVersion(p).amountPaise === amount)) return fail(`A standard plan for ${formatINR(amount)} already exists.`);

  if (!existing) {
    const id = ctx.newId("pln");
    const plan: ContributionPlan = {
      id,
      name,
      currency: "INR",
      description: input.description.trim(),
      status: "active",
      notes: input.notes.trim(),
      currentVersion: 1,
      versions: [{ version: 1, amountPaise: amount, durationMonths: null, minContributionPaise: null, maxContributionPaise: null, eligibleSectorIds: null, effectiveFrom: null, termsStatus: "needs_clarification", createdAt: ctx.now, createdBy: ctx.actor.name, changeNote: input.changeNote.trim() || "Created" }],
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    return commit(db, ctx, { ...db.investment, plans: [...plans, plan] }, "Contribution plan saved.", { action: "inv.plan.create", targetType: "investment_plan", targetId: id, summary: `Created plan ${name}`, after: { amountPaise: String(amount), version: "1" } });
  }

  const current = currentVersion(existing);
  const amountChanged = current.amountPaise !== amount;
  const metaChanged = existing.name !== name || existing.description !== input.description.trim() || existing.notes !== input.notes.trim();
  if (!amountChanged && !metaChanged) return fail("No changes to save.");
  let next: ContributionPlan = { ...existing, name, description: input.description.trim(), notes: input.notes.trim(), updatedAt: ctx.now };
  if (amountChanged) {
    const referenced = planParticipationCount(db.investment, existing.id) > 0;
    if (referenced && !input.confirmNewVersion) return fail("This plan is already referenced by existing participations. Confirm that a new plan version should be created; existing participations keep their original terms.");
    if (!input.changeNote.trim()) return fail("Explain the reason for changing the contribution amount.");
    const version = Math.max(...existing.versions.map((v) => v.version)) + 1;
    next = { ...next, currentVersion: version, versions: [...existing.versions, { ...current, version, amountPaise: amount, createdAt: ctx.now, createdBy: ctx.actor.name, changeNote: input.changeNote.trim() }] };
  }
  return commit(db, ctx, { ...db.investment, plans: replace(plans, existing.id, next) }, amountChanged ? `Contribution plan saved as version ${next.currentVersion}. Earlier participations keep version ${current.version}.` : "Contribution plan saved.", {
    action: "inv.plan.update",
    targetType: "investment_plan",
    targetId: existing.id,
    summary: amountChanged ? `Created version ${next.currentVersion} of plan ${existing.id}` : `Updated plan ${existing.id} details`,
    note: amountChanged ? input.changeNote.trim() : undefined,
    before: amountChanged ? { amountPaise: String(current.amountPaise), version: String(current.version) } : { name: existing.name },
    after: amountChanged ? { amountPaise: String(amount), version: String(next.currentVersion) } : { name },
  });
};

export const setPlanStatus: MockAction<{ planId: string; status: "active" | "disabled"; reason?: string }> = (db, { planId, status, reason }, ctx) => {
  if (denied(db, ctx, "inv.plans.manage")) return fail(PERMISSION_DENIED);
  const plan = byId(db.investment.plans, planId);
  if (!plan) return fail("Plan not found.");
  if (plan.status === status) return fail(`The plan is already ${status === "active" ? "enabled" : "disabled"}.`);
  if (status === "disabled" && !reason?.trim()) return fail("Provide a reason for disabling this plan.");
  return commit(db, ctx, { ...db.investment, plans: replace(db.investment.plans, planId, { ...plan, status, updatedAt: ctx.now }) }, status === "disabled" ? "Plan disabled. Existing participations keep their plan version." : "Plan enabled.", {
    action: status === "disabled" ? "inv.plan.disable" : "inv.plan.enable",
    targetType: "investment_plan",
    targetId: planId,
    summary: `${status === "disabled" ? "Disabled" : "Enabled"} plan ${plan.name}`,
    note: reason?.trim() || undefined,
    before: { status: plan.status },
    after: { status },
  });
};

// ================================================================ Participations
function investorEligible(state: InvestmentState, investorId: string): string | null {
  const inv = byId(state.investors, investorId);
  if (!inv) return "Investor not found.";
  if (inv.accountStatus === "suspended") return "This investor account is suspended. New activity is blocked until it is reactivated.";
  const approved = state.applications.some((a) => a.investorId === investorId && a.status === "approved");
  if (!approved) return "The investor's application has not been approved.";
  return null;
}

export const createParticipation: MockAction<{ investorId: string; planId: string; note?: string }> = (db, { investorId, planId, note: text }, ctx) => {
  if (denied(db, ctx, "inv.participations.approve")) return fail(PERMISSION_DENIED);
  const err = investorEligible(db.investment, investorId);
  if (err) return fail(err);
  const plan = byId(db.investment.plans, planId);
  if (!plan) return fail("Select a contribution plan.");
  if (plan.status !== "active") return fail("This plan is disabled and cannot be used for new participations.");
  const v = currentVersion(plan);
  const id = ctx.newId("par");
  const p: InvestmentParticipation = { id, investorId, planId, planVersion: v.version, amountPaise: v.amountPaise, createdAt: ctx.now, updatedAt: ctx.now, status: "draft", notes: text?.trim() ? [note(ctx, text)] : [], history: [{ at: ctx.now, by: ctx.actor.name, from: null, to: "draft", note: "Recorded by an administrator" }] };
  return commit(db, ctx, { ...db.investment, participations: [...db.investment.participations, p] }, `Draft participation ${id} recorded for ${formatINR(v.amountPaise)} (plan version ${v.version}).`, {
    action: "inv.participation.create",
    targetType: "investment_participation",
    targetId: id,
    summary: `Recorded draft participation for ${investorId} on ${planId} v${v.version}`,
    after: { status: "draft", amountPaise: String(v.amountPaise) },
  });
};

const PARTICIPATION_TRANSITIONS: Record<ParticipationStatus, readonly ParticipationStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["awaiting_review", "approved", "rejected", "cancelled"],
  awaiting_review: ["approved", "rejected", "cancelled"],
  approved: ["active", "cancelled"],
  // Completion conditions are not approved (Q-INV-LIFECYCLE), so active → completed is not offered.
  active: [],
  completed: [],
  cancelled: [],
  rejected: [],
};
export const participationNextStates = (s: ParticipationStatus) => PARTICIPATION_TRANSITIONS[s];

export const transitionParticipation: MockAction<{ participationId: string; to: ParticipationStatus; reason?: string }> = (db, { participationId, to, reason }, ctx) => {
  if (denied(db, ctx, "inv.participations.approve")) return fail(PERMISSION_DENIED);
  const state = db.investment;
  const p = byId(state.participations, participationId);
  if (!p) return fail("Participation not found.");
  if (p.status === to) return fail(`This participation is already "${humanize(to)}".`);
  if (to === "completed") return fail("Completion conditions need clarification, so participations cannot be completed in this demo.");
  if (!PARTICIPATION_TRANSITIONS[p.status].includes(to)) return fail(`A "${humanize(p.status)}" participation cannot move to "${humanize(to)}".`);
  if ((to === "rejected" || to === "cancelled") && !reason?.trim()) return fail(`Provide a reason before ${to === "rejected" ? "rejecting" : "cancelling"} this participation.`);
  if (to === "approved" || to === "active") {
    const err = investorEligible(state, p.investorId);
    if (err) return fail(err);
  }
  const txns = state.transactions.filter((t) => t.participationId === p.id);
  if (to === "active") {
    const verified = txns.filter(isVerified).reduce((s, t) => s + t.amountPaise - refundedPaise(t), 0);
    if (verified !== p.amountPaise) return fail(`Activation needs verified contributions equal to ${formatINR(p.amountPaise)}; ${formatINR(verified)} is verified.`);
  }
  if (to === "cancelled" && txns.some((t) => isVerified(t) && refundedPaise(t) < t.amountPaise)) return fail("This participation has verified contributions that are not refunded. Resolve them on the Contributions page before cancelling.");
  // Proposed allocations cannot proceed once a participation is rejected or cancelled; they are withdrawn (recorded, not deleted).
  const withdrawn = to === "rejected" || to === "cancelled" ? state.allocations.filter((a) => a.participationId === p.id && a.status === "proposed") : [];
  const allocations = withdrawn.length ? state.allocations.map((a) => (withdrawn.includes(a) ? { ...a, status: "withdrawn" as const, decidedAt: ctx.now, decidedBy: ctx.actor.name, decisionNote: `Withdrawn: participation ${to}.` } : a)) : state.allocations;
  const next = { ...p, status: to, updatedAt: ctx.now, history: [...p.history, change(ctx, p.status, to, reason)] };
  return commit(db, ctx, { ...state, participations: replace(state.participations, p.id, next), allocations }, `Participation ${p.id} is now ${humanize(to).toLowerCase()} (demo).${withdrawn.length ? ` ${withdrawn.length} proposed allocation(s) withdrawn.` : ""}`, {
    action: `inv.participation.${to === "awaiting_review" ? "start_review" : to === "approved" ? "approve" : to === "active" ? "activate" : to === "submitted" ? "submit" : to === "cancelled" ? "cancel" : "reject"}`,
    targetType: "investment_participation",
    targetId: p.id,
    summary: `Participation ${p.id} ${p.status} → ${to}`,
    note: reason?.trim() || undefined,
    before: { status: p.status },
    after: { status: to },
  });
};

// ================================================================ Allocations
export function ruleValue(state: InvestmentState, key: RuleKey): { status: "needs_clarification" | "recorded"; value: string | null; version: number } {
  const r = state.rules.find((x) => x.key === key);
  const v = r?.versions.find((x) => x.version === r.currentVersion);
  return v ? { status: v.status, value: v.value, version: v.version } : { status: "needs_clarification", value: null, version: 0 };
}

function allocationTargetError(state: InvestmentState, participation: InvestmentParticipation, projectId: string): string | null {
  if (!["approved", "active"].includes(participation.status)) return "Only approved or active participations can receive project allocations.";
  const err = investorEligible(state, participation.investorId);
  if (err) return err;
  const project = byId(state.projects, projectId);
  if (!project) return "Choose an eligible project.";
  if (project.status !== "active") return `"${project.name}" is ${humanize(project.status).toLowerCase()} and cannot receive new allocations.`;
  const plan = byId(state.plans, participation.planId);
  const eligible = plan?.versions.find((v) => v.version === participation.planVersion)?.eligibleSectorIds;
  if (eligible && !eligible.includes(project.sectorId)) return "This project's sector is not eligible for the participation's plan version.";
  return null;
}

export const proposeAllocation: MockAction<{ participationId: string; projectId: string; amountRupees: number; note?: string }> = (db, { participationId, projectId, amountRupees, note: text }, ctx) => {
  if (denied(db, ctx, "inv.allocations.manage")) return fail(PERMISSION_DENIED);
  const state = db.investment;
  const p = byId(state.participations, participationId);
  if (!p) return fail("Participation not found.");
  const err = allocationTargetError(state, p, projectId);
  if (err) return fail(err);
  const amount = rupeesToPaise(amountRupees, "allocation amount");
  if (typeof amount === "string") return fail(amount);
  const live = liveAllocations(state, p.id);
  const split = ruleValue(state, "allocation.splitting");
  if (live.length && split.value !== "multi_project") return fail(split.status === "needs_clarification" ? "Splitting one participation between several projects needs clarification. Reject or decide the existing allocation first." : "The recorded rule allows a single project allocation per participation.");
  if (live.some((a) => a.projectId === projectId)) return fail("This participation already has an open allocation to that project.");
  const { unallocatedPaise } = allocationTotals(state, p);
  if (amount > unallocatedPaise) return fail(`The allocation exceeds the unallocated amount (${formatINR(unallocatedPaise)}).`);
  const id = ctx.newId("alc");
  return commit(db, ctx, { ...state, allocations: [...state.allocations, { id, participationId, projectId, proposedAmountPaise: amount, approvedAmountPaise: null, status: "proposed", proposedAt: ctx.now, proposedBy: ctx.actor.name, notes: text?.trim() ? [note(ctx, text)] : [] }] }, "Allocation proposed. It is not approved until a decision is recorded.", {
    action: "inv.allocation.propose",
    targetType: "project_allocation",
    targetId: id,
    summary: `Proposed allocation of ${participationId} to ${projectId}`,
    after: { status: "proposed", amountPaise: String(amount) },
  });
};

export const decideAllocation: MockAction<{ allocationId: string; decision: "approved" | "rejected"; note?: string }> = (db, { allocationId, decision, note: text }, ctx) => {
  if (denied(db, ctx, "inv.allocations.manage")) return fail(PERMISSION_DENIED);
  const state = db.investment;
  const a = byId(state.allocations, allocationId);
  if (!a) return fail("Allocation not found.");
  if (a.status !== "proposed") return fail(`This allocation has already been decided ("${humanize(a.status)}").`);
  if (decision === "rejected" && !text?.trim()) return fail("Provide a reason before rejecting this allocation.");
  const split = ruleValue(state, "allocation.splitting");
  if (decision === "approved") {
    const p = byId(state.participations, a.participationId);
    if (!p) return fail("Participation not found.");
    const err = allocationTargetError(state, p, a.projectId);
    if (err) return fail(err);
    const otherApproved = state.allocations.filter((x) => x.participationId === p.id && x.status === "approved" && x.id !== a.id);
    if (otherApproved.length && split.value !== "multi_project") return fail("Splitting one participation between several projects needs clarification, so a second allocation cannot be approved.");
    if (split.value === "single_project" && a.proposedAmountPaise !== p.amountPaise) return fail(`The recorded rule requires a single allocation of the full ${formatINR(p.amountPaise)}.`);
    const approvedTotal = otherApproved.reduce((s, x) => s + (x.approvedAmountPaise ?? 0), 0);
    if (approvedTotal + a.proposedAmountPaise > p.amountPaise) return fail("Approving this allocation would exceed the participation's contribution amount.");
  }
  const next = { ...a, status: decision, approvedAmountPaise: decision === "approved" ? a.proposedAmountPaise : null, decidedAt: ctx.now, decidedBy: ctx.actor.name, decisionNote: text?.trim() || undefined, ruleVersion: split.version };
  return commit(db, ctx, { ...state, allocations: replace(state.allocations, a.id, next) }, decision === "approved" ? "Allocation decision recorded: approved (demo)." : "Allocation decision recorded: rejected.", {
    action: `inv.allocation.${decision === "approved" ? "approve" : "reject"}`,
    targetType: "project_allocation",
    targetId: a.id,
    summary: `Allocation ${a.id} (${a.participationId} → ${a.projectId}) ${decision}`,
    note: text?.trim() || undefined,
    before: { status: "proposed" },
    after: { status: decision, approvedAmountPaise: decision === "approved" ? String(a.proposedAmountPaise) : "—", ruleVersion: String(split.version) },
  });
};

// ================================================================ Contributions
function moveTransaction(db: DemoDb, ctx: ActionContext, t: ContributionTransaction, to: TransactionStatus, patch: Partial<ContributionTransaction>, message: string, action: string, reason?: string): ActionResult {
  const next = { ...t, ...patch, status: to, history: [...t.history, change(ctx, t.status, to, reason)] } as ContributionTransaction;
  return commit(db, ctx, { ...db.investment, transactions: replace(db.investment.transactions, t.id, next) }, message, {
    action,
    targetType: "contribution",
    targetId: t.id,
    summary: `Contribution ${t.id} ${t.status} → ${to}`,
    note: reason?.trim() || undefined,
    before: { status: t.status },
    after: { status: to },
  });
}

export const startContributionReview: MockAction<{ transactionId: string }> = (db, { transactionId }, ctx) => {
  if (denied(db, ctx, "inv.contributions.review")) return fail(PERMISSION_DENIED);
  const t = byId(db.investment.transactions, transactionId);
  if (!t) return fail("Transaction not found.");
  if (t.status !== "successful") return fail(t.status === "under_verification" ? "This contribution is already under verification." : `Only contributions recorded as "Successful" can be reviewed (current: ${humanize(t.status)}).`);
  return moveTransaction(db, ctx, t, "under_verification", {}, "Contribution moved to verification.", "inv.contribution.start_review");
};

export const verifyContribution: MockAction<{ transactionId: string; note?: string }> = (db, { transactionId, note: text }, ctx) => {
  if (denied(db, ctx, "inv.contributions.verify")) return fail(PERMISSION_DENIED);
  const t = byId(db.investment.transactions, transactionId);
  if (!t) return fail("Transaction not found.");
  if (t.verification || isVerified(t)) return fail("This contribution has already been verified.");
  if (t.status !== "under_verification") return fail("Move the contribution to verification before verifying it.");
  return moveTransaction(db, ctx, t, "verified", { verification: { at: ctx.now, by: ctx.actor.name, note: text?.trim() || "Demo verification (manual, simulated)." } }, "Contribution marked as verified (simulated; no bank or gateway confirmation).", "inv.contribution.verify", text);
};

export const rejectContribution: MockAction<{ transactionId: string; reason: string }> = (db, { transactionId, reason }, ctx) => {
  if (denied(db, ctx, "inv.contributions.verify")) return fail(PERMISSION_DENIED);
  const t = byId(db.investment.transactions, transactionId);
  if (!t) return fail("Transaction not found.");
  if (!["successful", "under_verification"].includes(t.status)) return fail(`A "${humanize(t.status)}" contribution cannot be rejected.`);
  const err = required(reason, "A rejection reason") ?? tooLong(reason);
  if (err) return fail(err);
  return moveTransaction(db, ctx, t, "rejected", { rejection: { at: ctx.now, by: ctx.actor.name, reason: reason.trim() } }, "Contribution rejected.", "inv.contribution.reject", reason);
};

export const recordDiscrepancy: MockAction<{ transactionId: string; body: string }> = (db, { transactionId, body }, ctx) => {
  if (denied(db, ctx, "inv.contributions.review")) return fail(PERMISSION_DENIED);
  const t = byId(db.investment.transactions, transactionId);
  if (!t) return fail("Transaction not found.");
  const err = required(body, "Discrepancy description") ?? tooLong(body);
  if (err) return fail(err);
  const next = { ...t, discrepancies: [...t.discrepancies, note(ctx, body)] };
  return commit(db, ctx, { ...db.investment, transactions: replace(db.investment.transactions, t.id, next) }, "Payment discrepancy recorded.", {
    action: "inv.contribution.discrepancy",
    targetType: "contribution",
    targetId: t.id,
    summary: `Recorded a payment discrepancy on ${t.id}`,
    note: body.trim(),
  });
};

export const recordSimulatedRefund: MockAction<{ transactionId: string; amountRupees: number; reason: string }> = (db, { transactionId, amountRupees, reason }, ctx) => {
  if (denied(db, ctx, "inv.contributions.verify")) return fail(PERMISSION_DENIED);
  const t = byId(db.investment.transactions, transactionId);
  if (!t) return fail("Transaction not found.");
  if (!["verified", "partially_refunded"].includes(t.status)) return fail(t.status === "refunded" ? "This contribution has already been fully refunded." : "Only verified contributions can be refunded.");
  const amount = rupeesToPaise(amountRupees, "refund amount");
  if (typeof amount === "string") return fail(amount);
  const remaining = t.amountPaise - refundedPaise(t);
  if (amount > remaining) return fail(`The refund exceeds the remaining refundable amount (${formatINR(remaining)}).`);
  const err = required(reason, "A refund reason") ?? tooLong(reason);
  if (err) return fail(err);
  const to: TransactionStatus = amount === remaining ? "refunded" : "partially_refunded";
  return moveTransaction(db, ctx, t, to, { refunds: [...t.refunds, { id: ctx.newId("rfd"), at: ctx.now, by: ctx.actor.name, amountPaise: amount, reason: reason.trim() }] }, `Simulated refund of ${formatINR(amount)} recorded. No money was moved.`, "inv.contribution.refund_simulated", reason);
};

// ================================================================ Returns and payouts
export const reviewReturn: MockAction<{ returnId: string; outcome: "reviewed" | "rejected"; note: string }> = (db, { returnId, outcome, note: text }, ctx) => {
  if (denied(db, ctx, "inv.returns.review")) return fail(PERMISSION_DENIED);
  const r = byId(db.investment.returns, returnId);
  if (!r) return fail("Return record not found.");
  if (r.reviewStatus !== "pending_review") return fail("This return record has already been reviewed.");
  const err = required(text, "A review note") ?? tooLong(text);
  if (err) return fail(err);
  return commit(db, ctx, { ...db.investment, returns: replace(db.investment.returns, r.id, { ...r, reviewStatus: outcome, review: { at: ctx.now, by: ctx.actor.name, note: text.trim() } }) }, "Return record review recorded. No return was calculated or approved for payment.", {
    action: "inv.return.review",
    targetType: "return_record",
    targetId: r.id,
    summary: `Return record ${r.id} marked ${outcome}`,
    note: text.trim(),
    before: { reviewStatus: r.reviewStatus },
    after: { reviewStatus: outcome },
  });
};

function movePayout(db: DemoDb, ctx: ActionContext, p: PayoutRecord, to: PayoutRecord["status"], patch: Partial<PayoutRecord>, message: string, action: string, reason?: string): ActionResult {
  const next = { ...p, ...patch, status: to, history: [...p.history, change(ctx, p.status, to, reason)] };
  return commit(db, ctx, { ...db.investment, payouts: replace(db.investment.payouts, p.id, next) }, message, { action, targetType: "payout", targetId: p.id, summary: `Payout ${p.id} ${p.status} → ${to}`, note: reason?.trim() || undefined, before: { status: p.status }, after: { status: to } });
}

export const approvePayout: MockAction<{ payoutId: string; note?: string }> = (db, { payoutId, note: text }, ctx) => {
  if (denied(db, ctx, "inv.payouts.approve")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.payouts, payoutId);
  if (!p) return fail("Payout not found.");
  if (p.status !== "requested") return fail(`Only requested payouts can be approved (current: ${humanize(p.status)}).`);
  if (p.amountPaise === null) return fail("The payout amount cannot be determined until the return formula is approved.");
  const inv = byId(db.investment.investors, p.investorId);
  if (inv?.accountStatus === "suspended") return fail("The investor account is suspended. Payout approval is blocked.");
  return movePayout(db, ctx, p, "approved_unpaid", { approval: { at: ctx.now, by: ctx.actor.name, note: text?.trim() || undefined } }, "Payout approved (demo). It is not paid: no money was transferred.", "inv.payout.approve", text);
};

export const rejectPayout: MockAction<{ payoutId: string; reason: string }> = (db, { payoutId, reason }, ctx) => {
  if (denied(db, ctx, "inv.payouts.approve")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.payouts, payoutId);
  if (!p) return fail("Payout not found.");
  if (!["requested", "approved_unpaid"].includes(p.status)) return fail(`A "${humanize(p.status)}" payout cannot be rejected.`);
  const err = required(reason, "A rejection reason") ?? tooLong(reason);
  if (err) return fail(err);
  return movePayout(db, ctx, p, "rejected", { rejection: { at: ctx.now, by: ctx.actor.name, reason: reason.trim() } }, "Payout rejected.", "inv.payout.reject", reason);
};

/** Recording completion requires a reference AND a payout-evidence document; it is still only a simulated record. */
export const recordPayoutCompletion: MockAction<{ payoutId: string; reference: string; evidenceDocumentId: string }> = (db, { payoutId, reference, evidenceDocumentId }, ctx) => {
  if (denied(db, ctx, "inv.payouts.approve")) return fail(PERMISSION_DENIED);
  const p = byId(db.investment.payouts, payoutId);
  if (!p) return fail("Payout not found.");
  if (p.status === "paid_simulated") return fail("Completion has already been recorded for this payout.");
  if (p.status !== "approved_unpaid") return fail("Only approved payouts can be marked as paid.");
  const err = required(reference, "A payment reference");
  if (err) return fail(err);
  const evidence = byId(db.investment.documents, evidenceDocumentId);
  if (!evidence || evidence.entityType !== "payout" || evidence.entityId !== p.id || evidence.docType !== "payout_evidence") return fail("Attach a payout evidence document reference for this payout first.");
  return movePayout(db, ctx, p, "paid_simulated", { completion: { at: ctx.now, by: ctx.actor.name, reference: reference.trim(), evidenceDocumentId } }, "Payout completion recorded (simulated). No money was transferred by this demo.", "inv.payout.complete_simulated");
};

// ================================================================ Documents
export const DOCUMENT_LIMITS = { maxBytes: 5 * 1024 * 1024, types: { "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG" } as Record<string, string> };

const DOC_PERMISSION: Record<InvestmentEntityType, InvestmentPermission> = {
  investor: "inv.applications.review",
  application: "inv.applications.review",
  project: "inv.projects.manage",
  plan: "inv.plans.manage",
  participation: "inv.participations.approve",
  transaction: "inv.contributions.review",
  return: "inv.returns.review",
  payout: "inv.payouts.approve",
};

function entityExists(state: InvestmentState, type: InvestmentEntityType, id: string): boolean {
  const lists: Record<InvestmentEntityType, readonly { id: string }[]> = { investor: state.investors, application: state.applications, project: state.projects, plan: state.plans, participation: state.participations, transaction: state.transactions, return: state.returns, payout: state.payouts };
  return lists[type].some((x) => x.id === id);
}

export function validateDocumentFile(file: { name: string; type: string; size: number }): string | null {
  if (!file.name.trim()) return "Choose a file.";
  if (!DOCUMENT_LIMITS.types[file.type]) return "Only PDF, JPEG or PNG files are accepted.";
  if (file.size > DOCUMENT_LIMITS.maxBytes) return "The file is larger than 5 MB.";
  return null;
}

export const addDocumentReference: MockAction<Omit<InvestmentDocument, "id" | "uploadedAt" | "uploadedBy" | "reviewStatus" | "storage" | "reviewNote">> = (db, input, ctx) => {
  if (denied(db, ctx, DOC_PERMISSION[input.entityType])) return fail(PERMISSION_DENIED);
  if (!entityExists(db.investment, input.entityType, input.entityId)) return fail("Choose the record this document belongs to.");
  const fileErr = validateDocumentFile({ name: input.fileName, type: input.mimeType ?? "", size: input.sizeBytes ?? 0 });
  if (fileErr) return fail(fileErr);
  const visibility = input.entityType === "investor" || input.entityType === "application" || input.docType === "contribution_evidence" ? "private_investor" : input.visibility;
  const doc: InvestmentDocument = { ...input, visibility, notes: input.notes.trim(), id: ctx.newId("idoc"), uploadedAt: ctx.now, uploadedBy: ctx.actor.name, reviewStatus: "not_reviewed", storage: "reference_only" };
  return commit(db, ctx, { ...db.investment, documents: [...db.investment.documents, doc] }, `Document reference "${doc.fileName}" recorded. The file itself was not uploaded (demo).`, {
    action: "inv.document.add",
    targetType: "investment_document",
    targetId: doc.id,
    summary: `Added document reference (${doc.docType}) to ${doc.entityType} ${doc.entityId}`,
  });
};

export const reviewDocument: MockAction<{ documentId: string; status: "reviewed_manual" | "issue_noted"; note?: string }> = (db, { documentId, status, note: text }, ctx) => {
  const d = byId(db.investment.documents, documentId);
  if (!d) return fail("Document not found.");
  if (denied(db, ctx, DOC_PERMISSION[d.entityType])) return fail(PERMISSION_DENIED);
  if (d.visibility === "private_investor" && denied(db, ctx, "inv.documents.private")) return fail(PERMISSION_DENIED);
  if (status === "issue_noted" && !text?.trim()) return fail("Describe the issue noted.");
  if (d.reviewStatus === status) return fail("No change.");
  return commit(db, ctx, { ...db.investment, documents: replace(db.investment.documents, d.id, { ...d, reviewStatus: status, reviewNote: text?.trim() || undefined }) }, "Manual document review recorded. No external verification was performed.", {
    action: "inv.document.review",
    targetType: "investment_document",
    targetId: d.id,
    summary: `Manual review of ${d.fileName}: ${status}`,
    note: text?.trim() || undefined,
    before: { reviewStatus: d.reviewStatus },
    after: { reviewStatus: status },
  });
};

// ================================================================ Business rules
export const recordRule: MockAction<{ key: RuleKey; value: string; approvalReference: string; acknowledged: boolean }> = (db, { key, value, approvalReference, acknowledged }, ctx) => {
  if (denied(db, ctx, "inv.settings.manage")) return fail(PERMISSION_DENIED);
  const rule = db.investment.rules.find((r) => r.key === key);
  if (!rule) return fail("Rule not found.");
  if (!value.trim()) return fail("Enter the approved rule.");
  if (key === "allocation.splitting" && !["single_project", "multi_project"].includes(value)) return fail("Choose an allocation splitting option.");
  if (!approvalReference.trim()) return fail("Enter the approval reference (e.g. the approved policy document or resolution ID).");
  if (!acknowledged) return fail("Confirm that Mithren Agro has approved this rule.");
  const version = rule.currentVersion + 1;
  const next: BusinessRule = { ...rule, currentVersion: version, versions: [...rule.versions, { version, status: "recorded", value: value.trim(), approvalReference: approvalReference.trim(), recordedAt: ctx.now, recordedBy: ctx.actor.name }] };
  return commit(db, ctx, { ...db.investment, rules: db.investment.rules.map((r) => (r.key === key ? next : r)) }, `Rule recorded as version ${version}. Earlier decisions keep the version they were made under.`, {
    action: "inv.settings.rule_record",
    targetType: "investment_settings",
    targetId: key,
    summary: `Recorded approved rule "${rule.label}" (v${version})`,
    note: `Approval reference: ${approvalReference.trim()}`,
    before: { version: String(rule.currentVersion) },
    after: { version: String(version), value: value.trim().slice(0, 120) },
  });
};

// ================================================================ Reports
export const recordReportExport: MockAction<{ reportId: string; label: string; rows: number; filters: string }> = (db, { reportId, label, rows, filters }, ctx) => {
  if (denied(db, ctx, "inv.reports.export")) return fail(PERMISSION_DENIED);
  return { ok: true, message: "Report exported successfully.", db: { ...db, audit: withAudit(db, ctx, { action: "inv.report.export", targetType: "investment_report", targetId: reportId, summary: `Exported ${label} report (${rows} rows, CSV)`, note: filters }) } };
};
