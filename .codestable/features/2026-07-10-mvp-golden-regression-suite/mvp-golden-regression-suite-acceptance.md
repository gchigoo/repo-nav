---
doc_type: feature-acceptance
feature: 2026-07-10-mvp-golden-regression-suite
status: passed
accepted: 2026-07-13
round: 1
---

# mvp-golden-regression-suite 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-13
> 关联方案：`.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`

## 1. 接口契约核对

- [x] `GoldenCaseEvaluator` 是 success/error manifest expectation 的唯一实现；service 与真实 MCP stdio adapter 只构造 observation。
- [x] 每个 success manifest 都有 `testkit/expected/{case-id}.json` companion，23/23 exact 配对；完整 public projection deep exact。
- [x] normalization 只替换 `repositoryRoot`；class/reason/ID/order/excerpt/promotion/provenance/coverage/nextActions 不被忽略。
- [x] `McpLifecycleCase` 保持独立 schema/runner；production case 对不可观测 context/children 返回 `null`，instrumented probe 才返回真实布尔值。
- [x] `--all`、group aliases、case selection 与 Golden-only `--report-performance` 已进入正式 runner surface。
- [x] production `LocateRequest` / `LocateResult` / MCP public schema 与 `src` 行为未因 snapshot/testkit 改动。

## 2. 行为与决策核对

- [x] manifest 语义断言与 companion full projection 形成两层 exact contract；unexpected evidence、order、forbidden ID、coverage/exclusion、action/promotion/provenance/parity mutations 均失败。
- [x] 79 个 enum/code owner 绑定 actual companion observation、executable schema probe 或逐 reason-code negative mutation；completeness 禁止自 owner，无关已注册 owner mutation 会失败。
- [x] fixture families 覆盖 classification、candidate、backend transitions、security/redaction、limits/final status、protocol/errors 与 lifecycle。
- [x] lifecycle probe 导入真实 Nest `AppModule`、真实 MCP host 与真实 `NodeSafeProcessRunner`，用 context marker + direct/descendant PID 验证 shutdown；leak/timeout/nonzero/spawn-error 分支统一末端 cleanup。
- [x] synthetic config 固定 seed 20260710、1000 files、50 modules、10 mappings、200 decoys、500/350/150 size distribution；warmup 1 + measured 5。
- [x] correctness/config/corpus/projection/cleanup 是 blocking；timing 只生成 environment-aware trend，不设单次硬阈值。
- [x] 明确不做保持：无真实业务源码/网络/工作 repo index mutation；lifecycle 不伪装 GoldenCase；test 不自动覆盖 committed baseline；无 production snapshot 特判。
- [x] 挂载点反向核对：新增引用仅位于 `testkit/contracts`、runner registry、Golden/MCP specs、manifests/snapshots、performance 与报告；拔除这些挂载点不会在 production `src` 留残余。

## 3. 验收场景核对

- [x] **S1 shared evaluator**：DoD evaluator 8/8；43 public field mutations、逐 confirmed/candidate reason-code false-positive、success/error parity 全通过。
- [x] **S2 classification/candidate**：family 聚合命令通过，exact class/role/reasons/promotion 与 decoy forbidden guards 有证据。
- [x] **S3 backend/security/status**：CodeGraph/ripgrep transitions、五类 status、六类 limits、四类 exclusions/redactions 与 typed errors 均有 owner/case。
- [x] **S4 protocol/lifecycle**：37 active protocol/lifecycle tests passed；context/children 正向、skip marker、deliberate leak、forced timeout/nonzero PID/temp cleanup 均运行验证。
- [x] **S5 completeness/full suites**：completeness targeted 2 passed；full unit 158/158、Golden 64 active + 1 intentional conditional skip、MCP 39/39。
- [x] **S6 synthetic baseline**：5 次 projection hash 均为 `8d5a229c...`；status partial、confirmed/candidates 10/10、`MAX_FILES_REACHED`、cleanup 全 true。
- [x] Review round 3 `passed`；QA round 1 `passed`；failed/blocked 均为 none。
- [x] scope gate、DoD runner 7/7 与 evidence pack 均 `passed`；provider unavailable 项没有承载 core evidence。

## 4. 术语与架构一致性

- Execution runner、GoldenCaseEvaluator、Lifecycle runner、Completeness report 与 Performance signal 在 design、testkit、review、QA 和 architecture 中一致。
- `.codestable/architecture/system-repo-nav-foundation.md` 已回填 F8 当前现状：exact evaluator、machine-verified ownership、真实 lifecycle probe、fixed synthetic baseline 与 runtime artifact boundary。
- `ARCHITECTURE.md` 索引摘要已同步；没有提前写入尚未实现的 F9 debug CLI/operator guide。
- 代码锚点已覆盖 evaluator/projection/completeness/lifecycle/synthetic 主入口，architecture 不依赖历史 design 才能读懂当前 Verification Kit。

