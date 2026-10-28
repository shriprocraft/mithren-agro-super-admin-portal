// Display labels and colour tones for every status in the demo. Mock-only states say so in the label.
// Colour is never the only signal: StatusBadge always renders the text (and an icon per tone).
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const META = {
  customer: { active: ["Active", "success"], restricted: ["Restricted", "danger"] },
  seller: { pending: ["Pending approval", "warning"], active: ["Active", "success"], rejected: ["Rejected", "danger"], suspended: ["Suspended", "danger"] },
  document: { not_reviewed: ["Not reviewed", "neutral"], reviewed_mock: ["Reviewed (mock)", "success"], issue_noted_mock: ["Issue noted (mock)", "warning"] },
  approval: { pending: ["Pending review", "warning"], approved: ["Approved", "success"], rejected: ["Rejected", "danger"] },
  listing: { listed: ["Listed", "success"], unlisted: ["Unlisted", "neutral"] },
  certification: { not_submitted: ["No certification submitted", "neutral"], submitted_not_reviewed: ["Certificate awaiting review", "warning"], reviewed_mock: ["Certificate reviewed (mock)", "info"] },
  report: { open: ["Open", "warning"], resolved: ["Resolved", "success"], dismissed: ["Dismissed", "neutral"], actioned: ["Actioned", "success"] },
  alert: { open: ["Open", "warning"], acknowledged: ["Acknowledged", "neutral"] },
  category: { active: ["Active", "success"], inactive: ["Inactive", "neutral"] },
  order: { placed: ["Placed", "info"], confirmed: ["Confirmed", "info"], out_for_delivery: ["Out for delivery", "info"], delivered: ["Delivered", "success"], cancelled: ["Cancelled", "neutral"] },
  fulfilment: { pending: ["Pending", "neutral"], packed: ["Packed", "info"], dispatched: ["Dispatched", "info"], delivered: ["Delivered", "success"], cancelled: ["Cancelled", "neutral"] },
  payment: { pending: ["Payment pending", "warning"], paid: ["Paid", "success"], failed: ["Payment failed", "danger"], partially_refunded: ["Partially refunded", "info"], refunded: ["Refunded", "info"] },
  attempt: { succeeded: ["Succeeded", "success"], failed: ["Failed", "danger"], pending: ["Pending", "warning"] },
  webhook: { received_mock: ["Received (mock)", "success"], not_received: ["Not received", "warning"] },
  reconciliation: { matched: ["Reconciled", "success"], unreconciled: ["Unreconciled", "warning"], pending: ["Pending", "warning"] },
  refund: { requested: ["Requested", "warning"], processed_demo: ["Processed (demo)", "success"] },
  dispute: { open: ["Dispute open", "danger"], resolved: ["Dispute resolved", "neutral"] },
  settlement: { paid_demo: ["Paid (demo)", "success"], failed: ["Failed", "danger"], processing_demo: ["Processing (demo)", "info"] },
  zone: { true: ["Serviceable", "success"], false: ["Not serviceable", "neutral"] },
  partner: { active: ["Active", "success"], inactive: ["Inactive", "neutral"] },
  schedule: { scheduled: ["Scheduled", "info"], running: ["Running", "success"], ended: ["Ended", "neutral"] },
  enabled: { true: ["Enabled", "success"], false: ["Disabled", "neutral"] },
  review: { published: ["Published", "success"], hidden: ["Hidden", "neutral"] },
  ticket: { open: ["Open", "warning"], in_progress: ["In progress", "info"], resolved: ["Resolved", "success"], closed: ["Closed", "neutral"] },
  priority: { low: ["Low", "neutral"], medium: ["Medium", "info"], high: ["High", "warning"], urgent: ["Urgent", "danger"] },
  policy: { draft: ["Draft", "warning"], published_demo: ["Published (demo)", "success"] },
  staff: { active: ["Active", "success"], inactive: ["Inactive", "neutral"] },
  role: { super_admin: ["Super Admin", "info"], admin: ["Admin", "neutral"] },
} as const satisfies Record<string, Record<string, readonly [string, Tone]>>;

export type StatusDomain = keyof typeof META;

export function statusMeta(domain: StatusDomain, value: string | boolean): { label: string; tone: Tone } {
  const entry = (META[domain] as Record<string, readonly [string, Tone]>)[String(value)];
  return entry ? { label: entry[0], tone: entry[1] } : { label: String(value), tone: "neutral" };
}

/** Options for filter dropdowns of a status domain. */
export function statusOptions(domain: StatusDomain): { value: string; label: string }[] {
  return Object.entries(META[domain] as Record<string, readonly [string, Tone]>).map(([value, [label]]) => ({ value, label }));
}
