# Luic_Tech Project Context

This directory is the authoritative, changing project memory for Luic_Tech. It turns the permanent constraints in [agent.md](../agent.md) and the background requirements in [prompt/](../prompt/) into explicit decisions, task state, and evidence.

## Source-of-truth order

Authority is assigned by concern:

1. The user's latest explicit instruction.
2. [agent.md](../agent.md) for permanent product and architecture constraints.
3. Accepted decisions in [architecture-decisions.md](architecture-decisions.md).
4. [task-register.md](task-register.md) for task IDs, dependency graph, and status.
5. [current-task.md](current-task.md) for the selected task's executable scope and acceptance criteria; its ID/status must match the register.
6. [project-status.md](project-status.md) as a derived fast-resume view; its selected ID/status must match both files above.
7. [task-history.md](task-history.md) and `tasks/<ID>.md` for immutable completion evidence.
8. [prompt/](../prompt/) and [example.md](../example.md) as background requirements and examples.

Any disagreement among the three task-state files halts implementation until repaired; no general precedence silently overwrites task state. Do not silently change an accepted architecture decision. Record the replacement, reason, migration path, and business impact first.

## Task selection protocol

At the beginning of every engineering session:

1. Run `node context/validate-context.mjs`; halt and repair context on any failure.
2. Read [project-status.md](project-status.md) and [current-task.md](current-task.md).
3. If the selected task is `in progress`, resume it.
4. If the selected task is `not started` and every dependency is `complete`, it is the approved next task; mark it `in progress` in all three status documents immediately before changing implementation files.
5. If there is no valid selected task, scan [task-register.md](task-register.md) from top to bottom; physical row order is the canonical fallback priority. Select the first `not started` task whose dependencies are all `complete`, then write its executable brief.
6. Retrieve only the architecture, contract, security, and domain context referenced by the task.
7. Validate against the task's acceptance criteria.
8. Archive the completed brief and exact evidence at `tasks/<ID>.md`, add it to [task-history.md](task-history.md), mark the register task `complete`, and promote the next dependency-ready task.

Never skip blocked dependencies, infer completion from the existence of files, or mark a task complete without validation evidence.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `not started` | No implementation work has begun. |
| `in progress` | This is the single active task. |
| `blocked` | Work cannot proceed; `current-task.md` records the exact condition, owner, attempts, and unblock signal. |
| `complete` | Every acceptance criterion has objective evidence in `tasks/<ID>.md` and an entry in `task-history.md`. |

Only one task may be `in progress` at a time.
Only the selected task may be `blocked`; all blocker evidence belongs in its brief.

## Context index

| Document | Use |
| --- | --- |
| [project-scope.md](project-scope.md) | Product scope, actors, invariants, and measurable quality goals. |
| [system-architecture.md](system-architecture.md) | Canonical bounded contexts, ownership, dependencies, topology, and scaling model. |
| [architecture-decisions.md](architecture-decisions.md) | Accepted technical choices and trade-offs. |
| [contract-catalog.md](contract-catalog.md) | Initial synchronous service and asynchronous event boundaries. |
| [security-baseline.md](security-baseline.md) | Zero Trust zones, identities, authorization, and data controls. |
| [task-register.md](task-register.md) | Dependency-ordered delivery backlog and acceptance evidence. |
| [project-status.md](project-status.md) | Fast resume point: completed work, active work, next task, and blockers. |
| [current-task.md](current-task.md) | Full brief for the active or next task. |
| [task-history.md](task-history.md) | Completion index with dated evidence links. |
| `tasks/<ID>.md` | Immutable completed brief, acceptance results, commands, artifacts, date, and reviewer. |
| [validate-context.mjs](validate-context.mjs) | Dependency, status, link, required-file, and basic secret-shape validation. |

## Context maintenance rules

- Prefer links to canonical documents instead of copying decisions between files.
- Use ISO dates (`YYYY-MM-DD`) and UTC timestamps in implementation data; status documents may also name the project timezone.
- Preserve Bengali text as UTF-8 and use `BDT` as the machine-readable currency code.
- A module owns its data, migrations, repositories, and write rules. Another module may retain an opaque identifier or an event-built read projection, but may never query the owner's tables.
- Contract changes require compatibility analysis, versioning, consumer tests, and a rollout plan.
- Dependency fields use exactly `None` or a comma-separated list of task IDs. Completion status without an evidence archive is invalid.

Run `node context/validate-context.mjs` after every context/status change and before claiming a task transition is valid.
