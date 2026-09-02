# Contract Catalog

Status: Baseline accepted; individual contracts remain to be implemented and expanded in their owning tasks.

## Contract rules

### Synchronous APIs

- Public, admin, provider, and module-facing HTTP contracts use REST with OpenAPI 3.1. External routes begin at `/v1`; internal TypeScript ports carry the same semantics without pretending that transport is the domain model.
- The owner validates syntax, domain invariants, authorization, resource ownership, and legal state transitions. A gateway validation result is never sufficient by itself.
- Every externally retriable mutation defines operation-specific idempotency. Unless a stronger one-time protocol applies (for example refresh-token rotation), the owner requires `Idempotency-Key` and stores environment, API client plus principal/guest handle, route/operation, key verifier, canonical body hash, authorization outcome, state, and response. The same key never returns another principal's result; a changed body conflicts. Retention covers the maximum documented client/provider retry window.
- Admin edits and aggregate transitions use optimistic concurrency (`If-Match`/ETag or `expectedVersion`). Stale writes fail rather than overwrite.
- Propagate W3C trace context plus correlation, causation, authenticated actor/workload, and deadline. Replace malformed client correlation IDs.
- Use RFC 9457 `application/problem+json` responses with stable Luic_Tech `code`, HTTP `status`, `correlationId`, and `retryable`. Never expose stack traces, SQL, internal object existence, PII, or provider details.
- A truly asynchronous command returns `202 Accepted` and an operation resource. Each contract states its timeout and whether a caller may retry.
- Never place direct PII, secrets, credentials, authorization facts, provider/internal-ledger IDs, or uncontrolled free text in URLs, headers used for routing, trace attributes, metric labels, idempotency keys, or broker routing metadata. Opaque non-sequential public resource IDs may appear in authenticated paths only with object authorization, `Referrer-Policy: no-referrer`, no shared caching/third-party subresources, and route-template-only logging. Public search input is length/schema bounded and removed or normalized in edge/application telemetry.

Canonical values:

| Value | Representation |
| --- | --- |
| Identifier | Opaque UUIDv7 string |
| Time | UTC RFC 3339 externally; PostgreSQL `timestamptz` internally |
| Money | Base-10 integer string within signed 64-bit bounds plus ISO currency, for example `{ "amountMinor": "125000", "currency": "BDT" }`; domains separately enforce nonnegative charges/refunds |
| Locale | BCP 47 (`bn-BD`, `en-BD`) |
| Weight/dimensions | Integer value with explicit unit |
| Pagination | Opaque cursor with bounded page size; no unbounded list endpoints |

### Integration events

- Events are immutable, past-tense facts. They are not commands or authorization grants.
- Delivery is at least once and may be duplicated or reordered. A consistent aggregate routing key is only an optimization; consumers enforce source/event deduplication, aggregate version and state preconditions, gap quarantine, and owner-query recovery.
- Publish state plus outbox in one owner transaction. A database-only consumer commits inbox plus its local effect together. A consumer with an external effect commits inbox plus a local intent/work item first, then calls the provider with an idempotent merchant reference and durably reconciles the result; it never marks work complete before an untracked external call.
- Event types are versioned, for example `com.luictech.catalog.product-published.v1`. Minor evolution is additive; a breaking change creates a new major event with an overlap and consumer migration plan.
- Payloads contain only the minimum facts needed by declared consumers. OTPs, session/payment tokens, secrets, full address/contact data, raw provider payloads, and free-form notes are forbidden.
- Outbox, inbox, retry, quarantine, and DLQ records use owner-specific encryption/access, schema allowlists, bounded retention, and audited replay/deletion. Stable pseudonymous IDs are permitted only on approved restricted topics with documented consumers and retention.

CloudEvents-compatible envelope:

```json
{
  "specversion": "1.0",
  "id": "01990d4c-0000-7000-8000-000000000001",
  "source": "/modules/order",
  "type": "com.luictech.order.order-confirmed.v1",
  "subject": "order/pub_01990d4c000070008000000000000002",
  "time": "2026-09-02T00:00:00Z",
  "datacontenttype": "application/json",
  "dataschema": "urn:luictech:events:order-confirmed:v1",
  "correlationid": "01990d4c-0000-7000-8000-000000000003",
  "causationid": "01990d4c-0000-7000-8000-000000000004",
  "traceparent": "00-00000000000000000000000000000001-0000000000000001-01",
  "aggregateversion": 3,
  "partitionkey": "pk_hmac_4cdb9f2a",
  "data": {}
}
```

