# P0 Scoped Re-review — Fix Round 2/5

**Prior scoped revision:** `a9d5b9ed573eed97755183168e41494501648d26`  
**Reviewed amended revision / HEAD:** `b29e4215e485c8b386d4d6a99992d482967bc7eb`  
**Mode:** fresh independent, read-only scoped re-review of the round-1 new Important finding plus Critical/Important regressions introduced by `a9d5b9e..b29e421`

## Findings first

### Important — exact package-version authority is still inferred from loose syntax and its observed value is still fabricated from workspace metadata

**Prior finding status: NOT ADDRESSED**

**Locations**

- [package authority classifier, lines 610-633](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L610-L633)
- [workspace value substitution, lines 674-683](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L674-L683)
- [synthetic package test, lines 1389-1401](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L1389-L1401)

**Evidence**

`isPackageJsonVersionAuthorityV2()` does not establish exact dataflow from a specific repo-nav package JSON read to the compared `.version`. It gathers unordered presence facts and accepts the expression whenever some descendant/resolved initializer contains a string including `package.json`, plus calls named `JSON.parse` and `readFileSync`. `exactConfirmationAuthorityVersionV2()` then returns `context.packageVersion`; it does not obtain the value represented by the compared source expression.

A fresh in-memory probe executed the exact detector helper source from the reviewed file with workspace context `9.9.9-workspace`:

| Probe | Detector result | Why this is wrong |
| --- | --- | --- |
| Compare against `JSON.parse(readFileSync(join(root, 'other-package.json'), 'utf8')).version` | `9.9.9-workspace` | An unrelated path is accepted because `other-package.json` contains the substring `package.json`. |
| Compare against `JSON.parse((readFileSync(join(root, 'package.json'), 'utf8'), '{"version":"0.0.0-decoy"}')).version` | `9.9.9-workspace` | The package read is discarded by the comma expression; the runtime comparator is `0.0.0-decoy`, yet the detector reports the workspace version. |

The added package synthetic test asserts the supplied context value for a positive shape, but adds no negative case proving that the package read is the value actually parsed or that the path identifies the intended repo-nav authority. The tarball test does prove that a tarball descriptor does not borrow `packageVersion`; the package branch still can.

**Impact**

The P0 phase gate can report `real-consumer-confirmation` as exactly bound to the workspace version when the compared value comes from another package or from a different parse input. This preserves the core false-certification/fabricated-actual hazard identified in round 1 and can let C5's fixture transition pass without an exact package authority.

**Required remediation**

Resolve an exact, ordered expression dataflow: the compared value must derive from the result of the intended `JSON.parse(readFileSync(<identified repo-nav package.json>, ...))` chain, not merely co-occur with those tokens. Return/map the workspace package value only after that exact authority identity is proven. Add negative synthetic cases for an unrelated package path and for a package read that is present but does not feed the parsed/comparison value.

### Important — the new alias/control-flow model is file-global and shallow, causing ordinary scoped aliases to fail and non-enforcing checks to be certified

**New Important breakage introduced by the round-2 detector**

**Locations**

