---
doc_type: feature-review
feature: 2026-07-24-repository-scope-policy
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f7-repository-scope-policy-r4
round: 4
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "lane_b unavailable (ocr LLM endpoint unconfigured / not runnable this round)"
---

# repository-scope-policy 代码审查报告（round 4）

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-design.md`（`status: approved`）
- Checklist: `repository-scope-policy-checklist.yaml`（S1–S5 `done`；C1–C66 留给 acceptance）
- Evidence pack / gate / DoD / QA / acceptance：已存在；本轮**不反转 acceptance**，只评估 QA Material golden delta 是否引入 blocking
- Diff basis（本轮可归因）:
  - 新增 `test/golden/repository-scope-policy.spec.ts`（F7-V1-001 / F7-LARGE-001 golden surface）
  - 修改 `testkit/runners/runner-registry.ts`：`PLATFORM_CASE_OWNER_REGISTRATION` golden 两条 + `RUNNER_SELECTIONS.golden` group/cases
- Review mode: full-rereview（round 4，Material delta；Lane A focused on golden/registry only；非 focused closure）
- Verification:
  - `npm run test:golden -- --group repository-scope-policy` → exit 0；Test Files 1 passed | 17 skipped；Tests **2 passed** | 81 skipped
- Baseline dirty files: worktree 内其它 feature / prod / unit / acceptance 产物 ambient；本结论**只归因** golden spec + registry golden 登记；不重审 round 3 已关闭的生产接线

### Independent Review

- Detection: 本报告为独立 Task agent Lane A（round 4）；Lane B OCR 本轮 `unavailable`
- 环节 A: independent-agent + completed
- 环节 B: unavailable（`lane_b unavailable`）
- Merge policy: 仅 Lane A 对 golden/registry 事实核验后定稿；不得伪装 `subagent+ocr`
- Gate effect: `reviewer: subagent`；blocking=0 → `passed`

### Prior Blocking Closure（round 3）

| ID | Closure | Evidence |
|---|---|---|
| REV-001..006 / REV-012 | closed（round 3） | 本轮不重开；golden delta 未改生产接线 |

## 2. Diff Summary

- 新增：`test/golden/repository-scope-policy.spec.ts`
- 修改：`testkit/runners/runner-registry.ts`（golden ownership + `RUNNER_SELECTIONS.golden` 加入 `repository-scope-policy` / `large-scope-permutation` / 复用 `v1-compatibility`）
- 删除：none
- 未跟踪 / staged：golden spec 为 untracked；registry 为 modified
- 风险热点：CMD-F7-GOLDEN 假绿 / Unknown group / ownership 漂移；**无生产行为/契约变更**

硬约束抽查（round 4，golden/registry only）：

| 约束 | 结果 |
|---|---|
| golden group `repository-scope-policy` 可被 runner 识别 | 通过（`--group` 不再 Unknown） |
| case `v1-compatibility` / `large-scope-permutation` 在 golden selection | 通过 |
| ownership `golden/repository-scope-policy/*` → golden spec | 通过 |
| Stable ID F7-V1 / F7-LARGE 有真实断言（非空 describe） | 通过 |
| 本 delta 未改 `src/**` 生产代码 | 通过（审查范围外 prod dirty 不计入本轮归因） |

## 3. Adversarial Pass

- 假设的生产 bug：golden 只登记不跑断言，或断言弱到永远绿，使 CMD-F7-GOLDEN 验收不可信
- 主动攻击过的反例：
  1. group 未进 `RUNNER_SELECTIONS.golden.groups` → Unknown group
  2. case 未进 `cases` → describe.runIf 全 skip 却被当成 pass
  3. ownership 路径指向错误文件
  4. V1 golden 仅 EmptyBackend + projector 引用，是否掩盖 policy delta 失败
  5. LARGE golden 是否与 unit LARGE 漂移到无 outside/不稳定断言
  6. design 清单中的 `repository-scope-policy-v1.yaml` 缺失是否使 golden 契约断裂
- 结果：1–3 不成立（registry + 2 tests executed）；4–5 断言与 unit trust 同源（`V1_POLICY_DELTA_V1` 行级期望；permutation fragment/outside/selected 稳定且 outside≥1），非空绿；6 为 inventory 缺口（同 REV-008 族），**不升 blocking**（CMD 为 group runner，非 yaml evaluator；同仓已有 code-driven golden 先例）

## 4. Findings

### blocking

none

### important

- [ ] REV-007 `src/evidence/scope/repository-scope-policy-v1.ts:250-253` `resolveRepositoryLayerV1` 在含 `\\` 时仍 `replaceAll`（round 3 遗留；本轮 golden 未触及）
  - Evidence: 注释称不做 separator 转换，实现仍转换。
  - Impact: 旁路可能绕过 F3 flavor 拒绝语义。

- [ ] REV-008 `testkit/manifests/coverage` / design inventory 仍缺完整 F7 ownership；golden 亦缺 design 表所列 `testkit/manifests/golden/repository-scope-policy-v1.yaml`
  - Evidence: `fixture-ownership.yaml` 无 F7/scope-v1 命中；`repository-scope-policy-v1.yaml` 文件不存在；registry 已有 unit+golden case。
  - Impact: ownership self-test / acceptance inventory 缺口；**不阻断** CMD-F7-GOLDEN 命令本身（已可执行且 2 passed）。

- [ ] REV-009 `canonical-locate-executor-v2.ts` skipFallback 仍裸 `classifyDiscoveryRecords`（round 3 遗留；本轮未触及）
  - Evidence: 主分类已走 scope-bound bridge，fallback 启发式仍 legacy。
  - Impact: fallback 与 production classify 可能不一致。

- [ ] REV-010 `F7-ENVELOPE-001` shadow/`missingOwners` 条件依赖 ranking（round 3 遗留；本轮未触及）
  - Evidence: ranking 缺失时「只缺 capability」证明力弱。
  - Impact: ENVELOPE 验收在无 ranking 时变弱。

### nit

- [ ] REV-011 `scope-bound-classification-bridge-v2.ts` pool 路径 `replaceAll('\\','/')`（round 3 遗留）
- [ ] REV-015 design § inventory 写 F7-LARGE owner 为 `test/golden/large-synthetic-repository.spec.ts`，实现落在 `test/golden/repository-scope-policy.spec.ts`（registry 已正确指向后者）

### suggestion

- [ ] REV-013 / REV-014（round 3）：799–801 压力与成功路径 unmatched 收缩断言仍可加强；非本轮 golden 必做

### learning

- QA Material 修 CMD-F7-GOLDEN「Unknown group」的正确闭环是：`RUNNER_SELECTIONS.golden` group+cases + ownership + 带 `isSelected` 的 golden spec；仅写 checklist 命令不够。

### praise

- golden surface 与 unit Stable ID（F7-V1 / F7-LARGE）对齐同一 fixture（`V1_POLICY_DELTA_V1` / `LARGE_SCOPE_PERMUTATION_V1`），避免另写一套弱断言。

## 5. Test And QA Focus

- 本轮已复核：`npm run test:golden -- --group repository-scope-policy` → 2 passed
- Evidence pack residual：REV-007..010 / REV-008 inventory / 远程六格 deferred 仍由 acceptance residual 跟踪
- 建议（非 blocking）：补 `fixture-ownership` 与可选 golden yaml，使 design inventory 与磁盘一致
- 不能靠本轮 review 完全确认的点：golden-all 全量重跑（本轮只跑 F7 group）；acceptance 正文不重审

## 6. Residual Risk

- Lane B OCR unavailable
- REV-008 inventory（含缺失 golden yaml）仍在；不影响本轮 CMD-F7-GOLDEN 可信执行
- important REV-007..010 未修；acceptance 已记录 residual 时保持跟踪，不因本轮反转
- F8 language port 不在 F7 范围

## 7. Verdict

- Status: passed
- Blocking count: 0
- Next: golden Material delta 不引入 blocking；**不反转**已有 acceptance；下游可继续 Goal 收尾 / residual 跟踪

## 8. Focused Closure（无则写 none）

none（本轮为 round 4 Material full re-review，范围收窄到 golden/registry；非 focused closure）
