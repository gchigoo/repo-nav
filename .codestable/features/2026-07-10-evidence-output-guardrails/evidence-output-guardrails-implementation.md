---
doc_type: feature-implementation
feature: 2026-07-10-evidence-output-guardrails
status: completed
---

# evidence-output-guardrails 实现记录

## 第一性原则 pre-pass

- 外部行为：同一 locate 请求在 backend/fallback/verification/limits/abort 汇总后只得到一个 final status；任何 public evidence/error/diagnostic surface 不泄露匹配到的敏感原值。
- 不可破约束：ID/order 在 redaction 前确定；fixed safety caps 不建议提高；caller abort 与 engine deadline 可区分；tool error code 不因 safe message 改写而漂移。
- 最小充分改动：新增 status/next-action/result-budget/redaction/error policies，在 Evidence Engine finalization 与 MCP serializer 唯一挂载；不改 backend query/candidate recall/tool/schema version。
- 必须不写：numeric confidence、自然语言 PII 猜测、新 tool/persistence、raw stderr/stack/path 透传。

## 基线与开工门禁

- 基线 commit：`ba3ae5d13057fa1ed7084fc8d2029723660817ad`（F6 accepted）。
- 开工前 F6：build/typecheck、138 unit、39 active Golden + 1 skip、31 MCP 全部通过，工作树 clean。
- F7 design approved / design-review Round 4 passed；implementation.start scope gate passed。

## S1：完整 transition evaluator

- 新增 `locate-status-evaluator.ts` 十 row inventory 与纯 evaluator，固定 timeout → backend unavailable → gap → ok/no-result priority。
- 新增 `next-action-policy.ts`，按 abort source、limit class 与 schema maxima 生成稳定 action set。
- 新增 first-writer-wins `LocateAbortCoordinator`；CodeGraph primary verification abort 会保留已核验证据，backend 固定 process timeout 不再冒充 engine deadline。
- 移除 MCP host 的重复 request timer，engine-owned deadline 与 SDK caller abort 不再竞态。
- Evidence：CMD-STATUS 9 passed；`locate-transition-matrix-report.md`。

## S2：limits / stable result selection

- 新增 `result-budget-selector.ts`；confirmed/candidate 在截断前按 canonical key 排序，候选预算仍不影响 confirmed。
- `MAX_FILES_REACHED` 只在确有额外 eligible file 时产生；backend incomplete 只贡献 coverage gap。
- fixed file/excerpt caps 无 RETRY；adjustable limits 仅在当前值未达 schema max 时 RETRY。
- Evidence：CMD-LIMITS 3 passed；`result-limit-matrix-report.md`。

## S3：redaction 与 forbidden scan

- 新增 ID-after redactor，覆盖 secret/connection/email-phone/oversized 四类 reason；跨 evidence 传播已识别 sensitive token，避免 derived candidate 二次泄露。
- secret assignment 按双引号、单引号、backtick 与无引号完整消费 value；覆盖空格/逗号/分号/转义引号，template interpolation 与畸形引号 fail-closed 为整段 placeholder；可确定的 malformed tail 参与跨 evidence propagation。
- Engine service result 与 MCP serializer 均只输出 redacted pack；diagnostic scrubber 处理正式 stderr，stdout 未引入非协议输出。
- reader cap/binary failure 与 public 2 KiB display cap 分支分别验证。
- Evidence：4 Golden + 1 stdio MCP；`redaction-forbidden-scan-report.md`。

## S4：四类 error parity

- 新增 contracts-level safe public error factory；INVALID_REPOSITORY 按 approved table 为 recoverable=true，其余 code/action/message exact。
- factory/policy 将 suggestedAction 按 code 白名单归一化；MCP 仅对 terms 缺失或空数组返回 ADD_TERM。
- Engine、MCP invalid input、thrown exception 与 serializer 共用同一 safe policy；structured/text/isError parity 保持。
- Evidence：CMD-ERRORS passed；`tool-error-parity-report.md`。

## Code review Round 1 修复

- 独立 reviewer 提出 5 个 P1：quoted secret 残留、CodeGraph abort 丢证据、abort source 竞态、backend 固定 timeout 错误 retry、tool error action 未锁定。
- Round 1 五项均按最小边界修复，并新增 service/MCP forbidden scan、CodeGraph caller/deadline integration、first-writer race、fixed backend timeout 与全 code/action 负向用例。
- 独立 Round 2 确认 2-5 关闭，并补充发现 backtick 与 malformed cross-evidence 绕过；已新增 template 分支、interpolation fail-closed、malformed tail propagation，以及真实 Engine/MCP forbidden corpus。
- 复审输入已重新生成；等待独立 Round 3 verdict。

## 最后一轮本地审计

- 全量：build/typecheck、158/158 unit、47 active Golden + 1 conditional skip、32/32 MCP 全部通过。
- Mandatory commands：status 13、limits 3、redaction 5 Golden + 1 MCP、error parity 5 selected tests 全部通过。
- `git diff --check` 无 whitespace error；source/test/testkit marker scan无 debug、TODO/FIXME/XXX、注释掉实现或 unused import。
- Checklist S1-S4=`done`；C1-C12 保持 `pending`，由 acceptance 统一核对。
