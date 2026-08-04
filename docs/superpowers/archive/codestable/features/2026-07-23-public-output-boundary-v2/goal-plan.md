---
doc_type: feature-goal-plan
feature: 2026-07-23-public-output-boundary-v2
status: ready
created: 2026-07-23
---

# F1 public-output-boundary-v2 Goal Plan

## 1. Inputs

- Design：`.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design.md`
- Checklist：`.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-checklist.yaml`
- Design review：`.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design-review.md`
- Roadmap contract：`.codestable/roadmap/repo-nav-public-beta/public-contract-v2.md`
- Threat model：`.codestable/roadmap/repo-nav-public-beta/threat-model.md`
- Baseline：`fd1d528a7319de734300fb906adb69adbf237639`

## 2. Owner Gates

- Design approval：2026-07-23，owner 回复“批准 F1 设计，继续实现”。
- Goal acceptance authorization：2026-07-23，owner 回复“授权 F1 Goal 最终验收”。
- Authorization ref：`approval-report.md#goal-acceptance`。

Design approval 不等于实现结果已被接受；acceptance authorization 只允许 driver 在 implementation、独立 code review 和 QA 全部通过后继续最终 acceptance。

## 3. Execution Scope

按 checklist S1-S5 顺序执行：

1. raw/public v2 strict schema、cross-field mutation families 和 runner registry。
2. response-level sensitive corpus 与 term/path/symbol/excerpt 字段安全策略。
3. assembler strict raw parse、allowlist、derived degradation/status 与 ordinal ID。
4. safe errors 与 synthetic success/error projection parity。
5. completeness、import inventory、no-cutover、forbidden scan 和 full v1 regression。

F1 只建立 dormant internal/test seam。不得接入 production Evidence Engine、MCP、CLI、package barrels、public JSON Schema 或 docs；不得实现 F2/F3/F5/F6/F7/F8 的真实 facts producer。

## 4. TDD Policy

- S1-S4 是代码行为 steps，默认使用 RED → GREEN → VERIFY micro-loop。
- 每个 step 在 checklist/evidence 中记录：
  - RED：目标 case 在实现前因缺失行为而失败；
  - GREEN：最小充分实现使目标 case 通过；
  - VERIFY：本 step 定向命令与已受影响 regression 通过。
- 如果某项只增加静态 import inventory/report，允许写 `TDD exception`，但必须先证明现有 gate 无法观察该要求，再提供等价 negative fixture/diff evidence。
- 禁止先批量写完实现再补无法证明 RED 的测试记录。

## 5. Core Acceptance Paths

- strict raw/public schema 与 11 个 mutation family 全部有正反 owner。
- sensitive identifier、secret/connection/PII、malformed/oversized、control/ANSI/bidi、unsafe/newline path truth table exact。
- 0/1/多个 hidden path 的 `LOCATION_REDACTED` 与 status derivation exact。
- response-local ID 严格为 confirmed 后 candidate 的 `0001..N`。
- 四类 safe error 与 synthetic service/structured/text/debug-locate success/error projections exact 且 forbidden scan 无原值。
- registered import inventory 证明 v2 对 package barrels、engine、MCP、CLI 不可达。
- build、typecheck、full unit、Golden、MCP、docs 全部通过并继续观察 production schema v1。

## 6. Required Commands

以 checklist `dod.commands` 为机读权威，至少执行：

```text
npm run build
npm run typecheck
npm test -- --group public-output-v2
npm run test:golden -- --group public-output-v2
npm test -- --group public-output-v2 --case no-cutover-import-inventory
npm test
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
python .codestable/tools/codestable-doctor.py --root .
```

Doctor 的既有 debug-cli review P1 使用 `document-baseline`，但本 feature 新 finding 必须 fix-or-block。

## 7. DoD And Gates

- implementation：S1-S5 done，checks 有真实 evidence，start/implementation gates 通过。
- review：独立 Task agent 同时给出 spec compliance 与 code quality verdict；blocking finding 必须修复并复审。
- QA：核心 cases、full commands、forbidden scan、no-cutover/import inventory 全部有实际运行证据。
- acceptance：核对 approved design、artifact inventory、roadmap/architecture 回写和未越界事实。
- commit/merge/push/release 不属于 Goal 自动动作。

## 8. Handoff Conditions

命中任一项立即写 `stage: handoff` / `status: blocked`：

- 需要改变 approved design、public contract、roadmap item 或 F1/F9 cutover 边界。
- 独立 reviewer/QA/acceptance agent pending、failed 或 blocked。
- 同一失败项连续三轮修复仍不通过。
- 核心验证依赖外部凭证或环境状态且无法判断行为。
- owner 要求暂停、改方向或终止。