## Initial external API surface

This is an ownership catalog, not the final OpenAPI specification.

| Owner/surface | Initial operations | Mandatory policy |
| --- | --- | --- |
| IAM | `POST /v1/auth/otp/challenges`, `/otp/verifications`, `/tokens/refresh`, `/sessions/revoke` | Do not reveal account existence; rate limit by normalized phone hash, device, and network; OTP has short TTL and attempt cap; refresh reuse revokes the token family. |
| Customer Profile | `GET/PATCH /v1/me`; CRUD `/v1/me/addresses`; privacy-request resources | Customer self only. PII may appear only in validated, minimized request/response bodies over protected channels; use safe serializers, `Cache-Control: private, no-store`, strict referrer policy, versioned mutations, and no body logging. |
| Storefront composition BFF | `GET /v1/storefront/products`, `/products/{slug}`, `/categories` | Combine Catalog, public display price, coarse availability, and general-promotion facts with source versions/freshness. Public field allowlist only; this view never authorizes checkout. |
| Search | `GET /v1/search` | Eventually consistent public/general offers only; never customer-targeted voucher eligibility. Bound query/filter cost, normalize query telemetry, and revalidate owners at checkout. |
| CMS | `GET /v1/content/{slug}` | Published, cache-safe projection only. |
| Cart | `GET /v1/cart`; `PUT/DELETE /v1/cart/items/{variantId}`; `POST /v1/cart/merge` | Guest handle is high-entropy bearer material stored as a server-side verifier and `Secure`/`HttpOnly`/`SameSite` cookie; mutation uses origin/CSRF checks, quota, TTL, and rotation. Authenticated one-time merge invalidates the handle and never trusts caller ownership/price. |
| Checkout | `POST /v1/checkouts`; `PUT /{id}/address`, `/delivery`, `/payment-method`; `POST /{id}/quote`, `/submit`; fixed provider-return landing path | Authenticated customer only. Quote/submit revalidate owner evidence. Payment return state is short-lived, single-use, verifier-stored, and bound to attempt, checkout/customer session, nonce, and an allowlisted exact origin/path; it resumes UI polling and never proves payment. |
| OMS / storefront order view | `GET /v1/orders`, `GET /v1/orders/{id}`, `GET /v1/orders/{id}/payment-status`, `GET /v1/orders/{id}/tracking`, cancellation/return request resources | OMS validates customer ownership and serves event-built normalized Payment/Logistics projections with explicit freshness/pending state. It never calls those owners synchronously. Clients request transitions and never set final state; Payment/Logistics expose no direct customer API merely to copy ownership. |
| Logistics quote | `GET /v1/delivery/options` through Checkout/BFF composition | Use validated zone/package facts rather than full address when possible; owner-issued quote is versioned, expiring, and non-authoritative until Pricing includes it in a final quote. |
| Admin API | Separate-host `/v1/admin/catalog`, `/inventory`, `/pricing`, `/promotions`, `/orders`, `/payments/refunds`, `/shipments`, `/reports`, `/support/impersonations` | Explicit permission and resource/state policy per operation, admin audience, MFA/step-up obligations, reason/audit, and optimistic concurrency. Never reuse customer controllers. |
| Support API | Dedicated admin-host allowlist for customer/order assistance; optional delegated browsing uses `luic-support-delegated` audience only | Preserve workforce actor plus target subject; hard-deny credentials, consent, security, and payment actions. Never issue a normal customer token. |
| Provider ingress | `POST /v1/webhooks/payments/{provider}` and `/logistics/{provider}` on dedicated ingress | Verify exact raw bytes before parsing with provider signature/certificate, timestamp, event/reference, and body limit. Store a normalized allowlist record; retain encrypted raw bytes only when dispute/replay policy requires, with owner-only access and no generic logs/DLQ. Source IP is defense in depth. |

## Initial synchronous module ports

