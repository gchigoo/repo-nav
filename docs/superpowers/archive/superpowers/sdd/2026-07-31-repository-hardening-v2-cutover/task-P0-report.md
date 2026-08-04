# Task P0 实现报告

## 状态

**DONE_WITH_CONCERNS**

唯一 concern：P0 brief 要求 independent review，但本执行上下文明确禁止子代理继续委派，因此只能完成 self-review，未声称 independent PASS。主会话 reviewer 仍需对提交 `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4` 做独立 diff review。

## Objective

在当前 `main` 上完成 P0：冻结 public root runtime/type exports、`repo-nav/legacy-v1` 传递 export 与迁移映射、全部现有 WeakMap/WeakSet disposition，以及 package/release version authority inventory；只添加 characterization/inventory 测试，不修改 production。

## Scope completed

- 新增静态 public root runtime/type export fixture。
- 新增完整 legacy-v1 API replacement/disposition fixture：覆盖 149 个 `src/legacy-v1.ts` 传递 export，加上 subpath、`PackageMetadataV1` 与 concrete backend `probe/search` 兼容 API，共 155 rows。
- 新增全部当前 WeakMap/WeakSet disposition fixture，共 98 rows。
- 新增 10 个 literal version authority rows：package root、shrinkwrap root、shrinkwrap workspace root、runtime metadata、CLI `--version`、MCP `serverInfo.version`、tarball filename、installed package.json、SBOM root、real-consumer confirmation。
- 新增 TypeScript compiler API inventory evaluator/test：
  - 枚举 `src/index.ts` runtime/type exports；
  - 枚举 `src/legacy-v1.ts` transitive exports；
  - 枚举 `src/**/*.ts` 中全部 `new WeakMap` / `new WeakSet` binding；
  - 对 duplicate row、unknown registry、empty rationale、ordinary-data + retain fail closed；
  - 验证固定 legacy mappings 与 literal version authorities。
- 新增 mutation sensitivity：删除 root export、增加 synthetic WeakMap、ordinary-data 改为 retain、删除 MCP version authority 均被 evaluator 拒绝。
- 将 existing public root runtime snapshot expectation 移至 shared fixture。
- 将 `repository-hardening-inventory` 注册到 unit runner cases。
- 按 brief exact file list staging 并创建唯一 P0 commit。

## Scope excluded

- 未修改任何 `src/**` production 文件。
- 未开始 A1 或任何后续任务。
- 未修改、暂存或提交 `docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md`。
- 未执行 push、publish、tag、dist-tag、外部消息或外部服务访问。
- 未创建额外产品行为或 release cutover。

## Changed files

Commit 中精确包含：

1. `testkit/fixtures/repository-hardening-v2/public-root-api-v2.ts`
2. `testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts`
3. `testkit/fixtures/repository-hardening-v2/weak-registry-disposition-v2.ts`
4. `testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts`
5. `test/unit/repository-hardening-inventory-v2.spec.ts`
6. `test/unit/public-root-export-snapshot.spec.ts`
7. `testkit/runners/runner-registry.ts`

Report 本身位于 `.superpowers/sdd/.../task-P0-report.md`，受 `.superpowers/sdd/.gitignore` 排除，未进入 commit。

## Revision / diff

- Branch: `main`
- Starting revision: `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b`
- P0 commit: `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4`
- Commit subject: `test(hardening): freeze public and authority inventories`
- Commit diff: 7 files changed, 1784 insertions, 47 deletions
- Commit path read-back: exactly matches the seven P0 brief paths above
- `git diff HEAD^ HEAD --check`: exit 0
- Index after commit: empty
- Worktree after commit: only the pre-existing unstaged plan document remains dirty
- Branch state observed before implementation: `main...origin/main [ahead 2, behind 1]`; after the local P0 commit it is expected to be ahead by one additional commit. No fetch/push was performed.

## Checks and freshness

All Step 4 checks were run after the final source/test edit against the exact tree subsequently committed:

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | 1 test file passed; 3 tests passed; 81 files / 423 tests skipped by selection |
| `npm test -- --group public-beta-release --case package-metadata` | 0 | 4 test files passed; 4 tests passed; 78 files / 422 tests skipped by selection |
| `npm run typecheck` | 0 | strict TypeScript check passed |
| `npm run lint` | 0 | ESLint passed with max warnings 0 |
| `npm run format:check` | 0 | all configured matched files passed Prettier check |

