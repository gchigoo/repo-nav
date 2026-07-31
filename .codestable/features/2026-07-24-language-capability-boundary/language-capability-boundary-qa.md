---
doc_type: feature-qa
feature: 2026-07-24-language-capability-boundary
status: passed
runner_state: completed
runner_reason: ""
runner_id: ""
tested: 2026-07-28
round: 1
---

# language-capability-boundary QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-language-capability-boundary/language-capability-boundary-design.md`（approved）
- Checklist: `language-capability-boundary-checklist.yaml`（S1–S5 `done`；C1–C57 仍 `pending`，本 QA 未翻转）
- Review: `language-capability-boundary-review.md`（`status=passed`，round=3，blocking=0）
- Scope allow: `language-capability-boundary-scope-allow.txt`
- Evidence pack / gate / DoD：本轮 QA 前尚未落盘；通过后进 Phase 2
- Diff basis: F8 language/**、accepted shadow orchestrator、executor/coverage mount、F6 四元组、classifier/candidate move-only、F8 unit/golden/platform
- Feature type: mixed（language adapters + pre-budget count + complete real-v2 shadow；production 仍 v1）
- Core evidence gate: 指定 must-run 全绿；review round 3 已 `passed`
- Authorization: `ResumeGoalAcceptance approval-report.md#goal-acceptance`（`ge-6e44d402368a`）

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | CMD-TYPECHECK | core-functional | 严格类型 | typecheck | `npm run typecheck` | exit 0 | pass |
| QA-002 | CMD-F8-UNIT | core-functional | F8 Stable ID cases | unit | `npm test -- --group language-capability-boundary` | 15 passed | pass |
| QA-003 | QA upstream | core-functional | 上游回归组 | unit | F7/F6/F5/F3/F2/F1C/F1 组 | 198 passed | pass |
| QA-004 | CMD-BUILD | core-functional | 编译 | build | `npm run build` | exit 0 | pass |
| QA-005 | CMD-F8-GOLDEN | core-functional | F8 golden 组 | golden | `npm run test:golden -- --group language-capability-boundary` | 2 passed | pass |
| QA-006 | CMD-UNIT-ALL | core-functional | 全量 unit | unit | `npm test` | 396 passed / 1 skipped | pass |
| QA-007 | CMD-MCP-ALL | core-functional | 全量 MCP | mcp | `npm run test:mcp -- --all` | 40 passed | pass |
| QA-008 | CMD-DOCS | core-functional | executable docs | docs | `npm run test:docs` | Docs smoke passed | pass |
| QA-009 | CMD-PLATFORM | core-functional | F4 六格含 F8-LANG-001 | platform | `npm run test:platform` | exit 0；含 F8-LANG-001 | pass |
| QA-010 | CMD-GOLDEN-ALL | core-functional | 全量 golden | golden | `npm run test:golden -- --all` | 84 passed / 1 skipped | pass |

## 3. Command Results

- `npm run typecheck` → exit 0：`tsc -p tsconfig.json --noEmit`
- `npm test -- --group language-capability-boundary` → exit 0：Test Files 8 passed | 56 skipped；Tests **15 passed** | 382 skipped
- `npm test -- --group repository-scope-policy --group input-abort-contract-v2 --group streaming-ripgrep --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge --group public-output-v2` → exit 0：Test Files 42 passed | 22 skipped；Tests **198 passed** | 199 skipped
- `npm run build` → exit 0：`tsc -p tsconfig.build.json && tsc -p tsconfig.cli.json`
- `npm run test:golden -- --group language-capability-boundary` → exit 0：Test Files 2 passed | 17 skipped；Tests **2 passed** | 83 skipped
- `npm test` → exit 0：Test Files 64 passed；Tests **396 passed** | 1 skipped
- `npm run test:mcp -- --all` → exit 0：Test Files 10 passed；Tests **40 passed**
- `npm run test:docs` → exit 0：Docs smoke passed
- `npm run test:platform` → exit 0：`platform contracts passed: ... F8-LANG-001`
- `npm run test:golden -- --all` → exit 0：Test Files 19 passed；Tests **84 passed** | 1 skipped

## 4. Scenario Results

- [x] QA-001 typecheck：pass
- [x] QA-002 F8 unit 全组 15 cases：pass
- [x] QA-003 upstream regression：pass
- [x] QA-004 build：pass
- [x] QA-005 F8 golden：pass
- [x] QA-006 unit-all（396）：pass
- [x] QA-007 mcp-all（40）：pass
- [x] QA-008 docs smoke：pass
- [x] QA-009 platform（含 F8-LANG-001）：pass
- [x] QA-010 golden-all（84）：pass

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- empty-ranking seal：`void input.rankingOutcome` 后签发空 ranking；count 不依赖 ranking retained；language→ranking ledger 填满前保持 vacuous pass（不升 blocking）
- harness-only aggregation bundle：`registerAcceptedCompleteRealAggregationBundleV2` 仍主要测试/probe 调用
- REV-005..014（review important/nit）：零 capability harness opaque token、candidate-policy F8-MOVE mask、ADAPTER-PRODUCT 全表、COUNT 非零 production mount 断言偏弱、REAL-SHADOW 成功 counters、LANG fixture boolean、`materializeLanguageCapabilityRecordV2` 未挂生产、test helper 作 production view
- 远程六格同 revision F8-LANG-001 marker：deferred（本地 `test:platform` 已绿）
- F9 cutover/publish：需独立 owner 授权，本 feature 不启动

### Material deltas（QA 修绿）

- `ecmascript-lexical-kernel-v2.ts`：`startsRegexLiteral` 前驱字符类误写成含 `+-~` range，导致 `obj.return / ...` 被当 regex 并吞掉后续 assignment；已恢复 legacy `/[[{(=,:;!?&|]/u` deep-exact（F8-MOVE）

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass
- Commented-out code: pass
- Unused imports / dead code from this feature: pass
- Out-of-scope files: pass（QA 仅修 move-only 回归 + 本报告；未改 checklist checks、未写 acceptance）

## 7. Verdict

- Status: passed
- Core fail count: 0
- Must-run：typecheck / F8 unit(15) / upstream(198) / build / F8 golden(2) / unit-all(396) / mcp-all(40) / docs / platform(F8-LANG-001) / golden-all(84) 全绿
- Review round 3：passed，blocking=0
- Residuals: empty-ranking seal / aggregation harness / REV-005..014 / 远程六格 deferred / F9 另授
- Next: scope-gate → dod-runner → evidence-pack → acceptance
- Blockers: none

QA_VERDICT=passed
CORE_FAIL_COUNT=0
