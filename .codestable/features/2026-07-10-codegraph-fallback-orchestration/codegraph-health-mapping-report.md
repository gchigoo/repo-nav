---
doc_type: feature-evidence
feature: 2026-07-10-codegraph-fallback-orchestration
status: current
---

# CodeGraph probe / parser 映射证据

- 实测 binary：`codegraph 1.1.6`。
- Probe argv：`codegraph status --json <repositoryRoot>`，经 `NodeSafeProcessRunner`、`shell:false`、受控 stdout/stderr/timeout 执行。
- Probe：`initialized=false` → `missing/CODEGRAPH_INDEX_MISSING`；spawn error → `unavailable/CODEGRAPH_UNAVAILABLE`；abort/local timeout → `unavailable/BACKEND_ABORTED`；nonzero/malformed required JSON → `error/BACKEND_PROCESS_FAILED`。
- Query：spawn/nonzero/malformed JSON → `error/BACKEND_PROCESS_FAILED`；abort/local timeout → `error/BACKEND_ABORTED`。因此 query 已发生后的失败在 coverage 中唯一映射为 `status=failed`、`indexState=error`，不会伪装成 provider unavailable。
- initialized 1.1.6 的 `pendingChanges`、`worktreeMismatch`、`index.reindexRecommended` 映射为 `possibleStaleIndex`；未来版本缺 optional freshness fields 时保持 available/unknown。
- Query parser 只消费 stdout JSON array 的 `node.filePath/name/qualifiedName/startLine/endLine`，additional fields 宽容，required field wrong/missing fail closed；stderr/ANSI 不参与协议值。
- 验证：`npm test -- --group codegraph-probe --group codegraph-parser` → 8 passed；`npm run typecheck` → exit 0。
