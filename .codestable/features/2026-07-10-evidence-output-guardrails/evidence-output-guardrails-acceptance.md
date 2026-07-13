---
doc_type: feature-acceptance
feature: 2026-07-10-evidence-output-guardrails
status: passed
accepted: 2026-07-13
round: 1
---

# evidence-output-guardrails 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-13
> 关联方案：`.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`

## 1. 接口契约核对

- [x] `LocateStatusEvaluator` 只消费锁定的 abort source、final backend health、strategy completeness、evidence count 与 limits，按单表返回唯一 status。
- [x] `ResultBudgetSelector` 分别对 confirmed/candidate 做 canonical stable selection，输出 selected/truncated；arrival permutation 不改变保留项、ID 或顺序。
- [x] `EvidenceRedactor` 只处理已经分配 public ID 的 evidence location；file/symbol/lines 保持，raw discovery/hash material 不公开。
- [x] `SafePublicErrorFactory` 固定四类 code 的 safe message/recoverable/action；只有 `INVALID_INPUT + ADD_TERM` 是合法 action。
- [x] MCP serializer 对 application result 防御性重用 redaction/error policy，再由同一 parsed object生成 structuredContent、JSON text 与 `isError`。
- [x] Public schema 仍为 `1.0`，没有新增 tool、status/reason/backend 语义或 persistence。

## 2. 行为与决策核对

- [x] 状态优先级为 caller/deadline timeout → backend-unavailable special → partial coverage gap → ok/no_result；tool error 位于 success EvidencePack pipeline 外。
- [x] `LocateAbortCoordinator` first-writer-wins；deadline-first/caller-later 与 caller-first/deadline-later 不互相改写。
- [x] CodeGraph primary 多 hit verification 中途 abort 时，保留 abort 前完成的 verified evidence；caller 无 retry，internal deadline 未达 30000 才 retry。
- [x] Backend 固定 10 秒 process timeout 与 request `timeoutMs` 分层；独立 `BACKEND_ABORTED` 不产生 `TIMEOUT_REACHED` 或提高 request limit action。
- [x] `MAX_FILES/MAX_CONFIRMED/MAX_CANDIDATES` 只在实际 eligible work 被截断时记录；fixed file/excerpt caps 只产生 limit/exclusion，不建议突破。
- [x] Secret/connection/email-phone/oversized 四类 reason 使用确定性 matcher；单/双/backtick、template interpolation、malformed tail 和 cross-evidence 同值均按 fail-closed boundary 输出。
- [x] 明确不做项均保持：不新增 confidence、LLM、网络、index lifecycle、tool/persistence；不扩大 recall/candidate；不把 `no_result` 宣称为不存在。

## 3. 验收场景核对

- [x] **S1 transition matrix**：CMD-STATUS 13 passed；十 row inventory、hit-unverified 两分支、caller empty/evidence、deadline below/at max、真实 CodeGraph preservation 均覆盖。
- [x] **S2 limits/selection/actions**：CMD-LIMITS 3 passed；六类 limits、0/boundary/truncation、stable permutation 与 fixed no-retry均有证据。
- [x] **S3 all-surface redaction**：CMD-REDACTION 5 Golden + 1 real stdio MCP passed；Engine service、structured/text/protocol result/stderr forbidden scan 无原值。
- [x] **S4 tool errors**：CMD-ERRORS 5 selected tests passed；四类 code/recoverable/action/message/isError parity 与非法 action 删除均覆盖。
- [x] Review Round 3 passed；QA Round 1 passed；failed/blocked 为 none。
- [x] 最终代码状态下 build/typecheck、158 unit、47 active Golden + 1 conditional skip、32 MCP 全部通过；DoD 6/6、scope/evidence gates passed。

## 4. 术语与架构一致性

- Final status、caller-adjustable limit、fixed safety limit、redaction、safe public error、output parity 在 design、代码、review、QA 与 architecture 中一致。
- `.codestable/architecture/system-repo-nav-foundation.md` 已机械更新为 F7 现状：finalization policies、first abort source、stable budgets、双层 redaction/safe error、engine-owned deadline 与 diagnostics boundary。
- `ARCHITECTURE.md` 索引摘要已同步；没有提前写入 F8 regression evaluator/performance baseline 或 F9 CLI/guide。
- 结构性候选：first-writer-wins abort、ID-before-redaction、error/action whitelist 与 matcher-forbidden-corpus 同步，具备后续 decision/learning 价值；本次 acceptance 不越权代写 ADR。