| Owner contract | Authorized callers | Result/authority | Failure and privacy semantics |
| --- | --- | --- | --- |
| `IAM.introspectSecurityState(subjectRef, sessionRef, requiredFreshnessClass)` | Customer/admin policy enforcement points on designated routes | Signed current subject/session/authz/risk version and authentication strength | Closed freshness enum; restricted response. Unknown/stale state fails according to `security-baseline.md`. |
| `Profile.getAddressEvidence(addressId, checkoutRef, purpose=CHECKOUT_DELIVERY)` | Checkout private capability | Minimal recipient/contact/address/zone snapshot plus opaque/signed versioned evidence bound to customer, checkout, audience, purpose, and expiry | Callee derives caller and customer from trusted context; closed purpose enum and exact request schema; restricted/audited response. |
| `Profile.resolveNotificationDestination(subjectRef, channel, purpose, consentBasis)` | Notification private capability | One short-lived purpose-bound destination plus consent version | Profile/Consent is authoritative. Closed enums only; Notification template registry determines purpose/channel, and marketing vs mandatory transactional policy is separate. |
| `Catalog.getSellableVariantEvidence(lines, checkoutRef?)` | Cart, Checkout, Pricing private capabilities | Variant/SKU status, localized title snapshot, weight, tax class, catalog version, optionally owner-issued evidence | It provides neither price nor stock authority. Unknown fields reject; unavailable items are explicit business rejections. |
| `Catalog.getPublicProductView(ids)` | Storefront composition, Search projector | Public field-allowlisted product facts with version | No cost, unpublished/admin metadata, exact stock, or customer eligibility. |
| `Pricing.getPublicDisplayPrices(variantIds, locale)` | Storefront-composition and Search-projector service principals | General display prices and version/freshness | No customer-targeted voucher eligibility; not valid for checkout. |
| `Pricing.getCartPreview(lineEvidence, delegatedPrincipal)` | Cart private capability | Current line/general-or-customer-eligible promotion preview, versions/freshness, warnings | Pricing invokes Promotion using trusted delegated context. Explicitly non-final and never valid for order placement. |
| `Inventory.getPublicAvailability(variantIds, region)` | `storefront-composition` and `search-projector` principals with `inventory:availability.public` | Coarse public sellability and version/freshness | Cross-process Inventory API; no exact warehouse counts; not a reservation or checkout authority. |
| `Cart.getCheckoutSnapshot(cartId, principal, expectedVersion)` | Checkout private capability | Owner-bound lines and cart version | Authenticated customer required; stale version conflicts. Guest merge is a separate one-time authenticated operation. |
| `Logistics.createDeliveryQuote(zoneEvidence, catalogPackageEvidence, checkoutRef)` | Checkout private capability | Opaque/signed `deliveryQuoteRef`, base delivery amount, ETA, provider-neutral option, version, expiry, audience/checkout binding | Logistics verifies owner-issued Catalog weight/dimension evidence and closed zone schema; reconstructed/caller-supplied weights or costs are rejected. |
| `Promotion.evaluateForQuote(lineEvidence, delegatedPrincipal, checkoutRef)` | Pricing and Cart private capabilities | Promotion-issued customer/checkout-bound evaluation evidence, typed adjustments, targeting/usage versions, expiry | Promotion derives the customer from verified delegated context and its own approved targeting projection; caller cannot supply customer pseudonym, segment, eligibility, or approval facts. |
| `Pricing.createFinalQuote(lineEvidence, deliveryQuoteRef, checkoutRef, delegatedPrincipal)` | Checkout private capability | Opaque/signed final quote evidence bound to Promotion evaluation, customer, checkout, Catalog, delivery; authoritative line/VAT/promotion/delivery/grand-total breakdown, currency, versions, expiry | Pricing verifies owner-issued inputs, calls `Promotion.evaluateForQuote`, and is sole final-payable authority. Expiry/change requires requote. |
| `Promotion.reserve(finalQuoteRef, checkoutRef)` / `commit` / `release` | Checkout process manager private capability | Idempotent reservation evidence, state, bounded expiry, version | Promotion derives customer/eligibility from verified final quote and its own evaluation evidence; no caller identity/targeting facts. Expiry covers the payment deadline within Promotion policy bounds. |
| `Inventory.getAvailability(lines, region)` | `cart-api` and `checkout-api` principals with `inventory:availability.read` | Advisory sellability/quantity at an explicit version/time | Cross-process Inventory API; do not expose sensitive warehouse balances. Reservation remains the oversell boundary. |
| `Inventory.reserve(checkoutRef, lineEvidence, requestedPaymentDeadline)` / `commit` / `release` | `checkout-api` principal with operation-specific Inventory scopes | Atomic reservation evidence, lines, state, Inventory-authoritative bounded expiry, version | Cross-process service identity/mTLS. Inventory clamps deadline/TTL to policy; no indefinite caller lock. No oversell; identical retries return prior outcome; commit after payment commitment and before OMS confirmation. |
| `Order.createPending(checkoutRef, ownerEvidence, immutableSnapshots)` | Checkout private capability | Unique order ID, pending-payment state, aggregate version, payable snapshot version | OMS verifies signatures/integrity, audience, checkout binding, expiry, currency, and cross-evidence consistency without owner DB access. Checkout reference is unique. |
| `Order.confirm(orderId, expectedVersion, paymentCommitmentEvidence, inventoryCommitEvidence, promotionCommitEvidence)` / `cancelPending` / `recordPaymentStockException` | Checkout process manager private capability | Idempotent OMS state/version and emitted owner fact | OMS verifies owner-issued evidence and order/checkout/customer/amount/reservation bindings. Confirm is impossible before all required commits; cancel cannot override commitment; exception blocks fulfillment and exposes recovery. |
| `Order.getPayableSnapshot(orderId)` | Payment service identity | Server-authoritative amount, currency, customer/checkout binding, allowed method/state, payable version | Restricted result; Payment never trusts caller/client amount and uses these facts for BOLA/session binding. |
| `Payment.initialize(orderId, method, delegatedPrincipal, checkoutSessionRef, approvedReturnRouteId)` / `getStatus` | `checkout-api` service identity with delegated customer session | Opaque provider action or normalized ledger status; Payment mints a short-lived single-use return-state verifier | Payment matches delegated subject/session and method to OMS payable truth, enforces one active attempt/unique merchant reference, and rejects cross-order initialization. Exact return destinations are registered; unknown outcomes reconcile before another attempt. |
| `Order.getFulfillmentSnapshot(orderId, purpose=CREATE_OR_UPDATE_SHIPMENT)` | Logistics service identity after a targeted command | Minimal shipping/contact/package/COD snapshot | Closed purpose enum, command correlation, field allowlist, purpose audit, and configured retention. |
| `Order.getCustomerOrderView(principal, orderId)` | Storefront BFF | Owner-authorized order plus event-built normalized payment/tracking projections and explicit freshness/pending state | OMS performs object authorization. It never calls Payment/Logistics synchronously; a stale projection renders pending/retry UI. Private/no-store response. |
| `Payment.createRefundApprovalRequest(orderId, amountMinor, reasonCode)` / `approveRefund(requestId)` / `executeApprovedRefund(requestId)` | Authorized Finance roles with separate initiator/approver capabilities | Payment-owned approval request, immutable approvals, expiry/scope/policy version, refund operation and ledger state | Payment is the target-domain approval owner, enforces distinct actors and threshold policy from FND-002, reloads captured refundable balance at execution, and never trusts caller-supplied grant data. OMS uses the durable command below; Payment may place it in approval-pending state. |

