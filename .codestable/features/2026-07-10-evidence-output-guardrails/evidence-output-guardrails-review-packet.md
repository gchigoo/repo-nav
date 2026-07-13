# CodeStable Code Quality Review Packet

- root: `D:/Personal/repo-nav-worktrees/repo-nav-mvp`
- unit: `.codestable/features/2026-07-10-evidence-output-guardrails`
- stage: `quality`

## Reviewer Mission

Check whether the code is clean, tested, maintainable, secure, and robust under real project conditions.

## Stage Focus

maintainability, readability, coupling, security, edge cases, test gaps, performance, idempotency, crash-resume behavior, and deterministic boundaries

## Reviewer Output Contract

- Lead with findings, ordered by severity.
- Include severity (`P0`/`P1`/`P2`/`P3`) and confidence for each finding.
- Reference concrete files, code, docs, or validation evidence when possible.
- If there are no blocking findings, say so explicitly and list residual risks or test gaps.

## Unit Documents
### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml`

```
feature: 2026-07-10-evidence-output-guardrails
created: '2026-07-10'
steps:
- id: S1
  action: 实现完整 LocateStatus transition evaluator
  exit_signal: 每个 predicate row、hit-unverified fallback 分支、abort source 与复合优先级均有命名 case，缺 case 时 completeness test 失败
  verification: npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max
  artifacts: [LocateStatusEvaluator, transition matrix, completeness report]
  status: done
- id: S2
  action: 实现 limit selection、coverage 与 nextAction contract
  exit_signal: 六类 limits 的 0/边界/截断/empty/evidence/stable-order 行为全部可判定
  verification: npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence
  artifacts: [ResultBudgetSelector, limit matrix, Golden logs]
  status: done
- id: S3
  action: 实现 evidence/error/log redaction 与 forbidden scan
  exit_signal: 四类 reason 的 metadata/ID/order 稳定且 raw values 不出现在任何 public/diagnostic surface
  verification: npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity
  artifacts: [EvidenceRedactor, DiagnosticScrubber, forbidden scan report]
  status: done
- id: S4
  action: 实现四类 RepoNavToolError 四表面 parity
  exit_signal: code/recoverable/action/message/isError/structured/text 逐 error code 一致且无敏感信息
  verification: npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity
  artifacts: [error contract matrix, application/MCP transcripts]
  status: done
checks:
- id: C1
  item: predicate-keyed matrix 覆盖 tool errors、ok、no_result、hit-unverified两分支、backend_unavailable、partial、caller abort、internal deadline
  source: design 1 status matrix
  status: pending
- id: C2
  item: tool error > timeout > backend-unavailable special > partial gap > ok/no_result 优先级固定
  source: design 1
  status: pending
- id: C3
  item: no_result 仅在 required attempts 完成且无 limit/verified evidence 时产生
  source: design 1/3.1
  status: pending
- id: C4
  item: maxFiles/maxConfirmed/maxCandidates/file/excerpt/timeout 逐类映射 reason/status/action
  source: design 1 limit table
  status: pending
- id: C5
  item: RETRY 只用于未达 schema max 的 caller-adjustable limit
  source: design 1 limit table
  status: pending
- id: C6
  item: result selection 与 ID/order 不依赖 backend/filesystem arrival order
  source: design 1/2.2
  status: pending
- id: C7
  item: reader cap 只产生 limit/exclusion；仅完整 cap 内 excerpt 的 2KiB display token 可产生 oversized redaction
  source: design 1 redaction table
  status: pending
- id: C8
  item: 四类 RedactionReasonCode matcher/metadata/public action 正确；redaction 在 ID 后且 raw hash 不输出
  source: design 1/3.1
  status: pending
- id: C9
  item: raw sensitive values 不出现在 service/MCP/text/error/stdout/stderr
  source: design 1/3.1
  status: pending
- id: C10
  item: 四个 tool error 的 recoverable/action/message/isError/parity exact contract
  source: design 1 error table
  status: pending
- id: C11
  item: 不扩展 recall/candidate/tool/persistence，不把 no_result 说成不存在
  source: design 1/3.2
  status: pending
- id: C12
  item: transition/limit/redaction/error matrices 与 transcripts/scan report 可盘点
  source: design 3.4
  status: pending
dod:
  commands:
  - id: CMD-BUILD
    command: npm run build
    core: true
    failure_handling: fix-or-block
  - id: CMD-TYPECHECK
    command: npm run typecheck
    core: true
    failure_handling: fix-or-block
  - id: CMD-STATUS
    command: npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max
    core: true
    failure_handling: fix-or-block
  - id: CMD-LIMITS
    command: npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence
    core: true
    failure_handling: fix-or-block
  - id: CMD-REDACTION
    command: npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity
    core: true
    failure_handling: fix-or-block
  - id: CMD-ERRORS
    command: npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity
    core: true
    failure_handling: fix-or-block
  evidence_required: [command_output, diff_summary, artifact_inventory, transition_matrix, forbidden_scan_report]
  cleanliness:
    debug_output: forbidden
    temporary_todo_fixme: forbidden
    commented_out_code: forbidden
    unused_imports: forbidden
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design-review.md`

```
---
doc_type: feature-design-review
feature: 2026-07-10-evidence-output-guardrails
status: passed
reviewed: 2026-07-10
round: 4
---

# evidence-output-guardrails feature design 审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`
- Checklist：`.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml`
- Roadmap：`.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md`
- Requirement：`.codestable/requirements/source-of-truth-evidence.md`
- Baseline：`04b04f7a1314f322e82157363ced505e2199cfc8`（设计审查时 no-code baseline）

### Independent Review

- Status：completed
- Detection：native-agent
- Provider / agent：`/root/design_review_release_edges`
- Raw output：独立只读 reviewer 完成多轮审查；最终 Round 4 无 blocking / important finding
- Merge policy：主 agent 逐条核验 finding、同步 design/checklist、重跑 YAML 与 cross-doc gate 后复审
- Gate effect：none

## 2. Design Summary

- Goal：最终状态、limits、redaction、safe errors 与全表面 parity。
- Steps：4 条，均有可独立判断的 exit signal。
- Checks：12 条，均能追溯到 design、roadmap contract 或 artifact。
- Baseline / validation：真实 build/typecheck/unit/Golden/MCP/docs 命令已进入 DoD。

## 3. Findings

### blocking

- none

### important

- none

### nit

- none

### suggestion

- 实现若改变 approved interface、status/reason、ordering、failure mode 或验证边界，必须回到 design review。

### learning

- Roadmap 共享协议必须在 feature 中落成 typed seam、可执行错误模式和真实证据入口。

### praise

- 方案边界、negative fixtures、命令与 required artifacts 已形成可证伪闭环。

## 4. User Review Focus

- Owner 已在第二次 roadmap checkpoint 批准本设计。
- Implement 必须遵守 design 的明确不做、清洁度和恢复边界。
- Review / QA / acceptance 必须消费真实 command logs、gate results 与 evidence pack。

## 5. Evidence Confidence Ledger

| Check | Verdict | Evidence Class | Basis | Follow-up |
|---|---|---|---|---|
| Acceptance Coverage Matrix | pass | E+C | 核心场景均映射到 step、命令和证据 | implementation 运行证据 |
| DoD Contract | pass | E | 五阶段 DoD、commands、artifacts 齐全 | none |
| Steps and checks traceability | pass | E | pending 状态和来源明确 | none |
| Roadmap contract compliance | pass | E+C | 未绕开 roadmap 4.x 硬契约 | none |
| Module interface design | pass | E+C | depth、seam、ordering 和 error mode 可执行 | code review |
| Validation and artifacts | pass | E | YAML/cross-doc 与命令入口可核验 | QA |

Summary：E=6，C=3，H=0，H-only core checks=none。

## 6. Residual Risk

- PERSONAL_DATA 的 MVP 边界仅覆盖邮箱和电话。
- 设计通过不替代 implementation、code review、QA 和 acceptance 的真实运行证据。

## 7. Verdict

- Status：passed
- Next：design 已由 owner 批准，可进入 goal feature loop。
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`

```
---
doc_type: feature-design
feature: 2026-07-10-evidence-output-guardrails
requirement: source-of-truth-evidence
roadmap: repo-nav-mvp
roadmap_item: evidence-output-guardrails
status: approved
summary: 汇合 candidate/CodeGraph，锁定最终状态、limits、redaction、safe errors 与所有输出面 parity
tags: [evidence, repo-nav]
---

# evidence-output-guardrails 设计

## 0. 术语约定

- **Final status**：整轮 backend/fallback/verification/limits/abort 汇总后唯一裁决的 LocateStatus；backend 不自行决定。
- **Caller-adjustable limit**：`maxFiles|maxConfirmed|maxCandidates|timeoutMs`；在 schema range 内可建议重试。
- **Fixed safety limit**：`maxFileBytes|maxExcerptBytes|maxExcerptLines`；MVP 不允许 caller 提高。
- **Redaction**：public ID 计算后对 excerpt/message/log surface 做确定性遮盖，保留 path/lines/typed metadata。
- **四表面 error parity**：application `LocateResult`、MCP `structuredContent`、MCP text fallback、MCP `isError`。
- **权威输入**：draft requirement + 已批准 roadmap 4.1、4.6、4.7。

## 1. 决策与约束

### 需求摘要

把 F5 candidate 分支和 F6 CodeGraph/fallback 分支汇合为完整 EvidencePack guardrails：用单一 transition evaluator 裁决所有 LocateStatus；对每类 budget 规定截断顺序、coverage reason 和 nextAction；在 ID 后遮盖敏感 excerpt 并覆盖 MCP/error/log surfaces；四个 RepoNavToolError 在 application/MCP 表面字段一致且不泄露 stack、绝对路径或 raw backend 内容。

### 复杂度档位

安全与协议严格档位。transition/limit/redaction/error 全部 table-driven，并由 completeness test 保证新增 status/reason 后不能漏 fixture。

### 关键决策

- 最终状态优先级固定：tool error（独立 union）→ timeout → backend_unavailable special case → partial coverage gap → ok/no_result；具体 predicate 见状态表。
- `BackendSearchResult.complete=false` 只贡献 coverage gap，不直接等于 partial；必须结合 fallback 与 verified evidence。
- 结果选择先按 canonical stable key在有界队列中保留最优 confirmed/candidate，再 redaction；ID/order 不能基于 redacted excerpt。
- `MAX_*_REACHED` 只有确有 eligible item/verification 因该 limit 未完成时记录，caller 主动传较小值不是自动 limit hit。
- `RETRY_WITH_HIGHER_LIMIT` 只用于 caller-adjustable limit 且当前值低于 schema max；fixed safety cap 不建议突破。
- evidence excerpt redaction、safe error message 和 stderr diagnostic scrubber 是三个明确层，不用单一 replace 假装覆盖所有面。
- `PERSONAL_DATA` 的 MVP matcher 仅覆盖 email address 与 phone-like token；人名/一般标识符不自动遮盖。该边界需要 owner 在本轮 design review 拍板。

### 完整状态转换矩阵

| Case / 条件 | Final result | Coverage / nextActions |
|---|---|---|
| schema/normalization invalid | `ok=false/INVALID_INPUT` | 不启动 backend；缺/空 terms 时 ADD_TERM |
| repo invalid | `ok=false/INVALID_REPOSITORY` | 无 attempt/action |
| root/evidence path escape | `ok=false/PATH_OUTSIDE_ROOT` | 立即终止，无 action |
| uncaught invariant/exception | `ok=false/INTERNAL_ERROR` | cleanup，无 action |
| caller abort | `ok=true/timeout` | 保留已核验证据；无 RETRY |
| internal deadline | `ok=true/timeout` | 保留已核验证据；timeoutMs<30000 才给 RETRY |
| 所有可用 backends unavailable/failed 且无 verified evidence；或 hit-unverified 后 fallback unavailable | `ok=true/backend_unavailable` | attempts/exclusions 完整；适用时 INITIALIZE_CODEGRAPH |
| 非 backend-unavailable 特例，且 limit、backend complete=false、必要 fallback 未完成或 result 截断造成 coverage gap | `ok=true/partial` | 可为空；列 coverage/limits；caller-adjustable 时 RETRY |
| 有 verified evidence，策略/fallback 完整且无 limit | `ok=true/ok` | candidate 时 CONFIRM_CANDIDATE |
| 无 verified evidence，所有 required attempts 完成且无 limit | `ok=true/no_result` | ADD_TERM、ADD_SYMBOL_ANCHOR；index missing 时可追加 INITIALIZE_CODEGRAPH |
| primary hit 但全部核验失败，ripgrep fallback 完成且无 verified evidence | `ok=true/no_result` | `UNVERIFIED_FILE_CONTENT` + attempts；ADD_TERM/ADD_SYMBOL_ANCHOR |

复合情况按 predicate priority 裁决：tool error → timeout → backend-unavailable special case → partial coverage gap → ok/no_result。`backend_unavailable` special case 必须在 generic incomplete/partial 前判断；已有 evidence 且无 gap 才是 ok；no_result 必须证明策略完整。completeness inventory 以本表每个 predicate row ID 为 key，而不是只按最终 status 枚举计数。

### Limit/selection contract

| Limit | 生效点 | 保留/截断顺序 | reason/status/action |
|---|---|---|---|
| `maxFiles` | 依据 stable backend hit/file order调度 unique file verification | 已完成 verification 保留；额外 eligible file 不调度 | `MAX_FILES_REACHED`, partial, 可调时 RETRY |
| `maxConfirmed` | classification 后有界 stable selection | confirmed selection key 后截断；candidate 独立 | `MAX_CONFIRMED_REACHED`, partial, 可调时 RETRY |
| `maxCandidates` | F5 bounded selection | 不影响 confirmed；0 也允许显式空 candidates | `MAX_CANDIDATES_REACHED`, partial, 可调时 RETRY |
| `maxFileBytes` | reader open/fstat 后 | 该 file 不进入 evidence | `MAX_FILE_BYTES_REACHED` + `UNVERIFIED_FILE_CONTENT`, partial；无 RETRY |
| `maxExcerptBytes/Lines` | reader output 前 | 不输出未完整核验 excerpt；schema v1 的 line cap 也映射 excerpt cap code | `MAX_EXCERPT_BYTES_REACHED` + `UNVERIFIED_FILE_CONTENT`, partial；无 RETRY |
| `timeoutMs` | 整轮 deadline | 只保留 deadline 前已完成 evidence | `TIMEOUT_REACHED`, timeout；低于 max 时 RETRY |

`limitsReached` 和 `nextActions` 按 schema priority 去重；result selection 不依赖 filesystem/backends 到达顺序。

### Redaction contract

| Reason | Deterministic matcher | Public action |
|---|---|---|
| `SECRET_LIKE_VALUE` | known token/key assignment（password/secret/token/api-key 等）或固定 credential format | 只替换 value，保留 safe context；无法安全切片则整 excerpt placeholder |
| `CONNECTION_STRING` | URI/DSN 含 userinfo/password/secret query param | 遮盖 credentials/query secret |
| `PERSONAL_DATA` | email address、phone-like token | 遮盖 token；不猜姓名 |
| `BINARY_OR_OVERSIZED_CONTENT` | 已核验 UTF-8 excerpt 中单个 token/value 超过 public display cap，或无法安全局部遮盖 | 整 excerpt placeholder，不输出 raw token；真正 binary reader failure 仍按 UNVERIFIED exclusion，不生成 evidence |

- `EvidenceLocation.file/symbol/lines` 保留；`redaction={applied:true,reasonCodes:[...]}` 使用 schema order。
- verification/read caps 与 public display redaction 是互斥阶段：reader 16 KiB/80-line cap 触发时没有 public evidence，只记 limit/exclusion；只有 reader 已完整返回 cap 内 UTF-8 excerpt 后，redactor 的独立 2 KiB（2048 UTF-8 bytes）single-token public-display cap 才可产生 `BINARY_OR_OVERSIZED_CONTENT` placeholder。
- ID 由 unredacted normalized excerpt 计算后立即丢弃 hash material；public output 不含 raw hash。
- service output、MCP structured/text 都只能接收 redacted EvidencePack。safe error policy 删除 stack/absolute path/raw stderr；diagnostic scrubber 作用于正式 stderr，stdout 仍 frames-only。
- tests 必须在 service result、MCP structured、text、captured stdout/stderr、error message 中搜索 forbidden raw secrets。

### Tool error contract

| Code | recoverable | suggestedAction | message 禁止项 |
|---|---:|---|---|
| `INVALID_INPUT` | true | 仅缺/空 terms 为 ADD_TERM，否则 none | raw invalid payload、stack |
| `INVALID_REPOSITORY` | true | none | absolute resolved path、OS raw error |
| `PATH_OUTSIDE_ROOT` | false | none | escaped target absolute path/content |
| `INTERNAL_ERROR` | false | none | stack、class/function name、backend stderr、secret excerpt |

### 明确不做

- 不扩展 search/candidate reasons，不新增 tool、persistence 或业务结论。
- 不把 no_result 表述为“代码不存在”，不把 backend failure 表述为完成搜索。
- 不允许 caller 提高 fixed safety limits，不用 numeric confidence 或非确定性 redaction。
- 不承诺遮盖所有自然语言 PII；MVP PERSONAL_DATA 边界只含表中 token types。

### 基线、依赖、风险与交付物

- 基线 commit：`04b04f7a1314f322e82157363ced505e2199cfc8`。
- 前置：F5 candidate policy、F6 fallback orchestration 均 accepted。
- Top 3 风险：复合状态优先级漂移、limit 误报 no_result、敏感值从备用 surface 泄露。分别由 transition completeness、limit table、全 surface forbidden scans 阻断。
- 关键假设：owner 接受 PERSONAL_DATA 的有限确定性边界；其余 PII 由后续安全 feature 扩展并升级 schema。
- 交付物：transition/limit evaluators、redaction/safe-message/logger scrubber、completeness matrices、Golden/MCP service transcripts、forbidden scan report。
- 清洁度：禁止临时 stdout/debug、无来源 TODO/FIXME、注释掉代码、死 import；正式 scrubbed stderr diagnostics 允许。

## 2. 名词与编排

### 2.1 名词层

**现状**：F3/F5/F6 已产生 verified records、candidate policy、backend attempts 与局部 statuses；完整复合裁决、redaction 和 error safe policy 尚未统一。

**变化**：

- `LocateStatusEvaluator` 消费 attempts、strategy completeness、verified counts、limits、abort source，返回唯一 status/nextActions。
- `ResultBudgetSelector` 分别维护 confirmed/candidate bounded stable selection，输出 typed limit facts。
- `EvidenceRedactor` 只消费已分配 ID 的 EvidenceLocation，输出带 metadata 的 public location。
- `SafePublicErrorFactory` 与 `DiagnosticScrubber` 分治 tool message/stderr。
- 所有组件只能返回 schema v1 封闭枚举；新增 code 必须同步 schema、matrix 与 positive/negative fixtures。

### 2.2 编排层

```mermaid
flowchart TD
  A["Backend attempts + verified DiscoveryRecords"] --> B["Classification + bounded result selection"]
  B --> C["Canonical ID + stable public order"]
  C --> D["Evidence redaction"]
  A --> S["Transition evaluator"]
  B --> S
  S --> P["EvidencePack status/coverage/nextActions"]
  D --> P
  P --> V["LocateToolOutput schema validation"]
  V --> M["MCP one serializer"]
```

