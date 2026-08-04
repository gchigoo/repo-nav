---
doc_type: feature-evidence-pack
feature: 2026-07-24-public-result-resource-budgets-v2
status: generated
---

# 2026-07-24-public-result-resource-budgets-v2 evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-design.md`
- Checklist: `.codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml`

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
      "command": "npm test -- --group public-output-v2 --case resource-budget-primitives --case raw-resource-budgets --case corpus-resource-budgets --case public-field-resource-budgets --case serialized-resource-budget --case maximum-structure-budget --case resource-budget-ordering --case resource-budget-projection --case resource-budget-legacy-isolation",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2 --case resource-budget-primitives --case raw-resource-budgets --case corpus-resource-budgets --case public-field-resource-budgets --case serialized-resource-budget --case maximum-structure-budget --case resource-budget-ordering --case resource-budget-projection --case resource-budget-legacy-isolation\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 1944ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1577ms\n\n Test Files  1 passed | 26 skipped (27)\n      Tests  16 passed | 239 skipped (255)\n   Start at  12:18:25\n   Duration  4.07s (transform 5.15s, setup 0ms, import 20.27s, tests 1.94s, environment 6ms)\n\n",
      "stderr": "",
      "id": "CMD-F1B-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group public-output-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 37ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 110ms\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 51ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 81ms\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 112ms\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 1614ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1300ms\n\n Test Files  6 passed | 21 skipped (27)\n      Tests  74 passed | 181 skipped (255)\n   Start at  12:18:31\n   Duration  3.50s (transform 5.18s, setup 0ms, import 18.70s, tests 2.01s, environment 5ms)\n\n",
      "stderr": "",
      "id": "CMD-V2-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group public-output-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 47ms\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n\n Test Files  1 passed | 11 skipped (12)\n      Tests  7 passed | 65 skipped (72)\n   Start at  12:18:35\n   Duration  1.38s (transform 2.26s, setup 0ms, import 10.73s, tests 47ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-V2-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group public-output-v2 --case no-cutover-import-inventory",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2 --case no-cutover-import-inventory\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 37ms\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n\n Test Files  1 passed | 26 skipped (27)\n      Tests  3 passed | 252 skipped (255)\n   Start at  12:18:38\n   Duration  2.02s (transform 6.14s, setup 0ms, import 19.73s, tests 37ms, environment 6ms)\n\n",
      "stderr": "",
      "id": "CMD-NOCUTOVER",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 38ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 29ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 100ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 82ms\n ✓ test/unit/contract.spec.ts (12 tests) 33ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 17ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 24ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 46ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 116ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 25ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 77ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 31ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 127ms\n ✓ test/unit/di.spec.ts (2 tests) 72ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 87ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 162ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 486ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 31ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 153ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 975ms\n     ✓ passes shell metacharacters to git as literal path arguments  790ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1008ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2053ms\n     ✓ distinguishes its own deadline from a caller abort  1009ms\n     ✓ retains verification completed before the abort  1016ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 2056ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1607ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 3041ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  3038ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 10974ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2279ms\n     ✓ terminates direct child and descendant on timeout  1990ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1655ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1587ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3334ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 10937ms\n     ✓ proves abort, single settlement, and owned tree death  2140ms\n     ✓ proves timeout, single settlement, and owned tree death  2041ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1723ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1596ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3392ms\n\n Test Files  27 passed (27)\n      Tests  254 passed | 1 skipped (255)\n   Start at  12:18:41\n   Duration  12.35s (transform 5.37s, setup 0ms, import 19.45s, tests 32.78s, environment 5ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 58ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 48ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 79ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 92ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 132ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 203ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 201ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 224ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 286ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 2254ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  1761ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 3272ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  3270ms\n\n Test Files  12 passed (12)\n      Tests  71 passed | 1 skipped (72)\n   Start at  12:18:55\n   Duration  4.45s (transform 2.18s, setup 0ms, import 11.17s, tests 6.85s, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 220ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1313ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1311ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1337ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1336ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1344ms\n     ✓ returns confirmed and bounded candidates with transport parity  1342ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2377ms\n     ✓ returns one confirmed mapping through real stdio  1313ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1062ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3464ms\n     ✓ does not lose cancellation sent before the handler starts work  1399ms\n     ✓ propagates the SDK request signal to the application service  1070ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  993ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4159ms\n     ✓ maps schema-invalid objects to typed parity output  1327ms\n     ✓ preserves the typed code while sanitizing unsafe detail  997ms\n     ✓ preserves the typed code while sanitizing unsafe detail  969ms\n     ✓ turns thrown failures into safe typed parity output  862ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11976ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  753ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  630ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  654ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1563ms\n     ✓ fails when the real context close marker is deliberately skipped  1432ms\n     ✓ fails when an actual descendant tree is deliberately left running  2780ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3349ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  770ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  12:19:05\n   Duration  13.76s (transform 1.31s, setup 0ms, import 7.70s, tests 26.19s, environment 1ms)\n\n",
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
    }
  ],
  "providers": {},
  "feature": "2026-07-24-public-result-resource-budgets-v2",
  "inputs": {
    "checklist": ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml"
  },
  "input_digests": {
    "checklist": "b51868bb008d7654ed75989b6e9538aaf8cd7ec269251efdc015b61d5ea3873b"
  }
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 35964
Checklist bytes: 12977

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
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml",
            ".codestable/roadmap/repo-nav-public-beta/goal-state.yaml",
            "src/contracts/v2/locate-result-v2.ts",
            "src/evidence/public-output/public-result-assembler-v2.ts",
            "test/unit/public-output-v2-no-cutover.spec.ts",
            "testkit/fixtures/public-output-v2/no-cutover-import-inventory-v2.ts",
            "testkit/runners/runner-registry.ts",
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-architecture-check.md",
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-scope-allow.txt",
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-scope-gate.json",
            "src/contracts/v2/locate-result-resource-budget-contract-v2.ts",
            "src/evidence/public-output/result-resource-budget-guards-v2.ts",
            "test/unit/public-result-resource-budgets-v2.spec.ts",
            "testkit/fixtures/public-output-v2/corpus-resource-budgets-v2.ts",
            "testkit/fixtures/public-output-v2/maximum-structure-v2.ts",
            "testkit/fixtures/public-output-v2/public-field-resource-budgets-v2.ts",
            "testkit/fixtures/public-output-v2/resource-budget-legacy-isolation-v2.ts",
            "testkit/fixtures/public-output-v2/resource-budget-ordering-v2.ts",
            "testkit/fixtures/public-output-v2/resource-budget-projection-v2.ts",
            "testkit/fixtures/public-output-v2/resource-budgets-v2.ts",
            "testkit/fixtures/public-output-v2/serialized-resource-budget-v2.ts"
          ],
          "ignored_machine_artifacts": [
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-dod-results.json"
          ],
          "allowed_prefixes": [
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2",
            ".codestable/features/2026-07-24-public-result-resource-budgets-v2",
            "src/contracts/v2",
            "src/evidence/public-output",
            "test/unit/public-result-resource-budgets-v2.spec.ts",
            "test/unit/public-output-v2-no-cutover.spec.ts",
            "test/golden/public-output-v2.spec.ts",
            "testkit/runners/runner-registry.ts",
            "testkit/fixtures/public-output-v2",
            "testkit/manifests/coverage/fixture-ownership.yaml",
            ".codestable/.gitignore",
            ".codestable/reference",
            ".codestable/roadmap/repo-nav-public-beta",
            ".codestable/runtime-manifest.json",
            ".codestable/features/2026-07-24-canonical-locate-facts-bridge",
            ".codestable/features/2026-07-24-cross-platform-ci-baseline",
            ".codestable/features/2026-07-24-input-abort-contract-v2",
            ".codestable/features/2026-07-24-language-capability-boundary",
            ".codestable/features/2026-07-24-public-beta-release",
            ".codestable/features/2026-07-24-relevance-ranking-budget",
            ".codestable/features/2026-07-24-repository-scope-policy",
            ".codestable/features/2026-07-24-request-snapshot-cache",
            ".codestable/features/2026-07-24-span-redaction-corpus-policy-v2",
            ".codestable/features/2026-07-24-streaming-ripgrep"
          ]
        }
      ],
      "providers": {},
      "feature": "2026-07-24-public-result-resource-budgets-v2",
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
          "command": "npm test -- --group public-output-v2 --case resource-budget-primitives --case raw-resource-budgets --case corpus-resource-budgets --case public-field-resource-budgets --case serialized-resource-budget --case maximum-structure-budget --case resource-budget-ordering --case resource-budget-projection --case resource-budget-legacy-isolation",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2 --case resource-budget-primitives --case raw-resource-budgets --case corpus-resource-budgets --case public-field-resource-budgets --case serialized-resource-budget --case maximum-structure-budget --case resource-budget-ordering --case resource-budget-projection --case resource-budget-legacy-isolation\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 1944ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1577ms\n\n Test Files  1 passed | 26 skipped (27)\n      Tests  16 passed | 239 skipped (255)\n   Start at  12:18:25\n   Duration  4.07s (transform 5.15s, setup 0ms, import 20.27s, tests 1.94s, environment 6ms)\n\n",
          "stderr": "",
          "id": "CMD-F1B-UNIT",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test -- --group public-output-v2",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 37ms\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 110ms\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 51ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 81ms\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 112ms\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 1614ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1300ms\n\n Test Files  6 passed | 21 skipped (27)\n      Tests  74 passed | 181 skipped (255)\n   Start at  12:18:31\n   Duration  3.50s (transform 5.18s, setup 0ms, import 18.70s, tests 2.01s, environment 5ms)\n\n",
          "stderr": "",
          "id": "CMD-V2-UNIT",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:golden -- --group public-output-v2",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 47ms\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n\n Test Files  1 passed | 11 skipped (12)\n      Tests  7 passed | 65 skipped (72)\n   Start at  12:18:35\n   Duration  1.38s (transform 2.26s, setup 0ms, import 10.73s, tests 47ms, environment 2ms)\n\n",
          "stderr": "",
          "id": "CMD-V2-GOLDEN",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test -- --group public-output-v2 --case no-cutover-import-inventory",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2 --case no-cutover-import-inventory\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 37ms\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests | 16 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n\n Test Files  1 passed | 26 skipped (27)\n      Tests  3 passed | 252 skipped (255)\n   Start at  12:18:38\n   Duration  2.02s (transform 6.14s, setup 0ms, import 19.73s, tests 37ms, environment 6ms)\n\n",
          "stderr": "",
          "id": "CMD-NOCUTOVER",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 38ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 29ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 100ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 82ms\n ✓ test/unit/contract.spec.ts (12 tests) 33ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 17ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 24ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 46ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 116ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 25ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 77ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 31ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 127ms\n ✓ test/unit/di.spec.ts (2 tests) 72ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 87ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 162ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 486ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 31ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 153ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 975ms\n     ✓ passes shell metacharacters to git as literal path arguments  790ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1008ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2053ms\n     ✓ distinguishes its own deadline from a caller abort  1009ms\n     ✓ retains verification completed before the abort  1016ms\n ✓ test/unit/public-result-resource-budgets-v2.spec.ts (16 tests) 2056ms\n     ✓ F1B-RAW-FIELD-001 file/symbol/excerpt and spaced 400k excerpt  1607ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 3041ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  3038ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 10974ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2279ms\n     ✓ terminates direct child and descendant on timeout  1990ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1655ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1587ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3334ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 10937ms\n     ✓ proves abort, single settlement, and owned tree death  2140ms\n     ✓ proves timeout, single settlement, and owned tree death  2041ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1723ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1596ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3392ms\n\n Test Files  27 passed (27)\n      Tests  254 passed | 1 skipped (255)\n   Start at  12:18:41\n   Duration  12.35s (transform 5.37s, setup 0ms, import 19.45s, tests 32.78s, environment 5ms)\n\n",
          "stderr": "",
          "id": "CMD-UNIT-ALL",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:golden -- --all",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 58ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 48ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 79ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 92ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 132ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 203ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 201ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 224ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 286ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 2254ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  1761ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 3272ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  3270ms\n\n Test Files  12 passed (12)\n      Tests  71 passed | 1 skipped (72)\n   Start at  12:18:55\n   Duration  4.45s (transform 2.18s, setup 0ms, import 11.17s, tests 6.85s, environment 2ms)\n\n",
          "stderr": "",
          "id": "CMD-GOLDEN-ALL",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:mcp -- --all",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 220ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1313ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1311ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1337ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1336ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1344ms\n     ✓ returns confirmed and bounded candidates with transport parity  1342ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2377ms\n     ✓ returns one confirmed mapping through real stdio  1313ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1062ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3464ms\n     ✓ does not lose cancellation sent before the handler starts work  1399ms\n     ✓ propagates the SDK request signal to the application service  1070ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  993ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4159ms\n     ✓ maps schema-invalid objects to typed parity output  1327ms\n     ✓ preserves the typed code while sanitizing unsafe detail  997ms\n     ✓ preserves the typed code while sanitizing unsafe detail  969ms\n     ✓ turns thrown failures into safe typed parity output  862ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11976ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  753ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  630ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  654ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1563ms\n     ✓ fails when the real context close marker is deliberately skipped  1432ms\n     ✓ fails when an actual descendant tree is deliberately left running  2780ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3349ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  770ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  12:19:05\n   Duration  13.76s (transform 1.31s, setup 0ms, import 7.70s, tests 26.19s, environment 1ms)\n\n",
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
        }
      ],
      "providers": {},
      "feature": "2026-07-24-public-result-resource-budgets-v2",
      "inputs": {
        "checklist": ".codestable/features/2026-07-24-public-result-resource-budgets-v2/public-result-resource-budgets-v2-checklist.yaml"
      },
      "input_digests": {
        "checklist": "b51868bb008d7654ed75989b6e9538aaf8cd7ec269251efdc015b61d5ea3873b"
      },
      "kind": "executable"
    }
  ],
  "warnings": [],
  "blocking": []
}
```
