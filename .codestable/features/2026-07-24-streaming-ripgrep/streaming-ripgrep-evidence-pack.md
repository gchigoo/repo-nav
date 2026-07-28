---
doc_type: feature-evidence-pack
feature: streaming-ripgrep
status: generated
---

# streaming-ripgrep evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-design.md`
- Checklist: `.codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-checklist.yaml`

## 2. DoD Results

```json
{
  "gate_id": "dod-runner",
  "stage": "implementation.before_review",
  "status": "passed",
  "blocking": [],
  "warnings": [
    "CMD-UNIT-ALL: prior dod-runner flake (cleanup-invariant under load) cleared by isolated re-run exit 0"
  ],
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
      "command": "npm test -- --group streaming-ripgrep",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group streaming-ripgrep\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ✓ test/unit/backend-execution-outcome-v2.spec.ts (1 test) 7ms\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ✓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test) 409ms\n     ✓ registers ripgrep-group ordinals via executor and rejects bare-runner searchViews bypass  407ms\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/backend-execution-trace-v2.spec.ts (2 tests) 609ms\n     ✓ enforces seal/late-start/reducer outcome binding  601ms\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (11 tests | 11 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests) 11ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/process-cleanup.spec.ts (7 tests | 6 skipped) 1922ms\n     ✓ early-stop/output path kills owned tree  1918ms\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/canonical-locate-execution.spec.ts (9 tests | 7 skipped) 107ms\n ✓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests) 250ms\n ✓ test/unit/safe-process-streaming-v2.spec.ts (9 tests) 1995ms\n     ✓ succeeds at exact N and limits on N+1 for stdout/stderr  566ms\n     ✓ accepts continue-full and rejects invalid decisions  829ms\n\n Test Files  8 passed | 40 skipped (48)\n      Tests  22 passed | 316 skipped (338)\n   Start at  18:31:26\n   Duration  5.67s (transform 11.58s, setup 0ms, import 40.69s, tests 5.31s, environment 10ms)\n\n",
      "stderr": "",
      "id": "CMD-F5-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group process-contract --group process-output-isolation --group process-cleanup --group ripgrep-backend --group codegraph-probe --group codegraph-parser --group codegraph-query-plan",
      "exit_code": 0,
      "stdout": "ph-probe --group codegraph-parser --group codegraph-query-plan\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 23ms\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 31ms\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (11 tests | 11 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 104ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1247ms\n     ✓ terminates the tree on stderr N+1 overflow  359ms\n ✓ test/unit/process-cleanup.spec.ts (7 tests | 1 skipped) 10888ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2418ms\n     ✓ terminates direct child and descendant on timeout  1996ms\n     ✓ terminates direct child and descendant when stdout observes N+1  1455ms\n     ✓ terminates direct child and descendant when stderr observes N+1  1545ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3348ms\n\n Test Files  5 passed | 43 skipped (48)\n      Tests  32 passed | 306 skipped (338)\n   Start at  18:31:33\n   Duration  12.41s (transform 12.97s, setup 0ms, import 41.12s, tests 12.29s, environment 9ms)\n\n",
      "stderr": "",
      "id": "CMD-PROCESS-REGRESSION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group request-snapshot-cache --group relevance-ranking-budget --group canonical-locate-bridge\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/canonical-locate-package-boundary.spec.ts (1 test) 7ms\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ✓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests) 13ms\n ↓ test/unit/process-cleanup.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/discovery-reservation-v2.spec.ts (1 test) 7ms\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ✓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests) 26ms\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ✓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests) 13ms\n ✓ test/unit/repository-git-state-probe.spec.ts (1 test) 6ms\n ✓ test/unit/final-snapshot-check.spec.ts (4 tests) 140ms\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (11 tests) 42ms\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ✓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test) 250ms\n ✓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests) 13ms\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/request-snapshot-cache.spec.ts (3 tests) 83ms\n ✓ test/unit/di.spec.ts (3 tests | 2 skipped) 45ms\n ✓ test/unit/verified-record-cache.spec.ts (1 test) 10ms\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 3 skipped) 608ms\n     ✓ keeps production roots free of shadow/composer/schema runtime edges  604ms\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ✓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test) 8ms\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n ✓ test/unit/relevance-ranking-budget.spec.ts (15 tests) 395ms\n     ✓ does not export F2 stages from package root  320ms\n ✓ test/unit/canonical-locate-execution.spec.ts (9 tests | 2 skipped) 313ms\n\n Test Files  17 passed | 31 skipped (48)\n      Tests  61 passed | 277 skipped (338)\n   Start at  18:31:47\n   Duration  3.99s (transform 14.28s, setup 0ms, import 42.53s, tests 1.98s, environment 9ms)\n\n",
      "stderr": "",
      "id": "CMD-UPSTREAM-REGRESSION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/repository-reader.spec.ts (6 tests) 125ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 282ms\n ✓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test) 319ms\n     ✓ registers ripgrep-group ordinals via executor and rejects bare-runner searchViews bypass  317ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 1712ms\n     ✓ passes shell metacharacters to git as literal path arguments  1125ms\n     ✓ blocks when git status cannot inspect the current directory  583ms\n ✓ test/unit/final-snapshot-check.spec.ts (4 tests) 330ms\n ✓ test/unit/backend-execution-trace-v2.spec.ts (2 tests) 879ms\n     ✓ enforces seal/late-start/reducer outcome binding  871ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 160ms\n ✓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests) 989ms\n     ✓ uses production searchViews staging commit and independent caps  361ms\n     ✓ covers no-start/no-child shapes and complete searchViews counters  390ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 114ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 142ms\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests) 1427ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  757ms\n     ✓ keeps production roots free of shadow/composer/schema runtime edges  651ms\n ✓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test) 330ms\n     ✓ consumes expandedMaxHits=800 via shared search and runs scope fold + legacy reservation  328ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 104ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 85ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 57ms\n ✓ test/unit/request-snapshot-cache.spec.ts (3 tests) 225ms\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (11 tests) 38ms\n ✓ test/unit/contract.spec.ts (12 tests) 33ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 82ms\n ✓ test/unit/di.spec.ts (3 tests) 63ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 32ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 34ms\n ✓ test/unit/relevance-ranking-budget.spec.ts (15 tests) 1092ms\n     ✓ does not export F2 stages from package root  827ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 26ms\n ✓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests) 24ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 20ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 23ms\n ✓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests) 14ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2103ms\n     ✓ distinguishes its own deadline from a caller abort  1013ms\n     ✓ retains verification completed before the abort  1009ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 3847ms\n     ✓ inherits only allowlisted environment and applies explicit additions  328ms\n     ✓ distinguishes invalid request, spawn error, and non-zero exit  354ms\n     ✓ terminates the tree on stdout N+1 overflow  1079ms\n     ✓ terminates the tree on stderr N+1 overflow  1232ms\n     ✓ captures child output without writing it to parent stdout  602ms\n ✓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests) 11ms\n ✓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests) 12ms\n ✓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests) 13ms\n ✓ test/unit/canonical-locate-execution.spec.ts (9 tests) 1261ms\n     ✓ keeps no-mutation deep-exact on NodeRepositoryReader snapshot path  456ms\n     ✓ keeps telemetry-only prefixes out of F3 complete-safe hits  555ms\n ✓ test/unit/canonical-locate-package-boundary.spec.ts (1 test) 7ms\n ✓ test/unit/repository-git-state-probe.spec.ts (1 test) 5ms\n ✓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test) 12ms\n ✓ test/unit/discovery-reservation-v2.spec.ts (1 test) 7ms\n ✓ test/unit/verified-record-cache.spec.ts (1 test) 9ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 2853ms\n     ✓ produces sibling candidates from the real single-line RipgrepBackend path  1415ms\n     ✓ keeps confirmed evidence stable when maxCandidates is 0  313ms\n     ✓ is invariant to backend hit order before maxFiles selection  308ms\n ✓ test/unit/backend-execution-outcome-v2.spec.ts (1 test) 7ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 29ms\n ✓ test/unit/safe-process-streaming-v2.spec.ts (9 tests) 5014ms\n     ✓ succeeds at exact N and limits on N+1 for stdout/stderr  1673ms\n     ✓ accepts continue-full and rejects invalid decisions  2590ms\n     ✓ projects kernel settlements to legacy SafeProcessResult rows  400ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 5181ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  5178ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 3997ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  3485ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 11980ms\n     ✓ proves abort, single settlement, and owned tree death  3002ms\n     ✓ proves timeout, single settlement, and owned tree death  2257ms\n     ✓ keeps exact-N success and N+1 stdout-limit  1628ms\n     ✓ keeps exact-N success and N+1 stderr-limit  1602ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3449ms\n ✓ test/unit/process-cleanup.spec.ts (7 tests) 13096ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2626ms\n     ✓ terminates direct child and descendant on timeout  2304ms\n     ✓ terminates direct child and descendant when stdout observes N+1  1568ms\n     ✓ terminates direct child and descendant when stderr observes N+1  1486ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3440ms\n     ✓ early-stop/output path kills owned tree  1546ms\n\n Test Files  48 passed (48)\n      Tests  337 passed | 1 skipped (338)\n   Start at  18:35:53\n   Duration  14.99s (transform 13.34s, setup 0ms, import 43.63s, tests 58.21s, environment 10ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group streaming-ripgrep --case large-streaming-ripgrep",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group streaming-ripgrep --case large-streaming-ripgrep\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/large-streaming-ripgrep.spec.ts (1 test) 9ms\n ↓ test/golden/relevance-ranking-budget.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/public-output-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/request-snapshot-cache.spec.ts (2 tests | 2 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/canonical-locate-bridge.spec.ts (1 test | 1 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 15 skipped (16)\n      Tests  1 passed | 78 skipped (79)\n   Start at  18:32:18\n   Duration  3.02s (transform 7.66s, setup 0ms, import 25.45s, tests 9ms, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-F5-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/large-streaming-ripgrep.spec.ts (1 test) 9ms\n ✓ test/golden/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/golden/relevance-ranking-budget.spec.ts (3 tests) 35ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 78ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 67ms\n ✓ test/golden/request-snapshot-cache.spec.ts (2 tests) 168ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 97ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 115ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 176ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 199ms\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 11ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 58ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 1910ms\n     ✓ matches the bounded candidate policy manifest  1505ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 2651ms\n     ✓ matches the explicit fallback transition contract  1398ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 3522ms\n     ✓ matches its versioned status and coverage manifest  1411ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  491ms\n     ✓ keeps multiple canonical symbol facts stable across anchor permutations  780ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 4293ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  4291ms\n\n Test Files  16 passed (16)\n      Tests  78 passed | 1 skipped (79)\n   Start at  18:32:23\n   Duration  6.65s (transform 5.50s, setup 0ms, import 21.19s, tests 13.40s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1475ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1473ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1488ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1485ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1982ms\n     ✓ returns confirmed and bounded candidates with transport parity  1980ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 306ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2854ms\n     ✓ returns one confirmed mapping through real stdio  1525ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1325ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3957ms\n     ✓ does not lose cancellation sent before the handler starts work  1551ms\n     ✓ propagates the SDK request signal to the application service  1311ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  1092ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4824ms\n     ✓ maps schema-invalid objects to typed parity output  1526ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1305ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1070ms\n     ✓ turns thrown failures into safe typed parity output  920ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11926ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  883ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  646ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  623ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1447ms\n     ✓ fails when the real context close marker is deliberately skipped  1341ms\n     ✓ fails when an actual descendant tree is deliberately left running  2857ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3267ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  812ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  18:32:41\n   Duration  15.51s (transform 2.44s, setup 0ms, import 12.24s, tests 28.82s, environment 2ms)\n\n",
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
      "stdout": "34:40\n   Duration  3.38s (transform 12.32s, setup 3.68s, import 37.44s, tests 13ms, environment 10ms)\n\n\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group streaming-ripgrep --case ripgrep-early-stop-tree-cleanup\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/ripgrep-json-line-consumer-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/discovery-reservation-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/backend-execution-outcome-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/discovery-scope-fold-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/backend-physical-attempt-executor-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/backend-execution-trace-v2.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/final-snapshot-check.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/pre-ranking-evidence-pool.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/repository-git-state-probe.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (11 tests | 11 skipped)\n ↓ test/unit/executor-dual-lane-wiring-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/request-snapshot-capability-seams-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/request-snapshot-cache.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/verified-record-cache.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/snapshot-outcome-contribution-v2.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/relevance-ranking-budget.spec.ts (15 tests | 15 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-streaming-backend-v2.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/safe-process-streaming-v2.spec.ts (9 tests | 9 skipped)\n ✓ test/unit/process-cleanup.spec.ts (7 tests | 6 skipped) 1788ms\n     ✓ early-stop/output path kills owned tree  1785ms\n\n Test Files  1 passed | 47 skipped (48)\n      Tests  1 passed | 337 skipped (338)\n   Start at  18:34:45\n   Duration  4.29s (transform 13.21s, setup 3.57s, import 38.39s, tests 1.79s, environment 9ms)\n\nplatform contracts passed: F4-MCP-001, F4-MCP-002, F4-PATH-001, F4-PATH-003, F4-PATH-004, F4-PROC-001, F4-PROC-002, F4-PROC-003, F4-PROC-004, F4-PROC-005, F5-CLEANUP-001, F5-PROC-001, F5-PROC-003, F5-RG-001\n",
      "stderr": "",
      "id": "CMD-PLATFORM",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/validate-yaml.py --file .codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-checklist.yaml --yaml-only",
      "exit_code": 0,
      "stdout": "Validated 1 file(s): 1 passed, 0 failed.\n\n  ✓ .codestable\\features\\2026-07-24-streaming-ripgrep\\streaming-ripgrep-checklist.yaml\n\nAll files valid.\n",
      "stderr": "",
      "id": "CMD-YAML",
      "core": false,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "python .codestable/tools/codestable-dod-contract-gate.py --design .codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-design.md --stage design",
      "exit_code": 0,
      "stdout": "{\n  \"gate_id\": \"dod-contract-gate\",\n  \"stage\": \"design\",\n  \"status\": \"passed\",\n  \"blocking\": [],\n  \"warnings\": [],\n  \"evidence\": [\n    {\n      \"design\": \".codestable\\\\features\\\\2026-07-24-streaming-ripgrep\\\\streaming-ripgrep-design.md\",\n      \"checked_block\": \"DoD Contract\",\n      \"structure_checks\": {\n        \"validation command id\": [\n          \"CMD-\"\n        ],\n        \"command core marker\": [\n          \"core\",\n          \"核心性\"\n        ],\n        \"failure handling marker\": [\n          \"failure_handling\",\n          \"失败处理\"\n        ]\n      },\n      \"strength\": \"minimal DoD Contract section check\"\n    }\n  ],\n  \"providers\": {}\n}\n",
      "stderr": "",
      "id": "CMD-DOD-GATE",
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
      "stderr": "warning: in the working copy of 'src/evidence/locate-execution/canonical-locate-executor-v2.ts', CRLF will be replaced by LF the next time Git touches it\nwarning: in the working copy of 'testkit/runners/runner-registry.ts', CRLF will be replaced by LF the next time Git touches it\n",
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

Design bytes: 76048
Checklist bytes: 27839

## 5. Residual Risks

- CMD-UNIT-ALL: prior dod-runner flake (cleanup-invariant under load) cleared by isolated re-run exit 0

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
        ".codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-checklist.yaml",
        "src/contracts/safe-process.ts",
        "src/evidence/locate-execution/canonical-locate-executor-v2.ts",
        "src/evidence/request-snapshot/pre-f5-multi-view-search-v2.ts",
        "src/repository/node-safe-process-runner.ts",
        "src/repository/ripgrep-backend.ts",
        "test/unit/canonical-locate-execution.spec.ts",
        "test/unit/cross-platform-platform.spec.ts",
        "test/unit/process-cleanup.spec.ts",
        "test/unit/safe-process-runner.spec.ts",
        "testkit/contracts/platform-contract.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-qa.md",
        ".codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-review.md",
        ".codestable/features/2026-07-24-streaming-ripgrep/streaming-ripgrep-scope-allow.txt",
        "src/contracts/v2/backend-execution-outcome-v2.ts",
        "src/process/backend-execution-context-v2.ts",
        "src/process/backend-physical-attempt-executor-v2.ts",
        "src/process/bounded-byte-collector-v2.ts",
        "src/process/buffered-compatibility-projection-v2.ts",
        "src/process/opaque-token-v2.ts",
        "src/process/primary-termination-trigger-reducer-v2.ts",
        "src/process/safe-process-execution-kernel-v2.ts",
        "src/process/settlement-verdict-v2.ts",
        "src/repository/ripgrep-stream/index.ts",
        "src/repository/ripgrep-stream/line-framer-v2.ts",
        "src/repository/ripgrep-stream/multi-view-accumulator-v2.ts",
        "src/repository/ripgrep-stream/ripgrep-json-line-consumer-v2.ts",
        "src/repository/ripgrep-stream/ripgrep-protocol-fsm-v2.ts",
        "test/golden/large-streaming-ripgrep.spec.ts",
        "test/unit/backend-execution-outcome-v2.spec.ts",
        "test/unit/backend-execution-trace-v2.spec.ts",
        "test/unit/backend-physical-attempt-executor-v2.spec.ts",
        "test/unit/backend-telemetry-view-v2.type-test.ts",
        "test/unit/f3-f5-multiview-abi-v2.type-test.ts",
        "test/unit/ripgrep-json-line-consumer-v2.spec.ts",
        "test/unit/ripgrep-streaming-backend-v2.spec.ts",
        "test/unit/safe-process-streaming-v2.spec.ts",
        "testkit/fixtures/backend-execution-v2/codegraph-terminal-v2.ts",
        "testkit/fixtures/backend-execution-v2/f3-f5-handoff-v2.ts",
        "testkit/fixtures/backend-execution-v2/outcome-schema-v2.ts",
        "testkit/fixtures/backend-execution-v2/physical-start-authority-v2.ts",
        "testkit/fixtures/backend-execution-v2/trace-closure-v2.ts",
        "testkit/fixtures/process-v2/buffered-projection-v2.ts",
        "testkit/fixtures/process-v2/byte-writer-v2.ts",
        "testkit/fixtures/process-v2/hostile-consumer-v2.ts",
        "testkit/fixtures/process-v2/no-start-no-child-v2.ts",
        "testkit/fixtures/process-v2/process-tree-writer-v2.ts",
        "testkit/fixtures/process-v2/streaming-finalizer-platform-v2.ts",
        "testkit/fixtures/process-v2/terminal-race-scheduler-v2.ts",
        "testkit/fixtures/ripgrep/large-stream-v2.ts",
        "testkit/fixtures/ripgrep/malformed-stream-v2.ts",
        "testkit/fixtures/ripgrep/multi-view-cap-order-v2.ts",
        "testkit/fixtures/ripgrep/multi-view-runner-v2.ts",
        "testkit/fixtures/ripgrep/protocol-fsm-v2.ts",
        "testkit/fixtures/ripgrep/stream-partitions-v2.ts",
        "testkit/fixtures/ripgrep/v1-parity-v2.ts"
      ],
      "ignored_machine_artifacts": [],
      "allowed_prefixes": [
        ".codestable/features/2026-07-24-streaming-ripgrep",
        "src/contracts/safe-process.ts",
        "src/contracts/v2/backend-execution-outcome-v2.ts",
        "src/process/",
        "src/repository/node-safe-process-runner.ts",
        "src/repository/ripgrep-backend.ts",
        "src/repository/ripgrep-stream/",
        "src/evidence/request-snapshot/pre-f5-multi-view-search-v2.ts",
        "src/evidence/locate-execution/canonical-locate-executor-v2.ts",
        "test/unit/safe-process-streaming-v2.spec.ts",
        "test/unit/safe-process-runner.spec.ts",
        "test/unit/process-cleanup.spec.ts",
        "test/unit/cross-platform-platform.spec.ts",
        "test/unit/ripgrep-json-line-consumer-v2.spec.ts",
        "test/unit/ripgrep-streaming-backend-v2.spec.ts",
        "test/unit/backend-execution-outcome-v2.spec.ts",
        "test/unit/backend-execution-trace-v2.spec.ts",
        "test/unit/backend-physical-attempt-executor-v2.spec.ts",
        "test/unit/backend-telemetry-view-v2.type-test.ts",
        "test/unit/f3-f5-multiview-abi-v2.type-test.ts",
        "test/unit/canonical-locate-execution.spec.ts",
        "test/golden/large-streaming-ripgrep.spec.ts",
        "testkit/fixtures/process-v2/",
        "testkit/fixtures/ripgrep/",
        "testkit/fixtures/backend-execution-v2/",
        "testkit/runners/runner-registry.ts",
        "testkit/contracts/platform-contract.ts",
        ".codestable/features/2026-07-24-streaming-ripgrep/"
      ]
    }
  ],
  "providers": {}
}
```
