---
doc_type: feature-implementation
feature: 2026-07-10-debug-cli-mcp-guide
status: completed
---

# debug-cli-mcp-guide 实现记录

## 第一性原则 pre-pass

- 外部行为：CLI 是 shallow adapter；locate application semantics 与 MCP 同源，probe 只报告基础设施 health，golden 只选择/运行 F8 tests。
- 不可破约束：usage 不 bootstrap；context 路径 finally close；stdout 只有完整正式 JSON/help；docs snippets 必须执行真实 binaries。
- 最小充分改动：新增 `tools/cli`、四份 docs 和 docs runner；production 只提取共享 Locate output helper并修复真实 SDK 暴露的 schema compatibility。
- 必须不写：新 classifier/fallback/status 判断、索引修改、UI/remote service、临时 debug logging。

## S1-S3：Debug CLI

- package 新增 `repo-nav` bin；独立 `tsconfig.cli.json` 保持 MCP `dist/main.js` 不变，并输出 `dist/tools/cli/main.js`。
- strict parser 支持 locate flags/完整 request JSON、probe repo、golden registry selection；usage 全部在 context 前退出 2。
- locate 经 `REPOSITORY_EVIDENCE_SERVICE`，MCP/CLI 共用 `createLocateToolOutput`；probe 经 reader + ordered backends；golden 经 F8 registry/shared runner JSON summary。
- main 统一 signal/EOF abort、一次 stdout write 和安全 stderr；context commands 在所有服务/异常/abort path close。

## S4：Executable docs

- 新增 getting-started、debug CLI、API reference、MVP acceptance 四份文档。
- `test:docs` 解析 exact block registry，启动真实 MCP，执行 tools/list + success/recoverable/error，再执行四条 CLI snippets。
- Schema projection由实际 JSON Schema/constants/example schemas生成并与 reference deep exact；acceptance commands/boundary 可执行检查。
- 真 MCP smoke 首次发现 SDK runtime 对 output tuple `items:false` 不兼容；保留 `prefixItems` + exact `minItems/maxItems`、移除冗余 `items:false` 后，Ajv 2020约束与 SDK runtime validation 同时通过，并刷新 versioned tool schema snapshot。

## S5：MVP 聚合收口

- DoD runner 7/7 passed。
- 全量：168/168 unit、64 active Golden + 1 conditional skip、39/39 MCP passed。
- Docs：10 blocks、真实 MCP 三类调用、真实 CLI 四条 snippets、schema/acceptance/import graph 全绿。
- 首次 aggregate 暴露旧 MCP lifecycle harness 对 package `bin` 做过窄 strict parse；加入 `repo-nav` contract 后 lifecycle 39/39 回归恢复，最终 aggregate exit 0。

## 实现门禁前验证

- build/typecheck passed；specific debug groups passed；`test:docs` passed。
- aggregate exact command passed，完整日志在 `aggregate-verification.log`，机器结果在 `debug-cli-mcp-guide-dod-results.json`。
- `git diff --check`、scope/cleanliness gate 待 review 前最终执行。
