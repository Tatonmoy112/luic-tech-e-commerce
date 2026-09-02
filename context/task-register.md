# Delivery Task Register

This is the authoritative dependency-ordered backlog. Status values are defined in [README.md](README.md). "Evidence" describes the proof required for completion, not work already performed.

## 0. Architecture and discovery

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| FND-001 | Establish canonical project context, architecture, contracts, security baseline, ADRs, and backlog | None | Cross-linked context documents; consistency/link validation; next task brief | complete |
| FND-002 | Resolve business policy matrix: VAT, cancellation, returns, backorder/pre-order, delivery zones, fraud, privacy/retention, approvals | FND-001 | Approved decision matrix with owners, defaults, unresolved items, and module impacts | not started |
| FND-003 | Define engineering Definition of Done, test pyramid, performance budgets, SLO tiers, and release evidence | FND-001 | Quality matrix mapped to CI/release gates and accountable owners | not started |
| EXT-001 | Provision non-production mobile OTP provider access | FND-001 | Secret-manager references and non-sensitive send/status connectivity check | not started |
| EXT-002 | Provision Google/Facebook/Apple identity-provider applications | FND-001 | Redirect/client configuration evidence and secret-manager references | not started |
| EXT-003 | Provision SSLCommerz sandbox | FND-001 | Merchant/reference configuration and non-sensitive sandbox connectivity | not started |
| EXT-004 | Provision bKash Merchant sandbox | FND-001 | Merchant/reference configuration and non-sensitive sandbox connectivity | not started |
| EXT-005 | Provision Nagad sandbox | FND-001 | Merchant/reference configuration and non-sensitive sandbox connectivity | not started |
| EXT-006 | Provision Rocket sandbox | FND-001 | Merchant/reference configuration and non-sensitive sandbox connectivity | not started |
| EXT-007 | Provision Pathao sandbox | FND-001 | Account/zone configuration and non-sensitive sandbox connectivity | not started |
| EXT-008 | Provision Steadfast sandbox | FND-001 | Account/zone configuration and non-sensitive sandbox connectivity | not started |
| EXT-009 | Provision RedX sandbox | FND-001 | Account/zone configuration and non-sensitive sandbox connectivity | not started |
| EXT-010 | Provision eCourier sandbox | FND-001 | Account/zone configuration and non-sensitive sandbox connectivity | not started |
| EXT-011 | Provision Sundarban sandbox | FND-001 | Account/zone configuration and non-sensitive sandbox connectivity | not started |
| EXT-012 | Provision non-production SMS/email/push delivery access | FND-001 | Secret-manager references and non-sensitive channel connectivity checks | not started |
| EXT-013 | Provision non-production S3-compatible storage/CDN access | FND-001 | Least-privilege identity, private bucket, CORS/lifecycle policy, and connectivity evidence | not started |

