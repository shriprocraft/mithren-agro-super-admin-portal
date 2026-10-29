# Needs clarification

Business rules and decisions that the two source documents
(`ORGANIC_AGRICULTURE_MARKETPLACE_SUPER_ADMIN_SCOPE.md`,
`ORGANIC_AGRICULTURE_MARKETPLACE_SUPER_ADMIN_FRONTEND_DEVELOPMENT_GUIDE.md`) and the master prompt do
not define. None of these is resolved. For each one, the demo **does not invent a rule**. It shows
"Needs clarification" in the UI (the reference ID appears beside the notice) or implements only the
structural minimum described in the "Demo behaviour" column.

| ID | Question | Where it shows | Demo behaviour until answered |
|---|---|---|---|
| Q-GMV | How is Gross Merchandise Value defined? Which order states count, and are delivery fees, discounts, cancellations and refunds included? | Dashboard | GMV card shows "Needs clarification". The trend chart shows "Sum of order totals" and labels it *not GMV*. |
| Q-NET-SALES | What is the net sales formula (deductions for refunds, commission, fees, taxes)? | Dashboard | "Needs clarification". |
| Q-COMMISSION-RATE | What are the global default, category and seller commission rates? Are they percentages, flat fees or both? | Commissions, Dashboard (Platform commission), Reports | Configuration entries from the fixtures have no rate. Commission records carry no amount ("Not recorded"). An admin can enter a demo rate; it is never used in any calculation. |
| Q-COMMISSION-PRECEDENCE | Which configuration wins when global, category and seller entries overlap? How is a multi-category sub-order treated? | Commissions | Not applied. |
| Q-COMMISSION-EFFECTIVE | Do effective dates apply to the order, delivery or settlement date? What rounding applies? Can entries be ended or edited? | Commissions | Entries are append-only and never edited. Historical records are never rewritten. |
| Q-SETTLEMENT-ELIGIBILITY | What are the eligible balance, payout schedule, holding period and deductions (commission, refunds)? | Settlements | Payout amount shows "Needs clarification". The page lists delivered sub-orders not in a batch as a fact, not as eligibility. |
| Q-PAYOUT-RETRY | How are failed payouts retried or escalated? | Settlements | Failures are shown, but no retry action is offered. |
| Q-FAILED-PAYMENT | What is failed-payment handling (retry window, automatic cancellation, customer follow-up)? | Payments | Failed attempts and gateway reasons are listed, but no retry or follow-up action exists. |
| Q-REFUND-RULES | What are refund eligibility, approval/rejection of requests, timelines and partial-refund rules? | Refunds | Only existing refund requests can be processed (as a demo outcome). A refund that would exceed the captured payment is blocked. |
| Q-REFUND-STATE | How does a processed refund change the order's payment state? | Refunds, Orders | Provisional: "Partially refunded" when processed refunds are less than the order total, "Refunded" when they equal it. |
| Q-ORDER-TOTAL | How do delivery fees, discounts and taxes compose an order total? | Orders, Reports | The order total is the sum of sub-order line items only. Fees, discounts and taxes are not modelled. |
| Q-ORDER-TRANSITIONS | Which order and sub-order status changes may an administrator make, and how must parent and sub-orders move together? | Orders | Orders are view-only. No status is changed independently. |
| Q-STATUS | What are the full status vocabularies (customer, seller, product, order, sub-order, payment, ticket…)? | All pages | Minimal provisional sets in `src/lib/types.ts` and `src/lib/status.ts`, derived from the scope's wording (approval, rejection, suspension, restriction, listing moderation…). |
| Q-STOCK | What stock threshold raises a low-stock alert? | Dashboard, Products → Low-stock alerts | Alerts are recorded fixture data (as if from an inventory feed). The demo never computes alerts itself. |
| Q-DELIVERY-KPI | What is "delivery performance": on-time rate, slot adherence, failed attempts? | Dashboard, Reports | Only fulfilment-status counts ("X of Y sub-orders delivered") are shown. |
| Q-DELIVERY-FEES | Do fees vary by order value, distance, weight or slot? Is there a free-delivery threshold? | Delivery | The fee and minimum order value per zone are stored as entered. No fee formula is applied. |
| Q-CAPACITY | How is slot capacity enforced (blocking, waitlist, overbooking)? Do slots vary by day? | Delivery | Capacity is stored only. Setting capacity below current bookings shows a note and changes nothing else. |
| Q-PARTNERS | What are delivery-partner onboarding, status changes and assignment rules? | Delivery | Partners are view-only. |
| Q-SERVICEABILITY | What happens to in-progress orders when a zone becomes non-serviceable? | Delivery | Only the zone flag changes. |
| Q-SELLER-APPROVAL | Must every document be reviewed before approval? What documents are required? | Seller approvals | Approval is allowed and the confirmation warns when the review is incomplete. Document review is a mock record only. |
| Q-SUSPENSION | What does suspending a seller do to their listings and open sub-orders? | Sellers, Products | Only the seller's status changes. There are no cascades. |
| Q-RATING | How are seller and product ratings calculated? | Sellers, Reviews | The seller rating is a recorded fixture value. Nothing is recalculated. |
| Q-RESTRICTION | What does a customer account restriction block (ordering, reviews, support)? Who may lift it? | Customers | Only the account status and reason are recorded. |
| Q-PII | Which staff may see full customer contact details, and is access logged? | Customers, Orders | Contact details are always masked. No reveal action exists. |
| Q-CATEGORY | What does category deactivation do to linked products? Is deletion allowed? | Categories | The impact (linked products) is shown before confirmation. Only the category status changes. No delete action exists. |
| Q-PRODUCT-APPROVAL | Should approval list the product immediately? | Product approvals | Provisional: approval sets the listing to Listed. |
| Q-COUPON-RULES | What are the per-customer limits, minimum order, stacking, eligibility and re-enabling rules after expiry? | Promotions | Only the explicitly mentioned constraints are validated: start/end dates, usage limit, and value greater than 0 (≤ 100 for a percentage). |
| Q-FEATURED | How many featured products are allowed, and in what order? | Promotions → Featured | No limit; products are listed in the order they were added. |
| Q-REVIEW-POLICY | What are the moderation policy, automated abuse prevention, and rating aggregation rules? | Reviews | Report counts are surfaced. Hide, restore and dismiss are manual. |
| Q-PERMISSIONS | What are the Admin role's permissions, any further roles, and per-action rights? | Staff & permissions | Only Super Admin (full access, per the source) is defined. Admin is "Needs clarification". No screen is restricted by role. |
| Q-STAFF-LIFECYCLE | How are staff invited, deactivated and removed? | Staff | Not offered. Only the role can be changed (never your own). |
| Q-NOTIFICATIONS | The scope lists notification templates and delivery logs (§4.12) but defines no route. Where should they live, and are templates editable? | Settings → Notifications | Templates are shown read-only. Delivery logs are empty because no provider is configured. |
| Q-TAX | What are the tax (GST) rates, product-category treatment and inclusive/exclusive pricing? | Reports → Taxes, Settings | The tax report shows "Needs clarification" and its export is disabled. No tax settings exist. |
| Q-SHIPPING | What shipping rules exist beyond per-zone fee and minimum order? | Settings | "Needs clarification", with a link to Delivery. |
| Q-CSV-AUTH | "CSV export with authorization": which roles may export which reports? | Reports, Audit logs | Export works for the signed-in demo admin. No authorization is enforced (frontend only). |
| Q-AUDIT-RETENTION | What are the audit-log retention, export and tamper-evidence requirements? | Audit logs | The log lives in browser storage, is not tamper-proof, and is cleared by "Reset demo data". |

