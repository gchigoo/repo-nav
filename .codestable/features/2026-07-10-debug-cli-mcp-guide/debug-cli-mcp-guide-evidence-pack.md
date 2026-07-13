---
doc_type: feature-evidence-pack
feature: 2026-07-10-debug-cli-mcp-guide
status: generated
---

# 2026-07-10-debug-cli-mcp-guide evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-design.md`
- Checklist: `.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-checklist.yaml`

## 2. DoD Results

```json
{
  "gate_id": "dod-runner",
  "stage": "qa.after_review",
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
      "command": "npm test -- --group debug-cli-shell --group debug-cli-lifecycle",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group debug-cli-shell --group debug-cli-lifecycle\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests | 3 skipped) 8ms\n\n Test Files  1 passed | 17 skipped (18)\n      Tests  7 passed | 161 skipped (168)\n   Start at  19:32:35\n   Duration  1.19s (transform 2.17s, setup 0ms, import 9.30s, tests 8ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-SHELL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group debug-cli-locate",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group debug-cli-locate\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests | 9 skipped) 6ms\n\n Test Files  1 passed | 17 skipped (18)\n      Tests  1 passed | 167 skipped (168)\n   Start at  19:32:37\n   Duration  1.21s (transform 1.97s, setup 0ms, import 9.09s, tests 6ms, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-LOCATE",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group debug-cli-probe --group debug-cli-golden",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group debug-cli-probe --group debug-cli-golden\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests | 8 skipped) 9ms\n\n Test Files  1 passed | 17 skipped (18)\n      Tests  2 passed | 166 skipped (168)\n   Start at  19:32:39\n   Duration  1.23s (transform 1.95s, setup 0ms, import 9.20s, tests 9ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-DIAG",
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
      "command": "npm run build && npm run typecheck && npm test && npm run test:golden -- --all && npm run test:mcp -- --all && npm run test:docs",
      "exit_code": 0,
      "stdout": "ect child and descendant when stderr exactly reaches its cap  977ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3093ms\n\n Test Files  18 passed (18)\n      Tests  168 passed (168)\n   Start at  19:32:57\n   Duration  8.90s (transform 2.01s, setup 0ms, import 9.74s, tests 14.22s, environment 3ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 26ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 60ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 85ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 125ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 98ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 163ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 169ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 221ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 832ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  449ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1393ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1391ms\n\n Test Files  11 passed (11)\n      Tests  64 passed | 1 skipped (65)\n   Start at  19:33:07\n   Duration  2.21s (transform 1.06s, setup 0ms, import 6.72s, tests 3.17s, environment 1ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 2ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 235ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1019ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1017ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1075ms\n     ✓ returns confirmed and bounded candidates with transport parity  1074ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1084ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1083ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1917ms\n     ✓ returns one confirmed mapping through real stdio  1071ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  844ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2857ms\n     ✓ does not lose cancellation sent before the handler starts work  1174ms\n     ✓ propagates the SDK request signal to the application service  880ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  801ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 4083ms\n     ✓ maps schema-invalid objects to typed parity output  1075ms\n     ✓ preserves the typed code while sanitizing unsafe detail  836ms\n     ✓ preserves the typed code while sanitizing unsafe detail  736ms\n     ✓ turns thrown failures into safe typed parity output  1433ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 10079ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  693ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  521ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  497ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1250ms\n     ✓ fails when the real context close marker is deliberately skipped  1148ms\n     ✓ fails when an actual descendant tree is deliberately left running  2710ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  2515ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  704ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  19:33:14\n   Duration  11.56s (transform 1.07s, setup 0ms, import 6.28s, tests 22.35s, environment 1ms)\n\n\n> repo-nav@0.1.0 test:docs\n> npm run build --silent && tsx testkit/docs/docs-smoke-runner.ts\n\nDocs smoke passed: test-artifacts/docs/docs-smoke-v1.json\n",
      "stderr": "",
      "id": "CMD-ALL",
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

Design bytes: 11419
Checklist bytes: 4499

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
  "stage": "acceptance.before_done",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "changed_files": [
        ".codestable/architecture/ARCHITECTURE.md",
        ".codestable/architecture/system-repo-nav-foundation.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-checklist.yaml",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-dod-contract-results.json",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-tool-schema.json",
        ".codestable/requirements/source-of-truth-evidence.md",
        ".codestable/roadmap/repo-nav-mvp/goal-features/debug-cli-mcp-guide.md",
        ".codestable/roadmap/repo-nav-mvp/goal-plan.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        "package.json",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/locate-tool-schema.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        "tsconfig.json",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/aggregate-verification.log",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/cli-command-matrix.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/cli-lifecycle-report.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-acceptance.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-evidence-pack.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-implementation.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-qa.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-review-packet.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-review.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/docs-drift-report.md",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/implementation-scope.txt",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/import-graph-report.md",
        "docs/acceptance/mvp.md",
        "docs/debug-cli.md",
        "docs/getting-started-mcp.md",
        "docs/reference/repo-nav-locate.md",
        "test/unit/debug-cli-shell.spec.ts",
        "testkit/docs/cli-open-stdin-child.ts",
        "testkit/docs/docs-smoke-runner.ts",
        "testkit/docs/print-schema-reference.ts",
        "testkit/docs/schema-reference.ts",
        "tools/cli/contracts.ts",
        "tools/cli/execute.ts",
        "tools/cli/main.ts",
        "tools/cli/parser.ts",
        "tsconfig.cli.json"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-dod-results.json",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-evidence-pack-results.json",
        ".codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-gate-results.json",
        ".codestable/roadmap/repo-nav-mvp/goal-consistency-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-debug-cli-mcp-guide",
        "package.json",
        "tsconfig.json",
        "tsconfig.cli.json",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/locate-tool-schema.ts",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-tool-schema.json",
        "tools/cli",
        "test/unit/debug-cli-shell.spec.ts",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/docs",
        "docs/getting-started-mcp.md",
        "docs/debug-cli.md",
        "docs/reference/repo-nav-locate.md",
        "docs/acceptance/mvp.md",
        ".codestable/roadmap/repo-nav-mvp",
        ".codestable/architecture",
        ".codestable/requirements/source-of-truth-evidence.md"
      ],
      "collection": "git status --porcelain -uall via argv-safe Windows runner"
    }
  ],
  "providers": {}
}
```