Post-commit fresh targeted read-back:

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | committed revision: 1 test file passed; 3 tests passed |
| `git diff HEAD^ HEAD --check` | 0 | committed diff clean |

Staging/commit gates:

| Gate | Exit | Result |
| --- | ---: | --- |
| exact-path `git add` from brief | 0 | only seven listed paths staged |
| `git diff --cached --name-only` | 0 | exact allowlist match |
| explicit sorted file-list `diff -u` | 0 | `MATCH` |
| `git diff --cached --check` | 0 | passed |
| `git commit -m "test(hardening): freeze public and authority inventories"` | 0 | created `ae1d7a5...` |

## Self-review evidence

- New fixtures do not import/read `package.json`, `npm-shrinkwrap.json`, or the tested package to derive expected values.
- `version-authorities-v2.ts` contains literal `1.0.6`, `repo-nav-1.0.6.tgz`, and `pkg:npm/repo-nav@1.0.6` expectations.
- Compiler-API discovery and fixture comparison passed with 98 current WeakMap/WeakSet sites and 98 disposition rows.
- Weak disposition audit: 0 duplicates, 0 empty rationales, 0 ordinary-data + retain rows.
- Legacy mapping audit: 155 rows, 0 duplicates, 0 placeholder replacements.
- Required mappings verified exactly: subpath→root; LocateResult/LocateToolOutput; schemas; EvidencePack; RepoNavToolError; retained LocateRequest; PackageMetadataV1→PackageMetadata; SafeProcess* and RepositorySearchBackend removed-internal-only; concrete backend probe/search retained-root.
- Mutation tests prove evaluator sensitivity for all four Step 2 mutations plus duplicate and blank-rationale cases.
- The dirty plan document remained unstaged before commit and remains the only worktree modification after commit.

## Assumptions

- The explicit user authorization to continue on dirty `main` superseded the clean-tree prerequisite only for the pre-existing plan document.
- P0 is characterization-only, so version authority rows freeze both current literal values and authority locations without implementing C5 validation/cutover behavior.
- Weak registry phase dispositions are inventory decisions for later C2/C3/C5 work; P0 does not alter those registries.

## Residual risks / concerns

1. **Independent review pending.** Only self-review was possible in this subagent context; no independent PASS is claimed.
2. The repository started divergent from origin (`ahead 2, behind 1`). P0 did not fetch, rebase, merge, push, or otherwise change that relationship.
3. The configured `format:check` currently excludes `test/**` and `testkit/**`; the required command passed as configured. Typecheck and targeted tests directly exercised the new files.

## Blockers

None for implementation or commit. Independent review remains a reviewer action rather than an implementation blocker.

## External state

- No external or shared-state writes.
- No push, publish, tag, dist-tag, messages, deployment, database, infrastructure, or external service access.
- One authorized local Git commit created.

## Next reviewer action

Independently inspect commit `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4`, mapping each P0 acceptance item to the actual diff and rerunning at minimum the inventory test. Pay particular attention to literal (non-derived) version expectations, all 98 WeakMap/WeakSet rows and their dispositions, all 155 legacy mappings with no placeholders, and preservation of the unstaged plan document.

---

# P0 review fix round 1/5 report

## Status

**DONE_WITH_CONCERNS**

All two Important findings and the Minor formatting finding from `task-P0-review.md` were remediated in the bounded P0 test/fixture scope. The only concern is that the amended revision still requires a fresh independent reviewer verdict; this executor performed self-review only and does not claim an independent PASS.

## Objective

Repair the failed P0 characterization revision without starting A1 or changing production behavior, then amend the original P0 commit rather than create a review-fix commit.

## Review findings remediated

1. **Fixture-owned phase state and cutover-ready evaluator**
   - Removed the evaluator-owned duplicate ten-row version table and all evaluator literals for current version `1.0.6`.
   - Added fixture-owned `LEGACY_V1_SOURCE_STATE_V2` (`present`/`removed`) and moved non-transitive legacy compatibility keys into the legacy fixture.
   - Changed source inventory discovery so missing `src/legacy-v1.ts` is represented as `{ state: 'removed', exports: [] }` rather than throwing.
   - Changed version evaluation to compare each observed authority's ID/module/binding/wiring/value against its fixture row.
   - Added a synthetic C5 transition test that changes root metadata type, legacy source state, all version literals, and planned wiring in cloned fixture/source models. The current version is read from the fixture clone, not duplicated in the evaluator or test transition logic.
