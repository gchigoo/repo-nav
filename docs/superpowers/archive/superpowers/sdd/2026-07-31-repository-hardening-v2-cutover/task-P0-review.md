# Task P0 Review — `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4`

## Findings

### Important — inventory evaluator hard-codes phase state outside the shared fixtures and cannot survive the specified C5 update path

**Locations**

- `test/unit/repository-hardening-inventory-v2.spec.ts:136-198`
- `test/unit/repository-hardening-inventory-v2.spec.ts:413-415`
- `test/unit/repository-hardening-inventory-v2.spec.ts:599-610`
- P0 brief Step 3, `task-P0-brief.md:45-47`

**Evidence**

1. The test duplicates all ten version rows, including every `1.0.6` literal, in `REQUIRED_VERSION_AUTHORITIES_V2` instead of treating `version-authorities-v2.ts` as the single phase-owned fact source.
2. The evaluator then requires the fixture JSON to equal that duplicate constant and separately requires package/shrinkwrap values to equal hard-coded `1.0.6`.
3. `readSourceInventoryV2()` unconditionally requires and enumerates `src/legacy-v1.ts`.
4. The brief says later C2/C3/C5 work should update the same fact source. The approved C5 path updates the P0 fixtures, bumps the version, and removes `src/legacy-v1.ts`; it does not list this P0 evaluator as another fact source.

A fixture-only C5 update to `2.0.0` therefore necessarily produces both `version authority rows are not the frozen literal inventory` and `package and shrinkwrap version authorities disagree`. Removing `src/legacy-v1.ts` also throws before the fixture can express the post-cutover state.

**Impact**

P0 is intended to be the foundational inventory for the later cutover, but this implementation makes the characterization test itself a second, hidden phase manifest. The planned C5 change cannot pass the all-unit gate while respecting its bounded file list. This violates the shared-fact-source acceptance criterion and makes the inventory brittle rather than cutover-ready.

**Required remediation**

Keep current literal expectations in the fixture, but make the evaluator compare actual authorities to fixture rows rather than to a duplicate `1.0.6` table. Model legacy-present versus legacy-removed state through a fixture-owned value or another design that lets the allowed fixture update express C5 without editing this evaluator. Add a synthetic phase-transition test proving that changing the fixture/source model to the cutover state does not require another hard-coded test update. Do not change production behavior for P0.

### Important — two claimed current version-authority bindings are absent, while loose substring checks report them as source-exact

**Locations**

- `testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts:63-79`
- `test/unit/repository-hardening-inventory-v2.spec.ts:395-408`
- `tools/release/pack-candidate.mjs:76-105`
- `tools/release/real-consumer-contracts.mjs:46-50`

**Evidence**

1. The fixture declares `installed node_modules/repo-nav/package.json.version` in `pack-candidate.mjs`. The current script installs the tarball and invokes the installed CLI with `--help`; it does not read or assert the installed package's `package.json.version`. The detector nevertheless adds the authority ID merely when the file contains an install command and the generic string `node_modules/repo-nav`.
2. The fixture declares `confirmation.candidate.version` in `real-consumer-contracts.mjs`. The current validator only checks that `confirmation.candidate` is a non-null object; it never reads or validates `.version`. Repository search found `candidate.version` only in the new P0 inventory test/fixture, not in the claimed source binding. The detector nevertheless adds the ID for any occurrence of `confirmation.candidate`.

**Impact**

The test can pass while the binding named by an authority row does not exist. Consequently, the inventory is not deep-exact with the current authority implementation, and later A2/C5 work can inherit a false baseline. A mutation that removes or never implements the exact installed-version or confirmation-version binding is not detected.

**Required remediation**

Without changing production behavior, make the characterization truthful: either mark these as explicitly planned/unwired rows, or validate the exact current binding/behavior rather than a nearby substring. Preserve fixed literal expectations; do not derive fixture values from the package under test.

### Minor — two newly created P0 files do not match the repository's Prettier output

**Locations**

- `test/unit/repository-hardening-inventory-v2.spec.ts` (multiple wrapping deltas, first at line 253)
- `testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts:133-136`

**Evidence**

Fresh direct check:

```text
npx --no-install prettier --check test/unit/repository-hardening-inventory-v2.spec.ts testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts
exit 1
```

The configured `npm run format:check` exits 0 because it currently excludes `test/**` and `testkit/**`. A full seven-path direct check also flagged `testkit/runners/runner-registry.ts`, but a check of the parent revision proves that file's broader formatting debt predates P0; only the two new files above are attributed to this change.

**Impact**

No runtime impact, but the new characterization source adds avoidable style debt immediately before the planned test/testkit formatting boundary.

**Required remediation**

Apply the repository's current Prettier output to the two P0-created files, then rerun the targeted inventory test and direct Prettier check.

## Verdicts

- **Spec verdict: FAIL**
- **Task quality verdict: FAIL**
- **Overall review verdict: FAIL**

There are no Critical findings. The two Important findings must return to the executor for a new P0 revision and re-review. The requested fixes remain characterization/test-fixture work; this review does **not** request production behavior changes.

## Review context and bounded scope

