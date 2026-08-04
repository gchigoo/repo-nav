---
doc_type: feature-evidence-pack
feature: 2026-07-10-mvp-golden-regression-suite
status: generated
---

# 2026-07-10-mvp-golden-regression-suite evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-design.md`
- Checklist: `.codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml`

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
      "command": "npm run test:golden -- --case manifest-evaluator --case evaluator-negative-self-test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case manifest-evaluator --case evaluator-negative-self-test\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 54ms\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  8 passed | 57 skipped (65)\n   Start at  18:51:46\n   Duration  903ms (transform 1.14s, setup 0ms, import 6.20s, tests 54ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-EVALUATOR",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group classification --group candidate --group backend-transitions --group security --group final-status",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group classification --group candidate --group backend-transitions --group security --group final-status\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 27ms\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 43ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 63ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 87ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 114ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 278ms\n\n Test Files  6 passed | 5 skipped (11)\n      Tests  46 passed | 19 skipped (65)\n   Start at  18:51:48\n   Duration  1.15s (transform 987ms, setup 0ms, import 5.81s, tests 612ms, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-FAMILIES",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --group protocol --group lifecycle",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --group protocol --group lifecycle\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/mcp/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 207ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 980ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  979ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1019ms\n     ✓ returns confirmed and bounded candidates with transport parity  1018ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1021ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1019ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1731ms\n     ✓ returns one confirmed mapping through real stdio  986ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  743ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2615ms\n     ✓ does not lose cancellation sent before the handler starts work  1097ms\n     ✓ propagates the SDK request signal to the application service  791ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  725ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3771ms\n     ✓ maps schema-invalid objects to typed parity output  999ms\n     ✓ preserves the typed code while sanitizing unsafe detail  737ms\n     ✓ preserves the typed code while sanitizing unsafe detail  701ms\n     ✓ turns thrown failures into safe typed parity output  1333ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests | 1 skipped) 9777ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  589ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  476ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  459ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1171ms\n     ✓ fails when the real context close marker is deliberately skipped  1133ms\n     ✓ fails when an actual descendant tree is deliberately left running  2717ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  2515ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  694ms\n\n Test Files  8 passed | 1 skipped (9)\n      Tests  37 passed | 2 skipped (39)\n   Start at  18:51:52\n   Duration  11.15s (transform 977ms, setup 0ms, import 5.71s, tests 21.12s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-MCP",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case fixture-completeness && npm run test:golden -- --all && npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "s (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/fixture-completeness.spec.ts (3 tests | 1 skipped) 82ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  2 passed | 63 skipped (65)\n   Start at  18:52:04\n   Duration  956ms (transform 1.09s, setup 0ms, import 6.48s, tests 82ms, environment 1ms)\n\n\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 2ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 28ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 63ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 74ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 93ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 121ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 146ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 160ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 200ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 635ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  305ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1211ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1209ms\n\n Test Files  11 passed (11)\n      Tests  64 passed | 1 skipped (65)\n   Start at  18:52:06\n   Duration  2.01s (transform 1.07s, setup 0ms, import 6.42s, tests 2.73s, environment 1ms)\n\n\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 3ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 189ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 973ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  971ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 998ms\n     ✓ feeds both success and error transport observations to the shared evaluator  996ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1047ms\n     ✓ returns confirmed and bounded candidates with transport parity  1046ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 1760ms\n     ✓ returns one confirmed mapping through real stdio  992ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  766ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 2644ms\n     ✓ does not lose cancellation sent before the handler starts work  1102ms\n     ✓ propagates the SDK request signal to the application service  800ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  740ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 3864ms\n     ✓ maps schema-invalid objects to typed parity output  990ms\n     ✓ preserves the typed code while sanitizing unsafe detail  750ms\n     ✓ preserves the typed code while sanitizing unsafe detail  712ms\n     ✓ turns thrown failures into safe typed parity output  1411ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 9909ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  588ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  466ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  458ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1239ms\n     ✓ fails when the real context close marker is deliberately skipped  1124ms\n     ✓ fails when an actual descendant tree is deliberately left running  2751ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  2533ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  703ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  18:52:10\n   Duration  11.32s (transform 1.05s, setup 0ms, import 5.82s, tests 21.39s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --case large-synthetic-repository --report-performance",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --case large-synthetic-repository --report-performance\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-mvp\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 1081ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  1079ms\n\n Test Files  1 passed | 10 skipped (11)\n      Tests  1 passed | 64 skipped (65)\n   Start at  18:52:23\n   Duration  1.89s (transform 1.04s, setup 0ms, import 6.30s, tests 1.08s, environment 1ms)\n\n",
      "stderr": "",
      "id": "CMD-PERF",
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

Design bytes: 13967
Checklist bytes: 5204

### Artifact Inventory

- Shared verification contract: `testkit/contracts/golden-evaluator.ts`, `golden-projection.ts`, `fixture-completeness.ts`, `fixture-coverage-probes.ts`。
- Reviewed truth inputs: 23 success manifests + 23 exact companion snapshots、1 error manifest、`fixture-ownership.yaml` 与 family reports。
- MCP lifecycle: production stdio cases + `shutdown-cleanup-probe.yaml` + real Nest/host/process-tree probe；含 context/child、timeout/nonzero fault cleanup evidence。
- Synthetic baseline: fixed 1,000 files / 50 modules / 10 mappings / 200 named decoys；committed baseline 在 `testkit/baselines/performance/`，runtime report 在 gitignored `test-artifacts/performance/`。
- Fresh regression evidence: DoD runner 7/7、158/158 unit、64 active Golden + 1 conditional skip、39/39 MCP、scope gate 与 cleanliness scan passed。
- Review evidence: independent native-agent round 3 passed；review packet 与最终 review report 均位于本 feature 目录。