- [file-global binding collection, lines 414-425](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L414-L425)
- [identifier-text resolution, lines 438-485](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L438-L485)
- [shallow rejection test, lines 685-693](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L685-L693)
- [source-wide `if` scan, lines 790-834](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L790-L834)
- [isolated alias/destructuring matrix, lines 1300-1401](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts#L1300-L1401)

**Evidence**

`bindingReferencesV2()` stores every variable declaration in one `Map<string, ...>` for the entire source file. It does not model lexical scope, declaration position, shadowing, or reassignment; the last declaration with a given identifier text wins globally.

A fresh probe with an exact aliased comparison inside `validate(confirmation)` followed by an unrelated function that declares its own local `candidate` returned `null`. Thus an ordinary validator alias is invalidated solely by normal same-name reuse in another scope. The isolated synthetic snippets all use globally unique names, so they do not cover this failure path.

The same probe run also showed that the detector returned `8.8.8-tarball` for both of these non-enforcing forms:

- a mismatch block whose final statement is `throw`, but which has an earlier conditional `return` that bypasses the throw;
- an exact comparison placed only inside a never-called validator function.

`statementAlwaysRejectsV2()` checks only whether a block's last statement recursively ends in `throw`, and `readConfirmationVersionBindingV2()` scans every `if` in the file without establishing that the comparison is on the live validation path. These are syntactic presence checks, not fail-closed enforcement.

**Impact**

The detector retains a hidden source-style constraint and both error directions from the prior phase-gate hazard: valid exact binding can be reported unwired due to unrelated lexical names, while dead or bypassable comparison text can be reported wired. Because A2 may modify the source without this P0 file and C5's bounded file list does not include this detector, these false results can block or falsely certify later tasks.

**Required remediation**

Use scope-aware symbol/binding resolution (including declaration order and reassignment semantics) rather than a file-wide identifier-text map. Restrict accepted checks to an actually enforced validation path, or use a deliberately narrow validator pattern whose control-flow guarantee can be proven. Add synthetic cases for same-name reuse in another function, shadowing/reassignment, an early-return bypass, and a dead helper.

## Acceptance-criterion trace

| Round-1 requirement | Round-2 implementation/test evidence | Disposition |
| --- | --- | --- |
| Distinguish type/schema presence from exact binding | Direct and aliased `typeof` tests return `null`; unused expression/comparison returns `null`. | **ADDRESSED for the isolated tested forms** |
| Handle ordinary aliases/destructuring | Direct alias and destructuring positives exist, but binding resolution is file-global and fails under ordinary same-name reuse in another lexical scope. | **NOT ADDRESSED** |
| Do not fabricate actual from workspace package version | Tarball descriptor uses its own version, but the package branch returns `context.packageVersion` after loose token-presence analysis; fresh decoy probes demonstrate a fabricated result. | **NOT ADDRESSED** |
| Add synthetic tests for direct type-only, aliased access, unused access, exact package/tarball binding | All named positive/basic-negative categories are present in the six-test inventory case. The matrix omits the dataflow, scope, and enforcement negatives above. | **PRESENT BUT INSUFFICIENT** |

## Review scope, handoff, and diff confirmation

- Read the round-1 scoped re-review, updated implementer report, P0 brief, supplied scoped diff, actual Git diff, touched file, version fixture, current real-consumer validator, and relevant A2/C5 plan context.
- The implementer handoff reports `DONE_WITH_CONCERNS`, claims the finding repaired, and claims post-amend inventory, direct Prettier, typecheck, lint, and configured format checks passed. This review did not rely on those claims.
- `HEAD` and the requested commit both resolve to `b29e4215e485c8b386d4d6a99992d482967bc7eb`.
- The amended commit retains original P0 parent `ac26ac2e7fb0625f7cec662f06e137f8b2ba684b` and subject `test(hardening): freeze public and authority inventories`.
- Actual round-2 diff `a9d5b9e..b29e421` changes only [test/unit/repository-hardening-inventory-v2.spec.ts](/Users/steven/repo-nav/test/unit/repository-hardening-inventory-v2.spec.ts), with 537 insertions and 24 deletions.
- The supplied review package matches the actual Git diff byte-for-byte when rendered with `--unified=10`; the initial default-context comparison differed only because Git defaults to three context lines.
- No reviewed implementation file was modified, and no delegation, commit, push, publish, tag, or external-service access occurred.

## Fresh checks

| Command / probe | Exit | Fresh result |
| --- | ---: | --- |
| `npm test -- --group public-beta-release --case repository-hardening-inventory` | 0 | 1 file passed; 6 tests passed; 81 files / 423 tests skipped by selection. |
| `npx --no-install prettier --check test/unit/repository-hardening-inventory-v2.spec.ts` | 0 | Sole round-2-touched P0-created file matches Prettier. |
| `npm run typecheck` | 0 | TypeScript check passed with no diagnostics. |
| `git diff --check a9d5b9e..b29e421` plus parent/subject/path read-back | 0 | Diff clean; original P0 parent and subject retained; exactly one round-2 path changed. |
| Supplied diff versus actual `git diff --unified=10` | 0 | Exact byte-for-byte match. |
| In-memory detector false-certification/scope probes | 0 | Reproduced fabricated package results, early-return/dead-code false positives, and scoped ordinary-alias false negative described above. |

**Evidence freshness:** all checks and probes ran against `HEAD=b29e4215e485c8b386d4d6a99992d482967bc7eb`. The Git index was empty. The only tracked worktree modification observed before and after checks was the pre-existing plan document; it was not touched by this review.

## New breakage summary

- **New Critical:** None.
- **New Important:** 1 — file-global alias resolution and shallow source-wide control-flow scanning can reject valid scoped aliases and certify dead/bypassable checks.
- **Prior Important under verification:** **NOT ADDRESSED** because the package branch can still substitute workspace `packageVersion` without proving exact authority dataflow.

## Residual risk

This was intentionally limited to fix round 2 and did not re-review the full original P0 characterization or unrelated prior findings. The current production source remains `planned-unwired`, so the passing inventory case exercises the unwired state; only synthetic snippets exercise the future wired transition, and those snippets omit the failure paths above. The full test, lint, and release suites were not rerun because they are outside the requested fresh-check minimum and bounded scope.

## Final scoped verdict

**FAIL**

The requested detector matrix was added and the simple direct/type-only/tarball cases improved, but the round-1 Important finding is not fully addressed and the fix introduces one additional Important phase-gate defect. Return to the executor for fix round 3 and fresh re-review; no production behavior change is requested.
