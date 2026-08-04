---
doc_type: feature-evidence-pack
feature: 2026-07-24-cross-platform-ci-baseline
status: generated
---

# 2026-07-24-cross-platform-ci-baseline evidence pack

## 1. Scope

- Design: `.codestable\features\2026-07-24-cross-platform-ci-baseline\cross-platform-ci-baseline-design.md`
- Checklist: `.codestable\features\2026-07-24-cross-platform-ci-baseline\cross-platform-ci-baseline-checklist.yaml`

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
      "command": "npm test -- --group cross-platform-ci-contract",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group cross-platform-ci-contract\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 77ms\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 30ms\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n\n Test Files  2 passed | 24 skipped (26)\n      Tests  4 passed | 235 skipped (239)\n   Start at  11:27:37\n   Duration  2.04s (transform 4.90s, setup 0ms, import 18.03s, tests 107ms, environment 5ms)\n\n",
      "stderr": "",
      "id": "CMD-F4-CONTRACT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group cross-platform-baseline",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group cross-platform-baseline\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 10073ms\n     ✓ proves abort, single settlement, and owned tree death  1701ms\n     ✓ proves timeout, single settlement, and owned tree death  1996ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1470ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1534ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3329ms\n\n Test Files  1 passed | 25 skipped (26)\n      Tests  8 passed | 231 skipped (239)\n   Start at  11:27:40\n   Duration  11.69s (transform 6.27s, setup 0ms, import 20.17s, tests 10.07s, environment 5ms)\n\n",
      "stderr": "",
      "id": "CMD-F4-PLATFORM",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 46ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 31ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 78ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 139ms\n ✓ test/unit/contract.spec.ts (12 tests) 46ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 51ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 23ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 29ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 27ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 171ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 39ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 113ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 225ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 168ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 436ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 69ms\n ✓ test/unit/di.spec.ts (2 tests) 64ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 230ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 39ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 1211ms\n     ✓ passes shell metacharacters to git as literal path arguments  994ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1077ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2061ms\n     ✓ distinguishes its own deadline from a caller abort  1014ms\n     ✓ retains verification completed before the abort  1013ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 4549ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  4547ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 10641ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2469ms\n     ✓ terminates direct child and descendant on timeout  1927ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1479ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1340ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3299ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 10589ms\n     ✓ proves abort, single settlement, and owned tree death  2114ms\n     ✓ proves timeout, single settlement, and owned tree death  2123ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1549ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1533ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3231ms\n\n Test Files  26 passed (26)\n      Tests  238 passed | 1 skipped (239)\n   Start at  11:27:53\n   Duration  12.76s (transform 8.81s, setup 0ms, import 26.69s, tests 32.16s, environment 5ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 47ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 52ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 71ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 100ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 132ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 165ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 203ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 212ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 253ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 1090ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  746ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 2073ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  2071ms\n\n Test Files  12 passed (12)\n      Tests  71 passed | 1 skipped (72)\n   Start at  11:28:07\n   Duration  3.27s (transform 1.99s, setup 0ms, import 10.38s, tests 4.40s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 3ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 296ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1448ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1447ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1483ms\n     ✓ returns confirmed and bounded candidates with transport parity  1482ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1522ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1520ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2494ms\n     ✓ returns one confirmed mapping through real stdio  1448ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1044ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3626ms\n     ✓ does not lose cancellation sent before the handler starts work  1575ms\n     ✓ propagates the SDK request signal to the application service  1070ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  979ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4386ms\n     ✓ maps schema-invalid objects to typed parity output  1416ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1083ms\n     ✓ preserves the typed code while sanitizing unsafe detail  954ms\n     ✓ turns thrown failures into safe typed parity output  930ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11983ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  911ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  660ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  636ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1517ms\n     ✓ fails when the real context close marker is deliberately skipped  1311ms\n     ✓ fails when an actual descendant tree is deliberately left running  2800ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3291ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  792ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  11:28:17\n   Duration  13.93s (transform 1.65s, setup 0ms, import 9.27s, tests 27.24s, environment 1ms)\n\n",
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
      "stdout": "7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 8 skipped) 3327ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3322ms\n\n Test Files  1 passed | 25 skipped (26)\n      Tests  1 passed | 238 skipped (239)\n   Start at  11:29:14\n   Duration  5.21s (transform 6.89s, setup 3.80s, import 18.87s, tests 3.33s, environment 12ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group mcp-surface --case request-cancellation-cleanup\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/mcp-golden-adapter.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (18 tests | 18 skipped)\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2570ms\n     ✓ does not lose cancellation sent before the handler starts work  938ms\n     ✓ propagates the SDK request signal to the application service  850ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  777ms\n\n Test Files  1 passed | 8 skipped (9)\n      Tests  3 passed | 36 skipped (39)\n   Start at  11:29:26\n   Duration  3.87s (transform 1.69s, setup 1.36s, import 7.93s, tests 2.57s, environment 2ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group lifecycle --case shutdown-cleanup-probe\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/mcp-golden-adapter.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests | 13 skipped) 9574ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1421ms\n     ✓ fails when the real context close marker is deliberately skipped  1329ms\n     ✓ fails when an actual descendant tree is deliberately left running  2778ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3250ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  792ms\n\n Test Files  1 passed | 8 skipped (9)\n      Tests  5 passed | 34 skipped (39)\n   Start at  11:29:36\n   Duration  11.52s (transform 1.93s, setup 1.69s, import 7.97s, tests 9.57s, environment 1ms)\n\nplatform contracts passed: F4-MCP-001, F4-MCP-002, F4-PATH-001, F4-PATH-003, F4-PATH-004, F4-PROC-001, F4-PROC-002, F4-PROC-003, F4-PROC-004, F4-PROC-005\n",
      "stderr": "",
      "id": "CMD-PLATFORM",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "node tools/ci/validate-workflow-yaml.mjs .github/workflows/cross-platform-ci.yml",
      "exit_code": 0,
      "stdout": "yaml_ok .github/workflows/cross-platform-ci.yml\n",
      "stderr": "",
      "id": "CMD-WORKFLOW-YAML",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "node tools/ci/assert-platform-contract.mjs --workflow .github/workflows/cross-platform-ci.yml",
      "exit_code": 0,
      "stdout": "workflow contract ok: .github/workflows/cross-platform-ci.yml\n",
      "stderr": "",
      "id": "CMD-WORKFLOW-CONTRACT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "node tools/ci/run-platform-contracts.mjs --self-test",
      "exit_code": 0,
      "stdout": "platform contract self-test passed\n",
      "stderr": "",
      "id": "CMD-REGISTRY-SELFTEST",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "node tools/ci/write-platform-report.mjs --self-test",
      "exit_code": 0,
      "stdout": "platform report self-test passed\n",
      "stderr": "",
      "id": "CMD-REPORT-SELFTEST",
      "core": true,
      "failure_handling": "fix-or-block"
    }
  ],
  "providers": {},
  "feature": "2026-07-24-cross-platform-ci-baseline",
  "inputs": {
    "checklist": ".codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml"
  },
  "input_digests": {
    "checklist": "c159dc10798551f0611f4edd928119e41aa981e838b659426cba714b702bcfc0"
  },
  "kind": "executable"
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 53546
Checklist bytes: 21943

