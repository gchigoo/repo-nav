---
doc_type: feature-evidence-pack
feature: input-abort-contract-v2
status: generated
---

# input-abort-contract-v2 evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-design.md`
- Checklist: `.codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-checklist.yaml`

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
      "stdout": "\n> repo-nav@0.1.0 build\n> tsc -p tsconfig.build.json && tsc -p tsconfig.cli.json\n\n",
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
      "command": "npm test -- --group input-abort-contract-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group input-abort-contract-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ✓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests) 9ms\n ✓ test/unit/canonical-locate-finalization-v2.spec.ts (2 tests) 11ms\n ✓ test/unit/cli-input-contract-v2.spec.ts (1 test) 13ms\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/locate-request-v2.spec.ts (6 tests) 28ms\n ↓ test/unit/contract.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests) 47ms\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 11 skipped) 20ms\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n ✓ test/unit/canonical-locate-execution.spec.ts (10 tests | 9 skipped) 60ms\n\n Test Files  7 passed | 46 skipped (53)\n      Tests  21 passed | 341 skipped (362)\n   Start at  19:35:49\n   Duration  4.94s (transform 21.98s, setup 0ms, import 56.47s, tests 188ms, environment 14ms)\n\n",
      "stderr": "",
      "id": "CMD-F6-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group locate-status --group streaming-ripgrep --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge --group public-output-v2",
      "exit_code": 0,
      "stdout": "st/unit/discovery-reservation-v2.spec.ts (1 test) 8ms\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests) 25ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ✓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test) 670ms\n     ✓ registers ripgrep-group ordinals via executor and rejects bare-runner searchViews bypass  667ms\n ✓ test/unit/final-snapshot-check.spec.ts (4 tests) 190ms\n ✓ test/unit/backend-execution-trace-v2.spec.ts (2 tests) 921ms\n     ✓ enforces seal/late-start/reducer outcome binding  913ms\n ✓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests) 14ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 79ms\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests | 8 skipped)\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 55ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 74ms\n ✓ test/unit/repository-git-state-probe.spec.ts (1 test) 6ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 187ms\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 1 skipped) 41ms\n ✓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test) 592ms\n     ✓ consumes expandedMaxHits=800 via shared search and runs scope fold + legacy reservation  589ms\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/di.spec.ts (3 tests | 2 skipped) 57ms\n ✓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests) 13ms\n ✓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests) 12ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/verified-record-cache.spec.ts (1 test) 10ms\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/request-snapshot-cache.spec.ts (3 tests) 207ms\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test) 10ms\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests) 1339ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  831ms\n     ✓ keeps production roots free of shadow/composer/schema runtime edges  497ms\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2063ms\n     ✓ distinguishes its own deadline from a caller abort  1011ms\n     ✓ retains verification completed before the abort  1019ms\n ✓ test/unit/relevance-ranking-budget.spec.ts (15 tests) 646ms\n     ✓ does not export F2 stages from package root  539ms\n ✓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests) 525ms\n ✓ test/unit/canonical-locate-execution.spec.ts (10 tests | 1 skipped) 962ms\n     ✓ keeps no-mutation deep-exact on NodeRepositoryReader snapshot path  603ms\n ✓ test/unit/process-cleanup.spec.ts (7 tests | 6 skipped) 2595ms\n     ✓ early-stop/output path kills owned tree  2592ms\n ✓ test/unit/safe-process-streaming-v2.spec.ts (9 tests) 2778ms\n     ✓ succeeds at exact N and limits on N+1 for stdout/stderr  941ms\n     ✓ accepts continue-full and rejects invalid decisions  993ms\n     ✓ projects kernel settlements to legacy SafeProcessResult rows  451ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 3518ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  2850ms\n\n Test Files  30 passed | 23 skipped (53)\n      Tests  170 passed | 192 skipped (362)\n   Start at  19:35:57\n   Duration  9.01s (transform 24.04s, setup 0ms, import 59.44s, tests 17.62s, environment 11ms)\n\n",
      "stderr": "",
      "id": "CMD-UPSTREAM-REGRESSION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "ut-contract-v2.spec.ts (1 test) 14ms\n ✓ test/unit/contract.spec.ts (15 tests) 39ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 113ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 31ms\n ✓ test/unit/relevance-ranking-budget.spec.ts (15 tests) 908ms\n     ✓ does not export F2 stages from package root  719ms\n ✓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests) 9ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 19ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 24ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 98ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 27ms\n ✓ test/unit/locate-request-v2.spec.ts (6 tests) 27ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 25ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2074ms\n     ✓ distinguishes its own deadline from a caller abort  1020ms\n     ✓ retains verification completed before the abort  1023ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 32ms\n ✓ test/unit/canonical-locate-execution.spec.ts (10 tests) 1383ms\n     ✓ keeps no-mutation deep-exact on NodeRepositoryReader snapshot path  709ms\n     ✓ purges mutated evidence and elevates v1 status to at least partial  356ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 95ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 270ms\n ✓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests) 55ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 264ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 2188ms\n     ✓ produces sibling candidates from the real single-line RipgrepBackend path  796ms\n     ✓ keeps confirmed identity unchanged when only the candidate window expands  391ms\n     ✓ emits one confirmed evidence for an occurrence that also matches candidate terms  344ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 1319ms\n     ✓ passes shell metacharacters to git as literal path arguments  1009ms\n     ✓ blocks when git status cannot inspect the current directory  307ms\n ✓ test/unit/safe-process-streaming-v2.spec.ts (9 tests) 5113ms\n     ✓ succeeds at exact N and limits on N+1 for stdout/stderr  1703ms\n     ✓ accepts continue-full and rejects invalid decisions  2580ms\n     ✓ projects kernel settlements to legacy SafeProcessResult rows  491ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 4132ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  3513ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1878ms\n     ✓ preserves special argv boundaries without a shell  399ms\n     ✓ inherits only allowlisted environment and applies explicit additions  326ms\n     ✓ terminates the tree on stdout N+1 overflow  378ms\n     ✓ terminates the tree on stderr N+1 overflow  325ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 4084ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  4081ms\n ✓ test/unit/process-cleanup.spec.ts (7 tests) 13841ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2927ms\n     ✓ terminates direct child and descendant on timeout  2251ms\n     ✓ terminates direct child and descendant when stdout observes N+1  1601ms\n     ✓ terminates direct child and descendant when stderr observes N+1  1627ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3568ms\n     ✓ early-stop/output path kills owned tree  1737ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 11636ms\n     ✓ proves abort, single settlement, and owned tree death  2539ms\n     ✓ proves timeout, single settlement, and owned tree death  2133ms\n     ✓ keeps exact-N success and N+1 stdout-limit  1728ms\n     ✓ keeps exact-N success and N+1 stderr-limit  1680ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3482ms\n\n Test Files  53 passed (53)\n      Tests  361 passed | 1 skipped (362)\n   Start at  19:36:08\n   Duration  16.19s (transform 17.46s, setup 0ms, import 50.80s, tests 54.59s, environment 10ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group input-abort-contract-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group input-abort-contract-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/large-streaming-ripgrep.spec.ts (1 test | 1 skipped)\n ↓ test/golden/public-output-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/relevance-ranking-budget.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/request-snapshot-cache.spec.ts (2 tests | 2 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ✓ test/golden/input-abort-contract-v2.spec.ts (1 test) 24ms\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/canonical-locate-bridge.spec.ts (1 test | 1 skipped)\n ✓ test/golden/large-synthetic-repository.spec.ts (2 tests | 1 skipped) 25ms\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  2 passed | 15 skipped (17)\n      Tests  2 passed | 79 skipped (81)\n   Start at  19:36:26\n   Duration  2.27s (transform 5.74s, setup 0ms, import 21.45s, tests 49ms, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-F6-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/golden/large-streaming-ripgrep.spec.ts (1 test) 9ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 76ms\n ✓ test/golden/relevance-ranking-budget.spec.ts (3 tests) 36ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 71ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 98ms\n ✓ test/golden/input-abort-contract-v2.spec.ts (1 test) 39ms\n ✓ test/golden/request-snapshot-cache.spec.ts (2 tests) 203ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 127ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 169ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 188ms\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 7ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 46ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 1604ms\n     ✓ matches the bounded candidate policy manifest  1342ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 2305ms\n     ✓ matches the explicit fallback transition contract  1265ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 2997ms\n     ✓ matches its versioned status and coverage manifest  1297ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  376ms\n     ✓ keeps multiple canonical symbol facts stable across anchor permutations  716ms\n ✓ test/golden/large-synthetic-repository.spec.ts (2 tests) 3961ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  3946ms\n\n Test Files  17 passed (17)\n      Tests  80 passed | 1 skipped (81)\n   Start at  19:36:29\n   Duration  6.24s (transform 7.00s, setup 0ms, import 22.81s, tests 11.94s, environment 4ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/mcp/request-cancellation-v2.spec.ts (1 test) 5ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1772ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1769ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1845ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1843ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 2329ms\n     ✓ returns confirmed and bounded candidates with transport parity  2327ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 308ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 3052ms\n     ✓ returns one confirmed mapping through real stdio  1781ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1268ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 4229ms\n     ✓ does not lose cancellation sent before the handler starts work  1848ms\n     ✓ propagates the SDK request signal to the application service  1294ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  1085ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 5305ms\n     ✓ maps schema-invalid objects to typed parity output  1785ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1263ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1103ms\n     ✓ turns thrown failures into safe typed parity output  1151ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 12955ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  762ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  724ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  690ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1670ms\n     ✓ fails when the real context close marker is deliberately skipped  1689ms\n     ✓ fails when an actual descendant tree is deliberately left running  2954ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3510ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  903ms\n\n Test Files  10 passed (10)\n      Tests  40 passed (40)\n   Start at  19:36:45\n   Duration  16.65s (transform 2.79s, setup 0ms, import 13.02s, tests 31.81s, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-MCP-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:docs",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:docs\n> npm run build --silent && tsx testkit/docs/docs-smoke-runner.ts\n\nDocs smoke passed: test-artifacts/docs/docs-smoke-v1.json\n",
      "stderr": "",
      "id": "CMD-DOCS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:platform",
      "exit_code": 0,
      "stdout": "ge-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/canonical-locate-finalization-v2.spec.ts (2 tests | 1 skipped) 10ms\n ↓ test/unit/cli-input-contract-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/contract.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-request-v2.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n\n Test Files  1 passed | 52 skipped (53)\n      Tests  1 passed | 361 skipped (362)\n   Start at  19:39:23\n   Duration  4.07s (transform 15.46s, setup 4.69s, import 43.30s, tests 10ms, environment 12ms)\n\nplatform contracts passed: F4-MCP-001, F4-MCP-002, F4-PATH-001, F4-PATH-003, F4-PATH-004, F4-PROC-001, F4-PROC-002, F4-PROC-003, F4-PROC-004, F4-PROC-005, F5-CLEANUP-001, F5-PROC-001, F5-PROC-003, F5-RG-001, F6-ABORT-001, F6-INPUT-001, F6-LATCH-001\n",
      "stderr": "",
      "id": "CMD-PLATFORM",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/validate-yaml.py --file .codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-checklist.yaml --yaml-only",
      "exit_code": 0,
      "stdout": "Validated 1 file(s): 1 passed, 0 failed.\n\n  ✓ .codestable\\features\\2026-07-24-input-abort-contract-v2\\input-abort-contract-v2-checklist.yaml\n\nAll files valid.\n",
      "stderr": "",
      "id": "CMD-YAML",
      "core": false,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/codestable-dod-contract-gate.py --design .codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-design.md --stage design",
      "exit_code": 0,
      "stdout": "{\n  \"gate_id\": \"dod-contract-gate\",\n  \"stage\": \"design\",\n  \"status\": \"passed\",\n  \"blocking\": [],\n  \"warnings\": [],\n  \"evidence\": [\n    {\n      \"design\": \".codestable\\\\features\\\\2026-07-24-input-abort-contract-v2\\\\input-abort-contract-v2-design.md\",\n      \"checked_block\": \"DoD Contract\",\n      \"structure_checks\": {\n        \"validation command id\": [\n          \"CMD-\"\n        ],\n        \"command core marker\": [\n          \"core\",\n          \"核心性\"\n        ],\n        \"failure handling marker\": [\n          \"failure_handling\",\n          \"失败处理\"\n        ]\n      },\n      \"strength\": \"minimal DoD Contract section check\"\n    }\n  ],\n  \"providers\": {}\n}\n",
      "stderr": "",
      "id": "CMD-DOD-GATE",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/codestable-scope-gate.py --feature-dir .codestable/features/2026-07-24-input-abort-contract-v2 --allow-file .codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-scope-allow.txt --check-path . --cleanliness-path src/contracts --cleanliness-path src/evidence --cleanliness-path src/mcp --cleanliness-path tools/cli --cleanliness-path test/unit --cleanliness-path test/golden --cleanliness-path test/mcp --cleanliness-path testkit --stage implementation.before_review",
      "exit_code": 0,
      "stdout": "v2/contribution-mutations-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/finalization-latch-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/index-observations-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/large-request-outcome-permutation-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/materialization-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/next-action-policy-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/outcome-proof-mutations-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/platform-abort-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/platform-finalization-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/status-priority-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/strategy-completeness-v2.ts\",\n        \"testkit/fixtures/request-outcome-v2/v1-compatibility-v2.ts\",\n        \"testkit/testing/assert-v1-shadow-fail-closed-v2.ts\"\n      ],\n      \"ignored_machine_artifacts\": [\n        \".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-dod-results.json\",\n        \".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-gate-results.json\"\n      ],\n      \"allowed_prefixes\": [\n        \".codestable/features/2026-07-24-input-abort-contract-v2\",\n        \"src/contracts/request.ts\",\n        \"src/contracts/ports.ts\",\n        \"src/contracts/locate-request-parse-v2.ts\",\n        \"src/contracts/v2/filesystem-input.ts\",\n        \"src/contracts/v2/semantic-input.ts\",\n        \"src/contracts/v2/compact-json-guard-v2.ts\",\n        \"src/contracts/v2/locate-result-v2.ts\",\n        \"src/evidence/public-output/result-resource-budget-guards-v2.ts\",\n        \"test/mcp/tool-surface.spec.ts\",\n        \"test/unit/public-output-v2-contract.spec.ts\",\n        \"testkit/fixtures/mcp/src/evidence/abort-source.ts\",\n        \"src/evidence/abort-source.ts\",\n        \"testkit/fixtures/mcp/fixture-evidence.service.ts\",\n        \"testkit/fixtures/mcp/lifecycle-probe.ts\",\n        \"src/evidence/request-outcome/\",\n        \"src/evidence/locate-execution/canonical-locate-executor-v2.ts\",\n        \"src/evidence/locate-execution/canonical-locate-finalization-v2.ts\",\n        \"src/evidence/ranking/anchor-intent-normalizer-v2.ts\",\n        \"src/evidence/public-output/materialized-evidence-core-v2.ts\",\n        \"src/evidence/request-snapshot/snapshot-outcome-contribution-v2.ts\",\n        \"src/process/backend-execution-context-v2.ts\",\n        \"src/repository/verified-text-file-source-v2.ts\",\n        \"src/mcp/locate-tool-schema.ts\",\n        \"src/mcp/mcp-stdio-host.ts\",\n        \"tools/cli/parser.ts\",\n        \"tools/cli/execute.ts\",\n        \"test/unit/locate-request-v2.spec.ts\",\n        \"test/unit/locate-abort-coordinator-v2.spec.ts\",\n        \"test/unit/canonical-locate-finalization-v2.spec.ts\",\n        \"test/unit/request-outcome-aggregator-v2.spec.ts\",\n        \"test/unit/cli-input-contract-v2.spec.ts\",\n        \"test/unit/contract.spec.ts\",\n        \"test/unit/canonical-locate-facts-bridge.spec.ts\",\n        \"test/unit/canonical-locate-execution.spec.ts\",\n        \"test/docs/cli-input-contract-v2.spec.ts\",\n        \"test/mcp/request-cancellation-v2.spec.ts\",\n        \"test/golden/input-abort-contract-v2.spec.ts\",\n        \"test/golden/large-synthetic-repository.spec.ts\",\n        \"testkit/fixtures/input-v2/\",\n        \"testkit/fixtures/request-outcome-v2/\",\n        \"testkit/testing/assert-v1-shadow-fail-closed-v2.ts\",\n        \"testkit/manifests/performance/large-synthetic-repository-v1.yaml\",\n        \"testkit/runners/runner-registry.ts\",\n        \"testkit/contracts/platform-contract.ts\",\n        \".codestable/features/2026-07-24-input-abort-contract-v2/\",\n        \".codestable/roadmap/repo-nav-public-beta/\",\n        \".codestable/architecture/system-repo-nav-foundation.md\",\n        \"test/unit/debug-cli-shell.spec.ts\",\n        \".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-tool-schema.json\",\n        \"docs/reference/repo-nav-locate.md\"\n      ]\n    }\n  ],\n  \"providers\": {}\n}\n",
      "stderr": "",
      "id": "CMD-SCOPE-CHECK",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/codestable-spec-governance.py --root . analyze",
      "exit_code": 0,
      "stdout": "OK: True\n",
      "stderr": "",
      "id": "CMD-SPEC",
      "core": false,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "git diff --check",
      "exit_code": 0,
      "stdout": "",
      "stderr": "warning: in the working copy of 'src/evidence/locate-execution/canonical-locate-executor-v2.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'testkit/fixtures/mcp/fixture-evidence.service.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'testkit/runners/runner-registry.ts', CRLF will be replaced by LF the next time Git touches it\n",
      "id": "CMD-DIFF-CHECK",
      "core": false,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {}
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 47980
Checklist bytes: 21075

## 5. Residual Risks

- none

## 6. Provider Signals

```json
{
  "archguard": {
    "status": "skipped",
    "reason": "archguard collection disabled",
    "warnings": []
  },
  "meta_cc": {
    "status": "skipped",
    "reason": "meta-cc collection disabled",
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
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-tool-schema.json",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-checklist.yaml",
        "docs/reference/repo-nav-locate.md",
        "src/contracts/ports.ts",
        "src/contracts/request.ts",
        "src/contracts/v2/locate-result-v2.ts",
        "src/evidence/abort-source.ts",
        "src/evidence/locate-execution/canonical-locate-executor-v2.ts",
        "src/evidence/public-output/materialized-evidence-core-v2.ts",
        "src/evidence/public-output/result-resource-budget-guards-v2.ts",
        "src/evidence/ranking/anchor-intent-normalizer-v2.ts",
        "src/evidence/request-snapshot/snapshot-outcome-contribution-v2.ts",
        "src/mcp/locate-tool-schema.ts",
        "src/mcp/mcp-stdio-host.ts",
        "src/process/backend-execution-context-v2.ts",
        "src/repository/verified-text-file-source-v2.ts",
        "test/golden/large-synthetic-repository.spec.ts",
        "test/mcp/tool-surface.spec.ts",
        "test/unit/canonical-locate-execution.spec.ts",
        "test/unit/canonical-locate-facts-bridge.spec.ts",
        "test/unit/contract.spec.ts",
        "test/unit/debug-cli-shell.spec.ts",
        "test/unit/public-output-v2-contract.spec.ts",
        "testkit/contracts/platform-contract.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/fixtures/mcp/lifecycle-probe.ts",
        "testkit/runners/runner-registry.ts",
        "tools/cli/execute.ts",
        "tools/cli/parser.ts",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-evidence-pack.md",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-qa.md",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-review.md",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-scope-allow.txt",
        "src/contracts/locate-request-parse-v2.ts",
        "src/contracts/v2/compact-json-guard-v2.ts",
        "src/contracts/v2/filesystem-input.ts",
        "src/contracts/v2/semantic-input.ts",
        "src/evidence/locate-execution/canonical-locate-finalization-v2.ts",
        "src/evidence/request-outcome/index.ts",
        "src/evidence/request-outcome/locate-request-raw-guard-v2.ts",
        "src/evidence/request-outcome/locate-status-v2.ts",
        "src/evidence/request-outcome/next-action-policy-v2.ts",
        "src/evidence/request-outcome/request-outcome-aggregator-v2.ts",
        "src/evidence/request-outcome/request-outcome-contribution-registry-v2.ts",
        "src/evidence/request-outcome/trusted-fallback-decision-v2.ts",
        "test/docs/cli-input-contract-v2.spec.ts",
        "test/golden/input-abort-contract-v2.spec.ts",
        "test/mcp/request-cancellation-v2.spec.ts",
        "test/unit/canonical-locate-finalization-v2.spec.ts",
        "test/unit/cli-input-contract-v2.spec.ts",
        "test/unit/locate-abort-coordinator-v2.spec.ts",
        "test/unit/locate-request-v2.spec.ts",
        "test/unit/request-outcome-aggregator-v2.spec.ts",
        "testkit/fixtures/input-v2/cli-argv-v2.ts",
        "testkit/fixtures/input-v2/file-anchor-input-v2.ts",
        "testkit/fixtures/input-v2/platform-input-v2.ts",
        "testkit/fixtures/input-v2/question-non-interference-v2.ts",
        "testkit/fixtures/input-v2/raw-request-budget-v2.ts",
        "testkit/fixtures/input-v2/repository-path-input-v2.ts",
        "testkit/fixtures/input-v2/semantic-input-v2.ts",
        "testkit/fixtures/request-outcome-v2/abort-first-writer-v2.ts",
        "testkit/fixtures/request-outcome-v2/aggregator-owner-direct-integration-v2.ts",
        "testkit/fixtures/request-outcome-v2/backend-outcomes-v2.ts",
        "testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.ts",
        "testkit/fixtures/request-outcome-v2/contribution-mutations-v2.ts",
        "testkit/fixtures/request-outcome-v2/finalization-latch-v2.ts",
        "testkit/fixtures/request-outcome-v2/index-observations-v2.ts",
        "testkit/fixtures/request-outcome-v2/large-request-outcome-permutation-v2.ts",
        "testkit/fixtures/request-outcome-v2/materialization-v2.ts",
        "testkit/fixtures/request-outcome-v2/next-action-policy-v2.ts",
        "testkit/fixtures/request-outcome-v2/outcome-proof-mutations-v2.ts",
        "testkit/fixtures/request-outcome-v2/platform-abort-v2.ts",
        "testkit/fixtures/request-outcome-v2/platform-finalization-v2.ts",
        "testkit/fixtures/request-outcome-v2/status-priority-v2.ts",
        "testkit/fixtures/request-outcome-v2/strategy-completeness-v2.ts",
        "testkit/fixtures/request-outcome-v2/v1-compatibility-v2.ts",
        "testkit/testing/assert-v1-shadow-fail-closed-v2.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-dod-results.json",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-evidence-pack-results.json",
        ".codestable/features/2026-07-24-input-abort-contract-v2/input-abort-contract-v2-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-24-input-abort-contract-v2",
        "src/contracts/request.ts",
        "src/contracts/ports.ts",
        "src/contracts/locate-request-parse-v2.ts",
        "src/contracts/v2/filesystem-input.ts",
        "src/contracts/v2/semantic-input.ts",
        "src/contracts/v2/compact-json-guard-v2.ts",
        "src/contracts/v2/locate-result-v2.ts",
        "src/evidence/public-output/result-resource-budget-guards-v2.ts",
        "test/mcp/tool-surface.spec.ts",
        "test/unit/public-output-v2-contract.spec.ts",
        "testkit/fixtures/mcp/src/evidence/abort-source.ts",
        "src/evidence/abort-source.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/fixtures/mcp/lifecycle-probe.ts",
        "src/evidence/request-outcome/",
        "src/evidence/locate-execution/canonical-locate-executor-v2.ts",
        "src/evidence/locate-execution/canonical-locate-finalization-v2.ts",
        "src/evidence/ranking/anchor-intent-normalizer-v2.ts",
        "src/evidence/public-output/materialized-evidence-core-v2.ts",
        "src/evidence/request-snapshot/snapshot-outcome-contribution-v2.ts",
        "src/process/backend-execution-context-v2.ts",
        "src/repository/verified-text-file-source-v2.ts",
        "src/mcp/locate-tool-schema.ts",
        "src/mcp/mcp-stdio-host.ts",
        "tools/cli/parser.ts",
        "tools/cli/execute.ts",
        "test/unit/locate-request-v2.spec.ts",
        "test/unit/locate-abort-coordinator-v2.spec.ts",
        "test/unit/canonical-locate-finalization-v2.spec.ts",
        "test/unit/request-outcome-aggregator-v2.spec.ts",
        "test/unit/cli-input-contract-v2.spec.ts",
        "test/unit/contract.spec.ts",
        "test/unit/canonical-locate-facts-bridge.spec.ts",
        "test/unit/canonical-locate-execution.spec.ts",
        "test/docs/cli-input-contract-v2.spec.ts",
        "test/mcp/request-cancellation-v2.spec.ts",
        "test/golden/input-abort-contract-v2.spec.ts",
        "test/golden/large-synthetic-repository.spec.ts",
        "testkit/fixtures/input-v2/",
        "testkit/fixtures/request-outcome-v2/",
        "testkit/testing/assert-v1-shadow-fail-closed-v2.ts",
        "testkit/manifests/performance/large-synthetic-repository-v1.yaml",
        "testkit/runners/runner-registry.ts",
        "testkit/contracts/platform-contract.ts",
        ".codestable/features/2026-07-24-input-abort-contract-v2/",
        ".codestable/roadmap/repo-nav-public-beta/",
        ".codestable/architecture/system-repo-nav-foundation.md",
        "test/unit/debug-cli-shell.spec.ts",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-tool-schema.json",
        "docs/reference/repo-nav-locate.md"
      ]
    }
  ],
  "providers": {}
}
```