No row authorizes a caller to import the owner's implementation or persistence model.

## Initial targeted durable commands

Commands have one authorized producer/process owner and one target owner. They use outbox/inbox, a unique command ID, expected aggregate version, idempotency key, deadline, policy/approval reference where required, and narrow broker ACL. The target revalidates its own state; receiving a command is not blanket authorization.

| Producer -> target | Versioned command | Required target checks |
| --- | --- | --- |
| OMS cancellation/return process -> Payment | `com.luictech.command.payment.request-refund.v1` (`urn:luictech:commands:payment:request-refund:v1`) | Captured refundable balance, order/payment mapping, approved policy state, reason code, separation/approval grant, duplicate command/reference. |
| OMS fulfillment process -> Logistics | `com.luictech.command.logistics.create-shipment.v1`, `cancel-shipment.v1`, `create-return-shipment.v1` (matching `urn:luictech:commands:logistics:*:v1`) | OMS version/state, purpose-bound snapshot, unique merchant shipment reference, provider lookup before retry. |
| OMS cancellation process -> Inventory | `com.luictech.command.inventory.release-reservation.v1` (`urn:luictech:commands:inventory:release-reservation:v1`) | Exact uncommitted reservation/order relation, cancellation state, current version, and duplicate command. No physical stock assertion. |
| OMS cancellation process -> Inventory | `com.luictech.command.inventory.release-allocation.v1` (`urn:luictech:commands:inventory:release-allocation:v1`) | Exact committed allocation, pick/pack status, warehouse ownership, cancellation policy, and append-only reversal movement. |
| OMS return process -> Inventory | `com.luictech.command.inventory.request-return-disposition.v1` (`urn:luictech:commands:inventory:request-return-disposition:v1`) | Approved return reference only. Inventory/Warehouse owns receipt, assigned warehouse, inspection, condition and restock/quarantine/dispose decision; it records append-only movement after physical evidence. |
| OMS cancellation process -> Promotion | `com.luictech.command.promotion.release-redemption.v1` (`urn:luictech:commands:promotion:release-redemption:v1`) | Redemption/order relation, configured eligibility to restore usage, current state/version. |
| Customer Profile privacy process -> each data owner | `com.luictech.command.privacy.apply-disposition.v1` (`urn:luictech:commands:privacy:apply-disposition:v1`) | Signed policy/legal-hold decision; owner chooses erase, pseudonymize, or retain; idempotent acknowledgement with evidence. |

