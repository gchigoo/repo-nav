---
doc_type: feature-review
feature: 2026-07-10-codegraph-fallback-orchestration
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 2
---

# codegraph-fallback-orchestration 代码审查报告

## 1. Scope And Inputs

- 独立 reviewer：原生 Task agent `/root/f2_code_review`；全程只读，没有修改实现或报告。
- 输入：approved design/checklist、implementation/evidence pack/gate/DoD、最新 review packet、CodeGraph adapter/planner、Evidence Engine orchestration、unit/Golden/live-smoke tests 与 F6 完整 diff。
- 当前证据：scope gate、DoD 6/6、build/typecheck、138 unit、39 active Golden（1 conditional skip）、31 MCP 与 `git diff --check` 全部通过。

## 2. Findings And Closure History

### Round 1：changes-requested，已关闭

- 多 symbol intent 只要任一 CodeGraph hit 通过当前文件核验就可能跳过 fallback，无法证明其他 symbol 已覆盖。
- query 进入执行后的 spawn/timeout 等失败沿用了 probe health，错误表示为 provider unavailable，而不是 failed attempt/index error。
- 关闭证据：skip gate 收紧为单一 explicit symbol；多 symbol unit + orchestration integration 强制 ripgrep。probe/query failure mapping 拆分；query spawn/nonzero/malformed 为 `error/BACKEND_PROCESS_FAILED`，timeout/abort 为 `error/BACKEND_ABORTED`，coverage exact assertions 为 `status=failed`、`indexState=error`。

### Round 2：passed

- 独立复核 `codegraph-query-planner.ts`、`codegraph-backend.ts`、Evidence Engine attempt/index mapping 以及对应 unit/Golden assertions，两个 P1 均闭环。
- 未发现 blocking 或 important finding，也未发现修复引入的高严重度回归。
- reviewer 提出的测试可读性建议已关闭：多 symbol Golden request 使用真实 `terms` 字段；post-review typecheck 与 named case 通过，reviewer 再确认 verdict 保持 passed。

## 3. Praise / Learning

- Probe capability 与 query attempt failure 语义明确分层，避免把“工具不存在”和“工具已进入查询但执行失败”混成同一 coverage 状态。
- Skip gate 选择保守单 symbol completeness，而不是从部分命中推断整个多输入请求完整，符合 source-of-truth 证据策略。
- Real binary smoke 只初始化系统 temp synthetic repository，production adapter 无 init/update/delete 路径，兼顾外部 CLI 兼容证据与用户仓库安全。

## 4. Test And QA Focus

- Probe/status/query JSON required fields fail closed、additional fields forward-compatible，query failure reason 与 coverage status/index 唯一。
- 多 anchors/terms stable plan、共享 total `maxHits`、fuzzy raw budget、unsupported dimensions 与单 symbol skip gate。
- global abort 不调用 ripgrep；local timeout/failed/no-result/incomplete/unverified 均在预算内 fallback。
- primary-only、secondary-only、merged provenance 三格只生成一个 public evidence class/reason 集。
- temp indexed repo 的 version/argv/query success、child/daemon/index cleanup 和工作 repo 无 `.codegraph/` mutation。

## 5. Residual Risk

- Windows command resolver 已验证当前 npm shim 布局；portable/native 其他安装布局仍属于环境兼容性风险。
- 未来 CodeGraph version 若变更 JSON required fields，会按设计 fail closed 并 fallback；需要通过 versioned fixture/live smoke 扩展兼容。
- CodeGraph 未来若引入不带可观察 marker 的持久后台进程，当前 temp cleanup 证据不能绝对证明其不存在；现有 1.1.6 smoke 无残留。
- Status 与文件核验之间存在竞态，因此 clean status 仍只公开 freshness unknown；可能多跑 fallback，不会放宽为 false confirmation。

## 6. Verdict

- Status：passed。
- Blocking findings：none。
- Next：进入 `cs-feat-qa`，按第 4 节复核 fake transitions 与真实 indexed temp smoke。
