---
doc_type: roadmap-goal-plan
roadmap: repo-nav-mvp
status: completed
created: 2026-07-10
baseline_ref: a356b6117ed65c2959132f0d6b62485295d60ccb
---

# RepoNav MVP Goal 执行总览

## 1. Inputs And Authorization

- Roadmap：`.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md`
- Items：`.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml`
- State：`.codestable/roadmap/repo-nav-mvp/goal-state.yaml`
- Owner 已确认 roadmap 和全部 9 份 feature design。
- 所有 design approved、design-review passed。
- Git implementation baseline：`a356b6117ed65c2959132f0d6b62485295d60ccb`。

## 2. Feature Execution Order

1. `repository-evidence-foundation` — 建立工程、schema v1、DI skeleton 与 unit/Golden/MCP runner 基线（non-functional）
2. `repository-access-process-safety` — 建立 filesystem/process 安全 seams 与跨平台清理（non-functional）
3. `text-source-evidence-engine` — 完成 literal search 到 EvidencePack 的第一条 service 路径（functional）
4. `mcp-locate-surface` — 通过 stdio 暴露 repo_nav_locate（functional）
5. `candidate-evidence-policy` — 增加 sibling/alias candidate 与最小 MCP 闭环（functional）
6. `codegraph-fallback-orchestration` — 接入 CodeGraph 并提供保守 fallback（mixed）
7. `evidence-output-guardrails` — 完成状态、limits、redaction 与错误 parity（mixed）
8. `mvp-golden-regression-suite` — 完成 full regression、lifecycle 和 synthetic baseline（non-functional）
9. `debug-cli-mcp-guide` — 交付 debug CLI、可执行 docs 与 aggregate verification（mixed）

顺序是 DAG 的可恢复串行化：F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9。

## 3. Roadmap Core Acceptance Paths

1. Service：direct mapping confirmed，DTO/entity/test/docs decoy 不 false-confirmed。
2. MCP：真实 stdio initialize/list/call、success/recoverable/error、cancellation 和 shutdown。
3. Candidate：同一 pack 含 confirmed、candidate 和 decoy exclusion。
4. CodeGraph：temp indexed success，加 missing/failure/incomplete/abort/timeout fallback。
5. Guardrail：status/limits/redaction/error matrices 与 forbidden-value 全表面扫描。
6. CLI/docs：三条 debug commands、真实 MCP 文档 snippets 和最终 aggregate command。

F1/F2/F8 是非功能性 safety-net；替代证据写在对应 goal-feature spec 中，不得因无 UI 而跳过 core commands。

## 4. Key Assumptions

- RepoNav 不内置 LLM；caller 提供 literal terms/anchors。
- MCP 使用 local stdio，不启动 HTTP listener。
- Confirmed 只覆盖 approved conservative grammar。
- Node/npm/ripgrep/CodeGraph 必须通过正式依赖或版本探测获得。
- Windows process-tree/reparse 与 stdio EOF/signal 必须在真实平台验证。
- Planning package 已以 `a356b6117ed65c2959132f0d6b62485295d60ccb` 提交；本次 baseline state 更新后工作树必须干净。

## 5. Top 3 Risks And Mitigations

1. 错误事实/敏感泄露：truth tables、negative fixtures、predicate completeness、forbidden scan。
2. 跨平台资源泄漏：F2/F4 真实 filesystem/process/stdio integration 与 single-settle cleanup。
3. 外部工具/性能漂移：lockfile、protocol snapshots、versioned CodeGraph fixtures、temp smoke、committed performance baseline。

## 6. Mandatory Validation Commands By Feature

### repository-evidence-foundation

- `npm run build`
- `npm run typecheck`
- `npm test -- --group runner-smoke --group contract --group di`
- `npm run test:golden -- --case runner-smoke --case manifest-schema --case evaluator-smoke`
- `npm run test:mcp -- --case runner-smoke --case lifecycle-manifest-schema`
### repository-access-process-safety

- `npm run build`
- `npm run typecheck`
- `npm test -- --group repository-safety --group reader-limits --group reader-failures`
- `npm test -- --group process-contract --group process-output-isolation`
- `npm test -- --group process-cleanup --case reader-abort-no-late-completion`
### text-source-evidence-engine

- `npm run build`
- `npm run typecheck`
- `npm test -- --group ripgrep-backend`
- `npm test -- --group evidence-merge`
- `npm test -- --group direct-mapping-classifier --group evidence-id-order && npm run test:golden -- --case source-field-mapping --case false-confirmation-decoys --case exclusion-summary`
- `npm run test:golden -- --case text-engine-baseline --case ripgrep-unavailable --case ripgrep-failed --case ripgrep-incomplete --case ripgrep-timeout`
### mcp-locate-surface

- `npm run build`
- `npm run typecheck`
- `npm run test:mcp -- --case initialize-tools-capability --case tool-list-schema --case single-tool-readonly --case unknown-tool-jsonrpc-boundary`
- `npm run test:mcp -- --case source-field-mapping --case recoverable-status-parity`
- `npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity`
- `npm run test:mcp -- --case request-cancellation-cleanup --case stdio-clean-output --case stdio-graceful-shutdown`
### candidate-evidence-policy

