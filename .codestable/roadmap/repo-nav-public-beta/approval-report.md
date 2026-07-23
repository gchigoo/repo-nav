---
doc_type: approval-report
unit: repo-nav-public-beta
status: approved
reason: other
approval_scope: start-pr00-contract-planning-only
created_at: 2026-07-23
---

# Approval Report

本报告只证明 owner 已授权启动 PR-00 契约规划与独立审查，不表示 roadmap、schema v2 或任一 feature implementation 已通过技术 gate。

## Decision History

- 2026-07-23：owner 在阅读基于 2026-07-22 review 制定的开发计划后回复“按计划开始推进”，授权创建隔离 worktree 并推进 PR-00 public-beta v2 契约冻结。

## Decision Applied

- 新路线使用 `repo-nav-public-beta`，不改写已完成的 `repo-nav-mvp` roadmap。
- 目标候选为 EvidencePack schema v2 与 package `0.2.0-beta.1`。
- `question` 采用方案 A：保留为可选说明文本，不参与 production 执行。
- 第一优先级是公共输出安全边界，其后依次推进 ranking、request snapshot/cache 和其他硬化项。
- public-beta 只声明 TypeScript/JavaScript/SQL semantic classification；其他语言保守降级。

## Context

当前 MVP 的 build、typecheck、168 unit、64 active Golden、39 MCP 和 docs smoke 已在规划前重新执行通过。review 指出的问题主要是未被现有 v1 回归覆盖的安全、相关性、快照一致性和能力表达债务，而不是当前基线测试失败。

## Risks And Tradeoffs

- schema v2 会改变 ID、repository 字段、排序和 coverage，客户端需要迁移。
- response-local ID 放弃跨请求稳定引用，以换取不暴露 raw content hash。
- unsupported language 降级会减少 confirmed 数量，但避免 false confirmation。
- roadmap 仍需独立只读 review；启动授权不等于自动通过该 gate。

## Non-Automatic Actions

本授权不自动执行 feature implementation、commit、merge、push、license 选择、移除 `private: true`、npm publish 或 GitHub release。每个动作继续遵守对应 CodeStable gate 和 owner 审批边界。

## Next

完成 roadmap/items/contract/threat model 的一致性校验后，进入独立 roadmap review；review 通过后再启动 `public-output-boundary-v2` feature design。
