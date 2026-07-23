---
doc_type: feature-evidence-pack
feature: 2026-07-23-public-output-boundary-v2
status: generated
---

# 2026-07-23-public-output-boundary-v2 evidence pack

## 1. Scope

- Design: `.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design.md`
- Checklist: `.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-checklist.yaml`

## 2. DoD Results

```json
{
  "gate_id": "dod-runner",
  "stage": "implementation.review_fix_5",
  "status": "passed",
  "blocking": [],
  "warnings": [
    "CMD-DOCTOR: non-core command failed with exit 1"
  ],
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
      "command": "npm test -- --group public-output-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (2 tests) 15ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (8 tests) 39ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 34ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 66ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 54ms\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n\n Test Files  5 passed | 18 skipped (23)\n      Tests  46 passed | 168 skipped (214)\n   Start at  14:50:22\n   Duration  1.56s (transform 3.26s, setup 0ms, import 12.97s, tests 208ms, environment 3ms)\n\n",
      "stderr": "",
      "id": "CMD-V2-UNIT",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --group public-output-v2",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --group public-output-v2\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/golden/runner-smoke.spec.ts (1 test | 1 skipped)\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 44ms\n ↓ test/golden/output-guardrails.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/large-synthetic-repository.spec.ts (1 test | 1 skipped)\n ↓ test/golden/fixture-completeness.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/mvp-regression-families.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/mvp-evaluator.spec.ts (8 tests | 8 skipped)\n ↓ test/golden/golden-contract.spec.ts (5 tests | 5 skipped)\n ↓ test/golden/candidate-policy.spec.ts (3 tests | 3 skipped)\n ↓ test/golden/codegraph-fallback.spec.ts (11 tests | 11 skipped)\n ↓ test/golden/text-engine-classifier.spec.ts (6 tests | 6 skipped)\n ↓ test/golden/text-evidence-engine.spec.ts (14 tests | 14 skipped)\n\n Test Files  1 passed | 11 skipped (12)\n      Tests  7 passed | 65 skipped (72)\n   Start at  14:50:25\n   Duration  1.15s (transform 1.65s, setup 0ms, import 8.36s, tests 44ms, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-V2-GOLDEN",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test -- --group public-output-v2 --case no-cutover-import-inventory",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts --group public-output-v2 --case no-cutover-import-inventory\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ↓ test/unit/public-output-v2-redaction.spec.ts (8 tests | 8 skipped)\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (2 tests) 14ms\n ↓ test/unit/public-output-v2-contract.spec.ts (25 tests | 25 skipped)\n ↓ test/unit/public-result-assembler-v2.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests | 4 skipped)\n ↓ test/unit/contract.spec.ts (12 tests | 12 skipped)\n ↓ test/unit/evidence-merge.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/runner-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/direct-mapping-classifier.spec.ts (34 tests | 34 skipped)\n ↓ test/unit/output-guardrails.spec.ts (7 tests | 7 skipped)\n ↓ test/unit/scope-gate.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/process-cleanup.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/repository-reader.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-live-smoke.spec.ts (1 test | 1 skipped)\n ↓ test/unit/codegraph-query-planner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/codegraph-backend.spec.ts (8 tests | 8 skipped)\n ↓ test/unit/repository-safety.spec.ts (5 tests | 5 skipped)\n ↓ test/unit/locate-status-evaluator.spec.ts (13 tests | 13 skipped)\n ↓ test/unit/ripgrep-backend.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/candidate-policy.spec.ts (37 tests | 37 skipped)\n ↓ test/unit/safe-process-runner.spec.ts (6 tests | 6 skipped)\n ↓ test/unit/di.spec.ts (2 tests | 2 skipped)\n ↓ test/unit/debug-cli-shell.spec.ts (10 tests | 10 skipped)\n\n Test Files  1 passed | 22 skipped (23)\n      Tests  2 passed | 212 skipped (214)\n   Start at  14:50:27\n   Duration  1.57s (transform 2.86s, setup 0ms, import 12.78s, tests 14ms, environment 4ms)\n\n",
      "stderr": "",
      "id": "CMD-NOCUTOVER",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm test",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test\n> tsx testkit/runners/unit-runner.ts\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/unit/public-output-v2-no-cutover.spec.ts (2 tests) 24ms\n ✓ test/unit/public-output-v2-redaction.spec.ts (8 tests) 52ms\n ✓ test/unit/public-output-v2-contract.spec.ts (25 tests) 99ms\n ✓ test/unit/public-output-v2-errors-projection.spec.ts (4 tests) 34ms\n ✓ test/unit/public-result-assembler-v2.spec.ts (7 tests) 50ms\n ✓ test/unit/contract.spec.ts (12 tests) 34ms\n ✓ test/unit/evidence-merge.spec.ts (6 tests) 17ms\n ✓ test/unit/output-guardrails.spec.ts (7 tests) 19ms\n ✓ test/unit/direct-mapping-classifier.spec.ts (34 tests) 99ms\n ✓ test/unit/runner-smoke.spec.ts (1 test) 4ms\n ✓ test/unit/codegraph-query-planner.spec.ts (6 tests) 20ms\n ✓ test/unit/codegraph-backend.spec.ts (8 tests) 27ms\n ✓ test/unit/repository-safety.spec.ts (5 tests) 51ms\n ✓ test/unit/repository-reader.spec.ts (6 tests) 113ms\n ✓ test/unit/ripgrep-backend.spec.ts (6 tests) 130ms\n ✓ test/unit/candidate-policy.spec.ts (37 tests) 241ms\n ✓ test/unit/di.spec.ts (2 tests) 40ms\n ✓ test/unit/debug-cli-shell.spec.ts (10 tests) 18ms\n ✓ test/unit/scope-gate.spec.ts (2 tests) 683ms\n     ✓ passes shell metacharacters to git as literal path arguments  454ms\n ✓ test/unit/safe-process-runner.spec.ts (6 tests) 805ms\n ✓ test/unit/locate-status-evaluator.spec.ts (13 tests) 2038ms\n     ✓ distinguishes its own deadline from a caller abort  1010ms\n     ✓ retains verification completed before the abort  1004ms\n ✓ test/unit/codegraph-live-smoke.spec.ts (1 test) 5571ms\n     ✓ indexes, probes, queries, and removes only the temporary repository  5569ms\n ✓ test/unit/process-cleanup.spec.ts (6 tests) 11209ms\n     ✓ terminates direct child and descendant on caller abort and settles once  2055ms\n     ✓ terminates direct child and descendant on timeout  2102ms\n     ✓ terminates direct child and descendant when stdout exactly reaches its cap  1648ms\n     ✓ terminates direct child and descendant when stderr exactly reaches its cap  1759ms\n     ✓ rejects within a fixed cleanup deadline when tree termination fails  3511ms\n\n Test Files  23 passed (23)\n      Tests  214 passed (214)\n   Start at  14:50:30\n   Duration  12.34s (transform 3.45s, setup 0ms, import 14.16s, tests 21.38s, environment 6ms)\n\n",
      "stderr": "",
      "id": "CMD-UNIT-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:golden -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:golden\n> tsx testkit/runners/golden-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/golden/runner-smoke.spec.ts (1 test) 5ms\n ✓ test/golden/public-output-v2.spec.ts (7 tests) 32ms\n ✓ test/golden/output-guardrails.spec.ts (8 tests) 35ms\n ✓ test/golden/golden-contract.spec.ts (5 tests) 92ms\n ✓ test/golden/text-engine-classifier.spec.ts (6 tests | 1 skipped) 109ms\n ✓ test/golden/mvp-evaluator.spec.ts (8 tests) 110ms\n ✓ test/golden/mvp-regression-families.spec.ts (5 tests) 173ms\n ✓ test/golden/candidate-policy.spec.ts (3 tests) 166ms\n ✓ test/golden/fixture-completeness.spec.ts (3 tests) 179ms\n ✓ test/golden/codegraph-fallback.spec.ts (11 tests) 244ms\n ✓ test/golden/text-evidence-engine.spec.ts (14 tests) 907ms\n     ✓ confirms a multiline mapping through the real ripgrep-to-reader chain  490ms\n ✓ test/golden/large-synthetic-repository.spec.ts (1 test) 3071ms\n     ✓ keeps five real-engine projections stable and records environment-aware timing  3069ms\n\n Test Files  12 passed (12)\n      Tests  71 passed | 1 skipped (72)\n   Start at  14:50:44\n   Duration  4.10s (transform 1.57s, setup 0ms, import 8.62s, tests 5.13s, environment 2ms)\n\n",
      "stderr": "",
      "id": "CMD-GOLDEN-ALL",
      "core": true,
      "failure_handling": "fix-or-block"
    },
    {
      "command": "npm run test:mcp -- --all",
      "exit_code": 0,
      "stdout": "\n> repo-nav@0.1.0 test:mcp\n> npm run build --silent && tsx testkit/runners/mcp-runner.ts --all\n\n\n RUN  v4.1.10 D:/Personal/repo-nav-worktrees/repo-nav-public-beta\n\n ✓ test/mcp/runner-smoke.spec.ts (1 test) 2ms\n ✓ test/mcp/tool-surface.spec.ts (8 tests) 253ms\n ✓ test/mcp/redaction-output-parity.spec.ts (1 test) 1368ms\n     ✓ keeps forbidden values out of structured, text, stdout protocol, and stderr  1366ms\n ✓ test/mcp/candidate-minimal-loop.spec.ts (1 test) 1404ms\n     ✓ returns confirmed and bounded candidates with transport parity  1402ms\n ✓ test/mcp/mcp-golden-adapter.spec.ts (1 test) 1418ms\n     ✓ feeds both success and error transport observations to the shared evaluator  1416ms\n ✓ test/mcp/tool-output-parity.spec.ts (2 tests) 2389ms\n     ✓ returns one confirmed mapping through real stdio  1368ms\n     ✓ keeps all recoverable statuses out of the MCP error channel  1019ms\n ✓ test/mcp/request-cancellation.spec.ts (3 tests) 3311ms\n     ✓ does not lose cancellation sent before the handler starts work  1441ms\n     ✓ propagates the SDK request signal to the application service  992ms\n     ✓ aborts an in-flight locate when stdin reaches EOF  875ms\n ✓ test/mcp/tool-error-parity.spec.ts (4 tests) 5002ms\n     ✓ maps schema-invalid objects to typed parity output  1382ms\n     ✓ preserves the typed code while sanitizing unsafe detail  975ms\n     ✓ preserves the typed code while sanitizing unsafe detail  865ms\n     ✓ turns thrown failures into safe typed parity output  1777ms\n ✓ test/mcp/lifecycle-contract.spec.ts (18 tests) 11422ms\n     ✓ accepts only real MCP frames on stdout and propagates clean exit  804ms\n     ✓ treats an SDK transport parse failure as fatal without stdout pollution  624ms\n     ✓ drives graceful shutdown through stdin within the manifest budget  552ms\n     ✓ observes the real Nest context hook and direct/descendant process cleanup  1499ms\n     ✓ fails when the real context close marker is deliberately skipped  1677ms\n     ✓ fails when an actual descendant tree is deliberately left running  2882ms\n     ✓ cleans both child PIDs and the probe directory after a forced timeout  2525ms\n     ✓ cleans both child PIDs and the probe directory after a nonzero exit  820ms\n\n Test Files  9 passed (9)\n      Tests  39 passed (39)\n   Start at  14:50:54\n   Duration  13.25s (transform 1.32s, setup 0ms, import 7.97s, tests 26.57s, environment 1ms)\n\n",
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
      "command": "python .codestable/tools/codestable-doctor.py --root .",
      "exit_code": 1,
      "stdout": "CodeStable doctor: blocked\nNext action: Resolve P1 findings before reporting the task complete.\n- P1: CodeStable implementation review must use a Task agent reviewer. (.codestable/features/2026-07-10-debug-cli-mcp-guide/debug-cli-mcp-guide-review.md)\n- P1: CodeStable implementation review must use a Task agent reviewer. (.codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-review.md)\nOCR tool: unconfigured — ocr 已装但未配 LLM。用 provider 体系配置（ocr config set provider <name> + providers.<name>.url/api_key），勿用旧 llm.* 块；详见 cs-onboard OCR 段。\n",
      "stderr": "",
      "id": "CMD-DOCTOR",
      "core": false,
      "failure_handling": "document-baseline"
    }
  ],
  "providers": {}
}
```

