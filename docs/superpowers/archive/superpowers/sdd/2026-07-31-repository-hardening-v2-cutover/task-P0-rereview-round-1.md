# P0 Scoped Re-review — Fix Round 1/5

**Superseded revision:** `ae1d7a5d90e35837923001f2acc3a5b93a3ad2f4`  
**Reviewed amended revision:** `a9d5b9ed573eed97755183168e41494501648d26`  
**Mode:** scoped independent re-review of the three prior findings and new Critical/Important regressions only

## Findings first

### New Important — the new confirmation wiring detector is syntactic rather than authority-semantic, creating an A2/C5 phase gate hazard

**Locations**

- `test/unit/repository-hardening-inventory-v2.spec.ts:350-373`
- `test/unit/repository-hardening-inventory-v2.spec.ts:545-553`
- `test/unit/repository-hardening-inventory-v2.spec.ts:610-614`
- `test/unit/repository-hardening-inventory-v2.spec.ts:837-850`
- `test/unit/repository-hardening-inventory-v2.spec.ts:890-939`
- `testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts:85-90`
- Committed plan, Task A2 Step 3 and its bounded file list

**Evidence**

`sourceHasPropertyPathV2()` classifies the confirmation authority as wired whenever the AST contains the exact property-access path `confirmation.candidate.version`. It does not establish that the value is compared with or bound to the package/tarball version. Once that path is seen, the observation fabricates `actual` from workspace `packageVersion`, not from a confirmation value.

A fresh reviewer probe of the detector logic produced:

```json
{
  "directTypeOnly": true,
  "aliasedTypeOnly": false,
  "directUnusedRead": true
}
```

Therefore:

1. A2 is explicitly required to validate `confirmation.candidate` with a `version: string` field, but its bounded file list does not include this P0 fixture. A valid direct type-only check such as `typeof confirmation.candidate.version === 'string'` makes P0 observe the authority as wired and reject the still-correct `planned-unwired` fixture as `planned version authority is already wired`.
2. The equivalent aliased implementation (`const candidate = confirmation.candidate; candidate.version`) is not detected. The same false negative can survive into C5 even when an aliased value is actually bound, causing the fixture's later `wired` state to fail.
3. Even an unused expression statement `confirmation.candidate.version;` is accepted as wiring and assigned the package version as its actual value.
4. The new synthetic C5 test does not exercise this source detector; it constructs `SourceInventoryV2.versionAuthorities` directly from the fixture, so it cannot catch these false-positive/false-negative transitions.

**Impact**

The amended P0 test introduces a hidden source-style constraint across A2 and C5. A correct later task can fail or pass depending on whether it uses a direct chain, alias, or unused read rather than whether an exact version authority exists. This can block the task DAG or falsely certify the final authority.

**Required remediation**

Characterize semantic wiring rather than bare property access. The evaluator must distinguish A2's schema/type presence from C5's exact version binding, recognize ordinary alias/destructuring forms, and never substitute workspace `packageVersion` as the observed confirmation value solely because a property was accessed. Add synthetic detector tests covering direct type-only access, aliased access, unused access, and an actual exact package/tarball binding. Keep the repair in P0 test/fixture scope; no production behavior change is requested.

## Prior finding disposition

### 1. Important — duplicate version phase state and unconditional `src/legacy-v1.ts` requirement

**Status: ADDRESSED**

Evidence in the scoped fix:

- The duplicate `REQUIRED_VERSION_AUTHORITIES_V2` table and evaluator-owned `1.0.6` checks were removed.
- `LEGACY_V1_SOURCE_STATE_V2` is fixture-owned.
- Missing `src/legacy-v1.ts` now yields `{ state: 'removed', exports: [] }` instead of throwing.
- Version rows are evaluated against fixture-owned expected values.
- A synthetic cutover evaluator test was added.

The new Important finding above concerns the semantics of one source-observation detector; it does not reinstate the removed duplicate literals or unconditional legacy-source requirement.

### 2. Important — absent installed-package and confirmation bindings accepted by loose substring checks

**Status: ADDRESSED for the current P0 state**

Evidence in the scoped fix:

- Both rows are explicitly marked `planned-unwired` in the fixture.
- Current observations require `{ wiring: 'unwired', actual: null }`.
- The former nearby substring checks were removed.
- The installed-package detector now requires package-path, `readFileSync`, `JSON.parse`, and `.version` evidence.
- The confirmation detector requires an exact AST property path rather than the prior `confirmation.candidate` substring.

The current false claim is removed. However, the replacement confirmation detector introduces the separate phase/semantic Important finding documented above.

### 3. Minor — two P0-created files failed direct Prettier

**Status: ADDRESSED**

Fresh direct Prettier check exits 0 for both cited files.

## Scoped diff inspection

- The required original review, brief, updated implementer report, and scoped diff package were read.
- The actual Git diff `ae1d7a5..a9d5b9e` was inspected independently.
- Scoped fix touches only:
  - `test/unit/repository-hardening-inventory-v2.spec.ts`
  - `testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts`
  - `testkit/fixtures/repository-hardening-v2/version-authorities-v2.ts`
- The supplied package and fresh Git diff contain the same changed lines; only diff context width differs.
- The amended commit retains parent `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b`, subject, seven-path final P0 allowlist, and no production-file change.

## Fresh checks

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | 1 file passed; 5 tests passed; 81 files / 423 tests skipped by selection |
| `npx --no-install prettier --check test/unit/repository-hardening-inventory-v2.spec.ts testkit/fixtures/repository-hardening-v2/legacy-v1-api-map-v2.ts` | 0 | Both files match Prettier output |
| `npm run typecheck` | 0 | TypeScript check passed |
| Scoped `git diff --check` plus amended-parent assertion | 0 | Fix diff clean; original parent retained |
| Reviewer detector probe | 0 | Direct type-only and unused access detected; aliased access missed, as shown above |

Evidence freshness: all checks ran against `HEAD=a9d5b9ed573eed97755183168e41494501648d26`. The index remained empty. The protected pre-existing plan diff remained the only tracked worktree modification and retained SHA-256 `f2430e69b97669c2ac6cfdec4999b161d543f6a40ec1f1f18ae71c9605d21bb2`.

## New breakage summary

- **New Critical:** None
- **New Important:** 1 — non-semantic confirmation wiring detection creates A2/C5 false-positive and false-negative behavior

## Final scoped verdict

**FAIL**

All three prior findings are addressed at the current amended P0 revision, but the fix introduces one new Important phase-integration breakage. Return to the executor for fix round 2 and re-review. No production behavior change is requested.
