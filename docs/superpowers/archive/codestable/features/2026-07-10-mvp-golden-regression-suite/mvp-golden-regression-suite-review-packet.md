# CodeStable Code Quality Review Packet

- root: `D:/Personal/repo-nav-worktrees/repo-nav-mvp`
- unit: `.codestable/features/2026-07-10-mvp-golden-regression-suite`
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
### `.codestable/features/2026-07-10-mvp-golden-regression-suite/companion-snapshot-inventory.md`

```
# Companion Snapshot Inventory

每个 success manifest 由同一 `GoldenCaseEvaluator` 读取 `testkit/expected/{case-id}.json` 并对完整 stable projection 做 deep exact comparison。

共 23 项：

- alias-candidate
- backend-unavailable
- codegraph-failed
- codegraph-global-abort-no-fallback
- codegraph-hit-unverified
- codegraph-incomplete
- codegraph-local-timeout-fallback
- codegraph-missing
- codegraph-no-result
- codegraph-secondary-provenance-table
- codegraph-symbol-complete-no-fallback
- exclusion-summary
- false-confirmation-decoys
- foundation-success
- mcp-source-field-mapping
- ripgrep-failed
- ripgrep-incomplete
- ripgrep-timeout
- ripgrep-unavailable
- sibling-candidate
- sibling-false-positive
- source-field-mapping
- text-engine-baseline

Normalization 仅改写 public `repositoryRoot` 为 `<REPOSITORY_ROOT>`；其他 public 字段完整保留。缺 snapshot、孤儿 snapshot、manifest ID 重复均由 `fixture-completeness` 阻塞。
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/evaluator-mutation-report.md`

```
# Evaluator Mutation Report

## 共享语义

- service observation 与真实 stdio MCP observation 都调用 `assertGoldenCase`。
- success/error 由同一 discriminated evaluator 判定；lifecycle 不进入 GoldenCase。
- manifest confirmed/candidates 按 exact length/order 匹配，companion snapshot 再锁定完整 public output。

## Deliberate Failures

`evaluator-negative-self-test` 已证明以下 mutation 非零失败：

- unexpected evidence、wrong evidence order、forbidden ID、missing coverage、low exclusion count；
- wrong nextAction、missing promotion、wrong promotion order；
- wrong discoveredBy order、wrong verifiedBy、wrong operation order；
- error structured/text parity mismatch；
- 43 个 EvidencePack public field mutation（`repositoryRoot` 为唯一有意 normalize 的字段）。

验证：7/7 selected tests passed。
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-completeness-report.md`

```
# Fixture Completeness Report

## 结论

- 状态：passed
- 权威输入：`src/contracts/constants.ts`、`testkit/manifests/coverage/fixture-ownership.yaml`、Golden manifests、companion snapshots、显式 executable schema probes、逐 reason-code evaluator negative probes。
- 79 个 enum/code owner 全部存在；每个 owner 不仅在 runner registry 注册，还必须由该 case 的实际 companion observation、schema parse probe 或 evaluator mutation probe 对目标 `family.code` 产生机器可验证覆盖。
- Confirmed/Candidate reason 的 positive 与 negative owner 全部存在。
- 23 个 success manifest 与 23 个 companion snapshot 一一对应；1 个 error manifest 由共享 evaluator 精确判定 error fields 与 transport parity。
- 43 个 public EvidencePack field mutation 均被 schema 或 exact projection 捕获；唯一 allowlist 是 `repositoryRoot`。
- `fixture-completeness` 禁止充当自身 owner；把任一 code 的 owner 改成无关但已注册 case 会因缺少目标 observation/probe 而失败。
- 每个 success/error manifest 还必须声明一个已注册 runner owner；每个 companion JSON 都通过 LocateResult schema 解析。
- ownership source SHA-256：`ca82eb40e6d518f04019bad512575a925c8ff4d977ee649937fa5085e3b592a0`。

## 两层完整性

1. enum/code owner：RepoLayer、AnchorKind、TermCaseMode、LocateStatus、EvidenceSource、SearchBackendId、EvidenceRole、Confirmed/Candidate/Discovery/Promotion/Operation/Backend/Limit/Exclusion/Redaction/NextAction/ToolError 均由 schema constants 驱动对账，并逐值匹配实际 observation 或 executable probe。
2. public field mutation：schemaVersion、status、normalizedTerms、confirmed/candidates 全字段、provenance、redaction、coverage、nextActions 均有 deliberate mutation；class/reason/ID/order/excerpt 不在 normalization allowlist。

运行时 JSON：`test-artifacts/completeness/mvp-fixture-completeness-v1.json`（gitignored，每次 core test 重建）。
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-family-report.md`

```
# Fixture Family Report

| Family | Positive / boundary coverage | False-positive / failure guard | Runner |
|---|---|---|---|
| classification | assignment、object、SQL、symbol、exact role/reasons | comment、DTO/interface、string、quoted SQL | Golden + unit classifier |
| candidate | sibling、alias、secondary、promotion exact order | unrelated/forbidden ID、budget/permutation | Golden + MCP minimal loop |
| layer/path/security | layer、negative term、redaction 四类、binary/oversized | root escape、unsafe backend path、forbidden scan | Golden + MCP |
| backend transitions | CodeGraph missing/no-result/failed/incomplete/local-timeout、ripgrep unavailable/failed、both unavailable、hit-unverified | global abort no fallback、fixed timeout semantics | Golden |
| final status/limits | ok、partial、no_result、backend_unavailable、timeout；六类 limits owner | empty/evidence variants、exact nextActions | Golden + unit transition matrix |
| protocol/errors | tools/list/schema、success/error parity、四类 typed errors | invalid schema、unsafe detail scrub | MCP |
| lifecycle | production frames-only/EOF/signal/exit/budget；instrumented real Nest context close + in-flight direct/descendant cleanup；idempotence | malformed frames、over-budget、真实跳过 close marker、真实遗留 child tree、forced timeout/nonzero 后 PID 与 temp 清理 | independent lifecycle runner |

运行时 JSON：`test-artifacts/families/mvp-fixture-family-v1.json`。
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/lifecycle-report.md`

```
# Lifecycle Runner Report

- `McpLifecycleCaseRunner` 与 GoldenCaseEvaluator 分离。
- production bin 实际 stdio 运行验证 frames-only、exitCode=0、shutdown duration ≤ 5000 ms；未安装探针的 production case 对 `contextClosed` / `childrenCleaned` 返回 `null`，不伪造完成状态。
- `shutdown-cleanup-probe` 启动真实 Nest `AppModule`、真实 `NodeMcpStdioHost` 与真实 `NodeSafeProcessRunner`：provider 的 `onModuleDestroy` 写入 context marker，in-flight backend 启动 direct child + descendant，EOF 触发 host abort 后逐 PID 验证两者均已退出。
- probe observation 必须为 `contextClosed=true`、`childrenCleaned=true`；真实跳过 close marker 与真实遗留 child tree 两种 fault injection 均由 runner 拒绝。
- observation/audit 与末端清理分离：正常、fault、timeout、nonzero exit、spawn error 均进入统一 cleanup；timeout/nonzero runner tests 捕获 direct/descendant PID 与 probe temp directory，确认 reject 后两 PID 均退出且目录已删除。
- host overlap、startup queued signal、tracked-call abort/settle、application close、idempotent shutdown、transport parse failure 均由同一 lifecycle family 验证。
- 完整进程树清理同时由 lifecycle probe 和全量 unit `process-cleanup` 覆盖。

运行时报告：

- `test-artifacts/lifecycle/stdio-clean-output.json`
- `test-artifacts/lifecycle/graceful-shutdown.json`
- `test-artifacts/lifecycle/shutdown-cleanup-probe.json`
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml`

```
feature: 2026-07-10-mvp-golden-regression-suite
created: '2026-07-10'
steps:
- id: S1
  action: 去重并完成 shared GoldenCaseEvaluator
  exit_signal: service/MCP 共用 manifest+companion full-projection evaluator，nextAction/promotion/provenance mutations、normalization allowlist 与既有 assertions 全通过
  verification: npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test
  artifacts: [GoldenCaseEvaluator, companion snapshots, normalization allowlist, mutation self-test logs]
  status: done
- id: S2
  action: 完成 classification/candidate fixture family
  exit_signal: class/reason/promotion 每个负责 code 均有 positive 与 false-positive guard
  verification: npm run test:golden -- --group classification --group candidate
  artifacts: [classification/candidate manifests, family report]
  status: done
- id: S3
  action: 完成 backend/security/final-status fixture family
  exit_signal: backend/limit/exclusion/redaction/error/status codes 与 transition rows 全部覆盖
  verification: npm run test:golden -- --group backend-transitions --group security --group final-status
  artifacts: [transition/security manifests, family report]
  status: done
- id: S4
  action: 完成 protocol 与独立 lifecycle family
  exit_signal: schema/parity/errors 与 frames/exit/context/child cleanup 使用正确 runner 并全部通过
  verification: npm run test:mcp -- --group protocol --group lifecycle
  artifacts: [protocol manifests, lifecycle report]
  status: done
- id: S5
  action: 生成 enum/fixture completeness 并运行 full suites
  exit_signal: schema code 无漏项且 test:golden/test:mcp --all 全绿
  verification: npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all
  artifacts: [completeness report, full suite logs]
  status: done
- id: S6
  action: 建立 large-synthetic correctness/performance baseline
  exit_signal: 固定 corpus 5 次 stable projection 一致并生成 schema-valid environment-aware report
  verification: npm run test:golden -- --case large-synthetic-repository --report-performance
  artifacts: [generator config/hash, performance JSON, cleanup evidence]
  status: done
checks:
- id: C1
  item: success/error 由同一 GoldenCaseEvaluator 判别，service/MCP runner 只产生 observation
  source: design 0/1/2.1
  status: pending
- id: C2
  item: McpLifecycleCase 使用独立 runner/evaluator
  source: design 0/1/3.1
  status: pending
- id: C3
  item: success/error/lifecycle comparison contract、companion full projection 与 normalization allowlist 精确
  source: design 1 evaluator table
  status: pending
- id: C4
  item: evaluator mutations 对 wrong order/forbidden/coverage/exclusion/nextAction/promotion/provenance/parity 失败
  source: design 1/3.1
  status: pending
- id: C5
  item: fixture-family matrix 每行映射 manifest/case/runner/positive-negative assertion
  source: design 1 family matrix
  status: pending
- id: C6
  item: input/output/class/reason/discovery/promotion/operation/backend/limit/exclusion/redaction/nextAction/error enums 均有 owner case
  source: design 1 completeness ownership
  status: pending
- id: C7
  item: lifecycle 观察 context hook、child cleanup、frames、exit 与 maxShutdownMs
  source: design 1/3.1
  status: pending
- id: C8
  item: synthetic generator 固定 1000 files/50 modules/10 mappings/200 decoys/seed
  source: design 1 performance contract
  status: pending
- id: C9
  item: runtime performance report 含 config/hash/environment/5 runs/result/limits/cleanup，committed baseline 只经 review 更新
  source: design 1 performance contract
  status: pending
- id: C10
  item: correctness blocking，timing trend non-blocking且无单次硬阈值
  source: design 1/3.1
  status: pending
- id: C11
  item: fixtures 不含真实业务源码/网络/工作 repo index mutation
  source: design 1/3.2
  status: pending
- id: C12
  item: completeness/family/lifecycle/performance/full-suite artifacts 可盘点
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
  - id: CMD-EVALUATOR
    command: npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test
    core: true
    failure_handling: fix-or-block
  - id: CMD-FAMILIES
    command: npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status
    core: true
    failure_handling: fix-or-block
  - id: CMD-MCP
    command: npm run test:mcp -- --group protocol --group lifecycle
    core: true
    failure_handling: fix-or-block
  - id: CMD-ALL
    command: npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all
    core: true
    failure_handling: fix-or-block
  - id: CMD-PERF
    command: npm run test:golden -- --case large-synthetic-repository --report-performance
    core: true
    failure_handling: fix-or-block
  evidence_required: [command_output, diff_summary, artifact_inventory, completeness_report, companion_snapshots, performance_report, committed_baseline]
  cleanliness:
    debug_output: forbidden
    temporary_todo_fixme: forbidden
    commented_out_code: forbidden
    unused_imports: forbidden
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design-review.md`

```
---
doc_type: feature-design-review
feature: 2026-07-10-mvp-golden-regression-suite
status: passed
reviewed: 2026-07-10
round: 3
---

# mvp-golden-regression-suite feature design 审查报告

## 1. Scope And Inputs

- Design：`.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`
- Checklist：`.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml`
- Roadmap：`.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md`
- Requirement：`.codestable/requirements/source-of-truth-evidence.md`
- Baseline：`04b04f7a1314f322e82157363ced505e2199cfc8`（设计审查时 no-code baseline）

### Independent Review

- Status：completed
- Detection：native-agent
- Provider / agent：`/root/design_review_release_edges`
- Raw output：独立只读 reviewer 完成多轮审查；最终 Round 3 无 blocking / important finding
- Merge policy：主 agent 逐条核验 finding、同步 design/checklist、重跑 YAML 与 cross-doc gate 后复审
- Gate effect：none

## 2. Design Summary

- Goal：共享 evaluator、完整 fixture coverage、lifecycle 与性能基线。
- Steps：6 条，均有可独立判断的 exit signal。
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

- snapshot/baseline 更新必须经过 code review。
- 设计通过不替代 implementation、code review、QA 和 acceptance 的真实运行证据。

## 7. Verdict

- Status：passed
- Next：design 已由 owner 批准，可进入 goal feature loop。
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`

```
---
doc_type: feature-design
feature: 2026-07-10-mvp-golden-regression-suite
requirement: source-of-truth-evidence
roadmap: repo-nav-mvp
roadmap_item: mvp-golden-regression-suite
status: approved
summary: 建立共享 evaluator、完整 fixture coverage、独立 lifecycle runner 与可比较的大型合成仓库报告
tags: [mvp, repo-nav]
---

# mvp-golden-regression-suite 设计

## 0. 术语约定

- **Execution runner**：service runner 或 stdio MCP runner；两者都把 success/error observation 交给同一个 GoldenCaseEvaluator。
- **GoldenCaseEvaluator**：按 `kind` 分派 success/error 的共享判定语义，不是两套 evaluator。
- **Lifecycle runner**：只处理 `McpLifecycleCase` 的 stdout/shutdown，不伪装 LocateResult。
- **Completeness report**：从 schema enums 与 manifests 生成“status/reason/error → positive/negative cases”覆盖，不靠人工 group 名称。
- **Performance signal**：固定 synthetic corpus 上的 correctness + environment-aware timing report，不是 SLA。
- **权威输入**：draft requirement + 已批准 roadmap 4.4、4.6、4.7 与 Goal Coverage Matrix。

## 1. 决策与约束

### 需求摘要

把 F1 的 runner/manifest 基线扩展为可发布 MVP 候选的完整回归系统：success/error 共用判别联合 evaluator，service/MCP runners 复用同一 expectation 语义，lifecycle 独立；fixture family 显式覆盖 classification、backend transitions、security、limits、redaction、protocol、shutdown；大型合成仓库产生可比较 correctness/performance report，但不以单一毫秒阈值判定通过。

### 复杂度档位

回归严格档位。snapshot normalization 采用 allowlist，不能抹掉 schema/classification/order 漂移；每个核心 failure 至少有 positive 与 false-positive guard。

### 关键决策

- `GoldenCase = GoldenSuccessCase | GoldenErrorCase` 由一个 evaluator 处理；service/MCP 只是 observation adapter，不复制 expected semantics。
- lifecycle 使用独立 `McpLifecycleCaseRunner`，断言 frames-only、exitCode、maxShutdownMs、Nest context hook 与 child cleanup。
- Golden success comparison 是 exact contract：manifest 做语义断言，且每个 success case 的 sibling stable-projection snapshot 对完整 public output 做 deep exact comparison，覆盖 status、normalizedTerms、confirmed/candidates、promotion、provenance、coverage、nextActions、ID/order；forbidden IDs 必须不存在；required coverage 是 subset；minimum exclusions 是 lower bound。
- normalization 只允许替换 repository absolute root、test temp directory 和 runtime duration字段；relative path、excerpt、class、role、reason、promotion、coverage、ID/order 不得 normalize。
- completeness report 从 schema enums/manifest metadata 自动生成；缺 status/error/reason family 的负责 case 时 core test 失败。
- synthetic performance correctness 是 blocking；timing 是趋势信号。初始版本记录 baseline，不设单一绝对毫秒阈值。

### Evaluator comparison contract

| Case | 必须比较 | 允许 normalize/忽略 |
|---|---|---|
| GoldenSuccessCase | manifest：`ok=true`、status、confirmed/candidates exact length/order、file/contains/role/reasons、forbidden IDs、requiredCoverageCodes、minimumExclusionCounts；sibling stable snapshot：完整 EvidencePack 的 normalizedTerms、IDs、promotionRequirements、provenance(discoveredBy/verifiedBy/operations)、coverage、nextActions 与 schemaVersion deep exact | repositoryRoot absolute prefix → placeholder；temp root；elapsed/report-only environment |
| GoldenErrorCase | `ok=false`、code、recoverable、suggestedAction exact；MCP isError=true；structured/text deep-equal | safe message 文案可按 code snapshot；不得忽略 stack/path/secret forbidden scan |
| McpLifecycleCase | stdout frames-only、exitCode、shutdown duration ≤ manifest max、context closed、children cleaned | observed duration 数值只比较上限，不进入 snapshot |

Evaluator 自身必须有 deliberate-failure tests：unexpected evidence、wrong order、forbidden ID、missing coverage、low exclusion count、wrong nextAction、missing/wrong-order promotion、wrong verifiedBy/discoveredBy/operation order、error parity mismatch 都应使 runner 非零退出。

Roadmap 4.4 的 manifest interface 保持不变；full stable projection 存在 `testkit/expected/{case-id}.json`，由同一 evaluator 读取，不把新增 optional fields偷偷塞入 GoldenCase。snapshot 是 manifest 的 companion artifact，必须提交并 review。

### Fixture-family coverage matrix

| Family | Required cases/assertions | Runner |
|---|---|---|
| direct classification | source-field-mapping；assignment/object/SQL/symbol；exact class/role/reasons | service + MCP sample |
| false confirmation | DTO/entity/test/docs/comment/unsupported syntax；forbidden confirmed IDs | service |
| candidate | sibling/alias positive、unrelated false-positive、promotion exact set/order、budget/permutation | service + MCP minimal loop |
| layer/path/security | layer/negative/symlink/root escape、unverified/binary/oversized、redaction forbidden scan | service + MCP error/security |
| backend transitions | CodeGraph missing/no-result/failed/incomplete、ripgrep unavailable、both unavailable、hit-unverified | service |
| final status/limits | ok/no_result/backend_unavailable/partial empty+evidence/timeout empty+evidence；六类 limits | service + MCP representative |
| protocol/errors | invalid input/repo/path/internal、tools/list/schema、success/error parity | MCP |
| lifecycle | frames-only、EOF/platform signal、context close、in-flight child cleanup、idempotent shutdown | lifecycle runner |

### Schema/enum completeness ownership

- input enums（RepoLayer、AnchorKind、TermCaseMode）与 output enums（LocateStatus、EvidenceSource、EvidenceRole）都有 owner case/mutation test。
- Confirmed/Candidate/Discovery/Promotion/EvidenceOperation codes：classification/candidate/provenance families，均需 positive；candidate/confirmed 还需 false-positive guard。
- Backend/Limit/Exclusion/Redaction/NextAction codes：transition/security/limits/action families，每个 code 至少一项 required coverage/minimum count/stable snapshot assertion。
- RepoNavToolError：protocol family 每个 code 至少一个 exact case。
- completeness 输出两层：enum/code owner coverage；每个 public EvidencePack 字段的 deliberate mutation test。任一缺失都阻塞。

### Synthetic performance contract

`large-synthetic-repository-v1` 使用固定 seed 与 generator config：1,000 source files、50 modules、10 direct mappings、200 named decoys、固定 file-size distribution；manifest 固定 request/limits。生成内容全为合成代码，无网络/真实业务源码。

Runtime report schema/path：

```text
test-artifacts/performance/large-synthetic-repository-v1.json
```

包含 `schemaVersion`、generator config/hash、git commit、Node/OS/arch/CPU、dependency versions、warmup=1、measuredRuns=5、每次 elapsedMs/peakRssBytes、median/p95、status/result counts/limitsReached、fixture cleanup result。

首次 F8 acceptance 将 environment/config/hash 与 timing summary 的基线副本提交到 `testkit/baselines/performance/large-synthetic-repository-v1.json`；后续 runs 写 gitignored `test-artifacts/` 并与这个 committed baseline 生成 trend。更新 committed baseline 必须经过 code review，不由 test 自动覆盖。

- Blocking correctness：5 次输出 stable projection/hash 完全一致；status/counts/limits 与 manifest 相同；无 timeout/资源泄漏；report schema 完整。
- Non-blocking performance：记录 median/p95/peak RSS 与相对上次 baseline 趋势；首版无上次数据时只建 baseline。显著趋势在 review 中报告，不因单次 elapsed 自动失败。

### 明确不做

- 不为 snapshot 修改 production 语义，不宽泛 scrub 真实协议字段。
- 不访问真实业务仓库或网络，不把 synthetic timing 宣称为 monorepo SLA。
- 不将 success/error 拆成不同 expectation semantics，不让 lifecycle 进入 GoldenCase。
- 不以单次或单一毫秒阈值决定 performance pass/fail。

### 基线、依赖、风险与交付物

- 基线 commit：`04b04f7a1314f322e82157363ced505e2199cfc8`。
- 前置：F7 accepted 的完整 guardrails。
- Top 3 风险：normalization 隐藏协议漂移、group 名称掩盖漏 case、跨环境 timing 噪声。分别由 allowlist/negative evaluator tests、generated completeness report、environment/repeat/trend 报告缓解。
- 关键假设：1,000-file synthetic corpus 足以形成 MVP 趋势信号，但不代表真实 monorepo。
- 交付物：shared evaluator、service/MCP/lifecycle runners、manifest family、completeness report、synthetic generator、versioned report schema/baseline artifact、全 suite logs。
- 清洁度：禁止临时 stdout/debug、无来源 TODO/FIXME、注释掉代码、死 import；test artifacts 使用明确目录/retention，不散落 temp files。

## 2. 名词与编排

### 2.1 名词层

**现状**：各前置 feature 已有局部 unit/Golden/MCP cases；F1 提供 shared schema/harness，但尚无全 family completeness 与性能报告。

**变化**：

- `GoldenCaseEvaluator.evaluate(case, observation)` 是 success/error expectation 的唯一实现。
- `ServiceGoldenRunner`、`McpGoldenRunner` 只负责产生 observation；`McpLifecycleCaseRunner` 独立。
- manifest metadata 声明 covered input/output enums、status/reason/action/error codes 与 positive/negative role；companion snapshot覆盖完整 public fields，生成两层 completeness report。
- snapshot projection 只在 evaluator 内维护 allowlist，runner 不各自 normalize。
- synthetic generator/report schema versioned，runtime output 写 `test-artifacts/`，可核验 schema/config/hash。

### 2.2 编排层

```mermaid
flowchart TD
  M["Versioned manifests"] --> S["Service observation runner"]
  M --> P["MCP observation runner"]
  S --> E["Shared GoldenCaseEvaluator"]
  P --> E
  L["McpLifecycleCase manifests"] --> R["Independent lifecycle runner"]
  M --> C["Enum/fixture completeness report"]
  G["Synthetic generator"] --> X["5 measured observations"]
  X --> E
  X --> Q["Performance/correctness report"]
