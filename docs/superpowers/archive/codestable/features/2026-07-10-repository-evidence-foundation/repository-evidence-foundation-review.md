---
doc_type: feature-review
feature: 2026-07-10-repository-evidence-foundation
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 3
---

# repository-evidence-foundation 代码审查报告

## 1. Scope And Inputs

- Design: `.codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-design.md`
- Checklist: 5 个 steps 均为 `done`
- Evidence pack / gate / DoD: round 2 fix 后重新生成；scope `passed`；build/typecheck、17 unit、6 Golden、6 MCP tests 全部通过
- Implementation evidence: implementation record 含 S1-S5、review-fix round 1/2 和实际失败恢复记录
- Diff basis: 当前全部 F1 tracked/untracked diff；round 2 review 与 REV-005/007 fix diff
- Baseline dirty files: none

### Independent Review

- Detection: 原生 Codex Task agent 可用；OCR CLI 因未配置 LLM endpoint 失败。
- 环节 A 独立隔离 Task agent: `native-agent + completed`；round 3 已逐项核验 REV-005、REV-007 与全部前序 findings。
- 环节 B OCR CLI: `failed`；无可合并 OCR finding。
- OCR severity mapping: High→blocking/important，Medium→nit/suggestion，Low→discarded。
- Merge policy: 独立 reviewer 结论经主流程按源码、tests、roadmap 4.1/4.7 与最新 evidence 逐条复核。
- Gate effect: `reviewer: subagent` 满足独立审查锚点；无 unresolved blocking/important。

## 2. Diff Summary

- 新增：严格 TypeScript/Nest standalone foundation、schema v1 contracts、Verification Kit、真实 runners 与 tests。
- 修改：F1 checklist/goal-state、scope gate Windows process safety、review/evidence 产物。
- 删除：none。
- 未跟踪 / staged：F1 交付物未提交；staged none。
- 风险热点：schema/normalization/ID/sort、DI fail-closed、Golden parity、MCP lifecycle、gate process safety；均已覆盖正反证据。

## 3. Adversarial Pass

- 假设的生产 bug：公共 contract 或 runner 在边界输入下产生假绿或非确定输出。
- 主动攻击：BackendHealth 漏字段；JSON 伪帧；scope shell 注入/fail-open；success parity；六级排序；absolute/escape/file canonicalization；非 file literal。
- 结果：REV-001..REV-005、REV-007 已全部解除；未发现新 blocking/important。

## 4. Findings

### blocking

none

### important

none

### nit

none

### suggestion

none

### learning

- schema v1 的组合排序必须由直接 comparator tests 锁定；shell gate 必须 argv + fail closed。

### praise

- REV-005 resolved：确定性 code-unit comparator；tests 覆盖 class→role→file→start→end→id、相等与反对称。
- REV-007 resolved：file-only POSIX lexical canonicalization与 absolute/drive/UNC/escape 拒绝；非 file 反斜杠 literal 保持。
- REV-001..004 的 BackendHealth、JSON-RPC frames、scope process safety、success/error parity 修复继续有效。
- 仍未越界实现真实 reader/backend/engine/MCP tool。

## 5. Test And QA Focus

- QA 必须完整重跑 5 条 DoD，确认 contract group 实际执行 12 个 contract tests。
- 抽查完整数组排序、Unicode/标点 POSIX path、`a/../../b`、单反斜杠根路径与尾随分隔符。
- 保留 JSON诊断/文本/内嵌空行、scope 元字符/non-git、success parity 的负例。
- Evidence/gate warnings: scope gate 的 TODO/FIXME/XXX 是 CLEAN_PATTERNS 自扫描字面量；archguard/meta-cc unavailable 已由独立 review 与实际 runners解释。

## 6. Residual Risk

- REV-006：F1 的 frozen empty `useValue` 满足当前空集合 seam；F2/F3 接入首个 backend 时必须切换 factory、有序/frozen assembly 并补顺序 tests。
- scope gate 在 git executable 无法 spawn 时尚未结构化 OSError；仍非零 fail-closed。
- MCP timeout kill 后没有第二重 close deadline；F2 process safety继续覆盖。
- OCR endpoint 未配置。

## 7. Verdict

- Status: passed
- Next: 进入 `cs-feat-qa`，消费本报告 QA focus、最新 evidence pack 与 gate warnings。
