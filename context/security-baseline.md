# Zero Trust Security Baseline

Status: Accepted architecture baseline; controls require implementation evidence in their delivery tasks.

## Objective

Apply "never trust, always verify" to users, administrators, workloads, modules, asynchronous messages, provider callbacks, data access, and operations. Passing through the WAF, running inside the private network, or sharing a process never grants implicit authority.

The policy enforcement point exists at ingress and again at every exported module facade. The owning module makes the final action, resource, field, and state-transition decision using facts it owns.

## Trust zones

| Zone | Resources | Enforceable boundary |
| --- | --- | --- |
| Z0 Untrusted | Customer/admin browsers, bots, mobile clients, provider callbacks | Trust no identity headers or body facts; enforce schema/size/time limits; never log credentials, OTPs, or tokens. |
| Z1 Edge | Cloudflare CDN, DDoS/bot controls, WAF | TLS 1.3 on controlled edges, coarse throttles, threat filtering, safe caching. Edge allow is not application authorization. |
| Z2C Customer ingress | Same-origin Storefront BFF and customer/public API entrypoint | Customer audience, public/guest allowlist, authenticated checkout boundary, secure-cookie CSRF/origin controls, and device/network/customer quotas. No admin routes/credentials. |
| Z2A Workforce ingress | Separate-origin Admin BFF and admin-only API entrypoint | Admin audience, MFA, recent step-up, stricter CORS/egress/session limits, and no customer route registry. |
| Z3 Application plane | Core bounded-context facades in customer/admin entrypoints and peer workers | Every facade checks principal, runtime policy, resource state, and obligations. In-process caller reachability uses private composition capabilities, not a claimed cryptographic workload identity. |
| Z4 Restricted domains | Separate IAM, Payment, and Inventory entrypoints/workers; Profile/OMS restricted data paths inside Core initially | Network/egress policy and narrow mTLS/audience-bound ACLs protect isolated contexts. A Core compromise cannot load IAM/Payment/Inventory credentials by default, but can affect Profile/OMS credentials loaded by that Core entrypoint; field policy, separate DB roles, encryption, minimization and audit reduce but do not remove this accepted residual risk. |
| Z5 Module data | PostgreSQL schemas, Redis namespaces, object storage | Owner-only credentials and key policy; no cross-schema grants; encrypted backups and tested restoration. |
| Z6 Async integration | Outbox relay, RabbitMQ, inbox, DLQ | Producer/consumer identities and topic ACLs; schema validation, minimal payloads, deduplication, quarantine, and audited replay. Broker transport is not authorization. |
| Z7 External integration | Payment, OTP, email/SMS, and courier providers | Destination allowlist, timeouts, scoped vault secrets, adapter-owned endpoints, signature/timestamp/replay verification, and reconciliation. |
| Z8 Operations/analytics | CI/CD, support tools, telemetry, SIEM, reporting | SSO/MFA, just-in-time least privilege, separation of duties, break-glass alerting, immutable audit, and curated data rather than raw OLTP access. |

## Identity and session policy

### Customers

- Primary sign-in is Bangladesh mobile OTP. Normalize and validate the number before deriving a rate-limit key.
- Responses do not reveal whether an account exists. OTP challenges have a short configurable TTL, strict attempt count, resend cooldown, device/network/phone-hash quotas, and abuse monitoring.
- Store only a keyed, one-way OTP verifier; never store or log the plaintext OTP. A consumed or expired challenge cannot be replayed.
- Browser sessions should use a customer BFF with `Secure`, `HttpOnly`, appropriately `SameSite` cookies plus CSRF and origin validation. Public/native clients use Authorization Code with PKCE where an authorization flow applies.
- Access tokens expire in 15 minutes. Refresh-token families expire in at most 7 days, rotate at every use, are stored as one-way verifiers, and revoke the family when reuse is detected.

### Administrators and workforce

- Admin identities use a different client, token audience, session cookie, origin, route table, and policy set from customers.
- MFA is mandatory. Prefer phishing-resistant authentication; documented recovery is rate-limited, verified, and audited.
- Refunds, COD reconciliation, price overrides, bulk inventory changes, role changes, impersonation, and secret/config changes require recent step-up authentication. Configurable high-risk/financial thresholds require dual approval.
- Workforce authorization follows assigned role and operational scope, such as warehouse or support queue. Employment role alone does not grant broad PII or ledger access.

