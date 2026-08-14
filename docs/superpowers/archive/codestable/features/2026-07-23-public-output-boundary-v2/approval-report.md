---
doc_type: approval-report
unit: 2026-07-23-public-output-boundary-v2
status: approved
approvals:
  goal-acceptance: approved
created_at: 2026-07-23
---

# F1 Goal acceptance authorization

## Context

F1 design 已由 owner 批准，且 independent design review passed。该 feature 使用 Goal lane；在生成和派发 Goal 执行包前，CodeStable 要求 owner 对“通过 implementation、独立 code review 和 QA 后，由 Goal driver 继续执行最终 acceptance”作一次独立授权。

## Term

`Goal acceptance authorization` 只允许 driver 在以下 gate 全部通过后进入 acceptance：

1. checklist implementation steps 完成并有 RED / GREEN / VERIFY 或有效 TDD exception 证据；
2. 独立 code review passed；
3. QA passed；
4. goal-state 中的授权引用与本报告机械匹配。

它不表示提前接受实现结果。

## Why It Matters

design approval 确认“按什么方案做”；Goal acceptance authorization 确认“前置 gate 通过后是否允许长程 driver 不再停顿、继续完成最终验收与状态回写”。两者必须分开记录，避免把“继续实现”误当成自动接受最终交付。

## Options

1. **授权 Goal 最终验收（推荐）**：implementation → independent review → QA 全部通过后，driver 自动继续 acceptance；遇到范围/公开契约变化、三轮同项失败、review/QA 阻塞或环境缺失仍必须 handoff。
2. **不授权自动验收**：可以保留已批准 design，但 Goal 包不得派发；后续需要改为手动阶段推进。

## Default

等待 owner 明确选择，不从 design approval 或“继续实现”推断。

## Non-Automatic Actions

该授权不会自动 commit、merge、push、移除 `private: true`、发布 package/GitHub release，也不会接受 code review finding 或改变 approved design。

## Question

是否授权 F1 Goal driver 在 implementation、独立 review、QA 全部通过后继续执行最终 acceptance？

## Decision

- 2026-07-23：owner 明确回复“授权 F1 Goal 最终验收”。
- `approvals.goal-acceptance` 更新为 `approved`。
- 授权引用：`approval-report.md#goal-acceptance`。
- 该授权只在本 feature 的 design、独立 review、QA 和 goal-state 均匹配时有效。
