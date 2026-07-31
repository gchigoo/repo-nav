---
doc_type: feature-acceptance
feature: 2026-07-24-repository-scope-policy
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-28
round: 1
---

# repository-scope-policy 验收报告

> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`（confirmation `ge-6e44d402368a`）

## 1. 契约核对
- [x] path-only policy：test > docs > longest explicit prefix > leftmost ordinary > unknown；ASCII lowercase；separator 由 F3 flavor 主导
- [x] F3 trusted path-only adapter + pre-cap fold（fixed 800）+ opaque selector；legacy / expanded 双 lane
- [x] F7 two-base-port registrar（direct + candidate）+ complete-set seal + cross-port arbitration materializer；F8 child admission staging only
- [x] ScopeCoverageFacts / contribution 经 fixed-order accessors；F6 contribution tuple exact materialization/snapshot/scope；无 future index 3
- [x] production 仍 v1 projector；real envelope 含 scope，仍缺 capability；无 v2 cutover

## 2. 场景证据
| 场景 | 结果 | 证据 |
|---|---|---|
| path / priority / request scope | passed | F7 unit policy 组 |
| fold / collision / filter / materializer | passed | selection/integration/materializer |
| trust / envelope / LARGE / V1 | passed | trust unit + golden F7 group |
| platform F7-SCOPE-001 | passed | `test:platform` |
| unit-all / golden-all / mcp-all / docs | passed | QA + DoD |
| DoD / gate / evidence pack | passed | status=passed |

## 3. Checklist / Gates
S1–S5 done；C1–C66 passed；scope/dod/evidence-pack passed；review passed（round 3，blocking 0）；QA passed（round 1）。

## 4. 回写
- `repo-nav-public-beta-items.yaml` → `repository-scope-policy` done
- architecture：`system-repo-nav-foundation.md` 记 F7 scope policy / producer registrar / coverage mount / missing=capability
- goal-state index → 10（language-capability-boundary）；`goal-features/repository-scope-policy.md` → accepted

## 5. Residual
- REV-007..011 / REV-013/014：important/nit（separator replaceAll、coverage ownership、skipFallback、ENVELOPE 弱证明、压力边界）
- Material delta：补 golden group `repository-scope-policy` + golden spec（CMD-F7-GOLDEN）
- 远程六格同 revision F7-SCOPE-001 marker：deferred（本地 `test:platform` 已绿）
- F8 language port 不在本项范围

## Verdict
Acceptance **passed**。
