---
doc_type: feature-evidence
feature: 2026-07-10-mcp-locate-surface
status: passed
---

# MCP stdio 与生命周期证据

## SDK 与 schema

- `package.json`、`package-lock.json` 和 installed package 均固定 `@modelcontextprotocol/sdk@1.29.0`；未使用 v2 alpha。
- low-level `Server` 使用 `ListToolsRequestSchema` / `CallToolRequestSchema`；initialize capability 为 `tools: { listChanged: false }`。
- `mcp-locate-surface-tool-schema.json` 由当前 `LocateRequestSchema` / `LocateToolOutputSchema` 通过 Zod 4 JSON Schema 2020-12转换实际生成；input/output顶层均为object。可表达约束由直接依赖的Ajv2020独立编译验证，UTF-8 byte budget、NFKC/trim和跨字段refine以`description`/`$comment`明确标为runtime validation。

## 真实 stdio transcript 摘要

`npm run test:mcp`先执行fresh build；raw child-process harness从`package.json`解析`repo-nav-mcp` bin并直接启动`node dist/main.js`。stdout只观察到三类SDK协议帧：

```json
{"jsonrpc":"2.0","id":1,"result":{"capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"repo-nav","version":"0.1.0"}}}
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"repo_nav_locate","inputSchema":{"type":"object"},"outputSchema":{"type":"object"}}]}}
{"jsonrpc":"2.0","id":3,"result":{"isError":true,"structuredContent":{"ok":false,"error":{"code":"INVALID_INPUT"}}}}
```

- `stdio-clean-output`：exit 0，3个可解析MCP frames（initialize/list/call），production stderr为空。
- `stdio-graceful-shutdown`：Windows通过stdin EOF触发；支持signal的平台由同一harness发送SIGINT；host先关闭transport/in-flight calls，再关闭Nest context，exit 0。
- 当前实机两条production lifecycle case均低于5秒manifest budget；最新full run分别约0.78秒和0.77秒。

## 取消与资源清理

- SDK `RequestHandlerExtra.signal`取消真实stdio call后，fixture service观察到`MCP_FIXTURE_ABORTED`，client call进入SDK取消错误而不是迟到tool result。
- call/cancel背靠背的早取消也通过真实stdio回归；listener注册后会同步检查already-aborted state，不依赖`abort`事件补发。
- stdin EOF发生在in-flight locate期间时，host shutdown signal abort service，等待tracked call settle后child约0.85秒退出。
- `NodeMcpStdioHost.close()`重复调用返回同一个Promise；close后再次connect触发connect-once invariant。
- SDK server close失败时host仍会abort并等待tracked calls、进入closed state；process coordinator在host close失败后仍尝试一次Nest context close。server/host/application三类close failure均有fault test，统一映射固定stderr与exit 1。
- deferred connect与close交错时，close等待connect settle并保持最终closed，不会被迟到connect回写running；process entry在application context创建前即安装signal/EOF handlers，早期intent在coordinator bind后执行host→app cleanup。
- SDK `server.onerror`与Node stream error均接入同一个startup shutdown controller。compiled bin收到malformed JSON frame时约0.59秒完成host→app cleanup并exit 1，stdout无frame、stderr无raw parser detail。
- fixture markers只写stderr，用于测试证据；production stdout没有diagnostic、stack或普通文本。
