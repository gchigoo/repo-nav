# RepoNav RoleKit-first Host Bridge Migration Implementation Plan

> **Status (reviewed 2026-08-15): Complete.** The RoleKit contracts, Grok Build host bridge, durable documentation, archive manifests, and approved destructive cleanup are all present on `main`. This file is retained as the completed implementation record, not an active task list. Constraints below describe the migration execution context at the time.

**Goal:** Complete a non-destructive migration from CodeStable-driven workflow artifacts to a RoleKit-first contract model with a Grok Build host bridge and `docs/superpowers` archives.

**Architecture:** RoleKit owns RepoNav role/task contracts through `rolekit.yaml`, `rolekit/roles`, and example task packets. Grok Build owns host orchestration through a single `.grok/workflows/rolekit-host-bridge.rhai` workflow that executes one RoleKit task through a subagent. `docs/superpowers` is the durable workflow documentation and archive root; old `.codestable` and `.superpowers` roots were removed after explicit destructive-action approval and archive preflight.

**Tech Stack:** RoleKit config schema `rolekit/config@1`, RoleKit role/task schemas v1, Grok Build project workflow, Markdown documentation, Node.js `^22.0.0 || ^24.0.0`, TypeScript/ESM RepoNav repository.

## Global Constraints

- Initial migration must not delete `.codestable/` or `.superpowers/` without separate destructive-action approval; the cleanup phase received that approval and removed both roots after archive preflight.
- Do not modify `docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md`.
- Do not push, publish, tag, create PRs, or change remote state.
- Do not change RepoNav runtime source, package exports, release version, MCP tool contract, or public CLI contract.
- Do not add private RoleKit dependencies to `package.json`.
- Treat current uncommitted repo state as user-owned.
- Use explicit path lists for any future commits; this migration does not create a commit.

---

## File structure

- Create `rolekit.yaml`: RoleKit config binding RepoNav roles to Grok-host executor profiles.
- Create `rolekit/roles/*.yaml`: reusable role contracts and typed output schemas.
- Create `rolekit/tasks/examples/*.yaml`: concrete example task packets for each role.
- Create `.grok/workflows/rolekit-host-bridge.rhai`: one-task Grok Build host bridge workflow.
- Create `docs/superpowers/README.md`: new workflow entrypoint.
- Create `docs/superpowers/reference/*.md`: RoleKit-first workflow, host bridge, review policy, and CodeStable migration map.
- Create `docs/superpowers/archive/codestable/**`: copied CodeStable history plus index/manifest.
- Create `docs/superpowers/archive/superpowers/**`: copied Superpowers SDD history plus index/manifest.
- Remove `.codestable/` and `.superpowers/` after archive verification and explicit destructive-action approval.
- Modify `docs/acceptance/mvp.md`: replace durable historical evidence references with archive paths only.
- Modify `.prettierignore`: exclude immutable historical archive copies from routine Markdown formatting.
- Modify `testkit/docs/docs-smoke-runner.ts`: update docs smoke artifact inventory to the archived evidence paths.

## Task 1: RoleKit contract root

**Files:**

- Create: `rolekit.yaml`
- Create: `rolekit/roles/explorer.yaml`
- Create: `rolekit/roles/planner.yaml`
- Create: `rolekit/roles/implementer.yaml`
- Create: `rolekit/roles/reviewer.yaml`
- Create: `rolekit/roles/security-release-reviewer.yaml`
- Create: `rolekit/tasks/examples/explore-repository.yaml`
- Create: `rolekit/tasks/examples/plan-change.yaml`
- Create: `rolekit/tasks/examples/implement-change.yaml`
- Create: `rolekit/tasks/examples/review-change.yaml`
- Create: `rolekit/tasks/examples/security-release-review.yaml`

**Interfaces:**

- Consumes: RoleKit config and role/task schema v1.
- Produces: `rolekit.yaml` roles `explorer`, `planner`, `implementer`, `reviewer`, and `security-release-reviewer`.

- [x] **Step 1: Create RoleKit config and host profiles**

Create host executor profiles only. Do not add adapter profiles that require private credentials.

- [x] **Step 2: Create role contracts**

Each role contains strict JSON Schemas and instructions limiting scope, evidence, review loop behavior, and output shape.

- [x] **Step 3: Create example task packets**

Each example task is a valid concrete packet, not a placeholder template, so `rolekit compile` can exercise it.

