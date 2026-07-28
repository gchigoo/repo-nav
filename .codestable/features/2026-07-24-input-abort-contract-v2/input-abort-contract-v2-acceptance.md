---
doc_type: feature-acceptance
feature: 2026-07-24-input-abort-contract-v2
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-28
round: 1
---

# input-abort-contract-v2 验收报告

> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`（confirmation `ge-6e44d402368a`）

## 1. 契约核对
- [x] raw guard：descriptor 先读 root/terms/negativeTerms/anchors/layers 长度；layers 7/8 在 poison element 前拒绝；再接 F1B compact JSON + strict Zod
- [x] filesystem path 与 semantic 归一化分离；`question` optional 且不进 plan/rank/ID；MCP/CLI `required` 仅 `repoPath`+`terms`
- [x] closeable abort coordinator + finalization latch：close 前 first-writer；close 后 abort 不改当前 response
- [x] `RequestOutcomeAggregatorV2` direct seam：接 F5 no-hits telemetry / F2 verified core / F3 snapshot；production F2 core accessor importer=0
- [x] F8-only production mount；F6 不声称 real envelope；v1 exact projector + shadow fail-closed

## 2. 场景证据
| 场景 | 结果 | 证据 |
|---|---|---|
| raw / path / semantic / question | passed | F6-INPUT/RAW/QUESTION/FILE + CLI/MCP |
| abort first-writer + latch | passed | F6-ABORT/LATCH unit；`test:platform` 登记 |
| aggregator / status / next-action | passed | request-outcome-aggregator-v2 组 |
| v1 shadow fail-closed + LARGE | passed | golden v1-compatibility + large permutation |
| platform / docs / golden-all / mcp-all | passed | QA round 3 must-run |
| DoD / gate / evidence pack | passed | dod/gate/evidence-pack-results status=passed |

## 3. Checklist / Gates
S1–S5 done；C1–C53 passed；scope/dod/evidence-pack passed；review passed（round 4，blocking 0）；QA passed（round 3）。

## 4. 回写
- `repo-nav-public-beta-items.yaml` → `input-abort-contract-v2` done
- architecture：`system-repo-nav-foundation.md` 已记 raw guard、abort latch、`RequestOutcomeAggregatorV2` direct seam、F8-only mount、importer=0
- goal-state index → 9（repository-scope-policy）；`goal-features/input-abort-contract-v2.md` → accepted

## 5. Residual
- REV-003：question metamorphic 深度仍偏 terms 层
- REV-013：F6-ABORT / F6-LATCH platform case 行为覆盖偏软（sibling unit 已证）
- F8 独占 production real envelope mount
- 远程六格同 revision F6 marker：若未归档则 deferred（本地 `test:platform` 已绿）

## Verdict
Acceptance **passed**。
