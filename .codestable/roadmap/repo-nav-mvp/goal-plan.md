---
doc_type: roadmap-goal-plan
roadmap: repo-nav-mvp
status: ready-to-dispatch
created: 2026-07-10
baseline_ref: 04b04f7a1314f322e82157363ced505e2199cfc8
---

# RepoNav MVP Goal ????

## 1. Inputs And Authorization

- Roadmap?`.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md`
- Items?`.codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml`
- State?`.codestable/roadmap/repo-nav-mvp/goal-state.yaml`
- ??????????roadmap approved?2026-07-10 ?? A ???? 9 ? feature design?
- ?? design `status: approved`??? design-review `status: passed`?
- Git baseline?`04b04f7a1314f322e82157363ced505e2199cfc8` on `main`?

## 2. Feature Execution Order

1. `repository-evidence-foundation` ? ?????schema v1?DI skeleton ? unit/Golden/MCP runner ???non-functional?
2. `repository-access-process-safety` ? ?? filesystem/process typed safety seams ???? cleanup?non-functional?
3. `text-source-evidence-engine` ? ?? literal ripgrep ? confirmed/candidate EvidencePack ??? service ???functional?
4. `mcp-locate-surface` ? ???? stdio ?? repo_nav_locate success/error/cancellation/lifecycle?functional?
5. `candidate-evidence-policy` ? ?? bounded sibling/alias candidate ? MCP minimal loop?functional?
6. `codegraph-fallback-orchestration` ? ?? CodeGraph probe/query?conservative completeness ? ripgrep fallback?mixed?
7. `evidence-output-guardrails` ? ?? status/limits/redaction/safe errors ??? public surfaces parity?mixed?
8. `mvp-golden-regression-suite` ? ?? shared evaluator?fixture completeness?lifecycle ? synthetic baseline?non-functional?
9. `debug-cli-mcp-guide` ? ?? debug CLI???? MCP/API docs ? MVP aggregate verification?mixed?

???? DAG ?????F1 ? F2 ? F3 ? F4 ? F5 ? F6 ? F7 ? F8 ? F9?F4/F5 ? F6 ??? F3 ????? goal-state ??????????F6 ? F5 ???????????

## 3. Roadmap Core Acceptance Paths

1. **Service source path**????? direct mapping ? literal search?current-file verification?merge/classification ??? confirmed?DTO/entity/test/docs decoy ?? false-confirmed?
2. **MCP path**??? stdio initialize ? tools/list ? `repo_nav_locate` success/recoverable/error?structured/text parity?isError?request cancellation ? graceful shutdown ????
3. **Candidate path**??? pack ? direct confirmed + sibling/alias candidate?promotion?budget?mutual exclusion ? unrelated decoy ?????
4. **CodeGraph path**??? temp synthetic index ? status/query JSON ???missing/failure/incomplete/global-abort/local-timeout ?? predicate ????? ripgrep fallback?
5. **Guardrail path**?status/limits/redaction/error matrices ???raw secret ???? service/MCP/text/error/stdout/stderr?
6. **CLI/docs path**?`debug locate|probe|golden` ???? MCP docs snippets ?????? aggregate command ???

F1/F2/F8 ????? safety-net/verification features?????????? `goal-features/*.md`???????? UI ??????? core commands?

## 4. Key Assumptions

- RepoNav ??? LLM?caller ???? literal terms/anchors?
- Node?npm?ripgrep ??? CodeGraph ?? implementation ???????/?????????? lockfile/compatibility artifacts ???
- MCP ?? local stdio???? HTTP listener?
- confirmed ?????? conservative grammar????/?????? candidate/excluded?
- ??????????Windows process-tree/reparse ? MCP EOF/signal ??????????
- ?? initial dirty set ?????????? `.codestable` design/review/goal package????? `/goal` ??goal ??? F1 ??? planning-baseline scoped commit????? unrelated files ???????????????? commit?

## 5. Top 3 Risks And Mitigations

1. **?????????**?false-confirmed?candidate ?? confirmed?redaction ???????truth tables?negative fixtures?predicate completeness?forbidden-value scan?
2. **???????**?Windows descendants/reparse?MCP cancellation/shutdown?child stdout ??????F2/F4 real filesystem/process/stdio integration ? single-settle cleanup evidence?
3. **????/????**?MCP SDK/CodeGraph JSON/version?synthetic timing????lockfile?low-level protocol snapshots?versioned parser fixtures?temp indexed smoke?committed environment-aware baseline?provider warning ? review/QA/audit???

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

Roadmap ??????????????

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

MVP design ???? lint script?lint-like ????? TypeScript strict?build?code review ? cleanliness gates ?????? audit ??????? `lint` script?

## 8. Preflight Strategy

1. ?? git work tree?branch?baseline SHA ????????????? planning dirty set?
2. ? `/goal` ?????? planning-baseline scoped commit???????????? F1???????? unrelated ???
3. F1 ??? Node/npm?package/lockfile ??????????? F1 ?????
4. ? feature ?? design approved?review passed?dependencies accepted?checklist pending?
5. ?? binary ??? version/capability?CodeGraph live smoke ?? temp repo init???????? index?
6. ?????????????? feature patch ?? unrelated failure?

## 9. DoD Policy

- Design DoD?approved design + passed independent design-review?
- Implementation DoD?steps done?scope clean?core commands real?DoD/evidence/gate artifacts ???
- Review DoD??? Task agent review passed?? unresolved blocking??? provider/gate warnings?
- QA DoD?????/DoD/review focus/residual risks ?????????????
- Acceptance DoD?checks passed?review/QA passed?artifacts/roadmap/architecture/requirement ?????
- Feature Done?acceptance ? scoped commit?????????goal-state index +1?
- Roadmap Done??? accepted + final aggregate + consistency/audit gates + `goal-audit.md status=passed`?

## 10. Gate Policy

- ??????`.codestable/roadmap/repo-nav-mvp/goal-protocol-gates.md` ? `.codestable/gates/roadmap-goal-gates.yaml`?
- `implementation.before_review` ?? scope-gate?dod-runner?evidence-pack?
- `review.before_pass` / `qa.before_acceptance` / `acceptance.before_done` ? protocol-only gates ????????? artifacts ???
- `roadmap_audit.before_complete` ?? goal-consistency-gate??? audit protocol ?? goal-audit verdict?
- gate failed ?????????????????????????????? handoff?

## 11. Provider Policy

- archguard / meta-cc unavailable??? provider unavailable ? fallback???????????
- provider warning ??? code review?QA ? final audit ?????????????? blocking?
- ?? Task agent ? code review ????????????? self-review??? handoff ??????????
- meta-cc ??????????? unavailable??????????? tests/diff evidence?

## 12. Missing Verification Tool Recovery

- ?????/?? design ???????????? package scripts?test config?fixture runner?
- ????? `node`?`npm`?`rg`?`codegraph`???????? shim??? runner?always-green command ??? output?
- ?????????? probe??? core path??????/??????????? blocked/handoff????????? skip?

## 13. Final Audit Evidence

????????? feature ? design/checklist/design-review/review/QA/acceptance?evidence pack/results?gate results?DoD contract/results?command logs?diff/artifact inventory?provider warnings?residual risks?scoped commits?items/state/architecture/requirement ???

???????

```text
python .codestable/tools/codestable-goal-consistency-gate.py --roadmap .codestable/roadmap/repo-nav-mvp
```

`goal-audit.md` ? 7 ?? `goal-evidence-summary.md` ???? feature evidence packs?final commands?provider warnings?E/C/H summary ? H-only core checks??????????? H-only evidence?
