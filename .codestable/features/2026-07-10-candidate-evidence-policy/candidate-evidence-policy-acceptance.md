---
doc_type: feature-acceptance
feature: 2026-07-10-candidate-evidence-policy
status: passed
accepted: 2026-07-13
round: 1
---

# candidate-evidence-policy 验收报告

> 阶段：阶段 3（验收闭环）
> 验收日期：2026-07-13
> 关联方案：`.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-design.md`

## 1. 接口契约核对

**接口示例与名词层逐项核对**：

- [x] `CandidatePolicyInput/Result`、`VerifiedCandidateContext`、`ClassifiedCandidateDraft` 均落在 `src/evidence/candidate-policy.ts`；draft 不持有 public ID。
- [x] `CANDIDATE_REASON_POLICY` 是六类 reason 的 role/promotion 单一映射；promotion 按全局固定顺序去重。
- [x] `RepositoryReader.readWindow()` 与 `NodeRepositoryReader` 实现同 file、focus-centered、最多 12 行/4 KiB verified window；focus slice 必须完整保留。
- [x] context-derived candidate 生成自己的精确 location/discovery key，public provenance 固定 filesystem/find-matches；seed backend provenance 不被复制。
- [x] engine 只在 policy 返回 draft 后统一生成 candidate public ID；扩窗前后的 confirmed 数组全量深等。

**流程图核对**：

- [x] merged verified records → direct classify once → confirmed/existing candidates → candidate-window verification → `applyCandidatePolicy` → bounded selection → materialize ID/public sort 均有生产代码落点。
- [x] policy 本身不接 backend/process/filesystem；I/O 仍由 `RepositoryEvidenceEngine` 与 `RepositoryReader` 拥有。

## 2. 行为与决策核对

**需求摘要与关键决策**：

- [x] alias neighbor、same entity sibling、same scope similar identifier 只在同一已核验 window 与精确 lexical owner 内生成；unbalanced、nested owner 不一致、type/string/comment/SQL quoted regions 均 fail closed。
- [x] F3 exact/symbol candidates 已补齐 truth-table promotion；confirmed predicate 优先，同一 discovery occurrence 不会再输出 candidate。
- [x] secondary reason 只允许 `primaryAttempted=true` 且 `discoveredBy=['ripgrep']` 的 secondary-only provenance；primary-only/merged 不生成。
- [x] `maxCandidates` 使用稳定有界优先选择；backend hits 在 `maxFiles` 前稳定排序，seed/hit/file permutation 不改变 class/reasons/promotions/IDs/order。
- [x] eligible candidate 被截断时记录 `MAX_CANDIDATES_REACHED`；confirmed 数量、location 与 ID 不受 candidate budget 影响。
- [x] abort 立即停止；二次 window read 的两个 limit 转为可解释 limit，其他 repository error 不静默吞掉而返回 typed failure。

**明确不做反向核对**：

- [x] 没有自动 promotion/confirmed、修复建议、自然语言 reason、numeric confidence 或 similarity score。
- [x] 没有引入 LLM、embedding、git history、AST 或新的 MCP tool/transport。
- [x] F5 未伪造真实 secondary backend ownership；`SECONDARY_BACKEND_HIT` 的生产接入仍属于 F6。

**挂载点反向核对与拔除沙盘**：

- [x] 挂载点 M1：`repository-evidence-engine.ts` 中 merge/classify 后、public materialization 前的唯一 candidate-policy stage。
- [x] 挂载点 M2：`candidate-policy.ts` 的 truth table、lexical predicates 与 selection constants。
- [x] 挂载点 M3：candidate unit/Golden/MCP fixtures、manifests 与 runner registry。
- [x] `rg` 反向核查命中均落在上述 production stage、reader port/implementation 或验证表面，没有 transport 中的第二套 candidate policy。
- [x] 拔除沙盘：移除 engine policy stage、`candidate-policy.ts`、`readWindow` 扩窗能力与对应 tests/fixtures，即回到 F4 的 F3 candidates + MCP surface；既有 confirmed classifier、MCP lifecycle 和 repository safety 不依赖 derived candidate draft。

## 3. 验收场景核对

- [x] **S1 truth table/context**：29 个定向 tests 通过；六类 reason/promotion exact set/order、derived provenance、真实 ripgrep 单行扩窗及 lexical false positives 均覆盖。
- [x] **S2 classification exclusivity**：2 个定向 tests 通过；同 occurrence confirmed 优先且 public evidence 唯一。
- [x] **S3 budget/determinism**：6 个定向 tests 通过；0/1/超限、queue 淘汰重入、`maxFiles=1` 与排列深等均覆盖。
- [x] **S4 minimal loop**：3 个 candidate Golden + 1 个真实 stdio MCP case 通过；同一 pack 精确包含 direct confirmed、alias/sibling candidates，并排除 unrelated decoy。
- [x] **Reader/error focus**：6 个 reader limit/failure tests 通过；居中/clamp、UTF-8 byte shrink、focus 保留/超限、abort 与不可读错误语义可判定。
- [x] Review 第 4 节 QA focus 已由 `candidate-evidence-policy-qa.md` QA-002 至 QA-008 逐条覆盖。
- [x] QA `status=passed`；failed/blocked 为 none，residual risk 仅为设计已声明的保守少召回与本地 TOCTOU 边界。
- [x] Evidence pack、scope gate 与 6/6 core DoD 均 passed；archguard/meta-cc unavailable 未替代或削弱实际运行证据。