## 5. Residual Risks

- Synthetic timing 仅代表当前 Windows / Node / ripgrep 环境的趋势，不是 monorepo SLA；correctness blocking，timing delta non-blocking。
- `archguard` / `meta-cc` provider 当前不可用；本 feature 无 production `src` 语义改动，由 exact diff、full unit/Golden/MCP 与独立 review 替代。
- 生命周期 PID 文件若在外层进程异常退出时恰好截断，可能无法恢复 PID；正常、timeout、nonzero 与 deliberate leak 路径均已实测清理，剩余窗口为低概率 residual risk。

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
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-checklist.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".gitignore",
        "test/mcp/lifecycle-contract.spec.ts",
        "testkit/contracts/golden-evaluator.ts",
        "testkit/contracts/index.ts",
        "testkit/contracts/mcp-lifecycle-case.ts",
        "testkit/contracts/mcp-lifecycle-harness.ts",
        "testkit/contracts/mcp-tool-result.ts",
        "testkit/manifests/golden/alias-candidate.yaml",
        "testkit/manifests/golden/false-confirmation-decoys.yaml",
        "testkit/manifests/golden/sibling-candidate.yaml",
        "testkit/manifests/golden/sibling-false-positive.yaml",
        "testkit/runners/run-vitest-surface.ts",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/companion-snapshot-inventory.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/evaluator-mutation-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-completeness-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/fixture-family-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/implementation-scope.txt",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/lifecycle-report.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-implementation.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-review-packet.md",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/performance-baseline-report.md",
        "test/golden/fixture-completeness.spec.ts",
        "test/golden/large-synthetic-repository.spec.ts",
        "test/golden/mvp-evaluator.spec.ts",
        "test/golden/mvp-regression-families.spec.ts",
        "test/mcp/mcp-golden-adapter.spec.ts",
        "testkit/baselines/performance/large-synthetic-repository-v1.json",
        "testkit/contracts/evidence-pack-field-contract.ts",
        "testkit/contracts/fixture-completeness.ts",
        "testkit/contracts/fixture-coverage-probes.ts",
        "testkit/contracts/golden-projection.ts",
        "testkit/expected/alias-candidate.json",
        "testkit/expected/backend-unavailable.json",
        "testkit/expected/codegraph-failed.json",
        "testkit/expected/codegraph-global-abort-no-fallback.json",
        "testkit/expected/codegraph-hit-unverified.json",
        "testkit/expected/codegraph-incomplete.json",
        "testkit/expected/codegraph-local-timeout-fallback.json",
        "testkit/expected/codegraph-missing.json",
        "testkit/expected/codegraph-no-result.json",
        "testkit/expected/codegraph-secondary-provenance-table.json",
        "testkit/expected/codegraph-symbol-complete-no-fallback.json",
        "testkit/expected/exclusion-summary.json",
        "testkit/expected/false-confirmation-decoys.json",
        "testkit/expected/foundation-success.json",
        "testkit/expected/mcp-source-field-mapping.json",
        "testkit/expected/ripgrep-failed.json",
        "testkit/expected/ripgrep-incomplete.json",
        "testkit/expected/ripgrep-timeout.json",
        "testkit/expected/ripgrep-unavailable.json",
        "testkit/expected/sibling-candidate.json",
        "testkit/expected/sibling-false-positive.json",
        "testkit/expected/source-field-mapping.json",
        "testkit/expected/text-engine-baseline.json",
        "testkit/fixtures/mcp/lifecycle-probe.ts",
        "testkit/manifests/golden/mcp-source-field-mapping.yaml",
        "testkit/manifests/mcp/shutdown-cleanup-probe.yaml",
        "testkit/manifests/performance/large-synthetic-repository-v1.yaml",
        "testkit/performance/large-synthetic-repository.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-dod-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-evidence-pack-results.json",
        ".codestable/features/2026-07-10-mvp-golden-regression-suite/mvp-golden-regression-suite-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-10-mvp-golden-regression-suite",
        "test/golden",
        "test/mcp",
        "test/unit",
        "testkit/contracts",
        "testkit/expected",
        "testkit/fixtures",
        "testkit/manifests",
        "testkit/performance",
        "testkit/runners",
        "testkit/testing",
        "testkit/baselines",
        "test-artifacts/performance",
        "test-artifacts/completeness",
        "test-artifacts/lifecycle",
        "test-artifacts/families",
        "package.json",
        ".gitignore",
        ".codestable/roadmap/repo-nav-mvp/goal-state.yaml",
        ".codestable/roadmap/repo-nav-mvp/goal-features/mvp-golden-regression-suite.md",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-items.yaml",
        ".codestable/roadmap/repo-nav-mvp/repo-nav-mvp-roadmap.md",
        ".codestable/architecture"
      ]
    }
  ],
  "providers": {}
}
```
