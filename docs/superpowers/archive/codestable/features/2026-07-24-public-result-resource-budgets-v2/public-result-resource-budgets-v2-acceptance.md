---
doc_type: feature-acceptance
feature: 2026-07-24-public-result-resource-budgets-v2
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-28
round: 1
---

# public-result-resource-budgets-v2 验收报告

> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`

## 1. 契约核对
- [x] raw count/field/4MiB、corpus 128/32KiB、public-field 与 serialized 1MiB 硬上限
- [x] N/N+1 fail-closed；aggregate → fixed `INTERNAL_ERROR`
- [x] dormant assembler 接线顺序符合 design；无 F1C/F2/F6 / production cutover

## 2. 场景证据
| 场景 | 结果 | 证据 |
|---|---|---|
| raw / corpus / public / serialized budgets | passed | F1B unit + v2 group |
| N/N+1 / ordering / projection / legacy | passed | unit + golden |
| corpus 32KiB N/N+1 | passed | QA focused assert（稳定 case 仍薄，residual） |
| no-cutover | passed | no-cutover case |

## 3. Checklist / Gates
S1–S5 done；C1–C33 passed；scope/dod/evidence-pack passed；review/QA passed（blocking=0）。

## 4. 回写
- items.yaml → `done`
- roadmap F1B acceptance note
- architecture-check 已存在

## 5. Residual
- RR-001 稳定 case 缺 32KiB owner；RR-002 array length short-circuit

## Verdict
Acceptance **passed**。
