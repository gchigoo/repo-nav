---
doc_type: feature-implementation-fix
feature: 2026-07-10-mcp-locate-surface
step: S2
status: applied
---

# S2 窄范围修复说明

- 失败的退出信号：success/recoverable output mapping 的 build/typecheck 前置未通过。
- 实际错误：SDK `Client.callTool()` 返回兼容结果 union，其中旧协议 `toolResult` 分支与测试 helper 的全 optional object type没有共同属性；`exactOptionalPropertyTypes` 下不能直接赋值。
- 根因：测试 helper 过早收窄 SDK union，而不是从协议边界把结果作为 `unknown` 做运行时判别。
- 允许改动：仅 `test/mcp/tool-output-parity.spec.ts` 的 parity helper 类型与结构判别；不修改 production serializer、SDK boundary或输出契约。
- 必须重跑：`npm run build`、`npm run typecheck`、S2 两个 MCP cases。
