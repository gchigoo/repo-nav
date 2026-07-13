---
doc_type: feature-qa
feature: 2026-07-10-debug-cli-mcp-guide
status: passed
---

# debug-cli-mcp-guide QA

## Gate result

**Passed**。Independent review Round 2 passed 后，使用最新 working tree 重跑 DoD 7/7 与完整 aggregate，全部 exit 0。

## Command evidence

| ID | Command | Result |
|---|---|---|
| CMD-BUILD | `npm run build` | passed |
| CMD-TYPECHECK | `npm run typecheck` | passed |
| CMD-SHELL | `npm test -- --group debug-cli-shell --group debug-cli-lifecycle` | 7 active passed |
| CMD-LOCATE | `npm test -- --group debug-cli-locate` | 1 active passed |
| CMD-DIAG | `npm test -- --group debug-cli-probe --group debug-cli-golden` | 2 active passed |
| CMD-DOCS | `npm run test:docs` | passed |
| CMD-ALL | build + typecheck + unit + Golden + MCP + docs | passed |

Machine evidence：`debug-cli-mcp-guide-dod-results.json`（stage=`qa.after_review`）；完整 aggregate log：`aggregate-verification.log`。

## Full regression

- Unit：18 files，168/168 tests passed。
- Golden：11 files，64 active passed；1 个既有 conditional skip。
- MCP：9 files，39/39 passed，含真实 stdio、EOF/cancellation与 process-tree lifecycle。
- Docs：删除旧 runtime artifact 后从零执行，10 个登记 blocks、真实 MCP tools/list + success/recoverable/error、真实 CLI help/locate/probe/golden、schema/artifact/import drift全部 passed。
- Docs runtime observation：MCP success=`partial`、recoverable=`no_result`、error=`INVALID_INPUT`；四条 CLI transcript exit 0，stderr clean。

## Review-fix verification

- application close failure fail-closed exit 1。
- locate service throw canonical `INTERNAL_ERROR` stdout + unexpected exit 1。
- Golden/docs children由 `NodeSafeProcessRunner`管理完整 process tree。
- performance-only Golden selection在 runner前 usage exit 2。
- acceptance stable artifacts必须存在，runtime docs artifact由本轮重建。

## Residuals

- Golden 的 1 个 conditional skip 是 F8 已批准的不适用 forbidden-ID guard，不是 F9 环境缺口。
- CLI 是本地 debug surface；30 秒 Golden child预算与 flags/display 不构成 production MCP API 稳定承诺。
