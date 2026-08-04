---
doc_type: feature-code-review
feature: 2026-07-24-request-snapshot-cache
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f3-request-snapshot-cache-r1
round: 1
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "ocr CLI installed but LLM endpoint unconfigured (ocr llm test failed)"
---

# request-snapshot-cache 代码审查报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-request-snapshot-cache/request-snapshot-cache-design.md`（`status: approved`）
- Checklist: `.codestable/features/2026-07-24-request-snapshot-cache/request-snapshot-cache-checklist.yaml`（S1–S5 `done`；checks 仍 `pending`，正确）
- Evidence pack: `.codestable/features/2026-07-24-request-snapshot-cache/request-snapshot-cache-evidence-pack.md`
- Gate results: `request-snapshot-cache-gate-results.json`（`implementation.before_review` `passed`）
- DoD results: evidence pack 内嵌 dod-runner（core 命令 exit 0；CMD-DOCTOR non-core warning）
- Implementation evidence: 工作区 uncommitted F3 实现 + unit/golden fixtures + runner-registry
- Diff basis: focused closure #2 复核 REV-003 review-fix 增量
- Review mode: focused-closure（同 round=1，保留首次 `reviewer: subagent`）
- Baseline dirty files: 同 worktree 内其他 feature / `dist/` 等 ambient；本 verdict 只针对 F3 可归因路径

### Independent Review

- Detection: 首次 Lane A 由独立 Task agent 完成；本轮为同一 reviewer 锚点下的 focused closure #2
- 环节 A 独立隔离 Task agent: independent-agent + completed（`reviewer_id: independent-task-agent-f3-request-snapshot-cache-r1`）
- 环节 B OCR CLI: unavailable（`ocr llm test`：no valid LLM endpoint）
- OCR severity mapping: High→blocking/important, Medium→nit/suggestion, Low→discarded
- Merge policy: focused closure 核验 REV-003 声称修复；未升格 `subagent+ocr`
- Gate effect: 无剩余 blocking → `passed`；可进入 Goal lane QA（important 记入 residual）

## 2. Diff Summary

- 新增：`src/evidence/request-snapshot/`（含 `pre-f5-multi-view-search-v2.ts`、`expanded-lane-bridge-v2.ts`、`dual-lane-execution-receipt-v2.ts` 等）；F3 unit/golden/fixtures；`test/unit/executor-dual-lane-wiring-v2.spec.ts`
- 修改（含两轮 review-fix）：executor 接线 final check / observation cache / multi-view search / scope fold / dual-lane candidate；abort/trust/parity/mutation 测试
- 风险热点：Pre-F5 单 process 双切片（非 F5 双 process）为显式 residual；大 synthetic / ownership 对账仍为 important

## 3. Adversarial Pass

- 首次：zero-read unknown、observation 未接线、stub parity/mutation、abort 全量 purge
- Closure #1：关闭 REV-001/002/004/005/006/008/010；REV-003 因 `void expandedMaxHits` 保持 blocking
- Closure #2：攻击 `searchBackendMultiViewV2` 是否真传 800、scope fold 是否调用、legacy 是否仍 `applyCandidatePolicy`、expanded drafts 是否只进 pool 不污染 v1
- 结果：REV-003 关闭；单 process 双切片记 residual（非新 blocking）

## 4. Findings

### blocking

- [x] REV-001 `terminalSuccessWithSnapshot` — closed（closure #1）
- [x] REV-002 observation cache — closed（closure #1）
- [x] REV-003 dual-lane / expandedMaxHits — **closed in focused closure #2**
  - Evidence: `searchBackendMultiViewV2` 以 `max(legacy, expanded)=800` 发起共享 search 并切片双视图；无 `void multiView.expandedMaxHits`；`projectAndScopeFoldExpandedHitsV2`（bind→safe pre-cap→`scopeFoldSafeCandidatePoolV2`）；`LegacyCandidateReservationV1` 替代 `applyCandidatePolicy`；`CandidateTokenProposalEnumeratorV2` + `evaluateExpandedCandidateProposalsV2`；expanded-only drafts 仅经 `expandedPoolCandidates` 进入 pre-ranking pool，不改 v1 candidates；`executor-dual-lane-wiring` 断言 `lastMaxHits===800`、`scopeFoldInvoked`、`usedLegacyCandidateReservation`。
  - Residual（non-blocking）：Pre-F5 单 process / 前缀确定性双切片，非完整 F5 双 process；临时 allow-all scope adapter 待 F7 替换。
