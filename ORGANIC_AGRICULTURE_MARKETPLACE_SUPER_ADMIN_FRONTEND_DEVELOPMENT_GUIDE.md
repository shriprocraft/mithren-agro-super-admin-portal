# Organic Fruits & Vegetables Marketplace — Super Admin Frontend Development Guide

## 1. Objective

Build the **Super Admin frontend only** for the Organic Fruits & Vegetables Multi-Vendor Marketplace. The Super Admin administers marketplace operations. Do not build the Customer Storefront, Seller/Vendor Portal, or Delivery Partner Portal as part of this task.

The current phase is frontend-only, with mock data and simulated local interactions. Do not integrate real APIs, backend services, authentication providers, payment gateways, KYC services, banking, messaging providers, or live delivery systems in this phase.

## 2. Source of truth and scope discipline

Use `ORGANIC_AGRICULTURE_MARKETPLACE_SUPER_ADMIN_SCOPE.md` together with the supplied master prompt. Implement the requirements listed there.

Do not invent features, business rules, roles, permissions, calculations, statuses, integrations, or screens. If a required rule is not specified, mark it **Needs clarification** and do not encode an invented rule.

## 3. Frontend project setup

Create the Super Admin frontend as a new frontend project. Keep the implementation focused on this application only.

Use a consistent, maintainable frontend structure with:
- Application routes and layouts.
- Shared UI components.
- Page-level components for each Super Admin route.
- Typed mock data.
- Mock action/state functions separated from presentation components.
- Shared validation, formatting, and status-display helpers.

Use the framework and package choices explicitly provided for this task if applicable. Do not add unrelated applications or services.

## 4. Frontend-only rules

- Use local typed mock records for the UI.
- Make buttons and controls functional within the mock frontend wherever their behavior is defined.
- Validate form fields and show clear inline errors.
- Include loading, empty, success, and error states where relevant.
- Make mock actions visibly update the relevant record and activity/history view where applicable.
- Label simulated outcomes as demo/mock outcomes.
- Never claim a real payment, refund, payout, verification, notification, or delivery operation occurred.
- Do not place secrets or real credentials in frontend code.
- Keep mock data, UI components, formatting helpers, and local state transitions separate.
- Any frontend route guard is only a demo interaction, not a security boundary.

## 5. Super Admin login

Create an email/password login screen for Super Admin access.

- Email input.
- Password input.
- Show/hide password control.
- Required-field validation and email-format validation.
- Submit/loading state.
- Visible feedback for invalid mock credentials.
- Mock sign-in flow using demo credentials configured for local development.
- Mock session and logout action.
- Simulated forgot-password interaction only; do not send a real email.
- No public Super Admin registration page.
- Use `/admin/login` for the login screen and `/admin` for the dashboard after mock sign-in.

Do not represent mock authentication as production-secure authentication. Real authentication and server-side authorization are outside this frontend-only phase.

## 6. Design and application shell

Follow the visual direction in the source prompt:
- Premium, trustworthy fresh-food marketplace identity.
- Bright, clean, light background.
- Deep forest green and fresh emerald accents; natural lime accents used sparingly.
- Clear typography and generous whitespace.
- Consistent spacing, rounded cards, subtle shadows, and restrained motion.
- Accessible contrast, keyboard navigation, visible focus states, semantic controls, and descriptive image alt text.
- Responsive layouts from small mobile screens to large desktop displays.
- Consistent icon library; do not use emoji as a replacement for interface icons.
- Do not copy third-party branding or exact page designs.

Build a Super Admin shell with:
- Sidebar navigation for the Super Admin routes listed in Section 13.
- Header with page title and breadcrumbs.
- Main content region.
- Responsive sidebar/navigation behavior.
- Reusable page headings, cards, tables, filters, status labels, detail panels, forms, confirmation dialogs, and toast/inline feedback.

## 7. Dashboard

Implement `/admin` with the source-defined dashboard metrics:
- Total orders.
- Gross merchandise value (GMV).
- Platform commission.
- Refunds.
- Net sales.
- Active customers.
- Active sellers.
- Pending seller approvals.
- Pending product approvals.
- Low-stock alerts.
- Delivery performance.
- Date-range filters.

