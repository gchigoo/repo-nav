---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# LocateStatus transition matrix 证据

- `LOCATE_TRANSITION_ROW_IDS` 固定十个 predicate rows：四类 tool error、caller abort、internal deadline、backend unavailable special、coverage gap、verified evidence 与 verified no-result。
- `evaluateLocateStatus` 的复合优先级为 timeout → backend-unavailable special → coverage gap → ok/no_result；tool errors 位于 EvidencePack pipeline 外，由同一 completeness inventory 追踪。
- `BackendSearchResult.complete=false` 只令 strategy incomplete，不伪造 `MAX_FILES_REACHED`；fallback complete 可关闭 primary incomplete。
- hit-unverified + fallback complete → `no_result`；fallback unavailable → `backend_unavailable`。
- caller abort 无论已有证据与否均为 timeout 且不建议 retry；engine-owned deadline 在 timeoutMs 未达 30 秒上限时建议 retry，到上限时不建议。
- `LocateAbortCoordinator` 使用 first-writer-wins 锁定 caller/deadline 来源；deadline-first/caller-later 与 caller-first/deadline-later 都不会被后到事件改写。
- CodeGraph 多 hit 核验中途 abort 时保留 abort 前已完成的 confirmed/candidate，不再走固定空数组的 early return。
- backend 自身固定 process timeout 只形成 backend unavailable/coverage gap，不伪装成 caller-adjustable engine deadline，也不产生 `RETRY_WITH_HIGHER_LIMIT`。
- MCP host 不再创建与 engine 竞争的 request timer；deadline ownership 唯一属于 Evidence Engine，SDK/host shutdown signal 才是 caller abort。
- 验证：CMD-STATUS → 13 passed；包含真实 1 秒 engine-owned deadline、CodeGraph caller/deadline evidence-preservation integration。