```

- runner failure 必须指出 case ID、field path、expected/actual safe projection，禁止 dump raw secret。
- `--all` 先跑 schema/completeness，再运行 service/MCP/lifecycle；completeness fail 时不伪造部分 suite passed。

### 2.3 挂载点清单

- `test:golden --all`：service cases、shared evaluator、completeness 的聚合入口。
- `test:mcp --all`：protocol success/error 与 lifecycle 的聚合入口。
- versioned fixture family + synthetic generator/report schema：MVP regression truth source。

### 2.4 推进策略

1. **shared evaluator**：manifest + companion full-projection snapshot、normalization contract 与 deliberate-failure self-tests 通过。
   验证：`npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test`
2. **classification/candidate family**：每个 class/reason/promotion 有明确 positive/negative coverage。
   验证：`npm run test:golden -- --group classification --group candidate`
3. **backend/security/status family**：backend/limit/exclusion/redaction/error codes 与 transition cases 全覆盖。
   验证：`npm run test:golden -- --group backend-transitions --group security --group final-status`
4. **protocol/lifecycle family**：tool schema/parity/errors 与 frames/shutdown/context/child cleanup 分 runner 通过。
   验证：`npm run test:mcp -- --group protocol --group lifecycle`
5. **completeness + full suites**：schema enums 与 manifests coverage 完整，两个 --all 入口全绿。
   验证：`npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all`
6. **synthetic correctness/performance**：固定 corpus 5 次 projection 一致并生成有效 report/baseline。
   验证：`npm run test:golden -- --case large-synthetic-repository --report-performance`

### 2.5 结构健康度与微重构

##### 评估

- 文件级：前置 local evaluators 若重复 expectation 语义，先以 shared evaluator 替换调用，但不改 assertions。
- 目录级：manifest/evaluator/runner/generator/report schema 分目录，production `src` 不依赖 testkit。
- Compound：未发现既有目录 convention。

##### 结论：做受控 evaluator 去重

Checklist S1 包含将重复 success/error expectation 判断搬到 shared evaluator；只搬不改 assertions，并先运行所有既有 local cases证明行为不变。

## 3. 验收契约

### 3.1 关键场景

- shared evaluator 对 manifest 语义和完整 projection 的 nextActions/promotion/provenance/coverage/order 判断正确，故意错误 observation 必须失败。
- coverage matrix 每行都有 manifest/case/runner，schema 新增 enum 后 completeness test 自动红灯。
- lifecycle runner 实际观察 stdout frames、exit、duration、context hook 和 descendant cleanup，不只等进程自然退出。
- full Golden/MCP suites 可按 case/group/all 运行，case ID 唯一且失败定位到 field。
- synthetic report schema/config/hash/environment/5 runs/correctness/timing 完整；correctness 不稳定阻塞，timing 只报告趋势。

### 3.2 明确不做的反向核对

- production 代码不得为 snapshot 特判；normalization allowlist 不得包含 class/reason/ID/order/excerpt。
- fixture 不得复制真实公司源码、访问网络或初始化工作 repo index。
- lifecycle 不得通过 GoldenSuccessCase/ErrorCase 表达；timing 不得用单次硬阈值判定。

### 3.3 Acceptance Coverage Matrix

| Scenario | Covered By Step | Evidence Type | Command / Action | Core? |
|---|---|---|---|---|
| manifest + full projection evaluator exact/negative behavior | S1 | evaluator self-tests | manifest-evaluator/negative | yes |
| class/reason/promotion positive+negative | S2 | Golden family report | classification/candidate | yes |
| backend/security/status/limits/redaction | S3 | Golden transitions/security | three groups | yes |
| protocol/lifecycle internal observations | S4 | real stdio/lifecycle runner | protocol/lifecycle | yes |
| enum completeness + full suites | S5 | generated report + command logs | completeness + --all | yes |
| synthetic correctness/performance baseline | S6 | versioned JSON report | large synthetic case | yes |

### 3.4 DoD Contract

| ID | 要求 | 证据 | 阻塞级别 |
|---|---|---|---|
| DOD-DESIGN-001 | design/checklist/review 完整并获 owner 批准 | design review | blocking |
| DOD-IMPL-001 | evaluator/runners/families/reports 完成 | checklist/diff/logs | blocking |
| DOD-REVIEW-001 | code review passed，重点审 normalization 与 coverage completeness | review report | blocking |
| DOD-QA-001 | full suites、lifecycle 与 5-run synthetic 实际运行 | QA report | blocking |
| DOD-ACCEPT-001 | acceptance 记录 coverage report 与性能 baseline 限制 | acceptance | blocking |

Validation Commands:

| ID | 命令 | 目的 | 核心性 | 失败处理 |
|---|---|---|---|---|
| CMD-BUILD | `npm run build` | 编译 | core | fix-or-block |
| CMD-TYPECHECK | `npm run typecheck` | strict 类型检查 | core | fix-or-block |
| CMD-EVALUATOR | `npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test` | shared evaluator | core | fix-or-block |
| CMD-FAMILIES | `npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status` | Golden families | core | fix-or-block |
| CMD-MCP | `npm run test:mcp -- --group protocol --group lifecycle` | protocol/lifecycle | core | fix-or-block |
| CMD-ALL | `npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all` | completeness/full regression | core | fix-or-block |
| CMD-PERF | `npm run test:golden -- --case large-synthetic-repository --report-performance` | correctness/performance report | core | fix-or-block |

Required Artifacts: design-review、fixture coverage matrix/two-layer completeness report、manifest + companion snapshot inventory、shared evaluator mutation logs、lifecycle report、synthetic generator config/hash、runtime performance JSON、committed baseline JSON、full command logs、review、QA、acceptance。

## 4. 与项目级架构文档的关系

Acceptance 回填 Verification Kit runners/evaluator/fixture/report boundaries。normalization allowlist、completeness generation 与 synthetic report schema 属长期测试架构约束，建议 ADR/learning。
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md`

```
---
doc_type: feature-evidence-pack
feature: 2026-07-10-mvp-golden-regression-suite
status: generated
---

# 2026-07-10-mvp-golden-regression-suite evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`
- Checklist: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml`

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
      "command": "npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case manifest-evaluator --case evaluator-negative-self-test\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ✓ test/golden/mvp-evaluator.spec.ts (7 tests) 48ms\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  7 passed | 55 skipped (62)\n   Start at  18:25:15\n   Duration  925ms (transform 1.12s, setup 0ms, import 6.31s, tests 48ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-EVALUATOR",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group classification --group candidate --group backend-transitions --group security --group final-status\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 36ms\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 44ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 77ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 65ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 109ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 282ms\n\n Test Files  6 passed | 5 skipped (11)\n      Tests  46 passed | 16 skipped (62)\n   Start at  18:25:17\n   Duration  1.15s (transform 963ms, setup 0ms, import 5.68s, tests 613ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-FAMILIES",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --group protocol --group lifecycle",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group protocol --group lifecycle\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 203ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1005ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1003ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1029ms\n     ✓ returns confirmed and bounded candidates with transport parity  1028ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1051ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1050ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1834ms\n     ✓ returns one confirmed mapping through real stdio  1055ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  777ms\n ✓ test/mcp/lifecycle-contract.spec.ts (13 tests | 1 skipped) 1581ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  602ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  476ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  475ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2636ms\n     ✓ does not lose cancellation sent before the handler starts work  1116ms\n     ✓ propagates the SDK request signal to the application service  811ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  707ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3776ms\n     ✓ maps schema-invalid objects to typed parity output  1029ms\n     ✓ preserves the typed code while sanitizing unsafe detail  763ms\n     ✓ preserves the typed code while sanitizing unsafe detail  693ms\n     ✓ turns thrown failures into safe typed parity output  1289ms\n\n Test Files  8 passed | 1 skipped (9)\n      Tests  32 passed | 2 skipped (34)\n   Start at  18:25:21\n   Duration  4.53s (transform 944ms, setup 0ms, import 5.75s, tests 13.11s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-MCP",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/fixture-completeness.spec.ts (1 test) 64ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 61 skipped (62)\n   Start at  18:25:26\n   Duration  928ms (transform 1.05s, setup 0ms, import 6.32s, tests 64ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 34ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 70ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 95ms\n ✓ test/golden/mvp-evaluator.spec.ts (7 tests) 106ms\n ✓ test/golden/fixture-completeness.spec.ts (1 test) 116ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 180ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 127ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 207ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 711ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  392ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1339ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1337ms\n\n Test Files  11 passed (11)\n      Tests  61 passed | 1 skipped (62)\n   Start at  18:25:28\n   Duration  2.19s (transform 1.21s, setup 0ms, import 6.62s, tests 2.99s, environment 2ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 214ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1183ms\n     ✓ returns confirmed and bounded candidates with transport parity  1181ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1190ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1189ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1205ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1203ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1997ms\n     ✓ returns one confirmed mapping through real stdio  1173ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  822ms\n ✓ test/mcp/lifecycle-contract.spec.ts (13 tests) 1720ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  687ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  492ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  506ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2859ms\n     ✓ does not lose cancellation sent before the handler starts work  1237ms\n     ✓ propagates the SDK request signal to the application service  861ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  759ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3996ms\n     ✓ maps schema-invalid objects to typed parity output  1155ms\n     ✓ preserves the typed code while sanitizing unsafe detail  828ms\n     ✓ preserves the typed code while sanitizing unsafe detail  753ms\n     ✓ turns thrown failures into safe typed parity output  1258ms\n\n Test Files  9 passed (9)\n      Tests  34 passed (34)\n   Start at  18:25:33\n   Duration  4.87s (transform 1.12s, setup 0ms, import 6.79s, tests 14.37s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case large-synthetic-repository --report-performance",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case large-synthetic-repository --report-performance\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1199ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1197ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 61 skipped (62)\n   Start at  18:25:38\n   Duration  2.09s (transform 1.16s, setup 0ms, import 7.15s, tests 1.20s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-PERF",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

Artifact inventory：

- `fixture-completeness-report.md` + runtime completeness JSON：79 owners、23 snapshot pairs、43 field mutations。
- `companion-snapshot-inventory.md`：全部 success manifest 的 full stable projection。
- `evaluator-mutation-report.md`：unexpected/order/forbidden/coverage/exclusion/action/promotion/provenance/parity negative evidence。
- `fixture-family-report.md`：classification/candidate/backend/security/status/protocol/lifecycle matrix。
- `lifecycle-report.md` + 两个 runtime lifecycle JSON。
- `performance-baseline-report.md`、fixed generator manifest、runtime performance JSON、committed baseline JSON。
- `mvp-golden-regression-suite-implementation.md`：step evidence 与全量 suite summary。

## 4. Scope And Cleanliness

Design bytes: 13967
Checklist bytes: 5204

## 5. Residual Risks

- Synthetic 1000-file timing 是当前 Windows/Node 环境的趋势信号，不代表真实 monorepo SLA；timing delta 明确 non-blocking。
- archguard/meta-cc provider unavailable；本轮无 production architecture semantics change，已由 exact diff、full unit/Golden/MCP 和独立 review 接管。

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
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".gitignore",
        "test/mcp/lifecycle-contract.spec.ts",
        "testkit/contracts/golden-evaluator.ts",
        "testkit/contracts/index.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/contracts/mcp-tool-result.ts",
        "testkit/manifests/golden/alias-candidate.yaml",
        "testkit/manifests/golden/false-confirmation-decoys.yaml",
        "testkit/manifests/golden/sibling-candidate.yaml",
        "testkit/manifests/golden/sibling-false-positive.yaml",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/companion-snapshot-inventory.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/evaluator-mutation-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-completeness-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-family-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/implementation-scope.txt",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/lifecycle-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-implementation.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/performance-baseline-report.md",
        "test/golden/fixture-completeness.spec.ts",
        "test/golden/large-synthetic-repository.spec.ts",
        "test/golden/mvp-evaluator.spec.ts",
        "test/golden/mvp-regression-families.spec.ts",
        "test/mcp/mcp-golden-adapter.spec.ts",
        "testkit/baselines/performance/large-synthetic-repository-v1.json",
        "testkit/contracts/evidence-pack-field-contract.ts",
        "testkit/contracts/fixture-completeness.ts",
        "testkit/contracts/golden-projection.ts",
        "testkit/expected/alias-candidate.json",
        "testkit/expected/backend-unavailable.json",
        "testkit/expected/codegraph-failed.json",
        "testkit/expected/codegraph-global-abort-no-fallback.json",
        "testkit/expected/codegraph-hit-unverified.json",
        "testkit/expected/codegraph-incomplete.json",
        "testkit/expected/codegraph-local-timeout-fallback.json",
        "testkit/expected/codegraph-missing.json",
        "testkit/expected/codegraph-no-result.json",
        "testkit/expected/codegraph-secondary-provenance-table.json",
        "testkit/expected/codegraph-symbol-complete-no-fallback.json",
        "testkit/expected/exclusion-summary.json",
        "testkit/expected/false-confirmation-decoys.json",
        "testkit/expected/foundation-success.json",
        "testkit/expected/mcp-source-field-mapping.json",
        "testkit/expected/ripgrep-failed.json",
        "testkit/expected/ripgrep-incomplete.json",
        "testkit/expected/ripgrep-timeout.json",
        "testkit/expected/ripgrep-unavailable.json",
        "testkit/expected/sibling-candidate.json",
        "testkit/expected/sibling-false-positive.json",
        "testkit/expected/source-field-mapping.json",
        "testkit/expected/text-engine-baseline.json",
        "testkit/manifests/golden/mcp-source-field-mapping.yaml",
        "testkit/manifests/performance/large-synthetic-repository-v1.yaml",
        "testkit/performance/large-synthetic-repository.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-dod-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite",
        "test/golden",
        "test/mcp",
        "test/unit",
        "testkit/contracts",
        "testkit/expected",
        "testkit/fixtures",
        "testkit/manifests",
        "testkit/performance",
        "testkit/runners",
        "testkit/testing",
        "testkit/baselines",
        "test-artifacts/performance",
        "test-artifacts/completeness",
        "test-artifacts/lifecycle",
        "test-artifacts/families",
        "package.json",
        ".gitignore",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        ".codestable/architecture"
      ]
    }
  ],
  "providers": {}
}
```
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-implementation.md`

```
---
doc_type: feature-implementation
feature: 2026-07-10-mvp-golden-regression-suite
status: in-progress
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
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-review-packet.md`

```
[large file omitted]
```

### `.codestable/features/2026-07-10-mvp-golden-regression-suite/performance-baseline-report.md`

```
# Large Synthetic Performance Baseline

## 固定 corpus

- seed：20260710
- source files：1000
- modules：50
- direct mappings：10
- named decoys：200
- size distribution：500 small / 350 medium / 150 large
- generator config hash：`f359ff248dfb9ba073b7d36881058ff48ec240bd1e3b6660c9bcccc4194c8a86`
- corpus hash：`3a66ce5d9121dba0d833acc9a1429d70e1ee03eff9e278db60ee6015b48e8c5e`

## Blocking correctness

- warmup=1，measuredRuns=5。
- 5 次 stable projection hash 均为 `8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c`。
- exact result：status=`partial`、confirmed=10、candidates=10、limitsReached=`MAX_FILES_REACHED`。
- fixture cleanup：attempted/succeeded/removed 全 true。

## Non-blocking timing

- committed baseline：median 61.88 ms、p95 70.85 ms、peak RSS 128,516,096 bytes。
- 最新 QA 前运行：median 70.24 ms、p95 79.98 ms、peak RSS 125,079,552 bytes。
- timing trend 仅报告，不设单次硬阈值；config/corpus/projection drift 才阻塞。

Committed baseline：`testkit/baselines/performance/large-synthetic-repository-v1.json`。运行时报告：`test-artifacts/performance/large-synthetic-repository-v1.json`（test 不覆盖 committed baseline）。
```

## Git Diff Stat

```
### unstaged
.../mvp-golden-regression-suite-checklist.yaml     |  12 +-
 .../goal-features/mvp-golden-regression-suite.md   |   2 +-
 .codestable/roadmap/repo-nav-mvp/goal-state.yaml   |   4 +-
 .gitignore                                         |   1 +
 test/mcp/lifecycle-contract.spec.ts                | 173 +++++++++-
 testkit/contracts/golden-evaluator.ts              |  57 +++-
 testkit/contracts/index.ts                         |   4 +
 testkit/contracts/mcp-lifecycle-case.ts            |   6 +-
 testkit/contracts/mcp-lifecycle-harness.ts         | 347 +++++++++++++++++++--
 testkit/contracts/mcp-tool-result.ts               |   9 +-
 testkit/manifests/golden/alias-candidate.yaml      |  16 +
 .../golden/false-confirmation-decoys.yaml          |  20 ++
 testkit/manifests/golden/sibling-candidate.yaml    |  16 +
 .../manifests/golden/sibling-false-positive.yaml   |  17 +
 testkit/runners/run-vitest-surface.ts              |  41 ++-
 testkit/runners/runner-registry.ts                 |  46 ++-
 16 files changed, 719 insertions(+), 52 deletions(-)

### staged
No staged diff.
```

## Focused Diff

### Unstaged

```diff
diff --git a/.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml b/.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml
index 01a1f76..1b47a0e 100644
--- a/.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml
+++ b/.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml
@@ -6,37 +6,37 @@ steps:
   exit_signal: service/MCP 共用 manifest+companion full-projection evaluator，nextAction/promotion/provenance mutations、normalization allowlist 与既有 assertions 全通过
   verification: npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test
   artifacts: [GoldenCaseEvaluator, companion snapshots, normalization allowlist, mutation self-test logs]
-  status: pending
+  status: done
 - id: S2
   action: 完成 classification/candidate fixture family
   exit_signal: class/reason/promotion 每个负责 code 均有 positive 与 false-positive guard
   verification: npm run test:golden -- --group classification --group candidate
   artifacts: [classification/candidate manifests, family report]
-  status: pending
+  status: done
 - id: S3
   action: 完成 backend/security/final-status fixture family
   exit_signal: backend/limit/exclusion/redaction/error/status codes 与 transition rows 全部覆盖
   verification: npm run test:golden -- --group backend-transitions --group security --group final-status
   artifacts: [transition/security manifests, family report]
-  status: pending
+  status: done
 - id: S4
   action: 完成 protocol 与独立 lifecycle family
   exit_signal: schema/parity/errors 与 frames/exit/context/child cleanup 使用正确 runner 并全部通过
   verification: npm run test:mcp -- --group protocol --group lifecycle
   artifacts: [protocol manifests, lifecycle report]
-  status: pending
+  status: done
 - id: S5
   action: 生成 enum/fixture completeness 并运行 full suites
   exit_signal: schema code 无漏项且 test:golden/test:mcp --all 全绿
   verification: npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all
   artifacts: [completeness report, full suite logs]
-  status: pending
+  status: done
 - id: S6
   action: 建立 large-synthetic correctness/performance baseline
   exit_signal: 固定 corpus 5 次 stable projection 一致并生成 schema-valid environment-aware report
   verification: npm run test:golden -- --case large-synthetic-repository --report-performance
   artifacts: [generator config/hash, performance JSON, cleanup evidence]
-  status: pending
+  status: done
 checks:
 - id: C1
   item: success/error 由同一 GoldenCaseEvaluator 判别，service/MCP runner 只产生 observation
diff --git a/.codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md b/.codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md
index 59607ea..48adbfa 100644
--- a/.codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md
+++ b/.codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md
@@ -3,7 +3,7 @@ doc_type: roadmap-goal-feature
 roadmap: repo-nav-mvp
 feature: 2026-07-10-mvp-golden-regression-suite
 roadmap_item: mvp-golden-regression-suite
-status: pending
+status: implementing
 ---

 # mvp-golden-regression-suite Goal 执行规格
diff --git a/.codestable/roadmap/repo-nav-mvp/goal-state.yaml b/.codestable/roadmap/repo-nav-mvp/goal-state.yaml
index dcd6a8a..834b4ef 100644
--- a/.codestable/roadmap/repo-nav-mvp/goal-state.yaml
+++ b/.codestable/roadmap/repo-nav-mvp/goal-state.yaml
@@ -1,7 +1,7 @@
 roadmap: repo-nav-mvp
 status: ready-to-dispatch
 baseline_ref: a356b6117ed65c2959132f0d6b62485295d60ccb
-current_feature_index: 7
+current_feature_index: 8
 features:
 - slug: repository-evidence-foundation
   roadmap_item: repository-evidence-foundation
@@ -74,7 +74,7 @@ features:
   review: .codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-review.md
   qa: .codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-qa.md
   acceptance: .codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-acceptance.md
-  status: pending
+  status: implementing
 - slug: debug-cli-mcp-guide
   roadmap_item: debug-cli-mcp-guide
   feature_dir: .codestable/features/2026-07-10-debug-cli-mcp-guide
diff --git a/.gitignore b/.gitignore
index c19bb02..f4546e5 100644
--- a/.gitignore
+++ b/.gitignore
@@ -2,3 +2,4 @@ node_modules/
 dist/
 coverage/
 *.tsbuildinfo
+test-artifacts/
diff --git a/test/mcp/lifecycle-contract.spec.ts b/test/mcp/lifecycle-contract.spec.ts
index ea67405..d67e53f 100644
--- a/test/mcp/lifecycle-contract.spec.ts
+++ b/test/mcp/lifecycle-contract.spec.ts
@@ -1,4 +1,4 @@
-import { readFileSync } from 'node:fs';
+import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
 import { resolve } from 'node:path';

 import { describe, expect, it } from 'vitest';
@@ -13,10 +13,13 @@ import {
 } from '../../src/index.js';
 import {
   McpLifecycleCaseSchema,
+  McpLifecycleCaseRunner,
+  evaluateMcpLifecycleCase,
   parseMcpStdoutFrames,
   runMcpLifecycleCase,
   runMcpTransportErrorCase,
   type McpLifecycleCase,
+  type McpLifecycleProbeAudit,
 } from '../../testkit/contracts/index.js';
 import { isSelected } from '../../testkit/testing/selection.js';

@@ -36,6 +39,70 @@ function loadLifecycleCase(name: string): McpLifecycleCase {
   return McpLifecycleCaseSchema.parse(input);
 }

+function writeLifecycleReport(
+  caseId: string,
+  observation: {
+    readonly exitCode: number;
+    readonly stdoutFrames: readonly Readonly<Record<string, unknown>>[];
+    readonly elapsedMs: number;
+    readonly contextClosed: boolean | null;
+    readonly childrenCleaned: boolean | null;
+  },
+): void {
+  const outputDirectory = resolve(
+    import.meta.dirname,
+    '..',
+    '..',
+    'test-artifacts',
+    'lifecycle',
+  );
+  mkdirSync(outputDirectory, { recursive: true });
+  writeFileSync(
+    resolve(outputDirectory, `${caseId}.json`),
+    `${JSON.stringify(
+      {
+        schemaVersion: '1.0',
+        caseId,
+        exitCode: observation.exitCode,
+        frameCount: observation.stdoutFrames.length,
+        elapsedMs: observation.elapsedMs,
+        contextClosed: observation.contextClosed,
+        childrenCleaned: observation.childrenCleaned,
+      },
+      null,
+      2,
+    )}\n`,
+    'utf8',
+  );
+}
+
+function processIsAlive(pid: number): boolean {
+  try {
+    process.kill(pid, 0);
+    return true;
+  } catch {
+    return false;
+  }
+}
+
+function expectProbeAuditCleaned(
+  audit: McpLifecycleProbeAudit | undefined,
+): void {
+  expect(audit).toBeDefined();
+  if (audit === undefined) {
+    throw new Error('Lifecycle probe audit was not observed.');
+  }
+  expect(audit.directPid).not.toBeNull();
+  expect(audit.descendantPid).not.toBeNull();
+  expect(existsSync(audit.directory)).toBe(false);
+  if (audit.directPid !== null) {
+    expect(processIsAlive(audit.directPid)).toBe(false);
+  }
+  if (audit.descendantPid !== null) {
+    expect(processIsAlive(audit.descendantPid)).toBe(false);
+  }
+}
+
 const identity = {
   group: 'runner-smoke',
   caseId: 'lifecycle-manifest-schema',
@@ -56,10 +123,10 @@ describe.runIf(isSelected(identity))('MCP lifecycle contract', () => {
 });

 describe.runIf(
-  isSelected({ group: 'mcp-surface', caseId: 'stdio-clean-output' }),
+  isSelected({ group: 'lifecycle', caseId: 'stdio-clean-output' }),
 )('MCP production stdout', () => {
   it('accepts only real MCP frames on stdout and propagates clean exit', async () => {
-    const observation = await runMcpLifecycleCase(
+    const observation = await new McpLifecycleCaseRunner().run(
       loadLifecycleCase('stdio-clean-output.yaml'),
     );

@@ -84,11 +151,14 @@ describe.runIf(
       },
     });
     expect(observation.stderr).toBe('');
+    expect(observation.contextClosed).toBeNull();
+    expect(observation.childrenCleaned).toBeNull();
+    writeLifecycleReport('stdio-clean-output', observation);
   });
 });

 describe.runIf(
-  isSelected({ group: 'mcp-surface', caseId: 'stdio-graceful-shutdown' }),
+  isSelected({ group: 'lifecycle', caseId: 'stdio-graceful-shutdown' }),
 )('MCP production shutdown', () => {
   it('treats an SDK transport parse failure as fatal without stdout pollution', async () => {
     const observation = await runMcpTransportErrorCase(5_000);
@@ -285,6 +355,7 @@ describe.runIf(
     expect(observation.elapsedMs).toBeLessThan(
       lifecycleCase.expected.maxShutdownMs,
     );
+    writeLifecycleReport('graceful-shutdown', observation);
   });

   it('fails rather than hiding an exceeded lifecycle budget', async () => {
@@ -296,4 +367,98 @@ describe.runIf(
       }),
     ).rejects.toThrow(/exceeded/iu);
   });
+
+  it('rejects unclosed context and tracked-child observations', () => {
+    const lifecycleCase = loadLifecycleCase('shutdown-cleanup-probe.yaml');
+    expect(
+      evaluateMcpLifecycleCase(lifecycleCase, {
+        exitCode: 0,
+        stdoutFrames: [{ jsonrpc: '2.0', id: 1, result: {} }],
+        stderr: '',
+        elapsedMs: 1,
+        contextClosed: false,
+        childrenCleaned: false,
+      }).map(({ path }) => path),
+    ).toEqual(['contextClosed', 'childrenCleaned']);
+  });
+});
+
+describe.runIf(
+  isSelected({ group: 'lifecycle', caseId: 'shutdown-cleanup-probe' }),
+)('MCP instrumented shutdown cleanup', () => {
+  const lifecycleCase = loadLifecycleCase('shutdown-cleanup-probe.yaml');
+
+  it(
+    'observes the real Nest context hook and direct/descendant process cleanup',
+    async () => {
+      const observation = await new McpLifecycleCaseRunner().run(lifecycleCase);
+
+      expect(observation.exitCode).toBe(0);
+      expect(observation.contextClosed).toBe(true);
+      expect(observation.childrenCleaned).toBe(true);
+      writeLifecycleReport('shutdown-cleanup-probe', observation);
+    },
+    10_000,
+  );
+
+  it(
+    'fails when the real context close marker is deliberately skipped',
+    async () => {
+      await expect(
+        new McpLifecycleCaseRunner({ probeFault: 'skip-context-close' }).run(
+          lifecycleCase,
+        ),
+      ).rejects.toThrow(/contextClosed/iu);
+    },
+    10_000,
+  );
+
+  it(
+    'fails when an actual descendant tree is deliberately left running',
+    async () => {
+      await expect(
+        new McpLifecycleCaseRunner({ probeFault: 'leave-child-running' }).run(
+          lifecycleCase,
+        ),
+      ).rejects.toThrow(/childrenCleaned/iu);
+    },
+    10_000,
+  );
+
+  it(
+    'cleans both child PIDs and the probe directory after a forced timeout',
+    async () => {
+      let audit: McpLifecycleProbeAudit | undefined;
+      await expect(
+        new McpLifecycleCaseRunner({
+          probeFault: 'force-timeout',
+          onProbeAudit: (value) => {
+            audit = value;
+          },
+        }).run({
+          ...lifecycleCase,
+          expected: { ...lifecycleCase.expected, maxShutdownMs: 2_500 },
+        }),
+      ).rejects.toThrow(/exceeded/iu);
+      expectProbeAuditCleaned(audit);
+    },
+    10_000,
+  );
+
+  it(
+    'cleans both child PIDs and the probe directory after a nonzero exit',
+    async () => {
+      let audit: McpLifecycleProbeAudit | undefined;
+      await expect(
+        new McpLifecycleCaseRunner({
+          probeFault: 'force-nonzero-exit',
+          onProbeAudit: (value) => {
+            audit = value;
+          },
+        }).run(lifecycleCase),
+      ).rejects.toThrow(/exit code 7/iu);
+      expectProbeAuditCleaned(audit);
+    },
+    10_000,
+  );
 });
