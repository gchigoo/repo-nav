---
doc_type: feature-acceptance
feature: 2026-07-10-repository-evidence-foundation
status: passed
accepted: 2026-07-13
round: 1
---

# repository-evidence-foundation 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-13
> 关联方案：`.codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-design.md`

## 1. 接口契约核对

**接口示例逐项核对**：

- [x] `src/contracts/`：LocateRequest/LocateResult/EvidencePack、reason/status enums、ports 均由 Zod runtime schema + inference 导出；与 roadmap 4.1-4.7 对齐。
- [x] `src/contracts/request.ts`：NFKC/UTF-8 budgets/smart case、stable dedupe、file-only POSIX canonicalization 和 limits defaults 有正反 tests。
- [x] `src/contracts/evidence-id.ts`：discovery/public canonical key、完整 SHA-256 ID、role priority 与六级稳定排序有直接 contract tests。
- [x] `src/runtime/tokens.ts`：四个 `Symbol.for` runtime tokens 字符串逐项一致。
- [x] `testkit/contracts/`：`GoldenCase = success | error` 与独立 `McpLifecycleCase` 没有可选字段混合。

**名词层“现状 → 变化”核对**：

- [x] no-code baseline 已变为可 build/typecheck 的 NestJS 11 / TypeScript 5.8 / Zod 4 工程。
- [x] production `src/**` 只依赖 contracts/runtime，不依赖 `testkit/**`、`test/**` 或 `@nestjs/testing`。
- [x] test factory 从同一 AppModule 通过三个 `overrideProvider` seams 替换外部状态。

**流程图核对**：

- [x] 依赖节点均有代码落点：`AppModule → EvidenceModule → RepositoryBackendsModule/contracts`；`test/testkit → src`。

## 2. 行为与决策核对

**需求摘要与关键决策**：

- [x] `createRepoNavApplicationContext()` 只创建 application context，不启动 HTTP/stdio production listener。
- [x] backend collection 当前解析为 frozen empty readonly array。
- [x] 未配置 reader/service 的所有方法调用都抛 `RepoNavBootstrapIncompleteError`，不 fabricated EvidencePack。
- [x] `MCP_STDIO_HOST` 只声明 token，没有 provider；F1 没有 `main.ts`。
- [x] unit/Golden/MCP scripts 均启动真实 Vitest/child process，失败和未知选择器返回非零。
- [x] Golden success/error 共用 evaluator；success/error structured/text parity 都有负例。
- [x] MCP lifecycle harness 只验证 synthetic JSON-RPC frames、exit、timeout 和 shutdown，不冒充 production MCP host。

**明确不做反向核对**：

- [x] grep 确认没有真实 RepositoryReader、Ripgrep/CodeGraph backend、Evidence Engine、`registerTool`、HTTP/Fastify listener、LLM、数据库、Redis 或持久化。
- [x] 没有恢复旧 session/trace/impact/plan 表面。

**挂载点反向核对与拔除沙盘**：

- [x] package scripts、`src/index.ts`/contracts/runtime、AppModule/context factory、testkit runners/manifests 是全部挂载点。
- [x] 反向 grep 未发现清单外 production 引用或 production→testkit 依赖。
- [x] 沙盘推演：移除 package scripts与 `src/test/testkit` 新树、lockfile/tsconfig 后 feature 完全卸载；只剩 CodeStable 历史产物与 roadmap 状态，无隐藏 runtime 残留。

## 3. 验收场景核对

- [x] **S1 五个真实入口**：build/typecheck/unit/Golden/MCP 全部 exit 0；未知 unit/MCP selector exit 1。
- [x] **S2 schema/normalization/ID/排序**：12 contract tests + acceptance function probe通过，覆盖 literal、byte、case、enum、BackendHealth、ID、排序、anchor path。
- [x] **S3 DI fail-closed/override**：2 Nest integration tests 通过，context create/close、empty frozen collection、exception、MCP token absent与三 seam override均被观察。
- [x] **S4 Golden contract**：success/error YAML、required/forbidden/exclusion和两类 parity 共 5 evaluator tests 通过。
- [x] **S5 lifecycle contract**：schema、clean frames、graceful shutdown、timeout、JSON/文本/空行污染共 5 lifecycle tests 通过。
- [x] Review QA focus：Unicode/标点数组 sort、`a/../../b`/root path、`a/../b` 和 symbol backslash 由额外函数 probe复核。
- [x] QA 来源：`repository-evidence-foundation-qa.md`，`status=passed`；failed/blocked none。
- [x] Evidence pack、DoD、Gate Results：blocking none；5 个 core command 全 pass。

