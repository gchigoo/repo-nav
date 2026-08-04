---
doc_type: feature-evidence
feature: 2026-07-10-codegraph-fallback-orchestration
status: current
---

# CodeGraph fallback transition 证据

- Backend collection 固定 `[codegraph, ripgrep]`；CodeGraph binary/index missing 通过 attempt 显式表达，不移除 provider。
- missing/no-result/failed/incomplete/local-timeout/hit-unverified 均在全局 signal 尚未 abort 时执行 ripgrep；caller/global abort 只记录 CodeGraph attempt，ripgrep invocation=0。
- 只有单一 explicit symbol、complete + `canSkipFallbackIfVerified` + 当前文件核验无失败 + `EXACT_SYMBOL_ANCHOR` implementation/definition confirmed 时跳过 fallback；多 symbol intent 即使部分命中并核验成功也必须 fallback。
- fallback 完整时，CodeGraph 自身 `complete=false` 不直接制造全局 partial；全局 files/result limits 仍独立生效。
- Provenance 三格已验证：primary-only 无 secondary reason；secondary-only 生成唯一 `SECONDARY_BACKEND_HIT`；primary+secondary merged 只合并 `discoveredBy`，不生成第二 evidence/secondary reason。
- 验证：10 个命名 Golden transition cases 的 11 条断言全部 passed；attempt order、fallbackChecked、query failure status/index state、多 symbol 保守 fallback、exclusion、merged provenance 与 secondary exact set 均有断言。
