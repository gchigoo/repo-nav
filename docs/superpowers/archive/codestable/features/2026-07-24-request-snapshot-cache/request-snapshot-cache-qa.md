---
doc_type: feature-qa
feature: 2026-07-24-request-snapshot-cache
status: passed
runner_state: completed
runner_reason: ""
runner_id: independent-qa-agent-f3-request-snapshot-cache-r1
qa_agent_id: independent-qa-agent-f3-request-snapshot-cache-r1
tested: 2026-07-28
round: 1
---

# request-snapshot-cache QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-request-snapshot-cache/request-snapshot-cache-design.md`（approved）
- Checklist: `request-snapshot-cache-checklist.yaml`（S1–S5 `done`；checks 仍 `pending`，本 QA 未翻转）
- Review: `request-snapshot-cache-review.md`（`status=passed`，blocking=0；`reviewer_id=independent-task-agent-f3-request-snapshot-cache-r1`）
- Evidence pack / gate / DoD: `implementation.before_review` 均为 `passed`（CMD-DOCTOR non-core warning）
- Diff basis: F3 request-snapshot / executor dual-lane / unit+golden fixtures；本 verdict 只覆盖 F3 可归因路径
- Baseline dirty files: 同 worktree 内其他 feature、`dist/` 等 ambient；未归因到本 feature 的路径不进本报告结论
- Feature type: mixed（功能性执行拓扑 + 契约/无 cutover 约束）
- Core evidence gate: single-decode、observation reuse、dual-lane/800 cap 接线、final purge/abort retain、mutation→partial、snapshot ON 下 v1 parity、production no-cutover；REV-007/009 记 residual 不阻塞

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-TYPECHECK | core-functional | 严格类型 | typecheck | `npm run typecheck` | exit 0 | pass |
| QA-002 | F3-CACHE-001 | core-functional | single-decode / canonical alias | unit | `request-file-cache-single-decode` + `request-file-cache-canonical-alias` | decode 一次且 alias 共享 | pass |
| QA-003 | F3-VERIFY-001 | core-functional | observation reuse | unit | `verified-record-cache-preverification-reuse` | 同 read-key observation 只算一次 | pass |
| QA-004 | F3-DISCOVERY-001 / review REV-003 | core-functional | dual-lane / fixed 800 cap 接线 | unit | `discovery-reservation-budget-independence` + `executor-dual-lane-wiring` | shared search maxHits=800；scope fold / legacy reservation | pass |
| QA-005 | F3-SCOPE-FOLD / LEGACY-POOL / POOL | core-functional | fold / legacy pool / pre-ranking | unit | `scope-pre-cap-fold` + `legacy-scope-policy-pool` + `pre-ranking-stable-pool` | exit 0 | pass |
| QA-006 | F3-SNAPSHOT / ABORT | core-functional | final purge；abort 保留已复核 | unit | `snapshot-coverage-truth-table` + `snapshot-mutation-purge` + `snapshot-failure-and-abort-purge` | changed purge；abort 非全量丢弃 | pass |
| QA-007 | F3-V1-MUTATION-001 | core-functional | mutation→partial precedence | unit + golden | `snapshot-v1-mutation-precedence` + `snapshot-mutation-golden` | partial/timeout；无 SNAPSHOT_CHANGED 外泄 | pass |
| QA-008 | F3-V1-001 | core-functional | snapshot ON 下 v1 parity | unit | `snapshot-v1-parity` | v1 deep-exact / 无公共字段漂移 | pass |
| QA-009 | design no-cutover | core-functional | production 无 v2 cutover | unit | `canonical-transport-reachability` + `canonical-package-declaration-boundary` + `canonical-real-shadow-no-cutover`（含 public-output no-cutover 相关断言） | production 无 shadow/composer 泄漏 | pass |
| QA-010 | DoD CMD-READER-REGRESSION / S1 | core-functional | reader / candidate 回归子集 | unit | repository-safety…candidate-permutation groups | exit 0 | pass |
| QA-011 | F3 trust/outcome/capability | supporting | trust finalizer / contribution / carrier / git / envelope | unit | trust-finalizer、outcome-contribution、producer-basis、language-carrier、scope-coverage、git-state、real-envelope | exit 0 | pass |
| QA-012 | F3-LARGE-001 / REV-007 | supporting | large synthetic / 5-run | golden | `large-repository-request-cache` | 本轮 decode count=unique files 通过；完整 5-run/ownership 仍弱 | pass（residual REV-007） |
| QA-013 | REV-009 | supporting | scope-coverage handcrafted proof | unit + residual | `scope-coverage-basis` | count/mismatch 通过；proof 签发偏弱 | pass（residual REV-009） |
| QA-014 | DoD CMD-BUILD / UNIT-ALL / GOLDEN-ALL / MCP | supporting | 全量构建与全测 | prior DoD | `request-snapshot-cache-dod-results.json` | core exit 0 已绿；本轮未重跑全量 | pass（prior evidence） |