- tool errors 在 EvidencePack pipeline 外形成 `LocateResult.ok=false`，仍经同一 output schema 与 serializer。
- transition evaluator 必须 table-driven；case inventory completeness test 将矩阵行与 fixture IDs 一一核对。

### 2.3 挂载点清单

- Evidence Engine finalization stage：状态、budget、redaction 的唯一组装点。
- MCP output serializer/safe-message policy：所有 public surfaces 的唯一映射点。
- Transition/limit/redaction/error fixture matrices：guardrail 的唯一验收清单。

### 2.4 推进策略

1. **完整 transition evaluator**：矩阵每个 predicate row 和复合优先级都有命名 fixture，显式包含 hit-unverified fallback complete/unavailable、caller abort empty/evidence、internal deadline below/at max。
   验证：`npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max`
2. **limits/selection/nextActions**：六类 limits、0/boundary/truncation、stable selection 与 action rules 通过。
   验证：`npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence`
3. **redaction 全 surface**：四类 reason、metadata、ID/order stability 和 forbidden raw scan 通过。
   验证：`npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity`
4. **四类 error parity**：application/structured/text/isError 字段与 message 禁止项逐 code 通过。
   验证：`npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity`

### 2.5 结构健康度与微重构

##### 评估

- 文件级：不搬 search/candidate adapters；finalization policies 独立文件，避免 EvidenceService 变成单一巨类。
- 目录级：status/budget/redaction 属 Evidence Engine；MCP serializer 保留在 adapter 层，safe schema 共用 contracts。
- Compound：未发现既有目录 convention。

##### 结论：不做微重构

status/budget/redaction 都是本 feature 的新增 policy，不搬迁前置实现；通过独立文件新增，避免把语义变更伪装成重构。

## 3. 验收契约

### 3.1 关键场景

- transition matrix 的 ok-via-codegraph、ok-via-fallback、verified-no-result、hit-unverified fallback complete/unavailable、backend-unavailable、partial-empty/evidence、caller-abort empty/evidence、internal-deadline below/at-max、tool errors 全有 predicate-keyed case。
- 六类 limit 输入分别产生唯一 limitsReached/status/nextActions；timeout、partial、backend_unavailable 的复合优先级稳定。
- 四类 redaction 保留 path/lines/metadata，ID/order 前后不变；raw secret 不出现在 service/MCP/text/error/stdout/stderr。
- 四个 tool error 的 code/recoverable/action/message 与 isError/parity 完全一致。
- schema/status/reason 新枚举缺 fixture 时 completeness test 失败。

### 3.2 明确不做的反向核对

- 不新增 recall/candidate reason/tool/persistence；不改变 backend query semantics。
- 不出现“code does not exist”类 no_result 结论，不输出 raw stack/path/stderr/secret。
- fixed safety limit 不生成 RETRY_WITH_HIGHER_LIMIT；candidate/confirmed 截断不改变 canonical order。

### 3.3 Acceptance Coverage Matrix

| Scenario | Covered By Step | Evidence Type | Command / Action | Core? |
|---|---|---|---|---|
| predicate rows + all statuses + compound/abort-source priority | S1 | table unit + Golden inventory | locate-status/completeness + named boundaries | yes |
| every limit + selection + action | S2 | boundary/permutation Golden | result-limits group | yes |
| redaction metadata/ID/all surfaces | S3 | Golden + MCP + forbidden scan | three redaction cases | yes |
| four tool errors/four surfaces | S4 | application/MCP integration | four error cases | yes |

### 3.4 DoD Contract

| ID | 要求 | 证据 | 阻塞级别 |
|---|---|---|---|
| DOD-DESIGN-001 | design/checklist/review 完整并获 owner 批准 | design review | blocking |
| DOD-IMPL-001 | policies/matrices/fixtures 完成且前置行为回归 | checklist/diff/logs | blocking |
| DOD-REVIEW-001 | code review passed，重点审状态优先级和泄露面 | review report | blocking |
| DOD-QA-001 | transition/limit/redaction/error 全部运行并扫描 forbidden values | QA report | blocking |
| DOD-ACCEPT-001 | acceptance 回写 guardrails 与 PERSONAL_DATA 边界 | acceptance | blocking |

Validation Commands:

| ID | 命令 | 目的 | 核心性 | 失败处理 |
|---|---|---|---|---|
| CMD-BUILD | `npm run build` | 编译 | core | fix-or-block |
| CMD-TYPECHECK | `npm run typecheck` | strict 类型检查 | core | fix-or-block |
| CMD-STATUS | `npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max` | predicate-keyed 完整状态裁决 | core | fix-or-block |
| CMD-LIMITS | `npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence` | limits/selection/actions | core | fix-or-block |
| CMD-REDACTION | `npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity` | 全 surface redaction | core | fix-or-block |
| CMD-ERRORS | `npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity` | 四类 error parity | core | fix-or-block |

Required Artifacts: design-review、transition/limit/redaction/error matrices、fixture inventory、forbidden scan report、service/MCP transcripts、command logs、review、QA、acceptance。

## 4. 与项目级架构文档的关系

Acceptance 回填 Evidence Engine finalization policies 与 MCP safe output boundary。状态优先级、limit action、redaction reason 和 error safe-message 属 schema v1 长期约束，建议 ADR。
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack.md`

```
---
doc_type: feature-evidence-pack
feature: 2026-07-10-evidence-output-guardrails
status: generated
---

# 2026-07-10-evidence-output-guardrails evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`
- Checklist: `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml`

## 2. DoD Results

```json
{
  "gate_id": "dod-runner",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "command": "npm run build",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 build\n> tsc -p tsconfig.build.json\n\n",
      "stderr": "",
      "id": "CMD-BUILD",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run typecheck",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 typecheck\n> tsc -p tsconfig.json --noEmit\n\n",
      "stderr": "",
      "id": "CMD-TYPECHECK",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2035ms\n     ✓ distinguishes its own deadline from a caller abort  1005ms\n     ✓ retains verification completed before the abort  1016ms\n\n Test Files  1 passed | 16 skipped (17)\n      Tests  13 passed | 145 skipped (158)\n   Start at  17:52:44\n   Duration  3.03s (transform 1.89s, setup 0ms, import 8.44s, tests 2.03s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-STATUS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group result-limits --case partial-empty-limit --case partial-with-evidence\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 5 skipped) 23ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  3 passed | 45 skipped (48)\n   Start at  17:52:48\n   Duration  841ms (transform 612ms, setup 0ms, import 3.62s, tests 23ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-LIMITS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case secret-redaction --case redaction-metadata\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 3 skipped) 15ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  5 passed | 43 skipped (48)\n   Start at  17:52:50\n   Duration  818ms (transform 581ms, setup 0ms, import 3.30s, tests 15ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case redaction-output-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 685ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  683ms\n\n Test Files  1 passed | 7 skipped (8)\n      Tests  1 passed | 31 skipped (32)\n   Start at  17:52:53\n   Duration  1.38s (transform 823ms, setup 0ms, import 4.83s, tests 685ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-REDACTION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests | 7 skipped) 13ms\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3318ms\n     ✓ maps schema-invalid objects to typed parity output  687ms\n     ✓ preserves the typed code while sanitizing unsafe detail  665ms\n     ✓ preserves the typed code while sanitizing unsafe detail  657ms\n     ✓ turns thrown failures into safe typed parity output  1307ms\n\n Test Files  2 passed | 6 skipped (8)\n      Tests  5 passed | 27 skipped (32)\n   Start at  17:52:58\n   Duration  3.98s (transform 770ms, setup 0ms, import 4.54s, tests 3.33s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ERRORS",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 13771
Checklist bytes: 4825

## 5. Residual Risks

- none

## 6. Provider Signals

```json
{
  "archguard": {
    "status": "unavailable",
    "reason": "archguard binary not found on PATH",
    "warnings": []
  },
  "meta_cc": {
    "status": "unavailable",
    "reason": "meta-cc summary not found; realtime session collection is out of scope",
    "warnings": []
  }
}
```

## 7. Gate Results

```json
{
  "gate_id": "scope-gate",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "changed_files": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        "src/contracts/constants.ts",
        "src/contracts/index.ts",
        "src/contracts/request.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/index.ts",
        "src/main.ts",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/mcp-shutdown-coordinator.ts",
        "src/mcp/mcp-stdio-host.ts",
        "test/golden/text-evidence-engine.spec.ts",
        "test/mcp/tool-error-parity.spec.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/manifests/golden/ripgrep-incomplete.yaml",
        "testkit/manifests/golden/ripgrep-timeout.yaml",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-implementation.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review-packet.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/implementation-scope.txt",
        ".codestable/features/2026-07-10-evidence-output-guardrails/locate-transition-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/redaction-forbidden-scan-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/result-limit-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/tool-error-parity-report.md",
        "src/contracts/public-errors.ts",
        "src/evidence/abort-source.ts",
        "src/evidence/evidence-redactor.ts",
        "src/evidence/locate-status-evaluator.ts",
        "src/evidence/next-action-policy.ts",
        "src/evidence/result-budget-selector.ts",
        "src/mcp/diagnostic-scrubber.ts",
        "test/golden/output-guardrails.spec.ts",
        "test/mcp/redaction-output-parity.spec.ts",
        "test/unit/locate-status-evaluator.spec.ts",
        "test/unit/output-guardrails.spec.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-dod-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-evidence-output-guardrails",
        "src/contracts",
        "src/evidence",
        "src/mcp",
        "src/repository",
        "src/index.ts",
        "src/main.ts",
        "test/unit",
        "test/golden",
        "test/mcp",
        "testkit/contracts",
        "testkit/fixtures/output-guardrails",
        "testkit/fixtures/mcp",
        "testkit/manifests/golden",
        "testkit/manifests/mcp",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md"
      ]
    }
  ],
  "providers": {}
}
```
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-implementation.md`

```
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
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review-packet.md`

```
[large file omitted]
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/locate-transition-matrix-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# LocateStatus transition matrix 证据

- `LOCATE_TRANSITION_ROW_IDS` 固定十个 predicate rows：四类 tool error、caller abort、internal deadline、backend unavailable special、coverage gap、verified evidence 与 verified no-result。
- `evaluateLocateStatus` 的复合优先级为 timeout → backend-unavailable special → coverage gap → ok/no_result；tool errors 位于 EvidencePack pipeline 外，由同一 completeness inventory 追踪。
- `BackendSearchResult.complete=false` 只令 strategy incomplete，不伪造 `MAX_FILES_REACHED`；fallback complete 可关闭 primary incomplete。
- hit-unverified + fallback complete → `no_result`；fallback unavailable → `backend_unavailable`。
- caller abort 无论已有证据与否均为 timeout 且不建议 retry；engine-owned deadline 在 timeoutMs 未达 30 秒上限时建议 retry，到上限时不建议。
- `LocateAbortCoordinator` 使用 first-writer-wins 锁定 caller/deadline 来源；deadline-first/caller-later 与 caller-first/deadline-later 都不会被后到事件改写。
- CodeGraph 多 hit 核验中途 abort 时保留 abort 前已完成的 confirmed/candidate，不再走固定空数组的 early return。
- backend 自身固定 process timeout 只形成 backend unavailable/coverage gap，不伪装成 caller-adjustable engine deadline，也不产生 `RETRY_WITH_HIGHER_LIMIT`。
- MCP host 不再创建与 engine 竞争的 request timer；deadline ownership 唯一属于 Evidence Engine，SDK/host shutdown signal 才是 caller abort。
- 验证：CMD-STATUS → 13 passed；包含真实 1 秒 engine-owned deadline、CodeGraph caller/deadline evidence-preservation integration。
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/redaction-forbidden-scan-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# Redaction / forbidden-value scan 证据

- `EvidenceRedactor` 只在 canonical ID 与 stable order 已确定后处理 public location；ID、file、symbol、lines 保持，raw discovery/hash material 不公开。
- `SECRET_LIKE_VALUE`：已知 key assignment 与固定 credential；`CONNECTION_STRING`：URI userinfo/query secret；`PERSONAL_DATA`：email/phone-like token，不猜人名；`BINARY_OR_OVERSIZED_CONTENT`：完整 UTF-8 read 后单 token > 2048 bytes 使用整段 placeholder。
- 跨 evidence token propagation 防止 secret assignment seed 已遮盖但 alias/source derived candidate 仍泄露同一 raw value。
- quoted assignment 会完整消费单/双引号/backtick 内含空格、逗号、分号和转义引号的 value；template literal 含 `${...}` 或引号畸形且无法安全切片时整段替换为 placeholder。
- malformed quoted tail 的边界可确定时会进入跨 evidence sensitive-token propagation；真实 Engine 与 MCP fixture 均证明 seed 整段遮盖、derived candidate 同值遮盖。
- 真正 `BINARY_FILE`/reader cap failure 不产生 evidence/redaction，只记录 UNVERIFIED 与相应 fixed limit。
- MCP serializer 再次对任意 service success 执行同一 redaction，随后 schema validate 并生成 structured/text parity；正式 stderr 经 `DiagnosticScrubber` 删除 stack、绝对路径和敏感 token，stdout 保持协议 frames-only。
- Forbidden scan values 覆盖普通/单引号/双引号/backtick/malformed/escaped source secret、malformed-derived 同值、DSN password/query token、email、phone、diagnostic secret 与 absolute path；真实 Engine service JSON、MCP structured/text/protocol result 与 captured stderr 均无原值。
- 验证：CMD-REDACTION → 5 Golden + 1 real stdio MCP passed；redaction unit 7 passed 中覆盖四 reason、ID stability、template fail-closed、malformed propagation、PERSONAL_DATA 边界与 diagnostic scrubber。
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/result-limit-matrix-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# Result limit / nextAction matrix 证据

| Limit | 触发证据 | Status | Retry |
|---|---|---|---|
| maxFiles | stable file order 后确有额外 eligible file | partial | 当前值 < 20 |
| maxConfirmed | stable confirmed selection 后确有截断 | partial | 当前值 < 20 |
| maxCandidates | existing/derived candidate 确有截断；0 合法 | partial | 当前值 < 20 |
| maxFileBytes | reader typed failure + UNVERIFIED exclusion | partial | never |
| maxExcerptBytes/Lines | reader typed failure + UNVERIFIED exclusion | partial | never |
| timeoutMs | first-writer-wins engine deadline/abort source | timeout | internal deadline 且当前值 < 30000 |

- `ResultBudgetSelector` 在截断前按 canonical public key 排序；backend hit 与 filesystem arrival permutation 不改变 retained evidence/ID/order。
- caller 主动传小值但没有 eligible overflow 时不产生 `MAX_*_REACHED`。
- backend incomplete 不再冒充 maxFiles；只形成 coverage gap。
- backend 的固定 10 秒 process timeout 与 request `timeoutMs` 分层：前者不是 caller-adjustable limit，不建议提高 request limit。
- 验证：CMD-LIMITS → 3 passed；另有 unit 对 adjustable schema maxima 与 fixed caps 的 exact no-retry 断言。
```

### `.codestable/features/2026-07-10-evidence-output-guardrails/tool-error-parity-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# RepoNavToolError parity 证据

| Code | recoverable | suggestedAction | Safe message |
|---|---:|---|---|
| INVALID_INPUT | true | 仅缺/空 terms 时 ADD_TERM | Locate request does not match the required schema. |
| INVALID_REPOSITORY | true | none | Repository root is invalid or unavailable. |
| PATH_OUTSIDE_ROOT | false | none | Repository path is outside the configured root. |
| INTERNAL_ERROR | false | none | Repository evidence request failed. |

- `createPublicErrorResult` 是 application 与 MCP 共用的 typed factory；Engine 不再返回 RepositoryAccessError/raw exception message。
- factory/policy 按 code 白名单归一化 action：只有 `INVALID_INPUT + ADD_TERM` 可公开，后三类 code 即使 service 注入非法 action 也会被删除。
- `ADD_TERM` 仅用于 terms 缺失或空数组；错误类型、非法成员、空字符串成员和其他 schema 错误不再误报该 action。
- `serializeLocateToolOutput` 重新应用 safe error policy，再以同一 parsed object生成 structuredContent、JSON text 与 `isError=true`。
- 测试输入含绝对路径、stack、raw stderr marker 及所有 code/action 负向组合；四表面只保留 exact code/recoverable/action/safe message。
- 验证：CMD-ERRORS → 4 error cases + 1 selected schema-surface guard passed。
```

## Git Diff Stat

```
### unstaged
.../evidence-output-guardrails-checklist.yaml      |   8 +-
 .../goal-features/evidence-output-guardrails.md    |   2 +-
 .codestable/roadmap/repo-nav-mvp/goal-state.yaml   |   2 +-
 src/contracts/constants.ts                         |   7 +
 src/contracts/index.ts                             |   1 +
 src/contracts/request.ts                           |  21 +-
 src/evidence/repository-evidence-engine.ts         | 367 +++++++++++----------
 src/index.ts                                       |   5 +
 src/main.ts                                        |   3 +-
 src/mcp/locate-tool-output.ts                      |  50 +--
 src/mcp/mcp-shutdown-coordinator.ts                |   3 +-
 src/mcp/mcp-stdio-host.ts                          |  13 +-
 test/golden/text-evidence-engine.spec.ts           |  12 +-
 test/mcp/tool-error-parity.spec.ts                 |  38 ++-
 testkit/fixtures/mcp/fixture-evidence.service.ts   |  64 +++-
 testkit/manifests/golden/ripgrep-incomplete.yaml   |   2 +-
 testkit/manifests/golden/ripgrep-timeout.yaml      |   4 +-
 testkit/runners/runner-registry.ts                 |  17 +
 18 files changed, 363 insertions(+), 256 deletions(-)

### staged
No staged diff.
```

## Focused Diff

### Unstaged

```diff
diff --git a/.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml b/.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml
index 4f317d5..d83d61b 100644
--- a/.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml
+++ b/.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml
@@ -6,25 +6,25 @@ steps:
   exit_signal: 每个 predicate row、hit-unverified fallback 分支、abort source 与复合优先级均有命名 case，缺 case 时 completeness test 失败
   verification: npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max
   artifacts: [LocateStatusEvaluator, transition matrix, completeness report]
-  status: pending
+  status: done
 - id: S2
   action: 实现 limit selection、coverage 与 nextAction contract
   exit_signal: 六类 limits 的 0/边界/截断/empty/evidence/stable-order 行为全部可判定
   verification: npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence
   artifacts: [ResultBudgetSelector, limit matrix, Golden logs]
-  status: pending
+  status: done
 - id: S3
   action: 实现 evidence/error/log redaction 与 forbidden scan
   exit_signal: 四类 reason 的 metadata/ID/order 稳定且 raw values 不出现在任何 public/diagnostic surface
   verification: npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity
   artifacts: [EvidenceRedactor, DiagnosticScrubber, forbidden scan report]
-  status: pending
+  status: done
 - id: S4
   action: 实现四类 RepoNavToolError 四表面 parity
   exit_signal: code/recoverable/action/message/isError/structured/text 逐 error code 一致且无敏感信息
   verification: npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity
   artifacts: [error contract matrix, application/MCP transcripts]
-  status: pending
+  status: done
 checks:
 - id: C1
   item: predicate-keyed matrix 覆盖 tool errors、ok、no_result、hit-unverified两分支、backend_unavailable、partial、caller abort、internal deadline