diff --git a/testkit/contracts/golden-evaluator.ts b/testkit/contracts/golden-evaluator.ts
index 29e2694..6c1a6d2 100644
--- a/testkit/contracts/golden-evaluator.ts
+++ b/testkit/contracts/golden-evaluator.ts
@@ -11,6 +11,11 @@ import {
   type GoldenCase,
   type GoldenObservation,
 } from './golden-case.js';
+import {
+  compareGoldenProjection,
+  createMissingGoldenProjection,
+  loadExpectedGoldenProjection,
+} from './golden-projection.js';

 type EvaluatedEvidence = ConfirmedEvidence | CandidateEvidence;

@@ -66,16 +71,54 @@ function evaluateExpectations(
   evidence: readonly EvaluatedEvidence[],
   expectations: readonly EvidenceExpectation[],
 ): GoldenEvaluationIssue[] {
-  return expectations.flatMap((expectation, index) =>
-    evidence.some((item) => evidenceMatches(item, expectation))
+  const issues: GoldenEvaluationIssue[] = [];
+  if (evidence.length !== expectations.length) {
+    issues.push({
+      path: `${path}.length`,
+      message: `Evidence count differs: expected ${expectations.length}, received ${evidence.length}.`,
+    });
+  }
+  for (const [index, expectation] of expectations.entries()) {
+    const item = evidence[index];
+    if (item === undefined || !evidenceMatches(item, expectation)) {
+      issues.push({
+        path: `${path}[${index}]`,
+        message: `Evidence order/content differs for ${expectation.file}.`,
+      });
+    }
+  }
+  return issues;
+}
+
+function evaluateCompanionProjection(
+  caseId: string,
+  observation: GoldenObservation,
+  priorIssues: readonly GoldenEvaluationIssue[],
+): GoldenEvaluationIssue[] {
+  if (priorIssues.length === 0) {
+    createMissingGoldenProjection(caseId, observation.result);
+  }
+  try {
+    const comparison = compareGoldenProjection(
+      loadExpectedGoldenProjection(caseId),
+      observation.result,
+    );
+    return comparison.matches
       ? []
       : [
           {
-            path: `${path}[${index}]`,
-            message: `No evidence matched ${expectation.file} containing ${expectation.contains}.`,
+            path: comparison.firstDifferencePath ?? 'result',
+            message: 'Full stable projection differs from the companion snapshot.',
           },
-        ],
-  );
+        ];
+  } catch (error: unknown) {
+    return [
+      {
+        path: 'companionSnapshot',
+        message: error instanceof Error ? error.message : String(error),
+      },
+    ];
+  }
 }

 function evaluateSuccess(
@@ -150,6 +193,8 @@ function evaluateSuccess(
     }
   }

+  issues.push(...evaluateCompanionProjection(goldenCase.id, observation, issues));
+
   return issues;
 }

diff --git a/testkit/contracts/index.ts b/testkit/contracts/index.ts
index 1a2ccbb..fcc10c4 100644
--- a/testkit/contracts/index.ts
+++ b/testkit/contracts/index.ts
@@ -1,5 +1,9 @@
 export * from './golden-case.js';
 export * from './golden-evaluator.js';
+export * from './golden-projection.js';
+export * from './evidence-pack-field-contract.js';
+export * from './fixture-completeness.js';
+export * from './fixture-coverage-probes.js';
 export * from './mcp-lifecycle-case.js';
 export * from './mcp-lifecycle-harness.js';
 export * from './mcp-stdio-harness.js';
