---
doc_type: feature-review
feature: 2026-07-10-evidence-output-guardrails
status: passed
reviewer: subagent
reviewed: 2026-07-13
round: 3
---

# evidence-output-guardrails 代码审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`
- Checklist：`.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml`，S1-S4 全部 `done`
- Evidence pack：`evidence-output-guardrails-evidence-pack.md`
- Gate results：`evidence-output-guardrails-gate-results.json`，`implementation.before_review=passed`
- DoD results：`evidence-output-guardrails-dod-results.json`，6/6 core commands passed
- Implementation evidence：`evidence-output-guardrails-implementation.md` 与四份专项证据报告
- Diff basis：F6 accepted commit `ba3ae5d13057fa1ed7084fc8d2029723660817ad` 后的当前 unstaged/untracked F7 scope；scope gate 盘点 40 个非机器产物路径，均在批准前缀内
- Baseline dirty files：none；当前 dirty tree 全部可归因于 F7

### Independent Review

- Detection：原生 Codex Task agent 可用；Paseo 未提供；`ocr` CLI 已安装但 `ocr llm test` 因无有效 LLM endpoint 配置失败
- 环节 A 独立隔离 Task agent：`native-agent + completed`，完成三轮只读 review
- 环节 B OCR CLI：`failed`（配置不可用，未产生 findings）
- OCR severity mapping：High→blocking/important，Medium→nit/suggestion，Low→discarded
- Merge policy：Task agent 每轮 finding 均由主流程以代码反例、定向测试和全量回归逐条核验；所有已启动且可用的 review lane 已收敛
- Gate effect：独立 Task agent Round 3 `passed`，OCR 不可用按 `reviewer: subagent` 降级，不阻塞

## 2. Diff Summary

- 新增：abort source coordinator、status evaluator、next-action policy、stable result selector、evidence redactor、safe public error factory、diagnostic scrubber、F7 unit/Golden/MCP suites 与专项证据产物
- 修改：Evidence Engine finalization、MCP serializer/host/shutdown、request limits、public exports、Golden manifests/runners 和 F7 goal 状态
- 删除：none
- 未跟踪 / staged：新增文件均未跟踪；没有 staged 文件
- 风险热点：abort 并发时序、backend 与 request timeout 语义、敏感 excerpt 全 surface 泄漏、公开错误 code/action parity、结果预算与状态优先级

## 3. Adversarial Pass

- 假设的生产 bug：合法但边界特殊的 secret 表达式残留，或 deadline/caller/backend timeout 竞态把 status/action 判错
- 主动攻击过的反例：含空格/逗号/分号/转义字符的单双引号值、backtick 与 `${...}`、malformed quote 与 derived evidence 复用、CodeGraph 多 hit 中途 abort、deadline-first/caller-later、caller-first/deadline-later、backend 固定 timeout、非法 error/action 组合、terms 错误类型与非法成员
- 结果：Round 1 的五项 P1 与 Round 2 的一项 P1 均已修复并形成回归；Round 3 未发现 blocking/important/nit

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

- Redaction 属于安全边界：matcher 新增表达形式时，必须同步真实 Engine、MCP structured/text/stdout/stderr forbidden corpus，不能只补正则单测。
- abort source 必须 first-writer-wins；最终时刻读取多个 signal 的当前状态会把后到事件误判为真实终止来源。

### praise

- status、next-action、budget、redaction、safe error 分为独立纯 policy，backend/candidate query 语义没有被 finalization guardrail 反向污染。
- CodeGraph primary abort 会保留 abort 前已完成的稳定 evidence，并由统一 public redaction boundary 输出。

### 已关闭的审查历史

- Round 1：quoted secret 部分遮盖、CodeGraph primary abort 丢证据、abort source 竞态、backend 固定 timeout 错误 retry、tool error action 未锁定，共五项 P1，全部关闭。
- Round 2：backtick/template 与 malformed cross-evidence 绕过一项 P1，已由 template fail-closed、malformed tail propagation 和真实 Engine/MCP forbidden scan 关闭。
- Round 3：独立 reviewer 明确 `passed`，无 blocking / important finding。

## 5. Test And QA Focus

- QA 必须重点复核：六条 mandatory DoD；158 unit；47 active Golden + 1 conditional skip；32 MCP；quoted/backtick/malformed/derived forbidden scan；caller/deadline preservation；backend fixed timeout no-retry；四类 error parity
- Evidence pack residual risks / gate warnings：archguard 与 meta-cc provider unavailable，仅影响附加静态摘要，不影响 core gate；scope/evidence/DoD 均 passed
- 建议新增或加强的测试：本轮 reviewer 要求的 backtick、template interpolation、malformed seed + derived 同值已全部纳入长期测试
- 不能靠 review 完全确认的点：未来新增 secret 表达式的覆盖完整度；由长期 forbidden corpus 约束

## 6. Residual Risk

- 确定性 matcher 不尝试识别任意自然语言 secret；未来扩展语法时需同步 matcher 与 forbidden corpus。
- `DiagnosticScrubber` 对 UNC 路径与单段 POSIX absolute path 的覆盖仍有限；当前正式调用只写固定安全文本，本轮未扩大该风险，QA 记录为非阻塞既有限制。

## 7. Verdict

- Status：passed
- Next：进入 `cs-feat-qa`