## 4. 术语一致性

- `EvidencePack`、`GoldenCase`、`McpLifecycleCase`、`RepositoryEvidenceService`、`RepositoryReader`、`RepositorySearchBackend` 在 design、roadmap、代码与 architecture doc 中命名一致。
- `confirmed` / `candidate`、reason/status enums 与 schema v1 constants 一致。
- 禁用的真实 engine/backend/host 术语没有被 placeholder 冒充；默认类明确使用 `Unconfigured` 前缀。

## 5. 领域影响盘点

- [x] 已 backfill `.codestable/architecture/system-repo-nav-foundation.md` 与索引，只记录当前 schema/DI/testkit 现状并带代码锚点。
- [x] 新术语候选：EvidencePack、Verification Kit、fail-closed seam；已进入 architecture 术语节。若需要长期领域 glossary，roadmap 完成时建议用 `cs-domain` 统一归并 CONTEXT。
- [x] 结构性选择候选：Zod 单一 runtime schema、四 Symbol tokens、production/testkit 单向依赖；具备 ADR 价值，但当前只有 owner-approved design 来源，acceptance 不代写 ADR，建议 roadmap 收尾统一 `cs-domain/cs-decide`。

## 6. requirement delta / clarification 回写

- Requirement：`source-of-truth-evidence` 仍为 `draft`。
- F1 是 goal spec 明确标注的 non-functional foundation，没有完成任何 requirement 用户故事，也没有改变 pitch/边界；把 draft 升为 current 会制造虚假能力状态。
- 本 feature 没有 capability-boundary delta，因此不自由改写 requirement；等完整 RepoNav MVP roadmap 具备真实 locate capability并有 owner-approved delta 后再机械升级/登记 implemented_by。

## 7. roadmap 回写

- [x] `.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml` 的 `repository-evidence-foundation` 已由 `in-progress` 改为 `done`，YAML 校验通过。
- [x] `repo-nav-mvp-roadmap.md` 第 5 节对应条目已同步为 `done`。
- [x] `goal-state.yaml` 当前 feature 为 `accepted`，`current_feature_index: 1`。
- [x] `goal-features/repository-evidence-foundation.md` frontmatter 同步为 `accepted`。

## 8. attention.md 候选盘点

- 候选：Windows 环境变量不能包含 NUL，多值 runner selection 必须使用 JSON string array；这是后续 runner 扩展可能重复踩到的环境约束。
- 本轮不直接改 attention；在 roadmap 文档整理阶段由 owner 决定是否通过 `cs-note` 收录。
- 其他知识出口：scope gate 应始终 `shell=False` + fail closed，适合 roadmap 收尾沉淀为 learning/constraint。

## 9. 遗留

- F2/F3 接入首个真实 backend 时，把当前 empty `useValue` 演进为 factory、有序/frozen assembly，并加顺序 tests（REV-006 residual risk）。
- F2 process safety 继续覆盖 git executable OSError 的结构化 gate error与 child kill 后第二重 close deadline。
- 当前没有真实 reader/backend/engine/MCP host 是设计边界，不是未完成的 F1 验收缺口。

## 10. 最终审计

- 验证证据来源：`repository-evidence-foundation-qa.md`
- Evidence sources：`repository-evidence-foundation-evidence-pack.md`、`repository-evidence-foundation-dod-results.json`、`repository-evidence-foundation-gate-results.json`
- 聚合命令：最终工作区重跑 `npm run build`、`npm run typecheck`、unit 17 tests、Golden 6 tests、MCP 6 tests，全部 exit 0。
- 场景复核：re-verified 8 / trust-prior-verify 0。
- 交付物复核：package/lockfile、src contracts/runtime/app skeleton、testkit contracts/manifests/runners、tests、review/QA/evidence、architecture、roadmap/goal-state 均真实存在。
- 完整工作区复核：`git status` 的 tracked、untracked、unstaged 均纳入 scope gate；staged none；scope `acceptance.before_done` passed。
- diff 清洁度：`git diff --check`、debug/TODO/FIXME/unused/reverse-dependency scans通过；scope gate 三条 warning是其 `CLEAN_PATTERNS` 自扫描字面量。
- 文档校验：checklist/items/goal-state YAML与 architecture frontmatter目录校验全部通过。
- 知识沉淀出口：attention候选 1 条、learning/constraint候选 1 条、ADR候选 1 组；均已分流到第 5/8/9 节，未擅自改长期记忆。
- 结论：通过；所有 11 checks 为 `passed`，无核心 residual gap。
