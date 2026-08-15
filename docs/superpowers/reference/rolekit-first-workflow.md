# RoleKit-first Workflow

**Status:** Current workflow, reviewed 2026-08-15.

RepoNav uses RoleKit as the single source of truth for reusable agent role and task contracts.

## Responsibilities

| Layer              | Responsibility                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| RoleKit            | Role specs, task packets, allowed paths, constraints, acceptance criteria, typed outputs.              |
| Grok Build         | Host orchestration, subagent execution, worktree/session handling, user interaction, and task display. |
| `docs/superpowers` | Durable specs, plans, evidence, review policy, and historical archives.                                |
| RepoNav package    | Product runtime, CLI, MCP server, tests, release tooling.                                              |

## New task flow

1. Start from an approved spec or write a short design under `docs/superpowers/specs/`.
2. Write a focused plan under `docs/superpowers/plans/`.
3. Create a concrete task packet under `rolekit/tasks/` using one of the examples as a starting point.
4. Select the smallest role that fits the work:
   - `explorer` for read-only investigation.
   - `planner` for bounded plans.
   - `implementer` for one local change.
   - `reviewer` for ordinary diff review.
   - `security-release-reviewer` for high-risk public contract, release, process, filesystem, or security work.
5. Execute through the Grok host bridge.
6. Store resulting evidence in `docs/superpowers/evidence/<topic>/`.

## What no longer happens by default

- No mandatory CodeStable feature directory for every small task.
- No automatic many-round review loop.
- No default DoD/gate/evidence-pack generator chain.
- No reviewer rereading the entire historical archive.

High-risk release and security work still requires strict review and owner gates, but those gates are risk-triggered instead of universal.