diff --git a/testkit/contracts/mcp-lifecycle-case.ts b/testkit/contracts/mcp-lifecycle-case.ts
index e9ed9e6..05ceaaa 100644
--- a/testkit/contracts/mcp-lifecycle-case.ts
+++ b/testkit/contracts/mcp-lifecycle-case.ts
@@ -6,7 +6,11 @@ export const McpLifecycleCaseSchema = z
   .strictObject({
     schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
     id: z.string().min(1),
-    scenario: z.enum(['stdio-clean-output', 'graceful-shutdown']),
+    scenario: z.enum([
+      'stdio-clean-output',
+      'graceful-shutdown',
+      'shutdown-cleanup-probe',
+    ]),
     expected: z
       .strictObject({
         stdoutMode: z.literal('mcp-frames-only'),
diff --git a/testkit/contracts/mcp-lifecycle-harness.ts b/testkit/contracts/mcp-lifecycle-harness.ts
index 78f06f4..ae0d5c2 100644
--- a/testkit/contracts/mcp-lifecycle-harness.ts
+++ b/testkit/contracts/mcp-lifecycle-harness.ts
@@ -1,5 +1,11 @@
 import { spawn } from 'node:child_process';
-import { readFileSync } from 'node:fs';
+import {
+  existsSync,
+  mkdtempSync,
+  readFileSync,
+  rmSync,
+} from 'node:fs';
+import { tmpdir } from 'node:os';
 import { resolve } from 'node:path';
 import { performance } from 'node:perf_hooks';

@@ -51,6 +57,85 @@ export interface McpLifecycleObservation {
   readonly stdoutFrames: readonly Readonly<Record<string, unknown>>[];
   readonly stderr: string;
   readonly elapsedMs: number;
+  readonly contextClosed: boolean | null;
+  readonly childrenCleaned: boolean | null;
+}
+
+export interface McpLifecycleEvaluationIssue {
+  readonly path: string;
+  readonly message: string;
+}
+
+export type McpLifecycleProbeFault =
+  | 'skip-context-close'
+  | 'leave-child-running'
+  | 'force-timeout'
+  | 'force-nonzero-exit';
+
+export interface McpLifecycleProbeAudit {
+  readonly directory: string;
+  readonly contextMarker: string;
+  readonly pidFile: string;
+  readonly directPid: number | null;
+  readonly descendantPid: number | null;
+}
+
+export interface McpLifecycleCaseRunnerOptions {
+  readonly probeFault?: McpLifecycleProbeFault;
+  readonly onProbeAudit?: (audit: McpLifecycleProbeAudit) => void;
+}
+
+export function evaluateMcpLifecycleCase(
+  caseInput: McpLifecycleCase,
+  observation: McpLifecycleObservation,
+): readonly McpLifecycleEvaluationIssue[] {
+  const lifecycleCase = McpLifecycleCaseSchema.parse(caseInput);
+  const issues: McpLifecycleEvaluationIssue[] = [];
+  if (observation.exitCode !== lifecycleCase.expected.exitCode) {
+    issues.push({ path: 'exitCode', message: 'Lifecycle exit code differs.' });
+  }
+  if (observation.elapsedMs > lifecycleCase.expected.maxShutdownMs) {
+    issues.push({ path: 'elapsedMs', message: 'Shutdown budget was exceeded.' });
+  }
+  if (observation.stdoutFrames.length === 0) {
+    issues.push({ path: 'stdoutFrames', message: 'No MCP frames were observed.' });
+  }
+  if (lifecycleCase.scenario === 'shutdown-cleanup-probe') {
+    if (observation.contextClosed !== true) {
+      issues.push({
+        path: 'contextClosed',
+        message: 'Application context close probe was not observed.',
+      });
+    }
+    if (observation.childrenCleaned !== true) {
+      issues.push({
+        path: 'childrenCleaned',
+        message: 'Direct/descendant cleanup probe remained alive.',
+      });
+    }
+  }
+  return issues;
+}
+
+export class McpLifecycleCaseRunner {
+  public constructor(
+    private readonly options: McpLifecycleCaseRunnerOptions = {},
+  ) {}
+
+  public async run(caseInput: McpLifecycleCase): Promise<McpLifecycleObservation> {
+    const observation = await runMcpLifecycleProcess(
+      caseInput,
+      this.options.probeFault,
+      this.options.onProbeAudit,
+    );
+    const issues = evaluateMcpLifecycleCase(caseInput, observation);
+    if (issues.length > 0) {
+      throw new Error(
+        issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'),
+      );
+    }
+    return observation;
+  }
 }

 function resolveProductionBin(): {
@@ -69,6 +154,155 @@ function resolveProductionBin(): {
   return { projectRoot, childPath: resolve(projectRoot, packageBin) };
 }

+interface LifecycleProbePaths {
+  readonly directory: string;
+  readonly contextMarker: string;
+  readonly pidFile: string;
+}
+
+interface LifecycleProcess {
+  readonly projectRoot: string;
+  readonly argv: readonly string[];
+  readonly environment: NodeJS.ProcessEnv;
+  readonly probe: LifecycleProbePaths | null;
+}
+
+function resolveLifecycleProcess(
+  lifecycleCase: McpLifecycleCase,
+  probeFault: McpLifecycleProbeFault | undefined,
+): LifecycleProcess {
+  const { childPath, projectRoot } = resolveProductionBin();
+  if (lifecycleCase.scenario !== 'shutdown-cleanup-probe') {
+    return {
+      projectRoot,
+      argv: [childPath],
+      environment: process.env,
+      probe: null,
+    };
+  }
+  const directory = mkdtempSync(resolve(tmpdir(), 'repo-nav-lifecycle-probe-'));
+  const probe = {
+    directory,
+    contextMarker: resolve(directory, 'context-closed.txt'),
+    pidFile: resolve(directory, 'children.json'),
+  } as const;
+  const environment: NodeJS.ProcessEnv = {
+    ...process.env,
+    REPO_NAV_LIFECYCLE_CONTEXT_MARKER: probe.contextMarker,
+    REPO_NAV_LIFECYCLE_PID_FILE: probe.pidFile,
+  };
+  delete environment['REPO_NAV_LIFECYCLE_PROBE_FAULT'];
+  if (probeFault !== undefined) {
+    environment['REPO_NAV_LIFECYCLE_PROBE_FAULT'] = probeFault;
+  }
+  return {
+    projectRoot,
+    argv: [
+      '--import',
+      'tsx',
+      resolve(
+        projectRoot,
+        'testkit',
+        'fixtures',
+        'mcp',
+        'lifecycle-probe.ts',
+      ),
+    ],
+    environment,
+    probe,
+  };
+}
+
+const ProbePidSchema = z.strictObject({
+  directPid: z.int().positive(),
+  descendantPid: z.int().positive(),
+});
+
+function processIsAlive(pid: number): boolean {
+  try {
+    process.kill(pid, 0);
+    return true;
+  } catch {
+    return false;
+  }
+}
+
+async function waitForProbeChildrenToExit(
+  pids: readonly number[],
+): Promise<boolean> {
+  const deadline = performance.now() + 2_000;
+  while (pids.some(processIsAlive) && performance.now() < deadline) {
+    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 20));
+  }
+  return pids.every((pid) => !processIsAlive(pid));
+}
+
+async function inspectLifecycleProbe(
+  probe: LifecycleProbePaths | null,
+  waitForNaturalExit: boolean,
+  onProbeAudit: ((audit: McpLifecycleProbeAudit) => void) | undefined,
+): Promise<{
+  readonly contextClosed: boolean | null;
+  readonly childrenCleaned: boolean | null;
+}> {
+  if (probe === null) {
+    return { contextClosed: null, childrenCleaned: null };
+  }
+  let pids: readonly number[] = [];
+  try {
+    const parsed = ProbePidSchema.safeParse(
+      existsSync(probe.pidFile)
+        ? (JSON.parse(readFileSync(probe.pidFile, 'utf8')) as unknown)
+        : undefined,
+    );
+    if (parsed.success) {
+      pids = [parsed.data.directPid, parsed.data.descendantPid];
+    }
+    onProbeAudit?.({
+      directory: probe.directory,
+      contextMarker: probe.contextMarker,
+      pidFile: probe.pidFile,
+      directPid: parsed.success ? parsed.data.directPid : null,
+      descendantPid: parsed.success ? parsed.data.descendantPid : null,
+    });
+    return {
+      contextClosed:
+        existsSync(probe.contextMarker) &&
+        readFileSync(probe.contextMarker, 'utf8').trim() === 'closed',
+      childrenCleaned:
+        pids.length === 2 &&
+        (waitForNaturalExit
+          ? await waitForProbeChildrenToExit(pids)
+          : pids.every((pid) => !processIsAlive(pid))),
+    };
+  } finally {
+    for (const pid of [...pids].reverse()) {
+      if (processIsAlive(pid)) {
+        try {
+          process.kill(pid, 'SIGKILL');
+        } catch {
+          // The process may exit between the liveness probe and cleanup.
+        }
+      }
+    }
+    const cleaned = await waitForProbeChildrenToExit(pids);
+    rmSync(probe.directory, { recursive: true, force: true });
+    if (!cleaned) {
+      throw new Error('Lifecycle probe final cleanup left a child process alive.');
+    }
+  }
+}
+
+async function cleanupLifecycleProbeAfterSpawnError(
+  probe: LifecycleProbePaths | null,
+  onProbeAudit: ((audit: McpLifecycleProbeAudit) => void) | undefined,
+): Promise<void> {
+  if (probe === null) {
+    return;
+  }
+  await inspectLifecycleProbe(probe, false, onProbeAudit);
+}
+
 export function parseMcpStdoutFrames(
   stdout: string,
 ): readonly Readonly<Record<string, unknown>>[] {
@@ -93,19 +327,23 @@ export function parseMcpStdoutFrames(
   });
 }

-export async function runMcpLifecycleCase(
+async function runMcpLifecycleProcess(
   caseInput: McpLifecycleCase,
+  probeFault?: McpLifecycleProbeFault,
+  onProbeAudit?: (audit: McpLifecycleProbeAudit) => void,
 ): Promise<McpLifecycleObservation> {
   const lifecycleCase = McpLifecycleCaseSchema.parse(caseInput);
-  const { childPath, projectRoot } = resolveProductionBin();
+  const lifecycleProcess = resolveLifecycleProcess(lifecycleCase, probeFault);
+  const { projectRoot } = lifecycleProcess;
   const startedAt = performance.now();

   return await new Promise<McpLifecycleObservation>((resolveObservation, reject) => {
     const child = spawn(
       process.execPath,
-      [childPath],
+      [...lifecycleProcess.argv],
       {
         cwd: projectRoot,
+        env: lifecycleProcess.environment,
         stdio: ['pipe', 'pipe', 'pipe'],
         windowsHide: true,
       },
@@ -115,6 +353,19 @@ export async function runMcpLifecycleCase(
     let timedOut = false;
     let stdoutRemainder = '';
     let shutdownTriggered = false;
+    let completed = false;
+    const probePoll =
+      lifecycleProcess.probe === null
+        ? undefined
+        : setInterval(() => {
+            if (
+              !shutdownTriggered &&
+              existsSync(lifecycleProcess.probe?.pidFile ?? '')
+            ) {
+              shutdownTriggered = true;
+              child.stdin.end();
+            }
+          }, 10);

     child.stdout.setEncoding('utf8');
     child.stderr.setEncoding('utf8');
@@ -154,13 +405,20 @@ export async function runMcpLifecycleCase(
                 arguments: {
                   repoPath: projectRoot,
                   question: 'production-bin-lifecycle',
-                  terms: [],
+                  terms:
+                    lifecycleProcess.probe === null
+                      ? []
+                      : ['lifecycle-probe'],
                 },
               },
             })}\n`,
           );
         }
-        if (frame.id === 3 && !shutdownTriggered) {
+        if (
+          frame.id === 3 &&
+          lifecycleProcess.probe === null &&
+          !shutdownTriggered
+        ) {
           shutdownTriggered = true;
           if (
             lifecycleCase.scenario === 'graceful-shutdown' &&
@@ -183,8 +441,27 @@ export async function runMcpLifecycleCase(
     }, lifecycleCase.expected.maxShutdownMs);

     child.once('error', (error) => {
+      if (completed) {
+        return;
+      }
+      completed = true;
       clearTimeout(timeout);
-      reject(error);
+      if (probePoll !== undefined) {
+        clearInterval(probePoll);
+      }
+      void cleanupLifecycleProbeAfterSpawnError(
+        lifecycleProcess.probe,
+        onProbeAudit,
+      ).then(
+        () => reject(error),
+        (cleanupError: unknown) =>
+          reject(
+            new AggregateError(
+              [error, cleanupError],
+              'Lifecycle process spawn and probe cleanup both failed.',
+            ),
+          ),
+      );
     });
     child.once('spawn', () => {
       child.stdin.write(
@@ -201,39 +478,53 @@ export async function runMcpLifecycleCase(
       );
     });
     child.once('close', (code) => {
-      clearTimeout(timeout);
-      const elapsedMs = performance.now() - startedAt;
-      if (timedOut) {
-        reject(
-          new Error(
-            `MCP lifecycle case exceeded ${lifecycleCase.expected.maxShutdownMs}ms.`,
-          ),
-        );
+      if (completed) {
         return;
       }
-      if (code !== lifecycleCase.expected.exitCode) {
-        reject(
-          new Error(
-            `MCP lifecycle exit code ${code ?? 'null'} did not match ${lifecycleCase.expected.exitCode}.`,
-          ),
-        );
-        return;
+      completed = true;
+      clearTimeout(timeout);
+      if (probePoll !== undefined) {
+        clearInterval(probePoll);
       }
-
-      try {
+      void (async () => {
+        const elapsedMs = performance.now() - startedAt;
+        const probeState =
+          lifecycleProcess.probe === null
+            ? 'no-probe'
+            : `pidFile=${existsSync(lifecycleProcess.probe.pidFile)},contextMarker=${existsSync(lifecycleProcess.probe.contextMarker)}`;
+        const probe = await inspectLifecycleProbe(
+          lifecycleProcess.probe,
+          !timedOut && code === lifecycleCase.expected.exitCode,
+          onProbeAudit,
+        );
+        if (timedOut) {
+          throw new Error(
+            `MCP lifecycle case exceeded ${lifecycleCase.expected.maxShutdownMs}ms (${probeState}, observed=${JSON.stringify(probe)}, stderr=${JSON.stringify(stderr)}, stdout=${JSON.stringify(stdout)}).`,
+          );
+        }
+        if (code !== lifecycleCase.expected.exitCode) {
+          throw new Error(
+            `MCP lifecycle exit code ${code ?? 'null'} did not match ${lifecycleCase.expected.exitCode}.`,
+          );
+        }
         resolveObservation({
           exitCode: code,
           stdoutFrames: parseMcpStdoutFrames(stdout),
           stderr,
           elapsedMs,
+          ...probe,
         });
-      } catch (error: unknown) {
-        reject(error);
-      }
+      })().catch(reject);
     });
   });
 }

+export async function runMcpLifecycleCase(
+  caseInput: McpLifecycleCase,
+): Promise<McpLifecycleObservation> {
+  return await new McpLifecycleCaseRunner().run(caseInput);
+}
+
 export async function runMcpTransportErrorCase(
   maxShutdownMs: number,
 ): Promise<McpLifecycleObservation> {
@@ -292,6 +583,8 @@ export async function runMcpTransportErrorCase(
         stdoutFrames: stdout.length === 0 ? [] : parseMcpStdoutFrames(stdout),
         stderr,
         elapsedMs: performance.now() - startedAt,
+        contextClosed: null,
+        childrenCleaned: null,
       });
     });
   });
diff --git a/testkit/contracts/mcp-tool-result.ts b/testkit/contracts/mcp-tool-result.ts
index 8d64acf..bcdfa3a 100644
--- a/testkit/contracts/mcp-tool-result.ts
+++ b/testkit/contracts/mcp-tool-result.ts
@@ -8,6 +8,8 @@ import {
 export interface ParsedLocateToolResult {
   readonly output: LocateResult;
   readonly isError: boolean;
+  readonly structuredContent: LocateResult;
+  readonly textContent: string;
 }

 export function parseLocateToolResultParity(result: unknown): ParsedLocateToolResult {
@@ -39,5 +41,10 @@ export function parseLocateToolResultParity(result: unknown): ParsedLocateToolRe
   if (!('isError' in result) || typeof result.isError !== 'boolean') {
     throw new Error('MCP tool result did not declare isError.');
   }
-  return { output: structured, isError: result.isError };
+  return {
+    output: structured,
+    isError: result.isError,
+    structuredContent: structured,
+    textContent: first.text,
+  };
 }
diff --git a/testkit/manifests/golden/alias-candidate.yaml b/testkit/manifests/golden/alias-candidate.yaml
index 646b2bc..2ed39a8 100644
--- a/testkit/manifests/golden/alias-candidate.yaml
+++ b/testkit/manifests/golden/alias-candidate.yaml
@@ -21,6 +21,22 @@ expected:
       contains: sourceAlias
       role: related
       reasonCodes: [ALIAS_SOURCE_NEIGHBOR]
+    - file: server/mapping.fixture
+      contains: hcp_name
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER]
+    - file: server/mapping.fixture
+      contains: hcpName
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER, SAME_ENTITY_SIBLING]
+    - file: server/mapping.fixture
+      contains: hcpEmail
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER, SAME_ENTITY_SIBLING]
+    - file: server/mapping.fixture
+      contains: hcp_email
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER]
   forbiddenEvidenceIds:
     - evidence:v1:dc7e46a20ef89e12a87008a440bab96154f961cda087c622bed853b670005291
   requiredCoverageCodes: []
diff --git a/testkit/manifests/golden/false-confirmation-decoys.yaml b/testkit/manifests/golden/false-confirmation-decoys.yaml
index 7c07b6d..dcdbfa5 100644
--- a/testkit/manifests/golden/false-confirmation-decoys.yaml
+++ b/testkit/manifests/golden/false-confirmation-decoys.yaml
@@ -16,10 +16,30 @@ expected:
       contains: targetField == row.source_field
       role: reference
       reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
+    - file: server/decoys.fixture
+      contains: type targetField
+      role: reference
+      reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
+    - file: server/decoys.fixture
+      contains: '// targetField'
+      role: reference
+      reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
+    - file: server/decoys.fixture
+      contains: const example
+      role: reference
+      reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
     - file: server/decoys.fixture
       contains: interface Dto
       role: reference
       reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
+    - file: server/decoys.fixture
+      contains: '@Field'
+      role: reference
+      reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
+    - file: server/decoys.fixture
+      contains: return { targetField }
+      role: reference
+      reasonCodes: [EXACT_TERM_WITHOUT_DIRECT_MAPPING]
   forbiddenEvidenceIds:
     - evidence:v1:b36a0eff65a8c15ff0b0b04c99ac56f18d11fea80e9f6d9e8f25692577f4e8df
   requiredCoverageCodes: []
diff --git a/testkit/manifests/golden/sibling-candidate.yaml b/testkit/manifests/golden/sibling-candidate.yaml
index 8f9df7d..d4f40e0 100644
--- a/testkit/manifests/golden/sibling-candidate.yaml
+++ b/testkit/manifests/golden/sibling-candidate.yaml
@@ -17,10 +17,26 @@ expected:
       role: value-mapping
       reasonCodes: [DIRECT_ALIAS_MAPPING, EXACT_TERM_MATCH]
   candidates:
+    - file: server/mapping.fixture
+      contains: sourceAlias
+      role: related
+      reasonCodes: [ALIAS_SOURCE_NEIGHBOR]
+    - file: server/mapping.fixture
+      contains: hcp_name
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER]
     - file: server/mapping.fixture
       contains: hcpName
       role: related
       reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER, SAME_ENTITY_SIBLING]
+    - file: server/mapping.fixture
+      contains: hcpEmail
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER, SAME_ENTITY_SIBLING]
+    - file: server/mapping.fixture
+      contains: hcp_email
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER]
   forbiddenEvidenceIds:
     - evidence:v1:dc7e46a20ef89e12a87008a440bab96154f961cda087c622bed853b670005291
   requiredCoverageCodes: []
diff --git a/testkit/manifests/golden/sibling-false-positive.yaml b/testkit/manifests/golden/sibling-false-positive.yaml
index dfd612a..2bcd1e9 100644
--- a/testkit/manifests/golden/sibling-false-positive.yaml
+++ b/testkit/manifests/golden/sibling-false-positive.yaml
@@ -16,9 +16,26 @@ expected:
       contains: 'hcpId: row.hcp_id'
       role: value-mapping
   candidates:
+    - file: server/mapping.fixture
+      contains: sourceAlias
+      role: related
+      reasonCodes: [ALIAS_SOURCE_NEIGHBOR]
+    - file: server/mapping.fixture
+      contains: hcp_name
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER]
     - file: server/mapping.fixture
       contains: hcpName
       role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER, SAME_ENTITY_SIBLING]
+    - file: server/mapping.fixture
+      contains: hcpEmail
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER, SAME_ENTITY_SIBLING]
+    - file: server/mapping.fixture
+      contains: hcp_email
+      role: related
+      reasonCodes: [SAME_SCOPE_SIMILAR_IDENTIFIER]
   forbiddenEvidenceIds:
     - evidence:v1:dc7e46a20ef89e12a87008a440bab96154f961cda087c622bed853b670005291
   requiredCoverageCodes: []
diff --git a/testkit/runners/run-vitest-surface.ts b/testkit/runners/run-vitest-surface.ts
index 118a155..4ed340c 100644
--- a/testkit/runners/run-vitest-surface.ts
+++ b/testkit/runners/run-vitest-surface.ts
@@ -3,6 +3,7 @@ import { dirname, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';

 import {
+  RUNNER_GROUP_ALIASES,
   RUNNER_SELECTIONS,
   type RunnerSurface,
 } from './runner-registry.js';
@@ -10,14 +11,27 @@ import {
 interface ParsedSelection {
   readonly groups: readonly string[];
   readonly cases: readonly string[];
+  readonly all: boolean;
+  readonly reportPerformance: boolean;
 }

 function parseSelections(args: readonly string[]): ParsedSelection {
   const groups: string[] = [];
   const cases: string[] = [];
+  let all = false;
+  let reportPerformance = false;

   for (let index = 0; index < args.length; index += 1) {
     const flag = args[index];
+    if (flag === '--all') {
+      all = true;
+      continue;
+    }
+    if (flag === '--report-performance') {
+      reportPerformance = true;
+      continue;
+    }
+
     const value = args[index + 1];

     if (flag !== '--group' && flag !== '--case') {
@@ -35,7 +49,11 @@ function parseSelections(args: readonly string[]): ParsedSelection {
     index += 1;
   }

-  return { groups, cases };
+  if (all && (groups.length > 0 || cases.length > 0)) {
+    throw new Error('--all cannot be combined with --group or --case.');
+  }
+
+  return { groups, cases, all, reportPerformance };
 }

 function assertKnownSelections(
@@ -44,6 +62,10 @@ function assertKnownSelections(
 ): void {
   const registry = RUNNER_SELECTIONS[surface];

+  if (selection.reportPerformance && surface !== 'golden') {
+    throw new Error('--report-performance is only supported by the golden runner.');
+  }
+
   for (const group of selection.groups) {
     if (!registry.groups.has(group)) {
       throw new Error(`Unknown ${surface} test group: ${group}`);
@@ -56,6 +78,14 @@ function assertKnownSelections(
   }
 }

+function expandGroups(
+  surface: RunnerSurface,
+  groups: readonly string[],
+): readonly string[] {
+  const aliases = RUNNER_GROUP_ALIASES[surface];
+  return [...new Set(groups.flatMap((group) => aliases[group] ?? [group]))];
+}
+
 function serializeSelection(values: readonly string[]): string {
   return JSON.stringify(values);
 }
@@ -66,6 +96,10 @@ export async function runVitestSurface(
 ): Promise<number> {
   const selection = parseSelections(args);
   assertKnownSelections(surface, selection);
+  const selectedGroups = selection.all
+    ? []
+    : expandGroups(surface, selection.groups);
+  const selectedCases = selection.all ? [] : selection.cases;

   const repositoryRoot = resolve(
     dirname(fileURLToPath(import.meta.url)),
@@ -89,8 +123,9 @@ export async function runVitestSurface(
         env: {
           ...process.env,
           REPO_NAV_TEST_SURFACE: surface,
-          REPO_NAV_TEST_GROUPS: serializeSelection(selection.groups),
-          REPO_NAV_TEST_CASES: serializeSelection(selection.cases),
+          REPO_NAV_TEST_GROUPS: serializeSelection(selectedGroups),
+          REPO_NAV_TEST_CASES: serializeSelection(selectedCases),
+          REPO_NAV_REPORT_PERFORMANCE: selection.reportPerformance ? '1' : '0',
         },
         stdio: 'inherit',
         windowsHide: true,
diff --git a/testkit/runners/runner-registry.ts b/testkit/runners/runner-registry.ts
index e8f02c4..8728f03 100644
--- a/testkit/runners/runner-registry.ts
+++ b/testkit/runners/runner-registry.ts
@@ -5,6 +5,31 @@ export interface RunnerSelectionRegistry {
   readonly cases: ReadonlySet<string>;
 }

+export const RUNNER_GROUP_ALIASES: Readonly<
+  Record<RunnerSurface, Readonly<Record<string, readonly string[]>>>
+> = Object.freeze({
+  unit: Object.freeze({}),
+  golden: Object.freeze({
+    classification: Object.freeze([
+      'classification',
+      'text-engine-classifier',
+      'text-evidence-engine',
+    ]),
+    candidate: Object.freeze(['candidate', 'candidate-policy']),
+    'backend-transitions': Object.freeze([
+      'backend-transitions',
+      'codegraph-fallback',
+      'text-evidence-engine',
+    ]),
+    security: Object.freeze(['security', 'output-redaction']),
+    'final-status': Object.freeze(['final-status', 'result-limits']),
+  }),
+  mcp: Object.freeze({
+    protocol: Object.freeze(['mcp-surface']),
+    lifecycle: Object.freeze(['lifecycle']),
+  }),
+});
+
 export const RUNNER_SELECTIONS: Readonly<
   Record<RunnerSurface, RunnerSelectionRegistry>
 > = Object.freeze({
@@ -80,6 +105,13 @@ export const RUNNER_SELECTIONS: Readonly<
       'codegraph-fallback',
       'result-limits',
       'output-redaction',
+      'classification',
+      'candidate',
+      'backend-transitions',
+      'security',
+      'final-status',
+      'verification-contract',
+      'performance',
     ]),
     cases: new Set([
       'runner-smoke',
@@ -110,10 +142,20 @@ export const RUNNER_SELECTIONS: Readonly<
       'partial-with-evidence',
       'secret-redaction',
       'redaction-metadata',
+      'manifest-evaluator',
+      'evaluator-negative-self-test',
+      'fixture-completeness',
+      'large-synthetic-repository',
+      'classification-syntax-family',
+      'candidate-family-contract',
+      'backend-transition-family',
+      'security-family-contract',
+      'final-status-family-contract',
+      'contract-code-probes',
     ]),
   }),
   mcp: Object.freeze({
-    groups: new Set(['runner-smoke', 'mcp-surface']),
+    groups: new Set(['runner-smoke', 'mcp-surface', 'protocol', 'lifecycle']),
     cases: new Set([
       'runner-smoke',
       'lifecycle-manifest-schema',
@@ -130,8 +172,10 @@ export const RUNNER_SELECTIONS: Readonly<
       'request-cancellation-cleanup',
       'stdio-clean-output',
       'stdio-graceful-shutdown',
+      'shutdown-cleanup-probe',
       'candidate-minimal-loop',
       'redaction-output-parity',
+      'mcp-golden-adapter',
     ]),
   }),
 });
```

### Staged

```diff
No staged diff.
```

### Untracked Files

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/companion-snapshot-inventory.md`

```
# Companion Snapshot Inventory

每个 success manifest 由同一 `GoldenCaseEvaluator` 读取 `testkit/expected/{case-id}.json` 并对完整 stable projection 做 deep exact comparison。

共 23 项：

- alias-candidate
- backend-unavailable
- codegraph-failed
- codegraph-global-abort-no-fallback
- codegraph-hit-unverified
- codegraph-incomplete
- codegraph-local-timeout-fallback
- codegraph-missing
- codegraph-no-result
- codegraph-secondary-provenance-table
- codegraph-symbol-complete-no-fallback
- exclusion-summary
- false-confirmation-decoys
- foundation-success
- mcp-source-field-mapping
- ripgrep-failed
- ripgrep-incomplete
- ripgrep-timeout
- ripgrep-unavailable
- sibling-candidate
- sibling-false-positive
- source-field-mapping
- text-engine-baseline

Normalization 仅改写 public `repositoryRoot` 为 `<REPOSITORY_ROOT>`；其他 public 字段完整保留。缺 snapshot、孤儿 snapshot、manifest ID 重复均由 `fixture-completeness` 阻塞。
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/evaluator-mutation-report.md`

```
# Evaluator Mutation Report

## 共享语义

- service observation 与真实 stdio MCP observation 都调用 `assertGoldenCase`。
- success/error 由同一 discriminated evaluator 判定；lifecycle 不进入 GoldenCase。
- manifest confirmed/candidates 按 exact length/order 匹配，companion snapshot 再锁定完整 public output。

## Deliberate Failures

`evaluator-negative-self-test` 已证明以下 mutation 非零失败：

- unexpected evidence、wrong evidence order、forbidden ID、missing coverage、low exclusion count；
- wrong nextAction、missing promotion、wrong promotion order；
- wrong discoveredBy order、wrong verifiedBy、wrong operation order；
- error structured/text parity mismatch；
- 43 个 EvidencePack public field mutation（`repositoryRoot` 为唯一有意 normalize 的字段）。

验证：7/7 selected tests passed。
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-completeness-report.md`

```
# Fixture Completeness Report

## 结论

- 状态：passed
- 权威输入：`src/contracts/constants.ts`、`testkit/manifests/coverage/fixture-ownership.yaml`、Golden manifests、companion snapshots、显式 executable schema probes、逐 reason-code evaluator negative probes。
- 79 个 enum/code owner 全部存在；每个 owner 不仅在 runner registry 注册，还必须由该 case 的实际 companion observation、schema parse probe 或 evaluator mutation probe 对目标 `family.code` 产生机器可验证覆盖。
- Confirmed/Candidate reason 的 positive 与 negative owner 全部存在。
- 23 个 success manifest 与 23 个 companion snapshot 一一对应；1 个 error manifest 由共享 evaluator 精确判定 error fields 与 transport parity。
- 43 个 public EvidencePack field mutation 均被 schema 或 exact projection 捕获；唯一 allowlist 是 `repositoryRoot`。
- `fixture-completeness` 禁止充当自身 owner；把任一 code 的 owner 改成无关但已注册 case 会因缺少目标 observation/probe 而失败。
- 每个 success/error manifest 还必须声明一个已注册 runner owner；每个 companion JSON 都通过 LocateResult schema 解析。
- ownership source SHA-256：`ca82eb40e6d518f04019bad512575a925c8ff4d977ee649937fa5085e3b592a0`。

## 两层完整性

1. enum/code owner：RepoLayer、AnchorKind、TermCaseMode、LocateStatus、EvidenceSource、SearchBackendId、EvidenceRole、Confirmed/Candidate/Discovery/Promotion/Operation/Backend/Limit/Exclusion/Redaction/NextAction/ToolError 均由 schema constants 驱动对账，并逐值匹配实际 observation 或 executable probe。
2. public field mutation：schemaVersion、status、normalizedTerms、confirmed/candidates 全字段、provenance、redaction、coverage、nextActions 均有 deliberate mutation；class/reason/ID/order/excerpt 不在 normalization allowlist。

运行时 JSON：`test-artifacts/completeness/mvp-fixture-completeness-v1.json`（gitignored，每次 core test 重建）。
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-family-report.md`

```
# Fixture Family Report

| Family | Positive / boundary coverage | False-positive / failure guard | Runner |
|---|---|---|---|
| classification | assignment、object、SQL、symbol、exact role/reasons | comment、DTO/interface、string、quoted SQL | Golden + unit classifier |
| candidate | sibling、alias、secondary、promotion exact order | unrelated/forbidden ID、budget/permutation | Golden + MCP minimal loop |
| layer/path/security | layer、negative term、redaction 四类、binary/oversized | root escape、unsafe backend path、forbidden scan | Golden + MCP |
| backend transitions | CodeGraph missing/no-result/failed/incomplete/local-timeout、ripgrep unavailable/failed、both unavailable、hit-unverified | global abort no fallback、fixed timeout semantics | Golden |
| final status/limits | ok、partial、no_result、backend_unavailable、timeout；六类 limits owner | empty/evidence variants、exact nextActions | Golden + unit transition matrix |
| protocol/errors | tools/list/schema、success/error parity、四类 typed errors | invalid schema、unsafe detail scrub | MCP |
| lifecycle | production frames-only/EOF/signal/exit/budget；instrumented real Nest context close + in-flight direct/descendant cleanup；idempotence | malformed frames、over-budget、真实跳过 close marker、真实遗留 child tree、forced timeout/nonzero 后 PID 与 temp 清理 | independent lifecycle runner |

运行时 JSON：`test-artifacts/families/mvp-fixture-family-v1.json`。
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/implementation-scope.txt`

```
# F8 implementation scope approved by the feature design.
test/golden
test/mcp
test/unit
testkit/contracts
testkit/expected
testkit/fixtures
testkit/manifests
testkit/performance
testkit/runners
testkit/testing
testkit/baselines
test-artifacts/performance
test-artifacts/completeness
test-artifacts/lifecycle
test-artifacts/families
package.json
.gitignore
.codestable/roadmap/repo-nav-mvp/goal-state.yaml
.codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md
.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml
.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md
.codestable/architecture
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/lifecycle-report.md`

```
# Lifecycle Runner Report

- `McpLifecycleCaseRunner` 与 GoldenCaseEvaluator 分离。
- production bin 实际 stdio 运行验证 frames-only、exitCode=0、shutdown duration ≤ 5000 ms；未安装探针的 production case 对 `contextClosed` / `childrenCleaned` 返回 `null`，不伪造完成状态。
- `shutdown-cleanup-probe` 启动真实 Nest `AppModule`、真实 `NodeMcpStdioHost` 与真实 `NodeSafeProcessRunner`：provider 的 `onModuleDestroy` 写入 context marker，in-flight backend 启动 direct child + descendant，EOF 触发 host abort 后逐 PID 验证两者均已退出。
- probe observation 必须为 `contextClosed=true`、`childrenCleaned=true`；真实跳过 close marker 与真实遗留 child tree 两种 fault injection 均由 runner 拒绝。
- observation/audit 与末端清理分离：正常、fault、timeout、nonzero exit、spawn error 均进入统一 cleanup；timeout/nonzero runner tests 捕获 direct/descendant PID 与 probe temp directory，确认 reject 后两 PID 均退出且目录已删除。
- host overlap、startup queued signal、tracked-call abort/settle、application close、idempotent shutdown、transport parse failure 均由同一 lifecycle family 验证。
- 完整进程树清理同时由 lifecycle probe 和全量 unit `process-cleanup` 覆盖。

运行时报告：

- `test-artifacts/lifecycle/stdio-clean-output.json`
- `test-artifacts/lifecycle/graceful-shutdown.json`
- `test-artifacts/lifecycle/shutdown-cleanup-probe.json`
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-dod-results.json`

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
      "command": "npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case manifest-evaluator --case evaluator-negative-self-test\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ✓ test/golden/mvp-evaluator.spec.ts (7 tests) 48ms\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  7 passed | 55 skipped (62)\n   Start at  18:25:15\n   Duration  925ms (transform 1.12s, setup 0ms, import 6.31s, tests 48ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-EVALUATOR",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group classification --group candidate --group backend-transitions --group security --group final-status\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 36ms\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 44ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 77ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 65ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 109ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 282ms\n\n Test Files  6 passed | 5 skipped (11)\n      Tests  46 passed | 16 skipped (62)\n   Start at  18:25:17\n   Duration  1.15s (transform 963ms, setup 0ms, import 5.68s, tests 613ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-FAMILIES",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --group protocol --group lifecycle",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group protocol --group lifecycle\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 203ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1005ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1003ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1029ms\n     ✓ returns confirmed and bounded candidates with transport parity  1028ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1051ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1050ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1834ms\n     ✓ returns one confirmed mapping through real stdio  1055ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  777ms\n ✓ test/mcp/lifecycle-contract.spec.ts (13 tests | 1 skipped) 1581ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  602ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  476ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  475ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2636ms\n     ✓ does not lose cancellation sent before the handler starts work  1116ms\n     ✓ propagates the SDK request signal to the application service  811ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  707ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3776ms\n     ✓ maps schema-invalid objects to typed parity output  1029ms\n     ✓ preserves the typed code while sanitizing unsafe detail  763ms\n     ✓ preserves the typed code while sanitizing unsafe detail  693ms\n     ✓ turns thrown failures into safe typed parity output  1289ms\n\n Test Files  8 passed | 1 skipped (9)\n      Tests  32 passed | 2 skipped (34)\n   Start at  18:25:21\n   Duration  4.53s (transform 944ms, setup 0ms, import 5.75s, tests 13.11s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-MCP",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/fixture-completeness.spec.ts (1 test) 64ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 61 skipped (62)\n   Start at  18:25:26\n   Duration  928ms (transform 1.05s, setup 0ms, import 6.32s, tests 64ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 34ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 70ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 95ms\n ✓ test/golden/mvp-evaluator.spec.ts (7 tests) 106ms\n ✓ test/golden/fixture-completeness.spec.ts (1 test) 116ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 180ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 127ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 207ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 711ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  392ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1339ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1337ms\n\n Test Files  11 passed (11)\n      Tests  61 passed | 1 skipped (62)\n   Start at  18:25:28\n   Duration  2.19s (transform 1.21s, setup 0ms, import 6.62s, tests 2.99s, environment 2ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 214ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1183ms\n     ✓ returns confirmed and bounded candidates with transport parity  1181ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1190ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1189ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1205ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1203ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1997ms\n     ✓ returns one confirmed mapping through real stdio  1173ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  822ms\n ✓ test/mcp/lifecycle-contract.spec.ts (13 tests) 1720ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  687ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  492ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  506ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2859ms\n     ✓ does not lose cancellation sent before the handler starts work  1237ms\n     ✓ propagates the SDK request signal to the application service  861ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  759ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3996ms\n     ✓ maps schema-invalid objects to typed parity output  1155ms\n     ✓ preserves the typed code while sanitizing unsafe detail  828ms\n     ✓ preserves the typed code while sanitizing unsafe detail  753ms\n     ✓ turns thrown failures into safe typed parity output  1258ms\n\n Test Files  9 passed (9)\n      Tests  34 passed (34)\n   Start at  18:25:33\n   Duration  4.87s (transform 1.12s, setup 0ms, import 6.79s, tests 14.37s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case large-synthetic-repository --report-performance",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case large-synthetic-repository --report-performance\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1199ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1197ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 61 skipped (62)\n   Start at  18:25:38\n   Duration  2.09s (transform 1.16s, setup 0ms, import 7.15s, tests 1.20s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-PERF",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack-results.json`

```
{
  "gate_id": "evidence-pack",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "out": ".codestable\\features\\2026-07-10-mvp-golden-regression-suite\\mvp-golden-regression-suite-evidence-pack.md",
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

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md`

```
---
doc_type: feature-evidence-pack
feature: 2026-07-10-mvp-golden-regression-suite
status: generated
---

# 2026-07-10-mvp-golden-regression-suite evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`
- Checklist: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml`

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
      "command": "npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case manifest-evaluator --case evaluator-negative-self-test\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ✓ test/golden/mvp-evaluator.spec.ts (7 tests) 48ms\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  7 passed | 55 skipped (62)\n   Start at  18:25:15\n   Duration  925ms (transform 1.12s, setup 0ms, import 6.31s, tests 48ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-EVALUATOR",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group classification --group candidate --group backend-transitions --group security --group final-status\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 36ms\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 44ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 77ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 65ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 109ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 282ms\n\n Test Files  6 passed | 5 skipped (11)\n      Tests  46 passed | 16 skipped (62)\n   Start at  18:25:17\n   Duration  1.15s (transform 963ms, setup 0ms, import 5.68s, tests 613ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-FAMILIES",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --group protocol --group lifecycle",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group protocol --group lifecycle\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 203ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1005ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1003ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1029ms\n     ✓ returns confirmed and bounded candidates with transport parity  1028ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1051ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1050ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1834ms\n     ✓ returns one confirmed mapping through real stdio  1055ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  777ms\n ✓ test/mcp/lifecycle-contract.spec.ts (13 tests | 1 skipped) 1581ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  602ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  476ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  475ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2636ms\n     ✓ does not lose cancellation sent before the handler starts work  1116ms\n     ✓ propagates the SDK request signal to the application service  811ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  707ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3776ms\n     ✓ maps schema-invalid objects to typed parity output  1029ms\n     ✓ preserves the typed code while sanitizing unsafe detail  763ms\n     ✓ preserves the typed code while sanitizing unsafe detail  693ms\n     ✓ turns thrown failures into safe typed parity output  1289ms\n\n Test Files  8 passed | 1 skipped (9)\n      Tests  32 passed | 2 skipped (34)\n   Start at  18:25:21\n   Duration  4.53s (transform 944ms, setup 0ms, import 5.75s, tests 13.11s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-MCP",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/fixture-completeness.spec.ts (1 test) 64ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 61 skipped (62)\n   Start at  18:25:26\n   Duration  928ms (transform 1.05s, setup 0ms, import 6.32s, tests 64ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 34ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 70ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 95ms\n ✓ test/golden/mvp-evaluator.spec.ts (7 tests) 106ms\n ✓ test/golden/fixture-completeness.spec.ts (1 test) 116ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 180ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 127ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 207ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 711ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  392ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1339ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1337ms\n\n Test Files  11 passed (11)\n      Tests  61 passed | 1 skipped (62)\n   Start at  18:25:28\n   Duration  2.19s (transform 1.21s, setup 0ms, import 6.62s, tests 2.99s, environment 2ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 214ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1183ms\n     ✓ returns confirmed and bounded candidates with transport parity  1181ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1190ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1189ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1205ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1203ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1997ms\n     ✓ returns one confirmed mapping through real stdio  1173ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  822ms\n ✓ test/mcp/lifecycle-contract.spec.ts (13 tests) 1720ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  687ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  492ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  506ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2859ms\n     ✓ does not lose cancellation sent before the handler starts work  1237ms\n     ✓ propagates the SDK request signal to the application service  861ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  759ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3996ms\n     ✓ maps schema-invalid objects to typed parity output  1155ms\n     ✓ preserves the typed code while sanitizing unsafe detail  828ms\n     ✓ preserves the typed code while sanitizing unsafe detail  753ms\n     ✓ turns thrown failures into safe typed parity output  1258ms\n\n Test Files  9 passed (9)\n      Tests  34 passed (34)\n   Start at  18:25:33\n   Duration  4.87s (transform 1.12s, setup 0ms, import 6.79s, tests 14.37s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case large-synthetic-repository --report-performance",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case large-synthetic-repository --report-performance\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (1 test | 1 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1199ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1197ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 61 skipped (62)\n   Start at  18:25:38\n   Duration  2.09s (transform 1.16s, setup 0ms, import 7.15s, tests 1.20s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-PERF",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

Artifact inventory：

- `fixture-completeness-report.md` + runtime completeness JSON：79 owners、23 snapshot pairs、43 field mutations。
- `companion-snapshot-inventory.md`：全部 success manifest 的 full stable projection。
- `evaluator-mutation-report.md`：unexpected/order/forbidden/coverage/exclusion/action/promotion/provenance/parity negative evidence。
- `fixture-family-report.md`：classification/candidate/backend/security/status/protocol/lifecycle matrix。
- `lifecycle-report.md` + 两个 runtime lifecycle JSON。
- `performance-baseline-report.md`、fixed generator manifest、runtime performance JSON、committed baseline JSON。
- `mvp-golden-regression-suite-implementation.md`：step evidence 与全量 suite summary。

## 4. Scope And Cleanliness

Design bytes: 13967
Checklist bytes: 5204

## 5. Residual Risks

- Synthetic 1000-file timing 是当前 Windows/Node 环境的趋势信号，不代表真实 monorepo SLA；timing delta 明确 non-blocking。
- archguard/meta-cc provider unavailable；本轮无 production architecture semantics change，已由 exact diff、full unit/Golden/MCP 和独立 review 接管。

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
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".gitignore",
        "test/mcp/lifecycle-contract.spec.ts",
        "testkit/contracts/golden-evaluator.ts",
        "testkit/contracts/index.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/contracts/mcp-tool-result.ts",
        "testkit/manifests/golden/alias-candidate.yaml",
        "testkit/manifests/golden/false-confirmation-decoys.yaml",
        "testkit/manifests/golden/sibling-candidate.yaml",
        "testkit/manifests/golden/sibling-false-positive.yaml",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/companion-snapshot-inventory.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/evaluator-mutation-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-completeness-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-family-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/implementation-scope.txt",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/lifecycle-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-implementation.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/performance-baseline-report.md",
        "test/golden/fixture-completeness.spec.ts",
        "test/golden/large-synthetic-repository.spec.ts",
        "test/golden/mvp-evaluator.spec.ts",
        "test/golden/mvp-regression-families.spec.ts",
        "test/mcp/mcp-golden-adapter.spec.ts",
        "testkit/baselines/performance/large-synthetic-repository-v1.json",
        "testkit/contracts/evidence-pack-field-contract.ts",
        "testkit/contracts/fixture-completeness.ts",
        "testkit/contracts/golden-projection.ts",
        "testkit/expected/alias-candidate.json",
        "testkit/expected/backend-unavailable.json",
        "testkit/expected/codegraph-failed.json",
        "testkit/expected/codegraph-global-abort-no-fallback.json",
        "testkit/expected/codegraph-hit-unverified.json",
        "testkit/expected/codegraph-incomplete.json",
        "testkit/expected/codegraph-local-timeout-fallback.json",
        "testkit/expected/codegraph-missing.json",
        "testkit/expected/codegraph-no-result.json",
        "testkit/expected/codegraph-secondary-provenance-table.json",
        "testkit/expected/codegraph-symbol-complete-no-fallback.json",
        "testkit/expected/exclusion-summary.json",
        "testkit/expected/false-confirmation-decoys.json",
        "testkit/expected/foundation-success.json",
        "testkit/expected/mcp-source-field-mapping.json",
        "testkit/expected/ripgrep-failed.json",
        "testkit/expected/ripgrep-incomplete.json",
        "testkit/expected/ripgrep-timeout.json",
        "testkit/expected/ripgrep-unavailable.json",
        "testkit/expected/sibling-candidate.json",
        "testkit/expected/sibling-false-positive.json",
        "testkit/expected/source-field-mapping.json",
        "testkit/expected/text-engine-baseline.json",
        "testkit/manifests/golden/mcp-source-field-mapping.yaml",
        "testkit/manifests/performance/large-synthetic-repository-v1.yaml",
        "testkit/performance/large-synthetic-repository.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-dod-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite",
        "test/golden",
        "test/mcp",
        "test/unit",
        "testkit/contracts",
        "testkit/expected",
        "testkit/fixtures",
        "testkit/manifests",
        "testkit/performance",
        "testkit/runners",
        "testkit/testing",
        "testkit/baselines",
        "test-artifacts/performance",
        "test-artifacts/completeness",
        "test-artifacts/lifecycle",
        "test-artifacts/families",
        "package.json",
        ".gitignore",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        ".codestable/architecture"
      ]
    }
  ],
  "providers": {}
}
```
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-gate-results.json`

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
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".gitignore",
        "test/mcp/lifecycle-contract.spec.ts",
        "testkit/contracts/golden-evaluator.ts",
        "testkit/contracts/index.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/contracts/mcp-tool-result.ts",
        "testkit/manifests/golden/alias-candidate.yaml",
        "testkit/manifests/golden/false-confirmation-decoys.yaml",
        "testkit/manifests/golden/sibling-candidate.yaml",
        "testkit/manifests/golden/sibling-false-positive.yaml",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/companion-snapshot-inventory.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/evaluator-mutation-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-completeness-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-family-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/implementation-scope.txt",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/lifecycle-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-implementation.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/performance-baseline-report.md",
        "test/golden/fixture-completeness.spec.ts",
        "test/golden/large-synthetic-repository.spec.ts",
        "test/golden/mvp-evaluator.spec.ts",
        "test/golden/mvp-regression-families.spec.ts",
        "test/mcp/mcp-golden-adapter.spec.ts",
        "testkit/baselines/performance/large-synthetic-repository-v1.json",
        "testkit/contracts/evidence-pack-field-contract.ts",
        "testkit/contracts/fixture-completeness.ts",
        "testkit/contracts/golden-projection.ts",
        "testkit/expected/alias-candidate.json",
        "testkit/expected/backend-unavailable.json",
        "testkit/expected/codegraph-failed.json",
        "testkit/expected/codegraph-global-abort-no-fallback.json",
        "testkit/expected/codegraph-hit-unverified.json",
        "testkit/expected/codegraph-incomplete.json",
        "testkit/expected/codegraph-local-timeout-fallback.json",
        "testkit/expected/codegraph-missing.json",
        "testkit/expected/codegraph-no-result.json",
        "testkit/expected/codegraph-secondary-provenance-table.json",
        "testkit/expected/codegraph-symbol-complete-no-fallback.json",
        "testkit/expected/exclusion-summary.json",
        "testkit/expected/false-confirmation-decoys.json",
        "testkit/expected/foundation-success.json",
        "testkit/expected/mcp-source-field-mapping.json",
        "testkit/expected/ripgrep-failed.json",
        "testkit/expected/ripgrep-incomplete.json",
        "testkit/expected/ripgrep-timeout.json",
        "testkit/expected/ripgrep-unavailable.json",
        "testkit/expected/sibling-candidate.json",
        "testkit/expected/sibling-false-positive.json",
        "testkit/expected/source-field-mapping.json",
        "testkit/expected/text-engine-baseline.json",
        "testkit/manifests/golden/mcp-source-field-mapping.yaml",
        "testkit/manifests/performance/large-synthetic-repository-v1.yaml",
        "testkit/performance/large-synthetic-repository.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-dod-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite",
        "test/golden",
        "test/mcp",
        "test/unit",
        "testkit/contracts",
        "testkit/expected",
        "testkit/fixtures",
        "testkit/manifests",
        "testkit/performance",
        "testkit/runners",
        "testkit/testing",
        "testkit/baselines",
        "test-artifacts/performance",
        "test-artifacts/completeness",
        "test-artifacts/lifecycle",
        "test-artifacts/families",
        "package.json",
        ".gitignore",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        ".codestable/architecture"
      ]
    }
  ],
  "providers": {}
}
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-implementation.md`

```
---
doc_type: feature-implementation
feature: 2026-07-10-mvp-golden-regression-suite
status: in-progress
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
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-review-packet.md`

```
[large file omitted]
```

#### `.codestable/features/2026-07-10-mvp-golden-regression-suite/performance-baseline-report.md`

```
# Large Synthetic Performance Baseline

## 固定 corpus

- seed：20260710
- source files：1000
- modules：50
- direct mappings：10
- named decoys：200
- size distribution：500 small / 350 medium / 150 large
- generator config hash：`f359ff248dfb9ba073b7d36881058ff48ec240bd1e3b6660c9bcccc4194c8a86`
- corpus hash：`3a66ce5d9121dba0d833acc9a1429d70e1ee03eff9e278db60ee6015b48e8c5e`

## Blocking correctness

- warmup=1，measuredRuns=5。
- 5 次 stable projection hash 均为 `8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c`。
- exact result：status=`partial`、confirmed=10、candidates=10、limitsReached=`MAX_FILES_REACHED`。
- fixture cleanup：attempted/succeeded/removed 全 true。

## Non-blocking timing

- committed baseline：median 61.88 ms、p95 70.85 ms、peak RSS 128,516,096 bytes。
- 最新 QA 前运行：median 70.24 ms、p95 79.98 ms、peak RSS 125,079,552 bytes。
- timing trend 仅报告，不设单次硬阈值；config/corpus/projection drift 才阻塞。

Committed baseline：`testkit/baselines/performance/large-synthetic-repository-v1.json`。运行时报告：`test-artifacts/performance/large-synthetic-repository-v1.json`（test 不覆盖 committed baseline）。
```

#### `test/golden/fixture-completeness.spec.ts`

```
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  buildFixtureCompletenessReport,
  runContractSchemaProbes,
  writeFixtureCompletenessReport,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'verification-contract',
  caseId: 'fixture-completeness',
} as const;

const probeIdentity = {
  group: 'verification-contract',
  caseId: 'contract-code-probes',
} as const;

describe.runIf(isSelected(probeIdentity))('contract enum/code probes', () => {
  it('executes every explicit schema probe independently of owner declarations', () => {
    expect(runContractSchemaProbes()).toHaveLength(79);
  });
});

describe.runIf(isSelected(identity))('MVP fixture completeness', () => {
  it('derives enum/code ownership and companion coverage without group-name inference', () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const report = buildFixtureCompletenessReport(repositoryRoot);
    const reportPath = writeFixtureCompletenessReport(repositoryRoot, report);

    expect(report.status).toBe('passed');
    expect(report.owners.length).toBeGreaterThan(70);
    expect(report.successManifestIds).toEqual(report.companionSnapshotIds);
    expect(
      report.owners
        .filter(({ family }) =>
          family === 'ConfirmedReasonCode' || family === 'CandidateReasonCode',
        )
        .every(({ negative }) => negative !== undefined),
    ).toBe(true);
    expect(report.publicEvidencePackFieldMutations.length).toBeGreaterThan(40);
    expect(reportPath).toContain('test-artifacts');
  });

  it('rejects an unrelated registered case masquerading as a code owner', () => {
    const repositoryRoot = resolve(import.meta.dirname, '..', '..');
    const ownershipText = readFileSync(
      resolve(
        repositoryRoot,
        'testkit',
        'manifests',
        'coverage',
        'fixture-ownership.yaml',
      ),
      'utf8',
    );
    const unrelatedOwner = parse(
      ownershipText.replace(
        'SECRET_LIKE_VALUE: {positive: contract-code-probes}',
        'SECRET_LIKE_VALUE: {positive: source-field-mapping}',
      ),
    ) as unknown;
    expect(() =>
      buildFixtureCompletenessReport(repositoryRoot, unrelatedOwner),
    ).toThrow(/no machine-verified assertion/iu);
  });
});
```

#### `test/golden/large-synthetic-repository.spec.ts`

```
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runLargeSyntheticPerformance,
  writeSyntheticPerformanceReport,
} from '../../testkit/performance/large-synthetic-repository.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'performance',
  caseId: 'large-synthetic-repository',
} as const;

describe.runIf(isSelected(identity))('large synthetic repository', () => {
  it(
    'keeps five real-engine projections stable and records environment-aware timing',
    async () => {
      const repositoryRoot = resolve(import.meta.dirname, '..', '..');
      const fixtureRoot = mkdtempSync(
        resolve(tmpdir(), 'repo-nav-large-synthetic-'),
      );
      const report = await runLargeSyntheticPerformance(
        repositoryRoot,
        fixtureRoot,
      );

      expect(report.runs).toHaveLength(5);
      expect(new Set(report.runs.map(({ projectionHash }) => projectionHash)).size).toBe(1);
      expect(report.cleanup).toEqual({
        attempted: true,
        succeeded: true,
        fixtureRemoved: true,
      });
      expect(report.trend.timingIsBlocking).toBe(false);
      if (process.env['REPO_NAV_REPORT_PERFORMANCE'] === '1') {
        expect(writeSyntheticPerformanceReport(repositoryRoot, report)).toContain(
          'large-synthetic-repository-v1.json',
        );
      }
    },
    120_000,
  );
});
```

#### `test/golden/mvp-evaluator.spec.ts`

```
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { LocateResultSchema } from '../../src/contracts/index.js';
import {
  GoldenCaseSchema,
  PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS,
  REASON_CODE_NEGATIVE_PROBES,
  assertGoldenCase,
  applyEvidencePackFieldMutation,
  compareGoldenProjection,
  createEvidencePackMutationFixture,
  createStableGoldenProjection,
  type GoldenCase,
  type GoldenObservation,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const manifestRoot = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');
const expectedRoot = resolve(repositoryRoot, 'testkit', 'expected');

function loadCase(caseId: string): GoldenCase {
  const input: unknown = parse(
    readFileSync(resolve(manifestRoot, `${caseId}.yaml`), 'utf8'),
  );
  return GoldenCaseSchema.parse(input);
}

function loadSuccessResult(caseId: string) {
  const input: unknown = JSON.parse(
    readFileSync(resolve(expectedRoot, `${caseId}.json`), 'utf8'),
  );
  const result = LocateResultSchema.parse(input);
  if (!result.ok) {
    throw new Error(`${caseId} must contain a successful projection.`);
  }
  return result;
}

function observe(result: unknown, mcpIsError = false): GoldenObservation {
  const parsed = LocateResultSchema.parse(result);
  return {
    result: parsed,
    mcpIsError,
    structuredContent: parsed,
    textContent: JSON.stringify(parsed),
  };
}

function observeUnchecked(result: unknown, mcpIsError = false): unknown {
  return {
    result,
    mcpIsError,
    structuredContent: result,
    textContent: JSON.stringify(result),
  };
}

function successCase(caseId: string): GoldenSuccessCase {
  const goldenCase = loadCase(caseId);
  if (goldenCase.kind !== 'success') {
    throw new Error(`${caseId} must be a success case.`);
  }
  return goldenCase;
}

const evaluatorIdentity = {
  group: 'verification-contract',
  caseId: 'manifest-evaluator',
} as const;

describe.runIf(isSelected(evaluatorIdentity))('shared GoldenCaseEvaluator', () => {
  it('uses one public evaluator for success/error and normalizes only repositoryRoot', () => {
    const success = successCase('manifest-schema-success');
    const successResult = loadSuccessResult('foundation-success');
    const relocated = {
      ...successResult,
      evidence: {
        ...successResult.evidence,
        repositoryRoot: 'D:/temporary/repo-nav-fixture',
      },
    };
    expect(() => assertGoldenCase(success, observe(relocated))).not.toThrow();

    const errorCase = loadCase('manifest-schema-error');
    const errorResult = {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'terms must contain at least one item.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    } as const;
    expect(() =>
      assertGoldenCase(errorCase, observe(errorResult, true)),
    ).not.toThrow();
  });

  it('requires a reviewed companion snapshot for every success manifest', () => {
    const successManifests = readFileSync(
      resolve(manifestRoot, 'manifest-schema-success.yaml'),
      'utf8',
    );
    expect(successManifests).toContain('kind: success');
    expect(() => loadSuccessResult('foundation-success')).not.toThrow();
  });
});

const negativeIdentity = {
  group: 'verification-contract',
  caseId: 'evaluator-negative-self-test',
} as const;

describe.runIf(isSelected(negativeIdentity))(
  'GoldenCaseEvaluator deliberate failures',
  () => {
    it('rejects unexpected evidence, wrong order, forbidden IDs, coverage, and exclusions', () => {
      const candidateCase = successCase('sibling-candidate');
      const candidateResult = loadSuccessResult('sibling-candidate');
      const firstCandidate = candidateResult.evidence.candidates[0];
      if (firstCandidate === undefined) {
        throw new Error('Expected a candidate fixture.');
      }

      const unexpected = {
        ...candidateResult,
        evidence: {
          ...candidateResult.evidence,
          candidates: [
            ...candidateResult.evidence.candidates,
            { ...firstCandidate, id: `evidence:v1:${'a'.repeat(64)}` },
          ],
        },
      };
      expect(() => assertGoldenCase(candidateCase, observe(unexpected))).toThrow(
        /count|projection/iu,
      );

      const wrongOrder = {
        ...candidateResult,
        evidence: {
          ...candidateResult.evidence,
          candidates: [...candidateResult.evidence.candidates].reverse(),
        },
      };
      expect(() => assertGoldenCase(candidateCase, observe(wrongOrder))).toThrow(
        /order|projection/iu,
      );

      const forbiddenCase = GoldenCaseSchema.parse({
        ...candidateCase,
        expected: {
          ...candidateCase.expected,
          forbiddenEvidenceIds: [firstCandidate.id],
        },
      });
      expect(() =>
        assertGoldenCase(forbiddenCase, observe(candidateResult)),
      ).toThrow(/forbidden/iu);

      const missingCoverageCase = GoldenCaseSchema.parse({
        ...candidateCase,
        expected: {
          ...candidateCase.expected,
          requiredCoverageCodes: ['BACKEND_PROCESS_FAILED'],
        },
      });
      expect(() =>
        assertGoldenCase(missingCoverageCase, observe(candidateResult)),
      ).toThrow(/coverage/iu);

      const lowExclusionCase = GoldenCaseSchema.parse({
        ...candidateCase,
        expected: {
          ...candidateCase.expected,
          minimumExclusionCounts: { UNVERIFIED_FILE_CONTENT: 99 },
        },
      });
      expect(() =>
        assertGoldenCase(lowExclusionCase, observe(candidateResult)),
      ).toThrow(/exclusion/iu);
    });

    it('rejects nextAction and promotion missing/order mutations', () => {
      const goldenCase = successCase('sibling-candidate');
      const result = loadSuccessResult('sibling-candidate');
      const first = result.evidence.candidates[0];
      if (first === undefined) {
        throw new Error('Expected a candidate fixture.');
      }

      const wrongAction = {
        ...result,
        evidence: { ...result.evidence, nextActions: ['ADD_TERM'] },
      };
      expect(() => assertGoldenCase(goldenCase, observe(wrongAction))).toThrow(
        /nextActions|projection/iu,
      );

      const missingPromotion: unknown = {
        ...result,
        evidence: {
          ...result.evidence,
          candidates: [
            { ...first, promotionRequirements: undefined },
            ...result.evidence.candidates.slice(1),
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observeUnchecked(missingPromotion)),
      ).toThrow();

      const wrongPromotionOrder = {
        ...result,
        evidence: {
          ...result.evidence,
          candidates: [
            {
              ...first,
              promotionRequirements: [...first.promotionRequirements].reverse(),
            },
            ...result.evidence.candidates.slice(1),
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observe(wrongPromotionOrder)),
      ).toThrow(/promotionRequirements|projection/iu);
    });

    it('rejects provenance source, verifiedBy, and operation ordering mutations', () => {
      const goldenCase = successCase('codegraph-incomplete');
      const result = loadSuccessResult('codegraph-incomplete');
      const first = result.evidence.confirmed[0];
      if (first === undefined) {
        throw new Error('Expected confirmed provenance fixture.');
      }

      const wrongSourceOrder = {
        ...result,
        evidence: {
          ...result.evidence,
          confirmed: [
            {
              ...first,
              provenance: {
                ...first.provenance,
                discoveredBy: [...first.provenance.discoveredBy].reverse(),
              },
            },
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observe(wrongSourceOrder)),
      ).toThrow(/discoveredBy|projection/iu);

      const wrongOperationOrder = {
        ...result,
        evidence: {
          ...result.evidence,
          confirmed: [
            {
              ...first,
              provenance: {
                ...first.provenance,
                operations: [...first.provenance.operations].reverse(),
              },
            },
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observe(wrongOperationOrder)),
      ).toThrow(/operations|projection/iu);

      const wrongVerifiedBy: unknown = {
        ...result,
        evidence: {
          ...result.evidence,
          confirmed: [
            {
              ...first,
              provenance: { ...first.provenance, verifiedBy: 'backend' },
            },
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observeUnchecked(wrongVerifiedBy)),
      ).toThrow();
    });

    it('rejects error structured/text parity mismatches', () => {
      const errorCase = loadCase('manifest-schema-error');
      const result = LocateResultSchema.parse({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'safe error',
          recoverable: true,
          suggestedAction: 'ADD_TERM',
        },
      });
      const mismatch = {
        result,
        mcpIsError: true,
        structuredContent: result,
        textContent: JSON.stringify({ ok: true }),
      };
      expect(() => assertGoldenCase(errorCase, mismatch)).toThrow(
        /parity|differ/iu,
      );
    });

    it('detects every public EvidencePack field mutation except the root allowlist', () => {
      const fixture = createEvidencePackMutationFixture();
      const expected = createStableGoldenProjection(fixture);
      for (const mutation of PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS) {
        const mutated = applyEvidencePackFieldMutation(fixture, mutation);
        const parsed = LocateResultSchema.safeParse(mutated);
        if (mutation.normalized) {
          expect(parsed.success, mutation.path).toBe(true);
          if (parsed.success) {
            expect(
              compareGoldenProjection(expected, parsed.data).matches,
              mutation.path,
            ).toBe(true);
          }
          continue;
        }
        if (parsed.success) {
          expect(
            compareGoldenProjection(expected, parsed.data).matches,
            mutation.path,
          ).toBe(false);
        } else {
          expect(parsed.error.issues.length, mutation.path).toBeGreaterThan(0);
        }
      }
    });

    it('runs a deliberate false-positive mutation for every confirmed/candidate reason code', () => {
      const fixture = createEvidencePackMutationFixture();
      for (const probe of REASON_CODE_NEGATIVE_PROBES) {
        const path =
          probe.family === 'ConfirmedReasonCode'
            ? 'evidence.confirmed.0.reasonCodes'
            : 'evidence.candidates.0.reasonCodes';
        const alternate = REASON_CODE_NEGATIVE_PROBES.find(
          (candidate) =>
            candidate.family === probe.family && candidate.code !== probe.code,
        );
        if (alternate === undefined) {
          throw new Error(`Missing alternate negative probe for ${probe.family}.`);
        }
        const baseline = LocateResultSchema.parse(
          applyEvidencePackFieldMutation(fixture, {
            path,
            replacement: [alternate.code],
            normalized: false,
          }),
        );
        const expected = createStableGoldenProjection(baseline);
        const mutated = applyEvidencePackFieldMutation(baseline, {
          path,
          replacement: [alternate.code, probe.code],
          normalized: false,
        });
        const parsed = LocateResultSchema.parse(mutated);
        expect(
          compareGoldenProjection(expected, parsed).matches,
          `${probe.family}.${probe.code}`,
        ).toBe(false);
      }
    });
  },
);
```

#### `test/golden/mvp-regression-families.spec.ts`

```
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createDiscoveryKey,
  LocateResultSchema,
  type EvidenceLocation,
  type NormalizedSearchTerm,
} from '../../src/contracts/index.js';
import {
  classifyDiscoveryRecords,
} from '../../src/evidence/direct-mapping-classifier.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import { redactPublicText } from '../../src/evidence/evidence-redactor.js';
import { evaluateLocateStatus } from '../../src/evidence/locate-status-evaluator.js';
import { buildFixtureCompletenessReport } from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const mappingTerms: readonly NormalizedSearchTerm[] = [
  { value: 'targetField', caseSensitive: false },
  { value: 'row.source_field', caseSensitive: false },
];

function record(file: string, excerpt: string): DiscoveryRecord {
  const location: EvidenceLocation = {
    file,
    lines: [1, excerpt.split('\n').length],
    excerpt,
  };
  return {
    discoveryKey: createDiscoveryKey(location),
    location,
    discoveredBy: ['ripgrep'],
    operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    discoveryReasonCodes: ['LITERAL_TERM_HIT'],
    matchedTerms: mappingTerms,
    focusLines: location.lines,
    focusExcerpt: excerpt,
    canonicalSymbols: [],
  };
}

describe.runIf(
  isSelected({ group: 'classification', caseId: 'classification-syntax-family' }),
)('classification syntax family', () => {
  it('confirms assignment/object/SQL and rejects executable-looking decoys', () => {
    const positives = [
      ['server/assignment.ts', 'targetField = row.source_field;'],
      ['server/object.ts', 'return { targetField: row.source_field };'],
      ['db/mapping.sql', 'SELECT row.source_field AS targetField FROM source'],
    ] as const;
    for (const [file, excerpt] of positives) {
      const classified = classifyDiscoveryRecords([record(file, excerpt)], {
        anchors: [],
        layers: [],
        negativeTerms: [],
      });
      expect(classified.confirmed, excerpt).toHaveLength(1);
      expect(classified.candidates, excerpt).toEqual([]);
    }

    for (const excerpt of [
      '// targetField = row.source_field;',
      'interface Dto { targetField: row.source_field }',
      'const example = "targetField = row.source_field";',
      "SELECT 'row.source_field AS targetField' AS note",
    ]) {
      const classified = classifyDiscoveryRecords(
        [record(excerpt.startsWith('SELECT') ? 'db/decoy.sql' : 'server/decoy.ts', excerpt)],
        { anchors: [], layers: [], negativeTerms: [] },
      );
      expect(classified.confirmed, excerpt).toEqual([]);
      expect(classified.candidates, excerpt).toHaveLength(1);
    }
  });
});

describe.runIf(
  isSelected({ group: 'candidate', caseId: 'candidate-family-contract' }),
)('candidate family contract', () => {
  it('keeps promotion order exact and the locked false-positive ID absent', () => {
    const result = LocateResultSchema.parse(
      JSON.parse(
        readFileSync(
          resolve(repositoryRoot, 'testkit', 'expected', 'sibling-candidate.json'),
          'utf8',
        ),
      ) as unknown,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a successful candidate snapshot.');
    }
    expect(result.evidence.candidates).toHaveLength(5);
    expect(result.evidence.candidates[0]?.promotionRequirements).toEqual([
      'USER_SEMANTIC_CONFIRMATION',
      'DIRECT_REFERENCE_REQUIRED',
    ]);
    expect(result.evidence.candidates.map(({ id }) => id)).not.toContain(
      'evidence:v1:dc7e46a20ef89e12a87008a440bab96154f961cda087c622bed853b670005291',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'backend-transitions',
    caseId: 'backend-transition-family',
  }),
)('backend transition family', () => {
  it('owns every public backend transition reason through a registered case', () => {
    const report = buildFixtureCompletenessReport(repositoryRoot);
    const backendOwners = report.owners.filter(
      ({ family }) => family === 'BackendReasonCode',
    );
    expect(backendOwners).toHaveLength(7);
    expect(new Set(backendOwners.map(({ positive }) => positive)).size).toBeGreaterThan(4);
  });
});

describe.runIf(
  isSelected({ group: 'security', caseId: 'security-family-contract' }),
)('security family contract', () => {
  it('exercises all four redaction families without retaining forbidden values', () => {
    const cases = [
      ['api_key=[REDACTED]', 'SECRET_LIKE_VALUE', 'rawSecretValue'],
      ['postgres://admin:dbPassword@localhost/app', 'CONNECTION_STRING', 'dbPassword'],
      ['owner=stan.guo@mail.ru', 'PERSONAL_DATA', 'stan.guo@mail.ru'],
      [`payload=${'x'.repeat(2_049)}`, 'BINARY_OR_OVERSIZED_CONTENT', 'x'.repeat(64)],
    ] as const;
    for (const [input, reason, forbidden] of cases) {
      const output = redactPublicText(input);
      expect(output.reasonCodes, reason).toContain(reason);
      expect(output.value, reason).not.toContain(forbidden);
    }
  });
});

describe.runIf(
  isSelected({ group: 'final-status', caseId: 'final-status-family-contract' }),
)('final status family contract', () => {
  it('covers every recoverable final status and emits the family inventory', () => {
    const evaluations = [
      evaluateLocateStatus({
        abortSource: 'none',
        finalBackendHealth: { state: 'available' },
        strategyComplete: true,
        evidenceCount: 1,
        limitsReached: [],
      }),
      evaluateLocateStatus({
        abortSource: 'none',
        finalBackendHealth: { state: 'available' },
        strategyComplete: false,
        evidenceCount: 1,
        limitsReached: [],
      }),
      evaluateLocateStatus({
        abortSource: 'none',
        finalBackendHealth: { state: 'available' },
        strategyComplete: true,
        evidenceCount: 0,
        limitsReached: [],
      }),
      evaluateLocateStatus({
        abortSource: 'none',
        finalBackendHealth: { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' },
        strategyComplete: false,
        evidenceCount: 0,
        limitsReached: [],
      }),
      evaluateLocateStatus({
        abortSource: 'caller',
        finalBackendHealth: { state: 'available' },
        strategyComplete: true,
        evidenceCount: 1,
        limitsReached: [],
      }),
    ];
    expect(evaluations.map(({ status }) => status)).toEqual([
      'ok',
      'partial',
      'no_result',
      'backend_unavailable',
      'timeout',
    ]);

    const outputDirectory = resolve(repositoryRoot, 'test-artifacts', 'families');
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      resolve(outputDirectory, 'mvp-fixture-family-v1.json'),
      `${JSON.stringify(
        {
          schemaVersion: '1.0',
          families: {
            classification: ['assignment', 'object', 'sql', 'symbol', 'decoy'],
            candidate: ['sibling', 'alias', 'false-positive', 'promotion-order'],
            backendTransitions: [
              'codegraph-missing',
              'codegraph-no-result',
              'codegraph-failed',
              'codegraph-incomplete',
              'ripgrep-unavailable',
              'both-unavailable',
              'hit-unverified',
            ],
            security: ['layer-path', 'redaction', 'binary', 'oversized'],
            finalStatus: evaluations.map(({ status }) => status),
            protocol: ['schema', 'success-error-parity', 'typed-errors'],
            lifecycle: ['frames', 'exit', 'context-close', 'child-cleanup'],
          },
          status: 'passed',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  });
});
```

#### `test/mcp/mcp-golden-adapter.spec.ts`

```
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  GoldenCaseSchema,
  assertGoldenCase,
  connectMcpStdioFixture,
  parseLocateToolResultParity,
  type GoldenCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'mcp-surface',
  caseId: 'mcp-golden-adapter',
} as const;

function loadCase(name: string): GoldenCase {
  const input: unknown = parse(
    readFileSync(
      resolve(
        import.meta.dirname,
        '..',
        '..',
        'testkit',
        'manifests',
        'golden',
        name,
      ),
      'utf8',
    ),
  );
  return GoldenCaseSchema.parse(input);
}

describe.runIf(isSelected(identity))('MCP Golden observation adapter', () => {
  it('feeds both success and error transport observations to the shared evaluator', async () => {
    const session = await connectMcpStdioFixture();
    try {
      const successRaw = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'source-field-mapping',
          terms: ['hcp_id', 'hcpId'],
        },
      });
      const success = parseLocateToolResultParity(successRaw);
      expect(() =>
        assertGoldenCase(loadCase('mcp-source-field-mapping.yaml'), {
          result: success.output,
          mcpIsError: success.isError,
          structuredContent: success.structuredContent,
          textContent: success.textContent,
        }),
      ).not.toThrow();

      const errorRaw = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'missing terms',
          terms: [],
        },
      });
      const error = parseLocateToolResultParity(errorRaw);
      expect(() =>
        assertGoldenCase(loadCase('manifest-schema-error.yaml'), {
          result: error.output,
          mcpIsError: error.isError,
          structuredContent: error.structuredContent,
          textContent: error.textContent,
        }),
      ).not.toThrow();
    } finally {
      await session.close();
    }
  });
});
```

#### `testkit/baselines/performance/large-synthetic-repository-v1.json`

```
{
  "schemaVersion": "1.0",
  "caseId": "large-synthetic-repository-v1",
  "generator": {
    "seed": 20260710,
    "sourceFiles": 1000,
    "modules": 50,
    "directMappings": 10,
    "namedDecoys": 200,
    "fileSizeDistribution": {
      "small": 500,
      "medium": 350,
      "large": 150
    }
  },
  "generatorConfigHash": "f359ff248dfb9ba073b7d36881058ff48ec240bd1e3b6660c9bcccc4194c8a86",
  "corpusHash": "3a66ce5d9121dba0d833acc9a1429d70e1ee03eff9e278db60ee6015b48e8c5e",
  "gitCommit": "1fdcc0449e7a173dcbcac0a650c6920b4a3244d9",
  "environment": {
    "node": "v24.15.0",
    "platform": "win32",
    "release": "10.0.26200",
    "arch": "x64",
    "cpu": "Intel(R) Core(TM) 7 250H",
    "dependencies": {
      "@modelcontextprotocol/sdk": "1.29.0",
      "@nestjs/common": "11.1.28",
      "@nestjs/core": "11.1.28",
      "reflect-metadata": "0.2.2",
      "rxjs": "7.8.2",
      "zod": "4.4.3",
      "@nestjs/testing": "11.1.28",
      "@types/node": "24.13.3",
      "ajv": "8.20.0",
      "tsx": "4.23.0",
      "typescript": "5.8.3",
      "vitest": "4.1.10",
      "yaml": "2.9.0"
    }
  },
  "warmupRuns": 1,
  "measuredRuns": 5,
  "runs": [
    {
      "index": 1,
      "elapsedMs": 70.84609999999998,
      "peakRssBytes": 122716160,
      "projectionHash": "8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c",
      "status": "partial",
      "confirmedCount": 10,
      "candidateCount": 10,
      "limitsReached": ["MAX_FILES_REACHED"]
    },
    {
      "index": 2,
      "elapsedMs": 61.875299999999925,
      "peakRssBytes": 120451072,
      "projectionHash": "8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c",
      "status": "partial",
      "confirmedCount": 10,
      "candidateCount": 10,
      "limitsReached": ["MAX_FILES_REACHED"]
    },
    {
      "index": 3,
      "elapsedMs": 59.81700000000001,
      "peakRssBytes": 123416576,
      "projectionHash": "8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c",
      "status": "partial",
      "confirmedCount": 10,
      "candidateCount": 10,
      "limitsReached": ["MAX_FILES_REACHED"]
    },
    {
      "index": 4,
      "elapsedMs": 60.5471,
      "peakRssBytes": 122245120,
      "projectionHash": "8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c",
      "status": "partial",
      "confirmedCount": 10,
      "candidateCount": 10,
      "limitsReached": ["MAX_FILES_REACHED"]
    },
    {
      "index": 5,
      "elapsedMs": 66.8315,
      "peakRssBytes": 128516096,
      "projectionHash": "8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c",
      "status": "partial",
      "confirmedCount": 10,
      "candidateCount": 10,
      "limitsReached": ["MAX_FILES_REACHED"]
    }
  ],
  "summary": {
    "medianElapsedMs": 61.875299999999925,
    "p95ElapsedMs": 70.84609999999998,
    "peakRssBytes": 128516096
  },
  "correctness": {
    "stableProjectionHash": "8d5a229c4ca5660e4236d4a3743a9aae930faf6e5132c9eec16af0c7e6bd969c",
    "status": "partial",
    "confirmedCount": 10,
    "candidateCount": 10,
    "limitsReached": ["MAX_FILES_REACHED"]
  },
  "cleanup": {
    "attempted": true,
    "succeeded": true,
    "fixtureRemoved": true
  },
  "trend": {
    "baselineAvailable": false,
    "timingIsBlocking": false,
    "medianDeltaPercent": null,
    "p95DeltaPercent": null,
    "peakRssDeltaPercent": null
  }
}
```

#### `testkit/contracts/evidence-pack-field-contract.ts`

```
import {
  LocateResultSchema,
  type LocateResult,
} from '../../src/contracts/index.js';