## 1. Executable platform foundation

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| PLT-001 | Scaffold pnpm/Nx workspace with storefront/admin BFFs, customer/admin APIs, restricted IAM/Inventory/Payment APIs, webhook ingress, workers, contracts, modules, and platform projects | FND-001 | Frozen clean install plus lint, type-check, unit test, and production build commands passing | not started |
| CI-001 | Add minimal continuous integration for frozen install, formatting, lint, type-check, unit tests, build, and secret scan | PLT-001 | Each basic gate runs on a clean change and a deliberate failure blocks it | not started |
| PLT-002 | Enforce public-facade imports and bounded-context/layer dependency rules | PLT-001 | Architecture test and Nx rule reject deliberate forbidden imports | not started |
| PLT-003 | Add repeatable local PostgreSQL, Redis, RabbitMQ, and S3-compatible services | PLT-001 | Documented start/stop; automated health checks; no committed secrets | not started |
| PLT-004 | Establish per-context Prisma schema/client/migration/DB-role pattern | PLT-002, PLT-003 | Reproducible migration and integration test proving cross-schema access is denied | not started |
| PLT-005 | Add validated configuration, secret interfaces, RFC 9457 errors, correlation, and PII-safe logging | PLT-001 | Invalid config fails startup; unit tests prove redaction and safe errors | not started |
| PLT-006 | Implement standard HTTP trust pipeline and API documentation shell | PLT-005 | Authentication/authorization hook, validation, headers, request limits, rate-limit hook, idempotency hook, and OpenAPI tests | not started |
| PLT-007 | Implement transactional outbox/inbox, event envelope, relay, retries, and dead-letter primitives | PLT-003, PLT-004, PLT-005 | Crash/duplicate/reorder tests prove one business effect and recoverable DLQ replay | not started |
| PLT-008 | Add health/readiness, OpenTelemetry traces, metrics, and redacted structured logs | PLT-005, PLT-007 | One test request correlates API, database, event, and worker telemetry without PII | not started |
| PLT-009 | Enforce restricted IAM/Inventory/Payment deployment, runtime identity, secret, network, and egress isolation | PLT-003, PLT-005, PLT-006 | Entrypoint composition tests plus deployment/network policy prove core processes cannot load restricted credentials | not started |
| MED-001 | Implement shared secure media ingestion, scan, transform, and object-storage capability | PLT-003, PLT-005, EXT-013 | Presign/type/size/content/malware/metadata/transform/quarantine/retention contract tests | not started |
| AUD-001 | Implement append-only Audit context and local audit-outbox contract | PLT-004, PLT-007 | Actor/action/resource/result/decision evidence; tamper/replay and access-control tests | not started |
| CI-002 | Expand CI with migration, architecture, OpenAPI/AsyncAPI compatibility, integration, dependency, container, and policy gates | CI-001, FND-003, PLT-002, PLT-004, PLT-005, PLT-007 | A deliberately failing fixture blocks each expanded critical gate | not started |

## 2. Identity and customer

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| IAM-001 | Model subjects, customer/admin clients, roles, permissions, devices, sessions, security versions, and token families | PLT-004, PLT-006, PLT-009, AUD-001 | Migrations and repository/domain tests for uniqueness, lifecycle, monotonic versions, and isolation | not started |
| IAM-002 | Implement Bangladesh mobile OTP challenge and verification | IAM-001, EXT-001 | Generic response, expiry, attempts, replay, cooldown, multi-key rate limit, and sandbox delivery tests | not started |
| IAM-003 | Implement signed 15-minute access tokens and rotating 7-day refresh families | IAM-001, IAM-002 | Rotation, concurrent use, reuse detection, expiry, logout, revocation, and key-roll tests | not started |
| IAM-004 | Enforce audiences, RBAC/permissions, scopes, owner/resource policy, revocation/status freshness, and customer/admin isolation | IAM-003, PLT-006, PLT-009 | Generated authorization matrix plus cross-audience/object/function/property, stale projection, emergency denylist, and live-introspection tests | not started |
| IAM-005 | Add admin MFA, step-up, recovery, and high-risk approval obligations | IAM-004 | Enrollment, recovery, lockout, step-up freshness, dual-approval, and audit tests | not started |
| CUS-001 | Implement customer profiles, authoritative communication consent/destination resolution, preferences, and multiple addresses | IAM-004, PLT-004 | Ownership/version, purpose-bound address/destination evidence, PII encryption/masking, consent, and audit tests | not started |
| CUS-002 | Implement audited, constrained support impersonation | IAM-005, CUS-001, AUD-001 | Actor+subject delegation, reason/ticket, expiry, banner metadata, forbidden actions, and audit tests | not started |
| CUS-003 | Implement privacy request, legal-hold/retention disposition, owner acknowledgement, and completion workflow | CUS-001, FND-002, PLT-007, AUD-001 | Per-owner erase/pseudonymize/retain, retry/DLQ, backup handling, evidence, and false-completion tests | not started |
| IAM-006 | Add email/password and Google/Facebook/Apple adapters | IAM-003, EXT-002 | Secure linking/recovery and provider contract tests | not started |

