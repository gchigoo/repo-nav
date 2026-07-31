---
doc_type: feature-evidence-pack
feature: 2026-07-24-canonical-locate-facts-bridge
status: generated
---

# 2026-07-24-canonical-locate-facts-bridge evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-24-canonical-locate-facts-bridge/canonical-locate-facts-bridge-design.md`
- Checklist: `.codestable/features/2026-07-24-canonical-locate-facts-bridge/canonical-locate-facts-bridge-checklist.yaml`

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
      "command": "npm test -- --group canonical-locate-bridge --case canonical-fact-contract --case canonical-required-owner-finalizer --case canonical-materialization-seam --case canonical-single-execution --case canonical-v1-projector-parity --case canonical-v1-shadow-isolation --case canonical-term-case-parity --case canonical-real-shadow-no-cutover --case canonical-synthetic-shadow-serialization --case canonical-safe-error-serialization --case canonical-di-wiring --case canonical-transport-reachability",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group canonical-locate-bridge --case canonical-fact-contract --case canonical-required-owner-finalizer --case canonical-materialization-seam --case canonical-single-execution --case canonical-v1-projector-parity --case canonical-v1-shadow-isolation --case canonical-term-case-parity --case canonical-real-shadow-no-cutover --case canonical-synthetic-shadow-serialization --case canonical-safe-error-serialization --case canonical-di-wiring --case canonical-transport-reachability\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ✓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests) 14ms\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests) 36ms\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ✓ test/unit/canonical-locate-execution.spec.ts (4 tests) 16ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/di.spec.ts (3 tests | 2 skipped) 36ms\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 3 skipped) 283ms\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n\n Test Files  5 passed | 26 skipped (31)\n      Tests  20 passed | 256 skipped (276)\n   Start at  12:43:18\n   Duration  2.51s (transform 6.93s, setup 0ms, import 23.92s, tests 384ms, environment 7ms)\n\n",
      "stderr": "",
      "id": "CMD-F1C-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/canonical-locate-package-boundary.spec.ts (1 test) 7ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 28ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 116ms\n ✓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests) 14ms\n ✓ test/unit/contract.spec.ts (12 tests) 40ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 20ms\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests) 39ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 23ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 115ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 28ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 37ms\n ✓ test/unit/canonical-locate-execution.spec.ts (4 tests) 16ms\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests) 833ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  546ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 111ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/di.spec.ts (3 tests) 94ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 51ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 102ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 239ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 33ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 905ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 179ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 62ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 166ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 1145ms\n     ✓ passes shell metacharacters to git as literal path arguments  910ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2050ms\n     ✓ distinguishes its own deadline from a caller abort  1007ms\n     ✓ retains verification completed before the abort  1009ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1231ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 3664ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  3661ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 2231ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1860ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 11734ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2546ms\n     ✓ terminates direct child and descendant on timeout  2169ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1689ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1633ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3550ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 12258ms\n     ✓ proves abort, single settlement, and owned tree death  2624ms\n     ✓ proves timeout, single settlement, and owned tree death  2355ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1896ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1833ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3484ms\n\n Test Files  31 passed (31)\n      Tests  275 passed | 1 skipped (276)\n   Start at  12:43:22\n   Duration  14.15s (transform 7.35s, setup 0ms, import 26.47s, tests 37.58s, environment 11ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 3ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 56ms\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 6ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 50ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 78ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 101ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 136ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 179ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 206ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 239ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 315ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 1553ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  684ms\n     ✓ keeps multiple canonical symbol facts stable across anchor permutations  608ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 2454ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  2452ms\n\n Test Files  13 passed (13)\n      Tests  72 passed | 1 skipped (73)\n   Start at  12:43:37\n   Duration  3.57s (transform 2.27s, setup 0ms, import 11.18s, tests 5.38s, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 284ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1509ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1506ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1528ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1526ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1543ms\n     ✓ returns confirmed and bounded candidates with transport parity  1540ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2645ms\n     ✓ returns one confirmed mapping through real stdio  1511ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1130ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3926ms\n     ✓ does not lose cancellation sent before the handler starts work  1577ms\n     ✓ propagates the SDK request signal to the application service  1199ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  1147ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4649ms\n     ✓ maps schema-invalid objects to typed parity output  1502ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1093ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1135ms\n     ✓ turns thrown failures into safe typed parity output  916ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 13501ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  958ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  688ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  763ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1722ms\n     ✓ fails when the real context close marker is deliberately skipped  1407ms\n     ✓ fails when an actual descendant tree is deliberately left running  2852ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  4032ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  1027ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  12:43:48\n   Duration  15.59s (transform 1.71s, setup 0ms, import 9.03s, tests 29.59s, environment 1ms)\n\n",
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
      "command": "npm run test:golden -- --group canonical-locate-bridge --case canonical-v1-bridge-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group canonical-locate-bridge --case canonical-v1-bridge-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/public-output-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 11ms\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 12 skipped (13)\n      Tests  1 passed | 72 skipped (73)\n   Start at  12:44:30\n   Duration  1.40s (transform 2.52s, setup 0ms, import 11.86s, tests 11ms, environment 5ms)\n\n",
      "stderr": "",
      "id": "CMD-F1C-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group public-output-v2 && npm run test:golden -- --group public-output-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 96ms\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 50ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 85ms\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 135ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 2 skipped) 536ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  524ms\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 2570ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  2231ms\n\n Test Files  6 passed | 25 skipped (31)\n      Tests  74 passed | 202 skipped (276)\n   Start at  12:44:33\n   Duration  5.00s (transform 7.92s, setup 0ms, import 25.82s, tests 3.47s, environment 6ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 117ms\n ↓ test/golden/canonical-locate-bridge.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 12 skipped (13)\n      Tests  7 passed | 66 skipped (73)\n   Start at  12:44:39\n   Duration  2.17s (transform 3.58s, setup 0ms, import 15.58s, tests 117ms, environment 13ms)\n\n",
      "stderr": "",
      "id": "CMD-PUBLIC-V2",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group canonical-locate-bridge --case canonical-transport-reachability",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group canonical-locate-bridge --case canonical-transport-reachability\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 3 skipped) 570ms\n     ✓ keeps production roots free of shadow/composer/schema runtime edges  566ms\n ↓ test/unit/canonical-locate-execution.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n\n Test Files  1 passed | 30 skipped (31)\n      Tests  2 passed | 274 skipped (276)\n   Start at  12:44:43\n   Duration  3.24s (transform 13.41s, setup 0ms, import 33.50s, tests 570ms, environment 9ms)\n\n",
      "stderr": "",
      "id": "CMD-REACHABILITY",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run build && npm test -- --group canonical-locate-bridge --case canonical-package-declaration-boundary",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 build\n> tsc -p tsconfig.build.json && tsc -p tsconfig.cli.json\n\n\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group canonical-locate-bridge --case canonical-package-declaration-boundary\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/canonical-locate-package-boundary.spec.ts (1 test) 7ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n\n Test Files  1 passed | 30 skipped (31)\n      Tests  1 passed | 275 skipped (276)\n   Start at  12:44:53\n   Duration  2.45s (transform 8.70s, setup 0ms, import 24.20s, tests 7ms, environment 6ms)\n\n",
      "stderr": "",
      "id": "CMD-PACKAGE-BOUNDARY",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "feature": "2026-07-24-canonical-locate-facts-bridge",
  "kind": "executable"
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 65005
Checklist bytes: 21680

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
  "stage": "implementation.before_review",
  "status": "passed",
  "gates": [
    {
      "gate_id": "scope-gate",
      "stage": "implementation.before_review",
      "status": "passed",
      "blocking": [],
      "warnings": [],
      "evidence": [
        {
          "changed_files": [
            ".codestable/architecture/system-repo-nav-foundation.md",
            ".codestable/features/2026-07-24-canonical-locate-facts-bridge/canonical-locate-facts-bridge-checklist.yaml",
            ".codestable/roadmap/repo-nav-public-beta/goal-state.yaml",
            "src/evidence/evidence.module.ts",
            "src/evidence/repository-evidence-engine.ts",
            "src/index.ts",
            "test/golden/candidate-policy.spec.ts",
            "test/golden/codegraph-fallback.spec.ts",
            "test/golden/output-guardrails.spec.ts",
            "test/golden/text-evidence-engine.spec.ts",
            "test/unit/candidate-policy.spec.ts",
            "test/unit/di.spec.ts",
            "test/unit/locate-status-evaluator.spec.ts",
            "test/unit/public-output-v2-no-cutover.spec.ts",
            "test/unit/public-result-resource-budgets-v2.spec.ts",
            "testkit/contracts/public-output-v2-import-inventory.ts",
            "testkit/fixtures/mcp/fixture-evidence.service.ts",
            "testkit/performance/large-synthetic-repository.ts",
            "testkit/runners/runner-registry.ts",
            ".codestable/features/2026-07-24-canonical-locate-facts-bridge/canonical-locate-facts-bridge-scope-allow.txt",
            "src/contracts/v2/locate-fact-envelope-v2.ts",
            "src/evidence/canonical/canonical-locate-shadow-harness-v2.ts",
            "src/evidence/canonical/locate-projection-preparation-port-v2.ts",
            "src/evidence/canonical/locate-projection-stage-registrar-v2.ts",
            "src/evidence/canonical/materialized-locate-result-composer-v2.ts",
            "src/evidence/canonical/required-owner-finalizer-v2.ts",
            "src/evidence/canonical/trusted-serialized-locate-result-v2.ts",
            "src/evidence/canonical/v2-shadow-locate-projector.ts",
            "src/evidence/locate-execution/canonical-locate-executor-v2.ts",
            "src/evidence/locate-execution/locate-execution.tokens.ts",
            "src/evidence/locate-execution/locate-projection-execution-capability-v2.ts",
            "src/evidence/locate-execution/v1-locate-result-projector.ts",
            "test/golden/canonical-locate-bridge.spec.ts",
            "test/unit/canonical-locate-execution.spec.ts",
            "test/unit/canonical-locate-facts-bridge.spec.ts",
            "test/unit/canonical-locate-package-boundary.spec.ts",
            "test/unit/canonical-locate-safe-error-serialization.spec.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/di-wiring-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/fact-contract-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/materialization-seam-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/package-declaration-boundary-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/real-shadow-no-cutover-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/required-owner-finalizer-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/runtime-reachability-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/safe-error-serialization-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/single-execution-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/synthetic-shadow-serialization-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/term-case-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/v1-bridge-golden-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/v1-projector-parity-v2.ts",
            "testkit/fixtures/canonical-locate-bridge-v2/v1-shadow-isolation-v2.ts",
            "testkit/testing/create-canonical-locate-engine-harness-v2.ts",
            "testkit/testing/create-synthetic-locate-projection-preparation-port-v2.ts",
            "tools/quality/check-public-output-reachability.mjs"
          ],
          "ignored_machine_artifacts": [],
          "allowed_prefixes": [
            ".codestable/features/2026-07-24-canonical-locate-facts-bridge",
            ".codestable/features/2026-07-24-canonical-locate-facts-bridge",
            ".codestable/architecture/system-repo-nav-foundation.md",
            "src/contracts/v2",
            "src/evidence/canonical",
            "src/evidence/locate-execution",
            "src/evidence/repository-evidence-engine.ts",
            "src/evidence/evidence.module.ts",
            "src/index.ts",
            "test/unit/canonical-locate-facts-bridge.spec.ts",
            "test/unit/canonical-locate-execution.spec.ts",
            "test/unit/canonical-locate-safe-error-serialization.spec.ts",
            "test/unit/canonical-locate-package-boundary.spec.ts",
            "test/unit/di.spec.ts",
            "test/unit/public-output-v2-no-cutover.spec.ts",
            "test/unit/locate-status-evaluator.spec.ts",
            "test/unit/candidate-policy.spec.ts",
            "test/unit/public-result-resource-budgets-v2.spec.ts",
            "test/golden/canonical-locate-bridge.spec.ts",
            "test/golden/candidate-policy.spec.ts",
            "test/golden/codegraph-fallback.spec.ts",
            "test/golden/output-guardrails.spec.ts",
            "test/golden/text-evidence-engine.spec.ts",
            "testkit/runners/runner-registry.ts",
            "testkit/fixtures/canonical-locate-bridge-v2",
            "testkit/testing/create-canonical-locate-engine-harness-v2.ts",
            "testkit/testing/create-synthetic-locate-projection-preparation-port-v2.ts",
            "testkit/contracts/public-output-v2-import-inventory.ts",
            "testkit/fixtures/mcp/fixture-evidence.service.ts",
            "testkit/performance/large-synthetic-repository.ts",
            "tools/quality/check-public-output-reachability.mjs",
            "testkit/manifests/coverage/fixture-ownership.yaml",
            ".codestable/.gitignore",
            ".codestable/reference",
            ".codestable/roadmap/repo-nav-public-beta",
            ".codestable/runtime-manifest.json",
            ".codestable/features/2026-07-24-cross-platform-ci-baseline",
            ".codestable/features/2026-07-24-input-abort-contract-v2",
            ".codestable/features/2026-07-24-language-capability-boundary",
            ".codestable/features/2026-07-24-public-beta-release",
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2",
            ".codestable/features/2026-07-24-relevance-ranking-budget",
            ".codestable/features/2026-07-24-repository-scope-policy",
            ".codestable/features/2026-07-24-request-snapshot-cache",
            ".codestable/features/2026-07-24-span-redaction-corpus-policy-v2",
            ".codestable/features/2026-07-24-streaming-ripgrep"
          ]
        }
      ],
      "providers": {},
      "feature": "2026-07-24-canonical-locate-facts-bridge",
      "kind": "executable"
    },
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
          "command": "npm test -- --group canonical-locate-bridge --case canonical-fact-contract --case canonical-required-owner-finalizer --case canonical-materialization-seam --case canonical-single-execution --case canonical-v1-projector-parity --case canonical-v1-shadow-isolation --case canonical-term-case-parity --case canonical-real-shadow-no-cutover --case canonical-synthetic-shadow-serialization --case canonical-safe-error-serialization --case canonical-di-wiring --case canonical-transport-reachability",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group canonical-locate-bridge --case canonical-fact-contract --case canonical-required-owner-finalizer --case canonical-materialization-seam --case canonical-single-execution --case canonical-v1-projector-parity --case canonical-v1-shadow-isolation --case canonical-term-case-parity --case canonical-real-shadow-no-cutover --case canonical-synthetic-shadow-serialization --case canonical-safe-error-serialization --case canonical-di-wiring --case canonical-transport-reachability\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ✓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests) 14ms\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests) 36ms\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ✓ test/unit/canonical-locate-execution.spec.ts (4 tests) 16ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/di.spec.ts (3 tests | 2 skipped) 36ms\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 3 skipped) 283ms\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n\n Test Files  5 passed | 26 skipped (31)\n      Tests  20 passed | 256 skipped (276)\n   Start at  12:43:18\n   Duration  2.51s (transform 6.93s, setup 0ms, import 23.92s, tests 384ms, environment 7ms)\n\n",
          "stderr": "",
          "id": "CMD-F1C-UNIT",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/canonical-locate-package-boundary.spec.ts (1 test) 7ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 28ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 116ms\n ✓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests) 14ms\n ✓ test/unit/contract.spec.ts (12 tests) 40ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 20ms\n ✓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests) 39ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 23ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 115ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 28ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 37ms\n ✓ test/unit/canonical-locate-execution.spec.ts (4 tests) 16ms\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests) 833ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  546ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 111ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/di.spec.ts (3 tests) 94ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 51ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 102ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 239ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 33ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 905ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 179ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 62ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 166ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 1145ms\n     ✓ passes shell metacharacters to git as literal path arguments  910ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2050ms\n     ✓ distinguishes its own deadline from a caller abort  1007ms\n     ✓ retains verification completed before the abort  1009ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1231ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 3664ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  3661ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 2231ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1860ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 11734ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2546ms\n     ✓ terminates direct child and descendant on timeout  2169ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1689ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1633ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3550ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 12258ms\n     ✓ proves abort, single settlement, and owned tree death  2624ms\n     ✓ proves timeout, single settlement, and owned tree death  2355ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1896ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1833ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3484ms\n\n Test Files  31 passed (31)\n      Tests  275 passed | 1 skipped (276)\n   Start at  12:43:22\n   Duration  14.15s (transform 7.35s, setup 0ms, import 26.47s, tests 37.58s, environment 11ms)\n\n",
          "stderr": "",
          "id": "CMD-UNIT-ALL",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:golden -- --all",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 3ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 56ms\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 6ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 50ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 78ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 101ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 136ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 179ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 206ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 239ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 315ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 1553ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  684ms\n     ✓ keeps multiple canonical symbol facts stable across anchor permutations  608ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 2454ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  2452ms\n\n Test Files  13 passed (13)\n      Tests  72 passed | 1 skipped (73)\n   Start at  12:43:37\n   Duration  3.57s (transform 2.27s, setup 0ms, import 11.18s, tests 5.38s, environment 2ms)\n\n",
          "stderr": "",
          "id": "CMD-GOLDEN-ALL",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:mcp -- --all",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 284ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1509ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1506ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1528ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1526ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1543ms\n     ✓ returns confirmed and bounded candidates with transport parity  1540ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2645ms\n     ✓ returns one confirmed mapping through real stdio  1511ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1130ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3926ms\n     ✓ does not lose cancellation sent before the handler starts work  1577ms\n     ✓ propagates the SDK request signal to the application service  1199ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  1147ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4649ms\n     ✓ maps schema-invalid objects to typed parity output  1502ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1093ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1135ms\n     ✓ turns thrown failures into safe typed parity output  916ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 13501ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  958ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  688ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  763ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1722ms\n     ✓ fails when the real context close marker is deliberately skipped  1407ms\n     ✓ fails when an actual descendant tree is deliberately left running  2852ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  4032ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  1027ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  12:43:48\n   Duration  15.59s (transform 1.71s, setup 0ms, import 9.03s, tests 29.59s, environment 1ms)\n\n",
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
          "command": "npm run test:golden -- --group canonical-locate-bridge --case canonical-v1-bridge-parity",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group canonical-locate-bridge --case canonical-v1-bridge-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/public-output-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ✓ test/golden/canonical-locate-bridge.spec.ts (1 test) 11ms\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 12 skipped (13)\n      Tests  1 passed | 72 skipped (73)\n   Start at  12:44:30\n   Duration  1.40s (transform 2.52s, setup 0ms, import 11.86s, tests 11ms, environment 5ms)\n\n",
          "stderr": "",
          "id": "CMD-F1C-GOLDEN",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test -- --group public-output-v2 && npm run test:golden -- --group public-output-v2",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 96ms\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 50ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 85ms\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 135ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 2 skipped) 536ms\n     ✓ proves package barrels, engine, MCP and CLI cannot reach dormant v2 modules  524ms\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 2570ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  2231ms\n\n Test Files  6 passed | 25 skipped (31)\n      Tests  74 passed | 202 skipped (276)\n   Start at  12:44:33\n   Duration  5.00s (transform 7.92s, setup 0ms, import 25.82s, tests 3.47s, environment 6ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 117ms\n ↓ test/golden/canonical-locate-bridge.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 12 skipped (13)\n      Tests  7 passed | 66 skipped (73)\n   Start at  12:44:39\n   Duration  2.17s (transform 3.58s, setup 0ms, import 15.58s, tests 117ms, environment 13ms)\n\n",
          "stderr": "",
          "id": "CMD-PUBLIC-V2",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test -- --group canonical-locate-bridge --case canonical-transport-reachability",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group canonical-locate-bridge --case canonical-transport-reachability\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/canonical-locate-package-boundary.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 3 skipped) 570ms\n     ✓ keeps production roots free of shadow/composer/schema runtime edges  566ms\n ↓ test/unit/canonical-locate-execution.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n\n Test Files  1 passed | 30 skipped (31)\n      Tests  2 passed | 274 skipped (276)\n   Start at  12:44:43\n   Duration  3.24s (transform 13.41s, setup 0ms, import 33.50s, tests 570ms, environment 9ms)\n\n",
          "stderr": "",
          "id": "CMD-REACHABILITY",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run build && npm test -- --group canonical-locate-bridge --case canonical-package-declaration-boundary",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 build\n> tsc -p tsconfig.build.json && tsc -p tsconfig.cli.json\n\n\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group canonical-locate-bridge --case canonical-package-declaration-boundary\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/canonical-locate-package-boundary.spec.ts (1 test) 7ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/canonical-locate-safe-error-serialization.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/canonical-locate-facts-bridge.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/canonical-locate-execution.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/di.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n\n Test Files  1 passed | 30 skipped (31)\n      Tests  1 passed | 275 skipped (276)\n   Start at  12:44:53\n   Duration  2.45s (transform 8.70s, setup 0ms, import 24.20s, tests 7ms, environment 6ms)\n\n",
          "stderr": "",
          "id": "CMD-PACKAGE-BOUNDARY",
          "core": true,
          "failure_handling": "fix-or-block"
        }
      ],
      "feature": "2026-07-24-canonical-locate-facts-bridge",
      "kind": "executable"
    }
  ],
  "warnings": [],
  "blocking": []
}
```