2. **Truthful current version-authority characterization**
   - Added fixture wiring state and marked `installed-package-json` plus `real-consumer-confirmation` as `planned-unwired`, while preserving their fixed literal `1.0.6` expectations in the fixture.
   - Replaced nearby substring acceptance with an AST/dataflow check requiring an installed `node_modules/repo-nav/package.json` read through `readFileSync` + `JSON.parse` followed by `.version` access.
   - Added an exact AST property-path check for `confirmation.candidate.version`.
   - Added a focused assertion that both current source observations are `unwired` with `actual: null` and both fixture rows are explicitly `planned-unwired`.
3. **Formatting**
   - Applied Prettier 3.9.6 output to the two review-cited P0-created files:
     - `test/unit/repository-hardening-inventory-v2.spec.ts`
     - `testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts`

## Scope completed

- Modified only three P0-allowed files during this fix round:
  - `test/unit/repository-hardening-inventory-v2.spec.ts`
  - `testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts`
  - `testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts`
- Amended the original P0 commit in place; its parent and subject remain unchanged.
- Verified the final amended commit still contains exactly the seven paths in the P0 brief.

## Scope excluded

- No A1 or later task was started.
- No `src/**`, release tool, package metadata, documentation, or other production behavior was changed.
- `docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md` was not modified, staged, or committed by this fix. Its pre-existing diff remained unstaged and retained the reviewer-recorded SHA-256 `f2430e69b97669c2ac6cfdec4999b161d543f6a40ec1f1f18ae71c9605d21bb2`.
- No push, publish, tag, dist-tag, deployment, external message, or external-service write occurred.

## Revision / diff

- Superseded P0 revision: `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4`
- Amended P0 revision: `a9d5b9ed573eed97755183168e41494501648d26`
- Parent retained: `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b`
- Subject retained: `test(hardening): freeze public and authority inventories`
- Final commit summary: 7 files changed, 2115 insertions, 47 deletions
- Final committed path set: exact match with the seven-path P0 allowlist
- Index after amend: empty
- Worktree after amend: only the protected, pre-existing plan-document modification is visible to Git

## Commands, exit codes, and fresh results

All source/test gates below were run after the final relevant edit. The focused inventory test, direct Prettier check, and typecheck were also rerun after the amend against revision `a9d5b9ed573eed97755183168e41494501648d26`.

| Command | Exit | Result |
| --- | ---: | --- |
| `npx --no-install prettier --write test/unit/repository-hardening-inventory-v2.spec.ts testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts` | 0 | Applied current Prettier output to both review-cited files. |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | Post-amend: 1 file passed, 5 tests passed, 81 files / 423 tests skipped by selection. |
| `npm test -- --group public-beta-release --case package-metadata` | 0 | Final-tree pre-amend: 4 files passed, 4 tests passed, 78 files / 424 tests skipped by selection. |
| `npm run typecheck` | 0 | Post-amend TypeScript check passed. |
| `npm run lint` | 0 | Final-tree configured ESLint gate passed. |
| `npm run format:check` | 0 | Final-tree configured Prettier gate passed. |
| `npx --no-install prettier --check test/unit/repository-hardening-inventory-v2.spec.ts testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts` | 0 | Post-amend direct check: both files match Prettier output. |
| Exact seven-path `git add ...` from the P0 brief | 0 | Staged only explicitly listed P0 paths; no broad add used. |
| `git diff --cached --name-only` | 0 | Three review-fix paths shown; all are a subset of the exact P0 allowlist. |
| `git diff --cached HEAD^ --name-only` plus sorted `diff -u` against the seven-path allowlist | 0 | Prospective amended commit path set was an exact match. |
| `git diff --cached --check` and `git diff --cached HEAD^ --check` | 0 | Staged fix and full prospective amended diff were clean. |
| `git commit --amend --no-edit` | 0 | Replaced `ae1d7a5...` with `a9d5b9e...`; no extra commit created. |
| Final `git diff-tree --no-commit-id --name-only -r HEAD` plus sorted allowlist comparison | 0 | Amended commit contains exactly the seven allowed paths. |
| `git diff HEAD^ HEAD --check` | 0 | Final committed diff is clean. |
| Final `git status --short --branch`; `git diff --cached --name-only` | 0 | Index empty; only protected plan document remains dirty; branch `main...origin/main [ahead 3, behind 1]`. |