export interface EvidencePackFieldMutation {
  readonly path: string;
  readonly replacement: unknown;
  readonly normalized: boolean;
}

export const PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS = Object.freeze([
  { path: 'evidence.schemaVersion', replacement: '2.0', normalized: false },
  { path: 'evidence.status', replacement: 'partial', normalized: false },
  {
    path: 'evidence.repositoryRoot',
    replacement: 'D:/another-fixture',
    normalized: true,
  },
  { path: 'evidence.normalizedTerms', replacement: [], normalized: false },
  {
    path: 'evidence.normalizedTerms.0.value',
    replacement: 'other',
    normalized: false,
  },
  {
    path: 'evidence.normalizedTerms.0.caseSensitive',
    replacement: true,
    normalized: false,
  },
  { path: 'evidence.confirmed', replacement: [], normalized: false },
  {
    path: 'evidence.confirmed.0.evidenceClass',
    replacement: 'candidate',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.id',
    replacement: `evidence:v1:${'c'.repeat(64)}`,
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.role',
    replacement: 'definition',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.file',
    replacement: 'server/other.ts',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.symbol',
    replacement: 'OtherSymbol',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.lines',
    replacement: [2, 2],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.excerpt',
    replacement: 'const other = source.other;',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.redaction.applied',
    replacement: false,
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.redaction.reasonCodes',
    replacement: ['PERSONAL_DATA'],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.provenance.discoveredBy',
    replacement: ['codegraph'],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.provenance.verifiedBy',
    replacement: 'backend',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.provenance.operations',
    replacement: ['CODEGRAPH_QUERY', 'FILESYSTEM_READ_RANGE'],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.reasonCodes',
    replacement: ['EXACT_SYMBOL_ANCHOR'],
    normalized: false,
  },
  { path: 'evidence.candidates', replacement: [], normalized: false },
  {
    path: 'evidence.candidates.0.evidenceClass',
    replacement: 'confirmed',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.id',
    replacement: `evidence:v1:${'d'.repeat(64)}`,
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.role',
    replacement: 'reference',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.location.file',
    replacement: 'server/other-candidate.ts',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.location.lines',
    replacement: [4, 4],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.location.excerpt',
    replacement: 'otherCandidate',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.provenance.discoveredBy',
    replacement: ['ripgrep'],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.provenance.verifiedBy',
    replacement: 'backend',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.provenance.operations',
    replacement: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.reasonCodes',
    replacement: ['SYMBOL_REFERENCE_ONLY'],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.promotionRequirements',
    replacement: ['CALL_PATH_REQUIRED'],
    normalized: false,
  },
  { path: 'evidence.coverage.backends', replacement: [], normalized: false },
  {
    path: 'evidence.coverage.backends.0.backend',
    replacement: 'codegraph',
    normalized: false,
  },
  {
    path: 'evidence.coverage.backends.0.status',
    replacement: 'failed',
    normalized: false,
  },
  {
    path: 'evidence.coverage.backends.0.reasonCode',
    replacement: 'BACKEND_ABORTED',
    normalized: false,
  },
  {
    path: 'evidence.coverage.backends.0.hitCount',
    replacement: 2,
    normalized: false,
  },
  {
    path: 'evidence.coverage.fallbackChecked',
    replacement: true,
    normalized: false,
  },
  {
    path: 'evidence.coverage.indexState',
    replacement: 'available',
    normalized: false,
  },
  {
    path: 'evidence.coverage.indexFreshness',
    replacement: 'possibly-stale',
    normalized: false,
  },
  {
    path: 'evidence.coverage.limitsReached',
    replacement: ['TIMEOUT_REACHED'],
    normalized: false,
  },
  {
    path: 'evidence.coverage.exclusionSummary',
    replacement: { OUTSIDE_LAYER_HINT: 2 },
    normalized: false,
  },
  { path: 'evidence.nextActions', replacement: [], normalized: false },
] satisfies readonly EvidencePackFieldMutation[]);

