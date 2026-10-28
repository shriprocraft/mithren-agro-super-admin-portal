# Organic Fruits & Vegetables Marketplace — Super Admin Scope

## 1. Purpose

Define the Super Admin Panel scope for the Organic Fruits & Vegetables Multi-Vendor Marketplace, based on the supplied master prompt. The implementation target is the Super Admin Panel only. The Customer Storefront, Seller/Vendor Portal, and Delivery Partner Portal are outside this frontend task.

## 2. Super Admin access

The source defines:
- A separate protected Super Admin dashboard at `/admin`.
- No public registration for Admin or Super Admin accounts.
- Role-based access control, including Super Admin access for full platform configuration, role/permission management, financial settings, audit logs, and marketplace operations.
- A permission matrix, data ownership enforcement, protected Super Admin access, and logging of sensitive administrative actions.

The current frontend task additionally requires an email/password Super Admin login. This login is to be represented in the frontend using mock authentication for this phase; no real authentication provider or backend integration is part of the current frontend task.

## 3. Dashboard

Source-defined dashboard metrics:
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

The source states that metrics must come from database queries and be clearly defined for the full application. During the current frontend-only phase, show corresponding values from mock data. Do not invent a formula where the source does not define one.

## 4. Management sections

### 4.1 Customer management
- Search.
- Status and account restrictions.
- Support history.
- Privacy-safe access to customer information.

### 4.2 Seller management
- Seller applications.
- Document review.
- Approvals and rejection reasons.
- Suspension and reinstatement.
- Ratings and performance.

### 4.3 Product and catalogue management
- Products.
- Categories.
- Variants.
- Images.
- Approval queue.
- Reports.
- Listing moderation.

### 4.4 Orders
- All orders and vendor sub-orders.
- Order status and payment state.
- Cancellations.
- Refunds.
- Disputes.
- Audit trail.

### 4.5 Payments
- Payment attempts.
- Gateway references.
- Webhook status.
- Refunds.
- Reconciliation.
- Failed-payment handling.

### 4.6 Commission
- Global defaults.
- Category overrides.
- Seller-specific overrides.
- Effective dates.
- Immutable historical calculation records.

### 4.7 Seller settlements
- Eligible balances.
- Settlement batches.
- Payout references.
- Failures.
- Reconciliation.

### 4.8 Delivery
- Delivery zones.
- Fees.
- Minimum order values.
- Delivery slots.
- Capacity.
- Delivery partners.
- Serviceability.

### 4.9 Promotions
- Coupons.
- Discount campaigns.
- Featured products.
- Banners.
- Seasonal campaigns with start/end dates, limits, and validation.

### 4.10 Reviews
- Report handling.
- Moderation.
- Abuse prevention.

### 4.11 Content
- Homepage sections.
- Policy pages.
- FAQs.
- Contact details.
- Announcements.

### 4.12 Notifications
- Templates.
- Delivery logs for email/SMS/WhatsApp/push integrations when configured.

### 4.13 Support
- Tickets.
- Status.
- Priority.
- Assignment.
- Replies.
- Resolution history.

### 4.14 Reports
- Sales.
- Orders.
- Products.
- Sellers.
- Commissions.
- Settlements.
- Refunds.
- Cancellations.
- Taxes where applicable.
- Delivery metrics.
- CSV export with authorization.

### 4.15 Settings
- Branding.
- Currency (INR default in source).
- Timezone (Asia/Kolkata default in source).
- Contact details.
- Payment options.
- Shipping rules.
- Taxes.
- Policies.
- Feature toggles.

### 4.16 Roles and permissions
- Least-privilege access for admin staff.
- Permission matrix and access enforcement as part of the full application.

### 4.17 Audit logs
- Actor.
- Action.
- Target.
- Timestamp.
- Relevant before/after values.
- Do not store passwords, secrets, or unnecessary personal data.

## 5. Multi-vendor order model

The Super Admin must be able to inspect marketplace orders and vendor sub-orders as described by the source. Keep parent order and sub-order relationships consistent in the frontend mock data. Administrative order views must cover the source-defined order status, payment state, cancellation, refund, dispute, and audit-trail information.

## 6. Security and privacy requirements from the source

- Super Admin access is protected.
- No public Admin/Super Admin registration.
- Role-based access control and a permission matrix are required in the full application.
- Sensitive administrative actions are logged.
- Customer access is privacy-safe.
- Do not expose secrets or unnecessary personal data.
- A frontend-only mock route check is not production security; production authorization is outside the current frontend-only implementation phase.

## 7. Required Super Admin routes from the source

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

The email/password login route is required by the current frontend task; use `/admin/login` for that screen. The source prohibits public Admin/Super Admin registration.

## 8. Source-defined acceptance and implementation requirements applicable to Super Admin

- Every navigation link must lead to a real page; create redirects or aliases where needed.
- If a feature is deferred, label it clearly and remove misleading interactive controls.
- Validate forms and show loading, empty, success, and error states where applicable.
- Do not leave core controls as nonfunctional buttons.
- Do not represent a payment, SMS, email, map, payout, or other provider action as successful unless it actually succeeded. In this frontend phase, provider actions must remain simulated and clearly labeled as mock.
- Protect sensitive data and avoid exposing credentials/secrets.
- Keep financial/order/settlement records consistent.
- Test critical workflows and document what was actually tested.

## 9. Current frontend phase

- Build the Super Admin frontend only.
- Use mock data and simulated local interactions.
- Do not integrate real APIs, backend services, authentication providers, payment gateways, KYC services, banking, messaging providers, or live delivery systems in this phase.
- Implement the email/password login as mock authentication.
- No public Super Admin registration.
- Clearly identify mock outcomes as demo outcomes.
- Do not add features or business rules beyond the source and the explicit frontend instructions.
- If a required business rule is not specified, ask for clarification rather than inventing one.
