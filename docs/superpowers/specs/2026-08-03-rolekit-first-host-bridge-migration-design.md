# RepoNav RoleKit-first Host Bridge Migration Design

**Date:** 2026-08-03

**Status:** Destructive cleanup completed after explicit approval

## 1. Context

RepoNav currently has three workflow surfaces:

1. `.codestable/` — the historical workflow system, including roadmap, requirements, feature records, gates, Python tooling, architecture/reference material, implementation scopes, review packets, QA reports, and evidence packs.
2. `.superpowers/` — task execution ledgers and review artifacts for the current repository-hardening v2 cutover.
3. `docs/superpowers/` — the emerging durable docs location, currently containing the repository-hardening v2 cutover design and plan.

The CodeStable surface is too heavy for routine work. It creates many required gates and repeated review loops, which costs time and tokens. The migration target is therefore not a one-for-one rewrite of CodeStable. The target is a simpler RoleKit-first workflow where RoleKit owns role/task contracts, Grok Build acts as the host harness, and `docs/superpowers` stores durable specifications, plans, evidence, and historical archives.

RepoNav is an appropriate pilot because it already has substantial CodeStable history, a small `docs/superpowers` foothold, and no existing `.grok/` project role tree to reconcile. At migration start, the repository had user-owned state: the branch was ahead and behind origin, and `docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md` was modified. This migration must not overwrite or rewrite that active plan.

## 2. Goals

1. Make RoleKit the source of truth for reusable RepoNav role and task contracts.
2. Use Grok Build only as the host bridge that executes one compiled RoleKit task through a subagent.
3. Move durable workflow documentation into `docs/superpowers`.
4. Archive historical `.codestable` and `.superpowers` content under `docs/superpowers/archive` with indexes and source-path traceability.
5. Replace CodeStable's default many-round review behavior with risk-tiered review limits.
6. Add enough local examples that future tasks can start from concrete RoleKit task packets.
7. Avoid adding a private RoleKit package dependency to RepoNav's public package metadata.

## 3. Non-goals

1. Do not delete `.codestable/` or `.superpowers/` until after separate destructive-action approval. This approval was later granted for the cleanup phase.
2. Do not modify the active hardening implementation plan at `docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md`.
3. Do not push, publish, tag, create PRs, or change remote state.
4. Do not change RepoNav runtime behavior, package exports, release version, MCP tool contract, or public CLI contract.
5. Do not add `@gchigoo/rolekit` to `package.json` while RoleKit remains private/pre-publication.
6. Do not preserve CodeStable's gate engine as the new default workflow.

## 4. Target layout

```text
repo-nav/
  rolekit.yaml
  rolekit/
    roles/
      explorer.yaml
      planner.yaml
      implementer.yaml
      reviewer.yaml
      security-release-reviewer.yaml
    tasks/
      examples/
        explore-repository.yaml
        plan-change.yaml
        implement-change.yaml
        review-change.yaml
        security-release-review.yaml

  .grok/
    workflows/
      rolekit-host-bridge.rhai

  docs/
    superpowers/
      README.md
      reference/
        rolekit-first-workflow.md
        rolekit-host-bridge.md
        review-policy.md
        codestable-migration-map.md
      archive/
        codestable/
          INDEX.md
          MANIFEST.tsv
          ...mirrored historical files...
        superpowers/
          INDEX.md
          MANIFEST.tsv
          ...mirrored historical files...
```

The old directories remained present during the first non-destructive phase so existing work was not broken by deletion. After archive verification and explicit destructive-action approval, `.codestable/` and `.superpowers/` were removed; the archive is now the historical source of record.

## 5. RoleKit contract model

RoleKit owns the reusable role/task meaning. Each role defines purpose, capabilities, instructions, input schema, and output schema. Each task packet defines objective, concrete input, context, constraints, acceptance criteria, allowed paths, and expected artifacts.