## 3. Validation Commands

Extracted from checklist `dod.commands`; see DoD Results for command status.

## 4. Scope And Cleanliness

Design bytes: 27015
Checklist bytes: 6726

## 5. Residual Risks

- CMD-DOCTOR: non-core command failed with exit 1

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
  "stage": "acceptance.final",
  "status": "passed",
  "blocking": [],
  "warnings": [],
  "evidence": [
    {
      "changed_files": [
        ".codestable/architecture/system-repo-nav-foundation.md",
        "testkit/runners/runner-registry.ts",
        ".codestable/features/2026-07-23-public-output-boundary-v2/approval-report.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/goal-plan.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/goal-protocol.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/goal-state.yaml",
        ".codestable/features/2026-07-23-public-output-boundary-v2/implementation-scope.txt",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-acceptance.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-case-inventory.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-checklist.yaml",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design-review.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-design.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-evidence-pack.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-forbidden-scan-report.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-implementation.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-no-cutover-report.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-qa.md",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-review.md",
        ".codestable/roadmap/repo-nav-public-beta/approval-report.md",
        ".codestable/roadmap/repo-nav-public-beta/public-contract-v2.md",
        ".codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-items.yaml",
        ".codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-roadmap-review.md",
        ".codestable/roadmap/repo-nav-public-beta/repo-nav-public-beta-roadmap.md",
        ".codestable/roadmap/repo-nav-public-beta/threat-model.md",
        ".codestable/roadmap/repo-nav-public-beta/v1-to-v2-compatibility.md",
        "src/contracts/v2/locate-result-v2.ts",
        "src/evidence/public-output/public-result-assembler-v2.ts",
        "src/evidence/public-output/sensitive-value-policy-v2.ts",
        "src/evidence/public-output/synthetic-locate-projection-v2.ts",
        "test/golden/public-output-v2.spec.ts",
        "test/unit/public-output-v2-contract.spec.ts",
        "test/unit/public-output-v2-errors-projection.spec.ts",
        "test/unit/public-output-v2-no-cutover.spec.ts",
        "test/unit/public-output-v2-redaction.spec.ts",
        "test/unit/public-result-assembler-v2.spec.ts",
        "testkit/contracts/public-output-v2-import-inventory.ts",
        "testkit/fixtures/public-output-v2/synthetic-locate-v2.ts"
      ],
      "ignored_machine_artifacts": [
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-dod-results.json",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-evidence-pack-results.json",
        ".codestable/features/2026-07-23-public-output-boundary-v2/public-output-boundary-v2-gate-results.json"
      ],
      "allowed_prefixes": [
        ".codestable/features/2026-07-23-public-output-boundary-v2",
        ".codestable/features/2026-07-23-public-output-boundary-v2",
        ".codestable/architecture/system-repo-nav-foundation.md",
        ".codestable/roadmap/repo-nav-public-beta",
        "src/contracts/v2",
        "src/evidence/public-output",
        "test/unit/public-output-v2-contract.spec.ts",
        "test/unit/public-output-v2-errors-projection.spec.ts",
        "test/unit/public-output-v2-no-cutover.spec.ts",
        "test/unit/public-output-v2-redaction.spec.ts",
        "test/unit/public-result-assembler-v2.spec.ts",
        "test/golden/public-output-v2.spec.ts",
        "testkit/contracts/public-output-v2-import-inventory.ts",
        "testkit/fixtures/public-output-v2",
        "testkit/runners/runner-registry.ts"
      ]
    }
  ],
  "providers": {}
}
```
