# RepoNav MVP 验收

## 完整验证命令

```json docs-smoke:acceptance-contract
{
  "commands": [
    "npm run build",
    "npm run typecheck",
    "npm test",
    "npm run test:golden -- --all",
    "npm run test:mcp -- --all",
    "npm run test:docs",
    "npm run build && npm run typecheck && npm test && npm run test:golden -- --all && npm run test:mcp -- --all && npm run test:docs"
  ],
  "artifacts": [
    "docs/superpowers/archive/codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-evidence-pack.md",
    "docs/superpowers/archive/codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-gate-results.json",
    "docs/superpowers/archive/codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-dod-results.json",
    "test-artifacts/docs/docs-smoke-v1.json"
  ],
  "minimalLoop": "F5 proves the candidate classification loop only; it is not a publishable MVP by itself.",
  "publishableCandidate": "F9 requires build, typecheck, unit, Golden, MCP, executable docs, review, QA, and acceptance evidence."
}
```

F5 的 minimal loop 只证明候选分类闭环；它本身不代表可发布。F9 只有在所有聚合验证、文档 smoke、独立 review、QA 与 acceptance evidence 完整后，才是 publishable MVP candidate。

上面的 machine-readable 区块保留 MVP 验收契约。当前 `2.0.0` candidate 还要求 `npm run lint`、`npm run format:check`、`npm run test:platform`、legacy-subpath absence、package smoke/closure、security audit、SBOM 与 fixture benchmark。真实 CodeGraph 测试位于独立的 `npm run test:integration:codegraph` surface，不属于普通 unit 前置条件。最新 CI 覆盖与 release-evidence 边界见 [`docs/project-status.md`](../project-status.md)。

## 产物盘点

- CLI：`dist/cli/main.js`，package bin 名称 `repo-nav`。
- MCP：`dist/main.js`，package bin 名称 `repo-nav-mcp`。
- API reference：`docs/reference/repo-nav-locate.md`。
- Docs smoke：`test-artifacts/docs/docs-smoke-v1.json`。
- Feature 证据：`docs/superpowers/archive/codestable/features/2026-07-10-debug-cli-mcp-guide/`。