| Role                        | Capabilities                                   | Purpose                                                                                       |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `explorer`                  | `repository.read`                              | Read-only repository investigation with observed facts and relevant files.                    |
| `planner`                   | `repository.read`                              | Turn an approved spec/request into a bounded implementation plan and risk tier.               |
| `implementer`               | `repository.read`, `repository.write`, `shell` | Implement one bounded change and report changed files/checks.                                 |
| `reviewer`                  | `repository.read`                              | Review actual diff and evidence with strict blocking/non-blocking separation.                 |
| `security-release-reviewer` | `repository.read`, `shell`                     | Review high-risk public contract, process, filesystem, package, release, or security changes. |

All roles bind to `mode: host` executors in `rolekit.yaml`. This keeps the RepoNav package independent of private RoleKit runtime dependencies while still making RoleKit contracts the source of truth.

## 6. Grok Build host bridge

Grok Build remains the host harness. The project workflow `.grok/workflows/rolekit-host-bridge.rhai` accepts a RoleKit task file, role name, capability mode, and objective. It spawns exactly one subagent with a prompt that treats `rolekit.yaml` and the task packet as the source of truth.

The host bridge does not redefine RepoNav roles. It only translates the RoleKit task into a Grok Build subagent execution and returns a structured host result. A future stronger bridge can add automated `rolekit compile` and `rolekit finalize` calls once RoleKit is consumed as a stable dependency or through an approved local tool path.

## 7. Review policy

The new default policy is risk-tiered:

| Risk tier          | Required review                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `low`              | No required subagent review after targeted checks.                                                                                |
| `normal`           | One reviewer pass on actual diff and evidence.                                                                                    |
| `high`             | One reviewer pass plus one specialized security/release review when the risk category applies.                                    |
| `release-critical` | Explicit owner gate plus reviewer/security-release review; no publish, push, tag, or dist-tag mutation without separate approval. |

Review loops are capped:

1. Default maximum is one review plus one re-review.
2. Further rounds require a concrete blocking finding involving security, data loss, public API breakage, release integrity, or production-impacting behavior.
3. Reviewer findings must cite files, lines when available, impact, and suggested fix.
4. `PASS_WITH_NOTES` cannot require another review round.
5. Reviewers inspect current diff/evidence, not the full historical archive.

## 8. Historical migration policy

The migration archives history without keeping CodeStable as the active workflow engine.

1. Mirror `.codestable/` to `docs/superpowers/archive/codestable/`.
2. Mirror `.superpowers/` to `docs/superpowers/archive/superpowers/`.
3. Generate `MANIFEST.tsv` files mapping source paths to archive paths.
4. Generate archive indexes summarizing source, purpose, and current status.
5. In the first phase, mark old source directories deprecated without deleting them; after explicit destructive-action approval, remove the old roots and keep the archive as the historical source of record.
6. Update durable docs references that point to historical `.codestable` evidence when the archive copy is the new canonical documentation path.

## 9. Verification

Because the migration changes workflow/docs/config rather than RepoNav runtime code, verification focuses on structural integrity:

1. Validate the new Grok workflow script with the workflow smoke checker.
2. Validate RoleKit config and compile representative example tasks when a local RoleKit CLI is available.
3. Confirm old active hardening plan content was not modified.
4. Confirm archive manifests map old source files to new archive files.
5. Grep durable docs for stale `.codestable` references outside archive/deprecation contexts.
6. Report current git status and changed paths.

RepoNav business tests are not required unless runtime/package/source files are changed. If package metadata, source, test, or release tooling is changed in a future phase, the corresponding RepoNav gates from the hardening plan must be run.

## 10. Risks and mitigations

| Risk                                                    | Mitigation                                                                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicating historical files increases repository size. | This is intentional for a traceable complete migration. The old roots were deleted only after separate explicit approval and archive verification. |
| RoleKit is private and not a RepoNav dependency.        | Do not change `package.json`; use config/examples/docs and host mode.                                                                              |
| Host bridge could overclaim sandbox guarantees.         | Host profiles document advisory/host-attested behavior and do not claim OS sandbox proof.                                                          |
| Existing hardening work is mid-flight.                  | Do not edit the active modified hardening plan.                                                                                                    |
| Review simplification could miss high-risk issues.      | Security/release reviewer remains mandatory for high-risk categories.                                                                              |
