---
doc_type: feature-review
feature: 2026-07-24-language-capability-boundary
status: passed
reviewer: subagent
reviewer_id: independent-task-agent-f8-language-capability-boundary-r4
round: 4
reviewed: 2026-07-28
lane_a_state: completed
lane_a_ref: ""
lane_a_reason: ""
lane_b_state: unavailable
lane_b_ref: ""
lane_b_reason: "lane_b unavailable (ocr LLM endpoint unconfigured / not runnable this round)"
---

# language-capability-boundary 代码审查报告（round 4）

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-24-language-capability-boundary/language-capability-boundary-design.md`（`status: approved`）
- Checklist: `language-capability-boundary-checklist.yaml`（S1–S5 `done`；C 项由 acceptance 翻转）
- Evidence pack / gate / DoD / QA / acceptance：已存在；本轮**不反转 acceptance**，只评估 QA Material kernel delta 是否引入 blocking
- Diff basis（本轮可归因）:
  - `src/evidence/language/ecmascript-lexical-kernel-v2.ts`：`startsRegexLiteral` 前驱字符类恢复 legacy `/[[{(=,:;!?&|]/u`，去掉误加 `+-~` range（F8-MOVE deep-exact）
- Review mode: full-rereview（round 4，Material delta；Lane A focused on kernel charset only；非 focused closure）
- Verification:
  - `npm test -- --group language-capability-boundary --case move-only-characterization` → exit 0；**1 passed** | 396 skipped
  - `npm test -- --group language-capability-boundary` → exit 0；**15 passed** | 382 skipped
- Baseline dirty files: worktree 内其它 F8 / ambient / acceptance 产物；本结论**只归因** kernel `startsRegexLiteral` charset 恢复；不重审 round 3 已关闭的 mount/aggregation/seal

### Independent Review

- Detection: 本报告为独立 Task agent Lane A（round 4）；Lane B OCR 本轮 `unavailable`（`ocr` 已装，`ocr llm test` 无有效 endpoint）
- 环节 A: independent-agent + completed
- 环节 B: unavailable（`lane_b unavailable`）
- Merge policy: 仅 Lane A 对 kernel charset 事实核验后定稿；不得伪装 `subagent+ocr`
- Gate effect: `reviewer: subagent`；blocking=0 → `passed`

### Prior Blocking Closure（round 3）

| ID | Closure | Evidence |
|---|---|---|
| REV-001..004 | closed（round 3） | 本轮不重开；kernel Material 未改 production mount / aggregation / seal |
| REV-005..014 | important/nit 延续 | 非本轮 Material 范围；acceptance residual 已记录；不升 blocking |

## 2. Diff Summary

- 新增：none（本轮 Material）
- 修改：`ecmascript-lexical-kernel-v2.ts` — `startsRegexLiteral` 前驱 charset 与注释（禁止 `+-~` range）
- 删除：none
- 风险热点：F8-MOVE deep-exact；误 range 会把字母前驱（如 `obj.return /`）当 regex 起点并吞掉后续 assignment

硬约束抽查（本轮）：

| 约束 | 结果 |
|---|---|
| charset 与 legacy `direct-mapping-classifier` `startsRegexLiteral` 字节一致：字符类 `[{(=,:;!?&|`（无 `+-~` range） | 通过（对照 commit `77031f2`） |
| 无 `+-~` range 残留于 `src/evidence` | 通过 |
| classifier 经 kernel re-export / import，无第二份 mask 实现 | 通过 |
| F8-MOVE-001 move-only-characterization 绿 | 通过 |
| acceptance 已记 Material delta；本轮不反转 | 通过（只评估 blocking） |

## 3. Adversarial Pass

- 假设的生产 bug：恢复不完整，仍含 ASCII range，使 identifier 尾字符触发 regex 误判
- 主动攻击过的反例：
  1. `startsRegexLiteral` 前驱 class 在 `|` 后立即 `]` 闭合，**无** `+-~`；注释明确禁止 range 写法
  2. 对照 legacy（`77031f2` classifier）：同一 charset；keyword / `=>` / control-header 分支未改
  3. 反例机理：若误写 `+-~`，`+`(43)…`~`(126) 含字母；`obj.return /` 的 `n` 会 `test` 为 true → 误入 regex → mask 吞 assignment；当前 charset 不含字母 → 该路径依赖 standalone-keyword（`.` 前缀使 `return` 不成立）→ 不误判
  4. `maskNonCode` 状态机其余分支未改；classifier 只 import/re-export kernel
  5. 测试：`move-only-characterization` + F8 全组 15 绿
- 结果：无新 blocking；acceptance 已记录该 Material，无需回退

## 4. Findings

### blocking

none

### important

- [ ] REV-005..014（延续，非本轮 Material）见 round 3；acceptance residual 已覆盖。本轮不新开编号。

### nit

none（本轮 Material 范围）

### suggestion

none

### learning

- JS 字符类里写 `+-~` 会变成 ASCII range，不是「加号/减号/波浪号」三个字符；move-only 抽取时必须对照 legacy 字面量，不能「补全运算符」式改写。

### praise

- QA Material 最小修复：只恢复 charset + 注释约束，未扩 scope；与 F8-MOVE deep-exact 一致。

## 5. Test And QA Focus

- 已核验：move-only-characterization；F8 unit 全组 15
- 本轮不再要求重跑 QA must-run 全矩阵（QA round 1 已绿且含本 Material）
- acceptance 已通过且记 Material；**不反转**

## 6. Residual Risk

- Lane B OCR unavailable（同 round 3）
- round 3 important/nit（REV-005..014）与 empty-ranking / harness bundle：仍在 acceptance residual；本 Material 不扩大也不关闭

## 7. Verdict

- Status: passed
- Blocking count: 0
- Acceptance：已 `passed`；本轮 Material **不引入 blocking**，**不反转** acceptance
- Next: Goal 收尾 / F9 另授；无 review-fix

## 8. Focused Closure（无则写 none）

none（本轮为 round 4 Material full re-review，范围收窄到 kernel charset；非 focused closure）
