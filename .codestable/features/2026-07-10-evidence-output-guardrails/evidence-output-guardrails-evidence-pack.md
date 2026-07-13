---
doc_type: feature-evidence-pack
feature: 2026-07-10-evidence-output-guardrails
status: generated
---

# 2026-07-10-evidence-output-guardrails evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-design.md`
- Checklist: `.codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml`

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
      "command": "npm test -- --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group locate-status --case transition-matrix-completeness --case hit-unverified-fallback-complete --case hit-unverified-fallback-unavailable --case caller-abort-empty --case caller-abort-with-evidence --case internal-deadline-below-max --case internal-deadline-at-max\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2035ms\n     ✓ distinguishes its own deadline from a caller abort  1005ms\n     ✓ retains verification completed before the abort  1016ms\n\n Test Files  1 passed | 16 skipped (17)\n      Tests  13 passed | 145 skipped (158)\n   Start at  17:52:44\n   Duration  3.03s (transform 1.89s, setup 0ms, import 8.44s, tests 2.03s, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-STATUS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group result-limits --case partial-empty-limit --case partial-with-evidence",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group result-limits --case partial-empty-limit --case partial-with-evidence\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 5 skipped) 23ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  3 passed | 45 skipped (48)\n   Start at  17:52:48\n   Duration  841ms (transform 612ms, setup 0ms, import 3.62s, tests 23ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-LIMITS",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case secret-redaction --case redaction-metadata && npm run test:mcp -- --case redaction-output-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case secret-redaction --case redaction-metadata\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests | 3 skipped) 15ms\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  5 passed | 43 skipped (48)\n   Start at  17:52:50\n   Duration  818ms (transform 581ms, setup 0ms, import 3.30s, tests 15ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case redaction-output-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 685ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  683ms\n\n Test Files  1 passed | 7 skipped (8)\n      Tests  1 passed | 31 skipped (32)\n   Start at  17:52:53\n   Duration  1.38s (transform 823ms, setup 0ms, import 4.83s, tests 685ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-REDACTION",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case invalid-input --case invalid-repo --case path-outside-root --case internal-error-parity\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/candidate-minimal-loop.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/redaction-output-parity.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests | 7 skipped) 13ms\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3318ms\n     ✓ maps schema-invalid objects to typed parity output  687ms\n     ✓ preserves the typed code while sanitizing unsafe detail  665ms\n     ✓ preserves the typed code while sanitizing unsafe detail  657ms\n     ✓ turns thrown failures into safe typed parity output  1307ms\n\n Test Files  2 passed | 6 skipped (8)\n      Tests  5 passed | 27 skipped (32)\n   Start at  17:52:58\n   Duration  3.98s (transform 770ms, setup 0ms, import 4.54s, tests 3.33s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ERRORS",
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

Design bytes: 13771
Checklist bytes: 4815

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
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        "src/contracts/constants.ts",
        "src/contracts/index.ts",
        "src/contracts/request.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/index.ts",
        "src/main.ts",
        "src/mcp/locate-tool-output.ts",
        "src/mcp/mcp-shutdown-coordinator.ts",
        "src/mcp/mcp-stdio-host.ts",
        "test/golden/text-evidence-engine.spec.ts",
        "test/mcp/tool-error-parity.spec.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/manifests/golden/ripgrep-incomplete.yaml",
        "testkit/manifests/golden/ripgrep-timeout.yaml",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-acceptance.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-implementation.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-qa.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review-packet.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-review.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/implementation-scope.txt",
        ".codestable/features/2026-07-10-evidence-output-guardrails/locate-transition-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/redaction-forbidden-scan-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/result-limit-matrix-report.md",
        ".codestable/features/2026-07-10-evidence-output-guardrails/tool-error-parity-report.md",
        "src/contracts/public-errors.ts",
        "src/evidence/abort-source.ts",
        "src/evidence/evidence-redactor.ts",
        "src/evidence/locate-status-evaluator.ts",
        "src/evidence/next-action-policy.ts",
        "src/evidence/result-budget-selector.ts",
        "src/mcp/diagnostic-scrubber.ts",
        "test/golden/output-guardrails.spec.ts",
        "test/mcp/redaction-output-parity.spec.ts",
        "test/unit/locate-status-evaluator.spec.ts",
        "test/unit/output-guardrails.spec.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-dod-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-evidence-pack-results.json",
        ".codestable/features/2026-07-10-evidence-output-guardrails/evidence-output-guardrails-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-evidence-output-guardrails",
        "src/contracts",
        "src/evidence",
        "src/mcp",
        "src/repository",
        "src/index.ts",
        "src/main.ts",
        "test/unit",
        "test/golden",
        "test/mcp",
        "testkit/contracts",
        "testkit/fixtures/output-guardrails",
        "testkit/fixtures/mcp",
        "testkit/manifests/golden",
        "testkit/manifests/mcp",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/evidence-output-guardrails.md",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        ".codestable/architecture"
      ]
    }
  ],
  "providers": {}
}
```