## 3. Catalog, inventory, pricing, promotion, search, and CMS

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| CAT-001 | Implement categories, brands, products, variants/SKUs, attributes, localized copy, and SEO | PLT-004, AUD-001 | Constraints, SKU uniqueness, category-cycle, Unicode, slug, lifecycle, and event tests | not started |
| CAT-002 | Implement Catalog-owned product-media metadata, ordering, and publication through the media capability | CAT-001, MED-001 | Catalog authorization/publication and orphan-reference cleanup tests; no CMS metadata coupling | not started |
| CAT-003 | Implement public Catalog APIs and cache policy | CAT-001, CAT-002, PLT-006 | OpenAPI, pagination, locale, field allowlist, visibility, cache, and query-budget tests | not started |
| CAT-004 | Implement audited admin Catalog CRUD and bulk CSV import | CAT-001, CAT-002, IAM-005 | Permission/step-up/version tests and row-level import error report | not started |
| INV-001 | Implement warehouses and immutable stock-movement ledger in the restricted Inventory deployment | CAT-001, PLT-004, PLT-009, AUD-001 | Balance reconciliation, duplicate command, concurrent adjustment, and restricted-credential tests | not started |
| INV-002 | Implement availability plus atomic reserve/commit/release/expiry | INV-001, PLT-007 | High-concurrency no-oversell, TTL, idempotency, and compensation tests | not started |
| INV-003 | Add low-stock, backorder, and pre-order policy | INV-002, FND-002 | Policy matrix tests and alert events | not started |
| PRI-001 | Implement BDT price books, sale/bulk pricing, VAT, quote/version/expiry | CAT-001, FND-002 | Golden precision/effective-date cases and tampered/stale quote tests | not started |
| PRO-001 | Implement campaigns, vouchers, targeting, exclusions, priority, and free shipping | PRI-001, CUS-001, FND-002 | Eligibility and deterministic conflict-resolution tests | not started |
| PRO-002 | Add atomic voucher reservation/commit/release and usage limits | PRO-001, PLT-007 | Concurrent redemption never exceeds limits; expiry/retry tests | not started |
| SEA-001 | Build replayable Search projection from Catalog/Pricing/Inventory/Promotion events | CAT-001, PRI-001, INV-002, PRO-001, PLT-007 | Full replay, checkpoint, duplicate, stale/gap, public/general-offer allowlist, and cache invalidation tests | not started |
| SEA-002 | Implement Bengali/English search, transliteration/phonetics, typo tolerance, and filters | SEA-001 | Relevance corpus including Bengali/English spellings; p95 query budget evidence | not started |
| CMS-001 | Implement localized pages, banners, navigation, scheduling, and CMS-owned media publication | MED-001, IAM-005, AUD-001 | Draft/publish/unpublish/schedule/rollback, permission, separate media metadata, cache, and locale tests | not started |
| BFF-001 | Implement non-authoritative Storefront product composition from Catalog, public Pricing, coarse Inventory, and general Promotion facts | CAT-003, PRI-001, INV-002, PRO-001, PLT-006 | Field allowlist, source version/freshness, cache, outage degradation, and checkout non-authority tests | not started |

