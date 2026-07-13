---
doc_type: feature-evidence-pack
feature: 2026-07-10-codegraph-fallback-orchestration
status: generated
---

# 2026-07-10-codegraph-fallback-orchestration evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-design.md`
- Checklist: `.codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-checklist.yaml`

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
      "command": "npm test -- --group codegraph-probe --group codegraph-parser",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group codegraph-probe --group codegraph-parser\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 13ms\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 14 skipped (15)\n      Tests  8 passed | 130 skipped (138)\n   Start at  16:51:41\n   Duration  936ms (transform 1.17s, setup 0ms, import 6.05s, tests 13ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-PARSER",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group codegraph-query-plan",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group codegraph-query-plan\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 13ms\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 14 skipped (15)\n      Tests  6 passed | 132 skipped (138)\n   Start at  16:51:43\n   Duration  981ms (transform 1.25s, setup 0ms, import 6.42s, tests 13ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-PLAN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case codegraph-missing --case codegraph-no-result --case codegraph-failed --case codegraph-incomplete --case codegraph-global-abort-no-fallback --case codegraph-local-timeout-fallback --case codegraph-hit-unverified --case codegraph-symbol-complete-no-fallback --case codegraph-secondary-provenance-table --case backend-unavailable",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case codegraph-missing --case codegraph-no-result --case codegraph-failed --case codegraph-incomplete --case codegraph-global-abort-no-fallback --case codegraph-local-timeout-fallback --case codegraph-hit-unverified --case codegraph-symbol-complete-no-fallback --case codegraph-secondary-provenance-table --case backend-unavailable\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 89ms\n\n Test Files  1 passed | 5 skipped (6)\n      Tests  11 passed | 29 skipped (40)\n   Start at  16:51:45\n   Duration  791ms (transform 437ms, setup 0ms, import 2.74s, tests 89ms, environment 0ms)\n\n",
      "stderr": "",
      "id": "CMD-FALLBACK",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group codegraph-live-smoke --case indexed-temp-repo",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group codegraph-live-smoke --case indexed-temp-repo\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 4940ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  4938ms\n\n Test Files  1 passed | 14 skipped (15)\n      Tests  1 passed | 137 skipped (138)\n   Start at  16:51:46\n   Duration  5.65s (transform 1.24s, setup 0ms, import 6.17s, tests 4.94s, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-SMOKE",
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

Design bytes: 13902
Checklist bytes: 4669

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
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/codegraph-fallback-orchestration.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        "src/contracts/ports.ts",
        "src/evidence/direct-mapping-classifier.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/index.ts",
        "src/repository/repository-backends.module.ts",
        "test/unit/di.spec.ts",
        "test/unit/ripgrep-backend.spec.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-acceptance.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-evidence-pack.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-implementation.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-qa.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-review-packet.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-review.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-health-mapping-report.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-live-smoke-record.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-query-plan-report.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-transition-report.md",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/implementation-scope.txt",
        "src/repository/codegraph-backend.ts",
        "src/repository/codegraph-command.ts",
        "src/repository/codegraph-json.ts",
        "src/repository/codegraph-query-planner.ts",
        "test/golden/codegraph-fallback.spec.ts",
        "test/unit/codegraph-backend.spec.ts",
        "test/unit/codegraph-live-smoke.spec.ts",
        "test/unit/codegraph-query-planner.spec.ts",
        "testkit/fixtures/codegraph/codegraph-transition-backend.ts",
        "testkit/fixtures/codegraph/query-v1.1.6.json",
        "testkit/fixtures/codegraph/repository/server/definition.ts",
        "testkit/fixtures/codegraph/repository/server/mapping.ts",
        "testkit/fixtures/codegraph/repository/server/merged.ts",
        "testkit/fixtures/codegraph/repository/server/primary.ts",
        "testkit/fixtures/codegraph/repository/server/secondary.ts",
        "testkit/fixtures/codegraph/repository/server/unverified.ts",
        "testkit/fixtures/codegraph/status-v1.1.6-clean.json",
        "testkit/fixtures/codegraph/status-v1.1.6-missing.json",
        "testkit/fixtures/codegraph/status-v1.1.6-stale.json",
        "testkit/manifests/golden/backend-unavailable.yaml",
        "testkit/manifests/golden/codegraph-failed.yaml",
        "testkit/manifests/golden/codegraph-global-abort-no-fallback.yaml",
        "testkit/manifests/golden/codegraph-hit-unverified.yaml",
        "testkit/manifests/golden/codegraph-incomplete.yaml",
        "testkit/manifests/golden/codegraph-local-timeout-fallback.yaml",
        "testkit/manifests/golden/codegraph-missing.yaml",
        "testkit/manifests/golden/codegraph-no-result.yaml",
        "testkit/manifests/golden/codegraph-secondary-provenance-table.yaml",
        "testkit/manifests/golden/codegraph-symbol-complete-no-fallback.yaml"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-dod-results.json",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-evidence-pack-results.json",
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration/codegraph-fallback-orchestration-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-codegraph-fallback-orchestration",
        "src/contracts",
        "src/evidence",
        "src/repository",
        "src/index.ts",
        "test/unit",
        "test/golden",
        "test/mcp",
        "testkit/contracts",
        "testkit/fixtures/codegraph",
        "testkit/fixtures/mcp",
        "testkit/manifests/golden",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/codegraph-fallback-orchestration.md",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        ".codestable/architecture/ARCHITECTURE.md",
        ".codestable/architecture/system-repo-nav-foundation.md"
      ]
    }
  ],
  "providers": {}
}
```
