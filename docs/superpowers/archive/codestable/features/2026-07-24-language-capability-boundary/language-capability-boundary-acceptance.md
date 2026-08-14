---
doc_type: feature-acceptance
feature: 2026-07-24-language-capability-boundary
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-28
round: 1
---

# language-capability-boundary 验收报告

> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`（confirmation `ge-6e44d402368a`）

## 1. 契约核对
- [x] extension registry + TS/JS/SQL + fallback adapters；无 path/location/provenance 选择语言
- [x] F3 registered consumer / neutral carrier / F8 runtime provenance；one-time lexical facts
- [x] F7 child admission language port → three-port seal/arbitration → supported materializer 或 post-arbitration fallback
- [x] pre-budget `unsupportedLanguageHits` + retained-decision seal → capability contribution；F6 四元组 `[materialization,snapshot,scope,capability]`
- [x] EvidenceModule 唯一 non-exported accepted complete-real shadow orchestrator；production 仍 v1 projector；无 F9 cutover

## 2. 场景证据
| 场景 | 结果 | 证据 |
|---|---|---|
| MOVE/EXT/TS/JS/LEXICAL/SQL/FALLBACK | passed | F8 unit 15 |
| SCOPE/COUNT/CONTRIBUTION/TRUST/REAL-SHADOW | passed | integration + execution/di |
| V1 / LARGE | passed | golden F8 group + golden-all |
| platform F8-LANG-001 | passed | `test:platform` |
| unit-all / mcp-all / docs / golden-all | passed | QA + DoD |
| DoD / gate / evidence pack | passed | status=passed |

## 3. Checklist / Gates
S1–S5 done；C1–C57 passed；scope/dod/evidence-pack passed；review passed（round 3，blocking 0）；QA passed（round 1）。

## 4. 回写
- `repo-nav-public-beta-items.yaml` → `language-capability-boundary` done
- architecture：`system-repo-nav-foundation.md` 记 F8 language adapters / coverage mount / accepted shadow / v1 no-cutover
- public-contract Language capability 节已与 design 对齐（本轮无契约 delta）
- goal-state index → 11（public-beta-release）；`goal-features/language-capability-boundary.md` → accepted

## 5. Residual
- empty-ranking seal：language→ranking ledger 填满前 vacuous pass
- aggregation bundle harness：`registerAcceptedCompleteRealAggregationBundleV2` 仍主要测试/probe
- REV-005..014 important/nit（harness 零 capability、COUNT/REAL-SHADOW/LANG 断言强度、`materializeLanguageCapabilityRecordV2` 未挂生产等）
- 远程六格同 revision F8-LANG-001 marker：deferred（本地 `test:platform` 已绿）
- F9 cutover/publish：需独立 owner 授权；本验收不启动 F9 实现

## 6. Material delta（QA）
- 恢复 `startsRegexLiteral` legacy 前驱字符类（去掉误加 `+-~` range），保证 F8-MOVE deep-exact

## Verdict
Acceptance **passed**。下一 feature index=11 `public-beta-release`（F9）；不自动 cutover/publish。