diff --git a/.codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md b/.codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md
index 2771a43..d2118c1 100644
--- a/.codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md
+++ b/.codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md
@@ -3,7 +3,7 @@ doc_type: roadmap-goal-feature
 roadmap: repo-nav-mvp
 feature: 2026-07-10-evidence-output-guardrails
 roadmap_item: evidence-output-guardrails
-status: pending
+status: implementing
 ---

 # evidence-output-guardrails Goal 执行规格
diff --git a/.codestable/roadmap/repo-nav-mvp/goal-state.yaml b/.codestable/roadmap/repo-nav-mvp/goal-state.yaml
index 8861614..1014a8c 100644
--- a/.codestable/roadmap/repo-nav-mvp/goal-state.yaml
+++ b/.codestable/roadmap/repo-nav-mvp/goal-state.yaml
@@ -65,7 +65,7 @@ features:
   review: .codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review.md
   qa: .codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-qa.md
   acceptance: .codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-acceptance.md
-  status: pending
+  status: implementing
 - slug: mvp-golden-regression-suite
   roadmap_item: mvp-golden-regression-suite
   feature_dir: .codestable/features/2026-07-10-mvp-golden-regression-suite
diff --git a/src/contracts/constants.ts b/src/contracts/constants.ts
index fbd6c16..5f86f5f 100644
--- a/src/contracts/constants.ts
+++ b/src/contracts/constants.ts
@@ -156,6 +156,13 @@ export const DEFAULT_LOCATE_LIMITS = Object.freeze({
   timeoutMs: 10_000,
 } as const);

+export const LOCATE_LIMIT_MAXIMUMS = Object.freeze({
+  maxFiles: 20,
+  maxConfirmed: 20,
+  maxCandidates: 20,
+  timeoutMs: 30_000,
+} as const);
+
 export const LOCATE_INPUT_MAX_BYTES = 16 * 1024;
 export const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
 export const DEFAULT_MAX_EXCERPT_BYTES = 16 * 1024;
diff --git a/src/contracts/index.ts b/src/contracts/index.ts
index 5566f3f..5c5578d 100644
--- a/src/contracts/index.ts
+++ b/src/contracts/index.ts
@@ -2,6 +2,7 @@ export * from './constants.js';
 export * from './evidence-id.js';
 export * from './evidence.js';
 export * from './ports.js';
+export * from './public-errors.js';
 export * from './request.js';
 export * from './repository-access.js';
 export * from './safe-process.js';
diff --git a/src/contracts/request.ts b/src/contracts/request.ts
index 0741e9c..7c6e340 100644
--- a/src/contracts/request.ts
+++ b/src/contracts/request.ts
@@ -6,6 +6,7 @@ import { z } from 'zod';
 import {
   ANCHOR_KINDS,
   DEFAULT_LOCATE_LIMITS,
+  LOCATE_LIMIT_MAXIMUMS,
   LOCATE_INPUT_MAX_BYTES,
   REPO_LAYERS,
   TERM_CASE_MODES,
@@ -102,10 +103,22 @@ export type LocateAnchor = z.infer<typeof LocateAnchorSchema>;

 export const LocateLimitsSchema = z
   .strictObject({
-    maxFiles: z.int().min(1).max(20).optional(),
-    maxConfirmed: z.int().min(1).max(20).optional(),
-    maxCandidates: z.int().min(0).max(20).optional(),
-    timeoutMs: z.int().min(1_000).max(30_000).optional(),
+    maxFiles: z.int().min(1).max(LOCATE_LIMIT_MAXIMUMS.maxFiles).optional(),
+    maxConfirmed: z
+      .int()
+      .min(1)
+      .max(LOCATE_LIMIT_MAXIMUMS.maxConfirmed)
+      .optional(),
+    maxCandidates: z
+      .int()
+      .min(0)
+      .max(LOCATE_LIMIT_MAXIMUMS.maxCandidates)
+      .optional(),
+    timeoutMs: z
+      .int()
+      .min(1_000)
+      .max(LOCATE_LIMIT_MAXIMUMS.timeoutMs)
+      .optional(),
   })
   .readonly();
 export type LocateLimits = z.infer<typeof LocateLimitsSchema>;
diff --git a/src/evidence/repository-evidence-engine.ts b/src/evidence/repository-evidence-engine.ts
index 257a18f..79a931d 100644
--- a/src/evidence/repository-evidence-engine.ts
+++ b/src/evidence/repository-evidence-engine.ts
@@ -1,11 +1,10 @@
 import { Inject, Injectable } from '@nestjs/common';

 import {
-  comparePublicEvidence,
+  createPublicErrorResult,
   createDiscoveryKey,
   DEFAULT_MAX_FILE_BYTES,
   LIMIT_REASON_CODES,
-  NEXT_ACTION_CODES,
   normalizeLocateAnchors,
   normalizeSearchTerms,
   RepositoryAccessError,
@@ -18,19 +17,22 @@ import {
   type LocateExecutionContext,
   type LocateRequest,
   type LocateResult,
-  type LocateStatus,
-  type NextActionCode,
   type NormalizedLocateAnchor,
   type NormalizedSearchTerm,
   type RepositoryEvidenceService,
   type RepositoryReader,
   type RepositorySearchBackend,
+  type ResolvedLocateLimits,
   type SearchBackendId,
 } from '../contracts/index.js';
 import {
   REPOSITORY_READER,
   REPOSITORY_SEARCH_BACKENDS,
 } from '../runtime/tokens.js';
+import {
+  LocateAbortCoordinator,
+  type LocateAbortSource,
+} from './abort-source.js';
 import {
   applyCandidatePolicy,
   createVerifiedCandidateContext,
@@ -38,10 +40,28 @@ import {
 } from './candidate-policy.js';
 import { classifyDiscoveryRecords } from './direct-mapping-classifier.js';
 import { verifyAndMergeBackendHits } from './discovery-record.js';
+import { redactLocateResult } from './evidence-redactor.js';
+import { evaluateLocateStatus } from './locate-status-evaluator.js';
+import { createNextActions } from './next-action-policy.js';
+import {
+  selectCandidateBudget,
+  selectConfirmedBudget,
+} from './result-budget-selector.js';

 const CLASSIFICATION_MAX_LINES = 12;
 const CLASSIFICATION_MAX_BYTES = 4 * 1024;
-const MAX_TIMEOUT_MS = 30_000;
+
+type LocateSuccessEvidence = Extract<LocateResult, { readonly ok: true }>['evidence'];
+
+interface TimeoutResultOptions {
+  readonly attempts?: readonly BackendAttempt[];
+  readonly codeGraphHealth?: BackendHealth;
+  readonly confirmed?: LocateSuccessEvidence['confirmed'];
+  readonly candidates?: LocateSuccessEvidence['candidates'];
+  readonly limitsReached?: readonly LimitReasonCode[];
+  readonly exclusionSummary?: LocateSuccessEvidence['coverage']['exclusionSummary'];
+  readonly fallbackChecked?: boolean;
+}

 function compareText(left: string, right: string): number {
   return left === right ? 0 : left < right ? -1 : 1;
@@ -167,37 +187,16 @@ function selectBackendHits(
 function toolError(error: unknown): LocateResult {
   if (error instanceof RepositoryAccessError) {
     if (error.code === 'INVALID_REPOSITORY') {
-      return {
-        ok: false,
-        error: {
-          code: 'INVALID_REPOSITORY',
-          message: error.message,
-          recoverable: false,
-        },
-      };
+      return createPublicErrorResult('INVALID_REPOSITORY');
     }
     if (
       error.code === 'PATH_OUTSIDE_ROOT' ||
       error.code === 'INVALID_RELATIVE_PATH'
     ) {
-      return {
-        ok: false,
-        error: {
-          code: 'PATH_OUTSIDE_ROOT',
-          message: error.message,
-          recoverable: false,
-        },
-      };
+      return createPublicErrorResult('PATH_OUTSIDE_ROOT');
     }
   }
-  return {
-    ok: false,
-    error: {
-      code: 'INTERNAL_ERROR',
-      message: error instanceof Error ? error.message : 'Unexpected repository evidence failure.',
-      recoverable: false,
-    },
-  };
+  return createPublicErrorResult('INTERNAL_ERROR');
 }

 @Injectable()
@@ -219,17 +218,20 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
     const anchors = normalizeLocateAnchors(request.anchors ?? [], mode);
     const termsForVerification = verificationTerms(normalizedTerms, anchors);
     const negativeTerms = normalizeSearchTerms(request.negativeTerms ?? [], mode);
-    const controller = new AbortController();
-    let internalDeadlineReached = false;
-    const abortFromCaller = (): void => controller.abort(context.signal.reason);
+    const abortCoordinator = new LocateAbortCoordinator();
+    const abortFromCaller = (): void => {
+      abortCoordinator.abort('caller', context.signal.reason);
+    };
     if (context.signal.aborted) {
       abortFromCaller();
     } else {
       context.signal.addEventListener('abort', abortFromCaller, { once: true });
     }
     const deadline = setTimeout(() => {
-      internalDeadlineReached = true;
-      controller.abort(new Error('Repository evidence deadline reached.'));
+      abortCoordinator.abort(
+        'deadline',
+        new Error('Repository evidence deadline reached.'),
+      );
     }, limits.timeoutMs);
     deadline.unref();

@@ -237,14 +239,14 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
     try {
       repositoryRoot = await this.reader.resolveRoot(
         request.repoPath,
-        controller.signal,
+        abortCoordinator.signal,
       );
-      if (controller.signal.aborted) {
+      if (abortCoordinator.signal.aborted) {
         return this.timeoutResult(
           repositoryRoot,
           normalizedTerms,
-          context.signal.aborted,
-          limits.timeoutMs,
+          abortCoordinator.source,
+          limits,
         );
       }

@@ -274,16 +276,24 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
       if (codegraph !== undefined) {
         codegraphResult = await codegraph.search(
           backendRequest,
-          controller.signal,
+          abortCoordinator.signal,
         );
-        if (controller.signal.aborted) {
+        if (abortCoordinator.signal.aborted) {
           return this.timeoutResult(
             repositoryRoot,
             normalizedTerms,
-            context.signal.aborted,
-            limits.timeoutMs,
-            [attemptFor('codegraph', codegraphResult.health, codegraphResult.hits.length)],
-            codegraphResult.health,
+            abortCoordinator.source,
+            limits,
+            {
+              attempts: [
+                attemptFor(
+                  'codegraph',
+                  codegraphResult.health,
+                  codegraphResult.hits.length,
+                ),
+              ],
+              codeGraphHealth: codegraphResult.health,
+            },
           );
         }
         if (
@@ -310,7 +320,7 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
               1,
               limits.maxConfirmed + limits.maxCandidates,
             ),
-            signal: controller.signal,
+            signal: abortCoordinator.signal,
           });
           const primaryClassified = classifyDiscoveryRecords(
             primaryMerged.records,
@@ -320,7 +330,63 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
               negativeTerms,
               primaryAttempted: true,
             },
+            {
+              ...(primaryMerged.duplicateLocations > 0
+                ? { DUPLICATE_LOCATION: primaryMerged.duplicateLocations }
+                : {}),
+              ...(primaryMerged.unverifiedLocations > 0
+                ? { UNVERIFIED_FILE_CONTENT: primaryMerged.unverifiedLocations }
+                : {}),
+            },
           );
+          if (abortCoordinator.signal.aborted) {
+            const primaryConfirmed = selectConfirmedBudget(
+              primaryClassified.confirmed,
+              limits.maxConfirmed,
+            );
+            const primaryCandidates = selectCandidateBudget(
+              primaryClassified.candidates,
+              limits.maxCandidates,
+            );
+            const timeoutLimits: LimitReasonCode[] = ['TIMEOUT_REACHED'];
+            if (primarySelection.filesTruncated) {
+              timeoutLimits.push('MAX_FILES_REACHED');
+            }
+            for (const failure of primaryMerged.failures) {
+              if (failure.code === 'MAX_FILE_BYTES_REACHED') {
+                timeoutLimits.push('MAX_FILE_BYTES_REACHED');
+              }
+              if (failure.code === 'MAX_EXCERPT_BYTES_REACHED') {
+                timeoutLimits.push('MAX_EXCERPT_BYTES_REACHED');
+              }
+            }
+            if (primaryConfirmed.truncated) {
+              timeoutLimits.push('MAX_CONFIRMED_REACHED');
+            }
+            if (primaryCandidates.truncated) {
+              timeoutLimits.push('MAX_CANDIDATES_REACHED');
+            }
+            return this.timeoutResult(
+              repositoryRoot,
+              normalizedTerms,
+              abortCoordinator.source,
+              limits,
+              {
+                attempts: [
+                  attemptFor(
+                    'codegraph',
+                    codegraphResult.health,
+                    codegraphResult.hits.length,
+                  ),
+                ],
+                codeGraphHealth: codegraphResult.health,
+                confirmed: primaryConfirmed.selected,
+                candidates: primaryCandidates.selected,
+                limitsReached: uniqueSchemaOrder(timeoutLimits, LIMIT_REASON_CODES),
+                exclusionSummary: primaryClassified.exclusionSummary,
+              },
+            );
+          }
           skipFallback =
             !primarySelection.filesTruncated &&
             !primaryMerged.aborted &&
@@ -333,14 +399,22 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
                   evidence.role === 'execution-site'),
             );
         }
-        if (controller.signal.aborted) {
+        if (abortCoordinator.signal.aborted) {
           return this.timeoutResult(
             repositoryRoot,
             normalizedTerms,
-            context.signal.aborted,
-            limits.timeoutMs,
-            [attemptFor('codegraph', codegraphResult.health, codegraphResult.hits.length)],
-            codegraphResult.health,
+            abortCoordinator.source,
+            limits,
+            {
+              attempts: [
+                attemptFor(
+                  'codegraph',
+                  codegraphResult.health,
+                  codegraphResult.hits.length,
+                ),
+              ],
+              codeGraphHealth: codegraphResult.health,
+            },
           );
         }
       }
@@ -349,7 +423,7 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
         fallbackChecked = codegraphResult !== undefined;
         ripgrepResult = await ripgrep.search(
           backendRequest,
-          controller.signal,
+          abortCoordinator.signal,
         );
       }

@@ -370,7 +444,7 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
           maxExcerptLines: CLASSIFICATION_MAX_LINES,
         },
         maxMatchesPerHit: Math.max(1, limits.maxConfirmed + limits.maxCandidates),
-        signal: controller.signal,
+        signal: abortCoordinator.signal,
       });
       const initialExclusions: Partial<Record<ExclusionReasonCode, number>> = {};
       if (merged.duplicateLocations > 0) {
@@ -389,13 +463,16 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
         },
         initialExclusions,
       );
-      const confirmed = Object.freeze(
-        classified.confirmed.slice(0, limits.maxConfirmed),
+      const confirmedSelection = selectConfirmedBudget(
+        classified.confirmed,
+        limits.maxConfirmed,
       );
-      const existingCandidates = classified.candidates.slice(
-        0,
+      const confirmed = confirmedSelection.selected;
+      const existingCandidateSelection = selectCandidateBudget(
+        classified.candidates,
         limits.maxCandidates,
       );
+      const existingCandidates = existingCandidateSelection.selected;
       const retainedSeedKeys = new Set(
         [...confirmed, ...existingCandidates].map((evidence) =>
           createDiscoveryKey(evidence.location),
@@ -419,7 +496,7 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
               maxExcerptBytes: CLASSIFICATION_MAX_BYTES,
               maxExcerptLines: CLASSIFICATION_MAX_LINES,
             },
-            controller.signal,
+            abortCoordinator.signal,
           );
           candidateContexts.push(createVerifiedCandidateContext(record, window));
         } catch (error: unknown) {
@@ -447,14 +524,16 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
           0,
           limits.maxCandidates - existingCandidates.length,
         ),
-        signal: controller.signal,
+        signal: abortCoordinator.signal,
       });
-      const candidates = Object.freeze(
+      const candidateSelection = selectCandidateBudget(
         [
           ...existingCandidates,
           ...candidatePolicy.candidates.map(materializeCandidateDraft),
-        ].sort(comparePublicEvidence),
+        ],
+        limits.maxCandidates,
       );
+      const candidates = candidateSelection.selected;
       const confirmedKeys = new Set(
         confirmed.map((evidence) => createDiscoveryKey(evidence.location)),
       );
@@ -467,11 +546,11 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
           'Candidate policy violated discovery-key mutual exclusion.',
         );
       }
-      const confirmedTruncated =
-        classified.confirmed.length > limits.maxConfirmed;
+      const confirmedTruncated = confirmedSelection.truncated;
       const candidatesTruncated =
-        classified.candidates.length > limits.maxCandidates ||
-        candidatePolicy.truncated;
+        existingCandidateSelection.truncated ||
+        candidatePolicy.truncated ||
+        candidateSelection.truncated;

       const strategyComplete = skipFallback
         ? codegraphResult?.health.state === 'available' &&
@@ -479,12 +558,7 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
         : ripgrepResult?.health.state === 'available' && ripgrepResult.complete;
       const finalBackendResult = ripgrepResult ?? codegraphResult;
       const limitReasons: LimitReasonCode[] = [];
-      if (
-        filesTruncated ||
-        (strategyComplete !== true &&
-          finalBackendResult?.health.state === 'available' &&
-          finalBackendResult.complete === false)
-      ) {
+      if (filesTruncated) {
         limitReasons.push('MAX_FILES_REACHED');
       }
       for (const failure of merged.failures) {
@@ -508,11 +582,9 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
         limitReasons.push('MAX_CANDIDATES_REACHED');
       }
       if (
-        internalDeadlineReached ||
+        abortCoordinator.source !== 'none' ||
         merged.aborted ||
-        context.signal.aborted ||
-        (ripgrepResult?.health.reasonCode === 'BACKEND_ABORTED' &&
-          strategyComplete !== true)
+        abortCoordinator.signal.aborted
       ) {
         limitReasons.push('TIMEOUT_REACHED');
       }
@@ -521,25 +593,21 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
         state: 'unavailable' as const,
         reasonCode: 'RIPGREP_UNAVAILABLE' as const,
       };
-      const status = this.statusFor(
-        finalHealth,
-        strategyComplete === true,
-        confirmed.length + candidates.length,
+      const status = evaluateLocateStatus({
+        abortSource: abortCoordinator.source,
+        finalBackendHealth: finalHealth,
+        strategyComplete: strategyComplete === true,
+        evidenceCount: confirmed.length + candidates.length,
         limitsReached,
-        context.signal.aborted,
-      );
-      const nextActions = this.nextActionsFor(
+      }).status;
+      const nextActions = createNextActions({
         status,
-        candidates.length > 0,
-        filesTruncated ||
-          (strategyComplete !== true &&
-            finalBackendResult?.health.state === 'available') ||
-          confirmedTruncated ||
-          candidatesTruncated,
-        context.signal.aborted,
-        limits.timeoutMs,
-        codegraphResult?.health.state === 'missing',
-      );
+        hasCandidates: candidates.length > 0,
+        limitsReached,
+        abortSource: abortCoordinator.source,
+        limits,
+        initializeCodeGraph: codegraphResult?.health.state === 'missing',
+      });
       const attempts = Object.freeze([
         ...(codegraphResult === undefined
           ? []
@@ -560,8 +628,7 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
               ),
             ]),
       ]);