- [x] REV-004 abort purge — closed（closure #1）
- [x] REV-005 mutation precedence — closed（closure #1）
- [x] REV-006 v1 parity — closed（closure #1）

### important

- [ ] REV-007 large synthetic 仍非完整 5-run / ownership 路径漂移 → QA residual
- [x] REV-008 outcome contribution registered proof — closed（closure #1）
- [ ] REV-009 scope-coverage handcrafted proof 绑定偏弱 → QA residual
- [x] REV-010 git probe — closed（closure #1）

### nit

- [ ] REV-011 mutation golden discardedEvidenceCount 可读性
- [ ] REV-012 ownership inventory 路径漂移

### suggestion

- [x] REV-013 checklist 区分库完成与 executor 接线 — dual-lane receipt 已提供生产路径可观测信号（部分兑现）

### learning

- Pre-F5 合法形态是共享 `maxHits=800` 一次 search 再按 lane cap 切片；不得要求 F3 base 同时落地完整 F5 双 process。
- expanded drafts 进 pre-ranking pool、v1 selection 仍只消费 legacy reservation，是正确的无 cutover 隔离。

### praise

- `registerDualLaneExecutionReceiptV2` + `executor-dual-lane-wiring` 使 800 cap / scope fold / legacy reservation 可机械核验。
- expanded fold 明确不改写调用方持有的 legacy 结果。

## 5. Test And QA Focus

- QA 可 proceed（Goal lane）。重点复核：
  - `executor-dual-lane-wiring`：共享 search maxHits=800、receipt scopeFold/legacy reservation
  - snapshot 路径 v1 parity（既有 Golden）与 mutation→partial
  - mid-abort 保留已复核文件
  - production 仍无 v2 public cutover
- Residual for QA：REV-007（5-run large）、REV-009（scope-coverage trust）、临时 allow-all scope adapter、mutation×timeout 运行时矩阵偏窄
- Closure #2 验证：`npm test -- --group request-snapshot-cache --case executor-dual-lane-wiring --case snapshot-v1-parity --case discovery-reservation-budget-independence`（3 passed）

## 6. Residual Risk

- 同 `dev/ino/size/mtimeMs` 静默改内容（design threat-model）
- OCR Lane B unavailable
- Pre-F5 单 process 双切片依赖 adapter 前缀确定性（设计允许边界；完整 F5 双 process 属后续）
- REV-007 / REV-009 important 延后至 QA/acceptance 跟踪

## 7. Verdict

- Status: passed
- Blocking count: 0
- Next: 进入 Goal lane QA（`cs-feat` QA）；important 不阻塞但须在 QA/acceptance residual 记录

## 8. Focused Closure

### Closure #1（先前）

- Closed: REV-001, REV-002, REV-004, REV-005, REV-006, REV-008, REV-010
- Then remaining blocking: REV-003

### Closure #2（本轮）

- Closed findings: REV-003
- Remaining blocking: none
- Attributed delta:
  - `pre-f5-multi-view-search-v2.ts`：`searchBackendMultiViewV2` / `resolveSharedSearchMaxHitsV2` / `deriveLaneBackendResultV2`
  - `expanded-lane-bridge-v2.ts`：`projectAndScopeFoldExpandedHitsV2`
  - `dual-lane-execution-receipt-v2.ts`：execution 绑定 receipt
  - `canonical-locate-executor-v2.ts`：multi-view search、expanded fold、`LegacyCandidateReservationV1`、enumerator/evaluator、`expandedPoolCandidates` 仅入 pool；删除 `void expandedMaxHits` / `applyCandidatePolicy` 调用
  - `test/unit/executor-dual-lane-wiring-v2.spec.ts` + runner-registry case `executor-dual-lane-wiring`
- Targeted verification: dual-lane + v1-parity + discovery-reservation cases exit 0
- Classification: test/docs 以外含生产接线，但属原 REV-003 expected fix 范围（expandedMaxHits 消费、scope fold、双 lane evaluator/reservation、无 v2 cutover）；未引入新 blocking；单 process 切片记 residual 而非 reopen
