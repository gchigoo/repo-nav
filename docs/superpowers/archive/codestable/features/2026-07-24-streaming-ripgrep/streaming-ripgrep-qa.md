---
doc_type: feature-qa
feature: 2026-07-24-streaming-ripgrep
status: passed
runner_state: completed
runner_reason: ""
runner_id: independent-qa-agent-f5-streaming-ripgrep-r1
qa_agent_id: independent-qa-agent-f5-streaming-ripgrep-r1
tested: 2026-07-28
round: 1
---

# streaming-ripgrep QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-design.md`（approved）
- Checklist: `streaming-ripgrep-checklist.yaml`（S1–S5 `done`；C1–C65 仍 `pending`，本 QA 未翻转）
- Review: `streaming-ripgrep-review.md`（`status=passed`，round=2，blocking=0；`reviewer_id=independent-task-agent-f5-streaming-ripgrep-r2`）
- Scope allow: `streaming-ripgrep-scope-allow.txt`（process / ripgrep-stream / ripgrep-backend / F3 handoff / unit+golden / fixtures / registry）
- Diff basis: `src/process/**`、`src/repository/ripgrep-stream/**`、`ripgrep-backend.searchViews`、`pre-f5-multi-view-search-v2` / `canonical-locate-executor-v2` F3 四参数接线、`contracts/v2/backend-execution-outcome-v2`、F5 unit/golden；本 verdict 只覆盖 F5 可归因路径
- Baseline dirty files: 同 worktree 内其他 feature、`dist/`、cross-platform-ci 等 ambient；未归因到本 feature 的路径不进本报告结论
- Feature type: mixed（safe-process kernel + ripgrep streaming JSON + BackendExecutionContextV2 / F3 handoff + dormant outcome v2 schema）
- Core evidence gate: 生产 `searchViews` 走 `startStreaming` + ripgrep-stream（非 buffered `search` 桥）；telemetry-only → `completeSafeHits=[]`；Stable ID 行为断言（无 `expect(true)` stub）；package 不公开 outcome v2；核心命令 exit 0

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-TYPECHECK | core-functional | 严格类型 | typecheck | `npm run typecheck` | exit 0 | pass |
| QA-002 | CMD-F5-UNIT / design §3 | core-functional | F5 全组 Stable ID cases | unit | `npm test -- --group streaming-ripgrep` | 22 passed | pass |
| QA-003 | process / ripgrep adjacent | core-functional | process contract/isolation/cleanup + ripgrep-backend | unit | `npm test -- --group process-contract --group process-output-isolation --group process-cleanup --group ripgrep-backend` | exit 0 | pass |
| QA-004 | F1C/F2/F3 邻接 | core-functional | snapshot / ranking / locate-bridge 回归 | unit | `npm test -- --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge` | exit 0 | pass |
| QA-005 | DoD CMD-BUILD | core-functional | 生产构建 | build | `npm run build` | exit 0 | pass |
| QA-006 | CMD-F5-GOLDEN / F5-LARGE-001 | core-functional | large streaming 有界五次一致 | golden | `npm run test:golden -- --group streaming-ripgrep --case large-streaming-ripgrep` | 1 passed | pass |
| QA-007 | S5 / review QA focus | core-functional | 全量 unit | unit | `npm test` | 337 passed / 1 skipped | pass |
| QA-008 | review adversarial | core-functional | 生产 searchViews streaming 接线 | code spot-check | `ripgrep-backend.searchViews` import/调用 | `startStreaming` + `RipgrepJsonLineConsumerV2` + `MultiViewAccumulatorV2`；无 `this.search()` | pass |
| QA-009 | F5-ELIGIBILITY-001 | core-functional | telemetry-only 零 F3 membership | unit + code | eligibility + early-stop `completeSafeHits` | `[]` 且 retainedHits>0 | pass |
| QA-010 | REV-003 closure | core-functional | Stable ID 无 stub | code spot-check | ELIGIBILITY/EXIT/TRACE/START-AUTHORITY | 无 `expect(true)`；行为断言可证伪 | pass |
| QA-011 | package no-cutover | core-functional | 不公开 outcome v2 | code spot-check | `src/index.ts` / `contracts/index.ts` | 无 outcome v2 re-export | pass |

## 3. Command Results

