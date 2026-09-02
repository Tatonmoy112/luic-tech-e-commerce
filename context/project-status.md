# Project Status

As of: 2026-09-02 (Asia/Dhaka)

## Current state

- **Selected task:** `PLT-001`
- **Selected status:** `not started`
- **Selected task title:** Scaffold pnpm/Nx workspace with storefront/admin BFFs, customer/admin APIs, restricted IAM/Inventory/Payment APIs, webhook ingress, workers, contracts, modules, and platform projects
- **Last completed task:** `FND-001`
- **Next candidate after selected:** `CI-001`
- **Blocked tasks:** `None`

External-provider tasks will require user-owned sandbox accounts and secrets when those tasks become selected; they are not current blockers.

## Baseline repository evidence

- Permanent product constraints existed in [agent.md](../agent.md).
- Background requirements existed in [example.md](../example.md), [plan-1.md](../prompt/plan-1.md), and [plan-2.md](../prompt/plan-2.md).
- `context/` was empty.
- There was no Git repository, package manifest, lockfile, application source, Prisma schema, infrastructure definition, CI workflow, or runnable test/build command.

## Decisions established by FND-001

- Seventeen explicit bounded contexts and their data ownership are canonicalized in [system-architecture.md](system-architecture.md).
- IAM and Customer Profile are separated; Category/Product remain inside Catalog; Audit & Compliance is explicit.
- The implementation baseline is a pnpm/Nx workspace with separate Next.js storefront/admin BFFs; customer/admin NestJS entrypoints; restricted IAM, Inventory, Payment, and webhook entrypoints; and peer workers.
- One PostgreSQL cluster may be shared operationally, but schemas, roles, migrations, and Prisma clients are owned per context; cross-context SQL is forbidden.
- REST/OpenAPI, versioned integration events, RabbitMQ, transactional outbox/inbox, Redis support services, and S3-compatible storage are selected.
- Zero Trust is enforced at ingress and every module facade with separate customer/admin audiences and evidence-driven authorization.

## Completion evidence

- `FND-001` is archived at [tasks/FND-001.md](tasks/FND-001.md).
- The task graph contains 107 unique dependency-valid tasks, all connected to the launch gate.
- The selected next task is dependency-ready but remains `not started`; no application code, dependencies, or infrastructure are claimed.

## Open decisions, not current blockers

[FND-002](task-register.md) must resolve business-owned policies before affected domain tasks:

- VAT registration/rates and invoice requirements.
- Cancellation windows, return eligibility/windows, refund timing, and restocking rules.
- Backorder/pre-order and partial-fulfillment policy.
- Delivery zones, service promises, shipping subsidy, and COD eligibility/limits.
- Voucher conflict/priority defaults and approval thresholds.
- Fraud review/hold policy and high-value approval thresholds.
- PII, transaction, audit, media, and analytics retention/erasure matrix with Bangladesh legal review.

## Update rule

At the end of a task, update the selected task/status above, archive objective validation evidence, update [task-register.md](task-register.md) and [task-history.md](task-history.md), and rewrite [current-task.md](current-task.md) for the next dependency-ready task. Do not report a pending provider credential or unapproved business policy as a blocker until the selected task actually requires it.