Broad events such as cancellation/return requests are informational. Only an authorized owner process issues the targeted effects above.

## Initial integration-event catalog

| Producer | Exact type and schema | Intended consumers and permitted effect |
| --- | --- | --- |
| IAM | `com.luictech.iam.identity-registered.v1` / `urn:luictech:events:iam:identity-registered:v1` | Customer Profile provisioning, Notification, Reporting, Audit. It does not prove possession of a guest cart. |
| IAM | `com.luictech.iam.subject-status-changed.v1` / `urn:luictech:events:iam:subject-status-changed:v1` | Signed bounded-fresh authorization projections; restricted ACL. |
| IAM | `com.luictech.iam.session-revoked.v1` / `urn:luictech:events:iam:session-revoked:v1` | Gateway/module revocation projections; emergency denylist path also applies. |
| IAM | `com.luictech.iam.token-family-compromised.v1` / `urn:luictech:events:iam:token-family-compromised:v1` | Revoke/deny projections, security operations, Audit. |
| IAM | `com.luictech.iam.authorization-grants-changed.v1` / `urn:luictech:events:iam:authorization-grants-changed:v1` | Admin/customer authorization projections using monotonic security version. |
| IAM | `com.luictech.iam.risk-state-changed.v1` / `urn:luictech:events:iam:risk-state-changed:v1` | Policy enforcement projections; high-risk routes may still introspect live. |
| Customer Profile | `com.luictech.customer.profile-created.v1` / `urn:luictech:events:customer:profile-created:v1` | Consent-aware onboarding, Reporting, Audit; stable subject ref uses restricted ACL. |
| Customer Profile | `com.luictech.customer.erasure-requested.v1` / `urn:luictech:events:customer:erasure-requested:v1` | Privacy process manager and Audit only; it is not authority for owners to erase retained records. |
| Catalog | `com.luictech.catalog.product-published.v1` / `urn:luictech:events:catalog:product-published:v1` | Search, Recommendation, public composition cache, Reporting. |
| Catalog | `com.luictech.catalog.product-changed.v1` / `urn:luictech:events:catalog:product-changed:v1` | Search/Recommendation replayable projections and cache invalidation. |
| Catalog | `com.luictech.catalog.product-unpublished.v1` / `urn:luictech:events:catalog:product-unpublished:v1` | Search removal, Cart warning/invalidation, Recommendation, Reporting. |
| Catalog | `com.luictech.catalog.stock-item-enabled.v1` / `urn:luictech:events:catalog:stock-item-enabled:v1` | Inventory idempotently onboards a variant/SKU using only opaque variant ID, SKU, stock-tracking unit and lifecycle version; Inventory applies owner preconditions. |
| Pricing | `com.luictech.pricing.price-changed.v1` / `urn:luictech:events:pricing:price-changed:v1` | Public Search/BFF projection, Cart invalidation, Reporting; checkout still requotes. |
| Promotion | `com.luictech.promotion.promotion-changed.v1` / `urn:luictech:events:promotion:promotion-changed:v1` | General-offer Search/BFF cache and Reporting; never targeting internals. |
| Promotion | `com.luictech.promotion.redemption-committed.v1` / `urn:luictech:events:promotion:redemption-committed:v1` | Reporting/Audit on restricted topic. |
| Promotion | `com.luictech.promotion.redemption-released.v1` / `urn:luictech:events:promotion:redemption-released:v1` | Reporting/Audit on restricted topic. |
| Inventory | `com.luictech.inventory.availability-changed.v1` / `urn:luictech:events:inventory:availability-changed:v1` | Coarse public Search/BFF availability and Reporting; exact balances require restricted contract. |
| Inventory | `com.luictech.inventory.reservation-expired.v1` / `urn:luictech:events:inventory:reservation-expired:v1` | Checkout recovery/process manager and Audit. |
| Inventory | `com.luictech.inventory.reservation-committed.v1` / `urn:luictech:events:inventory:reservation-committed:v1` | Checkout/OMS recovery and Reporting; it does not itself confirm the order. |
| Inventory | `com.luictech.inventory.return-disposition-recorded.v1` / `urn:luictech:events:inventory:return-disposition-recorded:v1` | OMS return process, Reporting, Audit; reports Inventory/Warehouse-owned restock/quarantine/dispose outcome without customer PII. |
| Checkout | `com.luictech.checkout.submission-accepted.v1` / `urn:luictech:events:checkout:submission-accepted:v1` | Cart marks the referenced snapshot locked (not deleted), Reporting; unique checkout/order workflow begins. |
| Checkout | `com.luictech.checkout.completed.v1` / `urn:luictech:events:checkout:completed:v1` | Cart converts/closes the locked snapshot only after OMS confirmation; Reporting. |
| Checkout | `com.luictech.checkout.expired.v1` / `urn:luictech:events:checkout:expired:v1` | Cart unlock/retry policy and Reporting; duplicate order creation remains prohibited. |
| OMS | `com.luictech.order.order-created.v1` / `urn:luictech:events:order:order-created:v1` | Notification/Reporting/Audit; state is pending payment, not confirmed. |
| OMS | `com.luictech.order.order-confirmed.v1` / `urn:luictech:events:order:order-confirmed:v1` | Checkout completion, Notification, Reporting, Audit; Logistics shipment still requires targeted command. |
| OMS | `com.luictech.order.cancellation-requested.v1` / `urn:luictech:events:order:cancellation-requested:v1` | OMS policy/process manager, Notification, Audit only; no refund/release/cancel effect is authorized. |
| OMS | `com.luictech.order.order-cancelled.v1` / `urn:luictech:events:order:order-cancelled:v1` | Notification/Reporting/Audit after targeted compensations reach the defined state. |
| OMS | `com.luictech.order.return-requested.v1` / `urn:luictech:events:order:return-requested:v1` | OMS return policy/process manager, Notification, Audit only; no refund/restock authorization. |
| OMS | `com.luictech.order.return-approved.v1` / `urn:luictech:events:order:return-approved:v1` | Notification/Reporting; return shipment uses targeted command. |
| OMS | `com.luictech.order.return-received.v1` / `urn:luictech:events:order:return-received:v1` | OMS refund/restock process manager; targeted commands decide effects. |
| OMS | `com.luictech.order.order-refunded.v1` / `urn:luictech:events:order:order-refunded:v1` | Notification/Reporting/Audit after Payment outcome. |
| Payment | `com.luictech.payment.payment-authorized.v1` / `urn:luictech:events:payment:payment-authorized:v1` | Finance/Audit/OMS display only; authorization alone never advances confirmation. |
| Payment | `com.luictech.payment.payment-commitment-satisfied.v1` / `urn:luictech:events:payment:payment-commitment-satisfied:v1` | Checkout commit saga, OMS display, Notification/Reporting/Audit. Emitted only for executed/captured prepaid or accepted COD obligation per adapter mapping. |
| Payment | `com.luictech.payment.payment-failed.v1` / `urn:luictech:events:payment:payment-failed:v1` | Checkout recovery, OMS display, Notification/Reporting/Audit. |
| Payment | `com.luictech.payment.refund-succeeded.v1` / `urn:luictech:events:payment:refund-succeeded:v1` | OMS return/cancellation process, Finance, Notification, Reporting, Audit. |
| Payment | `com.luictech.payment.refund-failed.v1` / `urn:luictech:events:payment:refund-failed:v1` | OMS recovery, Finance manual queue, Notification/Audit. |
| Payment | `com.luictech.payment.reconciliation-mismatch.v1` / `urn:luictech:events:payment:reconciliation-mismatch:v1` | Finance/security operations and Audit; restricted money topic. |
| Logistics | `com.luictech.logistics.shipment-created.v1` / `urn:luictech:events:logistics:shipment-created:v1` | OMS projection, Notification, Reporting. |
| Logistics | `com.luictech.logistics.shipment-status-changed.v1` / `urn:luictech:events:logistics:shipment-status-changed:v1` | OMS tracking projection, Notification, Reporting. |
| Logistics | `com.luictech.logistics.shipment-delivered.v1` / `urn:luictech:events:logistics:shipment-delivered:v1` | OMS transition/process manager, Notification, Reporting. |
| Logistics | `com.luictech.logistics.delivery-failed.v1` / `urn:luictech:events:logistics:delivery-failed:v1` | OMS recovery, Notification, Reporting/Audit. |
| Logistics | `com.luictech.logistics.cod-remitted.v1` / `urn:luictech:events:logistics:cod-remitted:v1` | Payment/Finance reconciliation, Reporting/Audit; restricted money topic. |
| CMS | `com.luictech.cms.content-published.v1` / `urn:luictech:events:cms:content-published:v1` | CDN/content cache invalidation. |
| CMS | `com.luictech.cms.content-unpublished.v1` / `urn:luictech:events:cms:content-unpublished:v1` | CDN/content cache invalidation. |
| Notification | `com.luictech.notification.notification-delivered.v1` / `urn:luictech:events:notification:notification-delivered:v1` | Operations/support/Audit; no destination value. |
| Notification | `com.luictech.notification.notification-failed.v1` / `urn:luictech:events:notification:notification-failed:v1` | Operations/support/Audit; no destination or raw provider payload. |
| Every owner | `com.luictech.audit.audit-record.v1` / `urn:luictech:events:audit:audit-record:v1` | Audit context only. Sanitized metadata is written to the owner's outbox with the mutation and deduplicated centrally by owner event ID. |

