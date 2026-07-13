---
doc_type: feature-evidence
feature: 2026-07-10-codegraph-fallback-orchestration
status: current
---

# CodeGraph 真实 indexed temp-repo smoke

- 日期：2026-07-13；平台：Windows；observed CodeGraph version：`1.1.6`。
- 测试只在系统 temp 下创建 `repo-nav-codegraph-*`，写入单文件 `AlphaMapping` synthetic repository。
- `codegraph init <temp>`、`status --json <temp>`、`query --json --path <temp> --limit 5 AlphaMapping` 全部通过 `NodeSafeProcessRunner`，无 shell 拼接。
- Windows npm/portable shim 由 adapter 解析为 `node.exe + JS entry + logical argv`，避免 `shell:false` 无法直接 spawn `.cmd`；POSIX 保持直接 `codegraph` executable。
- Probe 返回 initialized/indexFound、version 1.1.6 与 clean pendingChanges；query 返回 `sample.ts:1`、symbol `AlphaMapping`，parser/limit/canSkip metadata 全部通过。
- init owned child 已退出；`.codegraph` 内没有 daemon/watcher pid/lock artifact；temp repository 可递归删除，删除后不存在。
- 工作仓库测试前后 `.codegraph/` existence 不变（均不存在），未初始化、更新或删除目标工作仓库 index。
- 验证：`npm test -- --group codegraph-live-smoke --case indexed-temp-repo` → 1 passed，exit 0。
