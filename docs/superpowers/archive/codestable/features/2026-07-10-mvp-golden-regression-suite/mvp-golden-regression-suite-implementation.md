---
doc_type: feature-implementation
feature: 2026-07-10-mvp-golden-regression-suite
status: completed
---

# mvp-golden-regression-suite 实现记录

## 第一性原则 pre-pass

- 外部行为：同一份 Golden manifest 对 service 与 MCP observation 使用唯一 evaluator；lifecycle 只由独立 runner 判定。
- 不可破约束：完整 public projection 的 class、reason、ID、order、excerpt、promotion、provenance、coverage 和 nextActions 不得被 normalization 隐藏。
- 最小充分改动：只扩展 testkit、fixtures、runner 与 versioned artifacts，不为 snapshot 改 production 语义。
- 必须不写：真实业务源码、网络访问、工作仓库索引、单次硬时延阈值、自动覆盖 committed performance baseline。

## 基线与开工门禁

- 基线 commit：`1fdcc0449e7a173dcbcac0a650c6920b4a3244d9`（F7 accepted）。
- F8 design approved，design-review Round 3 passed。
- Feature 状态已切换为 `implementing`，实现范围由 `implementation-scope.txt` 固定。

## S1：共享 evaluator 与 exact companion projection

- manifest success/error 使用同一 evaluator；service 与真实 MCP stdio adapter 只生产 observation。
- 23 个 success manifest 均有 versioned companion snapshot，confirmed/candidates exact length/order，完整 public projection deep exact。
- `repositoryRoot` 是唯一 normalization allowlist；43 个 public field mutation 已覆盖。

## S2-S3：fixture families

- classification/candidate/backend/security/final-status group alias 映射到真实既有 cases，并新增 F8 family-contract cases。
- assignment/object/SQL/symbol 与 comment/DTO/string/SQL decoy 均有正反测试；candidate promotion/forbidden ID 精确。
- 79 个 enum/code owner 由实际 companion observations、显式 executable schema probes、逐 reason-code evaluator negative probes 与 ownership manifest 自动对账；unrelated owner mutation 会失败，不依赖 group 名称推断或 completeness 自证。

## S4：protocol / lifecycle

- MCP success/error observation 复用 shared evaluator；protocol 与 lifecycle group 可独立选择。
- `McpLifecycleCaseRunner` 对 production bin 验证 frames/exit/duration，并用 instrumented real Nest host + `NodeSafeProcessRunner` probe 实测 context hook、in-flight direct child 与 descendant cleanup；跳过 marker/遗留进程两种真实 fault injection 都会阻塞，timeout/nonzero 路径也会无条件清理两级 PID 与 probe temp directory。

## S5：full suites

- `--all` 已成为 unit/Golden/MCP 正式 runner 参数；`--report-performance` 仅允许 Golden。
- 全量：158/158 unit、64 active Golden + 1 conditional skip、39/39 MCP passed。
- completeness：79 owners、23 success snapshot pairs、1 error manifest、43 field mutations passed。

## S6：large synthetic baseline

- 固定 1000 files / 50 modules / 10 direct mappings / 200 named decoys，warmup=1、measured=5。
- 5 次 projection hash 完全一致；exact 10 confirmed / 10 candidates / MAX_FILES_REACHED，cleanup passed。
- timing trend non-blocking；runtime report gitignored，committed baseline 只能经 review 更新。

## 实现门禁前验证

- build/typecheck passed。
- evaluator 8 passed；families 46 passed（19 filtered/conditional skips）。
- MCP protocol/lifecycle 37 active passed（2 filtered skips）；full MCP 39/39 passed。
- full Golden 64 active passed + 1 conditional skip；performance core case passed。
- `git diff --check` passed；source/test/testkit marker scan 无 TODO/FIXME/XXX/debugger/console.log。
