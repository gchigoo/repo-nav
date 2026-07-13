---
doc_type: feature-qa
feature: 2026-07-10-evidence-output-guardrails
status: passed
tested: 2026-07-13
round: 1
---

# evidence-output-guardrails QA 报告

## 1. Scope And Inputs

- Design：`evidence-output-guardrails-design.md`
- Checklist：`evidence-output-guardrails-checklist.yaml`，S1-S4=`done`
- Review：`evidence-output-guardrails-review.md`，Round 3=`passed`，无 unresolved blocking/important
- Evidence pack：`evidence-output-guardrails-evidence-pack.md`
- Gate results：`evidence-output-guardrails-gate-results.json`，passed
- DoD results：`evidence-output-guardrails-dod-results.json`，6/6 core passed
- Diff basis：F6 accepted commit `ba3ae5d13057fa1ed7084fc8d2029723660817ad` 后当前 F7 工作区
- Baseline dirty files：none；全部 dirty/untracked 路径可归因于 F7
- Feature type：mixed
- Core evidence gate：Evidence Engine 真实 finalization、真实 Node reader/CodeGraph fixture、真实 stdio MCP structured/text/isError/lifecycle surface。该 feature 没有 UI，不需要 browser；Engine Golden 与 stdio MCP integration 是相应端到端替代证据。

## 2. Verification Matrix

| ID | 来源 | 核心性 | 场景 / 风险 | 证据类型 | 命令或动作 | 期望 | 结果 |
|---|---|---|---|---|---|---|---|
| QA-001 | design S1 / review | core-functional | status priority、first abort source、CodeGraph abort 前 evidence 保留、backend fixed timeout 分层 | unit + integration | CMD-STATUS | 13 tests pass；caller 无 retry，deadline 可调才 retry | pass |
| QA-002 | design S2 | core-functional | 六类 limits、stable selection、fixed/adjustable action | Golden | CMD-LIMITS | 3 tests pass；真实 truncation 才记 limit | pass |
| QA-003 | design S3 / review rounds | core-functional/security | 单/双/backtick/template/malformed/cross-evidence、DSN/PII/oversized，service 与 MCP 全 surface forbidden scan | unit + Golden + real stdio MCP | CMD-REDACTION + full suites | 5 Golden + 1 MCP targeted；raw forbidden values absent | pass |
| QA-004 | design S4 / review | core-functional/security | 四类 error code/recoverable/action/message parity，非法 action 白名单删除 | MCP integration + unit | CMD-ERRORS | 5 selected tests pass；structured=text，isError=true | pass |
| QA-005 | DoD / regression | core-supporting | build、strict type、所有既有 unit/Golden/MCP 无回归 | build/typecheck/full suites | 聚合全量命令 | build/typecheck；158 unit；47 active Golden + 1 skip；32 MCP | pass |
| QA-006 | gate / cleanliness | non-functional | scope、whitespace、debug/TODO/FIXME/XXX、死 import | scope gate + diff | scope gate / `git diff --check` / marker scan | 无 blocking/out-of-scope/whitespace error | pass |

## 3. Command Results

- `npm run build` → exit 0：TypeScript build passed。
- `npm run typecheck` → exit 0：strict no-emit typecheck passed。
- CMD-STATUS → exit 0：13 passed，含真实 1 秒 engine deadline 与 caller/deadline CodeGraph evidence-preservation。
- CMD-LIMITS → exit 0：3 passed。
- CMD-REDACTION → exit 0：5 Golden + 1 real stdio MCP passed。
- CMD-ERRORS → exit 0：5 selected MCP tests passed。
- `npm test` → exit 0：158/158 unit passed。
- `npm run test:golden` → exit 0：47 active passed，1 个既有 conditional skip。
- `npm run test:mcp` → exit 0：32/32 passed。
- `git diff --check` → exit 0：无 whitespace error；仅 Git CRLF 提示。
- scope gate → passed：所有非机器产物均在 F7 approved prefixes；无 cleanliness warning。

## 4. Scenario Results

- [x] QA-001 final status / abort source：pass
  - Evidence：first-writer-wins 顺序测试；CodeGraph 多 hit 在 caller abort 与 internal deadline 下均保留已完成 evidence；backend `BACKEND_ABORTED` 且 request 未 abort 时为 backend unavailable，无提高 request limit action。
- [x] QA-002 result budget：pass
  - Evidence：maxFiles/maxConfirmed/maxCandidates 按 stable key 截断；fixed file/excerpt caps 无 retry；backend incomplete 不伪造 MAX_FILES。
- [x] QA-003 redaction：pass
  - Evidence：真实 Engine Golden 对 normal/quoted/backtick/malformed seed + derived 同值做 service JSON scan；stdio MCP 对 structured/text/protocol result/stderr 做 forbidden scan；`${...}` fail-closed unit passed。
- [x] QA-004 tool errors：pass
  - Evidence：所有 error code × action 负向 unit；MCP missing/empty/wrong-type/invalid-member terms；service 注入非法 action 后 serializer 删除。
- [x] QA-005 regression：pass
  - Evidence：最终代码状态下 build/typecheck/full unit/Golden/MCP 全绿。
- [x] QA-006 cleanliness/scope：pass
  - Evidence：scope gate、diff check 与 marker scan均无 blocking。

## 5. Findings

### failed

none

### blocked

none

### residual-risk

- Redaction matcher 是明确、确定性的表达式边界；未来支持新 secret 语法时必须同步 forbidden corpus。
- Diagnostic scrubber 对 UNC 与单段 POSIX absolute path 的覆盖有限；当前生产调用只有固定安全文本，本轮无泄漏证据，作为非核心既有限制保留。
- archguard/meta-cc provider unavailable，只缺附加摘要；core scope/DoD/runtime evidence 均已独立通过。

## 6. Cleanliness

- Debug output：pass
- Temporary TODO/FIXME/XXX：pass
- Commented-out code：pass
- Unused imports / dead code from this feature：pass（typecheck/build 通过，静态 diff 复核无残留）
- Out-of-scope files：pass

## 7. Verdict

- Status：passed
- Next：`cs-feat-accept`