## 4. 术语一致性

- `CandidatePolicy`、Candidate window、Seed、promotion requirements、discovery-key mutual exclusion 在 design、实现、review、QA 与 architecture 中含义一致。
- `confirmed` / `candidate`、reason/role/promotion enums 继续复用 schema v1，没有第二套 public contract。
- `SECONDARY_BACKEND_HIT` 只作为严格 truth-table reason 存在；文档没有把 F6 production ownership冒充为 F5 已完成能力。
- 禁用词与依赖扫描未发现 LLM/embedding/AST、自然语言 reason 或自动升级实现。

## 5. 领域影响盘点

- [x] `.codestable/architecture/system-repo-nav-foundation.md` 已机械更新为 F5 当前状态：CandidatePolicy、verified candidate window、bounded selection、互斥/ID/provenance 与最小 MCP 闭环；architecture index 摘要同步。
- [x] 新术语候选：CandidatePolicy、Candidate window、promotion requirements；现阶段已进入 architecture 系统地图。长期领域 glossary 可在 roadmap 完成时通过 `cs-domain` 统一归并 CONTEXT。
- [x] 结构性选择候选：policy draft 无 public ID、merge/classify 后单一 expansion seam、fail-closed lexical owners、稳定有界 priority selection。具备 ADR/constraint 候选价值，但 acceptance 不代写 ADR；建议 roadmap 收尾通过 `cs-decide/cs-domain` 归档。

## 6. requirement delta / clarification 回写

- Requirement `source-of-truth-evidence` 保持 `draft`，本轮不修改 requirement 文件。
- F5 已完成受控 fixture 上的 confirmed + candidate 最小用户价值闭环，但 CodeGraph fallback、完整 output guardrails、发布级回归与指南尚未完成，不能把完整 requirement 用户故事标为 current。
- 当前没有 owner-approved capability-boundary req delta；因此不自由改写 pitch/边界，也不提前登记 `implemented_by`。完整 MVP 验收后再走 approved delta 机械升级。

## 7. roadmap 回写

- [x] `repo-nav-mvp-items.yaml` 的 `candidate-evidence-policy` 已从 `in-progress` 改为 `done`，YAML 校验通过。
- [x] `repo-nav-mvp-roadmap.md` 第 5 条状态同步为 `done`；“受控 fixture 最小闭环、非发布里程碑”的边界保留。
- [x] `goal-state.yaml` 中 F5 为 `accepted`，`current_feature_index: 5`，整体保持 `ready-to-dispatch`。
- [x] `goal-features/candidate-evidence-policy.md` frontmatter 为 `accepted`。

## 8. attention.md 候选盘点

- 候选：production ripgrep hit 默认只含单行 excerpt；任何依赖闭合 container 的 lexical policy 必须通过 `RepositoryReader.readWindow` 获取同文件有界 verified context，不能让 fake backend 提供整文件掩盖真实链路。
- 本轮不直接改 attention；roadmap 文档整理阶段由 owner 决定是否通过 `cs-note` 收录。
- 其他知识出口：candidate window 不得改变 seed identity、二次读取错误不得静默降级，适合 roadmap 收尾通过 `cs-keep/cs-decide` 沉淀。

## 9. 遗留

- lexical angle/type recognizer、SQL quoted region 与 12 行/4 KiB container 边界均保守 fail-closed；复杂表达式或窗口外结构可能少召回。
- focus 与 candidate window 是两次本地读取，周边内容并发变化存在 TOCTOU；focus slice 变化会阻断。
- 真实 CodeGraph primary/secondary fallback 与 `SECONDARY_BACKEND_HIT` production ownership由 F6 完成。
- 全局 output budget、sensitive excerpt redaction 与更完整状态治理由 F7 完成；当前最小闭环不是发布候选。

## 10. 最终审计

- 验证来源：独立 subagent review Round 4 passed、QA Round 1 passed、evidence pack、DoD results 与 scope gate。
- 聚合命令：最终工作区重跑 build/typecheck、29 truth/context/discovery、2 exclusivity、6 budget/permutation、3 candidate Golden、1 stdio MCP、6 reader limits/failures，全部 exit 0。
- 场景复核：re-verified 9 / trust-prior-verify 0；功能性核心路径均有运行证据。
- 交付物复核：policy/truth constants、engine/reader mount、positive/negative fixtures、permutation/minimal-loop reports、review/QA/evidence、architecture 与 roadmap/goal state 均真实落盘。
- 完整工作区复核：tracked/untracked/unstaged 均归因于 F5；staged none；没有 baseline 外 dirty 文件。
- diff 清洁度：`git diff --check` 无 whitespace error；production/test/testkit marker scan无 debug、TODO/FIXME/XXX；build/typecheck 无 unused/import error。
- 文档校验：checklist 4 steps=`done`、C1-C12=`passed`；items/goal-state/goal-feature 与 architecture frontmatter 结构有效。
- 知识沉淀出口：architecture 已回填；ADR/attention/learning候选登记在第 5/8/9 节，未越权修改长期 requirement 或用户记忆。
- 结论：通过；12 个 acceptance checks 全部 `passed`，无核心 residual gap，F5 可 scoped commit 后进入 F6。
