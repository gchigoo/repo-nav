---
doc_type: feature-qa
feature: 2026-07-24-input-abort-contract-v2
status: passed
runner_state: completed
runner_reason: ""
runner_id: independent-qa-agent-f6-input-abort-contract-v2-r3
qa_agent_id: independent-qa-agent-f6-input-abort-contract-v2-r3
tested: 2026-07-28
round: 3
---

# input-abort-contract-v2 QA 报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-design.md`（approved）
- Checklist: `input-abort-contract-v2-checklist.yaml`（S1–S5 `done`；C1–C53 仍 `pending`，本 QA 未翻转）
- Review: `input-abort-contract-v2-review.md`（`status=passed`，round=4，blocking=0）
- Prior QA: round 2 `passed`；本轮为验收前 must-run 刷新
- Scope allow: `input-abort-contract-v2-scope-allow.txt`
- Diff basis: 不改产品代码；仅重跑指定 must-run 并刷新本报告
- Feature type: mixed（input/abort latch + aggregator direct seam + v1 no-cutover / F8-only mount）
- Core evidence gate: 指定 must-run 全绿；DoD results 已 `status=passed`；review round 4 已 `passed`

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | DoD CMD-TYPECHECK | core-functional | 严格类型 | typecheck | `npm run typecheck` | exit 0 | pass |
| QA-002 | CMD-F6-UNIT | core-functional | F6 全组 Stable ID cases | unit | `npm test -- --group input-abort-contract-v2` | 21 passed | pass |
| QA-003 | CMD-PLATFORM | core-functional | F4 六格含 F6 三合同 | platform | `npm run test:platform` | exit 0；含 F6-INPUT/ABORT/LATCH | pass |
| QA-004 | CMD-DOCS | core-functional | executable docs | docs | `npm run test:docs` | Docs smoke passed | pass |
| QA-005 | CMD-GOLDEN-ALL | core-functional | 全量 golden | golden | `npm run test:golden -- --all` | 80 passed | pass |
| QA-006 | CMD-MCP-ALL | core-functional | 全量 MCP | mcp | `npm run test:mcp -- --all` | 40 passed | pass |

## 3. Command Results

- `npm run typecheck` → exit 0：`tsc -p tsconfig.json --noEmit`
- `npm test -- --group input-abort-contract-v2` → exit 0：Test Files 7 passed | 46 skipped；Tests **21 passed** | 341 skipped
- `npm run test:platform` → exit 0：`platform contracts passed: ... F6-ABORT-001, F6-INPUT-001, F6-LATCH-001`
- `npm run test:docs` → exit 0：Docs smoke passed
- `npm run test:golden -- --all` → exit 0：Test Files 17 passed；Tests **80 passed** | 1 skipped
- `npm run test:mcp -- --all` → exit 0：Test Files 10 passed；Tests **40 passed**

## 4. Scenario Results

- [x] QA-001 typecheck：pass
- [x] QA-002 F6 unit 全组 21 cases：pass
- [x] QA-003 platform（含 F6 三合同）：pass
- [x] QA-004 docs smoke：pass
- [x] QA-005 golden --all（80）：pass
- [x] QA-006 mcp --all（40）：pass

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- REV-003：question 全链路 metamorphic 仍偏 terms 层；plan/argv/selection/ranking/ID 未钉死
- REV-013：F6-ABORT / F6-LATCH platform case 行为覆盖偏软（登记绿；sibling unit 已证）
- F8-only：production real envelope mount 不属本项；F8 独占
- 远程六格同 revision F6 marker：若未归档则 deferred（本地 `test:platform` 已绿）
- REV-004/005 及 nits 沿用；不升 blocking

## 6. Cleanliness

- Debug output: pass
- Temporary TODO/FIXME/XXX: pass
- Commented-out code: pass
- Unused imports / dead code from this feature: pass
- Out-of-scope files: pass（QA 仅写本报告；未改生产代码、未改 checklist checks、未写 acceptance）

## 7. Verdict

- Status: passed
- Core fail count: 0
- Must-run：typecheck / F6 unit(21) / platform / docs / golden-all(80) / mcp-all(40) 全绿
- Review round 4 / DoD results：已 passed
- Residuals: REV-003 / REV-013 / F8-only mount / 远程六格 deferred
- Next: `cs-feat` accept（勿在本 QA 翻转 C* / 写 acceptance）
- Blockers: none

QA_VERDICT=passed
CORE_FAIL_COUNT=0