### Token requirements

Tokens contain no PII. Required claims include issuer, subject, audience, expiry, issued/not-before time, unique token ID, authorized client, session/device identifier, scopes/permissions, role, authentication strength/method, and monotonic subject/session/authorization security versions. Signing keys rotate through trusted JWKS with overlap; unknown algorithms, issuers, audiences, or key IDs fail closed.

The gateway strips client-supplied identity, role, service, and forwarding headers before constructing immutable request-principal context. Each module revalidates audience, required scope, object ownership, resource state, and field policy.

IAM publishes signed monotonic subject-status, session-revocation, token-family-compromise, grant-change, and risk-state changes to local enforcement projections and an emergency denylist channel. Evidence freshness classes are mandatory:

- Public reads need no session evidence.
- Ordinary authenticated customer reads may use IAM status evidence no older than 5 minutes.
- Customer mutations, including cart merge, profile/address change, checkout, cancellation, and return request, require evidence no older than 60 seconds.
- Admin reads require evidence no older than 60 seconds.
- Admin/finance/refund/role/impersonation/inventory-adjustment and other high-risk writes require live IAM introspection or signed evidence no older than 15 seconds plus current step-up.

Unknown/stale evidence for the required class fails closed. Policy records the IAM version/freshness used. These are maximum architecture bounds; an approved task may tighten them, not loosen them silently.

## Principal authorization boundaries

| Principal | Allowed boundary |
| --- | --- |
| Guest | Public Storefront/Search/CMS reads and a high-entropy guest-cart bearer handle stored as a server-side verifier and secure cookie. No checkout, payment, order, address, profile, or wishlist data. |
| Customer | Own profile, addresses, cart, checkout, orders, returns, and safe tracking. The owner compares its stored customer reference with the token subject; client IDs are not authorization facts. |
| Catalog/marketing admin | Explicit catalog/CMS/promotion permissions; publication, bulk, and destructive actions may require step-up and version checks. |
| Warehouse operator | Assigned warehouse inventory and fulfillment only; purpose-limited shipping-label fields; no full profile or payment ledger. |
| Finance | Payment/refund/reconciliation operations with masked customer data, reason, step-up, and dual approval where required. |
| Support | Redacted customer/order view with ticket/reason. No credentials, OTPs, provider secrets, or payment instruments. |
| Security auditor | Read-only policy, audit, and security events; no commerce mutation. |
| Workload | Across processes: named service identity, target audience, explicit caller/operation pair, short lifetime, and bounded delegated context. In one process: private composition-root capability and static reachability, which are not a cryptographic boundary. No shared internal super-token. |
| Provider callback | No authority until provider-specific cryptographic verification. May submit only to the provider-owned inbox endpoint. |

When hiding a resource's existence reduces information leakage, an ownership failure returns a not-found response rather than identifying another customer's resource.

Support uses dedicated support APIs that retain workforce actor plus target customer and expose only allowlisted assistance actions. If delegated browsing is unavoidable, IAM issues a non-delegable short-lived `luic-support-delegated` audience accepted only by an explicit endpoint subset, never normal customer/admin controllers. It carries actor plus subject, step-up, reason/ticket, visible banner metadata, and expiry. Credential, consent, security, payment, refund, and other sensitive actions remain hard-denied.

The guest-cart handle is unguessable bearer material, not merely a signed predictable ID. Store only a verifier/hash server-side; set `Secure`, `HttpOnly`, appropriate `SameSite`, TTL, quota, origin and CSRF controls for mutation. Rotate on privilege change and invalidate after authenticated one-time merge. Never accept caller-selected owner/customer identity.

## Policy evaluation

