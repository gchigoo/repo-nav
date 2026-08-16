# RepoNav MCP 快速开始

## 安装

要求 Node.js `^22.0.0 || ^24.0.0`（不支持 Node 20/23）和 `rg`（ripgrep）。CodeGraph 是可选的索引检索后端；未安装或目标仓库未建立索引时，RepoNav 会按受控策略回退到文本搜索。

```powershell
npm i -g repo-nav@2.0.0
```

## MCP 宿主配置

全局安装后，把下面的 stdio 配置加入支持 MCP 的宿主：

```json
{
  "command": "repo-nav-mcp"
}
```

源码仓调试时，`{{REPO_ROOT}}` 替换为本仓库绝对路径：

```json docs-smoke:mcp-config
{
  "command": "node",
  "args": ["{{REPO_ROOT}}/dist/main.js"],
  "cwd": "{{REPO_ROOT}}"
}
```

服务只发布只读工具 `repo_nav_locate`。宿主连接后先执行 `tools/list`，然后可发送以下调用。

## 程序化 API

当前 `2.0.0` package export map：

- `repo-nav`：v2 契约与 application helpers；仍含部分 deprecated 1.x adapter re-export。
- `repo-nav/backends`：`RipgrepBackend`、`CodeGraphBackend`。
- `repo-nav/node`：`NodeRepositoryReader`、`NodeSafeProcessRunner`。
- `repo-nav/advanced`：高级 DI token 与 CodeGraph planner helper。
- `repo-nav/package.json`：package metadata。

生产 locate 输出只有 schema `2.0`，没有 v1 negotiation。`repo-nav/legacy-v1` 已在 `2.0.0` 原子 cutover 中删除；其余批准的 root 和 adapter exports 保持可用。不要使用 export map 之外的 deep import。迁移说明见 [`migration-v1-to-v2.md`](migration-v1-to-v2.md)，当前项目状态见 [`project-status.md`](project-status.md)。

### 找到证据

```json docs-smoke:mcp-success-request
{
  "name": "repo_nav_locate",
  "arguments": {
    "repoPath": "{{REPO_ROOT}}",
    "question": "Where is the repository evidence service token used?",
    "terms": ["REPOSITORY_EVIDENCE_SERVICE"],
    "anchors": [{ "kind": "symbol", "value": "REPOSITORY_EVIDENCE_SERVICE" }]
  }
}
```

### 可恢复的无结果

无命中仍是成功的工具调用：`ok=true`、`isError=false`，且 `confirmed` 为空（status 可能为 `no_result` 或在 fallback/degraded 路径为 `partial`）。

```json docs-smoke:mcp-recoverable-request
{
  "name": "repo_nav_locate",
  "arguments": {
    "repoPath": "{{REPO_ROOT}}",
    "question": "Find an intentionally absent docs smoke marker.",
    "terms": ["repo_nav_docs_smoke_marker_that_does_not_exist_7f9c"]
  }
}
```

### 类型化错误

```json docs-smoke:mcp-error-request
{
  "name": "repo_nav_locate",
  "arguments": {
    "repoPath": "{{REPO_ROOT}}",
    "question": "Invalid request example.",
    "terms": []
  }
}
```

三类调用都同时返回 `structuredContent` 与等价的 JSON text content；只有 `ok=false` 时 `isError=true`。
