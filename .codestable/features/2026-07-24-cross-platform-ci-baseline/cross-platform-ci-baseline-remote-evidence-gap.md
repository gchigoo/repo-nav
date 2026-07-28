# cross-platform-ci-baseline 远程证据缺口

## 结论

S5 远程验收证据采集中。owner 已于 2026-07-28 批准完整远程证据路径
（`f4-remote-ci-evidence=approved`）。

## Owner 已授权的外部动作

1. 将实现 commit 推送到 GitHub，或创建指向该 commit 的 PR。
2. 在同一次 workflow run / attempt 上取得六格 `platform-matrix` 全绿与 `cross-platform-required` aggregate success。
3. 将 `main` repository ruleset / branch protection 的 required status check 设为唯一稳定名 `cross-platform-required`，并保存 sanitized 配置证据。
4. 用故意失败的临时 PR 证明不可 merge（negative acceptance）。
5. 若启用 merge queue，再验证 `merge_group` 触发下 `sourceSha == github.sha == github.event.merge_group.head_sha`。

## 进度

- 本地 S1–S4：已完成
- 远程六格/aggregate：待 push 后采集
- ruleset / 失败 PR：待采集
- checklist S5：仍未 done（证据齐备后由 goal 会话关闭）

## 本地已完成（不能替代远程）

- workflow / registry / orchestrator / platform cases / `test:platform`
- `npm run build`、`npm run typecheck`、contract/baseline 本地通过