## 4. Cart, OMS, logistics, payment, and checkout

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| CRT-001 | Implement signed-handle browser guest cart | CAT-003, PRI-001, INV-002 | Add/update/remove, ownership, expiry, persistence, tamper, and quota tests | not started |
| CRT-002 | Implement authenticated cart and deterministic guest merge | CRT-001, IAM-004 | Repeated merge is idempotent and preserves only valid bounded quantities | not started |
| CRT-003 | Revalidate saleability, price, promotion, and availability on cart load | CRT-002, PRO-002 | Stale price, unavailable SKU, adjusted quantity, expired voucher, and messaging tests | not started |
| WSH-001 | Implement authenticated wishlist | IAM-004, CAT-003 | Ownership, deduplication, unavailable/unpublished product, and privacy tests | not started |
| LOG-001 | Define courier adapter; implement zones, package facts, rate, and ETA engine | FND-002, PLT-006 | Provider-neutral contract and deterministic zone/weight/rate/ETA tests | not started |
| ORD-001 | Implement OMS aggregate, immutable snapshots, and lifecycle state machine | CUS-001, PLT-004, AUD-001 | Valid/invalid transition, version, idempotency, and snapshot immutability tests | not started |
| PAY-001 | Implement restricted gateway abstraction, payment intents/attempts, Payment-owned refund approvals, normalized commitment state, and append-only transaction/refund/reconciliation ledger | ORD-001, PLT-004, PLT-006, PLT-009, AUD-001 | Separation-of-duty approval plus unique references/events, derived-balance/immutable-ledger, payable authority, idempotency, and no-credential tests | not started |
| PAY-002 | Implement raw-byte-verified callbacks, return-state verifier, unknown-outcome lookup, COD commitment mapping, and reconciliation shell | PAY-001, PLT-007 | Forged/replayed/duplicate/out-of-order/missing callback, raw retention/leakage, return redirect, commitment predicate, and timeout tests | not started |
| CHK-001 | Implement authenticated checkout session, owner-issued address/delivery evidence, final Pricing quote, and payment selection | CRT-003, CUS-001, LOG-001, PRO-002 | Guest denial; Logistics-before-Pricing sequence; evidence binding/expiry; catalog/price/promotion/stock revalidation tests | not started |
| CHK-002 | Implement persisted idempotent payment-to-reservation-to-order-confirmation saga | CHK-001, ORD-001, PAY-002, INV-002 | Duplicate submission creates one order/attempt; commitment is verified; Inventory/Promotion commit before confirmation; late/partial failures enter recovery | not started |
| ORD-002 | Add confirmation, processing, packing, warehouse split, and shipment planning | CHK-002, LOG-001 | Partial fulfillment, allocation, duplicate event, and transition tests | not started |
| ORD-003 | Implement cancellation request, policy, and compensation | ORD-002, INV-002, PAY-001, FND-002 | Stock/promotion/payment/logistics effects occur once; partial failure is visible/recoverable | not started |
| RET-001 | Implement return request, approval, receipt, restock, and refund orchestration | ORD-002, PAY-001, INV-001, FND-002 | Full/partial return, rejection, refund, restock, and recovery tests | not started |
| ORD-004 | Implement reorder and audited manual order creation | ORD-001, CRT-003, IAM-005 | Revalidation of current facts and permission/step-up/audit tests | not started |

