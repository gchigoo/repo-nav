---
doc_type: feature-evidence-pack
feature: repository-scope-policy
status: generated
---

# repository-scope-policy evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-design.md`
- Checklist: `.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-checklist.yaml`

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
      "command": "npm test -- --group repository-scope-policy",
      "exit_code": 0,
      "stdout": "ross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/cli-input-contract-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/contract.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/scope-policy-platform.spec.ts (1 test) 8ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (36 tests | 34 skipped) 20ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-request-v2.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ✓ test/unit/candidate-policy.spec.ts (38 tests | 37 skipped) 14ms\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/repository-scope-integration.spec.ts (2 tests) 16ms\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ✓ test/unit/repository-scope-selection.spec.ts (2 tests) 15ms\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 12 skipped)\n ✓ test/unit/repository-scope-policy.spec.ts (7 tests) 14ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/scope-bound-evidence-materializer-v2.spec.ts (1 test) 10ms\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests | 8 skipped)\n ✓ test/unit/repository-scope-trust.spec.ts (4 tests) 96ms\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n\n Test Files  8 passed | 51 skipped (59)\n      Tests  20 passed | 362 skipped (382)\n   Start at  20:38:41\n   Duration  4.20s (transform 16.15s, setup 0ms, import 51.39s, tests 193ms, environment 12ms)\n\n",
      "stderr": "",
      "id": "CMD-F7-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group repository-scope-policy --case scope-bound-evidence-materializer-v2",
      "exit_code": 0,
      "stdout": "c.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/contract.spec.ts (15 tests | 15 skipped)\n ✓ test/unit/scope-bound-evidence-materializer-v2.spec.ts (1 test) 12ms\n ↓ test/unit/scope-policy-platform.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-scope-selection.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/repository-scope-integration.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (36 tests | 36 skipped)\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/repository-scope-policy.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/candidate-policy.spec.ts (38 tests | 38 skipped)\n ↓ test/unit/locate-request-v2.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/repository-scope-trust.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n\n Test Files  1 passed | 58 skipped (59)\n      Tests  1 passed | 381 skipped (382)\n   Start at  20:38:46\n   Duration  4.23s (transform 15.16s, setup 0ms, import 49.64s, tests 12ms, environment 12ms)\n\n",
      "stderr": "",
      "id": "CMD-F7-MATERIALIZER",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group request-snapshot-cache --group relevance-ranking-budget --group input-abort-contract-v2 --group direct-mapping-classifier --group candidate-truth-table --group candidate-discovery --group candidate-context --group candidate-classification --group candidate-budget --group candidate-permutation",
      "exit_code": 0,
      "stdout": "covery-reservation-v2.spec.ts (1 test) 9ms\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests) 24ms\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests) 10ms\n ↓ test/unit/scope-bound-evidence-materializer-v2.spec.ts (1 test | 1 skipped)\n ✓ test/unit/direct-mapping-classifier.spec.ts (36 tests | 4 skipped) 99ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ✓ test/unit/locate-request-v2.spec.ts (6 tests) 26ms\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ✓ test/unit/final-snapshot-check.spec.ts (4 tests) 153ms\n ✓ test/unit/repository-git-state-probe.spec.ts (1 test) 6ms\n ✓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests) 15ms\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ✓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test) 257ms\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/repository-scope-integration.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 10 skipped) 28ms\n ↓ test/unit/repository-scope-policy.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-scope-selection.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests) 12ms\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/request-snapshot-cache.spec.ts (3 tests) 88ms\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/scope-policy-platform.spec.ts (1 test | 1 skipped)\n ✓ test/unit/verified-record-cache.spec.ts (1 test) 11ms\n ✓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test) 13ms\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-scope-trust.spec.ts (4 tests | 4 skipped)\n ✓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests) 45ms\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/relevance-ranking-budget.spec.ts (15 tests) 686ms\n     ✓ does not export F2 stages from package root  613ms\n ✓ test/unit/candidate-policy.spec.ts (38 tests | 1 skipped) 1857ms\n     ✓ produces sibling candidates from the real single-line RipgrepBackend path  559ms\n     ✓ keeps confirmed identity unchanged when only the candidate window expands  377ms\n     ✓ is invariant to backend hit order before maxFiles selection  306ms\n ✓ test/unit/canonical-locate-execution.spec.ts (10 tests | 6 skipped) 533ms\n     ✓ keeps no-mutation deep-exact on NodeRepositoryReader snapshot path  407ms\n\n Test Files  20 passed | 39 skipped (59)\n      Tests  130 passed | 252 skipped (382)\n   Start at  20:38:52\n   Duration  4.76s (transform 15.82s, setup 0ms, import 52.65s, tests 3.90s, environment 13ms)\n\n",
      "stderr": "",
      "id": "CMD-UPSTREAM-REGRESSION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "6ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 73ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 194ms\n ✓ test/unit/repository-scope-integration.spec.ts (2 tests) 16ms\n ✓ test/unit/repository-scope-policy.spec.ts (7 tests) 16ms\n ✓ test/unit/relevance-ranking-budget.spec.ts (15 tests) 1299ms\n     ✓ does not export F2 stages from package root  1153ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 34ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 76ms\n ✓ test/unit/di.spec.ts (3 tests) 102ms\n ✓ test/unit/repository-scope-selection.spec.ts (2 tests) 20ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests) 11ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 700ms\n     ✓ distinguishes binary, malformed UTF-8, missing, and invalid ranges  444ms\n ✓ test/unit/scope-bound-evidence-materializer-v2.spec.ts (1 test) 14ms\n ✓ test/unit/candidate-policy.spec.ts (38 tests) 2525ms\n     ✓ produces sibling candidates from the real single-line RipgrepBackend path  718ms\n     ✓ emits one confirmed evidence for an occurrence that also matches candidate terms  618ms\n     ✓ is invariant to backend hit order before maxFiles selection  404ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 196ms\n ✓ test/unit/canonical-locate-execution.spec.ts (10 tests) 1542ms\n     ✓ keeps no-mutation deep-exact on NodeRepositoryReader snapshot path  1029ms\n ✓ test/unit/scope-policy-platform.spec.ts (1 test) 7ms\n ✓ test/unit/repository-scope-trust.spec.ts (4 tests) 236ms\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests) 1733ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  1095ms\n     ✓ keeps production roots free of shadow/composer/schema runtime edges  624ms\n ✓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests) 384ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2063ms\n     ✓ distinguishes its own deadline from a caller abort  1020ms\n     ✓ retains verification completed before the abort  1008ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 960ms\n     ✓ passes shell metacharacters to git as literal path arguments  723ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 4526ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  4524ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1774ms\n     ✓ preserves special argv boundaries without a shell  330ms\n     ✓ terminates the tree on stdout N+1 overflow  379ms\n     ✓ terminates the tree on stderr N+1 overflow  391ms\n ✓ test/unit/safe-process-streaming-v2.spec.ts (9 tests) 2413ms\n     ✓ succeeds at exact N and limits on N+1 for stdout/stderr  882ms\n     ✓ accepts continue-full and rejects invalid decisions  929ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 3361ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  2745ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 11218ms\n     ✓ proves abort, single settlement, and owned tree death  2700ms\n     ✓ proves timeout, single settlement, and owned tree death  2077ms\n     ✓ keeps exact-N success and N+1 stdout-limit  1547ms\n     ✓ keeps exact-N success and N+1 stderr-limit  1564ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3276ms\n ✓ test/unit/process-cleanup.spec.ts (7 tests) 12066ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2396ms\n     ✓ terminates direct child and descendant on timeout  1966ms\n     ✓ terminates direct child and descendant when stdout observes N+1  1439ms\n     ✓ terminates direct child and descendant when stderr observes N+1  1473ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3299ms\n     ✓ early-stop/output path kills owned tree  1355ms\n\n Test Files  59 passed (59)\n      Tests  381 passed | 1 skipped (382)\n   Start at  20:38:58\n   Duration  15.74s (transform 16.77s, setup 0ms, import 50.86s, tests 50.02s, environment 12ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group repository-scope-policy",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group repository-scope-policy\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/large-streaming-ripgrep.spec.ts (1 test | 1 skipped)\n ↓ test/golden/public-output-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/relevance-ranking-budget.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/request-snapshot-cache.spec.ts (2 tests | 2 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/input-abort-contract-v2.spec.ts (1 test | 1 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/canonical-locate-bridge.spec.ts (1 test | 1 skipped)\n ✓ test/golden/repository-scope-policy.spec.ts (2 tests) 36ms\n ↓ test/golden/large-synthetic-repository.spec.ts (2 tests | 2 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 17 skipped (18)\n      Tests  2 passed | 81 skipped (83)\n   Start at  20:44:35\n   Duration  2.42s (transform 7.50s, setup 0ms, import 25.25s, tests 36ms, environment 4ms)\n\n",
      "stderr": "",
      "id": "CMD-F7-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/golden/large-streaming-ripgrep.spec.ts (1 test) 9ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 69ms\n ✓ test/golden/relevance-ranking-budget.spec.ts (3 tests) 34ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 75ms\n ✓ test/golden/request-snapshot-cache.spec.ts (2 tests) 152ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 117ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 191ms\n ✓ test/golden/input-abort-contract-v2.spec.ts (1 test) 32ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 72ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 118ms\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 13ms\n ✓ test/golden/repository-scope-policy.spec.ts (2 tests) 45ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 83ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 719ms\n     ✓ matches the bounded candidate policy manifest  312ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 1494ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 2093ms\n     ✓ carries a table anchor into filesystem verification  311ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  475ms\n     ✓ keeps multiple canonical symbol facts stable across anchor permutations  710ms\n ✓ test/golden/large-synthetic-repository.spec.ts (2 tests) 3259ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  3249ms\n\n Test Files  18 passed (18)\n      Tests  82 passed | 1 skipped (83)\n   Start at  20:44:38\n   Duration  5.57s (transform 8.13s, setup 0ms, import 24.76s, tests 8.58s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/mcp/request-cancellation-v2.spec.ts (1 test) 4ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1382ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1379ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1411ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1409ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1960ms\n     ✓ returns confirmed and bounded candidates with transport parity  1957ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2552ms\n     ✓ returns one confirmed mapping through real stdio  1401ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1148ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 291ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3675ms\n     ✓ does not lose cancellation sent before the handler starts work  1434ms\n     ✓ propagates the SDK request signal to the application service  1111ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  1127ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4685ms\n     ✓ maps schema-invalid objects to typed parity output  1368ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1160ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1105ms\n     ✓ turns thrown failures into safe typed parity output  1048ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11951ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  755ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  613ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  690ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1397ms\n     ✓ fails when the real context close marker is deliberately skipped  1471ms\n     ✓ fails when an actual descendant tree is deliberately left running  2931ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3267ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  774ms\n\n Test Files  10 passed (10)\n      Tests  40 passed (40)\n   Start at  20:39:29\n   Duration  15.81s (transform 3.23s, setup 0ms, import 13.38s, tests 27.91s, environment 2ms)\n\n",
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
      "stdout": "vation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/locate-abort-coordinator-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-request-v2.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (36 tests | 36 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (38 tests | 38 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-scope-integration.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-scope-policy.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/repository-scope-selection.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-scope-trust.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/scope-bound-evidence-materializer-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ✓ test/unit/scope-policy-platform.spec.ts (1 test) 8ms\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-outcome-aggregator-v2.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n\n Test Files  1 passed | 58 skipped (59)\n      Tests  1 passed | 381 skipped (382)\n   Start at  20:42:02\n   Duration  4.20s (transform 16.16s, setup 3.88s, import 47.72s, tests 8ms, environment 11ms)\n\nplatform contracts passed: F4-MCP-001, F4-MCP-002, F4-PATH-001, F4-PATH-003, F4-PATH-004, F4-PROC-001, F4-PROC-002, F4-PROC-003, F4-PROC-004, F4-PROC-005, F5-CLEANUP-001, F5-PROC-001, F5-PROC-003, F5-RG-001, F6-ABORT-001, F6-INPUT-001, F6-LATCH-001, F7-SCOPE-001\n",
      "stderr": "",
      "id": "CMD-PLATFORM",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/validate-yaml.py --file .codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-checklist.yaml --yaml-only",
      "exit_code": 0,
      "stdout": "Validated 1 file(s): 1 passed, 0 failed.\n\n  ✓ .codestable\\features\\2026-07-24-repository-scope-policy\\repository-scope-policy-checklist.yaml\n\nAll files valid.\n",
      "stderr": "",
      "id": "CMD-YAML",
      "core": false,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/codestable-dod-contract-gate.py --design .codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-design.md --stage design",
      "exit_code": 0,
      "stdout": "{\n  \"gate_id\": \"dod-contract-gate\",\n  \"stage\": \"design\",\n  \"status\": \"passed\",\n  \"blocking\": [],\n  \"warnings\": [],\n  \"evidence\": [\n    {\n      \"design\": \".codestable\\\\features\\\\2026-07-24-repository-scope-policy\\\\repository-scope-policy-design.md\",\n      \"checked_block\": \"DoD Contract\",\n      \"structure_checks\": {\n        \"validation command id\": [\n          \"CMD-\"\n        ],\n        \"command core marker\": [\n          \"core\",\n          \"核心性\"\n        ],\n        \"failure handling marker\": [\n          \"failure_handling\",\n          \"失败处理\"\n        ]\n      },\n      \"strength\": \"minimal DoD Contract section check\"\n    }\n  ],\n  \"providers\": {}\n}\n",
      "stderr": "",
      "id": "CMD-DOD-GATE",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/codestable-scope-gate.py --feature-dir .codestable/features/2026-07-24-repository-scope-policy --allow-file .codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-scope-allow.txt --check-path . --cleanliness-path src/repository/codegraph-json.ts --cleanliness-path src/repository/ripgrep-backend.ts --cleanliness-path src/evidence/scope --cleanliness-path src/evidence/request-snapshot --cleanliness-path src/evidence/ranking --cleanliness-path src/evidence/candidate-policy.ts --cleanliness-path src/evidence/direct-mapping-classifier.ts --cleanliness-path src/contracts --cleanliness-path test/unit --cleanliness-path test/golden --cleanliness-path testkit --stage implementation.before_review",
      "exit_code": 0,
      "stdout": "y.spec.ts\",\n        \"test/unit/canonical-locate-execution.spec.ts\",\n        \"test/unit/direct-mapping-classifier.spec.ts\",\n        \"test/unit/request-outcome-aggregator-v2.spec.ts\",\n        \"testkit/contracts/platform-contract.ts\",\n        \"testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.ts\",\n        \"testkit/runners/runner-registry.ts\",\n        \".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-qa.md\",\n        \".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-review.md\",\n        \".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-scope-allow.txt\",\n        \"src/evidence/request-snapshot/scope-classification-views-v2.ts\",\n        \"src/evidence/request-snapshot/trusted-scope-policy-adapter-v2.ts\",\n        \"src/evidence/scope/ascii-lowercase-v1.ts\",\n        \"src/evidence/scope/build-execution-scope-coverage-v1.ts\",\n        \"src/evidence/scope/index.ts\",\n        \"src/evidence/scope/legacy-resolve-repository-layer-v1.ts\",\n        \"src/evidence/scope/repository-scope-policy-v1.ts\",\n        \"src/evidence/scope/resolve-repository-scope-v1.ts\",\n        \"src/evidence/scope/scope-bound-classification-bridge-v2.ts\",\n        \"src/evidence/scope/scope-bound-evidence-materializer-v2.ts\",\n        \"src/evidence/scope/scope-bound-producer-registrar-v2.ts\",\n        \"src/evidence/scope/scope-coverage-v1.ts\",\n        \"src/evidence/scope/scope-decision-accessors-v1.ts\",\n        \"test/unit/repository-scope-integration.spec.ts\",\n        \"test/unit/repository-scope-policy.spec.ts\",\n        \"test/unit/repository-scope-selection.spec.ts\",\n        \"test/unit/repository-scope-trust.spec.ts\",\n        \"test/unit/scope-bound-evidence-materializer-v2.spec.ts\",\n        \"test/unit/scope-policy-platform.spec.ts\",\n        \"testkit/fixtures/scope-v1/candidate-ceiling-v1.ts\",\n        \"testkit/fixtures/scope-v1/candidate-contexts-v1.ts\",\n        \"testkit/fixtures/scope-v1/canonical-execution-v1.ts\",\n        \"testkit/fixtures/scope-v1/discovery-identities-v1.ts\",\n        \"testkit/fixtures/scope-v1/docs-priority-v1.ts\",\n        \"testkit/fixtures/scope-v1/existing-layer-characterization-v1.ts\",\n        \"testkit/fixtures/scope-v1/expanded-legacy-selection-v1.ts\",\n        \"testkit/fixtures/scope-v1/explicit-prefix-priority-v1.ts\",\n        \"testkit/fixtures/scope-v1/large-scope-permutation-v1.ts\",\n        \"testkit/fixtures/scope-v1/ordinary-segment-priority-v1.ts\",\n        \"testkit/fixtures/scope-v1/path-source-matrix-v1.ts\",\n        \"testkit/fixtures/scope-v1/producer-matrix-v2.ts\",\n        \"testkit/fixtures/scope-v1/request-layers-v1.ts\",\n        \"testkit/fixtures/scope-v1/safe-group-fold-v1.ts\",\n        \"testkit/fixtures/scope-v1/scope-proof-mutations-v1.ts\",\n        \"testkit/fixtures/scope-v1/stable-pool-layers-v1.ts\",\n        \"testkit/fixtures/scope-v1/test-priority-v1.ts\",\n        \"testkit/fixtures/scope-v1/v1-policy-delta-v1.ts\"\n      ],\n      \"ignored_machine_artifacts\": [\n        \".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-gate-results.json\"\n      ],\n      \"allowed_prefixes\": [\n        \".codestable/features/2026-07-24-repository-scope-policy\",\n        \".codestable/features/2026-07-24-repository-scope-policy\",\n        \".codestable/roadmap/repo-nav-public-beta\",\n        \".codestable/architecture/system-repo-nav-foundation.md\",\n        \"src/evidence/scope/\",\n        \"src/evidence/locate-execution/\",\n        \"src/evidence/direct-mapping-classifier.ts\",\n        \"src/evidence/request-snapshot/\",\n        \"src/evidence/request-outcome/\",\n        \"src/evidence/candidate-policy.ts\",\n        \"src/evidence/ranking/\",\n        \"src/contracts/\",\n        \"test/unit/\",\n        \"test/golden/\",\n        \"testkit/fixtures/scope-v1/\",\n        \"testkit/fixtures/request-outcome-v2/\",\n        \"testkit/runners/runner-registry.ts\",\n        \"testkit/contracts/platform-contract.ts\",\n        \"testkit/manifests/\"\n      ]\n    }\n  ],\n  \"providers\": {}\n}\n",
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
      "stderr": "warning: in the working copy of '.codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-checklist.yaml', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'src/evidence/locate-execution/canonical-locate-executor-v2.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'src/evidence/request-snapshot/index.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'test/unit/candidate-policy.spec.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'testkit/runners/runner-registry.ts', CRLF will be replaced by LF the next time Git touches it\n",
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

Design bytes: 66939
Checklist bytes: 30075

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
        ".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-checklist.yaml",
        "src/evidence/direct-mapping-classifier.ts",
        "src/evidence/locate-execution/canonical-locate-executor-v2.ts",
        "src/evidence/request-outcome/index.ts",
        "src/evidence/request-outcome/request-outcome-aggregator-v2.ts",
        "src/evidence/request-outcome/request-outcome-contribution-registry-v2.ts",
        "src/evidence/request-snapshot/expanded-lane-bridge-v2.ts",
        "src/evidence/request-snapshot/index.ts",
        "src/evidence/request-snapshot/scope-folded-discovery-selector-v2.ts",
        "test/unit/candidate-policy.spec.ts",
        "test/unit/canonical-locate-execution.spec.ts",
        "test/unit/direct-mapping-classifier.spec.ts",
        "test/unit/request-outcome-aggregator-v2.spec.ts",
        "testkit/contracts/platform-contract.ts",
        "testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-qa.md",
        ".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-review.md",
        ".codestable/features/2026-07-24-repository-scope-policy/repository-scope-policy-scope-allow.txt",
        "src/evidence/request-snapshot/scope-classification-views-v2.ts",
        "src/evidence/request-snapshot/trusted-scope-policy-adapter-v2.ts",
        "src/evidence/scope/ascii-lowercase-v1.ts",
        "src/evidence/scope/build-execution-scope-coverage-v1.ts",
        "src/evidence/scope/index.ts",
        "src/evidence/scope/legacy-resolve-repository-layer-v1.ts",
        "src/evidence/scope/repository-scope-policy-v1.ts",
        "src/evidence/scope/resolve-repository-scope-v1.ts",
        "src/evidence/scope/scope-bound-classification-bridge-v2.ts",
        "src/evidence/scope/scope-bound-evidence-materializer-v2.ts",
        "src/evidence/scope/scope-bound-producer-registrar-v2.ts",
        "src/evidence/scope/scope-coverage-v1.ts",
        "src/evidence/scope/scope-decision-accessors-v1.ts",
        "test/unit/repository-scope-integration.spec.ts",
        "test/unit/repository-scope-policy.spec.ts",
        "test/unit/repository-scope-selection.spec.ts",
        "test/unit/repository-scope-trust.spec.ts",
        "test/unit/scope-bound-evidence-materializer-v2.spec.ts",
        "test/unit/scope-policy-platform.spec.ts",
        "testkit/fixtures/scope-v1/candidate-ceiling-v1.ts",
        "testkit/fixtures/scope-v1/candidate-contexts-v1.ts",
        "testkit/fixtures/scope-v1/canonical-execution-v1.ts",
        "testkit/fixtures/scope-v1/discovery-identities-v1.ts",
        "testkit/fixtures/scope-v1/docs-priority-v1.ts",
        "testkit/fixtures/scope-v1/existing-layer-characterization-v1.ts",
        "testkit/fixtures/scope-v1/expanded-legacy-selection-v1.ts",
        "testkit/fixtures/scope-v1/explicit-prefix-priority-v1.ts",
        "testkit/fixtures/scope-v1/large-scope-permutation-v1.ts",
        "testkit/fixtures/scope-v1/ordinary-segment-priority-v1.ts",
        "testkit/fixtures/scope-v1/path-source-matrix-v1.ts",
        "testkit/fixtures/scope-v1/producer-matrix-v2.ts",
        "testkit/fixtures/scope-v1/request-layers-v1.ts",
        "testkit/fixtures/scope-v1/safe-group-fold-v1.ts",
        "testkit/fixtures/scope-v1/scope-proof-mutations-v1.ts",
        "testkit/fixtures/scope-v1/stable-pool-layers-v1.ts",
        "testkit/fixtures/scope-v1/test-priority-v1.ts",
        "testkit/fixtures/scope-v1/v1-policy-delta-v1.ts"
      ],
      "ignored_machine_artifacts": [],
      "allowed_prefixes": [
        ".codestable/features/2026-07-24-repository-scope-policy",
        ".codestable/features/2026-07-24-repository-scope-policy",
        ".codestable/roadmap/repo-nav-public-beta",
        ".codestable/architecture/system-repo-nav-foundation.md",
        "src/evidence/scope/",
        "src/evidence/locate-execution/",
        "src/evidence/direct-mapping-classifier.ts",
        "src/evidence/request-snapshot/",
        "src/evidence/request-outcome/",
        "src/evidence/candidate-policy.ts",
        "src/evidence/ranking/",
        "src/contracts/",
        "test/unit/",
        "test/golden/",
        "testkit/fixtures/scope-v1/",
        "testkit/fixtures/request-outcome-v2/",
        "testkit/runners/runner-registry.ts",
        "testkit/contracts/platform-contract.ts",
        "testkit/manifests/"
      ]
    }
  ],
  "providers": {}
}
```
