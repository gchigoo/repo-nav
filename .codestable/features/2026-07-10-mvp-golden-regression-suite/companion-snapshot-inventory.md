# Companion Snapshot Inventory

每个 success manifest 由同一 `GoldenCaseEvaluator` 读取 `testkit/expected/{case-id}.json` 并对完整 stable projection 做 deep exact comparison。

共 23 项：

- alias-candidate
- backend-unavailable
- codegraph-failed
- codegraph-global-abort-no-fallback
- codegraph-hit-unverified
- codegraph-incomplete
- codegraph-local-timeout-fallback
- codegraph-missing
- codegraph-no-result
- codegraph-secondary-provenance-table
- codegraph-symbol-complete-no-fallback
- exclusion-summary
- false-confirmation-decoys
- foundation-success
- mcp-source-field-mapping
- ripgrep-failed
- ripgrep-incomplete
- ripgrep-timeout
- ripgrep-unavailable
- sibling-candidate
- sibling-false-positive
- source-field-mapping
- text-engine-baseline

Normalization 仅改写 public `repositoryRoot` 为 `<REPOSITORY_ROOT>`；其他 public 字段完整保留。缺 snapshot、孤儿 snapshot、manifest ID 重复均由 `fixture-completeness` 阻塞。
