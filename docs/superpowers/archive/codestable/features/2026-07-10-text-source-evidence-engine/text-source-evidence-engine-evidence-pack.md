---
doc_type: feature-evidence-pack
feature: 2026-07-10-text-source-evidence-engine
status: generated
---

# 2026-07-10-text-source-evidence-engine evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-design.md`
- Checklist: `.codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-checklist.yaml`

## 2. DoD Results

```json
{
  "gate_id": "dod-runner",
  "stage": "acceptance",
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
      "command": "npm test -- --group ripgrep-backend",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group ripgrep-backend\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/repository-reader.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 63ms\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  6 passed | 78 skipped (84)\n   Start at  13:27:55\n   Duration  837ms (transform 753ms, setup 0ms, import 3.99s, tests 63ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ADAPTER",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group evidence-merge",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group evidence-merge\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 17ms\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  6 passed | 78 skipped (84)\n   Start at  13:27:57\n   Duration  855ms (transform 727ms, setup 0ms, import 4.34s, tests 17ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-MERGE",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group direct-mapping-classifier --group evidence-id-order && npm run test:golden -- --case source-field-mapping --case false-confirmation-decoys --case exclusion-summary",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group direct-mapping-classifier --group evidence-id-order\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 74ms\n ↓ test/unit/repository-reader.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  34 passed | 50 skipped (84)\n   Start at  13:27:59\n   Duration  995ms (transform 983ms, setup 0ms, import 5.13s, tests 74ms, environment 2ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case source-field-mapping --case false-confirmation-decoys --case exclusion-summary\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 40ms\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 3 skipped (4)\n      Tests  5 passed | 21 skipped (26)\n   Start at  13:28:00\n   Duration  773ms (transform 316ms, setup 0ms, import 1.56s, tests 40ms, environment 0ms)\n\n",
      "stderr": "",
      "id": "CMD-CLASSIFY",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case text-engine-baseline --case ripgrep-unavailable --case ripgrep-failed --case ripgrep-incomplete --case ripgrep-timeout",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case text-engine-baseline --case ripgrep-unavailable --case ripgrep-failed --case ripgrep-incomplete --case ripgrep-timeout\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 242ms\n\n Test Files  1 passed | 3 skipped (4)\n      Tests  14 passed | 12 skipped (26)\n   Start at  13:28:02\n   Duration  1.04s (transform 309ms, setup 0ms, import 1.48s, tests 242ms, environment 0ms)\n\n",
      "stderr": "",
      "id": "CMD-BASELINE",
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

Design bytes: 12483
Checklist bytes: 4343

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
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        "src/contracts/request.ts",
        "src/evidence/evidence.module.ts",
        "src/evidence/unconfigured-repository-evidence.service.ts",
        "src/index.ts",
        "src/repository/repository-backends.module.ts",
        "src/runtime/repo-nav-bootstrap-incomplete.error.ts",
        "test/unit/di.spec.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-text-source-evidence-engine/implementation-scope.txt",
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-evidence-pack.md",
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-implementation.md",
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-review.md",
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-step-1-fix.md",
        "src/evidence/direct-mapping-classifier.ts",
        "src/evidence/discovery-record.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/repository/ripgrep-backend.ts",
        "test/golden/text-engine-classifier.spec.ts",
        "test/golden/text-evidence-engine.spec.ts",
        "test/unit/direct-mapping-classifier.spec.ts",
        "test/unit/evidence-merge.spec.ts",
        "test/unit/ripgrep-backend.spec.ts",
        "testkit/fixtures/ripgrep/malformed-v15.jsonl",
        "testkit/fixtures/ripgrep/match-v15.jsonl",
        "testkit/fixtures/text-engine/client/outside.fixture",
        "testkit/fixtures/text-engine/docs/example.md",
        "testkit/fixtures/text-engine/server/decoys.fixture",
        "testkit/fixtures/text-engine/server/mapping.fixture",
        "testkit/fixtures/text-engine/server/multi-symbol.fixture",
        "testkit/fixtures/text-engine/server/multiline.fixture",
        "testkit/fixtures/text-engine/server/negative.fixture",
        "testkit/fixtures/text-engine/server/window-12.fixture",
        "testkit/fixtures/text-engine/server/window-13.fixture",
        "testkit/fixtures/text-engine/server/window-4096.fixture",
        "testkit/fixtures/text-engine/server/window-4097.fixture",
        "testkit/fixtures/text-engine/tests/mapping.spec.fixture",
        "testkit/manifests/golden/exclusion-summary.yaml",
        "testkit/manifests/golden/false-confirmation-decoys.yaml",
        "testkit/manifests/golden/ripgrep-failed.yaml",
        "testkit/manifests/golden/ripgrep-incomplete.yaml",
        "testkit/manifests/golden/ripgrep-timeout.yaml",
        "testkit/manifests/golden/ripgrep-unavailable.yaml",
        "testkit/manifests/golden/source-field-mapping.yaml",
        "testkit/manifests/golden/text-engine-baseline.yaml"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-dod-results.json",
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-evidence-pack-results.json",
        ".codestable/features/2026-07-10-text-source-evidence-engine/text-source-evidence-engine-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-text-source-evidence-engine",
        "src/contracts",
        "src/evidence",
        "src/repository",
        "src/runtime",
        "src/index.ts",
        "test/unit",
        "test/golden",
        "testkit/fixtures/ripgrep",
        "testkit/fixtures/text-engine",
        "testkit/manifests/golden",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml"
      ]
    }
  ],
  "providers": {}
}
```