- `npm run build`
- `npm run typecheck`
- `npm test -- --group candidate-truth-table --group candidate-discovery --group candidate-context --case secondary-backend-provenance-table`
- `npm test -- --group candidate-classification --case discovery-key-mutual-exclusion`
- `npm test -- --group candidate-budget --group candidate-permutation`
- `npm run test:golden -- --case sibling-candidate --case alias-candidate --case sibling-false-positive && npm run test:mcp -- --case candidate-minimal-loop`
### codegraph-fallback-orchestration

- `npm run build`
- `npm run typecheck`
- `npm test -- --group codegraph-probe --group codegraph-parser`
- `npm test -- --group codegraph-query-plan`
- `npm run test:golden -- --case codegraph-missing --case codegraph-no-result --case codegraph-failed --case codegraph-incomplete --case codegraph-global-abort-no-fallback --case codegraph-local-timeout-fallback --case codegraph-hit-unverified --case codegraph-symbol-complete-no-fallback --case codegraph-secondary-provenance-table --case backend-unavailable`
- `npm test -- --group codegraph-live-smoke --case indexed-temp-repo`
### evidence-output-guardrails

- `npm run build`
- `npm run typecheck`
- `npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max`
- `npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence`
- `npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity`
- `npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity`
### mvp-golden-regression-suite

- `npm run build`
- `npm run typecheck`
- `npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test`
- `npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status`
- `npm run test:mcp -- --group protocol --group lifecycle`
- `npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all`
- `npm run test:golden -- --case large-synthetic-repository --report-performance`
### debug-cli-mcp-guide

- `npm run build`
- `npm run typecheck`
- `npm test -- --group debug-cli-shell --group debug-cli-lifecycle`
- `npm test -- --group debug-cli-locate`
- `npm test -- --group debug-cli-probe --group debug-cli-golden`
- `npm run test:docs`
- `npm run build && npm run typecheck && npm test && npm run test:golden -- --all && npm run test:mcp -- --all && npm run test:docs`

## 7. Final Aggregate Commands

```text
npm run build
npm run typecheck
npm test
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
npm run test:golden -- --case large-synthetic-repository --report-performance
npm test -- --group codegraph-live-smoke --case indexed-temp-repo
python .codestable/tools/codestable-goal-consistency-gate.py --roadmap .codestable/roadmap/repo-nav-mvp
```

MVP 没有独立 lint script；TypeScript strict、build、review 和 cleanliness gates 提供替代，不得临时发明空壳 lint。

## 8. Preflight Strategy

1. 验证 branch、baseline SHA、干净 worktree 与 dependencies accepted。
2. F1 前确认 Node/npm；package/lockfile 不存在是预期，由 F1 正式建立。
3. 外部 binary 先 probe version/capability；CodeGraph 只在 temp repo init。
4. 基线红灯必须归因，不能用 feature patch 掩盖 unrelated failure。

## 9. DoD Policy

- Design：approved + independent design-review passed。
- Implementation：steps done、scope clean、core commands real、DoD/evidence/gate artifacts 完整。
- Review：独立 Task agent passed，无 unresolved blocking。
- QA：核心场景、DoD、review focus、residual risks 全覆盖。
- Acceptance：checks passed，roadmap/architecture/requirement 写回完成。
- Feature done：scoped commit 成功、工作树干净、state index +1。
- Roadmap done：全部 accepted、aggregate commands、consistency/audit gates 与 passed goal-audit。

## 10. Gate Policy

- 权威入口：`goal-protocol-gates.md` 与 `.codestable/gates/roadmap-goal-gates.yaml`。
- Implementation 前 review 必跑 scope-gate、dod-runner、evidence-pack。
- Review/QA/acceptance protocol-only gates 由对应 skill 根据真实 artifacts 裁决。
- 最终必跑 goal-consistency-gate；失败返回修复，三轮失败或契约需改变则 handoff。

## 11. Provider Policy

- archguard / meta-cc unavailable：记录 fallback，不自动阻塞。
- Provider warning 必须由 review、QA 或 audit 解释；影响核心判断时 blocking。
- Code review 默认使用独立 Task agent；不可用时不得静默 self-review。

## 12. Missing Verification Tool Recovery

- 只允许安装/锁定 design 声明的真实依赖，或修复 package scripts/test config。
- 禁止与 node/npm/rg/codegraph/test framework 同名的 shim、空壳 runner、always-green command。
- 核心工具无法恢复则 blocked/handoff；非核心才可带理由 skip。

## 13. Final Audit Evidence

最终审计核验每个 feature 的 design/checklist/review/QA/acceptance、evidence pack/results、gate/DoD results、command logs、diff/artifact inventory、provider warnings、residual risks、commits 和 writebacks。

必须运行：

```text
python .codestable/tools/codestable-goal-consistency-gate.py --roadmap .codestable/roadmap/repo-nav-mvp
```

`goal-audit.md` 或 `goal-evidence-summary.md` 必须聚合 provider warnings、E/C/H summary 和 H-only core checks；核心完成不能只靠 H-only evidence。
