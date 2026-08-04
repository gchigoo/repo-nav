---
doc_type: feature-review-fix
feature: 2026-07-10-repository-access-process-safety
status: resolved
round: 1
---

# Review-fix round 1 窄范围修复说明

## 失败标准

- REV-001：termination API 全失败时 runner 必须有界 reject，测试不得遗留 child/descendant。
- 必须重跑：typecheck、repository-safety、process-contract/output-isolation、process-cleanup。

## 两轮失败证据

1. 首轮：Windows `taskkill /T /F` 的真实 close 约需 1 秒以上，使用 `terminateGraceMs=100` 作为最终 close deadline 导致正常 cleanup 被误报 invariant failure；同时失败测试留下目录锁。
2. 次轮：固定 2 秒 final close deadline 后真实 abort/timeout/exact-cap tree cases 全通过；仅 synthetic all-denied terminator test 的 fixture 未记录 PID，故测试 finally 无法清理它故意留下的 child，`rmSync` 报 EPERM。

## 根因与允许范围

- 生产状态机无需扩大；真实 termination cases 已通过。
- 只允许修改 `test/unit/process-cleanup.spec.ts`：synthetic failure case 改用已有 tree fixture/PID inventory，在断言 invariant rejection 后由测试 finally 显式清理故意遗留的树。
- 不修改 design、公共 contract 或其他 feature。