## 5. Provider adapters and notifications

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| PAY-003 | Implement SSLCommerz adapter | PAY-002, EXT-003 | Sandbox success/failure/cancel/timeout/callback/refund contract suite | not started |
| PAY-004 | Implement bKash Merchant adapter | PAY-002, EXT-004 | Sandbox create/execute/query/callback/refund contract suite | not started |
| PAY-005 | Implement Nagad adapter | PAY-002, EXT-005 | Signed sandbox happy/failure/replay/refund contract suite | not started |
| PAY-006 | Implement Rocket adapter | PAY-002, EXT-006 | Sandbox happy/failure/replay/refund contract suite | not started |
| PAY-007 | Complete settlement reconciliation, mismatch operations, and fraud signals | PAY-003, PAY-004, PAY-005, PAY-006, AUD-001 | Statement reconciliation, alert/retry/manual resolution, approval, and audit tests | not started |
| LOG-002 | Implement Pathao adapter | LOG-001, EXT-007 | Quote/create/cancel/track sandbox contract suite | not started |
| LOG-003 | Implement Steadfast adapter | LOG-001, EXT-008 | Quote/create/cancel/track sandbox contract suite | not started |
| LOG-004 | Implement RedX adapter | LOG-001, EXT-009 | Quote/create/cancel/track sandbox contract suite | not started |
| LOG-005 | Implement eCourier adapter | LOG-001, EXT-010 | Quote/create/cancel/track sandbox contract suite | not started |
| LOG-006 | Implement Sundarban adapter | LOG-001, EXT-011 | Quote/create/cancel/track sandbox contract suite | not started |
| LOG-007 | Implement provider-neutral tracking synchronization/recovery with Pathao as the initial vertical slice | LOG-002, PLT-007 | Duplicate/out-of-order/missing callback, polling recovery, and OMS projection tests | not started |
| LOG-008 | Extend tracking across all couriers and implement COD reconciliation | LOG-003, LOG-004, LOG-005, LOG-006, LOG-007, PAY-007 | Per-provider parity plus COD remittance mismatch/recovery tests | not started |
| NOT-001 | Implement registered templates, Profile-owned destination/consent resolution, SMS/email/push adapters, retry, and suppression | PLT-007, IAM-004, CUS-001, EXT-012 | Typed-variable/source-event registry, transactional-vs-marketing consent, retry, DLQ, redaction, and delivery tests | not started |
| NOT-002 | Connect authentication, core order, initial payment, and initial shipment notifications | NOT-001, IAM-002, ORD-002, PAY-003, LOG-007 | Event-to-message tests for core lifecycle without destination/event PII | not started |
| NOT-003 | Connect cancellation, return, refund, and multi-courier notifications | NOT-002, ORD-003, RET-001, LOG-008, PAY-007 | Event-to-message tests for post-purchase lifecycle and partial-failure states | not started |

## 6. Storefront and admin applications

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| WEB-001 | Build responsive storefront shell, tokens, bilingual UI, BDT formatting, and accessibility baseline | PLT-001, FND-003 | Locale snapshots, keyboard flow, automated accessibility checks, and mobile performance budget | not started |
| WEB-002 | Build home, navigation, category, listing, product detail, and CMS surfaces | WEB-001, BFF-001, CMS-001 | Bengali/English Playwright browse flow, source freshness, degradation, and public cache behavior | not started |
| WEB-003 | Build search, suggestions, filters, empty/error states, and pagination | WEB-001, SEA-002 | URL-state, accessibility, mobile, relevance, and Playwright search tests | not started |
| WEB-004 | Build guest/authenticated cart and wishlist UI | WEB-001, CRT-003, WSH-001 | Browser persistence and post-login merge E2E | not started |
| WEB-005 | Build OTP login/registration, session, profile, and address UI | WEB-001, IAM-004, CUS-001 | OTP/refresh/logout/address/security E2E | not started |
| WEB-006 | Build forced-auth checkout and initial SSLCommerz/COD handoff behind provider feature flags | WEB-004, WEB-005, CHK-002, PAY-003 | Guest-to-login-to-restored-checkout prepaid/COD E2E and safe provider-return polling | not started |
| WEB-007 | Build order history, tracking, cancellation, return, refund state, and reorder UI | WEB-005, ORD-003, RET-001, ORD-004, LOG-007 | Complete post-purchase Playwright suite for the initial vertical slice | not started |
| ADM-001 | Build separately deployed admin shell, auth, permission navigation, and MFA/step-up UX | IAM-005, WEB-001 | Customer-token rejection and admin permission/session E2E | not started |
| ADM-002 | Build catalog/media/import, inventory, pricing, promotion, and CMS operations | ADM-001, CAT-004, INV-003, PRO-002, CMS-001 | Role-scoped operational scenarios with audit evidence | not started |
| ADM-003 | Build order, fraud, fulfillment, multi-courier, return, refund, and reconciliation consoles | ADM-001, ORD-003, RET-001, PAY-007, LOG-008 | Failure/recovery operations scenarios with step-up/approval/audit | not started |
| ADM-004 | Build support tools, customer communication, and impersonation UX | ADM-001, CUS-002, NOT-001 | Reason/ticket/expiry/visible delegation and forbidden-action E2E | not started |