## 5. 领域影响盘点

- 本 feature 只新增验证架构术语，不改变业务 bounded context；`requirements/CONTEXT.md` 无需新增业务词汇。
- Exact projection、machine-verified completeness、probe-only lifecycle observation 与 baseline review boundary 是长期技术约束，已进入 architecture；可后续按需走 `cs-decide/cs-keep`，本次不越权代写 ADR。
- 没有新增数据库、Redis、网络服务、权限、身份、公开 HTTP API 或 production dependency。

## 6. Requirement Delta / Clarification

- Requirement `source-of-truth-evidence` 保持 `draft`，本轮不修改 requirement 文件。
- F8 已形成发布候选级 regression/lifecycle/performance 门禁，但 F9 debug CLI、MCP 安装/API/operator guide 尚未完成；不能提前把完整 MVP capability 升级为 current。
- 当前没有 owner-approved capability-boundary delta；本轮只机械回写 architecture 与 roadmap 已落地状态。

## 7. Roadmap / Goal 回写

- [x] `repo-nav-mvp-items.yaml` 的 `mvp-golden-regression-suite` 从 `in-progress` 改为 `done`。
- [x] `repo-nav-mvp-roadmap.md` 第 8 条同步为 `done`；F9 保持既定 `in-progress`。
- [x] `goal-state.yaml` 中 F8 为 `accepted`，`current_feature_index: 8`；F9 feature record 仍为 `pending`，待 F8 scoped commit 后推进。
- [x] `goal-features/mvp-golden-regression-suite.md` frontmatter 为 `accepted`。
- [x] Checklist S1-S6=`done`，C1-C12=`passed`；implementation status=`completed`。

## 8. Attention / 知识出口盘点

- Attention 候选：在 Windows 上让 `codestable-dod-runner.py` 使用默认 `COMSPEC` 执行含 `&&` 的 DoD；强制把 `COMSPEC` 指向 PowerShell 会破坏子进程命令解析。是否写入 attention 由后续 `cs-note` 查重决定。
- Learning/decision 候选：observer 未安装 probe 时必须表达“未观测”而非推断 true；enum coverage 必须绑定可执行事实而非 owner 名称。已在 review/architecture 记录，可后续沉淀。
- 无用户指南/API reference 更新：公开产品表面未变；F9 统一负责 debug CLI/MCP guide。

## 9. 已知遗留

- Lifecycle PID marker 在外层进程极端异常时存在截断/PID reuse小窗口；正常、leak、timeout、nonzero 路径已有真实清理证据。
- Synthetic timing 只代表当前 Windows/Node/ripgrep 与受控 corpus，不是 monorepo SLA。
- `archguard` / `meta-cc` provider 与 OCR endpoint 不可用；独立 Task agent、exact diff 与完整运行 suites 已替代核心验证。
- Runner argument parser 目前主要由正式命令入口覆盖，尚无独立 parser mutation unit；不影响已执行的 `--case/--group/--all/report-performance` 契约。

## 10. 最终审计

- 原始契约：重读 design 第 0-4 节、checklist C1-C12、review/QA focus；没有未处理偏差。
- 聚合命令：在 roadmap/architecture/checklist 最终状态下重跑 build/typecheck、158 unit、64 active Golden + 1 intentional skip、39 MCP，全部 exit 0。
- 交付物：shared evaluator、23 companion snapshots、79 owner completeness、fixture families、真实 lifecycle probe、synthetic baseline/runtime report、review/QA/acceptance 与 architecture/roadmap 回写均落盘。
- 完整工作区：scope gate 对当前 F8 diff `passed`；新增 acceptance/architecture/roadmap 路径均在批准前缀。
- 清洁度：`git diff --check`、marker scan、strict typecheck/build、YAML validation 均通过；无 debug、临时 TODO/FIXME/XXX、注释掉实现、unused import 或方案外文件。
- 证据诚实度：build/typecheck/full suites/DoD 为 `re-verified`；targeted family/completeness/performance 可 `trust-prior-verify` 于同一最终代码版本；provider unavailable 不伪装通过。
- 知识出口：稳定结构已进入 architecture；attention/learning 候选已登记，未擅自写用户长期规则。
- Goal 授权：沿用用户对完整 roadmap goal 自主推进、review-fix、acceptance 与 scoped commit 的批准。
- 结论：通过；12 个 acceptance checks 全部 `passed`，F8 可 scoped commit 后进入 F9。