-
-      return {
+      return redactLocateResult({
         ok: true,
         evidence: {
           schemaVersion: '1.0',
@@ -580,17 +647,17 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
           },
           nextActions,
         },
-      };
+      });
     } catch (error: unknown) {
       if (
         (error instanceof RepositoryAccessError && error.code === 'ABORTED') ||
-        controller.signal.aborted
+        abortCoordinator.signal.aborted
       ) {
         return this.timeoutResult(
           repositoryRoot,
           normalizedTerms,
-          context.signal.aborted,
-          limits.timeoutMs,
+          abortCoordinator.source,
+          limits,
         );
       }
       return toolError(error);
@@ -600,100 +667,50 @@ export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
     }
   }

-  private statusFor(
-    health: BackendHealth,
-    complete: boolean,
-    evidenceCount: number,
-    limitsReached: readonly LimitReasonCode[],
-    callerAborted: boolean,
-  ): LocateStatus {
-    if (
-      callerAborted ||
-      health.reasonCode === 'BACKEND_ABORTED' ||
-      limitsReached.includes('TIMEOUT_REACHED')
-    ) {
-      return 'timeout';
-    }
-    if (health.state !== 'available') {
-      return evidenceCount > 0 ? 'partial' : 'backend_unavailable';
-    }
-    if (!complete || limitsReached.length > 0) {
-      return 'partial';
-    }
-    return evidenceCount > 0 ? 'ok' : 'no_result';
-  }
-
-  private nextActionsFor(
-    status: LocateStatus,
-    hasCandidates: boolean,
-    retryableLimitReached: boolean,
-    callerAborted: boolean,
-    timeoutMs: number,
-    initializeCodeGraph = false,
-  ): readonly NextActionCode[] {
-    const actions: NextActionCode[] = [];
-    if (status === 'no_result') {
-      actions.push('ADD_TERM', 'ADD_SYMBOL_ANCHOR');
-    }
-    if (hasCandidates) {
-      actions.push('CONFIRM_CANDIDATE');
-    }
-    if (
-      initializeCodeGraph &&
-      (status === 'no_result' || status === 'backend_unavailable')
-    ) {
-      actions.push('INITIALIZE_CODEGRAPH');
-    }
-    if (
-      (status === 'partial' && retryableLimitReached) ||
-      (status === 'timeout' && !callerAborted && timeoutMs < MAX_TIMEOUT_MS)
-    ) {
-      actions.push('RETRY_WITH_HIGHER_LIMIT');
-    }
-    return uniqueSchemaOrder(actions, NEXT_ACTION_CODES);
-  }
-
   private timeoutResult(
     repositoryRoot: string,
     normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
-    callerAborted: boolean,
-    timeoutMs: number,
-    attempts: readonly BackendAttempt[] = [
+    abortSource: LocateAbortSource,
+    limits: ResolvedLocateLimits,
+    options: TimeoutResultOptions = {},
+  ): LocateResult {
+    const attempts = options.attempts ?? [
       {
-        backend: 'ripgrep',
-        status: 'skipped',
-        reasonCode: 'BACKEND_ABORTED',
+        backend: 'ripgrep' as const,
+        status: 'skipped' as const,
+        reasonCode: 'BACKEND_ABORTED' as const,
         hitCount: 0,
       },
-    ],
-    codeGraphHealth?: BackendHealth,
-  ): LocateResult {
-    return {
+    ];
+    const confirmed = options.confirmed ?? [];
+    const candidates = options.candidates ?? [];
+    const limitsReached = options.limitsReached ?? ['TIMEOUT_REACHED'];
+    return redactLocateResult({
       ok: true,
       evidence: {
         schemaVersion: '1.0',
         status: 'timeout',
         repositoryRoot,
         normalizedTerms,
-        confirmed: [],
-        candidates: [],
+        confirmed,
+        candidates,
         coverage: {
           backends: attempts,
-          fallbackChecked: false,
-          indexState: indexStateFor(codeGraphHealth),
-          indexFreshness: indexFreshnessFor(codeGraphHealth),
-          limitsReached: ['TIMEOUT_REACHED'],
-          exclusionSummary: {},
+          fallbackChecked: options.fallbackChecked ?? false,
+          indexState: indexStateFor(options.codeGraphHealth),
+          indexFreshness: indexFreshnessFor(options.codeGraphHealth),
+          limitsReached,
+          exclusionSummary: options.exclusionSummary ?? {},
         },
-        nextActions: this.nextActionsFor(
-          'timeout',
-          false,
-          false,
-          callerAborted,
-          timeoutMs,
-        ),
+        nextActions: createNextActions({
+          status: 'timeout',
+          hasCandidates: candidates.length > 0,
+          limitsReached,
+          abortSource,
+          limits,
+        }),
       },
-    };
+    });
   }

   private backendUnavailableResult(
diff --git a/src/index.ts b/src/index.ts
index 93a5d0c..627f47a 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,6 +10,11 @@ export * from './repository/codegraph-query-planner.js';
 export * from './repository/node-safe-process-runner.js';
 export * from './evidence/repository-evidence-engine.js';
 export * from './evidence/candidate-policy.js';
+export * from './evidence/evidence-redactor.js';
+export * from './evidence/locate-status-evaluator.js';
+export * from './evidence/next-action-policy.js';
+export * from './evidence/result-budget-selector.js';
+export * from './mcp/diagnostic-scrubber.js';
 export * from './mcp/locate-tool-schema.js';
 export * from './mcp/locate-tool-output.js';
 export * from './mcp/repo-nav-mcp-server.js';
diff --git a/src/main.ts b/src/main.ts
index 875f072..faa90dd 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -12,6 +12,7 @@ import {
   createMcpStartupShutdownController,
   type McpShutdownCoordinator,
 } from './mcp/mcp-shutdown-coordinator.js';
+import { writeScrubbedDiagnostic } from './mcp/diagnostic-scrubber.js';
 import { MCP_STDIO_HOST } from './runtime/tokens.js';

 function installProcessShutdownHandlers(
@@ -55,7 +56,7 @@ async function bootstrap(): Promise<void> {
     }
     await host.connect();
   } catch {
-    process.stderr.write('RepoNav MCP bootstrap failed.\n');
+    writeScrubbedDiagnostic('RepoNav MCP bootstrap failed.');
     if (coordinator !== undefined) {
       await coordinator.shutdown('bootstrap-error', 1);
     } else if (application !== undefined) {
diff --git a/src/mcp/locate-tool-output.ts b/src/mcp/locate-tool-output.ts
index e998739..0dc31a6 100644
--- a/src/mcp/locate-tool-output.ts
+++ b/src/mcp/locate-tool-output.ts
@@ -1,60 +1,28 @@
 import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

 import {
+  applyPublicErrorPolicy,
+  createPublicErrorResult,
   LocateToolOutputSchema,
   type LocateResult,
   type LocateToolOutput,
-  type RepoNavToolError,
 } from '../contracts/index.js';
-
-const SAFE_ERROR_MESSAGES: Readonly<
-  Record<RepoNavToolError['code'], string>
-> = Object.freeze({
-  INVALID_INPUT: 'Locate request does not match the required schema.',
-  INVALID_REPOSITORY: 'Repository root is invalid or unavailable.',
-  PATH_OUTSIDE_ROOT: 'Repository path is outside the configured root.',
-  INTERNAL_ERROR: 'Repository evidence request failed.',
-});
+import { redactLocateResult } from '../evidence/evidence-redactor.js';

 export function invalidLocateInput(addTermSuggested: boolean): LocateResult {
-  return {
-    ok: false,
-    error: {
-      code: 'INVALID_INPUT',
-      message: SAFE_ERROR_MESSAGES.INVALID_INPUT,
-      recoverable: true,
-      ...(addTermSuggested ? { suggestedAction: 'ADD_TERM' as const } : {}),
-    },
-  };
+  return createPublicErrorResult(
+    'INVALID_INPUT',
+    addTermSuggested ? 'ADD_TERM' : undefined,
+  );
 }

 export function internalLocateError(): LocateResult {
-  return {
-    ok: false,
-    error: {
-      code: 'INTERNAL_ERROR',
-      message: SAFE_ERROR_MESSAGES.INTERNAL_ERROR,
-      recoverable: false,
-    },
-  };
-}
-
-function applySafeMessagePolicy(result: LocateResult): LocateResult {
-  if (result.ok) {
-    return result;
-  }
-  return {
-    ok: false,
-    error: {
-      ...result.error,
-      message: SAFE_ERROR_MESSAGES[result.error.code],
-    },
-  };
+  return createPublicErrorResult('INTERNAL_ERROR');
 }

 export function serializeLocateToolOutput(result: LocateResult): CallToolResult {
   const output: LocateToolOutput = LocateToolOutputSchema.parse(
-    applySafeMessagePolicy(result),
+    redactLocateResult(applyPublicErrorPolicy(result)),
   );
   return {
     structuredContent: output as Readonly<Record<string, unknown>>,
diff --git a/src/mcp/mcp-shutdown-coordinator.ts b/src/mcp/mcp-shutdown-coordinator.ts
index 5df4a56..5ad37aa 100644
--- a/src/mcp/mcp-shutdown-coordinator.ts
+++ b/src/mcp/mcp-shutdown-coordinator.ts
@@ -4,6 +4,7 @@ import type {
   McpShutdownReason,
   McpStdioHost,
 } from './mcp-stdio-host.js';
+import { writeScrubbedDiagnostic } from './diagnostic-scrubber.js';

 export interface McpShutdownCoordinator {
   shutdown(reason: McpShutdownReason, exitCode: number): Promise<void>;
@@ -29,7 +30,7 @@ const NODE_PROCESS_REPORTER: McpShutdownReporter = Object.freeze({
     process.exitCode = exitCode;
   },
   reportFailure: () => {
-    process.stderr.write('RepoNav MCP shutdown failed.\n');
+    writeScrubbedDiagnostic('RepoNav MCP shutdown failed.');
   },
 });

diff --git a/src/mcp/mcp-stdio-host.ts b/src/mcp/mcp-stdio-host.ts
index 7ccd60e..32a4adc 100644
--- a/src/mcp/mcp-stdio-host.ts
+++ b/src/mcp/mcp-stdio-host.ts
@@ -5,7 +5,6 @@ import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

 import {
   LocateRequestSchema,
-  resolveLocateLimits,
   type LocateRequest,
   type RepositoryEvidenceService,
 } from '../contracts/index.js';
@@ -139,14 +138,7 @@ export class NodeMcpStdioHost implements McpStdioHost, OnModuleDestroy {
     argumentsValue: Readonly<Record<string, unknown>> | undefined,
   ): boolean {
     const terms = argumentsValue?.terms;
-    return (
-      !Array.isArray(terms) ||
-      terms.length === 0 ||
-      terms.some(
-        (term) =>
-          typeof term !== 'string' || term.normalize('NFKC').trim().length === 0,
-      )
-    );
+    return terms === undefined || (Array.isArray(terms) && terms.length === 0);
   }

   private async executeTrackedLocate(
@@ -167,8 +159,6 @@ export class NodeMcpStdioHost implements McpStdioHost, OnModuleDestroy {
     if (sdkSignal.aborted || this.shutdownController.signal.aborted) {
       abort();
     }
-    const timeout = setTimeout(abort, resolveLocateLimits(request.limits).timeoutMs);
-
     try {
       const result = await this.evidenceService.locate(request, {
         signal: tracked.controller.signal,
@@ -177,7 +167,6 @@ export class NodeMcpStdioHost implements McpStdioHost, OnModuleDestroy {
     } catch {
       return serializeLocateToolOutput(internalLocateError());
     } finally {
-      clearTimeout(timeout);
       sdkSignal.removeEventListener('abort', abort);
       this.shutdownController.signal.removeEventListener('abort', abort);
       tracked.settle();
diff --git a/test/golden/text-evidence-engine.spec.ts b/test/golden/text-evidence-engine.spec.ts
index dff7d32..b70ce0a 100644
--- a/test/golden/text-evidence-engine.spec.ts
+++ b/test/golden/text-evidence-engine.spec.ts
@@ -65,8 +65,8 @@ const EXPECTED_STATE = Object.freeze({
   },
   'ripgrep-incomplete': {
     backend: { backend: 'ripgrep', status: 'used', hitCount: 1 },
-    limitsReached: ['MAX_FILES_REACHED'],
-    nextActions: ['CONFIRM_CANDIDATE', 'RETRY_WITH_HIGHER_LIMIT'],
+    limitsReached: [],
+    nextActions: ['CONFIRM_CANDIDATE'],
   },
   'ripgrep-timeout': {
     backend: {
@@ -75,8 +75,8 @@ const EXPECTED_STATE = Object.freeze({
       reasonCode: 'BACKEND_ABORTED',
       hitCount: 0,
     },
-    limitsReached: ['TIMEOUT_REACHED'],
-    nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
+    limitsReached: [],
+    nextActions: [],
   },
 } as const);

@@ -315,7 +315,7 @@ describe.runIf(isSelected(baselineIdentity))('text engine verified metadata', ()
     });
     expect(result).toMatchObject({
       ok: false,
-      error: { code: 'INVALID_REPOSITORY', recoverable: false },
+      error: { code: 'INVALID_REPOSITORY', recoverable: true },
     });
   });

@@ -454,7 +454,7 @@ describe.runIf(isSelected(baselineIdentity))('text engine verified metadata', ()
         confirmed: [],
         candidates: [],
         coverage: {
-          limitsReached: ['MAX_FILES_REACHED', 'MAX_CANDIDATES_REACHED'],
+          limitsReached: ['MAX_CANDIDATES_REACHED'],
         },
         nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
       },
diff --git a/test/mcp/tool-error-parity.spec.ts b/test/mcp/tool-error-parity.spec.ts
index 9ebf28e..59973fb 100644
--- a/test/mcp/tool-error-parity.spec.ts
+++ b/test/mcp/tool-error-parity.spec.ts
@@ -48,8 +48,20 @@ describe.runIf(selected('invalid-input'))('MCP invalid input mapping', () => {
       },
       {
         argumentsValue: { ...baseArguments, terms: 'hcp_id' },
+        suggestedAction: undefined,
+      },
+      {
+        argumentsValue: { ...baseArguments, terms: [] },
         suggestedAction: 'ADD_TERM',
       },
+      {
+        argumentsValue: { ...baseArguments, terms: ['hcp_id', 7] },
+        suggestedAction: undefined,
+      },
+      {
+        argumentsValue: { ...baseArguments, terms: [''] },
+        suggestedAction: undefined,
+      },
       {
         argumentsValue: { ...baseArguments, question: 'x'.repeat(20_000) },
         suggestedAction: undefined,
@@ -79,6 +91,7 @@ describe.runIf(selected('invalid-input'))('MCP invalid input mapping', () => {
 async function verifyServiceError(
   question: string,
   code: RepoNavToolError['code'],
+  recoverable: boolean,
 ): Promise<void> {
   const session = await connectMcpStdioFixture();
   try {
@@ -89,7 +102,7 @@ async function verifyServiceError(
     const parsed = parseLocateToolResultParity(result);
     expectSafeError(parsed, code);
     if (!parsed.output.ok) {
-      expect(parsed.output.error.recoverable).toBe(false);
+      expect(parsed.output.error.recoverable).toBe(recoverable);
       expect(parsed.output.error.suggestedAction).toBeUndefined();
     }
   } finally {
@@ -99,13 +112,21 @@ async function verifyServiceError(

 describe.runIf(selected('invalid-repo'))('MCP invalid repository mapping', () => {
   it('preserves the typed code while sanitizing unsafe detail', async () => {
-    await verifyServiceError('error:INVALID_REPOSITORY', 'INVALID_REPOSITORY');
+    await verifyServiceError(
+      'error:INVALID_REPOSITORY',
+      'INVALID_REPOSITORY',
+      true,
+    );
   });
 });

 describe.runIf(selected('path-outside-root'))('MCP path boundary mapping', () => {
   it('preserves the typed code while sanitizing unsafe detail', async () => {
-    await verifyServiceError('error:PATH_OUTSIDE_ROOT', 'PATH_OUTSIDE_ROOT');
+    await verifyServiceError(
+      'error:PATH_OUTSIDE_ROOT',
+      'PATH_OUTSIDE_ROOT',
+      false,
+    );
   });
 });

@@ -113,7 +134,16 @@ describe.runIf(selected('internal-error-parity'))(
   'MCP internal exception mapping',
   () => {
     it('turns thrown failures into safe typed parity output', async () => {
-      await verifyServiceError('throw:INTERNAL_ERROR', 'INTERNAL_ERROR');
+      await verifyServiceError(
+        'throw:INTERNAL_ERROR',
+        'INTERNAL_ERROR',
+        false,
+      );
+      await verifyServiceError(
+        'error:INTERNAL_ERROR',
+        'INTERNAL_ERROR',
+        false,
+      );
     });
   },
 );
diff --git a/testkit/fixtures/mcp/fixture-evidence.service.ts b/testkit/fixtures/mcp/fixture-evidence.service.ts
index ac9fe55..e03de00 100644
--- a/testkit/fixtures/mcp/fixture-evidence.service.ts
+++ b/testkit/fixtures/mcp/fixture-evidence.service.ts
@@ -8,12 +8,15 @@ import {
 } from '../../../src/contracts/index.js';
 import { RepositoryEvidenceEngine } from '../../../src/evidence/repository-evidence-engine.js';
 import { NodeRepositoryReader } from '../../../src/repository/node-repository-reader.js';
+import { writeScrubbedDiagnostic } from '../../../src/mcp/diagnostic-scrubber.js';
 import {
   CandidateFixtureBackend,
   candidateFixtureRoot,
 } from '../candidate-policy/candidate-fixture-backend.js';

 const FIXTURE_EVIDENCE_ID = `evidence:v1:${'0'.repeat(64)}`;
+const MALFORMED_EVIDENCE_ID = `evidence:v1:${'1'.repeat(64)}`;
+const DERIVED_EVIDENCE_ID = `evidence:v1:${'2'.repeat(64)}`;

 function requestedStatus(question: string): LocateStatus {
   const marker = 'status:';
@@ -36,6 +39,7 @@ function requestedStatus(question: string): LocateStatus {
 function successResult(request: LocateRequest): LocateResult {
   const status = requestedStatus(request.question);
   const sourceMapping = request.question === 'source-field-mapping';
+  const redactionOutput = request.question === 'redaction-output-parity';
   return {
     ok: true,
     evidence: {
@@ -46,7 +50,7 @@ function successResult(request: LocateRequest): LocateResult {
         request.terms,
         request.termCase ?? 'smart',
       ),
-      confirmed: sourceMapping
+      confirmed: sourceMapping || redactionOutput
         ? [
             {
               evidenceClass: 'confirmed',
@@ -56,7 +60,9 @@ function successResult(request: LocateRequest): LocateResult {
                 file: 'server/mapping.ts',
                 symbol: 'hcpId',
                 lines: [1, 1],
-                excerpt: 'hcpId = hcp_id;',
+                excerpt: redactionOutput
+                  ? 'api_key=[REDACTED] password="[REDACTED]"; secret=[REDACTED]'abc,def\'; token=`my backtick secret`; passwd=`backtick,comma`; client_secret="[REDACTED]"escaped\\" secret"; dsn=postgres://admin:dbPassword@localhost/app?token=[REDACTED] owner=stan.guo@mail.ru; phone=+86 138-0013-8000'
+                  : 'hcpId = hcp_id;',
               },
               provenance: {
                 discoveredBy: ['ripgrep'],
@@ -65,9 +71,55 @@ function successResult(request: LocateRequest): LocateResult {
               },
               reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
             },
+            ...(redactionOutput
+              ? [
+                  {
+                    evidenceClass: 'confirmed' as const,
+                    id: MALFORMED_EVIDENCE_ID,
+                    role: 'value-mapping' as const,
+                    location: {
+                      file: 'server/malformed.ts',
+                      lines: [1, 1] as const,
+                      excerpt: 'password="[REDACTED]',
+                    },
+                    provenance: {
+                      discoveredBy: ['ripgrep' as const],
+                      verifiedBy: 'filesystem' as const,
+                      operations: [
+                        'RIPGREP_SEARCH' as const,
+                        'FILESYSTEM_READ_RANGE' as const,
+                      ],
+                    },
+                    reasonCodes: [
+                      'DIRECT_ALIAS_MAPPING' as const,
+                      'EXACT_TERM_MATCH' as const,
+                    ],
+                  },
+                ]
+              : []),
+          ]
+        : [],
+      candidates: redactionOutput
+        ? [
+            {
+              evidenceClass: 'candidate',
+              id: DERIVED_EVIDENCE_ID,
+              role: 'related',
+              location: {
+                file: 'server/derived.ts',
+                lines: [1, 1],
+                excerpt: 'const alias = "malformed shared value";',
+              },
+              provenance: {
+                discoveredBy: ['ripgrep'],
+                verifiedBy: 'filesystem',
+                operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
+              },
+              reasonCodes: ['SAME_ENTITY_SIBLING'],
+              promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
+            },
           ]
         : [],
-      candidates: [],
       coverage: {
         backends:
           status === 'backend_unavailable'
@@ -114,6 +166,7 @@ function errorResult(code: string): LocateResult | undefined {
       message:
         'Unsafe fixture detail C:\\private\\repo\\secret.ts\n    at fixture (raw stderr)',
       recoverable: false,
+      suggestedAction: 'ADD_TERM',
     },
   };
 }
@@ -123,6 +176,11 @@ export class FixtureEvidenceService implements RepositoryEvidenceService {
     request: LocateRequest,
     context: LocateExecutionContext,
   ): Promise<LocateResult> {
+    if (request.question === 'redaction-output-parity') {
+      writeScrubbedDiagnostic(
+        'token=[REDACTED] C:\\private\\repo\\secret.ts stan.guo@mail.ru',
+      );
+    }
     if (request.question === 'candidate-minimal-loop') {
       const engine = new RepositoryEvidenceEngine(
         [new CandidateFixtureBackend()],
diff --git a/testkit/manifests/golden/ripgrep-incomplete.yaml b/testkit/manifests/golden/ripgrep-incomplete.yaml
index c03760a..22ce5f8 100644
--- a/testkit/manifests/golden/ripgrep-incomplete.yaml
+++ b/testkit/manifests/golden/ripgrep-incomplete.yaml
@@ -18,5 +18,5 @@ expected:
       role: reference
       reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
   forbiddenEvidenceIds: []
-  requiredCoverageCodes: [MAX_FILES_REACHED]
+  requiredCoverageCodes: []
   minimumExclusionCounts: {}
diff --git a/testkit/manifests/golden/ripgrep-timeout.yaml b/testkit/manifests/golden/ripgrep-timeout.yaml
index 541b5c7..22752d0 100644
--- a/testkit/manifests/golden/ripgrep-timeout.yaml
+++ b/testkit/manifests/golden/ripgrep-timeout.yaml
@@ -11,9 +11,9 @@ request:
     timeoutMs: 10000
 expected:
   ok: true
-  status: timeout
+  status: backend_unavailable
   confirmed: []
   candidates: []
   forbiddenEvidenceIds: []
-  requiredCoverageCodes: [BACKEND_ABORTED, TIMEOUT_REACHED]
+  requiredCoverageCodes: [BACKEND_ABORTED]
   minimumExclusionCounts: {}
diff --git a/testkit/runners/runner-registry.ts b/testkit/runners/runner-registry.ts
index 5a91b34..e8f02c4 100644
--- a/testkit/runners/runner-registry.ts
+++ b/testkit/runners/runner-registry.ts
@@ -33,6 +33,8 @@ export const RUNNER_SELECTIONS: Readonly<
       'codegraph-parser',
       'codegraph-query-plan',
       'codegraph-live-smoke',
+      'locate-status',
+      'output-guardrails',
     ]),
     cases: new Set([
       'runner-smoke',
@@ -59,6 +61,14 @@ export const RUNNER_SELECTIONS: Readonly<
       'codegraph-parser',
       'codegraph-query-plan',
       'indexed-temp-repo',
+      'transition-matrix-completeness',
+      'hit-unverified-fallback-complete',
+      'hit-unverified-fallback-unavailable',
+      'caller-abort-empty',
+      'caller-abort-with-evidence',
+      'internal-deadline-below-max',
+      'internal-deadline-at-max',
+      'redaction-policy',
     ]),
   }),
   golden: Object.freeze({
@@ -68,6 +78,8 @@ export const RUNNER_SELECTIONS: Readonly<
       'text-evidence-engine',
       'candidate-policy',
       'codegraph-fallback',
+      'result-limits',
+      'output-redaction',
     ]),
     cases: new Set([
       'runner-smoke',
@@ -94,6 +106,10 @@ export const RUNNER_SELECTIONS: Readonly<
       'codegraph-symbol-complete-no-fallback',
       'codegraph-secondary-provenance-table',
       'backend-unavailable',
+      'partial-empty-limit',
+      'partial-with-evidence',
+      'secret-redaction',
+      'redaction-metadata',
     ]),
   }),
   mcp: Object.freeze({
@@ -115,6 +131,7 @@ export const RUNNER_SELECTIONS: Readonly<
       'stdio-clean-output',
       'stdio-graceful-shutdown',
       'candidate-minimal-loop',
+      'redaction-output-parity',
     ]),
   }),
 });
```

### Staged

```diff
No staged diff.
```

### Untracked Files

#### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-dod-results.json`

```
{
  "gate_id": "dod-runner",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "command": "npm run build",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 build\n> tsc -p tsconfig.build.json\n\n",
      "stderr": "",
      "id": "CMD-BUILD",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run typecheck",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 typecheck\n> tsc -p tsconfig.json --noEmit\n\n",
      "stderr": "",
      "id": "CMD-TYPECHECK",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2035ms\n     ✓ distinguishes its own deadline from a caller abort  1005ms\n     ✓ retains verification completed before the abort  1016ms\n\n Test Files  1 passed | 16 skipped (17)\n      Tests  13 passed | 145 skipped (158)\n   Start at  17:52:44\n   Duration  3.03s (transform 1.89s, setup 0ms, import 8.44s, tests 2.03s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-STATUS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group result-limits --case partial-empty-limit --case partial-with-evidence\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 5 skipped) 23ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  3 passed | 45 skipped (48)\n   Start at  17:52:48\n   Duration  841ms (transform 612ms, setup 0ms, import 3.62s, tests 23ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-LIMITS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case secret-redaction --case redaction-metadata\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 3 skipped) 15ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  5 passed | 43 skipped (48)\n   Start at  17:52:50\n   Duration  818ms (transform 581ms, setup 0ms, import 3.30s, tests 15ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case redaction-output-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 685ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  683ms\n\n Test Files  1 passed | 7 skipped (8)\n      Tests  1 passed | 31 skipped (32)\n   Start at  17:52:53\n   Duration  1.38s (transform 823ms, setup 0ms, import 4.83s, tests 685ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-REDACTION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests | 7 skipped) 13ms\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3318ms\n     ✓ maps schema-invalid objects to typed parity output  687ms\n     ✓ preserves the typed code while sanitizing unsafe detail  665ms\n     ✓ preserves the typed code while sanitizing unsafe detail  657ms\n     ✓ turns thrown failures into safe typed parity output  1307ms\n\n Test Files  2 passed | 6 skipped (8)\n      Tests  5 passed | 27 skipped (32)\n   Start at  17:52:58\n   Duration  3.98s (transform 770ms, setup 0ms, import 4.54s, tests 3.33s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ERRORS",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack-results.json`

```
{
  "gate_id": "evidence-pack",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "out": ".codestable\\features\\2026-07-10-evidence-output-guardrails\\evidence-output-guardrails-evidence-pack.md",
      "providers": {
        "archguard": {
          "status": "unavailable",
          "reason": "archguard binary not found on PATH",
          "warnings": []
        },
        "meta_cc": {
          "status": "unavailable",
          "reason": "meta-cc summary not found; realtime session collection is out of scope",
          "warnings": []
        }
      }
    }
  ],
  "providers": {}
}
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack.md`

```
---
doc_type: feature-evidence-pack
feature: 2026-07-10-evidence-output-guardrails
status: generated
---

# 2026-07-10-evidence-output-guardrails evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`
- Checklist: `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml`

## 2. DoD Results

```json
{
  "gate_id": "dod-runner",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "command": "npm run build",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 build\n> tsc -p tsconfig.build.json\n\n",
      "stderr": "",
      "id": "CMD-BUILD",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run typecheck",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 typecheck\n> tsc -p tsconfig.json --noEmit\n\n",
      "stderr": "",
      "id": "CMD-TYPECHECK",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2035ms\n     ✓ distinguishes its own deadline from a caller abort  1005ms\n     ✓ retains verification completed before the abort  1016ms\n\n Test Files  1 passed | 16 skipped (17)\n      Tests  13 passed | 145 skipped (158)\n   Start at  17:52:44\n   Duration  3.03s (transform 1.89s, setup 0ms, import 8.44s, tests 2.03s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-STATUS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group result-limits --case partial-empty-limit --case partial-with-evidence\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 5 skipped) 23ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  3 passed | 45 skipped (48)\n   Start at  17:52:48\n   Duration  841ms (transform 612ms, setup 0ms, import 3.62s, tests 23ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-LIMITS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case secret-redaction --case redaction-metadata\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 3 skipped) 15ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  5 passed | 43 skipped (48)\n   Start at  17:52:50\n   Duration  818ms (transform 581ms, setup 0ms, import 3.30s, tests 15ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case redaction-output-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 685ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  683ms\n\n Test Files  1 passed | 7 skipped (8)\n      Tests  1 passed | 31 skipped (32)\n   Start at  17:52:53\n   Duration  1.38s (transform 823ms, setup 0ms, import 4.83s, tests 685ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-REDACTION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests | 7 skipped) 13ms\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3318ms\n     ✓ maps schema-invalid objects to typed parity output  687ms\n     ✓ preserves the typed code while sanitizing unsafe detail  665ms\n     ✓ preserves the typed code while sanitizing unsafe detail  657ms\n     ✓ turns thrown failures into safe typed parity output  1307ms\n\n Test Files  2 passed | 6 skipped (8)\n      Tests  5 passed | 27 skipped (32)\n   Start at  17:52:58\n   Duration  3.98s (transform 770ms, setup 0ms, import 4.54s, tests 3.33s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ERRORS",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 13771
Checklist bytes: 4825

## 5. Residual Risks

- none

## 6. Provider Signals

```json
{
  "archguard": {
    "status": "unavailable",
    "reason": "archguard binary not found on PATH",
    "warnings": []
  },
  "meta_cc": {
    "status": "unavailable",
    "reason": "meta-cc summary not found; realtime session collection is out of scope",
    "warnings": []
  }
}
```

## 7. Gate Results

```json
{
  "gate_id": "scope-gate",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "changed_files": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        "src/contracts/constants.ts",
        "src/contracts/index.ts",
        "src/contracts/request.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/index.ts",
        "src/main.ts",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/mcp-shutdown-coordinator.ts",
        "src/mcp/mcp-stdio-host.ts",
        "test/golden/text-evidence-engine.spec.ts",
        "test/mcp/tool-error-parity.spec.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/manifests/golden/ripgrep-incomplete.yaml",
        "testkit/manifests/golden/ripgrep-timeout.yaml",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-implementation.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review-packet.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/implementation-scope.txt",
        ".codestable/features/2026-07-10-evidence-output-guardrails/locate-transition-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/redaction-forbidden-scan-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/result-limit-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/tool-error-parity-report.md",
        "src/contracts/public-errors.ts",
        "src/evidence/abort-source.ts",
        "src/evidence/evidence-redactor.ts",
        "src/evidence/locate-status-evaluator.ts",
        "src/evidence/next-action-policy.ts",
        "src/evidence/result-budget-selector.ts",
        "src/mcp/diagnostic-scrubber.ts",
        "test/golden/output-guardrails.spec.ts",
        "test/mcp/redaction-output-parity.spec.ts",
        "test/unit/locate-status-evaluator.spec.ts",
        "test/unit/output-guardrails.spec.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-dod-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-evidence-output-guardrails",
        "src/contracts",
        "src/evidence",
        "src/mcp",
        "src/repository",
        "src/index.ts",
        "src/main.ts",
        "test/unit",
        "test/golden",
        "test/mcp",
        "testkit/contracts",
        "testkit/fixtures/output-guardrails",
        "testkit/fixtures/mcp",
        "testkit/manifests/golden",
        "testkit/manifests/mcp",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md"
      ]
    }
  ],
  "providers": {}
}
```
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-gate-results.json`

```
{
  "gate_id": "scope-gate",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "changed_files": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        "src/contracts/constants.ts",
        "src/contracts/index.ts",
        "src/contracts/request.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/index.ts",
        "src/main.ts",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/mcp-shutdown-coordinator.ts",
        "src/mcp/mcp-stdio-host.ts",
        "test/golden/text-evidence-engine.spec.ts",
        "test/mcp/tool-error-parity.spec.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/manifests/golden/ripgrep-incomplete.yaml",
        "testkit/manifests/golden/ripgrep-timeout.yaml",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-implementation.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review-packet.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/implementation-scope.txt",
        ".codestable/features/2026-07-10-evidence-output-guardrails/locate-transition-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/redaction-forbidden-scan-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/result-limit-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/tool-error-parity-report.md",
        "src/contracts/public-errors.ts",
        "src/evidence/abort-source.ts",
        "src/evidence/evidence-redactor.ts",
        "src/evidence/locate-status-evaluator.ts",
        "src/evidence/next-action-policy.ts",
        "src/evidence/result-budget-selector.ts",
        "src/mcp/diagnostic-scrubber.ts",
        "test/golden/output-guardrails.spec.ts",
        "test/mcp/redaction-output-parity.spec.ts",
        "test/unit/locate-status-evaluator.spec.ts",
        "test/unit/output-guardrails.spec.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-dod-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-evidence-output-guardrails",
        "src/contracts",
        "src/evidence",
        "src/mcp",
        "src/repository",
        "src/index.ts",
        "src/main.ts",
        "test/unit",
        "test/golden",
        "test/mcp",
        "testkit/contracts",
        "testkit/fixtures/output-guardrails",
        "testkit/fixtures/mcp",
        "testkit/manifests/golden",
        "testkit/manifests/mcp",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md"
      ]
    }
  ],
  "providers": {}
}
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-implementation.md`

```
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
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review-packet.md`

```
[large file omitted]
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/implementation-scope.txt`

```
# F7 implementation scope approved by the feature design.
src/contracts
src/evidence
src/mcp
src/repository
src/index.ts
src/main.ts
test/unit
test/golden
test/mcp
testkit/contracts
testkit/fixtures/output-guardrails
testkit/fixtures/mcp
testkit/manifests/golden
testkit/manifests/mcp
testkit/runners
.codestable/roadmap/repo-nav-mvp/goal-state.yaml
.codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/locate-transition-matrix-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# LocateStatus transition matrix 证据

- `LOCATE_TRANSITION_ROW_IDS` 固定十个 predicate rows：四类 tool error、caller abort、internal deadline、backend unavailable special、coverage gap、verified evidence 与 verified no-result。
- `evaluateLocateStatus` 的复合优先级为 timeout → backend-unavailable special → coverage gap → ok/no_result；tool errors 位于 EvidencePack pipeline 外，由同一 completeness inventory 追踪。
- `BackendSearchResult.complete=false` 只令 strategy incomplete，不伪造 `MAX_FILES_REACHED`；fallback complete 可关闭 primary incomplete。
- hit-unverified + fallback complete → `no_result`；fallback unavailable → `backend_unavailable`。
- caller abort 无论已有证据与否均为 timeout 且不建议 retry；engine-owned deadline 在 timeoutMs 未达 30 秒上限时建议 retry，到上限时不建议。
- `LocateAbortCoordinator` 使用 first-writer-wins 锁定 caller/deadline 来源；deadline-first/caller-later 与 caller-first/deadline-later 都不会被后到事件改写。
- CodeGraph 多 hit 核验中途 abort 时保留 abort 前已完成的 confirmed/candidate，不再走固定空数组的 early return。
- backend 自身固定 process timeout 只形成 backend unavailable/coverage gap，不伪装成 caller-adjustable engine deadline，也不产生 `RETRY_WITH_HIGHER_LIMIT`。
- MCP host 不再创建与 engine 竞争的 request timer；deadline ownership 唯一属于 Evidence Engine，SDK/host shutdown signal 才是 caller abort。
- 验证：CMD-STATUS → 13 passed；包含真实 1 秒 engine-owned deadline、CodeGraph caller/deadline evidence-preservation integration。
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/redaction-forbidden-scan-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# Redaction / forbidden-value scan 证据

- `EvidenceRedactor` 只在 canonical ID 与 stable order 已确定后处理 public location；ID、file、symbol、lines 保持，raw discovery/hash material 不公开。
- `SECRET_LIKE_VALUE`：已知 key assignment 与固定 credential；`CONNECTION_STRING`：URI userinfo/query secret；`PERSONAL_DATA`：email/phone-like token，不猜人名；`BINARY_OR_OVERSIZED_CONTENT`：完整 UTF-8 read 后单 token > 2048 bytes 使用整段 placeholder。
- 跨 evidence token propagation 防止 secret assignment seed 已遮盖但 alias/source derived candidate 仍泄露同一 raw value。
- quoted assignment 会完整消费单/双引号/backtick 内含空格、逗号、分号和转义引号的 value；template literal 含 `${...}` 或引号畸形且无法安全切片时整段替换为 placeholder。
- malformed quoted tail 的边界可确定时会进入跨 evidence sensitive-token propagation；真实 Engine 与 MCP fixture 均证明 seed 整段遮盖、derived candidate 同值遮盖。
- 真正 `BINARY_FILE`/reader cap failure 不产生 evidence/redaction，只记录 UNVERIFIED 与相应 fixed limit。
- MCP serializer 再次对任意 service success 执行同一 redaction，随后 schema validate 并生成 structured/text parity；正式 stderr 经 `DiagnosticScrubber` 删除 stack、绝对路径和敏感 token，stdout 保持协议 frames-only。
- Forbidden scan values 覆盖普通/单引号/双引号/backtick/malformed/escaped source secret、malformed-derived 同值、DSN password/query token、email、phone、diagnostic secret 与 absolute path；真实 Engine service JSON、MCP structured/text/protocol result 与 captured stderr 均无原值。
- 验证：CMD-REDACTION → 5 Golden + 1 real stdio MCP passed；redaction unit 7 passed 中覆盖四 reason、ID stability、template fail-closed、malformed propagation、PERSONAL_DATA 边界与 diagnostic scrubber。
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/result-limit-matrix-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# Result limit / nextAction matrix 证据

| Limit | 触发证据 | Status | Retry |
|---|---|---|---|
| maxFiles | stable file order 后确有额外 eligible file | partial | 当前值 < 20 |
| maxConfirmed | stable confirmed selection 后确有截断 | partial | 当前值 < 20 |
| maxCandidates | existing/derived candidate 确有截断；0 合法 | partial | 当前值 < 20 |
| maxFileBytes | reader typed failure + UNVERIFIED exclusion | partial | never |
| maxExcerptBytes/Lines | reader typed failure + UNVERIFIED exclusion | partial | never |
| timeoutMs | first-writer-wins engine deadline/abort source | timeout | internal deadline 且当前值 < 30000 |

- `ResultBudgetSelector` 在截断前按 canonical public key 排序；backend hit 与 filesystem arrival permutation 不改变 retained evidence/ID/order。
- caller 主动传小值但没有 eligible overflow 时不产生 `MAX_*_REACHED`。
- backend incomplete 不再冒充 maxFiles；只形成 coverage gap。
- backend 的固定 10 秒 process timeout 与 request `timeoutMs` 分层：前者不是 caller-adjustable limit，不建议提高 request limit。
- 验证：CMD-LIMITS → 3 passed；另有 unit 对 adjustable schema maxima 与 fixed caps 的 exact no-retry 断言。
```

#### `.codestable/features/2026-07-10-evidence-output-guardrails/tool-error-parity-report.md`

```
---
doc_type: feature-evidence
feature: 2026-07-10-evidence-output-guardrails
status: current
---

# RepoNavToolError parity 证据

| Code | recoverable | suggestedAction | Safe message |
|---|---:|---|---|
| INVALID_INPUT | true | 仅缺/空 terms 时 ADD_TERM | Locate request does not match the required schema. |
| INVALID_REPOSITORY | true | none | Repository root is invalid or unavailable. |
| PATH_OUTSIDE_ROOT | false | none | Repository path is outside the configured root. |
| INTERNAL_ERROR | false | none | Repository evidence request failed. |

- `createPublicErrorResult` 是 application 与 MCP 共用的 typed factory；Engine 不再返回 RepositoryAccessError/raw exception message。
- factory/policy 按 code 白名单归一化 action：只有 `INVALID_INPUT + ADD_TERM` 可公开，后三类 code 即使 service 注入非法 action 也会被删除。
- `ADD_TERM` 仅用于 terms 缺失或空数组；错误类型、非法成员、空字符串成员和其他 schema 错误不再误报该 action。
- `serializeLocateToolOutput` 重新应用 safe error policy，再以同一 parsed object生成 structuredContent、JSON text 与 `isError=true`。
- 测试输入含绝对路径、stack、raw stderr marker 及所有 code/action 负向组合；四表面只保留 exact code/recoverable/action/safe message。
- 验证：CMD-ERRORS → 4 error cases + 1 selected schema-surface guard passed。
```

#### `src/contracts/public-errors.ts`

```
import type {
  LocateResult,
  NextActionCode,
  RepoNavToolError,
} from './evidence.js';

export const SAFE_PUBLIC_ERROR_MESSAGES: Readonly<
  Record<RepoNavToolError['code'], string>
> = Object.freeze({
  INVALID_INPUT: 'Locate request does not match the required schema.',
  INVALID_REPOSITORY: 'Repository root is invalid or unavailable.',
  PATH_OUTSIDE_ROOT: 'Repository path is outside the configured root.',
  INTERNAL_ERROR: 'Repository evidence request failed.',
});

const ERROR_RECOVERABILITY: Readonly<
  Record<RepoNavToolError['code'], boolean>
> = Object.freeze({
  INVALID_INPUT: true,
  INVALID_REPOSITORY: true,
  PATH_OUTSIDE_ROOT: false,
  INTERNAL_ERROR: false,
});

export function createPublicToolError(
  code: RepoNavToolError['code'],
  suggestedAction?: NextActionCode,
): RepoNavToolError {
  const approvedAction =
    code === 'INVALID_INPUT' && suggestedAction === 'ADD_TERM'
      ? suggestedAction
      : undefined;
  return Object.freeze({
    code,
    message: SAFE_PUBLIC_ERROR_MESSAGES[code],
    recoverable: ERROR_RECOVERABILITY[code],
    ...(approvedAction === undefined ? {} : { suggestedAction: approvedAction }),
  });
}

export function createPublicErrorResult(
  code: RepoNavToolError['code'],
  suggestedAction?: NextActionCode,
): LocateResult {
  return Object.freeze({
    ok: false,
    error: createPublicToolError(code, suggestedAction),
  });
}

export function applyPublicErrorPolicy(result: LocateResult): LocateResult {
  if (result.ok) {
    return result;
  }
  return createPublicErrorResult(result.error.code, result.error.suggestedAction);
}
```

#### `src/evidence/abort-source.ts`

```
export const LOCATE_ABORT_SOURCES = Object.freeze([
  'none',
  'caller',
  'deadline',
] as const);

export type LocateAbortSource = (typeof LOCATE_ABORT_SOURCES)[number];

type TriggeredLocateAbortSource = Exclude<LocateAbortSource, 'none'>;

/**
 * Owns the composed request signal and permanently records the first abort
 * source. A later caller/deadline race must not rewrite final status actions.
 */
export class LocateAbortCoordinator {
  private readonly controller = new AbortController();
  private currentSource: LocateAbortSource = 'none';

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get source(): LocateAbortSource {
    return this.currentSource;
  }

  public abort(source: TriggeredLocateAbortSource, reason?: unknown): boolean {
    if (this.currentSource !== 'none') {
      return false;
    }
    this.currentSource = source;
    this.controller.abort(reason);
    return true;
  }
}
```

#### `src/evidence/evidence-redactor.ts`

```
import {
  REDACTION_REASON_CODES,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type EvidenceLocation,
  type LocateResult,
  type RedactionReasonCode,
} from '../contracts/index.js';

export const PUBLIC_DISPLAY_TOKEN_MAX_BYTES = 2 * 1024;
export const OVERSIZED_CONTENT_PLACEHOLDER =
  '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]';
const TOKEN_PLACEHOLDER = '[REDACTED]';

const SECRET_KEY =
  String.raw`\b(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b`;
const TEMPLATE_QUOTE = '`';
const SECRET_ASSIGNMENT = new RegExp(
  String.raw`(${SECRET_KEY}\s*[:=]\s*)(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)${TEMPLATE_QUOTE}|([^\s,"'${TEMPLATE_QUOTE};}\]]+))`,
  'giu',
);
const MALFORMED_DOUBLE_QUOTED_SECRET = [REDACTED] RegExp(
  String.raw`${SECRET_KEY}\s*[:=]\s*"((?:\\.|[^"\\])*)$`,
  'iu',
);
const MALFORMED_SINGLE_QUOTED_SECRET = [REDACTED] RegExp(
  String.raw`${SECRET_KEY}\s*[:=]\s*'((?:\\.|[^'\\])*)$`,
  'iu',
);
const MALFORMED_TEMPLATE_QUOTED_SECRET = [REDACTED] RegExp(
  String.raw`${SECRET_KEY}\s*[:=]\s*${TEMPLATE_QUOTE}((?:\\.|[^${TEMPLATE_QUOTE}\\])*)$`,
  'iu',
);
const FIXED_CREDENTIAL =
  [REDACTED]
const CONNECTION_USERINFO =
  /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu;
const CONNECTION_SECRET_QUERY =
  /([?&](?:password|passwd|secret|token|api[_-]?key)=)([^&#\s]+)/giu;
const CONNECTION_DETECTOR =
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@|[?&](?:password|passwd|secret|token|api[_-]?key)=/iu;
const EMAIL_ADDRESS =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_LIKE_TOKEN = [REDACTED] ()-]{7,}\d)/gu;
const NON_WHITESPACE_TOKEN = [REDACTED]

function orderedReasons(
  values: readonly RedactionReasonCode[],
): readonly RedactionReasonCode[] {
  const present = new Set(values);
  return Object.freeze(
    REDACTION_REASON_CODES.filter((reason) => present.has(reason)),
  );
}

function containsOversizedToken(value: string): boolean {
  for (const match of value.matchAll(NON_WHITESPACE_TOKEN)) {
    const token = [REDACTED]
    if (Buffer.byteLength(token, 'utf8') > PUBLIC_DISPLAY_TOKEN_MAX_BYTES) {
      return true;
    }
  }
  return false;
}

export interface PublicTextRedaction {
  readonly value: string;
  readonly reasonCodes: readonly RedactionReasonCode[];
}

interface SensitiveToken {
  readonly value: string;
  readonly reasonCode: RedactionReasonCode;
}

function matches(pattern: RegExp, value: string): readonly RegExpMatchArray[] {
  return Array.from(value.matchAll(new RegExp(pattern.source, pattern.flags)));
}

function hasMatch(pattern: RegExp, value: string): boolean {
  return new RegExp(pattern.source, pattern.flags).test(value);
}

function secretAssignmentValue(match: RegExpMatchArray): string | undefined {
  return match[2] ?? match[3] ?? match[4] ?? match[5];
}

function malformedQuotedSecretTail(value: string): string | undefined {
  for (const pattern of [
    MALFORMED_DOUBLE_QUOTED_SECRET,
    MALFORMED_SINGLE_QUOTED_SECRET,
    MALFORMED_TEMPLATE_QUOTED_SECRET,
  ]) {
    const match = new RegExp(pattern.source, pattern.flags).exec(value);
    if (match !== null) {
      return match[1] ?? '';
    }
  }
  return undefined;
}

function hasUnsafeTemplateSecret(value: string): boolean {
  return matches(SECRET_ASSIGNMENT, value).some(
    (match) => match[4]?.includes('${') === true,
  );
}

function collectSensitiveTokens(values: readonly string[]): readonly SensitiveToken[] {
  const tokens = new Map<string, RedactionReasonCode>();
  const add = (value: string | undefined, reasonCode: RedactionReasonCode): void => {
    if (value !== undefined && value.length > 0 && value !== TOKEN_PLACEHOLDER) {
      tokens.set(value, reasonCode);
    }
  };
  for (const value of values) {
    for (const match of matches(SECRET_ASSIGNMENT, value)) {
      add(secretAssignmentValue(match), 'SECRET_LIKE_VALUE');
    }
    add(malformedQuotedSecretTail(value), 'SECRET_LIKE_VALUE');
    for (const match of matches(FIXED_CREDENTIAL, value)) {
      add(match[0], 'SECRET_LIKE_VALUE');
    }
    for (const match of matches(CONNECTION_USERINFO, value)) {
      add(match[3], 'CONNECTION_STRING');
    }
    for (const match of matches(CONNECTION_SECRET_QUERY, value)) {
      add(match[2], 'CONNECTION_STRING');
    }
    for (const match of matches(EMAIL_ADDRESS, value)) {
      add(match[0], 'PERSONAL_DATA');
    }
    for (const match of matches(PHONE_LIKE_TOKEN, value)) {
      add(match[0], 'PERSONAL_DATA');
    }
  }
  return Object.freeze(
    Array.from(tokens, ([value, reasonCode]) => ({ value, reasonCode })).sort(
      (left, right) => right.value.length - left.value.length,
    ),
  );
}

export function redactPublicText(value: string): PublicTextRedaction {
  if (containsOversizedToken(value)) {
    return Object.freeze({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: Object.freeze(['BINARY_OR_OVERSIZED_CONTENT'] as const),
    });
  }

  const reasons: RedactionReasonCode[] = [];
  if (
    malformedQuotedSecretTail(value) !== undefined ||
    hasUnsafeTemplateSecret(value)
  ) {
    return Object.freeze({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: Object.freeze([
        'SECRET_LIKE_VALUE',
        'BINARY_OR_OVERSIZED_CONTENT',
      ] as const),
    });
  }
  let redacted = value;
  if (hasMatch(SECRET_ASSIGNMENT, value) || hasMatch(FIXED_CREDENTIAL, value)) {
    reasons.push('SECRET_LIKE_VALUE');
    redacted = redacted
      .replace(
        SECRET_ASSIGNMENT,
        (
          _match,
          prefix: string,
          doubleQuoted: string | undefined,
          singleQuoted: string | undefined,
          templateQuoted: string | undefined,
        ) =>
          doubleQuoted !== undefined
            ? `${prefix}"${TOKEN_PLACEHOLDER}"`
            : singleQuoted !== undefined
              ? `${prefix}'${TOKEN_PLACEHOLDER}'`
              : templateQuoted !== undefined
                ? `${prefix}\`${TOKEN_PLACEHOLDER}\``
              : `${prefix}${TOKEN_PLACEHOLDER}`,
      )
      .replace(FIXED_CREDENTIAL, TOKEN_PLACEHOLDER);
  }
  if (hasMatch(CONNECTION_DETECTOR, value)) {
    reasons.push('CONNECTION_STRING');
    redacted = redacted
      .replace(
        CONNECTION_USERINFO,
        (_match, scheme: string) => `${scheme}${TOKEN_PLACEHOLDER}@`,
      )
      .replace(
        CONNECTION_SECRET_QUERY,
        (_match, prefix: string) => `${prefix}${TOKEN_PLACEHOLDER}`,
      );
  }
  if (hasMatch(EMAIL_ADDRESS, value) || hasMatch(PHONE_LIKE_TOKEN, value)) {
    reasons.push('PERSONAL_DATA');
    redacted = redacted
      .replace(EMAIL_ADDRESS, TOKEN_PLACEHOLDER)
      .replace(PHONE_LIKE_TOKEN, TOKEN_PLACEHOLDER);
  }

  return Object.freeze({
    value: redacted,
    reasonCodes: orderedReasons(reasons),
  });
}

export function redactEvidenceLocation(
  location: EvidenceLocation,
  inheritedTokens: readonly SensitiveToken[] = [],
): EvidenceLocation {
  const redaction = redactPublicText(location.excerpt);
  const inheritedReasons: RedactionReasonCode[] = [];
  let excerpt = redaction.value;
  for (const token of inheritedTokens) {
    if (location.excerpt.includes(token.value)) {
      inheritedReasons.push(token.reasonCode);
      excerpt = excerpt.replaceAll(token.value, TOKEN_PLACEHOLDER);
    }
  }
  const reasonCodes = orderedReasons([
    ...redaction.reasonCodes,
    ...inheritedReasons,
  ]);
  if (reasonCodes.length === 0) {
    return location;
  }
  return Object.freeze({
    file: location.file,
    ...(location.symbol === undefined ? {} : { symbol: location.symbol }),
    lines: location.lines,
    excerpt,
    redaction: Object.freeze({
      applied: true as const,
      reasonCodes: reasonCodes as readonly [
        RedactionReasonCode,
        ...RedactionReasonCode[],
      ],
    }),
  });
}

export function redactConfirmedEvidence(
  evidence: ConfirmedEvidence,
  inheritedTokens: readonly SensitiveToken[] = [],
): ConfirmedEvidence {
  return Object.freeze({
    ...evidence,
    location: redactEvidenceLocation(evidence.location, inheritedTokens),
  });
}

export function redactCandidateEvidence(
  evidence: CandidateEvidence,
  inheritedTokens: readonly SensitiveToken[] = [],
): CandidateEvidence {
  return Object.freeze({
    ...evidence,
    location: redactEvidenceLocation(evidence.location, inheritedTokens),
  });
}

export function redactLocateResult(result: LocateResult): LocateResult {
  if (!result.ok) {
    return result;
  }
  const inheritedTokens = collectSensitiveTokens([
    ...result.evidence.confirmed.map((item) => item.location.excerpt),
    ...result.evidence.candidates.map((item) => item.location.excerpt),
  ]);
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      ...result.evidence,
      confirmed: Object.freeze(
        result.evidence.confirmed.map((item) =>
          redactConfirmedEvidence(item, inheritedTokens),
        ),
      ),
      candidates: Object.freeze(
        result.evidence.candidates.map((item) =>
          redactCandidateEvidence(item, inheritedTokens),
        ),
      ),
    }),
  });
}
```

#### `src/evidence/locate-status-evaluator.ts`

```
import type {
  BackendHealth,
  LimitReasonCode,
  LocateStatus,
} from '../contracts/index.js';
import type { LocateAbortSource } from './abort-source.js';

export const LOCATE_TRANSITION_ROW_IDS = Object.freeze([
  'invalid-input',
  'invalid-repository',
  'path-outside-root',
  'internal-error',
  'caller-abort',
  'internal-deadline',
  'backend-unavailable',
  'coverage-gap',
  'verified-evidence',
  'verified-no-result',
] as const);

export type LocateTransitionRowId =
  (typeof LOCATE_TRANSITION_ROW_IDS)[number];

export interface LocateStatusEvaluationInput {
  readonly abortSource: LocateAbortSource;
  readonly finalBackendHealth: BackendHealth;
  readonly strategyComplete: boolean;
  readonly evidenceCount: number;
  readonly limitsReached: readonly LimitReasonCode[];
}

export interface LocateStatusEvaluation {
  readonly status: LocateStatus;
  readonly rowId: LocateTransitionRowId;
}

export function evaluateLocateStatus(
  input: LocateStatusEvaluationInput,
): LocateStatusEvaluation {
  if (input.abortSource === 'caller') {
    return Object.freeze({ status: 'timeout', rowId: 'caller-abort' });
  }
  if (input.abortSource === 'deadline') {
    return Object.freeze({ status: 'timeout', rowId: 'internal-deadline' });
  }
  if (
    input.evidenceCount === 0 &&
    input.strategyComplete === false &&
    input.finalBackendHealth.state !== 'available'
  ) {
    return Object.freeze({
      status: 'backend_unavailable',
      rowId: 'backend-unavailable',
    });
  }
  if (
    input.strategyComplete === false ||
    input.limitsReached.length > 0 ||
    input.finalBackendHealth.state !== 'available'
  ) {
    return Object.freeze({ status: 'partial', rowId: 'coverage-gap' });
  }
  return input.evidenceCount > 0
    ? Object.freeze({ status: 'ok', rowId: 'verified-evidence' })
    : Object.freeze({ status: 'no_result', rowId: 'verified-no-result' });
}
```

#### `src/evidence/next-action-policy.ts`

```
import {
  LOCATE_LIMIT_MAXIMUMS,
  NEXT_ACTION_CODES,
  type LimitReasonCode,
  type LocateStatus,
  type NextActionCode,
  type ResolvedLocateLimits,
} from '../contracts/index.js';
import type { LocateAbortSource } from './abort-source.js';

export interface NextActionPolicyInput {
  readonly status: LocateStatus;
  readonly hasCandidates: boolean;
  readonly limitsReached: readonly LimitReasonCode[];
  readonly abortSource: LocateAbortSource;
  readonly limits: ResolvedLocateLimits;
  readonly initializeCodeGraph?: boolean;
}

function schemaOrder(values: readonly NextActionCode[]): readonly NextActionCode[] {
  const present = new Set(values);
  return Object.freeze(NEXT_ACTION_CODES.filter((code) => present.has(code)));
}

function hasAdjustableRetry(input: NextActionPolicyInput): boolean {
  return (
    (input.limitsReached.includes('MAX_FILES_REACHED') &&
      input.limits.maxFiles < LOCATE_LIMIT_MAXIMUMS.maxFiles) ||
    (input.limitsReached.includes('MAX_CONFIRMED_REACHED') &&
      input.limits.maxConfirmed < LOCATE_LIMIT_MAXIMUMS.maxConfirmed) ||
    (input.limitsReached.includes('MAX_CANDIDATES_REACHED') &&
      input.limits.maxCandidates < LOCATE_LIMIT_MAXIMUMS.maxCandidates)
  );
}

export function createNextActions(
  input: NextActionPolicyInput,
): readonly NextActionCode[] {
  const actions: NextActionCode[] = [];
  if (input.status === 'no_result') {
    actions.push('ADD_TERM', 'ADD_SYMBOL_ANCHOR');
  }
  if (input.hasCandidates) {
    actions.push('CONFIRM_CANDIDATE');
  }
  if (
    input.initializeCodeGraph === true &&
    (input.status === 'no_result' || input.status === 'backend_unavailable')
  ) {
    actions.push('INITIALIZE_CODEGRAPH');
  }
  if (
    (input.status === 'partial' && hasAdjustableRetry(input)) ||
    (input.status === 'timeout' &&
      input.abortSource === 'deadline' &&
      input.limits.timeoutMs < LOCATE_LIMIT_MAXIMUMS.timeoutMs)
  ) {
    actions.push('RETRY_WITH_HIGHER_LIMIT');
  }
  return schemaOrder(actions);
}
```

#### `src/evidence/result-budget-selector.ts`

```
import {
  comparePublicEvidence,
  type CandidateEvidence,
  type ConfirmedEvidence,
} from '../contracts/index.js';

export interface BoundedEvidenceSelection<T> {
  readonly selected: readonly T[];
  readonly truncated: boolean;
}

function selectBounded<T extends ConfirmedEvidence | CandidateEvidence>(
  values: readonly T[],
  maximum: number,
): BoundedEvidenceSelection<T> {
  const ordered = [...values].sort(comparePublicEvidence);
  return Object.freeze({
    selected: Object.freeze(ordered.slice(0, maximum)),
    truncated: ordered.length > maximum,
  });
}

export function selectConfirmedBudget(
  values: readonly ConfirmedEvidence[],
  maximum: number,
): BoundedEvidenceSelection<ConfirmedEvidence> {
  return selectBounded(values, maximum);
}

export function selectCandidateBudget(
  values: readonly CandidateEvidence[],
  maximum: number,
): BoundedEvidenceSelection<CandidateEvidence> {
  return selectBounded(values, maximum);
}
```

#### `src/mcp/diagnostic-scrubber.ts`

```
import { redactPublicText } from '../evidence/evidence-redactor.js';

const STACK_LINE = /^\s*at\s+.*$/gimu;
const WINDOWS_ABSOLUTE_PATH = /\b[A-Z]:[\\/][^\s"']+/giu;
const POSIX_ABSOLUTE_PATH = /(^|\s)\/(?:[^\s/]+\/)+[^\s"']*/gu;

export function scrubDiagnostic(value: unknown): string {
  const source = value instanceof Error ? value.message : String(value);
  const withoutUnsafeLocation = source
    .replace(STACK_LINE, '')
    .replace(WINDOWS_ABSOLUTE_PATH, '[REDACTED_PATH]')
    .replace(
      POSIX_ABSOLUTE_PATH,
      (_match, prefix: string) => `${prefix}[REDACTED_PATH]`,
    )
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
  const redacted = redactPublicText(withoutUnsafeLocation).value;
  return redacted.length === 0 ? 'RepoNav diagnostic unavailable.' : redacted;
}

export function writeScrubbedDiagnostic(value: unknown): void {
  process.stderr.write(`${scrubDiagnostic(value)}\n`);
}
```

#### `test/golden/output-guardrails.spec.ts`

```
import { describe, expect, it } from 'vitest';

import {
  RepositoryAccessError,
  type BackendHealth,
  type BackendHit,
  type BackendSearchRequest,
  type BackendSearchResult,
  type EvidenceLocation,
  type LocateRequest,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositoryReadLimits,
  type RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';
import { OVERSIZED_CONTENT_PLACEHOLDER } from '../../src/evidence/evidence-redactor.js';
import { isSelected } from '../../testkit/testing/selection.js';

class GuardrailBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly hits: readonly BackendHit[]) {}

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return {
      health: { state: 'available' },
      hits: this.hits,
      complete: true,
    };
  }
}

class GuardrailReader implements RepositoryReader {
  public constructor(
    private readonly excerpts: Readonly<Record<string, string>>,
    private readonly failure?:
      | 'MAX_FILE_BYTES_REACHED'
      | 'MAX_EXCERPT_BYTES_REACHED'
      | 'BINARY_FILE',
  ) {}

  public async resolveRoot(): Promise<string> {
    return 'C:/guardrail-repository';
  }

  public async readRange(
    _repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
  ): Promise<EvidenceLocation> {
    if (this.failure !== undefined) {
      throw new RepositoryAccessError(this.failure, relativeFile);
    }
    const excerpt = this.excerpts[relativeFile];
    if (excerpt === undefined) {
      throw new RepositoryAccessError('FILE_UNREADABLE', relativeFile);
    }
    return { file: relativeFile, lines, excerpt };
  }

  public async readWindow(
    repositoryRoot: string,
    relativeFile: string,
    focusLines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    return await this.readRange(repositoryRoot, relativeFile, focusLines);
  }

  public async findMatches(
    _repositoryRoot: string,
    _relativeFile: string,
    _terms: readonly NormalizedSearchTerm[],
    _symbol: string | undefined,
    _maxMatches: number,
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]> {
    return [];
  }
}

function hit(file: string, matchedText: string): BackendHit {
  return {
    file,
    lines: [1, 1],
    matchedText,
    source: 'ripgrep',
    reasonCodes: ['LITERAL_TERM_HIT'],
  };
}

function request(
  terms: readonly string[],
  limits: LocateRequest['limits'],
): LocateRequest {
  return {
    repoPath: 'C:/guardrail-repository',
    question: 'Verify output guardrails.',
    terms,
    termCase: 'sensitive',
    layers: ['server'],
    ...(limits === undefined ? {} : { limits }),
  };
}

async function locate(
  hits: readonly BackendHit[],
  excerpts: Readonly<Record<string, string>>,
  locateRequest: LocateRequest,
  failure?: 'MAX_FILE_BYTES_REACHED' | 'MAX_EXCERPT_BYTES_REACHED',
) {
  return await new RepositoryEvidenceEngine(
    [new GuardrailBackend(hits)],
    new GuardrailReader(excerpts, failure),
  ).locate(locateRequest, { signal: new AbortController().signal });
}

async function locateUnreadable(
  hits: readonly BackendHit[],
  excerpts: Readonly<Record<string, string>>,
  locateRequest: LocateRequest,
  failure: 'BINARY_FILE',
) {
  return await new RepositoryEvidenceEngine(
    [new GuardrailBackend(hits)],
    new GuardrailReader(excerpts, failure),
  ).locate(locateRequest, { signal: new AbortController().signal });
}

describe.runIf(
  isSelected({ group: 'result-limits', caseId: 'partial-empty-limit' }),
)('empty result limit guardrails', () => {
  it('reports candidate truncation only when an eligible candidate exists', async () => {
    const excerpt = 'consume(api_key);';
    const result = await locate(
      [hit('server/candidate.ts', excerpt)],
      { 'server/candidate.ts': excerpt },
      request(['api_key'], { maxCandidates: 0 }),
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'partial',
        confirmed: [],
        candidates: [],
        coverage: { limitsReached: ['MAX_CANDIDATES_REACHED'] },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });
  });

  it('maps maxFiles and fixed reader caps without retrying fixed safety limits', async () => {
    const first = 'firstTarget = sourceField;';
    const second = 'secondTarget = sourceField;';
    const filesResult = await locate(
      [
        hit('server/zeta.ts', second),
        hit('server/alpha.ts', first),
      ],
      { 'server/alpha.ts': first, 'server/zeta.ts': second },
      request(['firstTarget', 'sourceField'], { maxFiles: 1 }),
    );
    expect(filesResult).toMatchObject({
      ok: true,
      evidence: {
        status: 'partial',
        coverage: { limitsReached: ['MAX_FILES_REACHED'] },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });

    for (const code of [
      'MAX_FILE_BYTES_REACHED',
      'MAX_EXCERPT_BYTES_REACHED',
    ] as const) {
      const fixedResult = await locate(
        [hit('server/fixed.ts', first)],
        { 'server/fixed.ts': first },
        request(['sourceField'], undefined),
        code,
      );
      expect(fixedResult).toMatchObject({
        ok: true,
        evidence: {
          status: 'partial',
          coverage: {
            limitsReached: [code],
            exclusionSummary: { UNVERIFIED_FILE_CONTENT: 1 },
          },
          nextActions: [],
        },
      });
    }
  });
});

describe.runIf(
  isSelected({ group: 'result-limits', caseId: 'partial-with-evidence' }),
)('bounded evidence selection', () => {
  it('retains stable evidence before reporting maxConfirmed truncation', async () => {
    const alpha = 'alphaTarget = sourceField;';
    const zeta = 'zetaTarget = sourceField;';
    const hits = [
      hit('server/zeta.ts', zeta),
      hit('server/alpha.ts', alpha),
    ];
    const excerpts = { 'server/alpha.ts': alpha, 'server/zeta.ts': zeta };
    const locateRequest = request(
      ['alphaTarget', 'zetaTarget', 'sourceField'],
      {
      maxFiles: 2,
      maxConfirmed: 1,
      },
    );
    const forward = await locate(hits, excerpts, locateRequest);
    const reverse = await locate([...hits].reverse(), excerpts, locateRequest);
    expect(forward).toEqual(reverse);
    expect(forward).toMatchObject({
      ok: true,
      evidence: {
        status: 'partial',
        confirmed: [{ location: { file: 'server/alpha.ts' } }],
        coverage: { limitsReached: ['MAX_CONFIRMED_REACHED'] },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });
  });
});

for (const caseId of ['secret-redaction', 'redaction-metadata'] as const) {
  describe.runIf(isSelected({ group: 'output-redaction', caseId }))(caseId, () => {
    it('redacts after ID creation and exposes deterministic metadata', async () => {
      const excerpt = 'api_key = "[REDACTED]"; password="[REDACTED]"; secret=[REDACTED]'abc,def\'; token=`my backtick secret`; passwd=`backtick,comma`; client_secret="[REDACTED]"escaped\\" secret";';
      const result = await locate(
        [hit('server/secret.ts', excerpt)],
        { 'server/secret.ts': excerpt },
        request(['api_key'], undefined),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error('Expected a recoverable redacted result.');
      }
      const publicEvidence = [
        ...result.evidence.confirmed,
        ...result.evidence.candidates,
      ][0];
      expect(publicEvidence?.location.redaction).toEqual({
        applied: true,
        reasonCodes: ['SECRET_LIKE_VALUE'],
      });
      expect(publicEvidence?.location.excerpt).toBe(
        'api_key = "[REDACTED]"; password="[REDACTED]"; secret=[REDACTED]'[REDACTED]\'; token=`[REDACTED]`; passwd=`[REDACTED]`; client_secret="[REDACTED]";',
      );
      expect(publicEvidence?.id).toMatch(/^evidence:v1:[a-f0-9]{64}$/u);
      for (const forbidden of [
        'rawSecretValue',
        'my secret value',
        'abc,def',
        'my backtick secret',
        'backtick,comma',
        'escaped',
      ]) {
        expect(JSON.stringify(result)).not.toContain(forbidden);
      }
    });
  });
}

describe.runIf(
  isSelected({ group: 'output-redaction', caseId: 'redaction-metadata' }),
)('malformed secret propagation in the real evidence engine', () => {
  it('removes a malformed tail reused by another verified evidence item', async () => {
    const rawSecret = '[REDACTED]';
    const seed = `aliasProbe; api_key="${rawSecret}`;
    const derived = `aliasProbe; const alias = "${rawSecret}";`;
    const result = await locate(
      [
        hit('server/malformed.ts', seed),
        hit('server/derived.ts', derived),
      ],
      {
        'server/malformed.ts': seed,
        'server/derived.ts': derived,
      },
      request(['aliasProbe'], undefined),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a redacted service result.');
    }
    expect(
      result.evidence.confirmed.length + result.evidence.candidates.length,
    ).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(result)).not.toContain(rawSecret);
    expect(
      [...result.evidence.confirmed, ...result.evidence.candidates].some(
        (item) =>
          item.location.excerpt === OVERSIZED_CONTENT_PLACEHOLDER,
      ),
    ).toBe(true);
  });
});

describe.runIf(
  isSelected({ group: 'output-redaction', caseId: 'redaction-metadata' }),
)('display cap versus reader failure', () => {
  it('uses an oversized placeholder only after a complete text read', async () => {
    const rawToken = '[REDACTED]'.repeat(2_049);
    const excerpt = `api_key = "[REDACTED]";`;
    expect(Buffer.byteLength(excerpt, 'utf8')).toBeLessThan(4 * 1024);
    const result = await locate(
      [hit('server/oversized.ts', excerpt)],
      { 'server/oversized.ts': excerpt },
      request(['api_key'], undefined),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected an oversized redacted result.');
    }
    const publicEvidence = [
      ...result.evidence.confirmed,
      ...result.evidence.candidates,
    ][0];
    expect(publicEvidence?.location).toMatchObject({
      excerpt: '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]',
      redaction: {
        applied: true,
        reasonCodes: [
          'SECRET_LIKE_VALUE',
          'BINARY_OR_OVERSIZED_CONTENT',
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain(rawToken);
  });

  it('keeps true binary reader failure out of public evidence', async () => {
    const excerpt = 'api_key = [REDACTED]';
    const result = await locateUnreadable(
      [hit('server/binary.ts', excerpt)],
      { 'server/binary.ts': excerpt },
      request(['api_key'], undefined),
      'BINARY_FILE',
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'no_result',
        confirmed: [],
        candidates: [],
        coverage: {
          limitsReached: [],
          exclusionSummary: { UNVERIFIED_FILE_CONTENT: 1 },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('rawBinarySecret');
  });
});
```

#### `test/mcp/redaction-output-parity.spec.ts`

```
import { describe, expect, it } from 'vitest';

import {
  connectMcpStdioFixture,
  parseLocateToolResultParity,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const FORBIDDEN = [
  'rawSecretValue',
  'my secret value',
  'abc,def',
  'my backtick secret',
  'backtick,comma',
  'malformed shared value',
  'escaped',
  'dbPassword',
  'querySecret',
  'stan.guo@mail.ru',
  '138-0013-8000',
  'rawDiagnosticSecret',
  'C:\\private\\repo\\secret.ts',
] as const;

describe.runIf(
  isSelected({
    group: 'mcp-surface',
    caseId: 'redaction-output-parity',
  }),
)('MCP redaction output parity', () => {
  it('keeps forbidden values out of structured, text, stdout protocol, and stderr', async () => {
    const session = await connectMcpStdioFixture();
    try {
      const callResult = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'redaction-output-parity',
          terms: ['api_key'],
        },
      });
      const parity = parseLocateToolResultParity(callResult);
      expect(parity.isError).toBe(false);
      expect(parity.output.ok).toBe(true);
      if (!parity.output.ok) {
        throw new Error('Expected a redacted success output.');
      }
      const evidence = parity.output.evidence.confirmed[0];
      expect(evidence?.location.redaction).toEqual({
        applied: true,
        reasonCodes: [
          'SECRET_LIKE_VALUE',
          'CONNECTION_STRING',
          'PERSONAL_DATA',
        ],
      });
      expect(
        parity.output.evidence.confirmed[1]?.location.excerpt,
      ).toBe('[REDACTED:BINARY_OR_OVERSIZED_CONTENT]');
      expect(
        parity.output.evidence.candidates[0]?.location.excerpt,
      ).toBe('const alias = "[REDACTED]";');
      const allPublicOutput = JSON.stringify(callResult);
      const stderr = session.readStderr();
      for (const value of FORBIDDEN) {
        expect(allPublicOutput).not.toContain(value);
        expect(stderr).not.toContain(value);
      }
      expect(stderr).toContain('[REDACTED]');
      expect(stderr).toContain('[REDACTED_PATH]');
    } finally {
      await session.close();
    }
  });
});
```

#### `test/unit/locate-status-evaluator.spec.ts`

```
import { describe, expect, it } from 'vitest';

import {
  RepositoryAccessError,
  resolveLocateLimits,
  TOOL_ERROR_CODES,
  type BackendHealth,
  type BackendSearchRequest,
  type BackendSearchResult,
  type EvidenceLocation,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositoryReadLimits,
  type RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { LocateAbortCoordinator } from '../../src/evidence/abort-source.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import {
  evaluateLocateStatus,
  LOCATE_TRANSITION_ROW_IDS,
  type LocateStatusEvaluationInput,
  type LocateTransitionRowId,
} from '../../src/evidence/locate-status-evaluator.js';
import { createNextActions } from '../../src/evidence/next-action-policy.js';
import { isSelected } from '../../testkit/testing/selection.js';

const available = { state: 'available' as const };
const unavailable = {
  state: 'unavailable' as const,
  reasonCode: 'RIPGREP_UNAVAILABLE' as const,
};

function input(
  overrides: Partial<LocateStatusEvaluationInput> = {},
): LocateStatusEvaluationInput {
  return {
    abortSource: 'none',
    finalBackendHealth: available,
    strategyComplete: true,
    evidenceCount: 0,
    limitsReached: [],
    ...overrides,
  };
}

const TRANSITION_FIXTURE_ROWS: readonly LocateTransitionRowId[] = [
  'invalid-input',
  'invalid-repository',
  'path-outside-root',
  'internal-error',
  'caller-abort',
  'internal-deadline',
  'backend-unavailable',
  'coverage-gap',
  'verified-evidence',
  'verified-no-result',
];

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'transition-matrix-completeness',
  }),
)('Locate transition matrix completeness', () => {
  it('keeps one fixture row for every approved transition predicate', () => {
    expect(TRANSITION_FIXTURE_ROWS).toEqual(LOCATE_TRANSITION_ROW_IDS);
    expect(new Set(TRANSITION_FIXTURE_ROWS).size).toBe(
      LOCATE_TRANSITION_ROW_IDS.length,
    );
    expect(TRANSITION_FIXTURE_ROWS.slice(0, 4)).toEqual(
      TOOL_ERROR_CODES.map((code) => code.toLocaleLowerCase().replaceAll('_', '-')),
    );
  });

  it('applies timeout, unavailable, coverage-gap, and result priority', () => {
    expect(
      evaluateLocateStatus(
        input({
          abortSource: 'caller',
          finalBackendHealth: unavailable,
          strategyComplete: false,
          evidenceCount: 1,
          limitsReached: ['MAX_FILES_REACHED'],
        }),
      ),
    ).toEqual({ status: 'timeout', rowId: 'caller-abort' });
    expect(
      evaluateLocateStatus(
        input({ finalBackendHealth: unavailable, strategyComplete: false }),
      ),
    ).toEqual({
      status: 'backend_unavailable',
      rowId: 'backend-unavailable',
    });
    expect(
      evaluateLocateStatus(
        input({ strategyComplete: false, evidenceCount: 1 }),
      ),
    ).toEqual({ status: 'partial', rowId: 'coverage-gap' });
    expect(evaluateLocateStatus(input({ evidenceCount: 1 }))).toEqual({
      status: 'ok',
      rowId: 'verified-evidence',
    });
    expect(evaluateLocateStatus(input())).toEqual({
      status: 'no_result',
      rowId: 'verified-no-result',
    });
  });

  it('locks the first abort source and keeps backend fixed timeouts separate', () => {
    const deadlineFirst = new LocateAbortCoordinator();
    expect(deadlineFirst.abort('deadline')).toBe(true);
    expect(deadlineFirst.abort('caller')).toBe(false);
    expect(deadlineFirst.source).toBe('deadline');
    const callerFirst = new LocateAbortCoordinator();
    expect(callerFirst.abort('caller')).toBe(true);
    expect(callerFirst.abort('deadline')).toBe(false);
    expect(callerFirst.source).toBe('caller');

    for (const [abortSource, expectedActions] of [
      [deadlineFirst.source, ['RETRY_WITH_HIGHER_LIMIT']],
      [callerFirst.source, []],
    ] as const) {
      const status = evaluateLocateStatus(input({ abortSource })).status;
      expect(status).toBe('timeout');
      expect(
        createNextActions({
          status,
          hasCandidates: false,
          limitsReached: ['TIMEOUT_REACHED'],
          abortSource,
          limits: resolveLocateLimits({ timeoutMs: 1_000 }),
        }),
      ).toEqual(expectedActions);
    }

    expect(
      evaluateLocateStatus(
        input({
          finalBackendHealth: {
            state: 'unavailable',
            reasonCode: 'BACKEND_ABORTED',
          },
          strategyComplete: false,
        }),
      ),
    ).toEqual({ status: 'backend_unavailable', rowId: 'backend-unavailable' });
  });
});

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'hit-unverified-fallback-complete',
  }),
)('hit-unverified with complete fallback', () => {
  it('returns no_result only after the required fallback completes', () => {
    expect(evaluateLocateStatus(input())).toEqual({
      status: 'no_result',
      rowId: 'verified-no-result',
    });
  });
});

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'hit-unverified-fallback-unavailable',
  }),
)('hit-unverified with unavailable fallback', () => {
  it('uses backend_unavailable instead of incomplete no_result', () => {
    expect(
      evaluateLocateStatus(
        input({ finalBackendHealth: unavailable, strategyComplete: false }),
      ),
    ).toMatchObject({ status: 'backend_unavailable' });
  });
});

for (const [caseId, evidenceCount] of [
  ['caller-abort-empty', 0],
  ['caller-abort-with-evidence', 1],
] as const) {
  describe.runIf(isSelected({ group: 'locate-status', caseId }))(caseId, () => {
    it('gives caller abort priority and never suggests retry', () => {
      const evaluation = evaluateLocateStatus(
        input({ abortSource: 'caller', evidenceCount }),
      );
      expect(evaluation).toEqual({ status: 'timeout', rowId: 'caller-abort' });
      expect(
        createNextActions({
          status: evaluation.status,
          hasCandidates: false,
          limitsReached: ['TIMEOUT_REACHED'],
          abortSource: 'caller',
          limits: resolveLocateLimits({ timeoutMs: 1_000 }),
        }),
      ).toEqual([]);
    });
  });
}

for (const [caseId, timeoutMs, expectedActions] of [
  ['internal-deadline-below-max', 1_000, ['RETRY_WITH_HIGHER_LIMIT']],
  ['internal-deadline-at-max', 30_000, []],
] as const) {
  describe.runIf(isSelected({ group: 'locate-status', caseId }))(caseId, () => {
    it('maps an internal deadline and only retries below the schema maximum', () => {
      const evaluation = evaluateLocateStatus(
        input({ abortSource: 'deadline' }),
      );
      expect(evaluation).toEqual({
        status: 'timeout',
        rowId: 'internal-deadline',
      });
      expect(
        createNextActions({
          status: evaluation.status,
          hasCandidates: false,
          limitsReached: ['TIMEOUT_REACHED'],
          abortSource: 'deadline',
          limits: resolveLocateLimits({ timeoutMs }),
        }),
      ).toEqual(expectedActions);
    });
  });
}

describe.runIf(
  isSelected({
    group: 'locate-status',
    caseId: 'internal-deadline-below-max',
  }),
)('engine-owned internal deadline', () => {
  it('distinguishes its own deadline from a caller abort', async () => {
    class DeadlineBackend implements RepositorySearchBackend {
      public readonly id = 'ripgrep' as const;

      public async probe(): Promise<BackendHealth> {
        return { state: 'available' };
      }

      public async search(
        _request: BackendSearchRequest,
        signal: AbortSignal,
      ): Promise<BackendSearchResult> {
        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve();
            return;
          }
          signal.addEventListener('abort', () => resolve(), { once: true });
        });
        return {
          health: { state: 'error', reasonCode: 'BACKEND_ABORTED' },
          hits: [],
          complete: false,
        };
      }
    }

    const result = await new RepositoryEvidenceEngine(
      [new DeadlineBackend()],
      new NodeRepositoryReader(),
    ).locate(
      {
        repoPath: '.',
        question: 'Wait for the engine deadline.',
        terms: ['deadlineProbe'],
        limits: { timeoutMs: 1_000 },
      },
      { signal: new AbortController().signal },
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'timeout',
        coverage: { limitsReached: ['TIMEOUT_REACHED'] },
        nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
      },
    });
  });
});

