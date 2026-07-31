---
doc_type: feature-goal-protocol
feature: 2026-07-23-public-output-boundary-v2
status: active
created: 2026-07-23
---

# F1 Goal Execution Protocol

## 1. Restore

每次运行先读取：

1. `goal-state.yaml`
2. `goal-plan.md`
3. `public-output-boundary-v2-design.md`
4. `public-output-boundary-v2-checklist.yaml`
5. `public-output-boundary-v2-design-review.md`
6. `approval-report.md`

以仓库事实校正 state。续跑必须结合 `goal-state.yaml.ledger` 与 `git log`，不得重复执行已经完成的 step。

## 2. Implementation Loop

1. 运行 CodeStable worktree start gate。
2. 按 S1 → S5 执行 `cs-feat` implementation。
3. S1-S4 默认执行 RED → GREEN → VERIFY，并把证据写入 step ledger；例外必须记录 `TDD exception` 与替代证据。
4. 每个 step 完成后立即：
   - 更新 checklist step status；
   - 在 `goal-state.yaml.ledger` 追加 step id、变更范围、验证与状态；
   - 运行该 step 的定向验证。
5. S1-S5 全部完成并通过 implementation gates 后，写：
   - `stage: review`
   - `status: ready`

## 3. Review Loop

使用独立 Task agent 执行 `cs-code-review`，结论必须分开覆盖：

- spec compliance：design/checklist 每条要求均有实现与证据；
- code quality：类型安全、安全边界、结构、可维护性与 regression 风险。

有 blocking/important finding 时写 `stage: review` / `status: fixing`，修复后重跑定向和受影响 full checks，再启动 focused closure 或完整复审。review passed 后写 `stage: qa` / `status: ready`。

## 4. QA Loop

独立 QA runner 执行 design Acceptance Coverage Matrix、checklist commands、forbidden corpus、no-cutover import inventory 和 full v1 regression。

QA failed/blocked 时写 `stage: qa` / `status: fixing`，修复后回到 review，review passed 后重跑 QA。QA passed 后写 `stage: acceptance` / `status: ready`。

## 5. Acceptance

进入 acceptance 前机械核对：

- `approval-report.md` 的 `approvals.goal-acceptance: approved`；
- `goal-state.yaml.acceptance_authorization_ref` 精确等于 `approval-report.md#goal-acceptance`；
- design approved、design-review/review/QA passed；
- checklist、ledger 和 required artifacts 可反查。

然后以该 ApprovalRef 进入 `cs-feat` acceptance，更新 checklist checks、architecture 与 roadmap 所需状态。acceptance passed 后先写：

```yaml
stage: complete
status: passed
```

再输出：

```text
CS_FEATURE_GOAL_COMPLETE
```

## 6. Goal Mode Ownership

Goal 模式接管 implementation、review、QA、acceptance 的普通停顿点，但不能绕过 approved design、独立 agents、TDD evidence 或 acceptance ApprovalRef。Goal 不自动 commit、merge、push、移除 `private: true` 或发布。

## 7. Handoff

以下情况立即停止：

- 需要改变 approved design、feature scope、public contract、roadmap item 或 F1/F9边界；
- 独立 reviewer/QA/acceptance runner pending、failed、blocked；
- 同一失败项三轮修复仍失败；
- 外部凭证/环境缺失导致核心行为无法判断；
- owner 要求暂停、改方向或终止。

停止前先写：

```yaml
stage: handoff
status: blocked
handoff_reason: '<具体阻塞>'
handoff_next: '<建议动作>'
```

再输出：

```text
CS_FEATURE_GOAL_HANDOFF
Reason: <具体阻塞>
Next: <建议动作>
```
