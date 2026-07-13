---
doc_type: feature-evidence-pack
feature: 2026-07-10-mcp-locate-surface
status: generated
---

# 2026-07-10-mcp-locate-surface evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-design.md`
- Checklist: `.codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-checklist.yaml`

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
      "command": "npm run test:mcp -- --case initialize-tools-capability --case tool-list-schema --case single-tool-readonly --case unknown-tool-jsonrpc-boundary",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case initialize-tools-capability --case tool-list-schema --case single-tool-readonly --case unknown-tool-jsonrpc-boundary\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests | 1 skipped) 115ms\n\n Test Files  1 passed | 5 skipped (6)\n      Tests  7 passed | 23 skipped (30)\n   Start at  14:39:57\n   Duration  1.29s (transform 620ms, setup 0ms, import 3.66s, tests 115ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-SCHEMA",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case source-field-mapping --case recoverable-status-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case source-field-mapping --case recoverable-status-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1751ms\n     ✓ returns one confirmed mapping through real stdio  914ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  835ms\n\n Test Files  1 passed | 5 skipped (6)\n      Tests  2 passed | 28 skipped (30)\n   Start at  14:40:01\n   Duration  2.60s (transform 694ms, setup 0ms, import 4.23s, tests 1.75s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-SUCCESS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests | 7 skipped) 15ms\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 2789ms\n     ✓ maps schema-invalid objects to typed parity output  783ms\n     ✓ preserves the typed code while sanitizing unsafe detail  693ms\n     ✓ preserves the typed code while sanitizing unsafe detail  649ms\n     ✓ turns thrown failures into safe typed parity output  662ms\n\n Test Files  2 passed | 4 skipped (6)\n      Tests  5 passed | 25 skipped (30)\n   Start at  14:40:07\n   Duration  3.45s (transform 546ms, setup 0ms, import 3.40s, tests 2.80s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ERROR",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case request-cancellation-cleanup --case stdio-clean-output --case stdio-graceful-shutdown",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case request-cancellation-cleanup --case stdio-clean-output --case stdio-graceful-shutdown\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ✓ test/mcp/lifecycle-contract.spec.ts (12 tests | 1 skipped) 1490ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  476ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  485ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  506ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2519ms\n     ✓ does not lose cancellation sent before the handler starts work  901ms\n     ✓ propagates the SDK request signal to the application service  817ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  799ms\n\n Test Files  2 passed | 4 skipped (6)\n      Tests  14 passed | 16 skipped (30)\n   Start at  14:40:14\n   Duration  3.25s (transform 670ms, setup 0ms, import 3.48s, tests 4.01s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-LIFECYCLE",
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

Design bytes: 11502
Checklist bytes: 4584

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
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        "package-lock.json",
        "package.json",
        "src/app/app.module.ts",
        "src/contracts/evidence.ts",
        "src/index.ts",
        "test/mcp/lifecycle-contract.spec.ts",
        "test/unit/di.spec.ts",
        "testkit/contracts/index.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-mcp-locate-surface/implementation-scope.txt",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-acceptance.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-evidence-pack.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-implementation.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-lifecycle-report.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-qa.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-review.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-step-2-fix.md",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-tool-schema.json",
        "src/main.ts",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/locate-tool-schema.ts",
        "src/mcp/mcp-shutdown-coordinator.ts",
        "src/mcp/mcp-stdio-host.ts",
        "src/mcp/mcp.module.ts",
        "src/mcp/repo-nav-mcp-server.ts",
        "test/mcp/request-cancellation.spec.ts",
        "test/mcp/tool-error-parity.spec.ts",
        "test/mcp/tool-output-parity.spec.ts",
        "test/mcp/tool-surface.spec.ts",
        "testkit/contracts/mcp-stdio-harness.ts",
        "testkit/contracts/mcp-tool-result.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/fixtures/mcp/repo-nav-mcp-fixture.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-dod-results.json",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-evidence-pack-results.json",
        ".codestable/features/2026-07-10-mcp-locate-surface/mcp-locate-surface-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-mcp-locate-surface",
        "package.json",
        "package-lock.json",
        "src/app",
        "src/contracts",
        "src/mcp",
        "src/runtime",
        "src/main.ts",
        "src/index.ts",
        "test/mcp",
        "test/unit",
        "testkit/contracts",
        "testkit/fixtures/mcp",
        "testkit/manifests/mcp",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml"
      ]
    }
  ],
  "providers": {}
}
```