- Deny by default.
- Inputs include verified user/workload identity, audience, scopes/permissions, authentication strength, session/device/risk state, requested action, owner-loaded resource attributes, channel, and policy version.
- Policy decisions can carry obligations: field masking, step-up, reason/ticket, dual approval, amount limit, assigned warehouse, or audit severity.
- Authorization policy should be centrally administered but locally evaluated from signed/versioned policy bundles. Log decision ID and policy version, never sensitive input values.
- If policy is missing or stale beyond its bounded lifetime, fail closed for writes and restricted reads. Only explicitly public Catalog/CMS reads may use a minimal static allow policy.
- The composition root injects private typed module capabilities only into allowlisted in-process callers; constructors/tokens are not exported and Nx rules test reachability. End-user/resource policy still runs at the target facade. API/worker processes have distinct runtime identities.
- Across process/network boundaries, use short-lived audience-bound workload tokens and mTLS/workload identity. Do not forward a bearer token indiscriminately between services.

## Data classification and handling

| Class | Examples | Baseline handling |
| --- | --- | --- |
| Public | Published product copy, public price, published CMS content | Integrity-controlled; cache only allowlisted fields. |
| Internal | Non-sensitive operational configuration, aggregate metrics | Authenticated workforce/service access; no public caching. |
| Confidential | Stable customer/order linkage, phone/email/address, device/risk data, internal price/inventory detail | Purpose-limited access, encryption, redaction, retention, access audit, and curated analytics. |
| Restricted | OTP/auth/session material, signing/encryption keys, provider credentials, payment tokens, raw callback bytes | Vault/KMS-backed secrets, owner-only encryption/access, never logged/analytical, strict size/retention, frequent rotation, enhanced audit. |

- Controlled storage uses AES-256-class encryption at rest and managed key policies; controlled network links use TLS 1.3. Exceptions require a documented provider constraint, risk acceptance, and compensating control.
- Profile owns mutable customer PII. OMS may own the minimal encrypted address/contact snapshot required as a transaction and fulfillment record. Logistics receives only a purpose-bound copy and follows configured retention/pseudonymization.
- Payment owns provider references/tokens and append-only transaction/refund/fee/settlement/reconciliation entries. Posted entries are corrected/reversed with new entries; unique provider/merchant/event references and derived-balance reconciliation detect duplicates. OMS stores only Payment identifiers and normalized status. Raw card or mobile-wallet credentials never reach the application.
- Verify provider signatures against exact raw bytes before parsing. Retain raw bytes only when an approved dispute/replay policy requires them, encrypted under an owner-only key with strict size, access, and retention; store normalized allowlisted fields separately and exclude raw bytes from general inbox/DLQ telemetry.
- General logs default to route template, outcome, latency, authorization decision, and correlation ID. Authorization/cookie headers, bodies, phones, emails, addresses, idempotency keys, provider signatures, secrets, raw query strings, and raw resource IDs are redacted.
- Stable actor/resource pseudonyms may appear only in access-restricted security/audit streams with field allowlists and retention. Metrics labels never contain user, order, payment, phone, email, address, or arbitrary text. General traces use safe short-lived correlation/decision IDs.
- Analytics consumes curated, purpose-documented projections, never production table access. Customer Profile owns an idempotent privacy process that sends policy/legal-hold dispositions to every data owner and records acknowledgements; retained records remain minimized/access-restricted under an approved matrix.

## Secrets, keys, and software supply chain

- Secrets are injected at runtime from an approved manager, never committed, baked into images, placed in frontend bundles, copied into telemetry, or stored in generic configuration tables.
- Use separate credentials and encryption/signing keys by environment and bounded context. Rotate with overlap and tested rollback.
- CI uses short-lived workload identity where supported, least-privilege deployment rights, protected environments, reviewed provenance, pinned actions/images, lockfile integrity, dependency/license scanning, secret scanning, and signed release artifacts.
- Production access is just-in-time and auditable. Break-glass access requires reason, short expiry, immediate alert, and retrospective review.

## Threat and control register

