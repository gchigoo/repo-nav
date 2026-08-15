# RepoNav Project Status

**Last reviewed:** 2026-08-15

This document records the maintained repository state after the Repository Hardening v2 foundation work merged. Historical plans and archived evidence retain their original context and are not current-state authorities.

## Current release line

- Repository package version: `1.1.0`.
- Supported Node.js versions: `^22.0.0 || ^24.0.0`.
- Production locate output uses schema `2.0` only.
- The package export map still exposes the `repo-nav/legacy-v1` compatibility subpath.
- The future `2.0.0` cutover is not implemented. It will remove only `repo-nav/legacy-v1`; `repo-nav/backends`, `repo-nav/node`, `repo-nav/advanced`, the root export, and `repo-nav/package.json` remain in scope for retention.

## Public package exports

| Import                  | Current purpose                                                                                      | Future `2.0.0` disposition                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `repo-nav`              | v2 request/result contracts and application helpers; also includes deprecated 1.x adapter re-exports | Retain                                             |
| `repo-nav/backends`     | `RipgrepBackend` and `CodeGraphBackend`                                                              | Retain                                             |
| `repo-nav/node`         | `NodeRepositoryReader` and `NodeSafeProcessRunner`                                                   | Retain                                             |
| `repo-nav/advanced`     | Advanced dependency-injection tokens and CodeGraph planning helpers                                  | Retain                                             |
| `repo-nav/legacy-v1`    | Historical v1 contracts for 1.x compatibility                                                        | Remove atomically with the `2.0.0` version cutover |
| `repo-nav/package.json` | Package metadata                                                                                     | Retain                                             |

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

## Remaining Repository Hardening v2 work

| Work item                                     | Status                          | Required outcome                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `S2` snapshot policy selection                | Blocked pending evidence import | Import and validate an authoritative snapshot benchmark artifact, then commit the deterministic selected policy. The measurement job exists, but no selected production constant has been committed. |
| `C2` canonical facts and finalizer            | Not started                     | Introduce one immutable `LocateExecutionFactsV2` and one pure public-result finalizer.                                                                                                               |
| `C3` production authority cutover             | Not started                     | Switch production to canonical facts and remove schema-1.0 decision authorities.                                                                                                                     |
| `C4` materialization and transport flattening | Not started                     | Remove ordinary-data projection/transport registries and prepare the breaking package cutover while keeping `repo-nav/legacy-v1` available.                                                          |
| `V2` atomic `2.0.0` cutover                   | Not started                     | In one breaking change, update all version authorities to `2.0.0` and remove only `repo-nav/legacy-v1`.                                                                                              |

The maintained execution plan is [`docs/superpowers/plans/2026-08-12-repository-hardening-v2-replan.md`](superpowers/plans/2026-08-12-repository-hardening-v2-replan.md).

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
