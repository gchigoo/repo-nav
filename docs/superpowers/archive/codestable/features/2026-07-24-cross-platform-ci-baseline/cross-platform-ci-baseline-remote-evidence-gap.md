# cross-platform-ci-baseline 远程证据缺口

## 结论

S5 远程验收证据已齐备（2026-07-28）。owner 批准完整远程证据路径后，同 run 六格+aggregate、main ruleset、失败 PR 负向均已落地。

## Owner 已授权并完成的外部动作

1. 将实现 commit 推送到 GitHub，并开 feature PR `#2`。
2. 同一次 workflow run / attempt：六格 `platform-matrix` 全绿与 `cross-platform-required` aggregate success。
3. `main` repository ruleset `main-cross-platform-required`（id `19864943`）required status check = 唯一稳定名 `cross-platform-required`；sanitized 配置已保存。
4. 故意失败临时 PR `#1`：`cross-platform-required=FAILURE`，`mergeStateStatus=BLOCKED`（已关闭）。
5. merge queue：未启用（无 `merge_queue` rules）；disabled 事实已记录。

## 进度

- 本地 S1–S4：已完成
- 远程六格/aggregate：已完成（run `30323465951` / SHA `865fcf0`）
- ruleset / 失败 PR：已完成
- checklist S5：证据齐备，交 goal 会话关闭 item / accept

## 证据路径

- `.codestable/features/2026-07-24-cross-platform-ci-baseline/remote-evidence/same-run-green-865fcf0.json`
- `.codestable/features/2026-07-24-cross-platform-ci-baseline/remote-evidence/main-ruleset-sanitized.json`
- `.codestable/features/2026-07-24-cross-platform-ci-baseline/remote-evidence/failing-pr-negative.json`
- 绿 run：https://github.com/gchigoo/repo-nav/actions/runs/30323465951
- 负向 run：https://github.com/gchigoo/repo-nav/actions/runs/30323840048
- feature PR：https://github.com/gchigoo/repo-nav/pull/2
