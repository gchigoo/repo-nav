---
doc_type: feature-review
feature: 2026-07-10-debug-cli-mcp-guide
status: passed
review_rounds: 2
---

# debug-cli-mcp-guide 独立实现审查

## Reviewer / scope

- Independent native agent：`/root/f2_code_review`。
- Baseline：`cdc86f48a2edf42fb7f1bbb4bb03921992a03f7d`。
- Inputs：approved design、checklist、review packet、全部当前 diff 与 targeted runtime evidence。

## Round 1 — changes requested

1. **P1 cleanup failure hidden**：`app.close()` reject 被吞，成功仍可能 exit 0。
2. **P1 Golden child-tree cleanup**：summary runner 只 kill direct Vitest child，可能遗留 workers。
3. **P1 locate semantics drift**：service throw 使用通用 CLI error而非 canonical tool policy。
4. **P2 acceptance artifact false positive**：docs 只检查 artifact 数量，不检查 inventory/path existence。
5. **P1 docs CLI timeout cleanup**：direct child kill/`exit` 读取可能绕过 CLI cleanup、遗留 descendants或截断 pipe。
6. **P2 locate thrown exit mapping**：canonical `INTERNAL_ERROR` 应保持，但 unexpected path 应 exit 1。
7. **P2 Golden selector bypass**：单独 `--report-performance` 会隐式执行 all，而非 usage exit 2。

## Fixes

- context close reject 现在 fail-closed，override 为安全 CLI internal output + exit 1。
- locate throw 复用 `internalLocateError` + `createLocateToolOutput`，保留 canonical JSON，明确 exit 1。
- Golden summary 与 docs child execution均复用 `NodeSafeProcessRunner`；docs 以 open-stdin wrapper 保持 context command可运行，timeout/abort由 process-tree grace/hard-kill/close deadline治理。
- acceptance artifact inventory exact 对账；三个 versioned artifacts 必须存在，runtime docs artifact由本次 runner生成。
- CLI Golden 必须含 `--all` / `--group` / `--case`，且 debug CLI 不暴露 `--report-performance`；performance-only 用例锁定 exit 2。

## Round 2 — passed

独立 reviewer 复核三项最后修改及相邻代码，结论：**Passed，0 P0–P2 findings**。接受最新 targeted typecheck、debug groups、clean `test:docs` 与 `git diff --check` evidence。
