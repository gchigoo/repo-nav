---
doc_type: feature-acceptance
feature: 2026-07-10-codegraph-fallback-orchestration
status: passed
accepted: 2026-07-13
round: 1
---

# codegraph-fallback-orchestration 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-13
> 关联方案：`.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-design.md`

## 1. 接口契约核对

- [x] `RepositoryBackendsModule` 以冻结顺序提供 `[CodeGraphBackend, RipgrepBackend]`，CodeGraph binary missing 不会让 provider 从集合消失。
- [x] `BackendSearchRequest` 显式携带 terms/anchors/negativeTerms/layers/maxHits；`BackendSearchResult` 只增加内部 `canSkipFallbackIfVerified` metadata，没有修改 public MCP schema version。
- [x] CodeGraph status/query 全部经 `NodeSafeProcessRunner` 的 executable/argv/cwd/budgets/AbortSignal 执行；production 没有 shell 拼接。
- [x] `parseCodeGraphStatus` / `parseCodeGraphQuery` 只消费 stdout JSON；required fields wrong/missing fail closed，additional fields 保持 forward-compatible，stderr/ANSI 不进入协议值。
- [x] Evidence Engine 统一拥有 fallback、current-file verification、merge/classify/candidate/status/coverage；backend adapter 不自行裁决 public status。

## 2. 行为与决策核对

- [x] Probe binary/index/status observations 唯一映射 available/missing/unavailable/error；1.1.6 pending/worktree/reindex signals 映射 possibly-stale，clean 仍不伪造 fresh。
- [x] Query plan 按 explicit symbol anchors → identifier terms 稳定去重；每项独立 query，共享 total `maxHits`，remaining=0 不 spawn。
- [x] file/table/route/term anchors、negative terms、layers、case-insensitive 与 non-identifier terms 明确使 CodeGraph strategy incomplete。
- [x] 只有单一 exact case-sensitive explicit symbol intent、plan complete、hit 当前文件核验并分类为 exact implementation/definition 时可跳过 ripgrep。
- [x] 多 symbol、missing/no-result/failed/incomplete/local timeout/unverified 均在 global signal 未 abort 时 fallback；caller/global abort ripgrep invocation=0。
- [x] Query spawn/nonzero/malformed 为 failed + `BACKEND_PROCESS_FAILED`；timeout/abort 为 failed + `BACKEND_ABORTED`；coverage `indexState=error`。
- [x] primary-only 无 secondary reason；ripgrep-only 可生成唯一 `SECONDARY_BACKEND_HIT`；merged 只合并 provenance，不生成第二个 public evidence。
- [x] fallback 完成可补足 primary incomplete；global files/result limits 仍独立决定 partial，backend 局部 incomplete 不机械污染最终 status。

## 3. 明确不做的反向核对

- [x] Production 不调用 CodeGraph index init/update/delete；真实 init 只存在于 owned system-temp smoke repository。
- [x] 不解析 `explore` / `node` / stderr 人类文本，不实现 callers/impact。
- [x] CodeGraph hit 不绕过 RepositoryReader verification、classifier、candidate mutual exclusion 或 public ID/stable sort。
- [x] 没有引入 daemon/service ownership、数据库/Redis 持久化、新 MCP tool 或 public schema version。

## 4. 验收场景核对

- [x] **S1 probe/parser**：8 个定向 tests 通过；1.1.6 missing/clean/stale、extra fields、missing required、query spawn/timeout 与 stderr ignore 均覆盖。
- [x] **S2 query planner**：6 个 tests 通过；Unicode identifier、stable order/dedup、unsupported dimensions、remaining budget、fuzzy raw result 与单 symbol skip contract 均覆盖。
- [x] **S3 fallback orchestration**：10 个 named cases 的 11 条 assertions 通过；global/local abort、multi-symbol guard、attempt/index/fallback/provenance/status 可判定。
- [x] **S4 real smoke**：当前实测 `codegraph 1.1.6`，temp synthetic repo index/probe/query success；owned child settled、temp tree 删除、工作 repo 无 `.codegraph/` mutation。
- [x] Review Round 2 passed；QA Round 1 passed；failed/blocked 均为 none。
- [x] Build/typecheck、138 unit、39 active Golden + 1 conditional skip、31 MCP 全部通过；DoD 6/6、scope/evidence gates passed。

## 5. 术语与架构一致性

- CodeGraph probe、query plan、strategy complete、fallback、primary/secondary provenance 在 design、实现、review、QA 与 architecture 中一致。
- `.codestable/architecture/system-repo-nav-foundation.md` 已从 F5 ripgrep-only 现状机械更新为 F6 `[codegraph, ripgrep]` collection、query planner、fallback ownership、coverage/index state 与 temp-only index policy。
- Architecture index 摘要已同步；文档仍只记录当前落地能力，没有提前写入 F7 output guardrails。
- 长期决策候选：production 不拥有 index lifecycle、single-symbol conservative skip、machine JSON fail-closed/additional-field compatible。具备 ADR/constraint 价值，但本次 acceptance 不越权代写 ADR。

## 6. Requirement Delta / Clarification

- Requirement `source-of-truth-evidence` 保持 `draft`，本轮不修改 requirement 文件。
- F6 完成 CodeGraph-primary/ripgrep-fallback 的结构化发现闭环，但完整 output budgets/redaction/status guardrails、发布级 regression suite 与操作指南仍由 F7-F9 完成，不能提前把完整 requirement 标为 current。
- 当前没有 owner-approved capability-boundary delta，因此只回填 architecture 与 roadmap 当前状态。

## 7. Roadmap / Goal 回写

- [x] `repo-nav-mvp-items.yaml` 的 `codegraph-fallback-orchestration` 从 `in-progress` 改为 `done`。
- [x] `repo-nav-mvp-roadmap.md` 第 6 条同步为 `done`，仍记录 observed 1.1.6 与 runtime compatibility 边界。
- [x] `goal-state.yaml` 中 F6 为 `accepted`，`current_feature_index: 6`，F7-F9 保持 pending。
- [x] `goal-features/codegraph-fallback-orchestration.md` frontmatter 为 `accepted`。
- [x] Checklist S1-S4=`done`，C1-C12=`passed`。

## 8. 已知遗留

- Windows 当前 npm shim 已实测；其他 portable/native 安装布局与 POSIX binary 路径仍需后续环境矩阵。
- 未知未来 CodeGraph JSON version 会 fail closed 并 fallback；新增支持必须用 versioned fixture 与 live smoke 证明。
- Status 与 current-file verification 之间有竞态，clean status 保持 freshness unknown；这只会导致保守 fallback/少召回，不会放宽 confirmed。
- F7 负责敏感 excerpt redaction、完整 output limits/status/nextActions parity；F8/F9 负责发布级回归与 CLI/MCP 使用指南。

## 9. 最终审计

- 验证来源：独立 subagent review Round 2 passed、QA Round 1 passed、evidence pack、DoD results 与 scope gate。
- 核心证据：fake fault transitions 与真实 indexed temp-repo success/cleanup 均实际运行，没有以 mock 代替外部 CLI success path。
- 清洁度：`git diff --check` 无 whitespace error；production/test/testkit 无 debug、TODO/FIXME/XXX、unused import；工作 repo 无 `.codegraph/`。
- 交付物：adapter/parser/planner/engine orchestration、versioned fixtures、ten manifests、health/query/transition/live-smoke reports、review/QA/acceptance/architecture/roadmap 均落盘。
- 结论：通过；12 个 acceptance checks 全部 `passed`，F6 可 scoped commit 后进入 F7。
