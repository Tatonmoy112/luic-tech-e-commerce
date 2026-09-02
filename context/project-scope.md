# Project Scope

## Objective

Build Luic_Tech as a Bangladesh-focused, single-vendor B2C commerce platform that can serve millions of users without sacrificing module ownership, security, or operational clarity.

## Business boundaries

Luic_Tech owns its catalog, inventory, prices, promotions, customer relationship, order flow, payments, and fulfillment. It is not a marketplace, a WooCommerce installation, or a generic CMS storefront.

Primary actors are:

- Guests browsing, searching, and maintaining a temporary cart.
- Authenticated customers checking out, paying, tracking orders, and requesting returns.
- Administrators managing policies and business configuration.
- Customer-support agents assisting users through audited workflows.
- Warehouse operators managing stock and fulfillment.
- Finance staff reconciling payments, refunds, and cash on delivery.
- Marketing staff managing content, campaigns, and promotions.
- Internal services, scheduled workers, and verified external providers.

## Mandatory customer journey

Guests may browse, search, and add items to a persistent guest cart. Checkout is an authentication boundary: the customer signs in or registers using Bangladesh mobile OTP, the guest cart is safely merged into the customer cart, and the checkout resumes without trusting client-supplied prices, discounts, stock, delivery charges, or payment state.

## Product capabilities

- Bengali and English catalog content, category trees, variants, media, SEO, and attribute-rich products.
- Bengali and English search with transliteration/phonetic support, typo tolerance, filters, and availability awareness.
- Multiple warehouses, stock reservations, low-stock signals, backorder, and pre-order policy.
- Configurable BDT pricing, VAT, campaigns, vouchers, targeting, usage limits, and exclusions.
- Guest and authenticated carts, wishlists, deterministic cart merge, and server-side revalidation.
- Address, delivery option, payment option, review, and confirmation checkout flow.
- Order lifecycle, split fulfillment, cancellation, returns, refunds, and reorders.
- SSLCommerz, bKash, Nagad, Rocket, and cash-on-delivery through provider adapters.
- Pathao, Steadfast, RedX, eCourier, and Sundarban through courier adapters.
- Customer notifications, editorial CMS, recommendations, reporting, and immutable audit evidence.
- A separately deployed and separately authorized admin application.

## Project-wide invariants

1. A business module is the sole writer and schema owner for its data.
2. Cross-module communication uses a typed service contract or a versioned event; no cross-module table access or foreign key is allowed.
3. Payment credentials and raw card data never enter Luic_Tech application servers or logs.
4. Every protected request is authenticated and authorized for audience, scope, permission, resource, and bounded-fresh risk/revocation state.
5. Customer and admin identities, tokens, BFFs, route registries, and deployments remain isolated; IAM, Payment, and Inventory also use restricted entrypoints, credentials, and network policy.
6. Inventory/promotion are reserved before payment; after the verified payment/COD commitment they are committed before OMS confirmation. Retries cannot double-reserve, double-charge, redeem twice, or duplicate orders.
7. Prices, promotions, taxes, delivery fees, and order totals are calculated server-side and preserved as immutable order snapshots.
8. External callbacks are authenticated, replay-protected, idempotent, and reconciled asynchronously.
9. PII is minimized, encrypted, redacted from logs, and exposed only for a documented purpose.
10. All state-changing operations carry correlation, actor, and audit context. Every externally retriable mutation has operation/principal-scoped idempotency or a documented stronger one-time protocol.

## Quality baselines

| Area | Baseline |
| --- | --- |
| Web performance | Target first contentful paint below 2 seconds at the 75th percentile on representative Bangladesh mobile networks. |
| Query performance | Target cached/search read API latency below 200 ms at the 95th percentile; define per-endpoint SLOs before launch. |
| Initial load | Validate at least 10,000 concurrent users with a documented traffic model before production launch. |
| Availability | Define tiered SLOs; checkout, order, and payment paths require graceful degradation and recovery runbooks. |
| Accessibility | WCAG 2.2 AA for customer and admin interfaces. |
| Localization | UTF-8 end to end; Bengali and English; `BDT` with locale-aware display. |
| Security | Zero Trust, TLS 1.3 at controlled edges, encryption at rest, least privilege, admin MFA, and auditable actions. |
| Recovery | Every durable workflow defines retry, timeout, idempotency, compensation, reconciliation, and dead-letter behavior. |
| Observability | Structured redacted logs, metrics, distributed traces, correlation IDs, alert ownership, and runbooks. |

These are architecture baselines, not proof of achievement. Load, security, accessibility, and recovery tests must supply release evidence later.
