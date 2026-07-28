---
doc_type: feature-acceptance
feature: 2026-07-24-relevance-ranking-budget
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-28
round: 1
---

# relevance-ranking-budget 验收报告

> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`

## 1. 契约核对
- [x] `DiscoveryHitSelectorV2` 在 verify/read 前消费 F3 opaque folded view 并 bind ticket/proof
- [x] `EvidenceRankerV2` 在 final purge 后对 trusted pool 做 structured public-safe ordering / MatchPriority / round-robin / unsatisfied ledger
- [x] opaque `EvidenceRankingOutcomeV2`；F6 fragment-budget / F8 retained-ref accessors；production importer count=0
- [x] F2 stages `createSource`/`materialize`（无 aggregate）接 F1 `materializePublicEvidenceV2` + F1C registrars；strict schema；direct harness only
- [x] executor 不 import `public-output`/F2 stages；package 不导出 F2 stages；F9 前无 v2 cutover

## 2. 场景证据
| 场景 | 结果 | 证据 |
|---|---|---|
| anchor intent / discovery reservation | passed | F2 unit ANCHOR/DISCOVERY/BUDGET |
| MatchPriority / satisfaction / safe ordering | passed | TIER/SAT/SAFEKEY（含 source vector inequality） |
| ledger / permutation / round-robin | passed | LEDGER/PERM/RR + golden |
| rank() + createSource→materialize | passed | ENVELOPE 真实 F3 pool harness |
| trust / no-cutover / importer=0 | passed | TRUST/V1 + public-output no-cutover + root scan |
| DoD full suite | passed | dod-results core exit 0 |

## 3. Checklist / Gates
S1–S5 done；C1–C66 passed；scope/dod/evidence-pack passed；review passed（round 2，blocking 0）；QA passed。

## 4. 回写
- `repo-nav-public-beta-items.yaml` → `relevance-ranking-budget` done
- architecture：`system-repo-nav-foundation.md` 已记 selector/ranker/stages/materializer 与 executor 接线顺序
- goal-state index → 7（streaming-ripgrep）

## 5. Residual
- REV-006 design §3.2 owner inventory / Golden 深度漂移（important）
- REV-007 separator key encoding 形态（important）
- Pre-F5 单 process 双切片；完整 F5/F6/F8 属后续

## Verdict
Acceptance **passed**。
