---
doc_type: feature-review
feature: 2026-07-10-repository-access-process-safety
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 3
---

# repository-access-process-safety 代码审查报告

## 1. Scope And Inputs

- Design / checklist：approved；S1-S4 全部 `done`。
- 最新 evidence pack / scope gate / DoD：全部 `passed`；build/typecheck、9 reader、6 process contract/isolation、6 cleanup tests 通过。
- Diff basis：scope gate 列出的全部 F2 tracked/untracked 文件；staged none。
- 独立审查：原生 Codex Task agent完成 3 轮隔离复核；REV-001..003 逐项按源码、tests 与 Node 24 ChildProcess event contract 核验。
- OCR：CLI 存在，但 LLM endpoint 未配置，环节 B failed；无 OCR finding 可合并。
- Providers：archguard / meta-cc unavailable；真实 build/typecheck/filesystem/helper-process evidence 充足。

## 2. Diff Summary

- 新增 repository access / safe process typed contracts、Node filesystem/process adapters、真实 filesystem/process-tree fixtures 与 tests。
- 修改 Nest provider 挂载、公共 exports、runner registry、F2 checklist/goal state。
- 删除 F1 fail-closed reader placeholder；默认 evidence service 仍 fail-closed。
- 风险热点：canonical containment、bounded reads、exact output caps、abort/timeout/tree kill、kill failure invariant、迟到 event/一次 settle。

## 3. Adversarial Pass

- 主动攻击：termination command 被拒/非零、hard kill close deadline、direct kill error event、合法 `..foo`、exact cap、迟到 error/close。
- Node 24 事件顺序复核：成功 spawn 的 `spawn` event 先于同一 ChildProcess 的其他 events；termination error 到达时已进入 spawned/termination branch，不会误映射为 spawn-error。
- 结果：无 unresolved blocking/important。

## 4. Findings

### blocking

none

### important

none

### resolved

- **REV-001**：tree graceful/hard failure不再被吞；hard kill 后固定 2 秒 close deadline；全部 tree/direct termination 失败时有界 invariant rejection。pre-spawn error才映射 spawn-error；termination error维持 deadline；迟到 error/close被安全吸收且不双 settle。Synthetic direct-kill error与真实 Windows tree cases通过。
- **REV-002**：containment 使用 `path === '..' || path.startsWith('..' + sep)`；root 内 `..notes.md` / `..cache/entry.ts` 正例和 parent/junction escape 负例通过。
- **REV-003**：stdout/stderr 达到 exact cap 即终止；普通 helper 与 direct+descendant exact 1024-byte cases通过。

### suggestion

- 后续可把 `invalid-request|spawn-error` 的 null exit/signal + empty outputs 编入 SafeProcessFailureSchema runtime refine。

### praise

- handle finally、fatal UTF-8 decode、post-open fstat、独立 raw-byte caps、controlled env、真实 descendant inventory 与 listener检查形成了可复核安全底座。

## 5. Test And QA Focus

- 完整重跑 5 条 DoD，并抽查真实 Windows abort/timeout/exact-cap tree PID cleanup。
- 保留 termination API 全失败 + direct kill error → invariant reject 的 synthetic evidence；确认迟到 error/close无 unhandled或双 settle。
- 抽查 `..foo` / `..dir/file` 正例与 parent/absolute/junction escape 负例。
- invalid-request 数值/argv/env UTF-8 budgets 与 Windows env key case collision可作为加强项。
- POSIX detached process-group / negative PID / EPERM 路径需对应平台复核。

## 6. Residual Risk

- Reparse TOCTOU 维持 design 的 local stable filesystem 支持边界。
- 当前真实 runtime evidence 为 Windows；POSIX process-group 未在本轮实机执行。
- Windows ADS、真实 unreadable/special device 的稳定 fixtures 有限。
- OCR endpoint、archguard、meta-cc unavailable；均非核心验证替代品。

## 7. Verdict

- Status: passed
- Reviewer: subagent
- Next: 进入 `cs-feat-qa`，消费 Test And QA Focus、evidence pack residual risks 与完整 DoD。
