# Debug CLI lifecycle / exit report

- `debug-cli-shell`：help、unknown command、missing required option、unknown flag 均验证；usage 路径不创建 context。
- `debug-cli-lifecycle`：tool error、unexpected service exception、already-aborted signal 均通过同一 `finally`，`app.close()` 次数精确。
- `debug locate`：canonical tool error 保持 `LocateToolOutput` 等价，退出 3。
- `debug probe`：root 无效退出 3；backend health 按 provider order 串行采集，正常/不可用 health 都是完成的诊断。
- `debug golden`：selection 由 F8 registry 校验；shared JSON reporter 只暴露 counts/failure test names/artifact paths；abort signal 终止 runner child。
- 真实 docs smoke 在 open stdio 下执行 help/locate/probe/golden，四条 transcript 均 exit 0、schema valid、stderr clean。

最新 DoD：shell/lifecycle 7 active passed；locate 1 active passed；probe/golden 2 active passed；全量 unit 168/168 passed。
