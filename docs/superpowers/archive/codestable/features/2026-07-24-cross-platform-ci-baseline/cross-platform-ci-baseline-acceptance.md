---
doc_type: feature-acceptance
feature: 2026-07-24-cross-platform-ci-baseline
status: passed
audit_state: completed
audit_reason: ""
auditor_id: ""
acceptance_authorization_ref: approval-report.md#goal-acceptance
accepted: 2026-07-28
round: 1
---

# cross-platform-ci-baseline 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-28
> Goal 授权：`ResumeGoalAcceptance approval-report.md#goal-acceptance`
> 远程授权：`approval-report.md#f4-remote-ci-evidence` approved

## 1. 接口 / 交付物核对

- [x] 六格 platform registry + `.github/workflows/cross-platform-ci.yml`
- [x] 稳定 aggregate `cross-platform-required`（needs + always + success-only）
- [x] `test:platform` / `tools/ci/*` orchestrator、safe report、synthetic extension protocol
- [x] 未改 `package.json.engines` / `private` / production v1 cutover

## 2. 行为与决策核对

- [x] 本地 core：build/typecheck/contract/baseline/platform/full suites/docs/self-tests
- [x] 远程 F4-REMOTE-001：同 run 六格 + aggregate success（run `30323465951` / SHA `865fcf0`）
- [x] main ruleset `main-cross-platform-required`（id `19864943`）required check 精确为 `cross-platform-required`
- [x] 失败 PR #1：`mergeStateStatus=BLOCKED`，aggregate FAILURE
- [x] CMD-WORKFLOW-YAML：等价 `validate-workflow-yaml.mjs`（yaml CLI stdin 限制）

## 3. 验收场景

| 场景 | 结果 | 证据 |
|---|---|---|
| F4-MATRIX-001 | passed | workflow contract + remote six cells |
| F4-REMOTE-001 | passed | `remote-evidence/same-run-green-865fcf0.json` + ruleset + failing PR |
| F4-PATH/PROC/MCP | passed | local platform + remote OS cells |
| F4-EXT-001 | passed | synthetic extension contract tests |

## 4. Checklist

S1–S5 `done`；C1–C45 `passed`。

## 5. DoD / Gate / Review / QA

- scope/dod/evidence-pack：passed
- review：`reviewer: subagent`，`status: passed`，blocking=0
- QA：`status: passed`，runner=subagent

## 6. 回写

- items.yaml：`cross-platform-ci-baseline` → `done`
- roadmap F4：acceptance passed
- architecture：CI blocking matrix 已落地（见 architecture-check）
- F5 admission：F4 base 已 accepted

## 7. Residual Risks

- host-tools 双份入口（REV-001，non-blocking）
- remote-evidence 未内嵌六格 artifact 深核 marker（远程 run 已 success）
- merge queue 未启用（已记录）

## 8. Verdict

Acceptance **passed**。