export function createEvidencePackMutationFixture(): LocateResult {
  return LocateResultSchema.parse({
    ok: true,
    evidence: {
      schemaVersion: '1.0',
      status: 'ok',
      repositoryRoot: 'D:/fixture',
      normalizedTerms: [{ value: 'targetField', caseSensitive: false }],
      confirmed: [
        {
          evidenceClass: 'confirmed',
          id: `evidence:v1:${'a'.repeat(64)}`,
          role: 'value-mapping',
          location: {
            file: 'server/mapping.ts',
            symbol: 'Mapping',
            lines: [1, 1],
            excerpt: 'const targetField = <redacted:secret-like-value>;',
            redaction: {
              applied: true,
              reasonCodes: ['SECRET_LIKE_VALUE'],
            },
          },
          provenance: {
            discoveredBy: ['ripgrep', 'filesystem'],
            verifiedBy: 'filesystem',
            operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
          },
          reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
        },
      ],
      candidates: [
        {
          evidenceClass: 'candidate',
          id: `evidence:v1:${'b'.repeat(64)}`,
          role: 'related',
          location: {
            file: 'server/candidate.ts',
            lines: [3, 3],
            excerpt: 'candidateField',
          },
          provenance: {
            discoveredBy: ['filesystem'],
            verifiedBy: 'filesystem',
            operations: ['FILESYSTEM_FIND_MATCHES'],
          },
          reasonCodes: [
            'SAME_SCOPE_SIMILAR_IDENTIFIER',
            'SAME_ENTITY_SIBLING',
          ],
          promotionRequirements: [
            'USER_SEMANTIC_CONFIRMATION',
            'DIRECT_REFERENCE_REQUIRED',
          ],
        },
      ],
      coverage: {
        backends: [
          {
            backend: 'ripgrep',
            status: 'used',
            reasonCode: 'RIPGREP_NO_RESULT',
            hitCount: 1,
          },
        ],
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'unknown',
        limitsReached: ['MAX_FILES_REACHED'],
        exclusionSummary: { NEGATIVE_TERM_MATCH: 1 },
      },
      nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function applyEvidencePackFieldMutation(
  input: LocateResult,
  mutation: EvidencePackFieldMutation,
): unknown {
  const clone: unknown = JSON.parse(JSON.stringify(input)) as unknown;
  const segments = mutation.path.split('.');
  let current: unknown = clone;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      throw new Error(`Invalid mutation path: ${mutation.path}.`);
    }
    if (Array.isArray(current)) {
      const itemIndex = Number.parseInt(segment, 10);
      current = current[itemIndex];
    } else if (isRecord(current)) {
      current = current[segment];
    } else {
      throw new Error(`Mutation path is not traversable: ${mutation.path}.`);
    }
  }
  const last = segments.at(-1);
  if (last === undefined) {
    throw new Error('Mutation path must not be empty.');
  }
  if (Array.isArray(current)) {
    current[Number.parseInt(last, 10)] = mutation.replacement;
  } else if (isRecord(current)) {
    current[last] = mutation.replacement;
  } else {
    throw new Error(`Mutation target is not assignable: ${mutation.path}.`);
  }
  return clone;
}
```

#### `testkit/contracts/fixture-completeness.ts`

```
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';

import { z } from 'zod';
import { parse } from 'yaml';

import {
  ANCHOR_KINDS,
  BACKEND_REASON_CODES,
  CANDIDATE_REASON_CODES,
  CONFIRMED_REASON_CODES,
  DISCOVERY_REASON_CODES,
  EVIDENCE_OPERATION_CODES,
  EVIDENCE_ROLES,
  EVIDENCE_SOURCES,
  EXCLUSION_REASON_CODES,
  LIMIT_REASON_CODES,
  LOCATE_STATUSES,
  NEXT_ACTION_CODES,
  PROMOTION_REQUIREMENT_CODES,
  REDACTION_REASON_CODES,
  REPO_LAYERS,
  SEARCH_BACKEND_IDS,
  TERM_CASE_MODES,
  TOOL_ERROR_CODES,
  LocateResultSchema,
  type LocateResult,
} from '../../src/contracts/index.js';
import { GoldenCaseSchema, type GoldenCase } from './golden-case.js';
import { PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS } from './evidence-pack-field-contract.js';
import {
  REASON_CODE_NEGATIVE_PROBES,
  runContractSchemaProbes,
} from './fixture-coverage-probes.js';
import { RUNNER_SELECTIONS } from '../runners/runner-registry.js';

const OwnershipEntrySchema = z
  .strictObject({
    positive: z.string().min(1),
    negative: z.string().min(1).optional(),
  })
  .readonly();

const FixtureOwnershipSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    successCases: z.record(z.string(), z.string().min(1)),
    errorCases: z.record(z.string(), z.string().min(1)),
    families: z.record(z.string(), z.record(z.string(), OwnershipEntrySchema)),
  })
  .readonly();

const CONTRACT_FAMILIES: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    RepoLayer: REPO_LAYERS,
    AnchorKind: ANCHOR_KINDS,
    TermCaseMode: TERM_CASE_MODES,
    LocateStatus: LOCATE_STATUSES,
    EvidenceSource: EVIDENCE_SOURCES,
    SearchBackendId: SEARCH_BACKEND_IDS,
    EvidenceRole: EVIDENCE_ROLES,
    ConfirmedReasonCode: CONFIRMED_REASON_CODES,
    CandidateReasonCode: CANDIDATE_REASON_CODES,
    DiscoveryReasonCode: DISCOVERY_REASON_CODES,
    PromotionRequirementCode: PROMOTION_REQUIREMENT_CODES,
    EvidenceOperationCode: EVIDENCE_OPERATION_CODES,
    BackendReasonCode: BACKEND_REASON_CODES,
    LimitReasonCode: LIMIT_REASON_CODES,
    ExclusionReasonCode: EXCLUSION_REASON_CODES,
    RedactionReasonCode: REDACTION_REASON_CODES,
    NextActionCode: NEXT_ACTION_CODES,
    ToolErrorCode: TOOL_ERROR_CODES,
  });

export interface FixtureCompletenessOwner {
  readonly family: string;
  readonly code: string;
  readonly positive: string;
  readonly negative?: string;
}

export interface FixtureCompletenessReport {
  readonly schemaVersion: '1.0';
  readonly ownershipSource: string;
  readonly ownershipSourceHash: string;
  readonly successManifestIds: readonly string[];
  readonly errorManifestIds: readonly string[];
  readonly companionSnapshotIds: readonly string[];
  readonly owners: readonly FixtureCompletenessOwner[];
  readonly publicEvidencePackFieldMutations: readonly {
    readonly path: string;
    readonly normalized: boolean;
  }[];
  readonly status: 'passed';
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function knownCaseIds(): ReadonlySet<string> {
  return new Set(
    Object.values(RUNNER_SELECTIONS).flatMap((selection) => [
      ...selection.cases,
    ]),
  );
}

type CoveragePolarity = 'positive' | 'negative';

interface VerifiedCaseCoverage {
  readonly positive: Set<string>;
  readonly negative: Set<string>;
}

function coverageKey(family: string, code: string): string {
  return `${family}.${code}`;
}

function addVerifiedCoverage(
  coverage: Map<string, VerifiedCaseCoverage>,
  caseId: string,
  polarity: CoveragePolarity,
  family: string,
  code: string,
): void {
  let entry = coverage.get(caseId);
  if (entry === undefined) {
    entry = { positive: new Set(), negative: new Set() };
    coverage.set(caseId, entry);
  }
  entry[polarity].add(coverageKey(family, code));
}

function addSuccessCoverage(
  coverage: Map<string, VerifiedCaseCoverage>,
  caseId: string,
  goldenCase: Extract<GoldenCase, { readonly kind: 'success' }>,
  result: Extract<LocateResult, { readonly ok: true }>,
): void {
  for (const layer of goldenCase.request.layers ?? []) {
    addVerifiedCoverage(coverage, caseId, 'positive', 'RepoLayer', layer);
  }
  for (const anchor of goldenCase.request.anchors ?? []) {
    addVerifiedCoverage(coverage, caseId, 'positive', 'AnchorKind', anchor.kind);
  }
  addVerifiedCoverage(
    coverage,
    caseId,
    'positive',
    'TermCaseMode',
    goldenCase.request.termCase ?? 'smart',
  );
  addVerifiedCoverage(
    coverage,
    caseId,
    'positive',
    'LocateStatus',
    result.evidence.status,
  );
  for (const evidence of result.evidence.confirmed) {
    addVerifiedCoverage(coverage, caseId, 'positive', 'EvidenceRole', evidence.role);
    for (const code of evidence.reasonCodes) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'ConfirmedReasonCode',
        code,
      );
    }
    for (const source of [
      ...evidence.provenance.discoveredBy,
      evidence.provenance.verifiedBy,
    ]) {
      addVerifiedCoverage(coverage, caseId, 'positive', 'EvidenceSource', source);
    }
    for (const operation of evidence.provenance.operations) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'EvidenceOperationCode',
        operation,
      );
    }
    for (const reason of evidence.location.redaction?.reasonCodes ?? []) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'RedactionReasonCode',
        reason,
      );
    }
  }
  for (const evidence of result.evidence.candidates) {
    addVerifiedCoverage(coverage, caseId, 'positive', 'EvidenceRole', evidence.role);
    for (const code of evidence.reasonCodes) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'CandidateReasonCode',
        code,
      );
    }
    for (const source of [
      ...evidence.provenance.discoveredBy,
      evidence.provenance.verifiedBy,
    ]) {
      addVerifiedCoverage(coverage, caseId, 'positive', 'EvidenceSource', source);
    }
    for (const operation of evidence.provenance.operations) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'EvidenceOperationCode',
        operation,
      );
    }
    for (const requirement of evidence.promotionRequirements) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'PromotionRequirementCode',
        requirement,
      );
    }
    for (const reason of evidence.location.redaction?.reasonCodes ?? []) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'RedactionReasonCode',
        reason,
      );
    }
  }
  for (const backend of result.evidence.coverage.backends) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'SearchBackendId',
      backend.backend,
    );
    if (backend.reasonCode !== undefined) {
      addVerifiedCoverage(
        coverage,
        caseId,
        'positive',
        'BackendReasonCode',
        backend.reasonCode,
      );
    }
  }
  for (const reason of result.evidence.coverage.limitsReached) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'LimitReasonCode',
      reason,
    );
  }
  for (const reason of Object.keys(result.evidence.coverage.exclusionSummary)) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'ExclusionReasonCode',
      reason,
    );
  }
  for (const action of result.evidence.nextActions) {
    addVerifiedCoverage(
      coverage,
      caseId,
      'positive',
      'NextActionCode',
      action,
    );
  }
}

function buildVerifiedCoverage(
  ownership: z.infer<typeof FixtureOwnershipSchema>,
  manifests: readonly GoldenCase[],
  snapshots: ReadonlyMap<string, Extract<LocateResult, { readonly ok: true }>>,
): ReadonlyMap<string, VerifiedCaseCoverage> {
  const coverage = new Map<string, VerifiedCaseCoverage>();
  for (const key of runContractSchemaProbes()) {
    const separator = key.indexOf('.');
    addVerifiedCoverage(
      coverage,
      'contract-code-probes',
      'positive',
      key.slice(0, separator),
      key.slice(separator + 1),
    );
  }
  for (const probe of REASON_CODE_NEGATIVE_PROBES) {
    addVerifiedCoverage(
      coverage,
      'evaluator-negative-self-test',
      'negative',
      probe.family,
      probe.code,
    );
  }
  for (const goldenCase of manifests) {
    if (goldenCase.kind === 'success') {
      const owner = ownership.successCases[goldenCase.id];
      const snapshot = snapshots.get(goldenCase.id);
      if (owner === undefined || snapshot === undefined) {
        throw new Error(`Missing verified success inputs for ${goldenCase.id}.`);
      }
      addSuccessCoverage(coverage, owner, goldenCase, snapshot);
      continue;
    }
    const owner = ownership.errorCases[goldenCase.id];
    if (owner === undefined) {
      throw new Error(`Missing verified error owner for ${goldenCase.id}.`);
    }
    addVerifiedCoverage(
      coverage,
      owner,
      'positive',
      'ToolErrorCode',
      goldenCase.expected.error.code,
    );
    if (goldenCase.expected.error.suggestedAction !== undefined) {
      addVerifiedCoverage(
        coverage,
        owner,
        'positive',
        'NextActionCode',
        goldenCase.expected.error.suggestedAction,
      );
    }
  }
  return coverage;
}

