---
doc_type: feature-evidence
feature: 2026-07-10-codegraph-fallback-orchestration
status: current
---

# CodeGraph query plan / argv 证据

- Plan 顺序：explicit symbol anchors 先于 identifier-like terms；按 `(value, caseSensitive)` 稳定去重。
- Unicode identifier 使用 schema v1 grammar；non-identifier literal 不进入 query，并标记 `non-identifier-term`。
- file/table/route/term anchors、negative terms、layers 与 case-insensitive entry 都进入 `unsupportedDimensions`，使 strategy incomplete。
- 每个 entry 单独执行 `codegraph query --json --path <root> --limit <remaining> <value>`；所有 invocation 共享 total `maxHits`，remaining=0 不再 spawn。
- 只有 sensitive explicit-symbol-only、所有 terms exact 对应 symbol anchor 且无 unsupported dimension 时，plan 才声明 `canSkipFallbackIfVerified=true`；engine 仍需 verified confirmed 才能跳过 ripgrep。
- fuzzy raw result 同样消耗共享 total budget，不能因 exact filter 丢弃后让下一 entry 超额查询。
- 验证：`npm test -- --group codegraph-query-plan` → 6 passed；argv snapshot、remaining 3→2、limit=1 stop、fuzzy-budget 与 complete=false 均有断言。
