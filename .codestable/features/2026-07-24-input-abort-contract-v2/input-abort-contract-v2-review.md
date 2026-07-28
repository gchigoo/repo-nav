---
doc_type: feature-code-review
feature: 2026-07-24-input-abort-contract-v2
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f6-input-abort-contract-v2-r2
round: 4
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "ocr CLI installed but LLM endpoint unconfigured"
---

# input-abort-contract-v2 代码审查报告（round 4）

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-design.md`（`status: approved`）
- Checklist: `input-abort-contract-v2-checklist.yaml`（S1–S5 `done`；C1–C53 留给 acceptance）
- Scope allow: `input-abort-contract-v2-scope-allow.txt`（50 prefixes；gate changed_files 77 / uncovered 0）
- DoD / Gate: `input-abort-contract-v2-dod-results.json` / `input-abort-contract-v2-gate-results.json`（均为 `passed`，blocking `[]`）
- Prior review: round 3 `passed`（blocking 0）；本轮为 DoD-fix 后 focused Lane A re-review
- Diff basis（本轮可归因 DoD-fix 增量）:
  - `input-abort-contract-v2-scope-allow.txt`：补齐 docs / qa-fix / platform / golden / feature 目录等 allow 前缀
  - `testkit/contracts/platform-contract.ts`：注册 `F6-INPUT-001` / `F6-ABORT-001` / `F6-LATCH-001` bindings + CHILD ledger
  - golden / registry：`large-request-outcome-permutation` 挂入 `large-synthetic-repository.spec.ts` + `runner-registry` case/group；无额外污染 performance yaml
  - `docs/reference/repo-nav-locate.md`：schema-reference 重生，`required` 去掉 `question`
  - checklist S1–S5 → `done`；dod/gate/evidence pack 产物落盘
- Review mode: DoD-fix 后 focused Lane A（round 4）；**未改产品代码**；lane_b unavailable
- Verification run（本轮 spot-check）:
  - `npm run test:platform` → exit 0；含 `F6-INPUT-001, F6-ABORT-001, F6-LATCH-001`
  - `npm run test:docs` → Docs smoke passed
  - `npm run test:golden -- --all` → 17 files / 80 passed | 1 skipped
- Baseline dirty files: 工作区另有 F6 impl 产品与邻接 feature / `dist/**` ambient；本轮结论只归因上述 DoD-fix 增量

### Independent Review

- Detection: Lane A 由独立 Task agent 完成 focused closure；OCR Lane B 仍 `unavailable`（LLM endpoint 未配置）
- 环节 A: independent-agent + completed（round 4 focused）
- 环节 B: unavailable（`ocr CLI installed but LLM endpoint unconfigured`）
- Merge policy: 仅 Lane A 事实核验；不伪装 `subagent+ocr`
- Gate effect: 保留 round 2 `reviewer: subagent` 锚点；无新 blocking → `passed`

## 2. Diff Summary

- 新增（本轮归因）：dod/gate/evidence pack 产物；scope-allow 文件已存在并扩写
- 修改：`testkit/contracts/platform-contract.ts`；`test/golden/large-synthetic-repository.spec.ts`；`testkit/runners/runner-registry.ts`；`docs/reference/repo-nav-locate.md`；checklist S1–S5
- 删除：none
- 风险热点：platform marker 是否空录；docs required 是否回退 question；scope allow 是否漏路径导致 gate 伪绿

硬约束抽查（本轮焦点）：

| 约束 | 结果 |
|---|---|
| scope allow 覆盖 gate changed_files | 通过：77 路径 / uncovered 0；CMD-SCOPE-CHECK exit 0 |
| F6 platform IDs 进 F4 六格 | 通过：`PLATFORM_CONTRACT_IDS_V1` + BASE_BINDINGS + CHILD ledger 三元组一致 |
| marker 与 requiredAssertionIds 对齐 | 通过：fixture 常量与 bindings 同三 ID；`test:platform` 打印三合同 |
| docs schema-reference question optional | 通过：docs `required=["repoPath","terms"]` 与 `REPO_NAV_LOCATE_INPUT_SCHEMA.required` 一致 |
| golden LARGE / v1 可执行且全量绿 | 通过：`--all` 80 passed；F6 group 下 2 golden cases |
| 本轮无产品代码改动 | 通过：DoD-fix 仅 testkit/docs/codestable/checklist |

## 3. Adversarial Pass

- 假设的生产 bug：platform 空录 marker 让 `test:platform` 伪绿；或 docs regen 把 question 重新标 required；或 scope allow 过宽掩盖越界
- 主动攻击过的反例：
  - 对比 product vs docs `required`（均为 `repoPath`+`terms`）
  - F6-INPUT platform case：spaced repoPath / backslash file anchor / raw terms=17 后再录 marker（有行为断言）
  - F6-ABORT / F6-LATCH platform case：marker 录制前行为覆盖偏薄（见 important），但 sibling unit case 已证 first-writer / latch；不升 blocking
  - scope uncovered=0；DoD/Gate blocking=[]
  - golden `--all` 含 LARGE + v1，无 fixture-completeness 回归
- 结果：无新 blocking；round 2/3 important（REV-003–006）未因本轮扩大

## 4. Findings

### blocking

none

### Prior blocking closure（round 1 → round 2）

- [x] REV-001 F6-V1-001 exact-ref + shadow fail-closed（round 2 已关闭，本轮未重开）
- [x] REV-002 F6-LARGE-001 五次 hash（round 2 已关闭，本轮未重开）

### important

- [ ] REV-003 `test/unit/locate-request-v2.spec.ts` F6-QUESTION-001（沿用：question metamorphic 偏 terms 层）
- [ ] REV-004 harness F2 provenance 偏软（沿用）
- [ ] REV-005 F6-RAW-001 poison getter 未钉死（沿用）
- [ ] REV-006 architecture / ACT-ARCH-UPDATE（沿用；acceptance 前）
- [ ] REV-013 `test/unit/locate-abort-coordinator-v2.spec.ts` / `canonical-locate-finalization-v2.spec.ts` platform cases（本轮）：`F6-ABORT-001` / `F6-LATCH-001` platform case 在录满三个 marker 前，未完整复现 sibling case 的 deadline-first / after-close / timer-clear 路径；行为仍由非 platform case 覆盖，`test:platform` 因此偏登记绿。不阻塞本轮；建议 QA/acceptance 知悉，后续可把真实断言搬进 platform case。

### nit

- [ ] REV-007～REV-009（沿用 round 2；本轮无新 nit）

### suggestion

- [ ] REV-010～REV-012（沿用 round 2/3）
- [ ] REV-014（本轮）：platform marker 录制可与 sibling case 共用 helper，避免双 case 漂移。

### learning

- DoD-fix 若只补 scope allow / platform ledger / docs regen，应保持零产品 diff，避免把 optional question 或 cutover 边界带回产品层。
- `test:platform` 通过只证明 marker 登记完备；行为强度仍看同 contract 的非 platform executable case。

### praise

- scope allow 与 gate changed_files 对齐（uncovered 0），CMD-SCOPE-CHECK 实跑通过。
- docs schema-reference 与 runtime `required` 对拍，question 保持 optional。
- F6 三合同进 `PLATFORM_CONTRACT_IDS_V1` 且 spot-check 打印齐全。

## 5. Test And QA Focus

- 本轮已绿：`test:platform`（含 F6 三合同）、`test:docs`、`test:golden --all`（80 passed）。
- 后续 acceptance 仍应关注：REV-003 question 全链路、REV-013 platform case 行为强度、REV-005 RAW poison、REV-006 architecture 回写、F4 远程、F8 mount。

## 6. Residual Risk

- REV-003/004/005/006/013 仍开放 → QA / acceptance residual（非本轮 blocking）。
- Lane B OCR unavailable → 不阻塞以 `reviewer: subagent` 进入下游。
- DoD-fix 未改产品代码；产品行为风险沿用 round 2/3 已审范围。

## 7. Verdict

- Status: `passed`
- Blocking: 0
- Change class: ClosureOnly（DoD-fix：scope allow / platform markers / golden registry / docs regen / checklist+证据产物；无产品行为改动）
- Next: 回到 Goal lane QA 收尾 / 继续 acceptance；无需 review-fix。

## 8. Focused Closure

- Closed findings: none（round 3 已 `passed`；本轮关闭的是 DoD gate 缺口，非 review blocking）
- Attributed delta:
  - scope-allow 覆盖 docs / platform / golden / feature 产物路径
  - `platform-contract.ts` 注册 F6-INPUT/ABORT/LATCH
  - golden LARGE case + runner-registry 清理/挂载
  - `docs/reference/repo-nav-locate.md` schema-reference：`required` 无 question
- Targeted verification:
  - `npm run test:platform` → pass（含 F6-INPUT-001, F6-ABORT-001, F6-LATCH-001）
  - `npm run test:docs` → pass
  - `npm run test:golden -- --all` → pass（80 / 1 skipped）
  - scope uncovered=0；product/docs `required` 均为 `["repoPath","terms"]`
- Classification: 可归因增量仅为 testkit / docs / codestable metadata；未改变产品行为、公开契约语义（仅文档对齐已落地 optional question）、安全、数据、并发或架构。
- Product confirmation: question 仍 optional；无 v2 cutover；lane_b unavailable；无新 blocking。