export function buildFixtureCompletenessReport(
  repositoryRoot: string,
  ownershipOverride?: unknown,
): FixtureCompletenessReport {
  const ownershipRelativePath =
    'testkit/manifests/coverage/fixture-ownership.yaml';
  const ownershipPath = resolve(repositoryRoot, ownershipRelativePath);
  const ownershipText = readFileSync(ownershipPath, 'utf8');
  const ownershipInput = ownershipOverride ?? (parse(ownershipText) as unknown);
  const ownership = FixtureOwnershipSchema.parse(ownershipInput);
  const cases = knownCaseIds();
  const owners: FixtureCompletenessOwner[] = [];

  for (const [family, expectedCodes] of Object.entries(CONTRACT_FAMILIES)) {
    const declared = ownership.families[family];
    if (declared === undefined) {
      throw new Error(`Missing fixture ownership family: ${family}.`);
    }
    const expected = sorted(expectedCodes);
    const actual = sorted(Object.keys(declared));
    if (!sameMembers(expected, actual)) {
      throw new Error(
        `Fixture ownership differs for ${family}: expected ${expected.join(',')}; received ${actual.join(',')}.`,
      );
    }
    for (const code of expected) {
      const entry = declared[code];
      if (entry === undefined) {
        throw new Error(`Missing owner for ${family}.${code}.`);
      }
      if (!cases.has(entry.positive)) {
        throw new Error(
          `Unknown positive owner ${entry.positive} for ${family}.${code}.`,
        );
      }
      if (entry.positive === 'fixture-completeness') {
        throw new Error(`Completeness cannot own ${family}.${code}.`);
      }
      if (
        (family === 'ConfirmedReasonCode' || family === 'CandidateReasonCode') &&
        entry.negative === undefined
      ) {
        throw new Error(`Missing negative owner for ${family}.${code}.`);
      }
      if (entry.negative !== undefined && !cases.has(entry.negative)) {
        throw new Error(
          `Unknown negative owner ${entry.negative} for ${family}.${code}.`,
        );
      }
      if (entry.negative === 'fixture-completeness') {
        throw new Error(`Completeness cannot negatively own ${family}.${code}.`);
      }
      owners.push(
        entry.negative === undefined
          ? { family, code, positive: entry.positive }
          : {
              family,
              code,
              positive: entry.positive,
              negative: entry.negative,
            },
      );
    }
  }

  const undeclaredFamilies = Object.keys(ownership.families).filter(
    (family) => CONTRACT_FAMILIES[family] === undefined,
  );
  if (undeclaredFamilies.length > 0) {
    throw new Error(
      `Unknown fixture ownership families: ${sorted(undeclaredFamilies).join(',')}.`,
    );
  }

  const manifestDirectory = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');
  const manifests = readdirSync(manifestDirectory)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((name) => {
      const input: unknown = parse(
        readFileSync(resolve(manifestDirectory, name), 'utf8'),
      );
      return GoldenCaseSchema.parse(input);
    });
  const manifestIds = manifests.map((manifest) => manifest.id);
  if (new Set(manifestIds).size !== manifestIds.length) {
    throw new Error('Golden manifest IDs must be unique.');
  }
  const successManifestIds = sorted(
    manifests
      .filter((manifest) => manifest.kind === 'success')
      .map((manifest) => manifest.id),
  );
  const errorManifestIds = sorted(
    manifests
      .filter((manifest) => manifest.kind === 'error')
      .map((manifest) => manifest.id),
  );
  const companionSnapshotIds = sorted(
    readdirSync(resolve(repositoryRoot, 'testkit', 'expected'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => basename(name, '.json')),
  );
  if (!sameMembers(successManifestIds, companionSnapshotIds)) {
    throw new Error(
      'Every success manifest must have exactly one companion snapshot and no orphan snapshots.',
    );
  }
  if (!sameMembers(successManifestIds, sorted(Object.keys(ownership.successCases)))) {
    throw new Error('Every success manifest must declare exactly one runner owner.');
  }
  if (!sameMembers(errorManifestIds, sorted(Object.keys(ownership.errorCases)))) {
    throw new Error('Every error manifest must declare exactly one runner owner.');
  }
  for (const [manifestId, owner] of Object.entries({
    ...ownership.successCases,
    ...ownership.errorCases,
  })) {
    if (!cases.has(owner)) {
      throw new Error(`Unknown runner owner ${owner} for manifest ${manifestId}.`);
    }
  }
  const snapshots = new Map<
    string,
    Extract<LocateResult, { readonly ok: true }>
  >();
  for (const snapshotId of companionSnapshotIds) {
    const snapshot: unknown = JSON.parse(
      readFileSync(
        resolve(repositoryRoot, 'testkit', 'expected', `${snapshotId}.json`),
        'utf8',
      ),
    );
    const parsed = LocateResultSchema.parse(snapshot);
    if (!parsed.ok) {
      throw new Error(`Success companion snapshot is not successful: ${snapshotId}.`);
    }
    snapshots.set(snapshotId, parsed);
  }

  const verifiedCoverage = buildVerifiedCoverage(ownership, manifests, snapshots);
  for (const owner of owners) {
    const key = coverageKey(owner.family, owner.code);
    if (!verifiedCoverage.get(owner.positive)?.positive.has(key)) {
      throw new Error(
        `Positive owner ${owner.positive} has no machine-verified assertion for ${key}.`,
      );
    }
    if (
      owner.negative !== undefined &&
      !verifiedCoverage.get(owner.negative)?.negative.has(key)
    ) {
      throw new Error(
        `Negative owner ${owner.negative} has no machine-verified mutation for ${key}.`,
      );
    }
  }

  return {
    schemaVersion: '1.0',
    ownershipSource: ownershipRelativePath,
    ownershipSourceHash: createHash('sha256')
      .update(
        ownershipOverride === undefined
          ? ownershipText
          : JSON.stringify(ownershipInput),
        'utf8',
      )
      .digest('hex'),
    successManifestIds,
    errorManifestIds,
    companionSnapshotIds,
    owners,
    publicEvidencePackFieldMutations: PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS.map(
      ({ path, normalized }) => ({ path, normalized }),
    ),
    status: 'passed',
  };
}

export function writeFixtureCompletenessReport(
  repositoryRoot: string,
  report: FixtureCompletenessReport,
): string {
  const outputDirectory = resolve(repositoryRoot, 'test-artifacts', 'completeness');
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, 'mvp-fixture-completeness-v1.json');
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}
```

#### `testkit/contracts/fixture-coverage-probes.ts`

```
import { z } from 'zod';

import {
  AnchorKindSchema,
  BackendReasonCodeSchema,
  CandidateReasonCodeSchema,
  ConfirmedReasonCodeSchema,
  DiscoveryReasonCodeSchema,
  EvidenceOperationCodeSchema,
  EvidenceRoleSchema,
  EvidenceSourceSchema,
  ExclusionReasonCodeSchema,
  LimitReasonCodeSchema,
  LocateStatusSchema,
  NextActionCodeSchema,
  PromotionRequirementCodeSchema,
  RedactionReasonCodeSchema,
  RepoLayerSchema,
  SearchBackendIdSchema,
  TERM_CASE_MODES,
  TOOL_ERROR_CODES,
  TermCaseModeSchema,
} from '../../src/contracts/index.js';

export const CONTRACT_SCHEMA_PROBE_VALUES = Object.freeze({
  RepoLayer: Object.freeze([
    'client',
    'server',
    'db',
    'test',
    'docs',
    'config',
    'unknown',
  ]),
  AnchorKind: Object.freeze(['symbol', 'file', 'table', 'route', 'term']),
  TermCaseMode: Object.freeze(['sensitive', 'insensitive', 'smart']),
  LocateStatus: Object.freeze([
    'ok',
    'partial',
    'no_result',
    'backend_unavailable',
    'timeout',
  ]),
  EvidenceSource: Object.freeze(['codegraph', 'ripgrep', 'filesystem']),
  SearchBackendId: Object.freeze(['codegraph', 'ripgrep']),
  EvidenceRole: Object.freeze([
    'execution-site',
    'value-mapping',
    'definition',
    'reference',
    'related',
  ]),
  ConfirmedReasonCode: Object.freeze([
    'EXACT_TERM_MATCH',
    'EXACT_SYMBOL_ANCHOR',
    'DIRECT_ALIAS_MAPPING',
  ]),
  CandidateReasonCode: Object.freeze([
    'EXACT_TERM_WITHOUT_DIRECT_MAPPING',
    'SYMBOL_REFERENCE_ONLY',
    'SAME_SCOPE_SIMILAR_IDENTIFIER',
    'SAME_ENTITY_SIBLING',
    'ALIAS_SOURCE_NEIGHBOR',
    'SECONDARY_BACKEND_HIT',
  ]),
  DiscoveryReasonCode: Object.freeze([
    'LITERAL_TERM_HIT',
    'SYMBOL_SEARCH_HIT',
    'FILE_ANCHOR_HIT',
  ]),
  PromotionRequirementCode: Object.freeze([
    'USER_SEMANTIC_CONFIRMATION',
    'DIRECT_REFERENCE_REQUIRED',
    'CALL_PATH_REQUIRED',
  ]),
  EvidenceOperationCode: Object.freeze([
    'CODEGRAPH_QUERY',
    'RIPGREP_SEARCH',
    'FILESYSTEM_READ_RANGE',
    'FILESYSTEM_FIND_MATCHES',
  ]),
  BackendReasonCode: Object.freeze([
    'CODEGRAPH_INDEX_MISSING',
    'CODEGRAPH_UNAVAILABLE',
    'CODEGRAPH_NO_RESULT',
    'RIPGREP_UNAVAILABLE',
    'RIPGREP_NO_RESULT',
    'BACKEND_PROCESS_FAILED',
    'BACKEND_ABORTED',
  ]),
  LimitReasonCode: Object.freeze([
    'MAX_FILES_REACHED',
    'MAX_CONFIRMED_REACHED',
    'MAX_CANDIDATES_REACHED',
    'MAX_FILE_BYTES_REACHED',
    'MAX_EXCERPT_BYTES_REACHED',
    'TIMEOUT_REACHED',
  ]),
  ExclusionReasonCode: Object.freeze([
    'NEGATIVE_TERM_MATCH',
    'OUTSIDE_LAYER_HINT',
    'DUPLICATE_LOCATION',
    'UNVERIFIED_FILE_CONTENT',
  ]),
  RedactionReasonCode: Object.freeze([
    'SECRET_LIKE_VALUE',
    'CONNECTION_STRING',
    'PERSONAL_DATA',
    'BINARY_OR_OVERSIZED_CONTENT',
  ]),
  NextActionCode: Object.freeze([
    'ADD_TERM',
    'ADD_SYMBOL_ANCHOR',
    'CONFIRM_CANDIDATE',
    'INITIALIZE_CODEGRAPH',
    'RETRY_WITH_HIGHER_LIMIT',
  ]),
  ToolErrorCode: Object.freeze([
    'INVALID_INPUT',
    'INVALID_REPOSITORY',
    'PATH_OUTSIDE_ROOT',
    'INTERNAL_ERROR',
  ]),
} satisfies Readonly<Record<string, readonly string[]>>);

const PROBE_SCHEMAS: Readonly<Record<string, z.ZodType>> = Object.freeze({
  RepoLayer: RepoLayerSchema,
  AnchorKind: AnchorKindSchema,
  TermCaseMode: TermCaseModeSchema,
  LocateStatus: LocateStatusSchema,
  EvidenceSource: EvidenceSourceSchema,
  SearchBackendId: SearchBackendIdSchema,
  EvidenceRole: EvidenceRoleSchema,
  ConfirmedReasonCode: ConfirmedReasonCodeSchema,
  CandidateReasonCode: CandidateReasonCodeSchema,
  DiscoveryReasonCode: DiscoveryReasonCodeSchema,
  PromotionRequirementCode: PromotionRequirementCodeSchema,
  EvidenceOperationCode: EvidenceOperationCodeSchema,
  BackendReasonCode: BackendReasonCodeSchema,
  LimitReasonCode: LimitReasonCodeSchema,
  ExclusionReasonCode: ExclusionReasonCodeSchema,
  RedactionReasonCode: RedactionReasonCodeSchema,
  NextActionCode: NextActionCodeSchema,
  ToolErrorCode: z.enum(TOOL_ERROR_CODES),
});

export interface ReasonCodeNegativeProbe {
  readonly family: 'ConfirmedReasonCode' | 'CandidateReasonCode';
  readonly code: string;
}

export const REASON_CODE_NEGATIVE_PROBES = Object.freeze([
  ...CONTRACT_SCHEMA_PROBE_VALUES.ConfirmedReasonCode.map((code) => ({
    family: 'ConfirmedReasonCode' as const,
    code,
  })),
  ...CONTRACT_SCHEMA_PROBE_VALUES.CandidateReasonCode.map((code) => ({
    family: 'CandidateReasonCode' as const,
    code,
  })),
] satisfies readonly ReasonCodeNegativeProbe[]);

export function runContractSchemaProbes(): readonly string[] {
  if (
    JSON.stringify(CONTRACT_SCHEMA_PROBE_VALUES.TermCaseMode) !==
    JSON.stringify(TERM_CASE_MODES)
  ) {
    throw new Error('Explicit TermCaseMode probes differ from the contract constants.');
  }
  const verified: string[] = [];
  for (const [family, values] of Object.entries(CONTRACT_SCHEMA_PROBE_VALUES)) {
    const schema = PROBE_SCHEMAS[family];
    if (schema === undefined) {
      throw new Error(`Missing executable schema probe for ${family}.`);
    }
    for (const value of values) {
      if (schema.parse(value) !== value) {
        throw new Error(`Schema probe normalized ${family}.${value}.`);
      }
      verified.push(`${family}.${value}`);
    }
  }
  return Object.freeze(verified);
}
```

#### `testkit/contracts/golden-projection.ts`

```
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type { LocateResult } from '../../src/contracts/index.js';

const REPOSITORY_ROOT_PLACEHOLDER = '<REPOSITORY_ROOT>';
const CASE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

export interface ProjectionComparison {
  readonly matches: boolean;
  readonly firstDifferencePath?: string;
}

function expectedPath(caseId: string): string {
  if (!CASE_ID_PATTERN.test(caseId)) {
    throw new Error(`Unsafe Golden case ID: ${caseId}.`);
  }
  return resolve(import.meta.dirname, '..', 'expected', `${caseId}.json`);
}

export function createStableGoldenProjection(result: LocateResult): unknown {
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    evidence: {
      ...result.evidence,
      repositoryRoot: REPOSITORY_ROOT_PLACEHOLDER,
    },
  };
}

export function loadExpectedGoldenProjection(caseId: string): unknown {
  const path = expectedPath(caseId);
  if (!existsSync(path)) {
    throw new Error(`Missing Golden companion snapshot: testkit/expected/${caseId}.json.`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

export function createMissingGoldenProjection(
  caseId: string,
  result: LocateResult,
): boolean {
  if (process.env['REPO_NAV_CREATE_MISSING_GOLDEN'] !== '1') {
    return false;
  }
  const path = expectedPath(caseId);
  if (existsSync(path)) {
    return false;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(createStableGoldenProjection(result), null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
  return true;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstDifference(expected: unknown, actual: unknown, path: string): string {
  if (isDeepStrictEqual(expected, actual)) {
    return path;
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return `${path}.length`;
    }
    for (let index = 0; index < expected.length; index += 1) {
      if (!isDeepStrictEqual(expected[index], actual[index])) {
        return firstDifference(expected[index], actual[index], `${path}[${index}]`);
      }
    }
  }
  if (isRecord(expected) && isRecord(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      if (!isDeepStrictEqual(expected[key], actual[key])) {
        return firstDifference(expected[key], actual[key], `${path}.${key}`);
      }
    }
  }
  return path;
}

export function compareGoldenProjection(
  expected: unknown,
  actualResult: LocateResult,
): ProjectionComparison {
  const actual = createStableGoldenProjection(actualResult);
  return isDeepStrictEqual(expected, actual)
    ? { matches: true }
    : {
        matches: false,
        firstDifferencePath: firstDifference(expected, actual, 'result'),
      };
}
```

#### `testkit/expected/alias-candidate.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "hcpId",
        "caseSensitive": true
      },
      {
        "value": "row.hcp_id",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:62e1feff7679d9edc33886234cdd7553cdd7ea2fc1bac4a24ac699321efdf359",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            7
          ],
          "excerpt": "export function mapCandidate(row: SourceRow) {\n  const sourceAlias = hcpId;\n  const unrelatedToken = [REDACTED]  return {\n    hcpName: row.hcp_name,\n    hcpEmail: row.hcp_email,\n    hcpId: row.hcp_id,"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:0d70e3d0539bdc86f2954b491b72e59924134f3765febf3e58e016500754b88d",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "sourceAlias",
          "lines": [
            2,
            2
          ],
          "excerpt": "sourceAlias"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "ALIAS_SOURCE_NEIGHBOR"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:65ae9cb4cfd7b948e166501ae2d2f964e1a32d6d3ec0f9970d3a959227e63670",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcp_name",
          "lines": [
            5,
            5
          ],
          "excerpt": "hcp_name"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:d5c205be88a84efabccbbee5d77af9dac2c8d6a2c4a721397b426aa91f2af9ef",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcpName",
          "lines": [
            5,
            5
          ],
          "excerpt": "hcpName"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER",
          "SAME_ENTITY_SIBLING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:1a5c0131501ae49c39ec6ea0445022f372ab35f811381f765bac524b0db502e6",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcpEmail",
          "lines": [
            6,
            6
          ],
          "excerpt": "hcpEmail"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER",
          "SAME_ENTITY_SIBLING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:8ec28d67114194f728001c11db69ae649668c5d131c2a069a15898be10d601c9",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcp_email",
          "lines": [
            6,
            6
          ],
          "excerpt": "hcp_email"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/backend-unavailable.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "backend_unavailable",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "unavailable",
          "reasonCode": "CODEGRAPH_UNAVAILABLE",
          "hitCount": 0
        },
        {
          "backend": "ripgrep",
          "status": "unavailable",
          "reasonCode": "RIPGREP_UNAVAILABLE",
          "hitCount": 0
        }
      ],
      "fallbackChecked": true,
      "indexState": "unavailable",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-failed.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:8f906341a202cb2348faa31a69c4740a8b01d2964d0b77bd720f4d6ba3ea2ce3",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "lines": [
            1,
            2
          ],
          "excerpt": "declare const row: { readonly source_field: string };\nexport const targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "failed",
          "reasonCode": "BACKEND_PROCESS_FAILED",
          "hitCount": 0
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": true,
      "indexState": "error",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-global-abort-no-fallback.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "timeout",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      }
    ],
    "confirmed": [],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "failed",
          "reasonCode": "BACKEND_ABORTED",
          "hitCount": 0
        }
      ],
      "fallbackChecked": false,
      "indexState": "error",
      "indexFreshness": "unknown",
      "limitsReached": [
        "TIMEOUT_REACHED"
      ],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-hit-unverified.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:8f906341a202cb2348faa31a69c4740a8b01d2964d0b77bd720f4d6ba3ea2ce3",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "lines": [
            1,
            2
          ],
          "excerpt": "declare const row: { readonly source_field: string };\nexport const targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "used",
          "hitCount": 1
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": true,
      "indexState": "available",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {
        "UNVERIFIED_FILE_CONTENT": 1
      }
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-incomplete.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:8f906341a202cb2348faa31a69c4740a8b01d2964d0b77bd720f4d6ba3ea2ce3",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "lines": [
            1,
            2
          ],
          "excerpt": "declare const row: { readonly source_field: string };\nexport const targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "codegraph",
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "CODEGRAPH_QUERY",
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "used",
          "hitCount": 1
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": true,
      "indexState": "available",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {
        "DUPLICATE_LOCATION": 1
      }
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-local-timeout-fallback.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:8f906341a202cb2348faa31a69c4740a8b01d2964d0b77bd720f4d6ba3ea2ce3",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "lines": [
            1,
            2
          ],
          "excerpt": "declare const row: { readonly source_field: string };\nexport const targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "failed",
          "reasonCode": "BACKEND_ABORTED",
          "hitCount": 0
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": true,
      "indexState": "error",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-missing.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:8f906341a202cb2348faa31a69c4740a8b01d2964d0b77bd720f4d6ba3ea2ce3",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "lines": [
            1,
            2
          ],
          "excerpt": "declare const row: { readonly source_field: string };\nexport const targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "unavailable",
          "reasonCode": "CODEGRAPH_INDEX_MISSING",
          "hitCount": 0
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": true,
      "indexState": "missing",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-no-result.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": true
      },
      {
        "value": "row.source_field",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:8f906341a202cb2348faa31a69c4740a8b01d2964d0b77bd720f4d6ba3ea2ce3",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "lines": [
            1,
            2
          ],
          "excerpt": "declare const row: { readonly source_field: string };\nexport const targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "used",
          "reasonCode": "CODEGRAPH_NO_RESULT",
          "hitCount": 0
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": true,
      "indexState": "available",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/codegraph-secondary-provenance-table.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "opaqueSearchTerm",
        "caseSensitive": true
      }
    ],
    "confirmed": [],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:f5d3c005b84c7be06b4690201b238b508f4356602ac52d6413016103a974c029",
        "role": "related",
        "location": {
          "file": "server/secondary.ts",
          "lines": [
            1,
            1
          ],
          "excerpt": "export const opaqueSecondary = 2;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "SECONDARY_BACKEND_HIT"
        ],
        "promotionRequirements": [
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "used",
          "hitCount": 2
        },
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 2
        }
      ],
      "fallbackChecked": true,
      "indexState": "available",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {
        "DUPLICATE_LOCATION": 1,
        "UNVERIFIED_FILE_CONTENT": 2
      }
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/codegraph-symbol-complete-no-fallback.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "AlphaMapping",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:81af7f88eea0c10fb9b8f4c500378558c585cea3dd77e94ba0157c2ade14822b",
        "role": "execution-site",
        "location": {
          "file": "server/definition.ts",
          "symbol": "AlphaMapping",
          "lines": [
            1,
            1
          ],
          "excerpt": "export function AlphaMapping(): string { return 'alpha'; }"
        },
        "provenance": {
          "discoveredBy": [
            "codegraph"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "CODEGRAPH_QUERY",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_SYMBOL_ANCHOR"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": false,
      "indexState": "available",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/exclusion-summary.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:77dfe5388b635d56923956308f7bb6d1bbfea09f87e7cfb6b2100a9bd77e4892",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            1
          ],
          "excerpt": "targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 6
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {
        "DUPLICATE_LOCATION": 1,
        "UNVERIFIED_FILE_CONTENT": 1,
        "NEGATIVE_TERM_MATCH": 1,
        "OUTSIDE_LAYER_HINT": 3
      }
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/false-confirmation-decoys.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:d6d58a843dbffef7267f77ed64431f78fcdc02c5762f3eab789e36443adac77a",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            1,
            1
          ],
          "excerpt": "targetField == row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:118e82a812552b1cdf9bac0fbf6a239237a44149707ee52bd14814e6b2d8751e",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            2,
            2
          ],
          "excerpt": "type targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:cb38d651490034d4b4e4b8e8d42007b765de27af66f8e715a13d4160f8567e47",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            3,
            3
          ],
          "excerpt": "// targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:a3ee8718a6e1a0e75eed0fa63f5efeeacadb6723cc3082cb4c765464aad0a223",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            4,
            4
          ],
          "excerpt": "const example = \"targetField = row.source_field\";"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:7aaa9c8ae6e73fa641bea50b4569c0a677384d37fca3ab75cdf13005dc5e4d00",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            5,
            5
          ],
          "excerpt": "interface Dto { targetField: row.source_field }"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:5d4ec245e8f488353c16cfc690a6e5b78144d28b2691b06f442d1fa1226d7657",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            6,
            6
          ],
          "excerpt": "@Field({ targetField: row.source_field })"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:7761ca54f15ce7354006b7a8e6fa2698b036eae2e70127c028b229779a72fa43",
        "role": "reference",
        "location": {
          "file": "server/decoys.fixture",
          "lines": [
            7,
            7
          ],
          "excerpt": "return { targetField };"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 9
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {
        "OUTSIDE_LAYER_HINT": 2
      }
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/foundation-success.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "hcp_id",
        "caseSensitive": false
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:4a81263fd1339bdd04d87f69680e8b8a39e06826885abff3467c2f7fd0d5e7d5",
        "role": "value-mapping",
        "location": {
          "file": "mapping.ts",
          "lines": [
            4,
            4
          ],
          "excerpt": "  return { hcpCode: row.hcp_id };"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "codegraph",
          "status": "unavailable",
          "reasonCode": "CODEGRAPH_INDEX_MISSING",
          "hitCount": 0
        }
      ],
      "fallbackChecked": true,
      "indexState": "missing",
      "indexFreshness": "unknown",
      "limitsReached": [],
      "exclusionSummary": {
        "UNVERIFIED_FILE_CONTENT": 1
      }
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/mcp-source-field-mapping.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "hcp_id",
        "caseSensitive": false
      },
      {
        "value": "hcpId",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:0000000000000000000000000000000000000000000000000000000000000000",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.ts",
          "symbol": "hcpId",
          "lines": [
            1,
            1
          ],
          "excerpt": "hcpId = hcp_id;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/ripgrep-failed.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "backend_unavailable",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "failed",
          "reasonCode": "BACKEND_PROCESS_FAILED",
          "hitCount": 0
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/ripgrep-incomplete.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "partial",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:33f8adf836a7af480d617f8a1157c4dbf55965d11f38379c5e99cf807bfd10f6",
        "role": "reference",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            2
          ],
          "excerpt": "targetField = row.source_field;\nconsume(row.source_field);"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/ripgrep-timeout.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "backend_unavailable",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "unavailable",
          "reasonCode": "BACKEND_ABORTED",
          "hitCount": 0
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/ripgrep-unavailable.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "backend_unavailable",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "unavailable",
          "reasonCode": "RIPGREP_UNAVAILABLE",
          "hitCount": 0
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/expected/sibling-candidate.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "hcpId",
        "caseSensitive": true
      },
      {
        "value": "row.hcp_id",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:62e1feff7679d9edc33886234cdd7553cdd7ea2fc1bac4a24ac699321efdf359",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            7
          ],
          "excerpt": "export function mapCandidate(row: SourceRow) {\n  const sourceAlias = hcpId;\n  const unrelatedToken = [REDACTED]  return {\n    hcpName: row.hcp_name,\n    hcpEmail: row.hcp_email,\n    hcpId: row.hcp_id,"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:0d70e3d0539bdc86f2954b491b72e59924134f3765febf3e58e016500754b88d",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "sourceAlias",
          "lines": [
            2,
            2
          ],
          "excerpt": "sourceAlias"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "ALIAS_SOURCE_NEIGHBOR"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:65ae9cb4cfd7b948e166501ae2d2f964e1a32d6d3ec0f9970d3a959227e63670",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcp_name",
          "lines": [
            5,
            5
          ],
          "excerpt": "hcp_name"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:d5c205be88a84efabccbbee5d77af9dac2c8d6a2c4a721397b426aa91f2af9ef",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcpName",
          "lines": [
            5,
            5
          ],
          "excerpt": "hcpName"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER",
          "SAME_ENTITY_SIBLING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:1a5c0131501ae49c39ec6ea0445022f372ab35f811381f765bac524b0db502e6",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcpEmail",
          "lines": [
            6,
            6
          ],
          "excerpt": "hcpEmail"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER",
          "SAME_ENTITY_SIBLING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:8ec28d67114194f728001c11db69ae649668c5d131c2a069a15898be10d601c9",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcp_email",
          "lines": [
            6,
            6
          ],
          "excerpt": "hcp_email"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/sibling-false-positive.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "hcpId",
        "caseSensitive": true
      },
      {
        "value": "row.hcp_id",
        "caseSensitive": true
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:62e1feff7679d9edc33886234cdd7553cdd7ea2fc1bac4a24ac699321efdf359",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            7
          ],
          "excerpt": "export function mapCandidate(row: SourceRow) {\n  const sourceAlias = hcpId;\n  const unrelatedToken = [REDACTED]  return {\n    hcpName: row.hcp_name,\n    hcpEmail: row.hcp_email,\n    hcpId: row.hcp_id,"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:0d70e3d0539bdc86f2954b491b72e59924134f3765febf3e58e016500754b88d",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "sourceAlias",
          "lines": [
            2,
            2
          ],
          "excerpt": "sourceAlias"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "ALIAS_SOURCE_NEIGHBOR"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:65ae9cb4cfd7b948e166501ae2d2f964e1a32d6d3ec0f9970d3a959227e63670",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcp_name",
          "lines": [
            5,
            5
          ],
          "excerpt": "hcp_name"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:d5c205be88a84efabccbbee5d77af9dac2c8d6a2c4a721397b426aa91f2af9ef",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcpName",
          "lines": [
            5,
            5
          ],
          "excerpt": "hcpName"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER",
          "SAME_ENTITY_SIBLING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:1a5c0131501ae49c39ec6ea0445022f372ab35f811381f765bac524b0db502e6",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcpEmail",
          "lines": [
            6,
            6
          ],
          "excerpt": "hcpEmail"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER",
          "SAME_ENTITY_SIBLING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      },
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:8ec28d67114194f728001c11db69ae649668c5d131c2a069a15898be10d601c9",
        "role": "related",
        "location": {
          "file": "server/mapping.fixture",
          "symbol": "hcp_email",
          "lines": [
            6,
            6
          ],
          "excerpt": "hcp_email"
        },
        "provenance": {
          "discoveredBy": [
            "filesystem"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "FILESYSTEM_FIND_MATCHES"
          ]
        },
        "reasonCodes": [
          "SAME_SCOPE_SIMILAR_IDENTIFIER"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/source-field-mapping.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:77dfe5388b635d56923956308f7bb6d1bbfea09f87e7cfb6b2100a9bd77e4892",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            1
          ],
          "excerpt": "targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [
      {
        "evidenceClass": "candidate",
        "id": "evidence:v1:1e17327ca7531837b55a37d47cfbc51790097c96079bc3d6027dc42dd5a233e5",
        "role": "reference",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            2,
            2
          ],
          "excerpt": "consume(row.source_field);"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "EXACT_TERM_WITHOUT_DIRECT_MAPPING"
        ],
        "promotionRequirements": [
          "USER_SEMANTIC_CONFIRMATION",
          "DIRECT_REFERENCE_REQUIRED"
        ]
      }
    ],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 2
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": [
      "CONFIRM_CANDIDATE"
    ]
  }
}
```

#### `testkit/expected/text-engine-baseline.json`

```
{
  "ok": true,
  "evidence": {
    "schemaVersion": "1.0",
    "status": "ok",
    "repositoryRoot": "<REPOSITORY_ROOT>",
    "normalizedTerms": [
      {
        "value": "targetField",
        "caseSensitive": false
      },
      {
        "value": "row.source_field",
        "caseSensitive": false
      }
    ],
    "confirmed": [
      {
        "evidenceClass": "confirmed",
        "id": "evidence:v1:77dfe5388b635d56923956308f7bb6d1bbfea09f87e7cfb6b2100a9bd77e4892",
        "role": "value-mapping",
        "location": {
          "file": "server/mapping.fixture",
          "lines": [
            1,
            1
          ],
          "excerpt": "targetField = row.source_field;"
        },
        "provenance": {
          "discoveredBy": [
            "ripgrep"
          ],
          "verifiedBy": "filesystem",
          "operations": [
            "RIPGREP_SEARCH",
            "FILESYSTEM_READ_RANGE"
          ]
        },
        "reasonCodes": [
          "DIRECT_ALIAS_MAPPING",
          "EXACT_TERM_MATCH"
        ]
      }
    ],
    "candidates": [],
    "coverage": {
      "backends": [
        {
          "backend": "ripgrep",
          "status": "used",
          "hitCount": 1
        }
      ],
      "fallbackChecked": false,
      "indexState": "unknown",
      "indexFreshness": "not-applicable",
      "limitsReached": [],
      "exclusionSummary": {}
    },
    "nextActions": []
  }
}
```

#### `testkit/fixtures/mcp/lifecycle-probe.ts`

```
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app/app.module.js';
import type {
  LocateExecutionContext,
  LocateRequest,
  LocateResult,
  RepositoryEvidenceService,
} from '../../../src/contracts/index.js';
import type { McpStdioHost } from '../../../src/mcp/mcp-stdio-host.js';
import { NodeSafeProcessRunner } from '../../../src/repository/node-safe-process-runner.js';
import {
  MCP_STDIO_HOST,
  REPOSITORY_EVIDENCE_SERVICE,
} from '../../../src/runtime/tokens.js';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Lifecycle probe environment ${name} is required.`);
  }
  return value;
}

const contextMarker = requiredEnvironment(
  'REPO_NAV_LIFECYCLE_CONTEXT_MARKER',
);
const pidFile = requiredEnvironment('REPO_NAV_LIFECYCLE_PID_FILE');
type LifecycleProbeFault =
  | 'skip-context-close'
  | 'leave-child-running'
  | 'force-timeout'
  | 'force-nonzero-exit';

function readProbeFault(): LifecycleProbeFault | undefined {
  const value = process.env['REPO_NAV_LIFECYCLE_PROBE_FAULT'];
  switch (value) {
    case undefined:
    case 'skip-context-close':
    case 'leave-child-running':
    case 'force-timeout':
    case 'force-nonzero-exit':
      return value;
    default:
      throw new Error(`Unsupported lifecycle probe fault: ${value}.`);
  }
}

const probeFault = readProbeFault();

const descendantScript = [
  "import { spawn } from 'node:child_process';",
  "import { writeFileSync } from 'node:fs';",
  "const descendant = spawn(process.execPath, ['--input-type=module', '--eval', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });",
  "if (descendant.pid === undefined) { throw new Error('descendant pid unavailable'); }",
  "writeFileSync(process.env.REPO_NAV_LIFECYCLE_PID_FILE, JSON.stringify({ directPid: process.pid, descendantPid: descendant.pid }));",
  'setInterval(() => {}, 1000);',
].join('\n');

class ProbeEvidenceService implements RepositoryEvidenceService {
  private readonly runner = new NodeSafeProcessRunner();

  public async locate(
    _request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult> {
    if (probeFault === 'leave-child-running') {
      const leaked = spawn(
        process.execPath,
        ['--input-type=module', '--eval', descendantScript],
        {
          cwd: resolve(import.meta.dirname, '..', '..', '..'),
          detached: true,
          env: { ...process.env, REPO_NAV_LIFECYCLE_PID_FILE: pidFile },
          stdio: 'ignore',
          windowsHide: true,
        },
      );
      leaked.unref();
      await new Promise<void>((resolveAbort) => {
        if (context.signal.aborted) {
          resolveAbort();
          return;
        }
        context.signal.addEventListener('abort', () => resolveAbort(), {
          once: true,
        });
      });
      return {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Lifecycle leak probe completed.',
          recoverable: false,
        },
      };
    }
    await this.runner.run(
      {
        executable: process.execPath,
        argv: ['--input-type=module', '--eval', descendantScript],
        cwd: resolve(import.meta.dirname, '..', '..', '..'),
        env: { REPO_NAV_LIFECYCLE_PID_FILE: pidFile },
        timeoutMs: 30_000,
        maxStdoutBytes: 1_024,
        maxStderrBytes: 1_024,
        terminateGraceMs: 100,
      },
      context.signal,
    );
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lifecycle probe completed.',
        recoverable: false,
      },
    };
  }
}

const closeProbe = {
  onModuleDestroy: (): void => {
    if (probeFault !== 'skip-context-close') {
      writeFileSync(contextMarker, 'closed\n', 'utf8');
    }
  },
};

async function runProbe(): Promise<void> {
  const application = await Test.createTestingModule({
    imports: [AppModule],
    providers: [{ provide: 'LIFECYCLE_CLOSE_PROBE', useValue: closeProbe }],
  })
    .overrideProvider(REPOSITORY_EVIDENCE_SERVICE)
    .useValue(new ProbeEvidenceService())
    .compile();
  const host = application.get<McpStdioHost>(MCP_STDIO_HOST);
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    shutdownPromise ??= (async () => {
      await host.close('eof');
      await application.close();
    })();
    return shutdownPromise;
  };
  process.stdin.once('end', () => {
    if (probeFault === 'force-timeout') {
      return;
    }
    if (probeFault === 'force-nonzero-exit') {
      process.exit(7);
    }
    void shutdown().catch(() => {
      process.exitCode = 1;
    });
  });
  await host.connect();
}

void runProbe().catch(() => {
  process.exitCode = 1;
});
```