## Task 2: Grok Build host bridge

**Files:**

- Create: `.grok/workflows/rolekit-host-bridge.rhai`
- Create: `docs/superpowers/reference/rolekit-host-bridge.md`

**Interfaces:**

- Consumes: a RoleKit task file path, role name, capability mode, and objective from workflow args.
- Produces: a structured host result with verdict, summary, changed files, checks, evidence, and risks.

- [x] **Step 1: Author the workflow**

The workflow validates `args.task_file`, assembles a self-contained host prompt, spawns exactly one subagent, and completes with a compact result.

- [x] **Step 2: Smoke-check the workflow**

Run the workflow smoke checker in `validate_only` mode with representative args. The smoke check validates metadata and compilation but does not prove live RoleKit or live subagent behavior.

## Task 3: Durable workflow docs

**Files:**

- Create: `docs/superpowers/README.md`
- Create: `docs/superpowers/reference/rolekit-first-workflow.md`
- Create: `docs/superpowers/reference/review-policy.md`
- Create: `docs/superpowers/reference/codestable-migration-map.md`
- Modify: `docs/acceptance/mvp.md`
- Modify: `.prettierignore`
- Modify: `testkit/docs/docs-smoke-runner.ts`

**Interfaces:**

- Consumes: migration design and existing RepoNav docs.
- Produces: the future human-facing entrypoint for RepoNav agentic workflow.

- [x] **Step 1: Write new workflow entrypoint**

Point future tasks to RoleKit task packets, Grok host bridge, and `docs/superpowers/evidence`.

- [x] **Step 2: Write review policy**

Replace CodeStable's default many-round gate with risk-tiered review and a one-review-plus-one-rereview default cap.

- [x] **Step 3: Update acceptance historical evidence references**

Change durable historical paths from `.codestable/features/...` to `docs/superpowers/archive/codestable/features/...`.

## Task 4: Historical archive migration

**Files:**

- Create: `docs/superpowers/archive/codestable/**`
- Create: `docs/superpowers/archive/codestable/INDEX.md`
- Create: `docs/superpowers/archive/codestable/MANIFEST.tsv`
- Create: `docs/superpowers/archive/superpowers/**`
- Create: `docs/superpowers/archive/superpowers/INDEX.md`
- Create: `docs/superpowers/archive/superpowers/MANIFEST.tsv`
- Delete after approval: `.codestable/`
- Delete after approval: `.superpowers/`

**Interfaces:**

- Consumes: existing `.codestable` and `.superpowers` files.
- Produces: traceable archive copies and deprecation notices.

- [x] **Step 1: Copy historical files**

Copy files without deleting or moving source directories. Exclude bytecode/cache artifacts if present.

- [x] **Step 2: Generate manifests**

Map every archived source path to its archive path.

- [x] **Step 3: Mark old directories deprecated**

Add redirect notices while keeping old content intact.

## Task 5: Verification

**Files:**

- Read/check only: `rolekit.yaml`, `.grok/workflows/rolekit-host-bridge.rhai`, archive manifests, git status.

**Interfaces:**

- Consumes: migrated files.
- Produces: verification evidence for the final report.

- [x] **Step 1: Validate workflow smoke path**

Use `workflow(validate_only: true)` with representative args.

- [x] **Step 2: Validate RoleKit config and example compile commands**

Use the local RoleKit CLI from the sibling `rolekit` checkout. The config validates and all five example task packets compile.

- [x] **Step 3: Confirm protected plan remains user-owned**

`docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md` had pre-existing user modifications and is not treated as migration-owned.

- [x] **Step 4: Confirm archive manifests and stale references**

Archive manifests map to existing archive files, and non-archive `.codestable`/`.superpowers` mentions are limited to migration explanatory docs.

- [x] **Step 5: Report changed paths and destructive cleanup status**

Old source directories were removed after explicit destructive-action approval; historical copies remain under `docs/superpowers/archive/`.

## Destructive cleanup addendum

After the non-destructive migration passed review, the user explicitly approved destructive cleanup. The cleanup phase removed the old workflow roots:

- `.codestable/`
- `.superpowers/`

Before deletion, archive manifests were checked against the old source roots with content hashes. Owner/runtime release evidence paths were migrated from `.codestable/runtime/` to `docs/superpowers/evidence/release-runtime/`, and historical read-only inputs were migrated to `docs/superpowers/archive/codestable/`.
