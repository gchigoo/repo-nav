---
doc_type: feature-code-review
feature: 2026-07-24-relevance-ranking-budget
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f2-relevance-ranking-budget-r3
round: 2
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "ocr CLI installed but LLM endpoint unconfigured"
---

# relevance-ranking-budget 代码审查报告（round 2）

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-relevance-ranking-budget/relevance-ranking-budget-design.md`（`status: approved`）
- Checklist: `relevance-ranking-budget-checklist.yaml`（S1–S5 `done`；C1–C66 仍 `pending`，留给 acceptance，OK）
- Evidence pack: `relevance-ranking-budget-evidence-pack.md`（DoD/gate passed；CMD-DOCTOR 非 core warning）
- Gate results: `relevance-ranking-budget-gate-results.json`（scope-gate `passed`）
- DoD results: `relevance-ranking-budget-dod-results.json`（core 命令 exit 0；15 unit + 3 golden）
- Prior review: round 1 `changes_requested`（REV-001..004 blocking）+ host review-fix
- Diff basis: tip `19751d2` + 未提交 F2 impl/review-fix（ranking/**、f2 stages、materialized-evidence-core、executor pre-read bind、tests）
- Review mode: full-rereview（Material review-fix 后完整独立复审，round 2）
- Baseline dirty files: 工作区另有其他 feature 产物 / `dist/**` 等 ambient dirty；本结论只归因 F2 相关路径

### Independent Review

- Detection: 本报告为独立 Task agent Lane A（round 2）；OCR Lane B 因 LLM endpoint 未配置记 `unavailable`
- 环节 A: independent-agent + completed
- 环节 B: unavailable（`ocr CLI installed but LLM endpoint unconfigured`）
- Merge policy: 仅 Lane A 事实核验后定稿；不得伪装 `subagent+ocr`
- Gate effect: `reviewer: subagent`；无 blocking → `passed`

## 2. Diff Summary

- 新增：`src/evidence/ranking/*`；`f2-locate-projection-stages-v2.ts`；`materialized-evidence-core-v2.ts`；request-snapshot discovery/ranking bridges；unit/golden specs；feature evidence/gate/scope 产物
- 修改（相对 round 1 阻塞点）：collision 改 `orderingKeysEqualV2`；F1 `materializePublicEvidenceV2` 接线 + strict schema；executor read 前 selector+bind 并复用 bound selection；ranking 去静默 catch；unit/golden 行为断言与 importer root scan；F1B forbidden markers 去掉 F2-owned materializer 类型名
- 删除：none
- 风险热点：trust/import 边界、pre-read reservation、ordering equality、F1 materializer exact-once、Stable ID 证伪力

硬约束抽查：

| 约束 | 结果 |
|---|---|
| package 不导出 F2 stages | 通过 |
| executor 不 import `public-output` / stages | 通过 |
| ranking 不 import `public-output` / F1A sensitive-value-policy | 通过 |
| collision 用结构化 `orderingKeysEqualV2`（含 operation/source） | 通过 |
| materialize exact-once 调 F1 materializer + contribution | 通过 |
| executor pre-read 真实 folded view + 复用 bound selection + fail-closed | 通过 |
| importer count 非硬编码 0 | 通过（production root 文本扫描） |

## 3. Adversarial Pass

- 假设的生产 bug：review-fix 表面接线但仍留 join-codec collision / 空 fold / 静默 catch / stub 测试
- 主动攻击过的反例：
  - collision 分组是否仍用 `join('\u0001')` 且省略 operation/source
  - `materialize` 是否绕过 `materializePublicEvidenceV2`
  - schema 是否仍 `.passthrough()`
  - executor 是否仍在 post-purge 用空 `expandedResults` 假接线，或 `catch { rankingFacts = undefined }`
  - unit 是否真实调用 `EvidenceRankerV2.rank` / `createSource`→`materialize`
  - importer probe 是否可因 production root 写入 accessor 名而失败
- 结果：round 1 五项 blocking 攻击点均被修复关闭；剩余为 architecture 回写、design §3.2 inventory 漂移、anchor/selector 分隔符编码形态不一致（important / residual），不阻断本轮

## 4. Findings

### blocking

none

### Prior blocking closure（round 1 → round 2）

- [x] REV-001 `test/unit/relevance-ranking-budget.spec.ts` / `test/golden/relevance-ranking-budget.spec.ts` / importer probes
  - Closure evidence: `F2-ENVELOPE-001` 标题与实现改为 `EvidenceRankerV2().rank` + `stages.createSource`→`stages.materialize` 链（含 execution 错绑 fail-closed）；`F2-SAFEKEY-001` 断言 operation/source 向量参与 equality；`countF2*ProductionImportersV2` 改为扫描 `PRODUCTION_ROOTS_FOR_IMPORTER_COUNT` 文本出现次数，非 `return 0`；无 constructibility-only / `toBeInstanceOf` stub。Golden 仍偏 helper 级（见 REV-006），但不再伪造「零行为调用」的 Stable ID 绿灯。
  - Impact: 原 blocking「验收不可信 / stub 伪造」已解除。
  - Expected fix scope: n/a（closed）

- [x] REV-002 `src/evidence/ranking/evidence-ranker-v2.ts:115-124`
  - Closure evidence: equalityGroups 使用 `orderingKeysEqualV2`；该函数委托 `comparePublicSafeOrderingKeyV2`，覆盖 role/reason/**operation/source** 向量；无 join codec；无 `void orderingKeysEqualV2` hack。
  - Impact: distinct operation/source 不再被错误合组。
  - Expected fix scope: n/a（closed）

- [x] REV-003 `src/evidence/public-output/f2-locate-projection-stages-v2.ts` + `materialized-evidence-core-v2.ts`
  - Closure evidence: `UnsafePublicMaterializationSourceV2Schema` 全树 `.strict()`、无 passthrough；`materialize` 调用 `materializePublicEvidenceV2` → `readTrustedMaterializedEvidenceCoreV2` → `requirePublicMaterializationContributionV2` → F1C registrar；F1B `FORBIDDEN_FUTURE_MODULE_MARKERS_V2` 已去掉 F2-owned materializer 类型名（保留 feature slug 等禁标）。
  - Impact: 不再绕过 F1/F1B materialization 契约。
  - Expected fix scope: n/a（closed）

- [x] REV-004 `src/evidence/locate-execution/canonical-locate-executor-v2.ts:766-806,380-413,1065`
  - Closure evidence: read/verify 前对真实 `expandedFold.foldedView`（含 `resolveMatchedAnchorKeys`）跑 `DiscoveryHitSelectorV2.select`→`bind`；同 `discoverySelection` 传入 `terminalSuccessWithSnapshot`→`EvidenceRankerV2.rank`；ranking 路径无静默 `catch`（trust/invariant 失败上抛 fail-closed）。
  - Impact: discovery reservation 不再空转；ranking 失败不再伪装「无 ranking owner」。
  - Expected fix scope: n/a（closed）

### important

- [ ] REV-005 architecture / ACT-ARCH-UPDATE
  - Evidence: `.codestable/architecture/system-repo-nav-foundation.md` 仍无 EvidenceRanker/DiscoveryHitSelector/ranking outcome 回写；design §3.5 / C42 要求 acceptance 前更新。
  - Impact: 不阻塞本轮 review 通过，但 acceptance 前必须补，否则 DoD-ACCEPT 失败。
  - Expected fix scope: accept 阶段 cs-arch update（可延后，须记入 residual）。

- [ ] REV-006 design §3.2 owner inventory 漂移 + Golden 仍偏 helper
  - Evidence: 登记路径如独立 `evidence-ranker-v2.spec.ts`、`match-priority-v2.ts` fixture、golden yaml/manifest、ABI type-spec 等仍缺失或合并进单 spec；Golden 三案主要测 comparator/round-robin helper，未用 repository fixture 跑完整 `EvidenceRankerV2.rank` + ledger/limits truth。
  - Impact: C41 一对一 owner 闭环与 Golden truth 深度仍弱于 design 字面；不否定 unit 已具备行为证伪，但 acceptance 需对齐 inventory 或修订 design §3.2。
  - Expected fix scope: 落地 missing owners / 加深 Golden，或 design-review 修订路径后验收。

- [ ] REV-007 `anchor-intent-normalizer-v2.ts:56-70` / `discovery-hit-selector-v2.ts:24-31`
  - Evidence: anchor comparison key 仍 `join(':')`（虽有 length+hex）；selector 等价类 key 仍 `\u0001` join。与 KD1/KD6「禁止靠分隔符拼接作为身份」形态不完全一致。
  - Impact: 当前有 length 前缀降低碰撞风险；缺分隔符/多字节负例时仍有理论歧义。
  - Expected fix scope: 无歧义字节结构编码 + F2-ANCHOR/DISCOVERY 负例（可延后至 QA residual）。

### nit

- [x] REV-008 `void orderingKeysEqualV2` hack — 已删除，函数已用于 collision grouping。
- [x] REV-009 ENVELOPE「constructible」文案 / 实例断言 — 已改为行为链标题与断言。

### suggestion

- [x] REV-010 executor ranking 整段静默 catch — 已移除；trust/invariant 失败 fail-closed。early abort/timeout 路径不传 `discoverySelection`（无 ranking owner）属预期降级，可在 QA 确认 shadow 语义。

### learning

- review-fix 把「接线真实性」与「测试证伪力」同时修掉，是关闭 round 1 blocking 的关键：仅改生产代码而保留 stub 测试仍不足以过独立复审。
- importer count 用固定 production root 列表做字符串扫描，弱于完整 import graph，但对 F2 acceptance「runtime importer=0」目标足够可失败。

### praise

- F1 single materializer 下沉到 `materialized-evidence-core-v2.ts`，F2 stages 只做 preflight/schema/registrar 编排，边界清晰。
- executor 继续禁止 import `public-output`；stages 登记仅限 direct harness。
- operation/source 纳入 ordering equality 与 SAFEKEY 负例，直接对应原 REV-002 失败模式。

## 5. Test And QA Focus

- QA 必须重点复核：`EvidenceRankerV2.rank` 与 `createSource`/`materialize` 敌意用例在 CMD-F2-UNIT 中确实执行；人为破坏 F1 materializer 或改回 join collision 时应红。
- Evidence pack residual：CMD-DOCTOR 非 core warning（ambient / 历史）已解释，不阻塞。
- 建议加强：Golden 用真实 ranker + budget/ledger truth；collision `selection-ambiguous` 端到端；ABI type-spec。
- 不能靠 review 完全确认：真实大库 5-run 性能趋势、F8 首次取得 factory 的委托合同、缺 scope/capability 时 real shadow callback/registrar 全 0。

## 6. Residual Risk

- ACT-ARCH-UPDATE / architecture 回写未做（REV-005）→ acceptance 前 cs-arch。
- design §3.2 inventory 与 Golden 深度（REV-006）→ QA/acceptance 对齐或修订。
- anchor/selector 分隔符编码（REV-007）→ 非本轮阻塞，建议补负例。
- early abort/timeout 无 `discoverySelection` 时无 ranking owner → 确认与 F2 shadow missing-first 语义一致。
- Pre-F5/F6/F8：real shadow 缺 scope/capability 时 callback/registrar 须为 0（ENVELOPE 未完整证明 missing-first 生产 shadow 路径）。

## 7. Verdict

- Status: `passed`
- Blocking: 0
- Next: Goal lane → `cs-feat` QA；important（REV-005/006/007）记入 QA/acceptance residual，不要求再开 review-fix。Lane B OCR 仍 unavailable，不阻塞以 `reviewer: subagent` 进入下游。

## 8. Focused Closure

none（本轮为 Material review-fix 后的完整独立复审，非 focused closure）
