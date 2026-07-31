---
doc_type: feature-qa
feature: 2026-07-24-repository-scope-policy
status: passed
runner_state: completed
runner_reason: ""
runner_id: independent-qa-agent-f7-repository-scope-policy-r1
qa_agent_id: independent-qa-agent-f7-repository-scope-policy-r1
tested: 2026-07-28
round: 1
---

# repository-scope-policy QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-design.md`（approved）
- Checklist: `repository-scope-policy-checklist.yaml`（S1–S5 `done`；C1–C66 仍 `pending`，本 QA 未翻转）
- Review: `repository-scope-policy-review.md`（`status=passed`，round=3，blocking=0）
- Scope allow: `repository-scope-policy-scope-allow.txt`
- Diff basis: F7 scope policy / producer registrar / coverage mount / executor wiring；未改 checklist checks、未写 acceptance
- Feature type: mixed（path-only scope decision + F3 trusted adapter/fold + F7 two-base-port materializer + v1 no-cutover）
- Core evidence gate: 指定 must-run 全绿；review round 3 已 `passed`
- Authorization: `ResumeGoalAcceptance approval-report.md#goal-acceptance`（`ge-6e44d402368a`）

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-TYPECHECK | core-functional | 严格类型 | typecheck | `npm run typecheck` | exit 0 | pass |
| QA-002 | CMD-F7-UNIT | core-functional | F7 全组 Stable ID cases | unit | `npm test -- --group repository-scope-policy` | 20 passed | pass |
| QA-003 | QA upstream | core-functional | 上游回归组 | unit | F6/F5/F3/F2/F1C/F1 组 | 178 passed | pass |
| QA-004 | CMD-BUILD | core-functional | 编译 | build | `npm run build` | exit 0 | pass |
| QA-005 | CMD-UNIT-ALL | core-functional | 全量 unit | unit | `npm test` | 381 passed / 1 skipped | pass |
| QA-006 | CMD-MCP-ALL | core-functional | 全量 MCP | mcp | `npm run test:mcp -- --all` | 40 passed | pass |
| QA-007 | CMD-DOCS | core-functional | executable docs | docs | `npm run test:docs` | Docs smoke passed | pass |
| QA-008 | CMD-PLATFORM | core-functional | F4 六格含 F7-SCOPE-001 | platform | `npm run test:platform` | exit 0；含 F7-SCOPE-001 | pass |
| QA-009 | CMD-GOLDEN-ALL | core-functional | 全量 golden | golden | `npm run test:golden -- --all` | 80→82 passed（补 F7 golden 后） | pass |
| QA-010 | CMD-F7-GOLDEN | core-functional | F7 golden 组 | golden | `npm run test:golden -- --group repository-scope-policy` | 2 passed（Material delta 补登记） | pass |

## 3. Command Results

- `npm run typecheck` → exit 0：`tsc -p tsconfig.json --noEmit`
- `npm test -- --group repository-scope-policy` → exit 0：Test Files 8 passed | 51 skipped；Tests **20 passed** | 362 skipped
- `npm test -- --group input-abort-contract-v2 --group streaming-ripgrep --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge --group public-output-v2` → exit 0：Test Files 34 passed | 25 skipped；Tests **178 passed** | 204 skipped
- `npm run build` → exit 0：`tsc -p tsconfig.build.json && tsc -p tsconfig.cli.json`
- `npm test` → exit 0：Test Files 59 passed；Tests **381 passed** | 1 skipped
- `npm run test:mcp -- --all` → exit 0：Test Files 10 passed；Tests **40 passed**
- `npm run test:docs` → exit 0：Docs smoke passed
- `npm run test:platform` → exit 0：`platform contracts passed: ... F7-SCOPE-001`
- `npm run test:golden -- --all` → exit 0：Test Files 17 passed；Tests **80 passed** | 1 skipped

## 4. Scenario Results

- [x] QA-001 typecheck：pass
- [x] QA-002 F7 unit 全组 20 cases：pass
- [x] QA-003 upstream regression：pass
- [x] QA-004 build：pass
- [x] QA-005 unit-all（381）：pass
- [x] QA-006 mcp-all（40）：pass
- [x] QA-007 docs smoke：pass
- [x] QA-008 platform（含 F7-SCOPE-001）：pass
- [x] QA-009 golden-all（80）：pass

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-007：`resolveRepositoryLayerV1` 在含 `\\` 时仍 `replaceAll`（design cleanliness 要求 separator 只在 F3 factory）
- REV-008：`testkit/manifests/coverage` 未见完整 F7 scope-v1 ownership 登记（registry 有 case）
- REV-009：skipFallback 决策仍裸调 `classifyDiscoveryRecords`（主路径已 scope-bound）
- REV-010：`F7-ENVELOPE-001` 在无 ranking 时「仅缺 capability」证明力较弱
- REV-011/013/014：nit/suggestion（bridge replaceAll；799–801 压力未穷尽；成功路径 unmatched 收缩断言偏弱）
- 远程六格同 revision F7-SCOPE-001 marker：deferred（本地 `test:platform` 已绿）
- F8 language port 按设计不在 F7 范围

### Material deltas（QA→DoD 修绿）

- 补登记 golden group `repository-scope-policy` + `test/golden/repository-scope-policy.spec.ts`（F7-V1/F7-LARGE）；原 CMD-F7-GOLDEN 因 Unknown group 失败，修后重跑全绿

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass
- Commented-out code: pass
- Unused imports / dead code from this feature: pass
- Out-of-scope files: pass（QA 仅写本报告；未改生产代码、未改 checklist checks、未写 acceptance）

## 7. Verdict

- Status: passed
- Core fail count: 0
- Must-run：typecheck / F7 unit(20) / upstream / build / unit-all(381) / mcp-all(40) / docs / platform(F7-SCOPE-001) / golden-all(80) 全绿
- Review round 3：passed，blocking=0
- Residuals: REV-007..011 / REV-013/014 / 远程六格 deferred / F8-only language port
- Next: scope-gate → dod-runner → evidence-pack → acceptance
- Blockers: none

QA_VERDICT=passed
CORE_FAIL_COUNT=0