Use mock records for the displayed values. Do not invent a calculation if the source does not define it. Date filters should update the mock dashboard data when the fixture data supports the selected range.

## 8. Management pages and workflows

### 8.1 Customers — `/admin/customers`
Implement customer listing and detail access, search, status/account restriction views and actions, support history, and privacy-safe presentation of customer information.

### 8.2 Sellers — `/admin/sellers` and `/admin/sellers/approvals`
Implement seller lists/details, applications, document review, approval/rejection with rejection reasons, suspension/reinstatement, ratings, and performance. Use mock review statuses and label them as mock.

### 8.3 Products — `/admin/products` and `/admin/products/approvals`
Implement catalogue listing, product details, variants, images, approval queue, reports, and listing moderation. Use only mock product data. Do not invent product origin, freshness, stock, ratings, or certification facts. Do not label products certified organic unless the mock review record supports that state.

### 8.4 Categories — `/admin/categories`
Implement category listing and the category operations defined by the source. If a category is linked to products, show the effect and request confirmation before simulating deactivation.

### 8.5 Orders — `/admin/orders`
Implement all marketplace orders and vendor sub-orders. Show available customer, seller, line-item, order-status, payment-state, fulfilment, and total fields from mock data. Represent cancellations, refunds, disputes, and audit trail where defined by the source. Keep parent orders and sub-orders consistent.

### 8.6 Payments and refunds — `/admin/payments` and `/admin/refunds`
Implement payment attempts, gateway references, webhook status, refunds, reconciliation, and failed-payment handling. All provider activity is mock-only. Never show a payment/refund as completed without a corresponding mock state transition and demo reference/status.

### 8.7 Commissions — `/admin/commissions`
Represent global defaults, category overrides, seller-specific overrides, effective dates, and historical calculation records as specified by the source. Do not invent commission rates, fee rules, effective-date behavior, or formulas. If required values/formulas are not specified, mark them **Needs clarification**.

### 8.8 Settlements — `/admin/settlements`
Represent eligible balances, settlement batches, payout references, failures, and reconciliation. Do not invent payout schedules or eligibility rules. Keep mock financial records and transaction/activity history consistent.

### 8.9 Delivery — `/admin/delivery`
Represent delivery zones, fees, minimum order values, delivery slots, capacity, delivery partners, and serviceability where defined in the source. Do not claim live dispatch, navigation, OTP, or proof-of-delivery actions occurred.

### 8.10 Promotions — `/admin/coupons`
Represent coupons, discount campaigns, featured products, banners, and seasonal campaigns, including dates, limits, and validation where specified. Do not invent discount rules or validation rules.

### 8.11 Reviews — `/admin/reviews`
Implement report handling, moderation, and abuse-prevention views described in the source. Use mock state only.

### 8.12 Support — `/admin/support`
Implement support tickets with status, priority, assignment, replies, and resolution history as defined by the source.

### 8.13 Content — `/admin/content`
Implement management views for homepage sections, policy pages, FAQs, contact details, and announcements. Preview/publish interactions must be mock-only and must not claim live publication.

### 8.14 Reports — `/admin/reports`
Implement source-defined reports for sales, orders, products, sellers, commissions, settlements, refunds, cancellations, taxes where applicable, and delivery metrics. Use mock data and do not invent metrics or formulas. CSV export must not be represented as available unless it is implemented as a real frontend file export for the mock data.

### 8.15 Staff and permissions — `/admin/staff`
Represent admin staff and least-privilege role/permission management as specified by the source. Do not invent role names or a final permission matrix where the source does not define it.

### 8.16 Audit logs — `/admin/audit-logs`
Show actor, action, target, timestamp, and relevant before/after values where available in mock data. Do not include passwords, secrets, or unnecessary personal data.

### 8.17 Settings — `/admin/settings`
Represent branding, currency (INR default in source), timezone (Asia/Kolkata default in source), contact details, payment options, shipping rules, taxes, policies, and feature toggles. Use local mock state only.

