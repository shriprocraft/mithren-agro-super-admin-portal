# Architecture

A frontend-only Next.js (App Router) application. All data is typed mock data held in the browser.
There is no API, server action, database or external provider.

## Directory structure

```
src/
  app/
    layout.tsx                 Root layout: Poppins font, metadata (noindex)
    page.tsx                   "/" → redirect to /admin
    not-found.tsx              Branded 404 for unknown routes
    admin/login/page.tsx       Mock email/password sign-in
    admin/(panel)/layout.tsx   AdminShell (route guard + sidebar + header) for every panel page
    admin/(panel)/error.tsx    Render-error boundary (no stack traces shown)
    admin/(panel)/**/page.tsx  One thin server component per required route (sets <title>)
  components/
    ui/                        Primitives adapted from the storefront: Button, Input/Textarea/NativeSelect,
                               Dialog + SheetContent (drawer), Switch, Tabs
    admin/                     Shared admin building blocks: DataTable (+Pagination, RowLink), filters,
                               Field, ConfirmDialog/useConfirm, StatusBadge, Card, notices, Timeline,
                               MetricCard, DateRangeFilter, CsvExportButton, Toast, useAdmin()
    shell/                     AdminShell (guard), sidebar + mobile drawer, header + breadcrumbs, nav config,
                               BrandLogo
    auth/                      Login view and simulated forgot-password dialog
    dashboard/ customers/ sellers/ products/ categories/ orders/ payments/ finance/ delivery/
    promotions/ engagement/ reports/ admin-area/
                               One "view" per area; detail drawers live beside their list views
  config/                      design-tokens.ts (brand), site.ts (INR, Asia/Kolkata, demo reference date),
                               demo-auth.ts (demo credentials, documented as public)
  lib/
    types.ts                   Domain models (DemoDb and every record type)
    mock/fixtures/*            Typed fixtures; orders.ts is a seeded, deterministic generator
    mock/initial-db.ts         Assembles a fresh DemoDb (versioned)
    mock/actions.ts            Pure mock business actions: (db, payload, ctx) → { ok, db, message } | { ok:false, error }
    mock/selectors.ts          Read-only derivations (totals, dashboard metrics, performance counts)
    store/persistent-store.ts  Tiny localStorage-backed external store (cross-tab aware)
    store/demo-store.ts        useDemoDb / useDb / useRunAction / runAs / resetDemoData
    auth/session.ts            Mock session store, validation, safe redirect, sign-in/out
    format.ts privacy.ts csv.ts dates.ts table.ts status.ts
tests/                         Vitest unit + component tests
e2e/                           Playwright browser tests
```

## Data layer

- **Fixtures** (`src/lib/mock/fixtures`) hold fictional records with stable IDs. Orders, vendor
  sub-orders, payment attempts, refunds, commission records and settlement batches all come from one
  seeded generator (`mulberry32`, fixed seed and fixed dates). Every load produces identical data
  and the relationships stay consistent. `tests/data-consistency.test.ts` checks this.
- **Money** is stored as integer paise and formatted as INR. **Time** is stored as ISO strings and
  displayed in Asia/Kolkata (IST).
- A fixed **demo reference date** (`2026-10-28`, `siteConfig.demoReferenceDate`) anchors the "last
  7/30/90 days" presets. The dataset therefore keeps working whenever the demo is opened.
- **Mock actions** (`src/lib/mock/actions.ts`) are pure functions. Each one validates its input,
  refuses invalid transitions with a message, returns a new DB, and prepends an audit event (actor,
  action, target, timestamp, before/after; never passwords, secrets or contact details). They
  implement only transitions implied by the source; cascades the source does not define are
  deliberately absent (see `docs/NEEDS_CLARIFICATION.md`).
- **Selectors** return `{ status: "needs_clarification" }` instead of a number for metrics without a
  defined formula (GMV, net sales, platform commission). The UI therefore cannot display an
  invented figure.
- **Commission records** are created with `Object.freeze`. No action ever writes to
  `commissionRecords`, and a test asserts the array identity is unchanged after configuration
  changes.

## State management and persistence

- One persistent external store holds the whole `DemoDb`. Components read it with
  `useSyncExternalStore`. This keeps server rendering safe (the server snapshot is `null`, which
  shows a loading state) and avoids extra libraries.
- `useRunAction()` runs an action as the signed-in demo admin, catches unexpected exceptions
  (reported as "Nothing was changed"), and persists successful results to `localStorage`
  (`mithren-admin-demo-db`).
- Every page derives its view from the same store. Approving a seller therefore updates the
  approval queue, the sidebar badge, the dashboard and the audit log together.
- Stored data carries a version (`DB_VERSION`). Stale or corrupt data is discarded and the fixtures
  reload.
- **Reset:** Settings → "Reset demo data" (also offered on the error page) removes the stored copy
  and restores the fixtures.
- A `storage` event listener keeps multiple tabs in sync.

## Mock authentication and route checks

- `/admin/login` validates required fields and email format, then compares against
  `src/config/demo-auth.ts` **in the browser**. On success it stores a demo session in
  `localStorage` (`mithren-admin-demo-session`) and records a sign-in audit event.
- `AdminShell` (the `(panel)` layout) redirects to `/admin/login?next=<path>` when there is no
  session. `safeNextPath` only accepts `/admin…` paths, which prevents open redirects. An explicit
  logout returns to a clean `/admin/login`.
- **This is not security.** All code and data are in the browser bundle, and anyone can create the
  session entry. Production needs server-verified sessions and server-side authorization.

## UI patterns

- **Dropdowns**: filters, the report picker and the date range use the branded Radix `Select`
  (`components/ui/select.tsx`); the custom date range is a Radix `Popover` anchored to it. Short
  selects inside dialog forms stay native.
- **Lists** use `DataTable` (sortable headers with `aria-sort`, pagination that returns to page 1 when
  filters change, horizontal scroll inside a labelled region on small screens). Search and filtering
  run in the page before rows reach the table.
- **Details** open in a right-hand drawer (Radix Dialog). Deep links such as `?order=`, `?seller=`,
  `?product=`, `?payment=`, `?refund=` and `?ticket=` open them directly.
- **Consequential actions** go through `ConfirmDialog`. It can require a reason, shows the action's
  error inline if refused, and reports success through a live-region toast only after the action
  succeeds.
- **Forms** use `Field` (label, hint and error wired with `aria-describedby` / `aria-invalid`) and
  validate inline before calling the action, which validates again.
- **Honesty markers:** `DemoNotice` on every page, "(mock)"/"(demo)" in status labels, and a
  `NeedsClarification` component for undefined rules.
- **Charts** use Recharts (dashboard only). Each chart is single-series with one y-axis, has a
  hover tooltip and a "Show as table" alternative, and uses brand tokens only.

## Design decisions

- The stack mirrors the storefront (Next 16.4.3, React 19.3, Tailwind 4, radix-ui, cva, Lucide)
  so components and tokens are directly compatible. Recharts and Playwright were added. Zod and
  React Hook Form were considered but not added: the forms are small, the shared `Field` component
  covers error display, and validation lives in the pure mock actions (re-checked inline in forms)
  where unit tests cover it.
- Next.js 16 conventions followed: `preload` instead of the deprecated `priority` on `next/image`;
  `useSearchParams` inside a Suspense boundary; `error.tsx` uses `reset()` because state is
  client-side.
- All routes prerender as static shells. Data appears after hydration from browser storage.
