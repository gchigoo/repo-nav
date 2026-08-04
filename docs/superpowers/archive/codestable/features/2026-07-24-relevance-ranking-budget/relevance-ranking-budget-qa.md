---
doc_type: feature-qa
feature: 2026-07-24-relevance-ranking-budget
status: passed
runner_state: completed
runner_reason: ""
runner_id: independent-qa-agent-f2-relevance-ranking-budget-r1
qa_agent_id: independent-qa-agent-f2-relevance-ranking-budget-r1
tested: 2026-07-28
round: 1
---

# relevance-ranking-budget QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-relevance-ranking-budget/relevance-ranking-budget-design.md`（approved）
- Checklist: `relevance-ranking-budget-checklist.yaml`（S1–S5 `done`；C1–C66 仍 `pending`，本 QA 未翻转）
- Review: `relevance-ranking-budget-review.md`（`status=passed`，round=2，blocking=0；`reviewer_id=independent-task-agent-f2-relevance-ranking-budget-r3`）
- Evidence pack / gate / DoD: `implementation.before_review` 均为 `passed`（CMD-DOCTOR non-core warning）
- Diff basis: `src/evidence/ranking/**`、F2 stages / materialized-evidence-core、executor pre-read selector+bind、unit/golden / runner-registry / no-cutover inventory；本 verdict 只覆盖 F2 可归因路径
- Baseline dirty files: 同 worktree 内其他 feature、`dist/`、cross-platform-ci 等 ambient；未归因到本 feature 的路径不进本报告结论
- Feature type: mixed（dormant v2 ranking/budget + materialization stages + no-cutover / trust 约束）
- Core evidence gate: `EvidenceRankerV2.rank` 与 `createSource`→`materialize` 行为链、结构化 ordering equality（含 operation/source）、executor read 前 discovery selection、production no-cutover；REV-005/006/007 记 residual 不阻塞

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-TYPECHECK | core-functional | 严格类型 | typecheck | `npm run typecheck` | exit 0 | pass |
| QA-002 | CMD-F2-UNIT / design §3 | core-functional | F2 全组 15 cases | unit | `npm test -- --group relevance-ranking-budget` | 15 passed | pass |
| QA-003 | F2-ENVELOPE / SOURCE / MATERIALIZATION | core-functional | `rank()` + `createSource`→`materialize` 行为链；错绑 fail-closed | unit | `ranking-real-envelope` + `public-materialization-*`（含于 15） | 真实调用非 stub | pass |
| QA-004 | F2-SAFEKEY / F2-PERM | core-functional | 结构化 ordering equality（operation/source） | unit | `public-safe-ranking-order` + envelope SAFEKEY 断言 | distinct vector 不合组 | pass |
| QA-005 | F2-DISCOVERY / review REV-004 | core-functional | executor pre-read select→bind；复用 bound selection | unit + review closure | `discovery-anchor-file-reservation` + executor 接线（DoD/review） | read 前真实 folded view | pass |
| QA-006 | F2-V1 / no-cutover | core-functional | production 无 v2 cutover / stages 不导出 | unit | `v1-no-cutover` + `no-cutover-import-inventory` | importer=0；package 不可达 | pass |
| QA-007 | CMD-F2-GOLDEN | supporting | Golden 三案 | golden | `npm run test:golden -- --group relevance-ranking-budget` | 3 passed | pass |
| QA-008 | REV-005/006/007 | supporting | arch 回写 / §3.2 inventory / 分隔符编码 | residual | review important | 不阻塞本轮 | pass（residual） |
| QA-009 | DoD CMD-BUILD / UNIT-ALL / GOLDEN-ALL / MCP / F3 / F1C / PUBLIC-V2 | supporting | 全量构建与邻接全测 | prior DoD | `relevance-ranking-budget-dod-results.json` | core exit 0 已绿；本轮未重跑全量 | pass（prior evidence） |

## 3. Command Results

