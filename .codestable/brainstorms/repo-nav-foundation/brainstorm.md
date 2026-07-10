---
doc_type: brainstorm
slug: repo-nav-foundation
created: 2026-07-10
status: active
summary: 探索 RepoNav 如何为外部编码 Agent 提供确定性、可核验且区分事实与候选的仓库证据
tags: [repository-retrieval, mcp, codegraph, evidence]
---

# RepoNav 产品基础方向

> 创意空间 | 2026-07-10 | 下一步：cs-req draft

## 出发点

编码 Agent 面对大型仓库中的自然语言问题时，经常能找到“相关代码”，却不一定找到真正决定行为或数据值的 source of truth。典型失败包括：停在同名 DTO 或 mapper、漏掉决定值的 SQL 表达式、把图索引未返回边误判为代码中不存在，以及给出缺少文件、symbol、行号和关系解释的结论。

RepoNav 想解决的不是通用代码搜索，也不是替代 CodeGraph，而是在 CodeGraph、文本搜索、git 和后续可选的结构化索引之上，形成面向 Agent 的确定性证据编排层。

旧立项材料已按原始字节迁入 `sources/`。由于其中中文已经损坏为 `?`，旧材料只作为历史输入，不作为本轮结论依据。

## 聊过的方向

### 产品主轴

讨论过四种可能主轴：可靠找到真实代码路径、多轮探索连续性、统一 Agent 查询接口、跨框架检索平台。最终选择“可靠找到真实代码路径”。Session 和统一接口是支撑机制，跨框架平台化延后。

### 第一个 golden case

讨论过 source-of-truth 定位、跨层 trace、图索引缺边 fallback 和影响分析。最终先做 source-of-truth 定位，因为可靠 anchor 是其他能力的前提。

### 证据边界

仅报告当前代码事实过于保守，直接判断业务正确答案又会越界。最终选择双层证据：

- `confirmed evidence`：由当前仓库事实直接证明的文件、symbol、行范围、表达式与关系。
- `candidate evidence`：高度相关但尚不能证明业务结论的 sibling 字段、alias、旧实现、历史变更或相邻路径；必须附“为什么值得核查”和不确定性。

Candidate 不能混入结论，业务正确性仍由外部 Agent 与用户裁决。

### 推理归属

讨论过外部 Agent 推理、可插拔 LLM 以及 RepoNav 自身成为检索 Agent。最终选择确定性核心：RepoNav 不内置 LLM，不要求模型 provider 或 API key；Codex、Claude Code、Cursor 等宿主 Agent 负责理解业务语义与最终判断。

### 交付表面

最终选择 MCP-first。MCP tool 是 MVP 的正式产品契约；CLI 复用相同 application service，但只承担 golden-case 自动化、开发调试和故障诊断，不承诺第一阶段与 MCP 完全对等的产品体验。

## 当前倾向

RepoNav 是一个 **LLM-native、但不是 LLM-powered** 的 repository evidence orchestrator：

1. 它接受宿主 Agent 提供的问题与结构化提示。
2. 它调用可用检索后端，扩展和交叉验证候选。
3. 它返回小而可核验的 EvidencePack，而不是长篇自然语言答案。
4. 它明确区分 confirmed evidence、candidate evidence、未覆盖范围与索引健康状态。
5. 它不替用户判断业务规则，不在内部再运行一个自主 Agent。

## 已敲定的点

- 第一阶段首要问题：可靠找到真实代码路径。
- 首个 golden case：找到真正的 source of truth。
- 输出必须区分 confirmed evidence 与 candidate evidence。
- RepoNav 不内置 LLM；推理和业务裁决属于宿主 Agent。
- MVP 以 MCP 为正式交付表面。
- CLI 只做最小调试、测试和故障诊断入口。
- Session、完整 trace、impact、跨框架 AST 平台均不是第一个闭环的前置条件。
- 旧材料中的目标态架构和 MCP contract 仍需重新设计，不能直接提升为 canonical spec。

## 首个 golden-case 草案

### 输入场景

用户用业务名称询问某个导出字段或行为的真实代码来源，仓库中存在多个语义相近的字段、alias、DTO 或映射层。

### 预期 confirmed evidence

- 真正执行该行为的入口 symbol。
- 决定当前值的精确表达式或映射。
- 文件路径与可定位行范围。
- 从用户术语到代码 anchor 的解释。
- 证据来源和索引健康状态。

### 预期 candidate evidence

- 与当前字段处于同一实体或局部结构中的高相关 sibling。
- 候选与当前事实的差异。
- 候选被纳入的确定性原因。
- 还缺什么证据才能把候选升级为 confirmed。

### 失败判据

- 只返回同名文件列表，没有指出真正决定值的位置。
- 把 candidate 写成确定结论。
- 找到当前表达式后立即停止，未按规则检查高相关局部候选。
- 输出没有文件、symbol、行范围或关系解释。
- 图索引缺失时声称代码路径不存在，却没有标明未执行 fallback。

## 遗留问题 & 下一步

1. **MCP 输入边界**：既然 RepoNav 不内置 LLM，自然语言问题应由宿主 Agent预处理到什么程度？是否必须传 `intent`、anchors、layer hints、negative constraints 等结构化字段？
2. **Candidate 触发规则**：哪些确定性信号允许扩展 sibling、alias、git history，如何限制噪声和 token 数量？
3. **EvidencePack 最小契约**：confirmed、candidate、excluded、index health、next action 哪些属于 MVP 必需字段？
4. **CodeGraph 边界**：有 `.codegraph/` 和没有索引时分别保证到什么程度；MVP 是否必须实现 `rg` fallback？
5. **正确性评测**：如何把真实仓库问题固化为可重复 fixture，避免仓库演进后 golden answer 静默漂移？
6. **停止条件**：找到几个 confirmed anchor 后应停止，什么情况下继续扩展，怎样避免“为了完整”无限搜索？
7. **安全与隐私**：证据中遇到凭证、连接串、个人信息时，核心层应如何标记和裁剪？

建议下一步先用 `cs-req draft` 把已经确认的用户问题、能力价值和边界写成稳定愿景，再由 `cs-roadmap` 设计模块、接口契约和子 feature。
