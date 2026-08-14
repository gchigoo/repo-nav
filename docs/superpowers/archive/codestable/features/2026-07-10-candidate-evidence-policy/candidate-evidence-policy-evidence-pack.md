---
doc_type: feature-evidence-pack
feature: 2026-07-10-candidate-evidence-policy
status: generated
---

# 2026-07-10-candidate-evidence-policy evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-design.md`
- Checklist: `.codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-checklist.yaml`

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
      "command": "npm test -- --group candidate-truth-table --group candidate-discovery --group candidate-context --case secondary-backend-provenance-table",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group candidate-truth-table --group candidate-discovery --group candidate-context --case secondary-backend-provenance-table\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/candidate-policy.spec.ts (37 tests | 8 skipped) 80ms\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 11 skipped (12)\n      Tests  29 passed | 94 skipped (123)\n   Start at  16:10:03\n   Duration  867ms (transform 870ms, setup 0ms, import 4.34s, tests 80ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-TRUTH",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group candidate-classification --case discovery-key-mutual-exclusion",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group candidate-classification --case discovery-key-mutual-exclusion\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/candidate-policy.spec.ts (37 tests | 35 skipped) 19ms\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 11 skipped (12)\n      Tests  2 passed | 121 skipped (123)\n   Start at  16:10:05\n   Duration  1.19s (transform 1.14s, setup 0ms, import 6.24s, tests 19ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-EXCLUSIVE",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group candidate-budget --group candidate-permutation",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group candidate-budget --group candidate-permutation\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ✓ test/unit/candidate-policy.spec.ts (37 tests | 31 skipped) 49ms\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n\n Test Files  1 passed | 11 skipped (12)\n      Tests  6 passed | 117 skipped (123)\n   Start at  16:10:07\n   Duration  1.11s (transform 1.14s, setup 0ms, import 5.59s, tests 49ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-BUDGET",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case sibling-candidate --case alias-candidate --case sibling-false-positive && npm run test:mcp -- --case candidate-minimal-loop",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case sibling-candidate --case alias-candidate --case sibling-false-positive\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 65ms\n\n Test Files  1 passed | 4 skipped (5)\n      Tests  3 passed | 26 skipped (29)\n   Start at  16:10:09\n   Duration  812ms (transform 427ms, setup 0ms, import 2.46s, tests 65ms, environment 0ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --case candidate-minimal-loop\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/mcp/request-cancellation.spec.ts (3 tests | 3 skipped)\n ↓ test/mcp/tool-error-parity.spec.ts (4 tests | 4 skipped)\n ↓ test/mcp/tool-output-parity.spec.ts (2 tests | 2 skipped)\n ↓ test/mcp/tool-surface.spec.ts (8 tests | 8 skipped)\n ↓ test/mcp/lifecycle-contract.spec.ts (12 tests | 12 skipped)\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 750ms\n     ✓ returns confirmed and bounded candidates with transport parity  748ms\n\n Test Files  1 passed | 6 skipped (7)\n      Tests  1 passed | 30 skipped (31)\n   Start at  16:10:12\n   Duration  1.49s (transform 663ms, setup 0ms, import 4.16s, tests 750ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-LOOP",
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

Design bytes: 14388
Checklist bytes: 4408

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
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-checklist.yaml",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-design.md",
        ".codestable/roadmap/repo-nav-mvp/goal-features/candidate-evidence-policy.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        "src/contracts/ports.ts",
        "src/evidence/direct-mapping-classifier.ts",
        "src/evidence/repository-evidence-engine.ts",
        "src/index.ts",
        "src/repository/node-repository-reader.ts",
        "test/unit/di.spec.ts",
        "test/unit/direct-mapping-classifier.spec.ts",
        "test/unit/evidence-merge.spec.ts",
        "test/unit/repository-reader.spec.ts",
        "testkit/fixtures/mcp/fixture-evidence.service.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-acceptance.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-evidence-pack.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-implementation.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-minimal-loop-report.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-permutation-report.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-qa.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-review-packet.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-review.md",
        ".codestable/features/2026-07-10-candidate-evidence-policy/implementation-scope.txt",
        "src/evidence/candidate-policy.ts",
        "test/golden/candidate-policy.spec.ts",
        "test/mcp/candidate-minimal-loop.spec.ts",
        "test/unit/candidate-policy.spec.ts",
        "testkit/fixtures/candidate-policy/candidate-fixture-backend.ts",
        "testkit/fixtures/candidate-policy/server/alpha.fixture",
        "testkit/fixtures/candidate-policy/server/exclusive.fixture",
        "testkit/fixtures/candidate-policy/server/mapping.fixture",
        "testkit/fixtures/candidate-policy/server/zeta.fixture",
        "testkit/manifests/golden/alias-candidate.yaml",
        "testkit/manifests/golden/sibling-candidate.yaml",
        "testkit/manifests/golden/sibling-false-positive.yaml"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-dod-results.json",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-evidence-pack-results.json",
        ".codestable/features/2026-07-10-candidate-evidence-policy/candidate-evidence-policy-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-candidate-evidence-policy",
        "src/contracts",
        "src/evidence",
        "src/repository",
        "src/index.ts",
        "test/unit",
        "test/golden",
        "test/mcp",
        "testkit/contracts",
        "testkit/fixtures/candidate-policy",
        "testkit/fixtures/mcp",
        "testkit/manifests/golden",
        "testkit/runners",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/candidate-evidence-policy.md",
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