- `npm run typecheck` → exit 0：`tsc -p tsconfig.json --noEmit`
- `npm test -- --group relevance-ranking-budget` → exit 0：Test Files 1 passed | 41 skipped；Tests **15 passed** | 301 skipped（含 `ranks via EvidenceRankerV2.rank and runs createSource→materialize chain`、`orders by structured key and treats operation/source vectors as equality fields`、`does not export F2 stages from package root`）
- `npm run test:golden -- --group relevance-ranking-budget` → exit 0：Test Files 1 passed | 14 skipped；Tests **3 passed** | 75 skipped
- `npm test -- --group public-output-v2 --case no-cutover-import-inventory` → exit 0：Tests **3 passed** | 313 skipped（package/engine/MCP/CLI 不可达 dormant v2）
- 未本轮重跑：`npm run build`、`npm test`（全量）、`test:golden --all`、`test:mcp --all`、CMD-F3/F1C/PUBLIC-V2/PACKAGE-NOCUTOVER → 原因：`relevance-ranking-budget-dod-results.json`（stage=`implementation.before_review`，`status=passed`）已记录上述 core 命令 exit 0；CMD-DOCTOR 非 core warning（ambient/历史 P1）已解释；acceptance 可按需抽检

## 4. Scenario Results

- [x] QA-001 typecheck：pass
- [x] QA-002 F2 unit 全组 15 cases：pass
- [x] QA-003 `EvidenceRankerV2.rank` + `createSource`→`materialize`（含 execution 错绑 fail-closed / poison shallow）：pass
- [x] QA-004 结构化 ordering equality（operation/source 参与 `orderingKeysEqualV2`）：pass
- [x] QA-005 discovery pre-read selection（selector 无 I/O；executor select→bind 复用，review round 2 已闭合）：pass
- [x] QA-006 no-cutover / package stages 不导出 / production importer root scan=0：pass
- [x] QA-007 Golden 三案：pass（helper 级深度 → residual REV-006）
- [x] QA-008 review important 转入 residual：pass
- [x] QA-009 prior DoD build/full suite：pass（引用 dod-results，未本轮全量重跑）

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-005（ACT-ARCH-UPDATE）：`.codestable/architecture/system-repo-nav-foundation.md` 仍无 EvidenceRanker / DiscoveryHitSelector / ranking outcome 回写；acceptance 前须 `cs-arch update`，否则 DoD-ACCEPT 失败
- REV-006：design §3.2 owner inventory 与落地合并进单 spec 仍有漂移；Golden 三案偏 comparator/round-robin helper，未用 repository fixture 跑完整 `rank` + ledger/limits truth；acceptance 对齐 inventory 或修订 design §3.2
- REV-007：anchor comparison key 仍 `join(':')`（含 length+hex）；selector 等价类仍 `\u0001` join，与 KD1/KD6「禁止分隔符拼接作身份」形态不完全一致；建议无歧义字节结构编码 + 负例（非本轮阻塞）
- early abort/timeout 无 `discoverySelection` 时无 ranking owner → 与 F2 shadow missing-first 语义一致，生产 real shadow 缺 scope/capability 时 callback/registrar 全 0 未由 ENVELOPE 完整证明
- CMD-DOCTOR non-core warning（历史 feature review / OCR unconfigured）不阻塞
- 本轮未重跑 full `npm test` / Golden all / MCP all；implementation DoD 已绿

## 6. Cleanliness

- Debug output: pass（本轮命令输出无 feature 内临时 debug）
- Temporary TODO/FIXME/XXX: pass（未发现 F2 核心路径阻塞级污染）
- Commented-out code: pass
- Unused imports / dead code from this feature: pass（未做全仓 unused 扫描；无命令失败信号）
- Out-of-scope files: pass（QA 仅写本报告；未改生产代码、未改 checklist checks、未写 acceptance）

## 7. Verdict

- Status: passed
- Residuals: REV-005（architecture writeback → accept）、REV-006（§3.2 inventory / Golden 深度）、REV-007（separator key encoding）
- Next: `cs-feat` acceptance 阶段
- Blockers: none

QA_VERDICT=passed
