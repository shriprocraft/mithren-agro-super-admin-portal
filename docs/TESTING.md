# Testing

## UI polish round (28 Oct 2026)

Run against the production build (`next build` + `next start --port 3200`) with Chrome.

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 problems |
| `npm run typecheck` (tsc strict) | ✅ no errors |
| `npm test` (Vitest) | ✅ 62 / 62 |
| `npm run build` | ✅ 26 static pages |
| `npx playwright test` | ✅ **45 / 45** (adds `e2e/ui-polish.spec.ts` and the 1280 px overflow case) |

New end-to-end coverage (`e2e/ui-polish.spec.ts`): every date-range preset updates the trigger and the
date-filtered metrics; custom range rejects a missing start and an end before the start, Cancel keeps
the previous range, Apply shows a success toast and changes Total orders, and Edit reopens with the
applied dates; keyboard open, arrow, Enter and Escape on the date menu; the open menu fits a 320×640
viewport; the sidebar badge sits below the logo; the breadcrumb sits above the header title; the page
scrollbar is hidden (`scrollbar-width: none`) while wheel and End-key scrolling still move the page;
all 21 panel routes have no horizontal overflow at 1280 px. Existing workflow tests were updated to
drive the new branded dropdowns (`choose()` helper) instead of native `selectOption`.

Defects found and fixed during this round: the custom-range trigger label kept the year twice (a
regex lost its backslash during a scripted edit); clicking "Edit custom date range" while the previous
panel was still animating closed was treated as an outside click and dismissed it (now a Radix
`PopoverTrigger`); five metric cards in a 3-column grid left a gap; the orders toolbar squeezed the
search field; the phone header wrapped the breadcrumb onto two lines. One run had a timing-related
failure of the new scroll test (wheel event before the dashboard finished rendering); the test now
waits for the page to be tall enough, and passed 3/3 repeats plus the final full run.

## Initial build

Final run: **28 Oct 2026**, Windows 11, Node 24.19.0, Google Chrome (Playwright `chrome` channel),
against the production build (`next build` + `next start`).

## Summary of the final run

| Check | Command | Result |
|---|---|---|
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings |
| Type check | `npm run typecheck` (`next typegen && tsc --noEmit`, strict) | ✅ no errors |
| Unit + component tests | `npm test` (Vitest) | ✅ 5 files, **62 / 62 passed** |
| Production build | `npm run build` | ✅ compiled; 26 static pages including all 22 required routes |
| All of the above | `npm run check` | ✅ exit code 0 |
| End-to-end | `npm run test:e2e` (Playwright, production server) | ✅ **36 / 36 passed** (1.2 min) |

## Unit and component tests (`tests/`)

| File | What it covers |
|---|---|
| `data-consistency.test.ts` (15) | Deterministic fixtures; unique IDs; every sub-order links to one parent and back; sub-order items belong to the sub-order's seller; parent status matches sub-order fulfilment; no orders for the suspended seller after suspension; exactly one succeeded payment equal to the order total for paid orders; refunds never exceed captured payment and link to the right order/payment/sub-order; processed refunds carry a `DEMO-RF-` reference; one frozen commission record per delivered sub-order with no invented amount; settlements include only delivered sub-orders of their own seller, at most once; certification references only seller-submitted documents; order tickets come from the order's customer; no passwords/secrets/tokens in the audit log |
| `actions.test.ts` (19) | Seller approve/reject (reason required)/suspend/reinstate, with no product cascade; mock document review; product approve/reject/unlist/relist; certification label only after mock review of a submitted document; category name uniqueness and deactivation without changing products; refund processing updates refund, order payment state, order timeline and audit, and cannot be repeated; payment reconciliation rules; commission configuration does **not** change historical records (array identity unchanged); commission validation; settlement reconciliation only for paid demo batches; delivery value validation; coupon date, code, percentage, limit and used-count validation; ticket replies and status history; inactive-assignee guard; no self role change; audit before/after recorded |
| `utilities.test.ts` (19) | CSV escaping (commas, quotes, line breaks, formula injection) and CRLF output; INR formatting; contact masking; preset ranges from the fixed reference date; IST day boundaries; invalid range messages; schedule state; sorting (numeric, natural, empty values last); pagination clamping; multi-term search; login validation; open-redirect protection; dashboard returns *needs clarification* for GMV, net sales and commission, and date filters change counts; brand-token guard (storefront colours kept, CSS mirrors tokens, no raw hex or palette colours in components) |
| `components.test.tsx` (6) | DataTable pagination, sorting with `aria-sort`, reset to page 1 on filter change, no-results state; Field accessible description and invalid state; demo/mock status labels; ConfirmDialog requires a reason, stays open and shows the error on failure, passes the trimmed reason on success |
| `persistence.test.ts` (3) | localStorage persistence across store instances; stale/corrupt data discarded; reset restores fixtures and notifies subscribers |