- **Task confirmed:** P0 freezes current public root runtime/type exports, legacy-v1 transitive exports plus migration dispositions, all current `src/**/*.ts` `new WeakMap`/`new WeakSet` bindings, and version-authority expectations.
- **Acceptance mode confirmed:** characterization/inventory only; no production behavior change.
- **Review mode:** independent task-level, read-only implementation review. The user explicitly assigned a separate P0 reviewer context, and the implementer report identifies independent review as pending.
- **Starting revision:** `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b`.
- **Reviewed revision:** `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4`.
- **Parent relation:** fresh check confirms the reviewed commit's direct parent is the stated starting revision.
- **Actual diff:** inspected from Git, not only from the report. It contains exactly the seven allowed paths and no `src/**` production change.
- **Review package:** required package was read in full. A fresh Git diff has the same changed lines; the supplied package only uses a wider context range for the final runner-registry hunk.
- **Implementation handoff:** `task-P0-report.md` was read, including its claimed checks and stated concern that independent review was pending. Claims were not treated as proof.

## Acceptance-criterion trace

| Criterion | Evidence | Result |
| --- | --- | --- |
| Only seven brief-listed committed paths | Fresh `git diff --name-status ac26ac2..ae1d7a5`; exact seven paths | PASS |
| No production behavior changes | No committed `src/**`, package, docs, or release-tool changes | PASS |
| Root runtime/type inventory is current and deep-exact | Independent compiler/runtime audit: 42 runtime, 20 type; no missing/extra rows | PASS |
| Shared root runtime fixture used by existing snapshot | `public-root-export-snapshot.spec.ts:3-13` imports `PUBLIC_ROOT_RUNTIME_EXPORT_KEYS_V2` | PASS |
| Legacy transitive inventory and mappings | Independent compiler audit: 149 transitive symbols plus 6 required non-export rows = 155; no missing/extra/duplicates/placeholders | PASS for current state |
| Required legacy mappings | Independent audit found zero mismatches; all 16 `SafeProcess`/`SafeStdout`/`StreamingSafeProcess` rows are removed-internal-only; `RepositorySearchBackend` and concrete backend methods match the brief | PASS |
| All current weak bindings represented | Independent TypeScript AST audit: 98 source sites, 98 rows, no missing/extra/duplicate keys | PASS |
| Weak fail-closed rules | Baseline has 72 runtime-capability, 21 ordinary-data, 5 identity-cache; 77 retain, 18 remove-c3, 3 remove-c2; no ordinary-data+retain | PASS |
| Fixed literal version rows | Fixture contains ten literal rows with `1.0.6`, `repo-nav-1.0.6.tgz`, and `pkg:npm/repo-nav@1.0.6` and does not import package metadata | PARTIAL; exact-source authority claims are false for two rows |
| Required mutation sensitivity | Fresh targeted test runs missing root export, synthetic weak row, ordinary-data retain, missing MCP authority, duplicate row, and blank rationale mutations | PASS |
| Later phases update one shared fact source | Evaluator duplicates version literals and assumes legacy source presence | FAIL |
| Runner selection registration | `repository-hardening-inventory` is registered in unit `public-beta-release` cases | PASS |

## Fresh checks and evidence freshness

All formal checks below were run in this reviewer context after confirming `HEAD` was the reviewed commit. The pre-existing dirty plan document remained the only tracked worktree change, its diff hash stayed `f2430e69b97669c2ac6cfdec4999b161d543f6a40ec1f1f18ae71c9605d21bb2`, and the index remained empty.

| Command | Exit | Fresh result |
| --- | ---: | --- |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | 1 file passed; 3 tests passed; 81 files / 423 tests skipped by selection |
| `npm test -- --group public-beta-release --case package-metadata` | 0 | 4 files passed; 4 tests passed; 78 files / 422 tests skipped by selection |
| `npm run typecheck` | 0 | TypeScript check passed |
| `npm run lint` | 0 | Configured ESLint gate passed |
| `npm run format:check` | 0 | Configured Prettier gate passed; it does not cover test/testkit |
| `git diff --check ac26ac2..ae1d7a5` plus direct-parent assertion | 0 | Commit diff clean; parent exact |
| Independent TypeScript AST/export audit | 0 | 42/20 root exports, 149 legacy symbols, 98 weak sites; no inventory key mismatch |
| Independent required-mapping audit | 0 | 155 rows; no missing/extra/required mismatch; 16 SafeProcess-family rows all removed |
| Direct Prettier check on the two P0-created files named above | 1 | Both differ from Prettier output |
| Direct ESLint invocation on all seven paths | 1 | All seven paths are ignored by current ESLint configuration; exit was caused by seven ignored-file warnings, not evaluated lint errors |

Reviewer-tooling note: an initial ad-hoc AST audit attempt exited 1 because the reviewer script requested node positions without the needed source context. The corrected independent audit exited 0 with the counts shown above; this was a reviewer harness error, not a repository test failure.

## Unverifiable historical constraints

- **⚠️ Cannot verify from diff:** that the pre-existing dirty plan document was never transiently edited or staged during implementation. What is verifiable is that it is absent from the commit, currently unstaged, the index is empty, and its diff hash remained unchanged throughout this review. **Main-session resolution:** compare an independently recorded pre-P0 content/diff hash with the post-P0 hash, or inspect trustworthy execution/staging logs.
- **⚠️ Cannot verify from diff:** that no push, publish, tag, or external-service access occurred during implementation. No such action was performed by this reviewer. **Main-session resolution:** use trusted process/audit logs and remote/ref evidence if that historical guarantee is required.

## Residual risk

- The structural weak-site coverage is strong, but the semantic `carries`/`action` dispositions remain domain judgments; this review inspected all 98 rows and their source type arguments but did not execute later C2/C3 behavior.
- Configured lint/format gates presently exclude the changed test/testkit source, so only typecheck and direct reviewer formatting inspection cover those files.
- No external, destructive, package-publish, tag, push, or production operation was run.