## Conflicts between source materials

| Topic | Conflict | Resolution applied |
|---|---|---|
| Brand colours | The master prompt suggests `#174D35` / `#103B29` / `#168451` as "initial design suggestions". The branding brief says the existing customer storefront is the source of truth and forbids a competing palette. | The storefront's actual "Modern Sage" tokens (`#2E7D32` primary, etc.) are used. See `docs/DESIGN_TOKENS.md`. |
| Background | The master prompt suggests `#F8FAF7`. The storefront uses `#FFFFFF` with `#F5FDF7` for soft surfaces. | `#F5FDF7` (an existing storefront token) is the admin canvas; cards are white. |
| Notifications | The scope lists notifications (§4.12), but neither document includes a notifications route. | No new route was invented. The content appears inside Settings (see Q-NOTIFICATIONS). |

## Investment programme (added with the investment management module)

None of these rules has been approved by Mithren Agro. The UI shows "Needs clarification — this rule
must be approved by Mithren Agro before it can be used." Authorized Super Admins can **record** an
approved rule (with an approval reference) under Investment rules; recorded rules are versioned, and
only the allocation-splitting rule changes demo behaviour.

| ID | Question | Demo behaviour until answered |
|---|---|---|
| Q-INV-PLAN-TERMS | Plan duration, minimum / maximum contribution, effective dates and any terms of the five standard plans | Stored as `null`; shown as Needs clarification. No defaults. |
| Q-INV-ELIGIBILITY | Which projects or sectors each plan may be allocated to | `eligibleSectorIds = null` (not "all projects"); no eligibility filter applied. |
| Q-INV-COMBINE | May an investor hold several participations or combine plans? Is a contribution collected before or after approval? | Not restricted; fixtures include an investor with two participations. |
| Q-INV-ALLOCATION | Allocation limits, percentages, eligibility, splitting a contribution between projects | At most one open allocation per participation, never above its amount, Active projects only. |
| Q-INV-LIFECYCLE | Completion and cancellation conditions; contractual effect of each participation state | Completion is not offered; cancellation is blocked while unrefunded verified contributions exist. |
| Q-INV-RETURNS | Return formula, rates, guarantees, principal protection, maturity, reinvestment, project-specific returns | Nothing calculated; return records carry `calculatedAmountPaise = null`. |
| Q-INV-PAYOUTS | Payout frequency, types, early withdrawal, tax treatment, completion evidence | Approval ≠ payment; "paid" needs a reference and a payout-evidence document and is simulated. |
| Q-INV-REFUND | Refund eligibility for contributions | Simulated refunds only on verified contributions, bounded by the remaining amount. |
| Q-INV-KYC | Mandatory documents, KYC and eligibility criteria for investor applications | Manual review only; no checklist enforced; no "KYC verified" status exists. |
| Q-INV-SUSPENSION | What a suspended investor may still do | Demo safeguard: no new participations, allocations or payout approvals; history untouched. |
| Q-INV-DOCS | Accepted document types, size limits, retention | Demo limit: PDF / JPEG / PNG up to 5 MB, metadata only. |
| Q-PERMISSIONS (extended) | Admin role's investment permissions | Withheld except the overview (least privilege). |
