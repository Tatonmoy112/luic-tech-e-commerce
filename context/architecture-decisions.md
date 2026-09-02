# Architecture Decision Record

All decisions below are `accepted` on 2026-09-02 unless superseded by a later ADR. A replacement must preserve its predecessor, link both decisions, and document migration and business impact.

## ADR-001 - Modular monolith with enforceable bounded contexts

- **Decision:** Ship one modular backend codebase with independently composable entrypoints and workers. Core contexts may share a process, but IAM, Payment, and Inventory run as restricted entrypoints/workers with separate credentials and network/egress policies. Keep all bounded contexts in [system-architecture.md](system-architecture.md) isolated by public facades, dependency rules, schema ownership, and integration contracts.
- **Why:** It minimizes unnecessary distributed-system cost while meeting the mandatory isolation boundary for credentials, payment, and inventory.
- **Trade-off:** Restricted cross-process calls require workload identity, timeouts, resilience, and operating ownership earlier than a pure single process. A coordinated release can still couple cadence until extraction is justified.
- **Revisit when:** A context needs independent scaling, isolation, ownership, compliance, or release cadence that materially outweighs network and operational cost.

## ADR-002 - pnpm workspace with Nx

- **Decision:** Use a Corepack-pinned pnpm workspace and Nx project graph. Initial entrypoints are `storefront`, `admin`, `customer-api`, `admin-api`, `identity-api`, `inventory-api`, `payment-api`, `webhook-ingress`, `core-worker`, and restricted-context workers. Shared source libraries are tagged by `scope` and `layer`; an entrypoint may import only its allowlisted compositions.
- **Why:** pnpm's strict dependency model and Nx boundary rules make accidental imports visible, while affected builds keep a large TypeScript workspace efficient.
- **Trade-off:** Nx configuration and generators add maintenance. Remote caching is optional and must not leak secrets or proprietary build outputs.
- **Enforcement:** CI runs frozen-lockfile installation and Nx lint/type/test/build plus a deliberate forbidden-dependency fixture test.

## ADR-003 - NestJS backend on the Express adapter initially

- **Decision:** Use NestJS with TypeScript for HTTP and worker composition. Use its default Express adapter until profiling demonstrates a transport bottleneck.
- **Why:** Modules, dependency injection, guards, interceptors, OpenAPI integration, and test seams support the required architecture better than unstructured Express assembly.
- **Trade-off:** Framework abstraction, reflection, and startup overhead are higher than a minimal router. Domain code must remain framework-independent.
- **Revisit when:** Measured latency or throughput indicates the adapter is material; Fastify can then be evaluated without changing application ports.

## ADR-004 - Separate Next.js storefront and admin applications

- **Decision:** Use Next.js App Router and TypeScript in two applications with distinct origins, authentication clients/audiences, `Secure`/`HttpOnly` cookies, CSPs, deployments, and route contracts. Each provides a same-origin BFF that calls only its matching customer or admin NestJS entrypoint. Use React Query for server state and Zustand only for justified ephemeral client state.
- **Why:** Customer and workforce surfaces have different threat models, release needs, and performance profiles.
- **Trade-off:** Shared UI packages need careful ownership and visual regression tests; duplicated configuration is accepted where it preserves security isolation.

## ADR-005 - PostgreSQL schemas and Prisma clients per bounded context

- **Decision:** Start with one PostgreSQL cluster, but give each context its own PostgreSQL schema, migrations, generated Prisma client, and runtime database role. No cross-schema ORM relation, foreign key, join, view, trigger, grant, or transaction is permitted.
- **Why:** This combines low operational cost with enforceable data ownership and an extraction path.
- **Trade-off:** Cross-domain reports and validations require contracts, projections, or snapshots rather than convenient SQL joins.
- **Scaling/security impact:** Owner-specific pools and replicas can be tuned independently. Roles enforce ownership and limit a restricted process to its own data; they do not protect multiple credentials loaded into one compromised process, which is why IAM, Payment, and Inventory are process-isolated.

## ADR-006 - REST/OpenAPI for synchronous contracts; versioned event schemas for integration

- **Decision:** Expose public, admin, and module synchronous contracts as resource-oriented REST described by OpenAPI 3.1. Describe integration events with AsyncAPI-compatible schemas. GraphQL is deferred.
- **Why:** Explicit schemas, standard caching/error semantics, client generation, and gateway controls fit the known journeys.
- **Trade-off:** Composite screens use explicit BFF read endpoints that combine authorized Catalog, public Pricing, and coarse Inventory facts with source versions/freshness. GraphQL is reconsidered only after a measured composition problem, with field authorization and query-cost controls.
- **Compatibility:** Prefer additive changes; breaking changes require a new major contract, overlap window, consumer evidence, and removal plan.

## ADR-007 - RabbitMQ integration events with transactional outbox/inbox

- **Decision:** RabbitMQ is the cross-context integration-event broker. Producers use transactional outboxes; consumers assume no delivery order and enforce event deduplication, aggregate versions, preconditions, gap recovery, bounded retries, dead-letter queues, and idempotent effects. Database-only effects commit with the inbox; external effects commit inbox plus a local intent first, then call the provider with an idempotent reference and reconcile. Redis supports caching, rate limiting, short-lived coordination, and idempotency acceleration, not durable commerce truth.
- **Why:** Durable routing and independent consumer progress are required for orders, payments, inventory, logistics, and projections.
- **Trade-off:** The broker and relay add operational load and eventual consistency. At-least-once, potentially reordered delivery moves correctness into handler design. Outbox/inbox/retry/DLQ data needs encrypted owner access, retention, and audited replay.
- **Deferred:** BullMQ is not the domain event bus. Add it only for a proven Redis-backed delayed/background job need that RabbitMQ scheduling and module workers do not serve cleanly.

