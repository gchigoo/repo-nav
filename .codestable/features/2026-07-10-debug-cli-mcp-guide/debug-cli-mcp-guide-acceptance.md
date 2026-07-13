---
doc_type: feature-acceptance
feature: 2026-07-10-debug-cli-mcp-guide
status: passed
accepted: 2026-07-13
round: 1
---

# debug-cli-mcp-guide 验收

## 结论

**Accepted**。F9 approved design/checklist全部实现，独立 review Round 2 passed，最新 DoD 7/7、QA 与完整 MVP aggregate全部通过。

## Acceptance coverage

| Contract | Evidence | Verdict |
|---|---|---|
| CLI parser/exit/lifecycle | strict pre-bootstrap parser、canonical/safe outputs、context close failure/abort/exception tests | passed |
| locate semantics reuse | `REPOSITORY_EVIDENCE_SERVICE` + shared `createLocateToolOutput`；service throw canonical error + exit 1 | passed |
| bounded probe | reader root + ordered backend health；redacted root；无 EvidencePack/index mutation | passed |
| shared Golden | F8 registry + shared Vitest selection/evaluator；process-tree-safe summary；primary selector required | passed |
| executable MCP docs | production `dist/main.js` tools/list + success/recoverable/error parity | passed |
| executable CLI docs | real help/locate/probe/golden binaries、exit/schema/stderr checks | passed |
| schema/acceptance drift | generated schema projection deep exact、retired fields blocked、exact command/artifact inventory | passed |
| full regression | 168 unit、64 active Golden + 1 conditional skip、39 MCP、docs passed | passed |

## Deliverables

- Binaries：`repo-nav-mcp` → `dist/main.js`；`repo-nav` → `dist/tools/cli/main.js`；local script `npm run repo-nav -- debug ...`。
- CLI：`tools/cli/{parser,contracts,execute,main}.ts`。
- Docs runner：`testkit/docs/`；runtime report `test-artifacts/docs/docs-smoke-v1.json`。
- Public docs：`docs/getting-started-mcp.md`、`docs/debug-cli.md`、`docs/reference/repo-nav-locate.md`、`docs/acceptance/mvp.md`。
- Stable evidence：implementation/review/QA、command/lifecycle/import/docs reports、DoD/gate JSON与 aggregate log都在本 feature目录。

## Architecture / requirement delta

- `.codestable/architecture/` 已回填 Debug CLI、Executable docs、process-tree-safe Golden/docs adapter与代码锚点。
- `source-of-truth-evidence` requirement 标记为 implemented，由 completed `repo-nav-mvp` roadmap 实现。
- Roadmap 九项全部 `done`；goal-state F1–F9 全部 `accepted`，goal 标记 completed。

## MVP boundary

F5 minimal loop只证明受控候选闭环，不等于发布；本次 F9 以 F7 guardrails、F8 full Verification Kit和 F9 CLI/docs/aggregate证据完成 publishable MVP candidate。仍不包含 UI、HTTP/remote service、认证、index mutation、代码修改或长期探索状态。

## Residual risk

- CLI flags/display 是本地 debug surface，不是 MCP wire API 的稳定等价面；application semantics保持同源。
- F8 的 1 个 conditional skip 为明确不适用 case；全部 core paths已有 active evidence。
