---
doc_type: feature-acceptance
feature: 2026-07-24-span-redaction-corpus-policy-v2
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-27
round: 1
---

# span-redaction-corpus-policy-v2 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-27
> 关联方案 doc：`.codestable/features/2026-07-24-span-redaction-corpus-policy-v2/span-redaction-corpus-policy-v2-design.md`
> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`（goal-state 与 approval-report 机械核验 approved）

## 1. 接口契约核对

- [x] `SensitiveSpanV2`：原始 JS string 0-based UTF-16 half-open；`reasonCodes` 非空 tuple；非法坐标/empty-reason fail-closed
- [x] `SensitiveCorpusEntryV2` / `SensitiveCorpusV2`：`reasonCodes` + `propagation`；`entries` + `totalUtf8Bytes`；value 展开 exact-text + path-segment
- [x] `redactPublicFieldV2` / `collectSensitiveCorpusV2`：façade 保留；内部 span→merge→单次 materialize
- [x] `projectPublicSafeRankingKeyV2`：仅 file/symbol；≥8-byte segment/symbol 保守折叠；无 corpus/retained/matchedText
- [x] dormant `PublicResultAssemblerV2`：同次 synthetic input 内部建 immutable corpus；拒绝 caller/cross-input/clone corpus

## 2. 行为与决策核对

- [x] local assignment 始终隐藏；低熵不跨字段传播
- [x] eligibility 8–512 UTF-8 bytes + comparison-key 规则；matcher 原值 case-sensitive
- [x] exact-text Unicode 边界；path 完整 POSIX segment；placeholder 不回扫
- [x] phone accept/reject/local-only truth table
- [x] 明确不做：无 F1B budgets、无 F1C/F2/F6 import、无 production v2 cutover、无第三方扫描库
- [x] public schema / reason enum / placeholder 契约未改

## 3. 验收场景核对

| 场景 | 结果 | 证据 |
|---|---|---|
| F1A-SPAN-001 | passed | span-redaction + focused REV-001 |
| F1A-LOCAL/ELIGIBILITY/BOUNDARY/PATH | passed | corpus-policy / corpus-boundaries |
| F1A-PHONE-001 / NEG | passed | phone-corpus-policy |
| F1A-AMPLIFICATION / PLACEHOLDER / REASON | passed | redaction-amplification + Golden |
| F1A-RANKKEY-001 | passed | public-safe-ranking-key + focused REV-002 |
| F1A-PROJECTION-001 | passed | Golden forbidden/over-redaction |
| F1A-NOCUTOVER-001 | passed | no-cutover + MCP + docs |

## 4. Checklist Checks

C1–C33 全部 `passed`（见 checklist）。S1–S5 全部 `done`。

## 5. DoD / Gate / Evidence

- scope-gate：passed（ambient TODO warning 已解释）
- dod-runner core 命令：全部 exit 0
- evidence-pack：passed；archguard/meta-cc unavailable 已记录
- review：`status: passed`，`reviewer: subagent`，blocking=0
- QA：`status: passed`，runner=subagent

## 6. Roadmap / Architecture / Requirement 回写

- items.yaml：`span-redaction-corpus-policy-v2` → `done`
- roadmap F1A：记录 acceptance done（本轮）
- architecture：`span-redaction-corpus-policy-v2-architecture-check.md` = no-change
- requirement：无新公开 capability 边界变更，无需 cs-req delta

## 7. Residual Risks

- 稳定 registry case 对 combining/isolated/LF 与 RANKKEY mutation 覆盖仍偏薄；QA focused 断言已补证，不构成核心缺口
- detector 全排列非穷举；dormant seam 设计边界
- ambient checklist TODO 文案噪声；可选 provider unavailable

## 8. Cleanliness

- F1A 源码/测试无真实凭证、debug 输出、临时 TODO
- `git diff --check` 对 F1A 路径 exit 0（EOF blank 已修）

## 9. Delivery Record

- 模块：sensitive-value-contract/detectors/span-merge/corpus/phone/field-materializer/ranking-key + façade
- assembler 内部 corpus provenance
- fixtures / runner-registry / evidence / review / QA / acceptance

## 10. Final Audit Verdict

Acceptance **passed**。Goal 模式下以 `approval-report.md#goal-acceptance` 完成 `ResumeGoalAcceptance`。