describe.runIf(
  isSelected({ group: 'locate-status', caseId: 'internal-deadline-below-max' }),
)('backend-owned fixed process timeout', () => {
  it('does not present a fixed backend timeout as a caller-adjustable deadline', async () => {
    class FixedTimeoutBackend implements RepositorySearchBackend {
      public readonly id = 'ripgrep' as const;

      public async probe(): Promise<BackendHealth> {
        return { state: 'available' };
      }

      public async search(): Promise<BackendSearchResult> {
        return {
          health: { state: 'unavailable', reasonCode: 'BACKEND_ABORTED' },
          hits: [],
          complete: false,
        };
      }
    }

    const result = await new RepositoryEvidenceEngine(
      [new FixedTimeoutBackend()],
      new NodeRepositoryReader(),
    ).locate(
      {
        repoPath: '.',
        question: 'Backend process timed out independently.',
        terms: ['fixedTimeoutProbe'],
        limits: { timeoutMs: 20_000 },
      },
      { signal: new AbortController().signal },
    );
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        status: 'backend_unavailable',
        coverage: { limitsReached: [] },
        nextActions: [],
      },
    });
  });
});

class MultiHitCodeGraphBackend implements RepositorySearchBackend {
  public readonly id = 'codegraph' as const;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(): Promise<BackendSearchResult> {
    const matchedText = 'const hcpId = row.hcp_id;';
    return {
      health: { state: 'available' },
      hits: [
        {
          file: 'server/a.ts',
          lines: [1, 1],
          matchedText,
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
        {
          file: 'server/b.ts',
          lines: [1, 1],
          matchedText,
          source: 'codegraph',
          reasonCodes: ['SYMBOL_SEARCH_HIT'],
        },
      ],
      complete: true,
      canSkipFallbackIfVerified: true,
    };
  }
}

class InterruptingReader implements RepositoryReader {
  private readCount = 0;