## 5. 领域影响盘点

- 新名词均为技术实现术语，不改变业务 bounded context；`requirements/CONTEXT.md` 无需新增业务术语。
- Finalization/redaction/error boundary 是跨 feature 可复用的技术约束，已进入 architecture 当前地图；是否另行形成 ADR 交由后续 `cs-decide/cs-keep`，不阻塞本 feature。
- 没有新增数据库、Redis、外部服务、公开 HTTP API 或用户身份/权限概念。

## 6. Requirement Delta / Clarification

- Requirement `source-of-truth-evidence` 保持 `draft`，本轮不修改 requirement 文件。
- F7 已完成全状态/output guardrails，但发布级完整 regression/snapshot/completeness/performance baseline 与 debug/operator guide 仍由 F8-F9 承担，不能提前把完整 MVP capability 标为 current。
- 当前没有 owner-approved capability-boundary delta；只回填 architecture 与 roadmap 的已落地现状。

## 7. Roadmap / Goal 回写

- [x] `repo-nav-mvp-items.yaml` 的 `evidence-output-guardrails` 从 `in-progress` 改为 `done`。
- [x] `repo-nav-mvp-roadmap.md` 第 7 条同步为 `done`；F8/F9 保持其既定推进状态。
- [x] `goal-state.yaml` 中 F7 为 `accepted`，`current_feature_index: 7`，F8-F9 feature records 仍为 pending。
- [x] `goal-features/evidence-output-guardrails.md` frontmatter 为 `accepted`。
- [x] Checklist S1-S4=`done`，C1-C12=`passed`。

## 8. Attention / 知识出口盘点

- Attention 候选：Windows 下 `codestable-scope-gate.py` 通过 `cmd shell=True` 执行单引号 pathspec 会得到空 changed-files；本轮用 `COMSPEC=PowerShell` 取得真实 40-path inventory。该项应由后续 `cs-note` 查重后决定是否写入，不在 acceptance 直接改 attention。
- Learning/decision 候选：redaction matcher 新增语法必须同步真实 Engine + MCP forbidden corpus；abort source 必须 first-writer-wins。已在 review/architecture 记录，后续可按需沉淀。
- 没有新增公开用户指南或 API reference；F9 统一承担 CLI/MCP guide。

## 9. 已知遗留

- Redaction matcher 是封闭确定性边界，不识别任意自然语言 secret/PII；未来新增表达形式必须同步 forbidden corpus。
- Diagnostic scrubber 对 UNC 与单段 POSIX absolute path 覆盖有限；当前正式调用只写固定安全文本，本轮没有 raw diagnostic 泄漏。
- `RipgrepBackend`/`CodeGraphBackend` 固定 10 秒 process timeout 的真实慢仓库墙钟路径尚未实测；状态/action 语义已有 fake backend 与 unit/Golden 证据。
- archguard/meta-cc providers unavailable，只缺附加摘要，不影响 scope/DoD/runtime core evidence。

## 10. 最终审计

- 原始契约：重读 design 第 0-3 节、checklist C1-C12、review/QA focus；没有未处理偏差。
- 运行证据：mandatory DoD 在最终代码状态重跑 6/6；full build/typecheck/unit/Golden/MCP 在 Round 2 修复后重跑全绿。
- 交付物：status/next-action/budget/redaction/error policies、Engine/MCP 挂载、unit/Golden/MCP tests、四份专项报告、review/QA/acceptance、architecture/roadmap 状态均落盘。
- 完整工作区：scope gate 盘点 40 个非机器产物且全部在批准前缀；acceptance 新增的 architecture/roadmap/report 路径已纳入最终 scope 扩展。
- 清洁度：`git diff --check` 无 whitespace error；无 debug、临时 TODO/FIXME/XXX、注释掉实现、unused import 或方案外代码。
- 证据诚实度：build/typecheck/full suites 与 DoD 为 `re-verified`；archguard/meta-cc 为 unavailable，不伪装通过。
- Goal 授权：沿用用户对完整 roadmap goal 自主推进与 scoped commit 的批准，无需逐 feature 重复停顿。
- 结论：通过；12 个 acceptance checks 全部 `passed`，F7 可 scoped commit 后进入 F8。
