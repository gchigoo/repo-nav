---
doc_type: approval-report
unit: repo-nav-mvp
status: approved
reason: review-authorization
created_at: 2026-07-10
---

# Approval Report

## Decision History

- 2026-07-10：owner 选择 **A：批准 roadmap**，授权 `repo-nav-mvp` 从 `draft` 激活为 `active`。
- 2026-07-10：Git `main` 与 baseline commit `04b04f7a1314f322e82157363ced505e2199cfc8` 已建立；9 条 roadmap items 已进入 `in-progress` 并绑定 draft feature。
- 2026-07-10：owner 选择 **A：批准全部 9 份 design**；授权 design 转为 `approved` 并生成 goal execution package。

## Decision Resolved

全部 9 份 feature design/checklist 已获批准；goal execution package 已生成，等待 owner 粘贴 `/goal` 指令启动实现。

## Why Now

9 份 design/checklist 已完成首轮起草、YAML/cross-doc 校验和独立 native-agent 多轮 review。首轮所有设计均收到实质性 findings；经过最多 5 轮修订后，9 份最终 design-review 全部为 `passed`，当前无 blocking 或 important finding。

## Context

- 产品主轴：让外部编码 Agent 获得 deterministic source-of-truth evidence；RepoNav 不内置 LLM。
- 产品表面：MCP-first；CLI 只承担 debug/test/docs，不形成第二套业务语义。
- 输出边界：confirmed/candidate 分离；当前文件核验是必要条件但不自动构成 confirmed。
- 技术基线：NestJS 11 standalone application context、TypeScript strict、Zod、MCP SDK v1.29.0、stdio；无 HTTP listener。
- 当前状态：只有规划/设计文档，无 package、src、test 或实现依赖；尚未进入 implementation。

## Review Inventory

| # | Feature | Steps / Checks | Final review |
|---|---|---:|---|
| F1 | repository-evidence-foundation | 5 / 11 | passed · round 2 |
| F2 | repository-access-process-safety | 4 / 12 | passed · round 4 |
| F3 | text-source-evidence-engine | 4 / 12 | passed · round 3 |
| F4 | mcp-locate-surface | 4 / 14 | passed · round 3 |
| F5 | candidate-evidence-policy | 4 / 12 | passed · round 4 |
| F6 | codegraph-fallback-orchestration | 4 / 12 | passed · round 5 |
| F7 | evidence-output-guardrails | 4 / 12 | passed · round 4 |
| F8 | mvp-golden-regression-suite | 6 / 12 | passed · round 3 |
| F9 | debug-cli-mcp-guide | 5 / 13 | passed · round 3 |

## Owner Decisions Embedded In The Designs

1. **MCP invalid-input boundary**：F4 使用 SDK low-level `Server` tools capability/list/call handlers，而不是 `registerTool` helper；这样 envelope-valid 但 schema-invalid 的 arguments 能返回 typed `INVALID_INPUT` + structured/text parity。protocol-invalid envelope 与 unknown tool 保持 JSON-RPC error boundary。
2. **保守文本推断**：F3 只 confirmed 明确列出的 assignment/object/SQL/symbol forms；F5 candidate context 最多 12 行/4 KiB。未支持或跨窗口语义宁可降级/不召回。
3. **Redaction 产品边界**：F7 `PERSONAL_DATA` 在 MVP 只覆盖 email address 与 phone-like token；姓名和一般标识符不自动遮盖。
4. **CodeGraph 策略**：除极窄 explicit-symbol complete gate 外，即使 CodeGraph 有 hit 也默认运行 ripgrep；真实成功兼容性只在 temp synthetic repo 初始化 index，不触碰用户目标仓库。
5. **Debug probe 边界**：F9 `debug probe` 可直接读取 reader/backend runtime tokens，但只输出 versioned `BackendHealth` diagnostic，不能生成 EvidencePack/LocateStatus/source-of-truth 结论。
6. **Regression/performance**：F8 使用 1000-file fixed synthetic corpus；correctness 阻塞，timing 只作环境化趋势；companion snapshots 与 committed performance baseline 只能经 code review 更新。

## Decision Applied

- 9 份 design frontmatter：`draft → approved`。
- checklist steps/checks：仍保持 `pending`，等待 goal feature loop 更新。
- goal-state：`ready-to-dispatch`，`current_feature_index: 0`，baseline_ref 指向 `04b04f7a1314f322e82157363ced505e2199cfc8`。
- goal plan、四份 protocols、9 份 goal-feature specs 与 pending audit placeholder 已落盘。

## Risks And Tradeoffs

- 保守 confirmed/candidate 规则会漏召回，但避免把“相关代码”误说成事实。
- low-level MCP handlers 增加 adapter 责任，但能满足 typed schema-invalid error 和 output parity。
- CodeGraph 默认 fallback 会增加时延，但避免把 symbol search 误当 literal source completeness。
- Windows process-tree/reparse、MCP cancellation/shutdown、CodeGraph version JSON、redaction forbidden scan 和 synthetic performance 都只有设计证据，必须在 implementation/QA 实测。

## Non-Automatic Actions

本次批准没有安装依赖、生成 production code、执行测试、commit、merge、deploy 或发布。真正实现与 scoped commits 只有 owner 粘贴 `/goal` 后才开始。

## Outcome

Owner 已选择 A。9 份 design 为 `approved`，items 仍为 `in-progress`，goal package 已 ready-to-dispatch；当前没有实现代码或 commit。