## 7. Recommendation, reporting, and production readiness

| ID | Task | Dependencies | Required completion evidence | Status |
| --- | --- | --- | --- | --- |
| ANL-001 | Define consent-aware, pseudonymous interaction/conversion measurement contract and retention/opt-out enforcement | CUS-001, CUS-003, PLT-007, FND-002 | Schema allowlist, consent withdrawal, erasure, replay, and telemetry-leakage tests | not started |
| REC-001 | Build deterministic non-personalized recommendations from public Catalog facts only | CAT-003, PLT-007 | Quality evaluation, event/replay tests, absence of customer/order linkage, and safe fallback | not started |
| REC-002 | Add consent-aware behavioral personalization | REC-001, ANL-001 | Opt-in/out, pseudonym rotation, retention/erasure, bias/quality, and fallback tests | not started |
| REP-001 | Define metrics and build reporting projections for revenue, orders, conversion, inventory, initial payments, and COD | ORD-002, PAY-003, INV-001, PLT-007, ANL-001, FND-002 | Metric definitions, source reconciliation, replay, freshness, and masking tests | not started |
| REP-002 | Build authorized dashboards, filters, and exports | REP-001, ADM-001 | KPI reconciliation, permission, masking, formula-injection, and export tests | not started |
| TST-001 | Complete cross-context integration/contract/resilience suites | CI-002, IAM-006, CUS-002, CUS-003, CAT-004, INV-003, PRO-002, SEA-002, CMS-001, CRT-003, WSH-001, ORD-003, RET-001, ORD-004, PAY-007, LOG-008, NOT-003, REC-002, REP-001 | CI evidence for happy, denial, timeout, duplicate, reorder, compensation, and compatibility cases | not started |
| TST-002 | Complete critical customer/admin E2E suites | WEB-002, WEB-003, WEB-006, WEB-007, ADM-002, ADM-003, ADM-004, REP-002 | Passing browse/search, prepaid/COD, cancellation, return/refund, fulfillment, reporting, and admin operations journeys | not started |
| PERF-001 | Validate search latency, checkout contention, and representative 10,000-user load in staging | TST-001, SEA-002, CHK-002, OPS-001 | Reproducible traffic model/report meeting agreed percentile/error budgets | not started |
| PERF-002 | Validate storefront FCP target on representative Bangladesh devices/networks | WEB-002, WEB-003, WEB-007, OPS-001 | Lab and field-style Web Vitals evidence plus regression budget | not started |
| OPS-001 | Build production images, environment promotion, restricted network policies, Kubernetes-ready deployment, and safe migrations | PLT-008, PLT-009, CI-002 | Staging deploy, credential-isolation, rollback, health, and zero-downtime migration proof | not started |
| OPS-002 | Configure TLS, encryption, backup, retention, restore, and key rotation | OPS-001, FND-002 | Configuration evidence plus restore/key-rotation exercises | not started |
| OPS-003 | Define SLOs, dashboards, alerts, ownership, and runbooks | OPS-001, PLT-008, FND-003 | Alert fire/recovery drills linked to actionable runbooks | not started |
| REL-001 | Test broker/provider/data dependency failures, retries, circuits, DLQ replay, and disaster recovery | OPS-001, TST-001 | Fault-injection report proving no lost/duplicate order, stock, or payment effect | not started |
| SEC-001 | Perform final Zero Trust, privacy, API, application, and infrastructure review; remediate findings | TST-002, OPS-002, REL-001 | Threat-control traceability and no unresolved unaccepted critical/high findings | not started |
| LCH-001 | Production-readiness review and controlled launch | PERF-001, PERF-002, OPS-003, REL-001, SEC-001 | Approved checklist, rollback/support plan, launch metrics, and accountable owners | not started |
