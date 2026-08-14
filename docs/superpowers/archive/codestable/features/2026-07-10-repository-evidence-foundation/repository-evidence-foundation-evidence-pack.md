---
doc_type: feature-evidence-pack
feature: repository-evidence-foundation
status: generated
---

# repository-evidence-foundation evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-design.md`
- Checklist: `.codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-checklist.yaml`

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
      "command": "npm test -- --group runner-smoke --group contract --group di",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group runner-smoke --group contract --group di\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/unit/runner-smoke.spec.ts (1 test) 2ms\n ✓ test/unit/contract.spec.ts (12 tests) 16ms\n ✓ test/unit/di.spec.ts (2 tests) 16ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 364ms\n\n Test Files  4 passed (4)\n      Tests  17 passed (17)\n   Start at  09:25:04\n   Duration  578ms (transform 148ms, setup 0ms, import 796ms, tests 398ms, environment 0ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case runner-smoke --case manifest-schema --case evaluator-smoke",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case runner-smoke --case manifest-schema --case evaluator-smoke\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 2ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 33ms\n\n Test Files  2 passed (2)\n      Tests  6 passed (6)\n   Start at  09:25:06\n   Duration  534ms (transform 89ms, setup 0ms, import 410ms, tests 35ms, environment 0ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case runner-smoke --case lifecycle-manifest-schema",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> tsx testkit/runners/mcp-runner.ts --case runner-smoke --case lifecycle-manifest-schema\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 2ms\n ✓ test/mcp/lifecycle-contract.spec.ts (5 tests) 218ms\n\n Test Files  2 passed (2)\n      Tests  6 passed (6)\n   Start at  09:25:07\n   Duration  696ms (transform 85ms, setup 0ms, import 394ms, tests 220ms, environment 0ms)\n\n",
      "stderr": "",
      "id": "CMD-MCP",
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

Design bytes: 9339
Checklist bytes: 3747

## 5. Residual Risks

- cleanliness marker TODO in .codestable/tools/codestable-scope-gate.py
- cleanliness marker FIXME in .codestable/tools/codestable-scope-gate.py
- cleanliness marker XXX in .codestable/tools/codestable-scope-gate.py

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
  "warnings": [
    "cleanliness marker TODO in .codestable/tools/codestable-scope-gate.py",
    "cleanliness marker FIXME in .codestable/tools/codestable-scope-gate.py",
    "cleanliness marker XXX in .codestable/tools/codestable-scope-gate.py"
  ],
  "evidence": [
    {
      "changed_files": [
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/tools/codestable-scope-gate.py",
        ".codestable/features/2026-07-10-repository-evidence-foundation/implementation-scope.txt",
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-evidence-pack.md",
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-implementation.md",
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-review.md",
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-step-2-fix.md",
        ".gitignore",
        "package-lock.json",
        "package.json",
        "src/app/app.module.ts",
        "src/app/create-application-context.ts",
        "src/contracts/constants.ts",
        "src/contracts/evidence-id.ts",
        "src/contracts/evidence.ts",
        "src/contracts/index.ts",
        "src/contracts/ports.ts",
        "src/contracts/request.ts",
        "src/evidence/evidence.module.ts",
        "src/evidence/unconfigured-repository-evidence.service.ts",
        "src/evidence/unconfigured-repository-reader.ts",
        "src/index.ts",
        "src/repository/repository-backends.module.ts",
        "src/runtime/repo-nav-bootstrap-incomplete.error.ts",
        "src/runtime/tokens.ts",
        "test/golden/golden-contract.spec.ts",
        "test/golden/runner-smoke.spec.ts",
        "test/mcp/lifecycle-contract.spec.ts",
        "test/mcp/runner-smoke.spec.ts",
        "test/unit/contract.spec.ts",
        "test/unit/di.spec.ts",
        "test/unit/runner-smoke.spec.ts",
        "test/unit/scope-gate.spec.ts",
        "testkit/contracts/golden-case.ts",
        "testkit/contracts/golden-evaluator.ts",
        "testkit/contracts/index.ts",
        "testkit/contracts/mcp-lifecycle-case.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/create-testing-module.ts",
        "testkit/fixtures/foundation/mapping.ts",
        "testkit/fixtures/mcp/synthetic-stdio-child.ts",
        "testkit/manifests/golden/manifest-schema-error.yaml",
        "testkit/manifests/golden/manifest-schema-success.yaml",
        "testkit/manifests/mcp/graceful-shutdown.yaml",
        "testkit/manifests/mcp/stdio-clean-output.yaml",
        "testkit/runners/golden-runner.ts",
        "testkit/runners/mcp-runner.ts",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        "testkit/runners/unit-runner.ts",
        "testkit/testing/selection.ts",
        "tsconfig.build.json",
        "tsconfig.json",
        "vitest.config.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-dod-results.json",
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-evidence-pack-results.json",
        ".codestable/features/2026-07-10-repository-evidence-foundation/repository-evidence-foundation-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-repository-evidence-foundation",
        ".gitignore",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "tsconfig.build.json",
        "vitest.config.ts",
        "src",
        "test",
        "testkit",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/tools/codestable-scope-gate.py"
      ]
    }
  ],
  "providers": {}
}
```