  public constructor(
    private readonly interruption: 'caller' | 'deadline',
    private readonly callerController: AbortController,
  ) {}

  public async resolveRoot(): Promise<string> {
    return 'D:/fixture/repository';
  }

  public async readRange(
    _repositoryRoot: string,
    relativeFile: string,
    _lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    this.readCount += 1;
    if (this.readCount === 1) {
      return {
        file: relativeFile,
        lines: [1, 1],
        excerpt: 'const hcpId = row.hcp_id;',
      };
    }
    if (this.interruption === 'caller') {
      this.callerController.abort(new Error('caller stopped the request'));
    } else {
      await new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
    }
    throw new RepositoryAccessError('ABORTED', relativeFile);
  }

  public async readWindow(): Promise<EvidenceLocation> {
    throw new Error('readWindow must not run after verification abort.');
  }

  public async findMatches(
    _repositoryRoot: string,
    _relativeFile: string,
    _terms: readonly NormalizedSearchTerm[],
  ): Promise<readonly EvidenceLocation[]> {
    throw new Error('findMatches is not used by line-addressed hits.');
  }
}

for (const [caseId, interruption, timeoutMs] of [
  ['caller-abort-with-evidence', 'caller', 30_000],
  ['internal-deadline-below-max', 'deadline', 1_000],
] as const) {
  describe.runIf(isSelected({ group: 'locate-status', caseId }))(
    `CodeGraph ${interruption} evidence preservation`,
    () => {
      it('retains verification completed before the abort', async () => {
        const callerController = new AbortController();
        const result = await new RepositoryEvidenceEngine(
          [new MultiHitCodeGraphBackend()],
          new InterruptingReader(interruption, callerController),
        ).locate(
          {
            repoPath: 'D:/fixture/repository',
            question: 'Preserve completed verification.',
            terms: ['hcpId', 'row.hcp_id'],
            limits: { timeoutMs },
          },
          { signal: callerController.signal },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) {
          throw new Error('Expected a timeout EvidencePack.');
        }
        expect(result.evidence.status).toBe('timeout');
        expect(
          result.evidence.confirmed.length + result.evidence.candidates.length,
        ).toBeGreaterThan(0);
        expect(result.evidence.coverage.limitsReached).toContain(
          'TIMEOUT_REACHED',
        );
        expect(result.evidence.nextActions).toEqual(
          interruption === 'deadline' ? ['RETRY_WITH_HIGHER_LIMIT'] : [],
        );
      });
    },
  );
}
```

#### `test/unit/output-guardrails.spec.ts`

```
import { describe, expect, it } from 'vitest';

import {
  createEvidenceId,
  createPublicErrorResult,
  NEXT_ACTION_CODES,
  resolveLocateLimits,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type LocateResult,
} from '../../src/contracts/index.js';
import {
  OVERSIZED_CONTENT_PLACEHOLDER,
  redactConfirmedEvidence,
  redactLocateResult,
  redactPublicText,
} from '../../src/evidence/evidence-redactor.js';
import { createNextActions } from '../../src/evidence/next-action-policy.js';
import { scrubDiagnostic } from '../../src/mcp/diagnostic-scrubber.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'output-guardrails',
  caseId: 'redaction-policy',
});