## ADR-008 - S3-compatible object storage as media source of truth

- **Decision:** Store original and derived media in private-by-default S3-compatible object storage and deliver publishable objects through a CDN. Use MinIO locally. Providers such as Cloudinary may be optional transformation adapters, not the source of truth.
- **Why:** It limits vendor coupling, supports lifecycle/retention policies, and scales independently of application servers.
- **Security:** Upload through short-lived constrained presigned URLs; validate type/size/content, scan malware, strip unsafe metadata, and publish only approved derivatives.

## ADR-009 - PostgreSQL search projection first

- **Decision:** Search owns a disposable projection using PostgreSQL full-text search, trigram indexes, normalized Bengali/English fields, and a replaceable query interface.
- **Why:** It avoids a second search cluster before relevance and load are measured.
- **Trade-off:** Advanced phonetics, typo tolerance, ranking, and high-cardinality filtering may reach PostgreSQL limits.
- **Revisit when:** Representative relevance tests or p95 latency/load budgets fail after query/index tuning. Migrate behind the Search contract to OpenSearch/Elasticsearch and prove replay/cutover parity.

## ADR-010 - Zero Trust identity and policy model

- **Decision:** Deny by default at the edge and every module facade. Customer and admin tokens use separate audiences. Access tokens live 15 minutes; refresh token families live at most 7 days, rotate on use, and detect reuse. IAM distributes signed monotonic revocation/status/authorization versions to bounded-fresh local projections; high-risk actions use live introspection. Admin requires MFA and step-up. Cross-process workloads receive narrow service identities and audiences; in-process callers receive private composition-root capabilities but no false cryptographic identity claim.
- **Why:** Network location and prior gateway checks are not sufficient proof of authorization.
- **Trade-off:** Fine-grained policies, revocation, and device/session state add implementation and support cost.
- **Security rule:** Tokens contain stable identifiers and authorization claims, not PII. Resource ownership and state are loaded by the owner module, never trusted from client fields.

## ADR-011 - Zod schemas and standardized errors at all inputs

- **Decision:** Use Zod as the shared contract validation source for HTTP payloads, configuration, events, worker inputs, and provider normalization. Public errors follow RFC 9457 Problem Details with Luic_Tech error codes.
- **Why:** One executable schema approach reduces drift across TypeScript applications and provides deterministic rejection at trust boundaries.
- **Trade-off:** Persistence/domain invariants still belong in domain code; Zod schemas must not become the domain model.

## ADR-012 - Jest, Testing Library, and Playwright

- **Decision:** Use Jest for backend and shared-library unit/integration tests, Testing Library for component behavior, and Playwright for storefront/admin browser journeys. Do not add Cypress without an ADR.
- **Why:** One browser framework reduces duplicate fixtures and CI cost, while Playwright covers multiple browsers and mobile viewports.
- **Required suites:** Domain invariants, authorization matrix, database ownership, API/event contracts, adapter contracts, concurrency/idempotency, migration, accessibility, E2E, performance, resilience, and security tests as risk requires.

## ADR-013 - Standard identifiers, time, money, and localization

- **Decision:** Generate UUIDv7 identifiers in the application; store time as UTC `timestamptz`; represent money internally as signed 64-bit minor units plus ISO currency; use UTF-8 and explicit locale tags (`bn-BD`, `en-BD`). The JSON wire value is a base-10 integer string within signed 64-bit bounds; each domain separately enforces nonnegative charge/refund constraints.
- **Why:** These rules preserve ordering locality, numerical accuracy, timezone safety, and Bengali content integrity.
- **Trade-off:** UI and provider adapters must explicitly format/convert values. JavaScript money values cross JSON boundaries as decimal strings when they may exceed safe integer range.

## ADR-014 - Managed production data services; containerized local development

- **Decision:** Use Docker Compose-compatible services locally. Production artifacts include separate customer/admin entrypoints and restricted IAM/Payment/Inventory entrypoints/workers with network and egress policy. They are Kubernetes-ready, while managed PostgreSQL, Redis, RabbitMQ, object storage, secrets/KMS, and observability backends are preferred.
- **Why:** The team retains portable application interfaces while shifting high-risk stateful operations to services with backups, patching, and failover support.
- **Trade-off:** Managed-service pricing and provider-specific operational features require cost controls and tested portability. Kubernetes adoption still requires clear ownership and runbooks.

## ADR-015 - Immutable payment accounting ledger

- **Decision:** Payment records append-only transaction, refund, fee, settlement, reconciliation, and correction entries. Merchant reference, provider transaction reference, and provider event ID have owner-scoped uniqueness constraints. Posted entries are reversed/corrected with new entries, never overwritten; balances and normalized state are derived and reconciled against provider statements.
- **Why:** Payment retries, partial refunds, delayed callbacks, and finance review require reconstructable evidence rather than mutable status fields.
- **Trade-off:** Ledger projections and reconciliation are more complex than updating one payment row, but they make duplicate effects and unexplained balance changes detectable.
