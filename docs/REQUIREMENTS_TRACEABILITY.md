# Requirements traceability

Sources: **S** = `ORGANIC_AGRICULTURE_MARKETPLACE_SUPER_ADMIN_SCOPE.md`, **G** =
`…_FRONTEND_DEVELOPMENT_GUIDE.md`, **P** = master prompt, **B** = branding brief.

Status: ✅ implemented · ◐ partial (supported portion implemented; the rest is blocked by an
unspecified rule, see `NEEDS_CLARIFICATION.md`) · ❌ not implemented.

Test references: `u:` = Vitest file in `tests/`, `e2e:` = Playwright spec in `e2e/`.

## Access and shell

| Requirement | Source | Implementation | Status | Tests |
|---|---|---|---|---|
| Email/password login at `/admin/login`: inputs, show/hide, required + email validation, loading, invalid-credential feedback | S2, G5, P7 | `src/components/auth/login-view.tsx`, `src/lib/auth/session.ts` | ✅ | e2e:auth (6 tests), u:utilities |
| Mock sign-in → `/admin`, demo session, logout → `/admin/login` | G5, P7 | `session.ts`, `shell/admin-shell.tsx` | ✅ | e2e:auth |
| Frontend route checks, direct navigation, post-login redirect (safe) | S6, G4, P7 | `AdminShell`, `safeNextPath` | ✅ | e2e:auth, u:utilities |
| Simulated forgot password (no email sent) | G5, P7 | `ForgotPasswordDialog` | ✅ | e2e:auth |
| No public registration | S2, S7, G5 | No route exists | ✅ | e2e:auth |
| Demo credentials documented as visible / not secure | P7, P31 | `config/demo-auth.ts`, login page notice, README | ✅ | — |
| Sidebar with every route, active state, mobile drawer | G6, P6 | `shell/nav.ts`, `admin-shell.tsx` | ✅ | e2e:navigation, e2e:responsive |
| Header: title, breadcrumbs, identity, logout (no decorative controls) | P6 | `admin-shell.tsx` Header | ✅ | e2e:navigation |
| All 22 routes resolve to real pages; unknown routes → not found; `/` redirects | S7, S8, G13, P25 | `src/app/admin/(panel)/**`, `not-found.tsx`, `app/page.tsx` | ✅ | e2e:navigation |
| Loading, empty, error, success states; error boundary without stack traces | S8, G9, P30 | `LoadingState`, `EmptyState`, `InlineAlert`, toasts, `(panel)/error.tsx` | ✅ | u:components, e2e:workflows |

## Dashboard (`/admin`)

| Requirement | Implementation | Status | Tests |
|---|---|---|---|
| Total orders | `selectors.dashboardMetrics`, `dashboard-view.tsx` | ✅ | u:utilities |
| GMV | Card shows **Needs clarification** (Q-GMV) | ◐ | u:utilities |
| Platform commission | **Needs clarification** (Q-COMMISSION-RATE) | ◐ | u:utilities |
| Refunds | Processed demo amount + processed/requested counts in range | ✅ | — |
| Net sales | **Needs clarification** (Q-NET-SALES) | ◐ | u:utilities |
| Active customers / active sellers | Counts by account status (labelled as such) | ✅ | — |
| Pending seller / product approvals | Live counts linking to the queues | ✅ | u:utilities, e2e:navigation |
| Low-stock alerts | Open alerts from mock inventory feed (threshold Q-STOCK) | ✅ | u:utilities |
| Delivery performance | Status counts; KPI formula **Needs clarification** (Q-DELIVERY-KPI) | ◐ | — |
| Date-range filters (presets + validated custom) | `DateRangeFilter`, `dates.ts` | ✅ | u:utilities |
| Trend chart, summaries, links to management pages | `order-trend-chart.tsx`, summary cards | ✅ | e2e:navigation |

## Management sections

