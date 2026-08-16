# RepoNav Project Status

**Last reviewed:** 2026-08-16

This document records the maintained repository state after the Repository Hardening v2 implementation and atomic package cutover. Historical plans and archived evidence retain their original context and are not current-state authorities.

## Current release line

- Repository package version: `2.0.0`.
- Supported Node.js versions: `^22.0.0 || ^24.0.0`.
- Production locate output uses schema `2.0` only.
- Canonical immutable execution facts and one pure finalizer are the production result authority.
- Duplicate, unverified-content, and selected read-limit facts come from an authoritative verification outcome bound to the exact scope-folded selection, execution, and final snapshot proof.
- Snapshot revalidation uses the selected `conditional-digest` policy, with a real-filesystem clean-branch correctness probe in addition to the authoritative timing artifact.
- The package export map no longer exposes `repo-nav/legacy-v1`.
- No npm publish, release tag, GitHub Release, or dist-tag mutation is implied by the source cutover.

## Public package exports

| Import                  | Current purpose                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `repo-nav`              | v2 request/result contracts and application helpers; includes approved deprecated adapter re-exports |
| `repo-nav/backends`     | `RipgrepBackend` and `CodeGraphBackend`                                                              |
| `repo-nav/node`         | `NodeRepositoryReader` and `NodeSafeProcessRunner`                                                   |
| `repo-nav/advanced`     | Advanced dependency-injection tokens and CodeGraph planning helpers                                  |
| `repo-nav/package.json` | Package metadata                                                                                     |

`repo-nav/legacy-v1` is intentionally absent in `2.0.0` at runtime and under NodeNext resolution.

Deep imports outside the package export map are unsupported.

## Hardening checkpoint