## Assumptions

- The two absent authorities are intentionally characterized as planned/unwired in P0; their production wiring remains work for an explicitly approved later task.
- Fixture rows remain the phase-owned literal source. Runtime/package/source observations are used only as actual values or wiring evidence and do not populate fixture expectations.
- The existing divergent branch state and protected plan-document work belong to the main session and were preserved.

## Residual risks / concerns

1. A fresh independent review of amended revision `a9d5b9ed573eed97755183168e41494501648d26` is still required before P0 receives an independent PASS.
2. The configured `format:check` still excludes `test/**` and `testkit/**`; the required direct Prettier check covers the two files attributed by the review.
3. The repository remains `ahead 3, behind 1`; this fix did not fetch, merge, rebase, push, or alter remote state.

## Blockers

None for the bounded fix or amend. Independent re-review is the next gate, not an implementation blocker.

## External state

- No external/shared-state writes.
- No push, publish, tag, dist-tag, release, deployment, message, database, infrastructure, or external-service operation.
- One pre-authorized local Git amend updated the existing P0 commit.

## Next reviewer action

Independently review the actual diff `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b..a9d5b9ed573eed97755183168e41494501648d26`. Re-run the focused inventory case and direct two-file Prettier check, then map both prior Important findings and the Minor finding to the amended fixture/evaluator behavior before issuing a verdict.

---

# P0 review fix round 2/5 report

## Status

**DONE_WITH_CONCERNS**

The single new Important finding from `task-P0-rereview-round-1.md` was repaired within the P0 test scope. A fresh independent re-review of the new amended revision remains required; this executor does not claim an independent PASS.

## Objective

Replace the syntactic `confirmation.candidate.version` property-access detector with authority-semantic characterization, add the required synthetic detector matrix, and amend the existing P0 commit without starting A1 or changing production behavior.

## Finding remediated

- Removed `sourceHasPropertyPathV2()` and the `confirmationVersionWired ? packageVersion : null` observation that treated any direct property access as a wired authority and fabricated its actual value from workspace metadata.
- Added alias/destructuring-aware AST reference resolution for ordinary variable aliases, property access, element access, and object binding patterns.
- A confirmation version now counts as wired only when a strict equality/mismatch relationship is enforced by a fail-closed branch and the comparator resolves to either:
  - a `package.json` version authority read through `readFileSync` plus `JSON.parse`; or
  - a literal exact `repo-nav` tarball candidate descriptor containing a concrete version and matching tarball filename or 64-lowercase-hex tarball SHA-256.
- Direct or aliased `typeof` schema checks and unused reads/comparisons return `null` and leave the current fixture correctly `planned-unwired`.
- Tarball-descriptor observations return the version literal resolved from the descriptor itself. The synthetic tarball version deliberately differs from the detector context's package version, proving the detector does not borrow workspace `packageVersion` after seeing a property access.
- Workspace `packageVersion` is used only when the compared source expression itself resolves to a package-json version read; it is no longer substituted solely because `confirmation.candidate.version` appeared.
- Conflicting semantic bindings fail closed as unwired because the detector returns an actual only when exactly one version is established.

## Synthetic detector coverage added

The focused inventory case now covers:

1. direct type-only access → unwired;
2. aliased type-only access → unwired;
3. unused direct access and unused exact comparison → unwired;
4. direct exact tarball binding → source descriptor version;
5. aliased exact tarball binding → source descriptor version;
6. destructured exact tarball binding → source descriptor version;
7. aliased/destructured exact package-json binding → observed package version.

## Scope completed

- Modified only `test/unit/repository-hardening-inventory-v2.spec.ts`, one of the seven P0-allowed paths.
- Kept the version fixture and all production/release files unchanged.
- Amended the existing P0 commit in place; no review-fix commit was created.
- Verified the final amended P0 commit still contains exactly the seven brief-listed paths.

## Scope excluded

- No A1 or later task was started.
- No production `src/**`, `tools/release/**`, package metadata, fixture, runner, or documentation behavior was changed in this round.
- `docs/superpowers/plans/2026-07-31-repository-hardening-v2-cutover.md` was not modified, staged, or committed. Its pre-existing unstaged diff retained SHA-256 `f2430e69b97669c2ac6cfdec4999b161d543f6a40ec1f1f18ae71c9605d21bb2`.
- No push, publish, tag, dist-tag, deployment, external message, or external-service write occurred.

