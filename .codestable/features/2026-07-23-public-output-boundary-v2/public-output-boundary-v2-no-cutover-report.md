---
doc_type: feature-no-cutover-report
feature: 2026-07-23-public-output-boundary-v2
status: passed
---

# F1 no-cutover import inventory

## 1. Registered gate

`test/unit/public-output-v2-no-cutover.spec.ts` 通过
`testkit/contracts/public-output-v2-import-inventory.ts` 构建相对 TypeScript import
graph。deliberate synthetic mutation 先证明 gate 能发现 production → v2 两跳可达路径。

## 2. Production roots

- `src/index.ts`
- `src/contracts/index.ts`
- `src/evidence/repository-evidence-engine.ts`
- `src/mcp/locate-tool-output.ts`
- `src/mcp/repo-nav-mcp-server.ts`
- `tools/cli/main.ts`
- `tools/cli/execute.ts`

禁止目标为 `src/contracts/v2/**` 与 `src/evidence/public-output/**`。

## 3. Result

`npm test -- --group public-output-v2 --case no-cutover-import-inventory`
返回 2 passed：synthetic mutation 被发现，真实 production roots 的 forbidden
reachability 为零。

full MCP 39/39 与 docs smoke 同时通过，production schema、service、MCP、CLI、docs
继续观察 v1。F1 未修改 package barrel 或 production source。
