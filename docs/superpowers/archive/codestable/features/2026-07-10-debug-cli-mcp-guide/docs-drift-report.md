# Executable docs / schema drift report

- 四份要求文档全部存在，解析到 10 个且仅 10 个已登记 `docs-smoke` blocks；unknown/missing/duplicate block 会失败。
- getting-started config 启动真实 `dist/main.js`，`tools/list` 精确匹配当前 input/output schemas。
- 真实 MCP 调用：success=`partial`、recoverable=`no_result`、error=`INVALID_INPUT`；structured/text/isError parity 全部通过，stderr clean。
- 真实 CLI snippets：help、locate、probe、golden 全部 exit 0，输出分别通过 help/canonical locate/probe/golden contract。
- API reference projection与当前 Zod/JSON Schema deep exact；retired field set 检查通过。
- acceptance contract 含 7 条完整 commands、4 个 artifact locations，并机器检查 minimal-loop 非发布边界。
- runtime artifact：`test-artifacts/docs/docs-smoke-v1.json`（gitignored、每次 `test:docs` 重建）。

Result：passed。