Search, Recommendation, Reporting, Notification, and the central Audit projection cannot mutate a producer's state or become synchronous dependencies of checkout, order, or payment completion. Cart merge is always an explicit authenticated one-time command using proof of the guest handle; no IAM/Profile event performs it.

## Payment and communication state rules

Payment normalizes every adapter into `CREATED`, `ACTION_REQUIRED`, `PENDING_PROVIDER`, `AUTHORIZED`, `COMMITMENT_SATISFIED`, `FAILED`, `CANCELLED`, `EXPIRED`, `UNKNOWN`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, or `REFUNDED`. Each provider adapter documents which cryptographically verified/query-reconciled provider state maps to each value. `paymentCommitmentSatisfied` is true only at `COMMITMENT_SATISFIED`: executed/captured funds for prepaid methods or a Payment-owned `COD_ACCEPTED` obligation mapping. `AUTHORIZED`, a browser return, or an unverified callback is never sufficient.

Payment ledger entries are append-only. Merchant reference, provider transaction reference, and provider event ID are unique in their owner/provider scope; corrections and reversals append entries instead of editing posted facts. Derived balances must reconcile captured, refunded, fees, settlement, and COD remittance.

Notification maintains a registered template catalog. Each template fixes its owning business purpose, allowed source event types, channels, data classification, and typed variable schema. Producers cannot select arbitrary destinations or templates. Notification uses `Profile.resolveNotificationDestination`; Profile remains authoritative for contact and consent, while Notification owns provider suppression and delivery projections. Mandatory transactional and marketing consent policies are distinct.