## 5. Residual Risks

- cleanliness marker TODO in .codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml
- scope-gate: cleanliness marker TODO in .codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml

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
      "warnings": [
        "cleanliness marker TODO in .codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml"
      ],
      "evidence": [
        {
          "changed_files": [
            ".codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml",
            ".codestable/roadmap/repo-nav-public-beta/goal-state.yaml",
            ".codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-architecture-check.md",
            ".codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-scope-allow.txt"
          ],
          "ignored_machine_artifacts": [],
          "allowed_prefixes": [
            ".codestable/features/2026-07-24-cross-platform-ci-baseline",
            ".codestable/features/2026-07-24-cross-platform-ci-baseline",
            ".codestable/roadmap/repo-nav-public-beta",
            ".github/workflows/cross-platform-ci.yml",
            "tools/ci",
            "testkit/contracts",
            "testkit/testing/platform-contract.ts",
            "testkit/testing/platform-contract-setup.ts",
            "testkit/fixtures/platform",
            "testkit/manifests/mcp",
            "testkit/runners",
            "test/unit/cross-platform-ci-contract.spec.ts",
            "test/unit/cross-platform-platform.spec.ts",
            "test/unit/platform-evidence-report.spec.ts",
            "test/unit/platform-contract-production-id-v1.type-test.ts",
            "test/unit/platform-contract-synthetic-extension-v1.type-test.ts",
            "package.json"
          ]
        }
      ],
      "providers": {},
      "feature": "2026-07-24-cross-platform-ci-baseline",
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
          "command": "npm test -- --group cross-platform-ci-contract",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group cross-platform-ci-contract\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 77ms\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/cross-platform-platform.spec.ts (9 tests | 9 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 30ms\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n\n Test Files  2 passed | 24 skipped (26)\n      Tests  4 passed | 235 skipped (239)\n   Start at  11:27:37\n   Duration  2.04s (transform 4.90s, setup 0ms, import 18.03s, tests 107ms, environment 5ms)\n\n",
          "stderr": "",
          "id": "CMD-F4-CONTRACT",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test -- --group cross-platform-baseline",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group cross-platform-baseline\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/platform-evidence-report.spec.ts (1 test | 1 skipped)\n ↓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/cross-platform-ci-contract.spec.ts (3 tests | 3 skipped)\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 10073ms\n     ✓ proves abort, single settlement, and owned tree death  1701ms\n     ✓ proves timeout, single settlement, and owned tree death  1996ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1470ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1534ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3329ms\n\n Test Files  1 passed | 25 skipped (26)\n      Tests  8 passed | 231 skipped (239)\n   Start at  11:27:40\n   Duration  11.69s (transform 6.27s, setup 0ms, import 20.17s, tests 10.07s, environment 5ms)\n\n",
          "stderr": "",
          "id": "CMD-F4-PLATFORM",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm test",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (3 tests) 46ms\n ✓ test/unit/platform-evidence-report.spec.ts (1 test) 31ms\n ✓ test/unit/cross-platform-ci-contract.spec.ts (3 tests) 78ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 139ms\n ✓ test/unit/contract.spec.ts (12 tests) 46ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 51ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 23ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 29ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 27ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 171ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 39ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 113ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (19 tests) 225ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 168ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 436ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 69ms\n ✓ test/unit/di.spec.ts (2 tests) 64ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 230ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 39ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 1211ms\n     ✓ passes shell metacharacters to git as literal path arguments  994ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 1077ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2061ms\n     ✓ distinguishes its own deadline from a caller abort  1014ms\n     ✓ retains verification completed before the abort  1013ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 4549ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  4547ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 10641ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2469ms\n     ✓ terminates direct child and descendant on timeout  1927ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1479ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1340ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3299ms\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 1 skipped) 10589ms\n     ✓ proves abort, single settlement, and owned tree death  2114ms\n     ✓ proves timeout, single settlement, and owned tree death  2123ms\n     ✓ keeps N-1 success and exact-N stdout-limit baseline  1549ms\n     ✓ keeps N-1 success and exact-N stderr-limit baseline  1533ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3231ms\n\n Test Files  26 passed (26)\n      Tests  238 passed | 1 skipped (239)\n   Start at  11:27:53\n   Duration  12.76s (transform 8.81s, setup 0ms, import 26.69s, tests 32.16s, environment 5ms)\n\n",
          "stderr": "",
          "id": "CMD-UNIT-ALL",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:golden -- --all",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 6ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 47ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 52ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 71ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 100ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 132ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 165ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 203ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 212ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 253ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 1090ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  746ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 2073ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  2071ms\n\n Test Files  12 passed (12)\n      Tests  71 passed | 1 skipped (72)\n   Start at  11:28:07\n   Duration  3.27s (transform 1.99s, setup 0ms, import 10.38s, tests 4.40s, environment 3ms)\n\n",
          "stderr": "",
          "id": "CMD-GOLDEN-ALL",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "npm run test:mcp -- --all",
          "exit_code": 0,
          "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 3ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 296ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1448ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1447ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1483ms\n     ✓ returns confirmed and bounded candidates with transport parity  1482ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1522ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1520ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2494ms\n     ✓ returns one confirmed mapping through real stdio  1448ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1044ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3626ms\n     ✓ does not lose cancellation sent before the handler starts work  1575ms\n     ✓ propagates the SDK request signal to the application service  1070ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  979ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4386ms\n     ✓ maps schema-invalid objects to typed parity output  1416ms\n     ✓ preserves the typed code while sanitizing unsafe detail  1083ms\n     ✓ preserves the typed code while sanitizing unsafe detail  954ms\n     ✓ turns thrown failures into safe typed parity output  930ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11983ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  911ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  660ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  636ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1517ms\n     ✓ fails when the real context close marker is deliberately skipped  1311ms\n     ✓ fails when an actual descendant tree is deliberately left running  2800ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3291ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  792ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  11:28:17\n   Duration  13.93s (transform 1.65s, setup 0ms, import 9.27s, tests 27.24s, environment 1ms)\n\n",
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
          "stdout": "7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-redaction.spec.ts (19 tests | 19 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n ✓ test/unit/cross-platform-platform.spec.ts (9 tests | 8 skipped) 3327ms\n     ✓ records fixed invariant, direct child death, and descendant observation  3322ms\n\n Test Files  1 passed | 25 skipped (26)\n      Tests  1 passed | 238 skipped (239)\n   Start at  11:29:14\n   Duration  5.21s (transform 6.89s, setup 3.80s, import 18.87s, tests 3.33s, environment 12ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group mcp-surface --case request-cancellation-cleanup\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/mcp-golden-adapter.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (18 tests | 18 skipped)\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2570ms\n     ✓ does not lose cancellation sent before the handler starts work  938ms\n     ✓ propagates the SDK request signal to the application service  850ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  777ms\n\n Test Files  1 passed | 8 skipped (9)\n      Tests  3 passed | 36 skipped (39)\n   Start at  11:29:26\n   Duration  3.87s (transform 1.69s, setup 1.36s, import 7.93s, tests 2.57s, environment 2ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group lifecycle --case shutdown-cleanup-probe\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/mcp-golden-adapter.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests | 13 skipped) 9574ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1421ms\n     ✓ fails when the real context close marker is deliberately skipped  1329ms\n     ✓ fails when an actual descendant tree is deliberately left running  2778ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  3250ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  792ms\n\n Test Files  1 passed | 8 skipped (9)\n      Tests  5 passed | 34 skipped (39)\n   Start at  11:29:36\n   Duration  11.52s (transform 1.93s, setup 1.69s, import 7.97s, tests 9.57s, environment 1ms)\n\nplatform contracts passed: F4-MCP-001, F4-MCP-002, F4-PATH-001, F4-PATH-003, F4-PATH-004, F4-PROC-001, F4-PROC-002, F4-PROC-003, F4-PROC-004, F4-PROC-005\n",
          "stderr": "",
          "id": "CMD-PLATFORM",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "node tools/ci/validate-workflow-yaml.mjs .github/workflows/cross-platform-ci.yml",
          "exit_code": 0,
          "stdout": "yaml_ok .github/workflows/cross-platform-ci.yml\n",
          "stderr": "",
          "id": "CMD-WORKFLOW-YAML",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "node tools/ci/assert-platform-contract.mjs --workflow .github/workflows/cross-platform-ci.yml",
          "exit_code": 0,
          "stdout": "workflow contract ok: .github/workflows/cross-platform-ci.yml\n",
          "stderr": "",
          "id": "CMD-WORKFLOW-CONTRACT",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "node tools/ci/run-platform-contracts.mjs --self-test",
          "exit_code": 0,
          "stdout": "platform contract self-test passed\n",
          "stderr": "",
          "id": "CMD-REGISTRY-SELFTEST",
          "core": true,
          "failure_handling": "fix-or-block"
        },
        {
          "command": "node tools/ci/write-platform-report.mjs --self-test",
          "exit_code": 0,
          "stdout": "platform report self-test passed\n",
          "stderr": "",
          "id": "CMD-REPORT-SELFTEST",
          "core": true,
          "failure_handling": "fix-or-block"
        }
      ],
      "providers": {},
      "feature": "2026-07-24-cross-platform-ci-baseline",
      "inputs": {
        "checklist": ".codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml"
      },
      "input_digests": {
        "checklist": "c159dc10798551f0611f4edd928119e41aa981e838b659426cba714b702bcfc0"
      },
      "kind": "executable"
    }
  ],
  "warnings": [
    "cleanliness marker TODO in .codestable/features/2026-07-24-cross-platform-ci-baseline/cross-platform-ci-baseline-checklist.yaml"
  ],
  "blocking": []
}
```

## 8. Remote Evidence (F4-REMOTE-001)

- Same-run green: https://github.com/gchigoo/repo-nav/actions/runs/30323465951 SHA `865fcf09ff4fc7f2c2f8dc32fe0c10147ef321df`
- Ruleset: `main-cross-platform-required` id `19864943`, required check `cross-platform-required`
- Negative PR #1: mergeStateStatus=BLOCKED (closed)
- Feature PR #2: https://github.com/gchigoo/repo-nav/pull/2
- Artifacts under `remote-evidence/`
- Authorization: `approval-report.md#f4-remote-ci-evidence` approved
- CMD-WORKFLOW-YAML: 使用等价 `tools/ci/validate-workflow-yaml.mjs`（yaml CLI 仅支持 stdin）