## Revision / diff

- Superseded round-1 revision: `a9d5b9ed573eed97755183168e41494501648d26`
- Amended round-2 revision: `b29e4215e485c8b386d4d6a99992d482967bc7eb`
- Original P0 parent retained: `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b`
- Subject retained: `test(hardening): freeze public and authority inventories`
- Final commit summary: 7 files changed, 2628 insertions, 47 deletions
- Final path set: exact seven-path P0 allowlist
- Index after amend: empty
- Worktree after amend: only the protected pre-existing plan-document modification is tracked as dirty

## Commands, exit codes, and fresh results

All source/test checks were run after the final relevant edit. The focused test, direct Prettier check, and typecheck were rerun after amend against `b29e4215e485c8b386d4d6a99992d482967bc7eb`.

| Command | Exit | Result |
| --- | ---: | --- |
| `npx --no-install prettier --write test/unit/repository-hardening-inventory-v2.spec.ts` | 0 | Applied/confirmed current Prettier output for the affected P0-created file. |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | Post-amend: 1 file passed, 6 tests passed, 81 files / 423 tests skipped by selection. |
| `npx --no-install prettier --check test/unit/repository-hardening-inventory-v2.spec.ts` | 0 | Post-amend direct check passed. |
| `npm run typecheck` | 0 | Post-amend TypeScript check passed. |
| `npm run lint` | 0 | Final-tree configured ESLint gate passed. |
| `npm run format:check` | 0 | Final-tree configured repository Prettier gate passed. |
| `npm test -- --group public-beta-release --case package-metadata` | 0 | Final-tree pre-amend: 4 files passed, 4 tests passed, 78 files / 425 tests skipped by selection. |
| `git add test/unit/repository-hardening-inventory-v2.spec.ts` | 0 | Staged only the single actually modified P0-allowed file. |
| `git diff --cached --name-only` plus exact allowlist subset check | 0 | Only `test/unit/repository-hardening-inventory-v2.spec.ts` was staged. |
| `git diff --cached HEAD^ --name-only` plus sorted seven-path allowlist comparison | 0 | Prospective amended commit path set was exact. |
| `git diff --cached --check` and `git diff --cached HEAD^ --check` | 0 | Staged round-2 diff and full prospective P0 diff were clean. |
| `git commit --amend --no-edit` | 0 | Replaced `a9d5b9e...` with `b29e421...`; no extra commit created. |
| Final `git diff-tree --no-commit-id --name-only -r HEAD` plus sorted allowlist comparison | 0 | Final commit contains exactly the seven approved P0 paths. |
| `git diff HEAD^ HEAD --check` | 0 | Final committed diff is clean. |
| Final `git status --short --branch`; `git diff --cached --name-only` | 0 | Index empty; only protected plan document remains dirty; branch remains `main...origin/main [ahead 3, behind 1]`. |

## Assumptions

- A2 schema/type validation alone is not a version authority; only a fail-closed comparison to an independently identifiable package or exact tarball candidate value is wiring.
- Static characterization is intentionally fail-closed: unsupported assertion shapes remain unwired rather than being falsely certified.
- The pre-existing divergent branch state and plan-document work belong to the main session and were preserved.

## Residual risks / concerns

1. A fresh independent scoped re-review of `b29e4215e485c8b386d4d6a99992d482967bc7eb` is still required.
2. The semantic detector deliberately recognizes fail-closed strict comparison forms plus ordinary aliases/destructuring; an unrelated future assertion style will be reported unwired rather than falsely passing and should be evaluated during its owning task review.
3. The repository remains `ahead 3, behind 1`; no remote or history-integration operation was performed.

## Blockers

None for this bounded repair or amend. Independent re-review is the next gate.

## External state

- No external/shared-state writes.
- No push, publish, tag, dist-tag, release, deployment, message, database, infrastructure, or external-service operation.
- One pre-authorized local Git amend updated the existing P0 commit.

## Next reviewer action

Independently inspect `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b..b29e4215e485c8b386d4d6a99992d482967bc7eb`, focusing on the semantic detector and its synthetic matrix. Re-run the inventory case, direct one-file Prettier check, and typecheck; verify A2-style type-only/unused accesses remain unwired, aliases/destructuring are handled, exact package/tarball bindings produce the correct value, and workspace `packageVersion` is not borrowed for a tarball descriptor.
