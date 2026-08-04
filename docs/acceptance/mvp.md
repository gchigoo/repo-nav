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

## 产物盘点

- CLI：`dist/tools/cli/main.js`，package bin 名称 `repo-nav`。
- MCP：`dist/main.js`，package bin 名称 `repo-nav-mcp`。
- API reference：`docs/reference/repo-nav-locate.md`。
- Docs smoke：`test-artifacts/docs/docs-smoke-v1.json`。
- Feature 证据：`docs/superpowers/archive/codestable/features/2026-07-10-debug-cli-mcp-guide/`。