#### `testkit/manifests/golden/mcp-source-field-mapping.yaml`

```
schemaVersion: '1.0'
id: mcp-source-field-mapping
kind: success
fixtureRoot: D:/fixture/repository
request:
  repoPath: D:/fixture/repository
  question: source-field-mapping
  terms: [hcp_id, hcpId]
expected:
  ok: true
  status: ok
  confirmed:
    - file: server/mapping.ts
      contains: hcpId = hcp_id
      role: value-mapping
      reasonCodes: [DIRECT_ALIAS_MAPPING, EXACT_TERM_MATCH]
  candidates: []
  forbiddenEvidenceIds: []
  requiredCoverageCodes: []
  minimumExclusionCounts: {}
```

#### `testkit/manifests/mcp/shutdown-cleanup-probe.yaml`

```
schemaVersion: '1.0'
id: shutdown-cleanup-probe
scenario: shutdown-cleanup-probe
expected:
  stdoutMode: mcp-frames-only
  exitCode: 0
  maxShutdownMs: 5000
```

#### `testkit/manifests/performance/large-synthetic-repository-v1.yaml`

```
schemaVersion: '1.0'
id: large-synthetic-repository-v1
generator:
  seed: 20260710
  sourceFiles: 1000
  modules: 50
  directMappings: 10
  namedDecoys: 200
  fileSizeDistribution:
    small: 500
    medium: 350
    large: 150
request:
  repoPath: '<SYNTHETIC_ROOT>'
  question: Locate all deterministic synthetic source mappings.
  terms: [syntheticTarget, row.synthetic_source]
  termCase: sensitive
  limits:
    maxFiles: 20
    maxConfirmed: 20
    maxCandidates: 20
    timeoutMs: 30000
expected:
  status: partial
  confirmedCount: 10
  candidateCount: 10
  limitsReached: [MAX_FILES_REACHED]
warmupRuns: 1
measuredRuns: 5
```

#### `testkit/performance/large-synthetic-repository.ts`

```
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { cpus, arch, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { z } from 'zod';
import { parse } from 'yaml';

import {
  LimitReasonCodeSchema,
  LocateRequestSchema,
  LocateStatusSchema,
  type LocateResult,
} from '../../src/contracts/index.js';
import { RepositoryEvidenceEngine } from '../../src/evidence/repository-evidence-engine.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { createStableGoldenProjection } from '../contracts/golden-projection.js';

const GeneratorConfigSchema = z
  .strictObject({
    seed: z.int().nonnegative(),
    sourceFiles: z.literal(1000),
    modules: z.literal(50),
    directMappings: z.literal(10),
    namedDecoys: z.literal(200),
    fileSizeDistribution: z.strictObject({
      small: z.literal(500),
      medium: z.literal(350),
      large: z.literal(150),
    }),
  })
  .readonly();

export const LargeSyntheticManifestSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    id: z.literal('large-synthetic-repository-v1'),
    generator: GeneratorConfigSchema,
    request: LocateRequestSchema,
    expected: z
      .strictObject({
        status: LocateStatusSchema,
        confirmedCount: z.int().nonnegative(),
        candidateCount: z.int().nonnegative(),
        limitsReached: z.array(LimitReasonCodeSchema).readonly(),
      })
      .readonly(),
    warmupRuns: z.literal(1),
    measuredRuns: z.literal(5),
  })
  .readonly();
export type LargeSyntheticManifest = z.infer<
  typeof LargeSyntheticManifestSchema
>;

const PerformanceRunSchema = z
  .strictObject({
    index: z.int().positive(),
    elapsedMs: z.number().nonnegative(),
    peakRssBytes: z.int().positive(),
    projectionHash: z.string().regex(/^[a-f0-9]{64}$/u),
    status: LocateStatusSchema,
    confirmedCount: z.int().nonnegative(),
    candidateCount: z.int().nonnegative(),
    limitsReached: z.array(LimitReasonCodeSchema).readonly(),
  })
  .readonly();

export const SyntheticPerformanceReportSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0'),
    caseId: z.literal('large-synthetic-repository-v1'),
    generator: GeneratorConfigSchema,
    generatorConfigHash: z.string().regex(/^[a-f0-9]{64}$/u),
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/u),
    gitCommit: z.string().min(7),
    environment: z
      .strictObject({
        node: z.string().min(1),
        platform: z.string().min(1),
        release: z.string().min(1),
        arch: z.string().min(1),
        cpu: z.string().min(1),
        dependencies: z.record(z.string(), z.string()),
      })
      .readonly(),
    warmupRuns: z.literal(1),
    measuredRuns: z.literal(5),
    runs: z.array(PerformanceRunSchema).length(5).readonly(),
    summary: z
      .strictObject({
        medianElapsedMs: z.number().nonnegative(),
        p95ElapsedMs: z.number().nonnegative(),
        peakRssBytes: z.int().positive(),
      })
      .readonly(),
    correctness: z
      .strictObject({
        stableProjectionHash: z.string().regex(/^[a-f0-9]{64}$/u),
        status: LocateStatusSchema,
        confirmedCount: z.int().nonnegative(),
        candidateCount: z.int().nonnegative(),
        limitsReached: z.array(LimitReasonCodeSchema).readonly(),
      })
      .readonly(),
    cleanup: z
      .strictObject({
        attempted: z.literal(true),
        succeeded: z.boolean(),
        fixtureRemoved: z.boolean(),
      })
      .readonly(),
    trend: z
      .strictObject({
        baselineAvailable: z.boolean(),
        timingIsBlocking: z.literal(false),
        medianDeltaPercent: z.number().nullable(),
        p95DeltaPercent: z.number().nullable(),
        peakRssDeltaPercent: z.number().nullable(),
      })
      .readonly(),
  })
  .readonly();
export type SyntheticPerformanceReport = z.infer<
  typeof SyntheticPerformanceReportSchema
>;

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function paddingFor(index: number, seed: number): string {
  const lineCount = index < 500 ? 2 : index < 850 ? 20 : 80;
  return Array.from(
    { length: lineCount },
    (_, line) =>
      `export const filler_${seed}_${index}_${line} = ${seed + index + line};`,
  ).join('\n');
}

function moduleName(index: number, manifest: LargeSyntheticManifest): string {
  if (index < manifest.generator.directMappings) {
    return 'module-000';
  }
  if (
    index <
    manifest.generator.directMappings + manifest.generator.namedDecoys
  ) {
    return `module-${String(
      1 + ((index - manifest.generator.directMappings) % 10),
    ).padStart(3, '0')}`;
  }
  return `module-${String(index % manifest.generator.modules).padStart(3, '0')}`;
}

function fileName(index: number, manifest: LargeSyntheticManifest): string {
  if (index < manifest.generator.directMappings) {
    return `${String(index).padStart(4, '0')}-mapping.ts`;
  }
  if (
    index <
    manifest.generator.directMappings + manifest.generator.namedDecoys
  ) {
    return `1000-decoy-${String(
      index - manifest.generator.directMappings,
    ).padStart(4, '0')}.ts`;
  }
  return `2000-file-${String(index).padStart(4, '0')}.ts`;
}

function sourceFor(index: number, manifest: LargeSyntheticManifest): string {
  const padding = paddingFor(index, manifest.generator.seed);
  if (index < manifest.generator.directMappings) {
    return `export const syntheticTarget = row.synthetic_source;\n${padding}\n`;
  }
  if (
    index <
    manifest.generator.directMappings + manifest.generator.namedDecoys
  ) {
    const suffix = String(index - manifest.generator.directMappings).padStart(
      3,
      '0',
    );
    return `export const namedDecoy${suffix} = "syntheticTarget and row.synthetic_source";\n${padding}\n`;
  }
  return `${padding}\n`;
}

export interface GeneratedSyntheticRepository {
  readonly root: string;
  readonly corpusHash: string;
  readonly sourceFileCount: number;
}

export function generateLargeSyntheticRepository(
  root: string,
  manifest: LargeSyntheticManifest,
): GeneratedSyntheticRepository {
  const corpusHasher = createHash('sha256');
  for (let index = 0; index < manifest.generator.sourceFiles; index += 1) {
    const relativePath = `${moduleName(index, manifest)}/${fileName(index, manifest)}`;
    const source = sourceFor(index, manifest);
    const path = resolve(root, relativePath);
    mkdirSync(resolve(path, '..'), { recursive: true });
    writeFileSync(path, source, 'utf8');
    corpusHasher.update(relativePath.replaceAll('\\', '/'), 'utf8');
    corpusHasher.update('\0', 'utf8');
    corpusHasher.update(source, 'utf8');
    corpusHasher.update('\0', 'utf8');
  }
  const moduleDirectories = readdirSync(root, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  );
  const generatedFiles = moduleDirectories.flatMap((entry) =>
    readdirSync(resolve(root, entry.name)),
  );
  const mappingCount = generatedFiles.filter((name) =>
    name.endsWith('-mapping.ts'),
  ).length;
  const decoyCount = generatedFiles.filter((name) => name.includes('-decoy-')).length;
  if (
    moduleDirectories.length !== manifest.generator.modules ||
    generatedFiles.length !== manifest.generator.sourceFiles ||
    mappingCount !== manifest.generator.directMappings ||
    decoyCount !== manifest.generator.namedDecoys
  ) {
    throw new Error('Synthetic generator output does not match its fixed config.');
  }
  return {
    root,
    corpusHash: corpusHasher.digest('hex'),
    sourceFileCount: manifest.generator.sourceFiles,
  };
}

export function loadLargeSyntheticManifest(
  repositoryRoot: string,
): LargeSyntheticManifest {
  const input: unknown = parse(
    readFileSync(
      resolve(
        repositoryRoot,
        'testkit',
        'manifests',
        'performance',
        'large-synthetic-repository-v1.yaml',
      ),
      'utf8',
    ),
  );
  return LargeSyntheticManifestSchema.parse(input);
}

interface MeasuredObservation {
  readonly result: Extract<LocateResult, { readonly ok: true }>;
  readonly elapsedMs: number;
  readonly peakRssBytes: number;
  readonly projectionHash: string;
}

async function measureLocate(
  service: RepositoryEvidenceEngine,
  request: z.infer<typeof LocateRequestSchema>,
): Promise<MeasuredObservation> {
  let peakRssBytes = process.memoryUsage().rss;
  const sampler = setInterval(() => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  }, 5);
  const startedAt = performance.now();
  try {
    const result = await service.locate(request, {
      signal: new AbortController().signal,
    });
    const elapsedMs = performance.now() - startedAt;
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
    if (!result.ok) {
      throw new Error(`Synthetic repository locate failed: ${result.error.code}.`);
    }
    return {
      result,
      elapsedMs,
      peakRssBytes,
      projectionHash: hashJson(createStableGoldenProjection(result)),
    };
  } finally {
    clearInterval(sampler);
  }
}

function percentile(values: readonly number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(ordered.length * ratio) - 1);
  const value = ordered[index];
  if (value === undefined) {
    throw new Error('Cannot calculate percentile for an empty sample.');
  }
  return value;
}

function deltaPercent(current: number, baseline: number): number {
  return baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
}

function packageDependencies(repositoryRoot: string): Readonly<Record<string, string>> {
  const input: unknown = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
  );
  return z
    .object({
      dependencies: z.record(z.string(), z.string()),
      devDependencies: z.record(z.string(), z.string()),
    })
    .transform(({ dependencies, devDependencies }) => ({
      ...dependencies,
      ...devDependencies,
    }))
    .parse(input);
}

export async function runLargeSyntheticPerformance(
  repositoryRoot: string,
  fixtureRoot: string,
): Promise<SyntheticPerformanceReport> {
  const manifest = loadLargeSyntheticManifest(repositoryRoot);
  try {
  const generated = generateLargeSyntheticRepository(fixtureRoot, manifest);
  const request = LocateRequestSchema.parse({
    ...manifest.request,
    repoPath: generated.root,
  });
  const service = new RepositoryEvidenceEngine(
    [new RipgrepBackend(new NodeSafeProcessRunner())],
    new NodeRepositoryReader(),
  );
  await measureLocate(service, request);

  const observations: MeasuredObservation[] = [];
  for (let index = 0; index < manifest.measuredRuns; index += 1) {
    observations.push(await measureLocate(service, request));
  }

  const projectionHashes = new Set(
    observations.map((observation) => observation.projectionHash),
  );
  if (projectionHashes.size !== 1) {
    throw new Error('Synthetic repository stable projection changed between runs.');
  }
  const first = observations[0];
  if (first === undefined) {
    throw new Error('Synthetic repository produced no measured observations.');
  }
  const correctness = {
    stableProjectionHash: first.projectionHash,
    status: first.result.evidence.status,
    confirmedCount: first.result.evidence.confirmed.length,
    candidateCount: first.result.evidence.candidates.length,
    limitsReached: first.result.evidence.coverage.limitsReached,
  } as const;
  if (
    correctness.status !== manifest.expected.status ||
    correctness.confirmedCount !== manifest.expected.confirmedCount ||
    correctness.candidateCount !== manifest.expected.candidateCount ||
    JSON.stringify(correctness.limitsReached) !==
      JSON.stringify(manifest.expected.limitsReached)
  ) {
    throw new Error(
      `Synthetic correctness differs: ${JSON.stringify(correctness)}.`,
    );
  }

  const elapsedSamples = observations.map((observation) => observation.elapsedMs);
  const rssSamples = observations.map((observation) => observation.peakRssBytes);
  const summary = {
    medianElapsedMs: percentile(elapsedSamples, 0.5),
    p95ElapsedMs: percentile(elapsedSamples, 0.95),
    peakRssBytes: Math.max(...rssSamples),
  } as const;
  const baselinePath = resolve(
    repositoryRoot,
    'testkit',
    'baselines',
    'performance',
    'large-synthetic-repository-v1.json',
  );
  const baseline = existsSync(baselinePath)
    ? SyntheticPerformanceReportSchema.parse(
        JSON.parse(readFileSync(baselinePath, 'utf8')) as unknown,
      )
    : undefined;
  const generatorConfigHash = hashJson(manifest.generator);
  if (
    baseline !== undefined &&
    (baseline.generatorConfigHash !== generatorConfigHash ||
      baseline.corpusHash !== generated.corpusHash ||
      baseline.correctness.stableProjectionHash !==
        correctness.stableProjectionHash)
  ) {
    throw new Error('Synthetic correctness/config differs from committed baseline.');
  }

  return SyntheticPerformanceReportSchema.parse({
    schemaVersion: '1.0',
    caseId: manifest.id,
    generator: manifest.generator,
    generatorConfigHash,
    corpusHash: generated.corpusHash,
    gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    }).trim(),
    environment: {
      node: process.version,
      platform: platform(),
      release: release(),
      arch: arch(),
      cpu: cpus()[0]?.model ?? 'unknown-cpu',
      dependencies: packageDependencies(repositoryRoot),
    },
    warmupRuns: manifest.warmupRuns,
    measuredRuns: manifest.measuredRuns,
    runs: observations.map((observation, index) => ({
      index: index + 1,
      elapsedMs: observation.elapsedMs,
      peakRssBytes: observation.peakRssBytes,
      projectionHash: observation.projectionHash,
      status: observation.result.evidence.status,
      confirmedCount: observation.result.evidence.confirmed.length,
      candidateCount: observation.result.evidence.candidates.length,
      limitsReached: observation.result.evidence.coverage.limitsReached,
    })),
    summary,
    correctness,
    cleanup: {
      attempted: true,
      succeeded: true,
      fixtureRemoved: true,
    },
    trend: {
      baselineAvailable: baseline !== undefined,
      timingIsBlocking: false,
      medianDeltaPercent:
        baseline === undefined
          ? null
          : deltaPercent(
              summary.medianElapsedMs,
              baseline.summary.medianElapsedMs,
            ),
      p95DeltaPercent:
        baseline === undefined
          ? null
          : deltaPercent(summary.p95ElapsedMs, baseline.summary.p95ElapsedMs),
      peakRssDeltaPercent:
        baseline === undefined
          ? null
          : deltaPercent(summary.peakRssBytes, baseline.summary.peakRssBytes),
    },
  });
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
    if (existsSync(fixtureRoot)) {
      throw new Error('Synthetic repository fixture cleanup failed.');
    }
  }
}

export function writeSyntheticPerformanceReport(
  repositoryRoot: string,
  report: SyntheticPerformanceReport,
): string {
  const outputDirectory = resolve(repositoryRoot, 'test-artifacts', 'performance');
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = resolve(
    outputDirectory,
    'large-synthetic-repository-v1.json',
  );
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}
```


## Validation Commands And Results
- npm run build -> passed
- npm run typecheck -> passed
- Golden evaluator -> 8 passed
- Golden families -> 46 passed
- MCP protocol+lifecycle -> 37 passed, 2 filtered
- Golden --all -> 64 passed, 1 conditional skip
- MCP --all -> 39 passed
- unit --all -> 158 passed
- performance report -> passed
- git diff --check + marker scan -> passed

## Reviewer Risk Prompts
- Check database and migration safety.
- Check concurrency and race conditions.
- Check idempotency and rerun behavior.
- Check crash-resume persistence.
- Check provider cost and production writes.
- Check deterministic LLM boundary for IDs, paths, enums, and foreign keys.