## End-to-end tests (`e2e/`)

| Spec | Tests |
|---|---|
| `auth.spec.ts` (10) | Empty email/password errors; invalid email format; empty password; invalid credentials; show/hide password; simulated forgot password (validates, states no email sent); direct navigation redirects to login and returns to the requested page; external `next` ignored; session survives refresh; logout returns to `/admin/login` and re-blocks routes; `/admin/register` is 404 and the login page has no registration link |
| `navigation.spec.ts` (6) | All 21 panel routes render their `<h1>` with exactly one active sidebar item and **no console errors**; sidebar → breadcrumb → page navigation; dashboard card links (including low-stock tab deep link); refresh on a deep route; unknown route not-found page; `/` redirect |
| `workflows.spec.ts` (12) | Orders search, status filter (resets to page 1), no-results state, numeric sort ascending/descending, pagination; order drawer deep link; seller approval updates queue, sidebar badge and audit log; rejection requires reason; product approval removes it from the queue and lists it; category deactivation impact shown before confirming; refund processing updates the refund, order payment state and audit log; commission configuration validation, and historical records unchanged; settlements show payout "Needs clarification"; coupon form validation then save; persistence across reload and reset; CSV export filename, header row, no customer emails, and disabled export for the taxes report |
| `responsive.spec.ts` (8) | No horizontal page overflow on login and 8 representative pages at **320, 375, 768, 1024 and 1440 px**; mobile navigation drawer; dialogs fit a 320×640 viewport; skip link is the first focus stop |

## Manual visual checks

Full-page screenshots at 1440 px (all 22 routes) and 375 px (dashboard, orders with drawer, coupons,
staff), taken with Playwright and reviewed by eye. Issues found and fixed during this review:

- Duplicate React key in the breadcrumbs ("Super Admin" and "Dashboard" both link to `/admin`).
- 50–70 px page overflow on Payments and Settlements: absolutely positioned `sr-only` header text
  escaped the table's scroll container. Fixed by making scroll containers `relative`.
- Metric cards cramped at 1440 px (6 columns). Now 3 columns until 2xl.
- Login logo not centred; "Needs clarification" badges and record IDs wrapping.
- Logout raced the route guard and landed on `/admin/login?next=/admin`. Fixed with an explicit
  sign-out flag (now covered by an e2e test).

## Known issues and limitations

- **Test-environment note:** one `next build` failed with `EPERM … unlink .next\server\route-cache`
  while a previous server process still held the folder, and the project sits in a OneDrive-synced
  directory. Rerunning the build after stopping the server succeeded. Stop running servers before
  building.
- An early e2e run reported 5 failures because it ran against a still-running dev server and because
  of three genuine test bugs (an ambiguous text locator, and `<h1>` checks hidden behind an open
  modal). It also exposed the logout race above. All were fixed and the final run is fully green.
- Not tested: real screen readers (structure and ARIA roles were checked through Playwright
  role-based locators only); browsers other than Chrome; automated colour-contrast scanning (the
  contrast ratios come from the storefront's documented token values).
- Business rules marked in `docs/NEEDS_CLARIFICATION.md` are intentionally not tested, because they
  are not defined.