## 3. Command Results

- `npm run typecheck` → exit 0：`tsc -p tsconfig.json --noEmit`
- `npm test -- --group request-snapshot-cache --case …（19 DoD cases + executor-dual-lane-wiring）` → exit 0：Test Files 12 passed；Tests **25 passed** | 276 skipped
- `npm test -- --group repository-safety --group reader-limits --group reader-failures --group evidence-merge --group direct-mapping-classifier --group candidate-truth-table --group candidate-discovery --group candidate-context --group candidate-classification --group candidate-budget --group candidate-permutation` → exit 0：Tests **86 passed** | 215 skipped
- `npm test -- --group canonical-locate-bridge --case canonical-transport-reachability --case canonical-package-declaration-boundary --case canonical-real-shadow-no-cutover` → exit 0：Tests **4 passed**（含 production no-cutover 根路径断言）
- `npm run test:golden -- --group request-snapshot-cache --case snapshot-mutation-golden --case large-repository-request-cache` → exit 0：Tests **2 passed**
- 未本轮重跑：`npm run build`、`npm test`（全量）、`test:golden --all`、`test:mcp --all` → 原因：`request-snapshot-cache-dod-results.json` 已记录上述 core 命令 exit 0（CMD-BUILD/UNIT-ALL/GOLDEN-ALL/MCP-ALL）；非阻塞；acceptance 可按需抽检
- 备注：`public-output-v2-no-cutover` 作为独立 case 名未登记（Unknown case）；no-cutover 证据由 bridge/public-output 相关断言覆盖

## 4. Scenario Results

- [x] QA-001 typecheck：pass
- [x] QA-002 single-decode / alias：pass
- [x] QA-003 observation reuse：pass
- [x] QA-004 dual-lane / 800 cap wiring：pass（`executor-dual-lane-wiring` 机械断言 lastMaxHits===800、scopeFold、legacy reservation）
- [x] QA-005 fold / legacy / pre-ranking：pass
- [x] QA-006 final purge / abort retain：pass
- [x] QA-007 mutation→partial：pass
- [x] QA-008 v1 parity（snapshot ON）：pass
- [x] QA-009 no cutover：pass
- [x] QA-010 reader regression subset：pass
- [x] QA-011 trust/outcome/capability seams：pass
- [x] QA-012 large synthetic：pass（完整 5-run/ownership → residual REV-007）
- [x] QA-013 scope-coverage：pass（handcrafted proof 强度 → residual REV-009）
- [x] QA-014 prior DoD build/full suite：pass（引用 dod-results，未本轮全量重跑）

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-007：`large-repository-request-cache` 证明 unique-file single-decode，但非 design 完整 5-run permutation + ownership inventory 对账；acceptance 可跟踪，不阻塞核心路径
- REV-009：`scope-coverage-basis` 使用手造 opaque token 绑定，count/mismatch 有覆盖，但非完整 trusted producer 签发强度
- Pre-F5 单 process / 前缀确定性双切片（非完整 F5 双 process）；临时 allow-all scope adapter 待 F7
- mutation×timeout 运行时组合矩阵偏窄（unit precedence + mutation golden 已过）
- 同 `dev/ino/size/mtimeMs` 静默改内容（design threat-model）
- 本轮未重跑 full `npm test` / Golden all / MCP all；implementation DoD 已绿

## 6. Cleanliness

- Debug output: pass（本轮命令输出无 feature 内临时 debug）
- Temporary TODO/FIXME/XXX: pass（未发现 F3 核心路径阻塞级污染）
- Commented-out code: pass
- Unused imports / dead code from this feature: pass（未做全仓 unused 扫描；无命令失败信号）
- Out-of-scope files: pass（QA 未改生产代码、未改 checklist checks、未写 acceptance）

## 7. Verdict

- Status: passed
- Next: `cs-feat` acceptance 阶段
- Blockers: none