function confirmed(excerpt: string): ConfirmedEvidence {
  const discoveryKey = `discovery:v1\u0000server/config.ts\u00001\u00001\u0000${'a'.repeat(64)}`;
  return {
    evidenceClass: 'confirmed',
    id: createEvidenceId(discoveryKey, 'confirmed', 'value-mapping'),
    role: 'value-mapping',
    location: {
      file: 'server/config.ts',
      lines: [1, 1],
      excerpt,
    },
    provenance: {
      discoveredBy: ['ripgrep'],
      verifiedBy: 'filesystem',
      operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    },
    reasonCodes: ['DIRECT_ALIAS_MAPPING'],
  };
}

describe.runIf(selected)('evidence output redaction', () => {
  it('redacts four deterministic reason families in schema order', () => {
    const secret = '[REDACTED]"super-secret-value"';
    const connection =
      'postgres://admin:db-password@localhost/app?token=[REDACTED]';
    const personal = 'owner=stan.guo@mail.ru phone=+86 138-0013-8000';

    expect(redactPublicText(secret)).toEqual({
      value: 'client_secret="[REDACTED]"',
      reasonCodes: ['SECRET_LIKE_VALUE'],
    });
    const connectionResult = redactPublicText(connection);
    expect(connectionResult.reasonCodes).toContain('CONNECTION_STRING');
    expect(connectionResult.value).not.toContain('db-password');
    expect(connectionResult.value).not.toContain('query-secret');
    expect(redactPublicText(personal)).toEqual({
      value: 'owner=[REDACTED] phone=[REDACTED]',
      reasonCodes: ['PERSONAL_DATA'],
    });
    expect(redactPublicText(`value=${'x'.repeat(2_049)}`)).toEqual({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: ['BINARY_OR_OVERSIZED_CONTENT'],
    });

    for (const [raw, expected] of [
      ['password="[REDACTED]"', 'password="[REDACTED]"'],
      ['password="[REDACTED]"', 'password="[REDACTED]"'],
      ["password='[REDACTED]'", "password='[REDACTED]'"],
      [
        String.raw`password="[REDACTED]"escaped\" secret"`,
        'password="[REDACTED]"',
      ],
      ['password=`my secret value`', 'password=`[REDACTED]`'],
      ['password=`abc,def`', 'password=`[REDACTED]`'],
    ] as const) {
      const quoted = redactPublicText(raw);
      expect(quoted.value).toBe(expected);
      expect(quoted.reasonCodes).toContain('SECRET_LIKE_VALUE');
    }
    const malformed = redactPublicText('password="[REDACTED]');
    expect(malformed.value).toBe(OVERSIZED_CONTENT_PLACEHOLDER);
    expect(malformed.reasonCodes).toEqual([
      'SECRET_LIKE_VALUE',
      'BINARY_OR_OVERSIZED_CONTENT',
    ]);
    expect(redactPublicText('password=`${process.env.SECRET}`')).toEqual({
      value: OVERSIZED_CONTENT_PLACEHOLDER,
      reasonCodes: [
        'SECRET_LIKE_VALUE',
        'BINARY_OR_OVERSIZED_CONTENT',
      ],
    });
  });

  it('preserves canonical ID and location metadata while dropping hash material', () => {
    const raw = confirmed('password=[REDACTED]');
    const redacted = redactConfirmedEvidence(raw);
    expect(redacted.id).toBe(raw.id);
    expect(redacted.location.file).toBe(raw.location.file);
    expect(redacted.location.lines).toEqual(raw.location.lines);
    expect(redacted.location.excerpt).not.toContain('do-not-publish');
    expect(redacted.location.redaction).toEqual({
      applied: true,
      reasonCodes: ['SECRET_LIKE_VALUE'],
    });
    expect(JSON.stringify(redacted)).not.toContain('discovery:v1');
  });

  it('does not guess personal names outside the approved email/phone boundary', () => {
    expect(redactPublicText('ownerName=Steven Guo')).toEqual({
      value: 'ownerName=Steven Guo',
      reasonCodes: [],
    });
  });

  it('propagates a deterministically bounded malformed secret tail', () => {
    const rawSecret = '[REDACTED]';
    const seed = confirmed(`password="${rawSecret}`);
    const derived: CandidateEvidence = {
      evidenceClass: 'candidate',
      id: `evidence:v1:${'1'.repeat(64)}`,
      role: 'related',
      location: {
        file: 'server/alias.ts',
        lines: [1, 1],
        excerpt: `const alias = "${rawSecret}";`,
      },
      provenance: {
        discoveredBy: ['ripgrep'],
        verifiedBy: 'filesystem',
        operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
      },
      reasonCodes: ['SAME_ENTITY_SIBLING'],
      promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
    };
    const rawResult: LocateResult = {
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'partial',
        repositoryRoot: 'D:/fixture/repository',
        normalizedTerms: [{ value: 'password', caseSensitive: false }],
        confirmed: [seed],
        candidates: [derived],
        coverage: {
          backends: [],
          fallbackChecked: false,
          indexState: 'unknown',
          indexFreshness: 'not-applicable',
          limitsReached: [],
          exclusionSummary: {},
        },
        nextActions: ['CONFIRM_CANDIDATE'],
      },
    };
    const redacted = redactLocateResult(rawResult);
    expect(JSON.stringify(redacted)).not.toContain(rawSecret);
    if (!redacted.ok) {
      throw new Error('Expected a redacted success result.');
    }
    expect(redacted.evidence.confirmed[0]?.location.excerpt).toBe(
      OVERSIZED_CONTENT_PLACEHOLDER,
    );
    expect(redacted.evidence.candidates[0]?.location.excerpt).toBe(
      'const alias = "[REDACTED]";',
    );
  });
});

