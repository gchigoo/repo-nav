---
doc_type: feature-code-review
feature: 2026-07-24-streaming-ripgrep
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f5-streaming-ripgrep-r2
round: 2
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "ocr CLI installed but LLM endpoint unconfigured"
---

# streaming-ripgrep 代码审查报告（round 2）

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-design.md`（`status: approved`；重点 §2.3 mount points、§1 KD13/KD19–22、§3 验收契约、§3.2 Stable ID inventory）
- Checklist: `streaming-ripgrep-checklist.yaml`（S1–S5 `done`；C1–C65 仍 `pending`，留给 acceptance，OK）
- Scope allow: `streaming-ripgrep-scope-allow.txt`
- Prior review: round 1 `changes_requested`（REV-001/002/003 blocking）+ host review-fix
- Diff basis: tip `af35577` + 未提交 F5 impl/review-fix（`src/process/**`、`src/repository/ripgrep-stream/**`、`ripgrep-backend.searchViews`、F3 handoff、tests/fixtures）
- Review mode: Material review-fix 后完整独立复审（round 2）
- Verification run: `npm run typecheck` exit 0；`npm test -- --group streaming-ripgrep` 22 passed / 316 skipped
- Baseline dirty files: 工作区另有其他 feature 产物 / `dist/**` 等 ambient dirty；本结论只归因 F5 相关路径

### Independent Review

- Detection: 本报告为独立 Task agent Lane A（round 2）；OCR Lane B 因 LLM endpoint 未配置记 `unavailable`
- 环节 A: independent-agent + completed
- 环节 B: unavailable（`ocr CLI installed but LLM endpoint unconfigured`）
- Merge policy: 仅 Lane A 事实核验后定稿；不得伪装 `subagent+ocr`
- Gate effect: `reviewer: subagent`；无 blocking → `passed`

## 2. Diff Summary

- 新增：`src/process/*`（kernel、collector、projection、primary trigger、settlement、execution context、physical executor）；`src/repository/ripgrep-stream/*`（framer、FSM、JSON consumer、multi-view accumulator）；`src/contracts/v2/backend-execution-outcome-v2.ts`；F5 unit/fixtures/registry/platform binding delta；feature checklist/scope/design 产物
- 修改（相对 round 1 阻塞点）：`RipgrepBackend.searchViews` 改为 availability → `startStreaming` + `RipgrepJsonLineConsumerV2` + `MultiViewAccumulatorV2`；outcome facts 优先绑 `ripgrep-group`；Stable ID 用例改为生产路径行为断言；F3 四参数 handoff / eligibility 敌意断言补齐
- 删除：none（相对 tip；旧 exact-N assertion 随 platform binding 迁移）
- 风险热点：生产 multi-view 流式真实性、start authority、telemetry-only 门控、CodeGraph/v1 bare runner 残留、preparation port、architecture 回写

硬约束抽查：

| 约束 | 结果 |
|---|---|
| buffered `run` 与 `runStreaming` 共用唯一 kernel | 通过（`NodeSafeProcessRunner` 两者均 `createKernel().runStreaming`） |
| exact-N 成功 / N+1 limit，retained<=N | 通过（kernel + F5-PROC-001 行为测） |
| 无第二套 process lifecycle SM | 通过（仅 `SafeProcessExecutionKernelV2`） |
| 生产 ripgrep multi-view 流式 JSON + 双 lane accumulator | 通过（`searchViews` import/调用 stream consumer + accumulator；无 `this.search()` bridge） |
| multi-view physical start 经 executor；facts 绑 ripgrep-group | 通过（`startStreaming` kind=`ripgrep-group`；reducer 优先 outcomeSourceKinds） |
| incomplete/telemetry-only 不进 F3 completeSafeHits | 通过（factory 门控 + F5-ELIGIBILITY-001 行为断言） |
| package 不新增 public v2 export | 通过（`src/index.ts` 未 re-export outcome v2） |
| Stable ID 测试具行为证伪力 | 通过（无 `expect(true)` / 仅 fixture `toContain` 作唯一证明） |

## 3. Adversarial Pass

- 假设的生产 bug：review-fix 表面改测试/注释，但 `searchViews` 仍缓冲桥接，或 facts 仍绑 version probe，或 Stable ID 仍 stub
- 主动攻击过的反例：
  - `searchViews` 是否仍调用 `this.search()` / `parseJsonLines` 全量缓冲路径
  - 是否缺失 `startStreaming` / `RipgrepJsonLineConsumerV2` / `MultiViewAccumulatorV2`
  - CountingRunner 注入 context 后 `streamCount`/`--json` 是否可证伪 bare buffered group
  - reducer 是否仍把 search hits 绑在 `ripgrep-version` first ordinal
  - seal 后 late-start、missing-facts 是否红
  - ELIGIBILITY 在 early-stop 时 `completeSafeHits` 是否可非空
  - START-AUTHORITY 是否仍只测 version probe ordinal=1
  - CodeGraph / v1 `probe`/`search` 是否仍 bare `processRunner.run`（已知残留）
- 结果：round 1 三项 blocking 攻击点在 F5 multi-view 生产路径上均被关闭；CodeGraph/v1 bare runner、preparation port、architecture 回写保留为 important / residual，不升本轮 blocking

## 4. Findings

### blocking

none

### Prior blocking closure（round 1 → round 2）

- [x] REV-001 `src/repository/ripgrep-backend.ts` `searchViews`（约 L605–979）
  - Closure evidence: 生产路径 import `MultiViewAccumulatorV2` / `RipgrepJsonLineConsumerV2`；groups 经 `executor.startStreaming(..., kind:'ripgrep-group', consumer)`；`onMatch`→`accumulator.observeMatch`；commit/discard 按 streaming settlement；文件内 `searchViews` **不**调用 `this.search()` / `parseJsonLines`。`parseJsonLines` + `this.processRunner.run` 仅残留于 v1 `probe`/`search`（非 multi-view）。F5-HITS/MULTIVIEW/EXIT/START-AUTHORITY 均对真实 `searchViews` 断言 `streamCount>=1`。
  - Impact: 原 blocking「生产未挂流式编排」已解除。
  - Expected fix scope: n/a（closed）

- [x] REV-002 multi-view start authority + ripgrep-group outcome binding
  - Closure evidence: version 经 `prepareAvailabilityProbe`→`startAvailabilityProbe`→`settle`；search groups 经 `startStreaming`；有 expanded-related groups 时 version facts 仅为 `{kind:'ripgrep-version-availability'}`，search outcome 绑各 `group.settled`；reducer `outcomeSourceKinds` 优先 `ripgrep-group`（非 first-ordinal version）。F5-START-AUTHORITY 断言 `runCount===1`（仅 version buffered）且 `streamArgv` 含 `--json`。F5-TRACE 断言 seal 后 late-start 抛错、missing-facts 抛错、trace `hitCount>0`。
  - Impact: 原 blocking「multi-view 旁路 executor / version 承载 search hits」已解除。
  - Expected fix scope: n/a（closed）；CodeGraph / v1 bare runner 见 REV-004 important，不重新打开本条

- [x] REV-003 Stable ID 测试 stub
  - Closure evidence:
    - **F5-ELIGIBILITY-001**：真实 early-stop `searchViews`；断言 `telemetry-only` / `early-stop` / `completeSafeHits=[]` / `retainedHits.length>0`；无 `expect(true)`。
    - **F5-EXIT-001**：no-start（pre-aborted）+ complete started 路径行为断言；fixture `toContain` 非唯一证明。
    - **F5-TRACE-001**：late-start / missing-facts / group-bound hitCount 行为断言。
    - **F5-START-AUTHORITY-001**：生产 `searchViews` 的 streaming/bare-bypass 证伪（`streamCount`、`--json`、`runCount===1`）。
  - Impact: 原 blocking「验收可被 stub 伪造」已解除。
  - Expected fix scope: n/a（closed）

### important

- [ ] REV-004 `src/repository/codegraph-backend.ts` / v1 `RipgrepBackend.probe|search`
  - Evidence: CodeGraph `probe`/`search` 与 Ripgrep v1 `probe`/`search` 仍 `this.processRunner.run`；未挂 `BackendExecutionContextV2` executor。design KD22 / Implementation DoD 字面要求两 backend 无 bare runner，但本轮 F5 multi-view 关键路径已满足；fix agent 明示为残留。
  - Impact: expanded locate 若仍走 CodeGraph v1 search，物理 start 不进 F5 registry/trace；不否定 ripgrep streaming handoff，但 acceptance/QA 需确认 CodeGraph 路径范围或后续接线。
  - Expected fix scope: CodeGraph status/query/fallback 与（若仍生产）v1 ripgrep 经 context executor；或 design-review 明确 v1 兼容窗豁免边界。

- [ ] REV-005 `createBackendExecutionContextV2(..., _preparationPort, ...)` 忽略 preparation port
  - Evidence: `backend-execution-context-v2.ts:269-274` 参数 `_preparationPort` 未注入 executor；canonical/测试普遍传 `undefined`。availability preparation 现由 executor 内联实现，与 design「executor 内部独占 preparation port」字面不完全一致。
  - Impact: 不阻断本轮 multi-view 行为验收；cwd/identity 敌意语料与 port 身份契约仍弱。
  - Expected fix scope: 显式注入并强制使用 preparation port（可记入 QA residual）。

- [ ] REV-006 architecture / ACT-ARCH-UPDATE
  - Evidence: `.codestable/architecture/system-repo-nav-foundation.md` 未见 kernel / multi-view / outcome / trace / F6 no-hits seam 回写；design §3.5 / checklist 要求 acceptance 前更新。
  - Impact: 不阻塞本轮 review 通过，但 acceptance 前必须补，否则 DoD-ACCEPT 失败。
  - Expected fix scope: accept 阶段 cs-arch update。

### nit

- [ ] REV-007 `F5-V1-001` 仍偏弱：`V1_PARITY_GOLDEN_CASE_IDS_V2.length > 0`，未跑非边界 deep-exact 对照。不单独升 blocking（核心 Stable ID 已有行为证伪）。
- [ ] REV-008 无 seed groups 时 `bindSearchToVersion=true` 仍可能让 version probe 承载空 search outcome；有 `ripgrep-group` 时 reducer 已优先 group。边缘路径，建议 QA 抽查空 terms。

### suggestion

- [ ] REV-009 CodeGraph 生产接线可与 F6 trace receipt 同迭代：`F5-CODEGRAPH-001` 目前主要覆盖 `not-observed`；补 started receipt 矩阵可提高 acceptance 可信度。

### learning

- review-fix 同时修「生产接线」与「Stable ID 证伪力」才能关闭 round 1 blocking；仅改 helper 或仅改测试不够。
- CountingRunner 注入 context、backend 另构 runner，是证明 `searchViews` 走 executor/stream 而非 singleton bare runner 的有效对抗手法。

### praise

- `searchViews` 顺序理顺为 pre-abort / preparation no-start → version probe → streaming groups → seal/reducer/handoff。
- reducer `outcomeSourceKinds` 显式排除 version/status probe 误绑 hits，直接对应原 REV-002 失败模式。
- ELIGIBILITY / START-AUTHORITY / TRACE 从 stub 升级为可失败行为断言，且与真实 temp repo + `rg` 路径耦合。
- package 仍未把 outcome v2 做成 root public export；单一 kernel + N+1 行为测保持。

## 5. Test And QA Focus

- 本轮已绿：`npm run typecheck`；`npm test -- --group streaming-ripgrep`（22 passed）。
- QA 重点：生产 `searchViews` streaming + staging commit/discard；telemetry-only 零 F3 membership；seal/late-start；platform 六格 F5 markers；人为恢复 buffered bridge 或 `expect(true)` 应红。
- 建议加强：CodeGraph started receipt 全矩阵；v1 parity deep-exact；LARGE 真实有界计数；空 terms / 全 legacy-only 边缘。
- 不能靠本轮 review 完全确认：F4 远程六格、真实大库 LARGE、CodeGraph equal/different-cap 全生产矩阵（CodeGraph 仍 bare runner）。

## 6. Residual Risk

- CodeGraph / v1 bare runner（REV-004）→ QA/acceptance 确认范围或后续接线。
- preparation port 忽略（REV-005）→ availability cwd identity 敌意语料。
- ACT-ARCH-UPDATE（REV-006）→ acceptance 前 cs-arch。
- F5-V1 / 空 groups version-bind 边缘（REV-007/008）→ 非本轮阻塞。
- Lane B OCR unavailable → 不阻塞以 `reviewer: subagent` 进入下游。

## 7. Verdict

- Status: `passed`
- Blocking: 0
- Next: Goal lane → `cs-feat` QA；important（REV-004/005/006）记入 QA/acceptance residual，不要求再开 review-fix。Lane B OCR 仍 unavailable，不阻塞以 `reviewer: subagent` 进入下游。

## 8. Focused Closure

none（本轮为 Material review-fix 后的完整独立复审，非 focused closure）