- `npm run typecheck` → exit 0：`tsc -p tsconfig.json --noEmit`
- `npm test -- --group streaming-ripgrep` → exit 0：Test Files 8 passed | 40 skipped；Tests **22 passed** | 316 skipped
- `npm test -- --group process-contract --group process-output-isolation --group process-cleanup --group ripgrep-backend` → exit 0：Tests **18 passed** | 320 skipped
- `npm test -- --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge` → exit 0：Tests **61 passed** | 277 skipped
- `npm run build` → exit 0：`tsc -p tsconfig.build.json && tsc -p tsconfig.cli.json`
- `npm run test:golden -- --group streaming-ripgrep --case large-streaming-ripgrep` → exit 0：Tests **1 passed** | 78 skipped
- `npm test`（全量）→ exit 0：Test Files 48 passed；Tests **337 passed** | 1 skipped（约 19s，满足 S5 全量 unit）

## 4. Scenario Results

- [x] QA-001 typecheck：pass
- [x] QA-002 F5 unit 全组 22 cases：pass
- [x] QA-003 process + ripgrep-backend 邻接组：pass
- [x] QA-004 F1C/F2/F3 邻接组：pass
- [x] QA-005 build：pass
- [x] QA-006 Golden large-streaming-ripgrep：pass
- [x] QA-007 全量 `npm test`：pass
- [x] QA-008 生产 `searchViews` = availability → `startStreaming`（`kind:'ripgrep-group'`）+ JSON consumer + multi-view accumulator；文件内无 `this.search()` / buffered bridge：pass
- [x] QA-009 telemetry-only / early-stop → `completeSafeHits=[]`（`expandedComplete` 门控 + F5-ELIGIBILITY-001 行为断言）：pass
- [x] QA-010 F5-ELIGIBILITY/EXIT/TRACE/START-AUTHORITY 无 `expect(true)` stub；fixture `toContain` 非唯一证明：pass
- [x] QA-011 package / contracts barrel 不导出 `backend-execution-outcome-v2`：pass

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-004：CodeGraph 与 Ripgrep v1 `probe`/`search` 仍 bare `processRunner.run`；本轮 F5 multi-view 生产路径已绿，acceptance 需确认 CodeGraph 范围或后续接线
- REV-005：`createBackendExecutionContextV2` 忽略 `_preparationPort`；availability cwd identity 敌意语料仍弱
- REV-006（ACT-ARCH-UPDATE）：`.codestable/architecture/system-repo-nav-foundation.md` 未见 kernel / multi-view / outcome / F6 no-hits seam 回写；acceptance 前须 `cs-arch update`，否则 DoD-ACCEPT 失败
- REV-007：`F5-V1-001` 仍偏弱（`V1_PARITY_GOLDEN_CASE_IDS_V2.length > 0`），未跑非边界 deep-exact 对照
- REV-008：无 seed groups 时 `bindSearchToVersion=true` 边缘路径；有 `ripgrep-group` 时 reducer 已优先 group
- REV-009：`F5-CODEGRAPH-001` 主要覆盖 `not-observed`；started receipt 全矩阵可提高 acceptance 可信度
- F5-LARGE-001 Golden 为 synthetic consumer 五次有界一致，非真实大库 `rg` end-to-end（review 已提示）
- 本轮未重跑：`test:golden --all`、`test:mcp --all`、`test:docs`、`test:platform`、DoD contract gate → 记 residual；核心 CMD 与全量 unit 已本轮 exit 0

## 6. Cleanliness

- Debug output: pass（本轮命令输出无 feature 内临时 debug）
- Temporary TODO/FIXME/XXX: pass（未发现 F5 核心路径阻塞级污染）
- Commented-out code: pass
- Unused imports / dead code from this feature: pass（未做全仓 unused 扫描；无命令失败信号）
- Out-of-scope files: pass（QA 仅写本报告；未改生产代码、未改 checklist checks、未写 acceptance）

## 7. Verdict

- Status: passed
- Residuals: REV-004（CodeGraph/v1 bare runner）、REV-005（preparation port）、REV-006（architecture writeback → accept）、REV-007/008/009（V1/空 groups/CodeGraph receipt 深度）、LARGE 合成深度、S5 非核心全套（golden-all/mcp/docs/platform）未本轮重跑
- Next: `cs-feat` acceptance 阶段
- Blockers: none

QA_VERDICT=passed