describe.runIf(selected)('safe public errors and diagnostics', () => {
  it('locks exact recoverability and action by error code', () => {
    expect(createPublicErrorResult('INVALID_INPUT', 'ADD_TERM')).toEqual({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    });
    expect(createPublicErrorResult('INVALID_REPOSITORY')).toEqual({
      ok: false,
      error: {
        code: 'INVALID_REPOSITORY',
        message: 'Repository root is invalid or unavailable.',
        recoverable: true,
      },
    });
    expect(createPublicErrorResult('PATH_OUTSIDE_ROOT')).toMatchObject({
      ok: false,
      error: { recoverable: false },
    });
    expect(createPublicErrorResult('INTERNAL_ERROR')).toMatchObject({
      ok: false,
      error: { recoverable: false },
    });

    for (const code of [
      'INVALID_INPUT',
      'INVALID_REPOSITORY',
      'PATH_OUTSIDE_ROOT',
      'INTERNAL_ERROR',
    ] as const) {
      for (const action of NEXT_ACTION_CODES) {
        const result = createPublicErrorResult(code, action);
        if (result.ok) {
          throw new Error('Expected a public error result.');
        }
        expect(result.error.suggestedAction).toBe(
          code === 'INVALID_INPUT' && action === 'ADD_TERM'
            ? 'ADD_TERM'
            : undefined,
        );
      }
    }
  });

  it('does not suggest adjustable retries at schema maxima or for fixed caps', () => {
    const atMaximum = {
      maxFiles: 20,
      maxConfirmed: 20,
      maxCandidates: 20,
      timeoutMs: 30_000,
    } as const;
    expect(
      createNextActions({
        status: 'partial',
        hasCandidates: false,
        limitsReached: [
          'MAX_FILES_REACHED',
          'MAX_CONFIRMED_REACHED',
          'MAX_CANDIDATES_REACHED',
        ],
        abortSource: 'none',
        limits: atMaximum,
      }),
    ).toEqual([]);
    expect(
      createNextActions({
        status: 'partial',
        hasCandidates: false,
        limitsReached: [
          'MAX_FILE_BYTES_REACHED',
          'MAX_EXCERPT_BYTES_REACHED',
        ],
        abortSource: 'none',
        limits: resolveLocateLimits(),
      }),
    ).toEqual([]);
  });

  it('scrubs stack, absolute paths, and sensitive tokens from diagnostics', () => {
    const raw =
      'failed C:\\private\\repo\\secret.ts token=[REDACTED] stan.guo@mail.ru\n    at fixture (C:\\private\\repo\\secret.ts:1:1)';
    const scrubbed = scrubDiagnostic(raw);
    expect(scrubbed).not.toMatch(
      /(?:raw-secret|stan\.guo@mail\.ru|C:\\private|\bat fixture\b)/u,
    );
    expect(scrubbed).toContain('[REDACTED]');
    expect(scrubbed).toContain('[REDACTED_PATH]');
  });
});
```


## Validation Commands And Results
- Round 1: 5 P1 findings fixed; Round 2: backtick/malformed propagation finding fixed
- build/typecheck passed; unit 158/158; Golden 47 active + 1 skip; MCP 32/32
- mandatory DoD commands 6/6 passed

## Reviewer Risk Prompts
- Check database and migration safety.
- Check concurrency and race conditions.
- Check idempotency and rerun behavior.
- Check crash-resume persistence.
- Check provider cost and production writes.
- Check deterministic LLM boundary for IDs, paths, enums, and foreign keys.