Customer Profile owns the privacy request/process. An erasure request is reviewed against a versioned retention/legal-hold policy, then the privacy process issues one targeted disposition command to every data owner, retries/quarantines failures, records owner acknowledgements/evidence, and completes only when every owner reports erase, pseudonymize, or approved retain. Backups follow documented expiry/restore handling; contact data is never broadcast.

## Failure and recovery contract

| Failure | Required behavior |
| --- | --- |
| Identity service unavailable or status projection stale | Cryptographic token verification may continue from bounded-age signed JWKS. Ordinary customer reads may use policy-cached state up to 5 minutes; customer mutations require at most 60-second revocation/authz freshness; admin reads require at most 60 seconds; admin, finance, refund, role, inventory-adjustment, impersonation, and other high-risk writes require live introspection or state no older than 15 seconds plus current step-up. If that class cannot be met, fail closed. Issuing/refreshing stops. Record IAM security version and evidence used. |
| Broker unavailable | Owner state and outbox may commit. Relay retries later; business code never publishes before transaction commit. |
| Duplicate/out-of-order event | Inbox deduplicates by source/event ID and checks aggregate version/state. Ignore applied versions; quarantine gaps or query the owner contract, never its tables. Do not rely on RabbitMQ order. |
| Synchronous dependency timeout | Propagate deadlines; retry only safe idempotent calls with bounded backoff/jitter; circuit-break and return a stable retryable problem. Do not partially confirm checkout. |
| Checkout step fails | Release already-acquired promotion/inventory reservations idempotently; TTL sweepers backstop compensation. Persist saga state and operator-visible failures. |
| Payment result is unknown | Query provider by unique merchant reference, await verified webhook, and reconcile periodically. Never create a second charge simply because the first request timed out. |
| Payment commitment succeeds before reservation/order confirmation | Persist `PAYMENT_RECEIVED_PENDING_CONFIRMATION`; commit Inventory/Promotion before OMS confirmation. If a commit cannot succeed, use `PAYMENT_RECEIVED_STOCK_EXCEPTION`, block fulfillment, reconcile/re-reserve or refund under approved policy, alert, and audit. A late success after expiry enters this recovery path. |
| Browser returns from provider | Validate and consume the attempt/session/origin-bound one-time state, strip it from the browser URL, and resume polling. It never changes Payment or OMS state. |
| Cancellation/refund is partial | Expose intermediate states such as `CANCEL_REQUESTED` and `REFUND_PENDING`; retry/compensate idempotently and route unresolved work to a reconciled manual queue. |
| Provider external effect times out | The durable local intent remains pending. Query by unique merchant reference before retry, accept verified callback, and reconcile; do not mark the inbox complete with an unknown untracked effect. |
| Provider callback contains sensitive raw data | Verify raw bytes before parsing. Keep only normalized allowlisted fields by default; if raw retention is required, encrypt with owner-only access/retention and exclude it from logs, analytics, and generic DLQ payloads. |
| Projection unavailable or stale | Search/Reporting/Recommendation may lag; expose freshness where useful. Checkout always revalidates against authoritative owners. |
| Audit sink unavailable | Critical audit metadata remains in the owner's transactional outbox; the centralized audit projection may lag but cannot silently lose records. |
| Privacy owner fails or is unavailable | The request remains incomplete with per-owner status and retry/DLQ evidence. Never claim erasure completed or instruct owners from the broad request event alone. |

## Contract acceptance gates

- OpenAPI/AsyncAPI lint and backward-compatibility checks.
- Consumer-driven tests for every synchronous caller and event consumer.
- Negative authorization tests, including customer/admin audience crossover and object/function/property authorization.
- Idempotency, concurrency, duplicate event, ordering-gap, timeout, webhook replay, and compensation tests.
- Automated schema/allowlist tests prohibiting direct contact/address data, credentials, secrets, provider payloads, and uncontrolled text from URLs, general logs/traces/metrics, routing metadata, and events. Documented pseudonymous IDs are allowed only in access-restricted audit/security streams and approved restricted topics; never metric labels.
- Provider return-state, raw-webhook retention, immutable-ledger uniqueness/balance, audit-outbox, privacy-disposition, and notification-template/consent tests.
