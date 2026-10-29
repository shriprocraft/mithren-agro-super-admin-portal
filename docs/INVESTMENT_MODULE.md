# Investment management module

Administrative tools for Mithren Agro's agricultural investment programme, added to the existing
Super Admin demo. It follows the same frontend-only architecture: fictional data in browser storage,
pure mock actions, and every action audited. **Nothing here is a real financial operation.** No payment
gateway, bank, payout provider, KYC service or messaging provider is connected, and no money moves.

The customer storefront and the investor portal are separate applications. This module does not
connect to either one, and no API between them is assumed.

## Routes

| Route | Page |
|---|---|
| `/admin/investments` | Investment overview: 12 metric cards, separated financial categories, 8 charts, 6 filters |
| `/admin/investments/investors` | Investor list (search, 5 filters, pagination, audited CSV) |
| `/admin/investments/investors/[investorId]` | Investor detail: 10 tabs, profile edit, suspend / reactivate, record draft participation, notes |
| `/admin/investments/applications` | Application queue + review drawer: start review, request info, approve, reject (reason required) |
| `/admin/investments/plans` | Standard plan catalogue, version history, create / edit (versioned), enable / disable |
| `/admin/investments/sectors` (+ `/[sectorId]`) | The six sectors, editable descriptions, sector detail with its projects |
| `/admin/investments/projects` (+ `/[projectId]`) | Project portfolio (table / cards), create / edit, status changes, archive, metrics, milestones, documents, notes |
| `/admin/investments/participations` | Participations with lifecycle controls |
| `/admin/investments/transactions` | Contributions & transactions: verification, rejection, discrepancies, simulated refunds |
| `/admin/investments/allocations` | Allocation records + workspace (propose / approve / reject) |
| `/admin/investments/payouts` | Return records (review only) and payout records (approve / reject / record simulated completion) |
| `/admin/investments/reports` | 10 investment reports with report-specific filters and CSV export |
| `/admin/investments/documents` | Document references, manual review |
| `/admin/investments/audit` | Investment audit trail |
| `/admin/investments/settings` | Business rules (versioned, approval reference required), draft permission matrix, Admin preview |

## Data model (`src/lib/investment/types.ts`)

Separate records linked by stable IDs: `Investor`, `InvestorApplication`, `AgriculturalSector`,
`AgriculturalProject`, `ContributionPlan` with immutable `ContributionPlanVersion`s,
`InvestmentParticipation` (investor + plan ID **and version** + amount snapshot),
`ProjectAllocation` (proposed amount separate from approved amount), `ContributionTransaction`
(immutable ID, amount and reference; only the status trail changes), `ReturnRecord`, `PayoutRecord`,
`InvestmentDocument` (metadata only), and `BusinessRule` (versioned). Audit events use the existing
`db.audit` with new target types and an optional `note` (the reason).

Seed data (`src/lib/mock/fixtures/investment.ts`) uses deterministic IDs: `sec-*`, `prj-<sector>-0n`,
`pln-001…005`, `inv-001…017`, `app-*`, `par-*`, `txn-*`, `alc-*`, `ret-*`, `pay-*`, `idoc-*`.
`mergeInvestmentSeed` is idempotent: it only adds seeded sectors, projects, plans and rules whose ID is
missing, so repeated seeding never duplicates records. `migrateDb` upgrades a stored version-1
database (marketplace only) to version 2 **without** discarding the user's marketplace changes.

## Safeguards (enforced in `src/lib/mock/investment-actions.ts`, not only in the UI)

- **Permissions** on every action (`src/lib/investment/permissions.ts`). Super Admin: all. Admin:
  overview only (draft; Needs clarification). Inactive staff: none. The "Preview with Admin
  permissions" switch can only lower permissions.
- **Transitions** are whitelisted. Applications: submitted → under review / info requested / rejected;
  under review → approved / info requested / rejected; info requested → under review / rejected.
  Participations: draft → submitted / cancelled; submitted / awaiting review → approved / rejected /
  cancelled; approved → active / cancelled. `active → completed` is refused (Needs clarification).
  Projects: planning → active / on hold / archived; active ↔ on hold; any → archived (final).
- **Activation** of a participation requires verified contributions equal to its amount and an
  approved, active investor.
- **Allocations**: only to Active projects, only for approved/active participations of active
  investors, never above the unallocated amount, a second open allocation per participation is
  refused until a splitting rule is recorded, proposals are never treated as approved, and decisions
  record the rule version.
- **Transactions**: a "successful" record is not a verification. Verification only from Under
  verification, never twice. Simulated refunds only on verified contributions, never above the
  remaining amount, never twice in full. Amount, plan, investor and ID are read-only.
- **Plans**: duplicate names/amounts refused; changing the amount of a plan in use requires explicit
  confirmation and creates a new version; earlier participations keep their version.
- **Payouts**: approval needs a determinable amount; "paid" requires an approved payout, a reference
  and a payout-evidence document, and is labelled "Paid (simulated)".
- **History**: suspension, disabling and archiving never delete or rewrite financial records; projects
  with history cannot be deleted (archive instead); seeded projects cannot be deleted.
- **Double submission**: dialogs ignore repeated submits while an action runs, and the actions refuse
  repeated operations.

## Transaction states

| State | Meaning | Counted as received? |
|---|---|---|
| Initiated | Record created; no outcome yet | No |
| Pending | Awaiting a payment or bank outcome | No |
| Successful (mock record, unverified) | A mock payment record reports success | No |
| Failed | Payment attempt failed | No |
| Under verification | An administrator is checking it | No |
| Verified (simulated) | Verified through the simulated admin workflow | Yes (verified total) |
| Rejected | Rejected by an administrator with a reason | No |
| Partially refunded / Refunded (simulated) | Simulated refund recorded on a verified contribution | Verified amount kept; refunds shown separately |

## Financial figures

Shown as separate categories, never summed together: proposed contribution amounts (participation
plan amounts, not money), submitted / unconfirmed contributions, verified contributions, failed or
rejected transactions, simulated refunds, approved-but-unpaid payouts and completed (simulated)
payouts. No return, yield, ratio, maturity or projection is calculated anywhere. The one payout and
return test value in the seed is labelled **Fictional test data** and excluded from verified metrics.

## Loading and feedback

Investment actions run after a short simulated latency (`SIMULATED_LATENCY_MS`, 350 ms) so that
spinners, disabled buttons and the double-submit guard are visible. Success toasts appear only after
an action has succeeded (and, for CSV export, after the download has started).