## 9. Tables, forms, and interactions

For each page, implement only the interactions relevant to that source-defined page:
- Search.
- Filters that actually change displayed records.
- Sorting.
- Pagination.
- Detail view/drawer.
- Validated create/edit forms where required.
- Confirmation dialogs for consequential actions.
- Empty and no-results states.
- Inline validation and visible feedback.
- Status labels and timestamps when those fields exist in mock data.

Do not add controls merely for appearance. Every visible control must work in the mock frontend, or be clearly disabled with an explanation.

## 10. Mock data and state

Create typed fixtures for the Super Admin domains:
- Customers.
- Sellers and applications.
- Products, variants, categories, and approval states.
- Orders and vendor sub-orders.
- Payment attempts, refunds, commissions, settlements, and reconciliation records.
- Delivery zones, slots, partners, and status records where applicable.
- Promotions, reviews, support tickets, content, staff, audit events, and settings.

Keep IDs and relationships consistent across records. Do not add fields, statuses, or rules that the source does not support. Keep all changes local to the demo and clearly label mock data.

## 11. Responsive behavior and accessibility

- Support mobile, tablet, and desktop layouts.
- Use accessible contrast and visible keyboard focus.
- Use semantic form controls and labels.
- Ensure dialogs and navigation can be operated with a keyboard.
- Provide descriptive alt text for images.
- Avoid excessive gradients, clutter, oversized empty hero areas, and distracting animation.
- Use loading, empty, and error states where relevant.

## 12. Implementation sequence

1. Set up the new Super Admin frontend project.
2. Add design tokens, app shell, and route navigation.
3. Implement email/password mock login, demo session, route checks, and logout.
4. Create typed mock fixtures and shared table/form/dialog/status components.
5. Implement the dashboard.
6. Implement each source-defined Super Admin page.
7. Connect search, filters, sorting, pagination, forms, confirmations, and mock state transitions.
8. Add responsive behavior, accessibility, and empty/error/loading states.
9. Check every navigation link and visible control.
10. Report what is implemented and list unspecified rules that need clarification.

## 13. Required Super Admin routes

The source defines these routes:
- `/admin`
- `/admin/customers`
- `/admin/sellers`
- `/admin/sellers/approvals`
- `/admin/products`
- `/admin/products/approvals`
- `/admin/categories`
- `/admin/orders`
- `/admin/payments`
- `/admin/refunds`
- `/admin/commissions`
- `/admin/settlements`
- `/admin/delivery`
- `/admin/coupons`
- `/admin/reviews`
- `/admin/support`
- `/admin/content`
- `/admin/reports`
- `/admin/staff`
- `/admin/audit-logs`
- `/admin/settings`

The current frontend task additionally requires `/admin/login` for email/password login. No public Super Admin registration route is to be created.

## 14. Acceptance checklist

- [ ] Only the Super Admin frontend is in the implementation target.
- [ ] Email/password login is present and uses mock authentication.
- [ ] No public Super Admin registration page exists.
- [ ] Logout and frontend-only protected-route behavior work in the demo.
- [ ] Dashboard includes all source-defined metrics.
- [ ] Every source-defined Super Admin management area has a page.
- [ ] All listed routes resolve to a real screen or a clearly defined redirect.
- [ ] Search, filters, sorting, pagination, and forms work where applicable.
- [ ] Consequential mock actions show confirmation and visible local state changes.
- [ ] Mock actions are never presented as real provider/backend operations.
- [ ] Product organic/certification claims are supported by mock review data.
- [ ] Parent orders, sub-orders, payment, commission, refund, settlement, and payout records are consistent.
- [ ] UI is responsive and follows the source's accessibility/design requirements.
- [ ] No unsourced features, business rules, permissions, calculations, or screens have been added.
- [ ] Unspecified rules are marked **Needs clarification**.

## 15. Final instruction

Build the Super Admin frontend described in the scope and source prompt. Build only this application. Keep this phase frontend-only with mock data and simulated local interactions. Do not invent missing requirements; identify them for clarification.
