---
doc_type: approval-report
unit: repo-nav-foundation
status: approved
reason: review-authorization
created_at: 2026-07-10
---

# Approval Report

## Decision History

- 2026-07-10：owner 选择 **A：可靠找到真实代码路径** 作为 RepoNav 第一阶段产品主轴。
- 2026-07-10：owner 选择 **G1：找到真正的 source of truth** 作为第一个 golden case。
- 2026-07-10：owner 选择 **R2：当前事实 + 语义冲突候选**，要求严格分离 confirmed 与 candidate evidence。
- 2026-07-10：owner 选择 **E1：外部 Agent 推理，RepoNav 做确定性证据编排**，MVP 不内置 LLM。
- 2026-07-10：owner 选择 **I1：MCP-first，CLI 仅作调试和测试壳**。
- 2026-07-10：owner 批准 draft requirement **`source-of-truth-evidence`**，授权写入 requirement 与 `VISION.md` 能力索引。

## Decision Resolved

已批准第一份 draft requirement：`source-of-truth-evidence`。

## Why Now

Brainstorm 已经确认产品主轴、首个 golden case、证据边界、推理边界和交付表面。先把用户问题与能力边界固化为 requirement，后续 roadmap 才不会重新扩大成 session、完整 trace、impact 或跨框架索引平台。

## Context

本 requirement 只描述“用户为什么需要这项能力、获得什么结果、它明确不负责什么”。MCP、CodeGraph、`rg`、CLI、内部是否使用某种索引等实现细节不进入 requirement，留给 roadmap 和 feature design。

## Candidate Requirement

```markdown
---
doc_type: requirement
slug: source-of-truth-evidence
pitch: 让编码助手从成堆相关代码中指出真正决定行为的位置，并把事实与待核查线索分开
status: draft
last_reviewed: 2026-07-10
implemented_by: []
tags: [repository-retrieval, agent-evidence]
---

# 找到真正决定代码行为的位置

## 用户故事

- 作为正在追查一个业务字段来源的开发者，我希望编码助手指出真正决定当前值的文件、代码位置和表达式，而不是只给我一批名字相似的搜索结果。
- 作为刚接触大型仓库的开发者，我希望编码助手把已经被代码证明的事实和仍需确认的相关线索分开，避免我把一个看似合理的候选误当成结论。
- 作为遇到索引缺失或检索结果不完整的开发者，我希望编码助手明确告诉我查过什么、还缺什么，而不是把“没有查到”说成“代码里不存在”。

## 为什么需要

大型仓库里，同一个业务概念往往散落在页面、接口、DTO、服务、实体和导出映射中。现有代码搜索很容易找到“相关位置”，但真正决定行为或数据值的地方可能只有一个。编码助手如果过早停在同名结果，或者隐藏检索缺口，就会给出看似确定、实际不可核验的答案。

## 怎么解决

用户提出仓库问题后，编码助手获得一组少而明确的代码证据：哪些位置已经证明了当前行为，哪些位置只是值得继续核查的候选，以及本次检索还有哪些未覆盖范围。用户可以沿着这些证据快速确认事实，再决定是否继续分析或修改代码。

## 边界

- 不替用户判断业务规则是否正确；相关候选必须保持为待确认线索。
- 不把“没有检索到”解释成“代码中不存在”；证据不足时必须明确表达不确定性。
- 第一阶段只聚焦找到 source of truth，不承诺完整调用链追踪、修改影响分析或长期探索记忆。
- 不负责修改代码、生成修复方案或自动执行变更。
- 不取代编码助手与用户的推理和确认过程，只为它们提供可核验材料。
```

## Options

### A. 批准候选稿（推荐）

按上文内容落盘 draft requirement，并创建 `requirements/VISION.md` 索引。

### B. 要求修改

指出需要调整的用户故事、能力描述或边界；修改后重新 review，不落盘正式 requirement。

### C. 暂不创建 requirement

保留 brainstorm 结论，不把能力提升为长期愿景 source of truth。

## Recommendation

选择 A。候选稿只固化已经由 owner 确认的产品价值与边界，没有把 MCP、CLI、CodeGraph 或内部模块等实现方案混入愿景层。

## Risks And Tradeoffs

- 当前 requirement 刻意只覆盖一个核心能力，无法单独代表未来完整 RepoNav 产品。
- “编码助手”是用户体验上的主体；如何把自然语言问题变成结构化检索输入仍是 roadmap 未决问题。
- candidate evidence 的触发与排序规则尚未确定，本 requirement 只要求事实与候选分层，不提前冻结算法。

## Non-Automatic Actions

批准不会创建 roadmap、架构决策、代码或 commit，也不会恢复已经损坏的旧文档。

## Outcome

Requirement 已写入 `.codestable/requirements/source-of-truth-evidence.md`，并已创建 `.codestable/requirements/VISION.md` 能力索引。未创建 roadmap、代码或 commit。
