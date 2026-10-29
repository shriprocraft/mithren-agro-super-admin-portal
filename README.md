# Mithren Agro — Super Admin Panel (frontend demo)

The Super Admin frontend for the Mithren Agro organic fruits and vegetables multi-vendor
marketplace. It covers the full administrative surface defined in
`ORGANIC_AGRICULTURE_MARKETPLACE_SUPER_ADMIN_SCOPE.md` and
`ORGANIC_AGRICULTURE_MARKETPLACE_SUPER_ADMIN_FRONTEND_DEVELOPMENT_GUIDE.md`: dashboard, customers,
sellers and approvals, products and approvals, categories, orders, payments, refunds, commissions,
settlements, delivery, promotions, reviews, support, content, reports, staff and permissions, audit
logs, and settings.

It also includes an **Investment management** area (`/admin/investments/*`) for Mithren Agro's
agricultural investment programme: six sectors with two illustrative projects each, the five
standard contribution plans (₹1,000 – ₹1,00,000; no custom plan), investors and applications,
participations, project allocations, contribution verification, returns and payouts, documents,
reports, an audit trail and versioned business rules. Financial rules that are not approved show
**Needs clarification**. See `docs/INVESTMENT_MODULE.md`.

**This phase is frontend-only.** Every record is fictional mock data and every action is simulated
in your browser. No backend, authentication provider, payment gateway, bank or payout service, KYC
service, messaging provider or delivery system is connected. Simulated outcomes are labelled
"(demo)" or "(mock)" in the UI.

It is a separate application from the customer storefront (`mithren-agro-customer`). It shares the
storefront's brand identity: the official logo, the Modern Sage palette and the Poppins font (see
`docs/DESIGN_TOKENS.md`).

## Technology

Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript (strict) · Tailwind CSS 4 ·
Radix UI primitives · Lucide icons · Recharts · Vitest + Testing Library · Playwright.

## Prerequisites

- Node.js 20.9 or later (developed with Node 24) and npm.
- For end-to-end tests: Google Chrome installed locally. Playwright uses the `chrome` channel, so no
  browser download is needed.

## Install and run

```bash
npm install
npm run dev          # http://localhost:3100  (opens on /admin → redirected to /admin/login)
```

Production build:

```bash
npm run build
npm run start        # http://localhost:3100
```

## Quality checks and tests

```bash
npm run lint         # ESLint (Next core-web-vitals + TypeScript rules)
npm run typecheck    # next typegen && tsc --noEmit
npm test             # Vitest unit and component tests
npm run test:e2e     # Playwright; starts `npm run start` itself (build first), or set E2E_BASE_URL
npm run check        # lint + typecheck + unit tests + build
```

See `docs/TESTING.md` for the results of the last run.

## Demo login

| Email | Password |
|---|---|
| `superadmin@mithrenagro.example` | `DemoAdmin#2026` |

The credentials are also shown on the login page.

### Mock authentication limitations

- The credentials live in `src/config/demo-auth.ts` and are **bundled into browser JavaScript**.
  They are not secrets and give no protection. Do not reuse them anywhere.
- The "session" is a `localStorage` entry. The route check that redirects signed-out visitors to
  `/admin/login` is a **demo interaction, not a security boundary**: every page and all demo data
  are in the downloaded bundle.
- "Forgot password?" is simulated and states that no email was sent.
- There is no public registration route, by design.
- Marketplace staff roles and their permission matrix are a display only. The investment module's
  actions do check a draft permission matrix (and offer a downgrade-only "preview as Admin"), but
  that check runs in the browser and is not a security boundary.
- Stored demo data from before the investment upgrade is migrated automatically (DB version 2);
  marketplace changes are kept.
- Real deployments need server-verified sessions, hashed credentials and server-side authorization.
  These are out of scope for this phase.

## Mock data and persistence

- Fixtures live in `src/lib/mock/fixtures`. Orders, sub-orders, payments, refunds, commission
  records and settlements are generated deterministically, so values never change between loads.
- Dates are relative to a fixed demo reference date, **28 Oct 2026**. "Last 30 days" always means
  the 30 days up to that date.
- Your changes (approvals, refunds, edits…) persist in this browser's `localStorage` across reloads
  and tabs. They are never sent anywhere.
- **Reset:** Settings → *Reset demo data* restores the original records. Clearing the site's
  storage has the same effect.
- Browser storage is not a database and is not secure. The audit log kept there is not tamper-proof.

## Unspecified business rules

The source documents leave many rules undefined: GMV and net-sales formulas, commission rates,
settlement eligibility, refund eligibility, the low-stock threshold, the permission matrix, tax, and
more. The app shows **Needs clarification** instead of inventing them. The full list is in
`docs/NEEDS_CLARIFICATION.md`.

## Documentation

| File | Contents |
|---|---|
| `docs/INVESTMENT_MODULE.md` | Investment routes, data model, safeguards, transaction states |
| `docs/REQUIREMENTS_TRACEABILITY.md` | Every source requirement → implementation → status → tests |
| `docs/NEEDS_CLARIFICATION.md` | Open business questions and how the demo behaves meanwhile |
| `docs/ARCHITECTURE.md` | Structure, data layer, state, auth, UI patterns |
| `docs/DESIGN_TOKENS.md` | Brand asset and token mapping from the customer storefront |
| `docs/TESTING.md` | Tests executed, commands and actual results |
| `docs/IMPLEMENTATION_PROGRESS.md` | Stage status, remaining work, next steps |
| `docs/IMAGE_CREDITS.md` | Image provenance |
