---
doc_type: feature-review
feature: 2026-07-10-text-source-evidence-engine
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 5
---

# text-source-evidence-engine 代码审查报告

## 1. Scope And Inputs

- Approved design、done checklist、最新 implementation evidence、完整 F3 diff、scope gate、DoD 与 evidence pack 均已读取。
- implementation.before_review：scope gate、DoD、evidence pack 均 `passed`；6 条 core command exit code 0。
- baseline dirty files none；staged none。

### Independent Review

- 原生 Codex Task agent：`completed`；Paseo 不可用。
- OCR CLI：`failed`，`ocr llm test` 无有效 LLM endpoint；无 OCR finding。
- 独立 agent 对 REV-001/003/004 做当前源码与构建产物 probe；主流程逐条核验后合并。
- 独立 agent 额外启动 Golden 时受其只读 sandbox 的 `node_modules/.vite-temp` EPERM 限制；未修改文件，不覆盖主流程最新 DoD 与全量测试通过证据。

## 2. Diff Summary

- 新增：Ripgrep adapter、DiscoveryRecord/有界 logical window、保守 classifier、repository evidence engine、真实 Nest assembly、unit/Golden fixtures/manifests及实现证据。
- 修改：request file-anchor normalization、provider/export/DI/runner registry、F3 checklist/goal state。
- 删除：F1 fail-closed service/error placeholder。
- 风险热点：lexical false-confirm、fatal path、logical-window limits/status、多 symbol primary role、deadline state machine；本轮 blocking均已闭环。

## 3. Adversarial Pass

- 攻击：declaration/string/regex/SQL literal/comment、control/member slash context、symbol call/inline method、多 symbol词典序与预算、2/12/13行、4096/4097 bytes、unsafe path、abort/status/actions。
- 结果：REV-001、REV-002、REV-003、REV-004 全部关闭；无新 blocking/important。

## 4. Findings

### blocking

- none。

### important

- none。

### nit

- none。

### suggestion

- `RipgrepBackend` 固定 10 秒 process timeout，而 LocateRequest 上限为 30 秒；作为 QA residual risk定向验证，不阻塞 F3 review。

### learning

- keyword slash context必须共享 member-access boundary；同 location 多 symbol需保留全事实，再在单次 classifier 内按 role priority选 primary。

### praise

- fixed-string argv/current-file verification、merge-before-classify、full SHA-256 ID、fatal error传播、fixed-vs-adjustable nextActions与多 symbol budget恢复均有可复核正反证据。

## 5. Test And QA Focus

- `.if/.while/.for/.with()`、`.do/.else` member division正例与真实 control regex负例。
- arrow regex、`.return/.await` division、nested SQL comment、dollar quote、inline method/call-site。
- 4096/4097 exact evidence/status/limits/actions；adjustable partial、internal/caller timeout actions。
- Zeta/Alpha permutations及 1/2/充足 budget下 completeness、canonicalSymbols、primary role。
- adapter 10 秒与 request 30 秒预算一致性。

## 6. Residual Risk

- 轻量 recognizer不是 AST；未知 syntax必须继续降级为 candidate。
- adapter 10 秒 hard timeout、POSIX process-group、不同 rg minor version、reparse TOCTOU与 F7 redaction尚未由 F3 全部实机覆盖。

## 7. Verdict

- Status: passed
- Reviewer: subagent
- Next: 进入 `cs-feat-qa`。