| Threat | Required controls | Verification evidence |
| --- | --- | --- |
| OTP enumeration, interception, brute force | Generic responses, keyed verifier, short expiry, attempt/resend limits, multi-dimensional throttling, provider monitoring | Enumeration/expiry/replay/rate-limit tests and alerts |
| Stolen/replayed refresh token | One-way storage, rotation, family reuse detection, device/session view, revocation | Concurrent rotation and reuse tests |
| Disabled/compromised principal with still-valid JWT | Monotonic IAM security versions, bounded-fresh local projections, emergency denylist, live introspection for high-risk actions | Stale projection, broker outage, revocation latency, and fail-closed tests |
| Broken object/function/property authorization | Owner-loaded resource facts, per-facade checks, safe serializers, deny-by-default matrix | Negative customer/admin/role/object/field tests |
| Admin privilege abuse | MFA, step-up, scoped roles, separation/dual approval, reason, immutable audit | Permission matrix, approval, impersonation, and audit tests |
| Cross-module data access | Private clients/repositories, database grants, no cross-schema objects, architecture tags | CI import test and live DB grant test |
| Client price/discount/state manipulation | Server-side quote, signed/opaque references, version/expiry, owner state machine | Tampered payload and stale quote tests |
| Inventory race/oversell | Atomic owner reservation, versioning, TTL, idempotent commit/release, reconciliation | High-concurrency and recovery tests |
| Forged/replayed provider callback | Provider signature/certificate, timestamp window, unique event/reference, durable inbox, idempotency, polling reconciliation | Invalid/duplicate/out-of-order/missing webhook tests |
| Duplicate charge after timeout | Unique merchant reference, lookup-before-retry, one-active-attempt rule, ledger reconciliation | Unknown-outcome fault test |
| Guest-cart theft, fixation, or CSRF | High-entropy verifier-backed secure cookie, origin/CSRF, TTL/quota, rotation, one-time authenticated merge | Guess/fixation/cross-origin/replay/merge tests |
| Malicious media/SSRF | Constrained presigned upload, content sniffing, size/type limits, malware scan, metadata stripping, egress allowlist | Unsafe file and URL tests |
| PII/secrets in observability/events | Allowlists, structured redaction, schema checks, safe labels, sampling/retention controls | Automated leakage scans and fixture tests |
| Event forgery or replay | Broker ACLs, producer identity, schema validation, inbox dedupe, aggregate preconditions | Unauthorized producer and replay tests |
| Raw webhook leakage or parser mismatch | Raw-byte verification, owner-only encrypted quarantine, normalized allowlist record, strict retention, authoritative lookup | Signature canonicalization, oversized/sensitive payload, retention, and log-leak tests |
| Abuse/denial of service | WAF/bot controls, layered quotas, body/query bounds, bulkheads, circuit breakers, backpressure | Load/abuse tests and alert drill |
| Dependency/build compromise | Frozen lockfile, scanning, pinned CI dependencies, provenance/signing, least-privilege release | CI policy and artifact-verification evidence |

## Audit requirements

Record actor and delegated subject pseudonyms, workload, action, resource type and approved opaque ID, result, reason code/ticket where required, policy decision/version, authentication strength, correlation, safe field-allowlisted before/after summary, and timestamp. These identifiers exist only in the access-restricted audit stream with retention/masking; do not copy raw payloads, direct PII, or free text merely for audit convenience.

Authentication changes, authorization denials of interest, admin mutations, inventory adjustments, price/promotion publication, order state changes, refunds, reconciliation actions, impersonation, role changes, secret/config changes, DLQ replay, and break-glass access require audit evidence.

Critical business mutation and its audit outbox record commit together in the owner's local transaction. Central audit storage is append-only/tamper-evident with restricted access, retention, monitoring, and restore tests.

## Security release gates

- Threat model and data-flow update for every new external boundary or Restricted data flow.
- Route-to-permission matrix with negative audience, scope, resource, property, function, step-up, and impersonation tests.
- Database grants and architecture tests proving module ownership.
- Input, output, error, upload, callback, and event schema tests.
- Secret/direct-PII leakage and classification tests across logs, traces, metrics, errors, URLs, events, raw callback quarantine, builds, and frontend assets; documented audit/security pseudonyms must stay in restricted streams.
- Dependency, secret, static, dynamic, container, and infrastructure scanning with no unresolved critical/high findings at release unless formally accepted.
- Backup restoration, key rotation, token rotation/reuse, webhook replay, provider outage, broker outage, and privileged break-glass exercises.
