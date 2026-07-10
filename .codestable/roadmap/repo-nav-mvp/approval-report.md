---
doc_type: approval-report
unit: repo-nav-mvp
status: approved
reason: review-authorization
created_at: 2026-07-10
---

# Approval Report

## Decision History

- 2026-07-10：owner 选择 **A：批准 roadmap**，授权把 `repo-nav-mvp` 从 `draft` 激活为 `active`；items 仍保持 `planned`。

## Decision Resolved

`repo-nav-mvp` roadmap 已获批准并激活。

## Why Now

候选 roadmap 已完成 YAML/DAG 校验和四轮独立只读 review。前三轮发现的 confirmed 门槛、状态转换、Nest DI、输入语义、ID、reader cancellation、Golden error contract 等问题均已修订；Round 4 verdict 为 `passed`，无 blocking/important finding。

## Context

- 产品主轴：为外部编码 Agent 提供确定性 source-of-truth evidence。
- 推理边界：RepoNav 不内置 LLM。
- 输出边界：confirmed 与 candidate 分离。
- 产品表面：MCP-first，CLI 只做调试与测试。
- 技术基线：NestJS 11 standalone application context、TypeScript 5.8 strict、MCP TypeScript SDK、Zod、stdio；不启动 HTTP listener。
- 当前状态：无实现代码、package 和 Git baseline。

## Options

### A. 批准 roadmap（推荐）

接受当前模块拆分、接口契约、9 条 items、依赖 DAG、最小闭环和完成信号。主文档转为 `active`，后续可准备 Git baseline，再从第一条 feature design 开始。

### B. 要求修改

指出要调整的范围、接口、条目、依赖或优先级。任何实质变化都需要重新校验 items.yaml 并重跑 `cs-roadmap-review`。

### C. 暂停 roadmap

保留当前 draft 与 passed review，不进入 active，也不启动 feature。

## Recommendation

选择 A。最终候选已经把安全边界前置，明确最小闭环不等于可发布里程碑，并为每个 core goal 提供 item、验证入口和 evidence type。

## Risks And Tradeoffs

- 9 条 item 比旧材料中的“先做几个命令”更重，但换来可执行接口、安全边界和可复现评测。
- 宿主 Agent 必须提供非空 literal terms；RepoNav 不自己理解自由文本，这是确定性与易用性的明确取舍。
- F5 仅证明受控 fixture 最小闭环，必须完成 F7/F8 才能视为可发布 MVP 候选。
- CodeGraph JSON、Windows process cleanup 和大型仓库性能仍只有规划依据，必须在 feature acceptance 中实测。
- 项目尚未初始化 Git；在 baseline commit 前不能进入 CodeStable worktree 实现流程。

## Non-Automatic Actions

批准不会自动执行 `git init`、创建分支/worktree、安装依赖、生成代码、启动 feature、commit、merge 或发布。

## Outcome

- Roadmap frontmatter 已从 `status: draft` 更新为 `status: active`。
- 9 条 items 仍为 `planned`，没有启动 feature。
- 未执行 Git 初始化、依赖安装、代码生成、commit、merge 或发布。