| Requirement | Source | Implementation | Status | Tests |
|---|---|---|---|---|
| Customers: search, status filter, restrictions (confirm + reason), detail, support history, masked contact data | S4.1, G8.1, P9 | `customers/customers-view.tsx`, `privacy.ts` | ✅ | u:actions, u:utilities |
| Sellers: list, details, search/filters, recorded ratings, performance counts | S4.2, G8.2, P10 | `sellers/sellers-view.tsx`, `seller-detail.tsx` | ✅ (rating formula Q-RATING) | e2e:navigation |
| Seller applications, mock document review, approve, reject with reason, suspend/reinstate, confirmations, queue reflects state | S4.2, G8.2, P10 | same + `actions.ts` | ✅ | u:actions, e2e:workflows |
| Products: catalogue, details, variants, images, stock, search/filter/sort/pagination | S4.3, G8.3, P11 | `products/products-view.tsx`, `product-detail.tsx` | ✅ | e2e:responsive |
| Product approval queue: approve/reject with confirmation | S4.3, G8.3 | same | ✅ | u:actions, e2e:workflows |
| Listing moderation (unlist with reason / relist) | S4.3 | same | ✅ | u:actions |
| Product reports (resolve/dismiss with note) | S4.3 | Products → Product reports tab | ✅ | — |
| No unsupported organic/certification claims | G8.3, G14 | `CertificationLabel` ("certificate reviewed (mock)" only) | ✅ | u:data-consistency, u:actions |
| Categories: list, create/edit, deactivation impact + confirmation | S4.3, G8.4, P11 | `categories/categories-view.tsx` | ✅ (cascade Q-CATEGORY) | u:actions, e2e:workflows |
| Orders & vendor sub-orders: customer, seller, items, status, payment, fulfilment, totals, cancellations, refunds, disputes, audit trail; search/filter/sort/pagination | S4.4, S5, G8.5, P12 | `orders/orders-view.tsx` | ✅ (view-only: Q-ORDER-TRANSITIONS) | u:data-consistency, e2e:workflows |
| Payments: attempts, gateway refs, webhook status, failed payments, reconciliation (demo) | S4.5, G8.6, P13 | `payments/payments-view.tsx` | ◐ (failed-payment handling Q-FAILED-PAYMENT) | u:actions |
| Refunds: records, orders, amounts, status, refs, reconciliation; process as demo outcome | S4.5, G8.6, P13 | `payments/refunds-view.tsx` | ✅ (eligibility Q-REFUND-RULES) | u:actions, e2e:workflows |
| Commission: global/category/seller overrides, effective dates, immutable history | S4.6, G8.7, P14 | `finance/commissions-view.tsx` | ◐ (rates/precedence/formula Q-COMMISSION-*) | u:actions, e2e:workflows |
| Settlements: eligible balances, batches, payout refs, failures, reconciliation | S4.7, G8.8, P15 | `finance/settlements-view.tsx` | ◐ (balances/payout amount Q-SETTLEMENT-ELIGIBILITY) | u:data-consistency, e2e:workflows |
| Delivery: zones, fees, minimum order, slots, capacity, partners, serviceability | S4.8, G8.9, P16 | `delivery/delivery-view.tsx` | ✅ (rules Q-DELIVERY-FEES, Q-CAPACITY; partners view-only) | u:actions |
| Promotions: coupons, discount campaigns, featured products, banners, seasonal campaigns; dates, limits, validation | S4.9, G8.10, P17 | `promotions/promotions-view.tsx` | ✅ (discount rules Q-COUPON-RULES) | u:actions, e2e:workflows |
| Reviews: report handling, moderation, abuse prevention | S4.10, G8.11, P18 | `engagement/reviews-view.tsx` | ◐ (automated abuse prevention Q-REVIEW-POLICY) | — |
| Notifications: templates, delivery logs | S4.12 | Settings → Notifications (read-only; no providers) | ◐ (no route defined, Q-NOTIFICATIONS) | — |
| Support: tickets, status, priority, assignment, replies, resolution history | S4.13, G8.12, P19 | `engagement/support-view.tsx` | ✅ | u:actions, e2e:workflows |
| Content: homepage sections, policies (edit/preview/publish-demo), FAQs, contact, announcements | S4.11, G8.13, P20 | `engagement/content-view.tsx` | ✅ | — |
| Reports: sales, orders, products, sellers, commissions, settlements, refunds, cancellations, taxes, delivery; real CSV export | S4.14, G8.14, P21 | `reports/report-definitions.ts`, `reports-view.tsx`, `lib/csv.ts` | ◐ (taxes Q-TAX; export authorization Q-CSV-AUTH) | u:utilities, e2e:workflows |
| Staff & least-privilege permissions | S4.16, G8.15, P22 | `admin-area/staff-view.tsx` | ◐ (matrix Q-PERMISSIONS) | u:actions |
| Audit logs: actor, action, target, timestamp, before/after; search/filter; no secrets | S4.17, G8.16, P23 | `admin-area/audit-view.tsx`, `withAudit` in `actions.ts` | ✅ | u:actions, u:data-consistency, e2e:workflows |
| Settings: branding, INR, Asia/Kolkata, contact, payment options, shipping, taxes, policies, feature toggles | S4.15, G8.17, P24 | `admin-area/settings-view.tsx` | ◐ (shipping Q-SHIPPING, taxes Q-TAX) | — |

## Data, state, quality

| Requirement | Implementation | Status | Tests |
|---|---|---|---|
| Typed fixtures for every domain, stable IDs, consistent relationships, fictional and labelled | `lib/types.ts`, `lib/mock/fixtures/*` | ✅ | u:data-consistency |
| Mock actions separate from UI; audit on consequential actions | `lib/mock/actions.ts` | ✅ | u:actions |
| Simple state, persistence, reset mechanism, related views consistent | `lib/store/*` | ✅ | u:persistence, e2e:workflows |
| Search, filters, sorting, pagination that really work | `DataTable`, `lib/table.ts`, each view | ✅ | u:components, e2e:workflows |
| Confirmation for consequential actions; failures never shown as success | `ConfirmDialog` | ✅ | u:components |
| Simulated outcomes labelled; no claims of real provider actions | `DemoNotice`, status labels, toasts | ✅ | u:components |
| Responsive 320–1440 px, no horizontal overflow, mobile drawer, dialogs fit | Layout + components | ✅ | e2e:responsive |
| Accessibility: semantic HTML, labels, keyboard, focus rings, accessible dialogs, live-region toasts, alt text, reduced motion | Throughout | ✅ (no screen-reader run, see TESTING) | e2e (role-based locators), u:components |
| Same brand identity as the storefront (logo, palette, typography, components) | `config/design-tokens.ts`, `globals.css`, `BrandLogo`, `docs/DESIGN_TOKENS.md` | ✅ | u:utilities (token guard) |
| Only the Super Admin frontend; storefront not modified | Separate project; storefront read only | ✅ | — |
| Documentation set | `README.md`, `docs/*` | ✅ | — |
