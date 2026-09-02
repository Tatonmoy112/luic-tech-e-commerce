# Current Task - PLT-001

Status: `not started`  
Selected: 2026-09-02  
Owner: Principal engineering  
Dependencies: FND-001 (`complete`)

## Objective

Create the first executable Luic_Tech workspace skeleton with production-oriented TypeScript tooling and the deployment entrypoints required by the accepted architecture, while adding no domain behavior or false security guarantees.

## Relevant context

- [Project scope](project-scope.md)
- [System architecture](system-architecture.md)
- [Architecture decisions](architecture-decisions.md)
- [Contract catalog](contract-catalog.md)
- [Security baseline](security-baseline.md)
- [Task register](task-register.md)

## Architecture impact

This task establishes source and deployable boundaries only. Core modules remain in one modular codebase, while IAM, Inventory, and Payment receive separate entrypoints/workers so later tasks can give them distinct runtime identities, secrets, and network policy. `PLT-002` will enforce dependency rules; `PLT-009` will prove deployment isolation.

## Scope

- Initialize a Corepack-pinned pnpm workspace and Nx project graph with a committed lockfile.
- Pin a supported Node.js runtime and strict shared TypeScript, ESLint, formatting, and Jest configuration.
- Scaffold separate Next.js App Router applications for `storefront` and `admin`, each with a same-origin BFF boundary and no shared session configuration.
- Scaffold NestJS entrypoints for `customer-api`, `admin-api`, `identity-api`, `inventory-api`, `payment-api`, and `webhook-ingress`.
- Scaffold peer `core-worker`, `identity-worker`, `inventory-worker`, and `payment-worker` entrypoints; APIs do not call workers directly.
- Create tagged library roots for bounded contexts, public contracts, and platform adapters without implementing domain logic.
- Add public liveness-only endpoints and minimal smoke tests; readiness/dependency checks belong to `PLT-008`.
- Add root commands and contributor documentation for clean install, format, lint, type-check, unit test, build, and local app execution.
- Add `.gitignore`, editor settings, runtime-version file, and sanitized `.env.example` names only.
- Update project context, archive objective evidence, and select `CI-001` after every acceptance criterion passes.

## Expected structure

```text
apps/
  storefront/
  admin/
  customer-api/
  admin-api/
  identity-api/
  inventory-api/
  payment-api/
  webhook-ingress/
  core-worker/
  identity-worker/
  inventory-worker/
  payment-worker/
libs/
  contracts/
  modules/
  platform/
```

Exact Nx project names may use repository naming conventions, but the deployable and trust boundaries above must remain explicit.

## Out of scope

- PostgreSQL/Prisma, Redis, RabbitMQ, object storage, or Docker services (`PLT-003`/`PLT-004`).
- Authentication, authorization policy, OTP, sessions, or domain implementation.
- Full HTTP security/configuration/logging pipeline (`PLT-005`/`PLT-006`).
- Enforced module-boundary negative fixtures (`PLT-002`).
- CI workflow (`CI-001`).
- Production deployment/network policy (`PLT-009`).
- Provider SDKs, accounts, or credentials.

## Security requirements

- Storefront and admin builds use separate public configuration namespaces and cannot import one another's server/session code.
- Restricted entrypoints load only placeholder configuration schemas for their own context; no secret value is committed.
- Webhook ingress exposes only a liveness endpoint in this task; it does not accept or pretend to verify provider callbacks.
- Environment examples contain names and safe local placeholders only. No token, credential, private key, live endpoint, or customer data is added.
- Health responses reveal no versions, environment values, dependencies, stack traces, or internal topology.

## Acceptance criteria

- [ ] `node context/validate-context.mjs` passes before implementation starts.
- [ ] A clean Corepack/pnpm install with the frozen lockfile succeeds on the pinned Node runtime.
- [ ] Root format-check, lint, type-check, unit-test, and production-build commands all pass.
- [ ] Every declared application/worker is present in the Nx project graph and has an explicit owner/scope tag.
- [ ] Storefront/admin and every NestJS entrypoint build independently.
- [ ] Minimal liveness/smoke tests pass without PostgreSQL, Redis, RabbitMQ, object storage, or provider accounts.
- [ ] No cross-entrypoint controller/session import or restricted-context implementation import is introduced.
- [ ] Secret-shape and non-ASCII/path/link context scans pass; environment examples contain no credential values.
- [ ] Development commands, prerequisites, and known Windows PowerShell execution-policy workaround are documented.
- [ ] Task evidence is archived, `PLT-001` is marked complete, and `CI-001` is selected without claiming it has started.

## Risks and controls

- **Scaffold size:** Many entrypoints can create noisy boilerplate. Use shared build presets and generators while keeping composition roots explicit.
- **Framework drift:** Resolve versions from official compatibility guidance at implementation time, pin them, and commit one lockfile.
- **False isolation:** Separate folders alone are not a security boundary. This task creates entrypoints; later architecture and deployment tests enforce reachability, credentials, and network policy.
- **Windows tooling:** Use `.cmd` shims or Corepack commands that work under the repository's documented PowerShell policy; do not weaken the host execution policy.
- **Premature abstractions:** Shared libraries may contain configuration/tooling and published contracts, not generic business repositories or cross-context entities.
