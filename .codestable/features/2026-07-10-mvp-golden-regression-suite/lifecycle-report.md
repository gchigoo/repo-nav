# Lifecycle Runner Report

- `McpLifecycleCaseRunner` 与 GoldenCaseEvaluator 分离。
- production bin 实际 stdio 运行验证 frames-only、exitCode=0、shutdown duration ≤ 5000 ms；未安装探针的 production case 对 `contextClosed` / `childrenCleaned` 返回 `null`，不伪造完成状态。
- `shutdown-cleanup-probe` 启动真实 Nest `AppModule`、真实 `NodeMcpStdioHost` 与真实 `NodeSafeProcessRunner`：provider 的 `onModuleDestroy` 写入 context marker，in-flight backend 启动 direct child + descendant，EOF 触发 host abort 后逐 PID 验证两者均已退出。
- probe observation 必须为 `contextClosed=true`、`childrenCleaned=true`；真实跳过 close marker 与真实遗留 child tree 两种 fault injection 均由 runner 拒绝。
- observation/audit 与末端清理分离：正常、fault、timeout、nonzero exit、spawn error 均进入统一 cleanup；timeout/nonzero runner tests 捕获 direct/descendant PID 与 probe temp directory，确认 reject 后两 PID 均退出且目录已删除。
- host overlap、startup queued signal、tracked-call abort/settle、application close、idempotent shutdown、transport parse failure 均由同一 lifecycle family 验证。
- 完整进程树清理同时由 lifecycle probe 和全量 unit `process-cleanup` 覆盖。

运行时报告：

- `test-artifacts/lifecycle/stdio-clean-output.json`
- `test-artifacts/lifecycle/graceful-shutdown.json`
- `test-artifacts/lifecycle/shutdown-cleanup-probe.json`