[Pull request #2](https://github.com/gchigoo/repo-nav/pull/2) merged the `1.1.0` hardening foundation into `main` on 2026-08-14.

- Tested integration head: `9b00c1f0c9f11dd37316826a70e9155fcd0ba1d5`.
- Merge commit: `3da72f8c38c11eeab9b5480d5d6435efa72a3f53`.
- Main-branch cross-platform run: [31809134681](https://github.com/gchigoo/repo-nav/actions/runs/31809134681), passed.
- Main-branch package/release run: [31809134722](https://github.com/gchigoo/repo-nav/actions/runs/31809134722), passed.

The merged checkpoint includes:

- fail-closed real-consumer evidence handling;
- mandatory backend trace and trusted fallback derivation;
- sanitized spawn-failure classification;
- verified file snapshots bound to content digests;
- hermetic unit tests, a dedicated CodeGraph integration surface, and macOS ARM coverage;
- MCP SDK `1.30.0` and installed-production audit policy;
- exact test identities and batched platform contracts;
- lazy CLI application loading, ordered concurrent probes, and a cold-start benchmark;
- snapshot revalidation candidate measurement and CI artifact generation;
- locate-decision characterization for the future canonical authority cutover;
- formatting, typed linting, and promise-safety rules across source, tests, and testkit.

No npm publish, release tag, or dist-tag mutation was part of this checkpoint.

## Repository Hardening v2 implementation state

| Work item                                     | Status      | Implemented outcome                                                                                                                                                                                                |
| --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `S2` snapshot policy selection                | Implemented | Imported and validated the authoritative benchmark artifact, selected `conditional-digest`, and added a source-bound real-filesystem clean-branch correctness probe.                                               |
| `C2` canonical facts and finalizer            | Implemented | Added six immutable `LocateExecutionFactsV2` families and one pure public-result finalizer.                                                                                                                        |
| Selected verification authority               | Implemented | Binds duplicate, unique-unverified, and selected read-limit facts to the exact trusted selection, execution token, and successful final snapshot proof.                                                            |
| `C3` production authority cutover             | Implemented | Production consumes canonical facts; schema-1 result, status, next-action, reservation, and projection decision authorities were removed.                                                                          |
| `C4` materialization and transport flattening | Implemented | Flattened evidence materialization, serialization, application, CLI, and MCP transport; ordinary-data identity registries and the duplicate serializer were removed.                                               |
| `V2` atomic `2.0.0` cutover                   | Implemented | Updated version authorities to `2.0.0`, removed only `repo-nav/legacy-v1`, and retained the approved root and adapter exports.                                                                                     |
| Candidate-bound release evidence              | Implemented | Binds closure, SBOM, audit, owner checks, and readiness to one exact tarball SHA; missing owner or real-consumer evidence remains a structured, non-publishing owner block.                                        |
| Single-process build authority                | Implemented | The supported build performs one clean pinned TypeScript compile, captures and revalidates source/output state, issues an opaque synchronous capability, and materializes the exact candidate in the same process. |
| Concurrent-mutation fail-closed checks        | Implemented | Build receipt issuance and candidate loading repeat authoritative captures around long-running work; deterministic tests mutate output and tarball bytes inside the previously open intervals.                     |

The maintained execution plan is [`docs/superpowers/plans/2026-08-12-repository-hardening-v2-replan.md`](superpowers/plans/2026-08-12-repository-hardening-v2-replan.md).

## Current local verification

Fresh checks against the current working-tree implementation on 2026-08-15, followed by registry and CodeGraph verification on 2026-08-16, produced:

- clean plain unit execution without root `dist` or candidate generation: 102 files passed, 2 skipped; 662 tests passed, 9 skipped;
- Golden: 19 files passed; 85 tests passed, 1 skipped;
- MCP: 11 files and 42 tests passed;
- docs smoke, platform self-test, and all 20 local platform contracts passed;
- a temporary external-prefix installation of pinned CodeGraph `1.1.6` passed the live init, probe, query, and cleanup integration test without changing project dependencies;
- typecheck, lint, full format check, and `git diff --check` passed;
- package metadata, lock, declaration emit, dry-run, smoke, installed closure, isolated installed-production audit, SBOM, legacy-subpath absence, and the 21-contract aggregate passed;
- the installed audit reported zero info, low, moderate, high, or critical vulnerabilities; installed closure contained 112 nodes and 183 edges; the verified SBOM contained 111 components and 183 edges;
- all 12 benchmark fixtures, snapshot revalidation, the clean-branch probe, and CLI cold-start checks passed;
- independent implementation and security/release reviewers returned PASS after deterministic concurrent-mutation regressions closed the two review findings; the final security review reported no Critical, High, or Medium findings.

The exact locally materialized candidate is:

| Authority               | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| Candidate source        | `344ec3df92116e61312fe0a0fdf9dec2ad284c4c25723321423e858c7afef92f` |
| TypeScript build output | `016d3c1e7614fd333eb491b66a2cfe797c449f2ddd8bae5d0132eac953e585c6` |
| Build receipt           | `e82626733784c0ca511fdfa64dcc49ba81e894d63a440e692c6899b0a502e015` |
| Package tarball         | `3a56cb49afb667ce24ab182671fd246e29dea62530f36191929fc6a05367a33f` |
| Release design revision | `5fca9350362bf7dcb2b0525e979641fa777541cdf2637579db8f0555139173f6` |

Release readiness remains fail closed with `publishPerformed: false`. The following evidence is intentionally still absent and cannot be replaced by local synthetic data:

- fresh remote six-cell Linux/Windows/macOS Intel results, macOS ARM unit results, pinned CodeGraph integration-job results, and safe-report aggregation for this source/candidate binding;
- owner actions and foreign-repository real-consumer confirmation.

Push, tag, publish, owner actions, and other remote writes remain separate explicitly authorized actions. The current Repository Hardening v2 implementation has not been committed or pushed.

## Continuous integration coverage

- `cross-platform-ci` runs Linux, Windows, and macOS Intel on Node 22 and 24.
- A separate macOS ARM Node 22 job runs typechecking and unit tests.
- A dedicated Ubuntu Node 22 job installs CodeGraph `1.1.6` and runs the live integration test; ordinary unit jobs do not install CodeGraph.
- `package-release-ci` runs lint, formatting, build, package smoke, installed closure, security audit, SBOM verification, fixture benchmarks, and the authoritative snapshot candidate benchmark.
- The nightly benchmark is a non-blocking fixture-scenario placeholder, not yet a multi-sample real-repository suite.
- The release-tag workflow validates an existing tag, package version, tarball, installed closure, benchmark, and CLI/MCP build. Publishing remains an explicit owner action.

## Documentation authority

- Maintained product documentation lives in `README.md`, `SECURITY.md`, and the non-archive files under `docs/`.
- Current workflow documentation lives under `docs/superpowers/`, with this status page and the 2026-08-12 replan providing current project-state context.
- `docs/superpowers/archive/` is immutable historical evidence. Its old versions, paths, and task states are intentionally preserved and must not be read as current product behavior.
