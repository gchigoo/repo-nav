# Repository Hardening and v2 Cutover Design

**Date:** 2026-07-31

**Status:** Implemented in the `2.0.0` source candidate. The `1.1.0` hardening foundation merged on 2026-08-14; snapshot policy selection, canonical authority, transport flattening, and the atomic package cutover were implemented on 2026-08-16. Publishing and owner-bound release evidence remain external. Reviewed 2026-08-16.

The implementation covers the correctness/release blockers, feedback-loop work, verified-file consolidation, CLI fast path, authoritative snapshot policy selection, canonical execution facts, one pure finalizer, flattened transport, quality boundaries, and removal of the public `repo-nav/legacy-v1` subpath. See [`../plans/2026-08-12-repository-hardening-v2-replan.md`](../plans/2026-08-12-repository-hardening-v2-replan.md) and [`../../project-status.md`](../../project-status.md).

## 1. Context

RepoNav has strong read-only repository boundaries, path containment, bounded process execution, public-output budgets, strict v2 schemas, deterministic ordering, and sensitive-value redaction. A repository-wide audit nevertheless identified eight defects and four high-leverage simplification opportunities:

1. Production CodeGraph fallback execution can lose backend trace and report a complete ripgrep no-result as `partial` instead of `no_result`.
2. The one-shot CLI treats ordinary stdin EOF as caller cancellation.
3. The real-consumer release gate can accept cancelled or `ok:false` output and hard-code unmeasured attestations as true.
4. Spawn failures are collapsed into executable-not-found even when the failure is permission or host related.
5. Snapshot stability uses inode, size, and millisecond-truncated mtime without binding identity to the bytes read.
6. The core execution path maintains legacy v1 results, v2 facts, backend traces, request outcomes, and final materialized output as competing authorities.
7. CI repeatedly rebuilds and repeatedly loads the full Vitest surface for individual platform-contract cases.
8. Test and testkit code is larger than production code but is excluded from ESLint and Prettier.
9. Public installation and security-support documentation points users to the obsolete npm beta line.
10. Plain `npm test` depends on x64 and an optional CodeGraph installation.
11. The production dependency closure contains moderate vulnerabilities fixed by MCP SDK 1.30.0, while the audit gate ignores all moderate findings.
12. Help/version eagerly import the complete application graph, and probe serializes independent backend health checks.

The implementation must fix the release and correctness blockers first, improve feedback speed second, then remove the architectural conditions that allowed multiple truth sources to diverge. The final stack will also remove the public `repo-nav/legacy-v1` subpath and therefore culminate in a 2.0.0 breaking release cutover.

## 2. Goals

1. Restore correct public status, backend coverage, index observation, cancellation, spawn-failure, and snapshot-stability semantics.
2. Make release evidence fail closed and ensure every attestation is measured.
3. Make the documented default test command hermetic across supported Node versions and Apple Silicon without optional host tools.
4. Remove known, readily fixable production dependency vulnerabilities and replace global severity exemptions with explicit disposition policy.
5. Align npm installation instructions, supported-version policy, package metadata, and release checks.
6. Reduce CI rebuilds and platform-runner process startup without weakening the cross-platform contract matrix.
7. Put test and testkit code inside formatting, linting, and asynchronous-safety boundaries.
8. Replace internal v1/v2 dual authority with one canonical v2 execution-facts model.
9. Remove the public legacy-v1 export and release the breaking cutover as 2.0.0.
10. Consolidate file resolution, verified open, identity, content digest, and final snapshot revalidation.

## 3. Non-Goals

1. Do not weaken path containment, symlink defense, fatal UTF-8 decoding, byte budgets, redaction, deterministic ordering, process cleanup, or deadline cancellation.
2. Do not change the public v2 MCP tool name, input schema, output schema, CLI JSON shape, or recoverable-error channel except where current output is demonstrably incorrect.
3. Do not reduce Linux, Windows, or macOS Intel coverage to compensate for CI cost; add at least one macOS ARM unit cell instead.
4. Do not remove Nest solely to reduce dependency count. First isolate CLI fast paths and measure cold start, RSS, and installation impact.
5. Do not parallelize CodeGraph query-plan entries until deterministic budget and merge behavior has a measured design.
6. Do not publish, push tags, or mutate npm dist-tags as part of implementation. The plan prepares a 2.0.0 candidate; owner-controlled release remains external.

## 4. Delivery Strategy

The work is organized as a small-PR dependency DAG rather than one large refactor.

### Phase A: Correctness and release blockers

- **A1 — CLI lifecycle correctness:** remove stdin-EOF cancellation and add bin-level closed-stdin tests.
- **A2 — Real-consumer release gate:** fail closed on exit, schema, status, and evidence; measure or remove attestations. Depends on A1.
- **A3 — Backend trace and fallback correctness:** make trace-aware multi-view execution mandatory in the canonical path and derive fallback completeness from outcomes.
- **A4 — Spawn failure classification:** preserve a sanitized internal spawn reason and distinguish missing executable from other failures.
- **A5 — Snapshot content identity:** bind loaded bytes to identity and detect same-size/restored-mtime mutation.
- **A6 — Hermetic tests and ARM coverage:** move CodeGraph live smoke to an explicit integration surface, remove unconditional x64 assumptions, and run unit tests on macOS ARM.
- **A7 — Release metadata and dependency security:** upgrade MCP SDK, strengthen audit policy, and align install/security documentation.

A1, A3, A4, A5, A6, and A7 can proceed independently. A2 must follow A1.

### Phase B: Feedback-loop efficiency

- **B1 — CI build and platform batching:** build once per matrix cell and run platform identities in at most one unit and one MCP Vitest process.
- **B2 — Test quality boundary:** include test/testkit in formatting and linting, then enable promise-safety rules with a finite migration inventory.
- **B3 — CLI fast path and concurrent probe:** avoid eager application-graph import for help/version and probe backends concurrently while preserving order.

B1 depends on A6 because test surfaces and selection semantics change there. B3 depends on A1 because both touch the CLI entry lifecycle.

### Phase C: Canonical v2 authority and breaking cutover

- **C1 — Canonical execution facts:** introduce one immutable `LocateExecutionFactsV2` and one pure public-result finalizer.
- **C2 — Remove internal legacy authority:** migrate internal consumers away from schema 1.0 `LocateResult`, delete compatibility decision paths, and keep v2 deep-exact.
- **C3 — Flatten projection registries:** replace ordinary-data WeakMap/token recovery stages with explicit readonly values and a single validated boundary.
- **C4 — Remove public legacy-v1:** delete the subpath export and unused v1 contracts/bridges, add negative package-export tests, and update migration documentation.
- **C5 — 2.0.0 release cutover:** update version sources, package metadata, shrinkwrap, supported-version policy, install docs, package checks, SBOM expectations, and release evidence.

C1 depends on A3. C2 depends on C1. C3 depends on C2. C4 depends on C2 and must be reviewed as a breaking API change. C5 depends on C3 and C4.

### Phase D: Verified-file boundary consolidation

- **D1 — Unified verified open:** consolidate canonical resolution, root containment, handle stat, bounded read, identity, and digest in one primitive. Depends on A5.
- **D2 — Revalidation policy:** use benchmark evidence to select retained-only digest revalidation or conditional revalidation without weakening fail-closed semantics.

D1 may proceed in parallel with Phase C after A5. D2 depends on D1.

## 5. Architecture

### 5.1 Backend execution authority

The public compatibility port remains temporarily available during Phase A:

```ts
export interface RepositorySearchBackend {
  readonly id: SearchBackendId;
  probe(repositoryRoot: string, signal: AbortSignal): Promise<BackendHealth>;
  search(
    request: BackendSearchRequest,
    signal: AbortSignal,
  ): Promise<BackendSearchResult>;
}
```

The canonical v2 execution path uses a mandatory internal trace-aware interface:

```ts
export interface TraceableRepositorySearchBackendV2 {
  readonly id: SearchBackendId;
  searchViews(
    request: MultiViewBackendSearchRequestV2,
    signal: AbortSignal,
    context: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2>;
}
```

CodeGraph and ripgrep both implement the trace-aware interface. `searchBackendMultiViewV2` no longer conditionally checks for `searchViews` in the canonical path. The execution trace is the only authority for backend outcomes, index observation, fallback invocation, fallback acceptance, and strategy completeness.

Control-flow booleans may decide whether to call fallback, but `skipFallback`, `fallbackRequired`, and `completeEquivalentFallback` cannot be independent inputs to final status. The finalizer derives public coverage and status from validated outcomes.

### 5.2 CLI lifecycle and import boundary

The CLI has two import layers:

1. A lightweight layer containing argument parsing, help text, version metadata, signal setup, output writing, and exit-code mapping.
2. A dynamically imported application layer containing Nest, MCP, evidence, and backend composition.

Help and version complete entirely within the lightweight layer. Locate and probe dynamically import the application adapter after parsing. One-shot CLI cancellation is owned by SIGINT, SIGTERM, explicit caller signals, and request deadlines. Stdin EOF is not a cancellation protocol.

Probe executes independent backend health checks with `Promise.all`, preserving registration order when assembling output.

### 5.3 Spawn-failure sanitization

The process kernel captures and immediately normalizes child spawn errors into a restricted internal enum:

```ts
export type SpawnFailureReasonV2 = 'not-found' | 'permission-denied' | 'other';
```

Raw error messages, paths, and host details remain private. Only `not-found` maps to tool unavailable. Permission and other failures map to backend error. Buffered and streaming projections preserve the normalized reason until backend outcome construction.

### 5.4 Snapshot identity and verified file reads

A verified-file snapshot binds canonical path identity to the bytes actually read:

```ts
export interface VerifiedFileSnapshotV2 {
  readonly locator: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly identity: {
    readonly dev: bigint;
    readonly ino: bigint;
    readonly size: bigint;
    readonly mtimeNs: bigint;
    readonly ctimeNs: bigint;
  };
  readonly contentSha256: string;
}
```

A single file handle supplies regular-file validation, stat identity, bounded bytes, fatal UTF-8 decoding, and digest. Metadata is a fast rejection signal; the content digest is the evidence-integrity authority. Final snapshot verification revalidates at least files referenced by retained evidence. Alias and symlink checks continue to fail closed.

### 5.5 Release evidence

A real-consumer locate observation passes only when all of the following are true:

- process exit code is zero;
- parsed result has `ok: true`;
- `evidence.schemaVersion` is `2.0`;
- status is not `cancelled` or `timeout`;
- the known request produces either expected retained evidence or a demonstrably complete `no_result`;
- stdout/stderr obey the documented channel contract.

Every release attestation field is computed from an actual check. Fields that cannot be measured are removed from the evidence schema. Cancelled output, `ok:false`, incorrect schema, nonzero exit, mutated worktree/index, parity mismatch, or forbidden-output detection all fail closed.

### 5.6 Canonical execution facts

Phase C introduces one immutable model:

```ts
export interface LocateExecutionFactsV2 {
  readonly backend: BackendExecutionTraceViewV2;
  readonly snapshot: SnapshotFactsV2;
  readonly ranking: RankedEvidenceFactsV2;
  readonly scope: ScopeFactsV2;
  readonly capability: CapabilityFactsV2;
  readonly abort: FinalizedAbortDecisionV2;
}
```

One pure finalizer derives status, coverage, next actions, and the public v2 result. Backend, snapshot, ranking, scope, capability, and abort subsystems each contribute once. No internal schema 1.0 result participates in decisions.

Projection becomes:

```text
collect canonical facts
→ validate prerequisites and ownership
→ pure materialization
→ strict schema and budget validation
→ deterministic serialization
```

Opaque capability tokens remain only where runtime non-forgeability is a real boundary. WeakMap registries used only to transport ordinary business data are removed.

### 5.7 Legacy-v1 removal and 2.0.0

The plan directly removes the public `repo-nav/legacy-v1` subpath. Before removal, internal references to v1 contracts are migrated to v2 or clearly named private internal types. The cutover then:

- deletes `src/legacy-v1.ts`;
- removes `./legacy-v1` from `package.json.exports`;
- deletes unused v1 schemas, projectors, bridges, tests, and fixtures;
- adds negative installed-package tests proving the subpath is unavailable;
- updates migration documentation with explicit field and API replacements;
- updates all version authorities to 2.0.0 in the final release-candidate PR.

The breaking removal cannot ship as a 1.x release.

## 6. Test and Verification Design

### 6.1 Hermetic unit surface

Plain `npm test` must run without network access, CodeGraph, architecture-specific assumptions, or prebuilt `dist`. Runtime-cell checks validate an explicitly supplied CI cell; ordinary local runs validate only supported platform and Node-major invariants.

### 6.2 Production-wiring integration

Production-wiring tests instantiate actual providers and must not wrap fixture backends with synthetic `searchViews`. They cover:

- CodeGraph unavailable plus complete ripgrep no-hit;
- backend trace and index observation;
- closed-stdin built CLI behavior;
- sanitized spawn-failure classification;
- same-size/restored-mtime file mutation;
- real-consumer negative cases.

### 6.3 Optional-tool integration

A dedicated `test:integration:codegraph` command owns the live CodeGraph 1.1.6 smoke. CI jobs that install the pinned tool run it explicitly. Local unit tests do not.

### 6.4 Platform selection batching

Platform tests use exact `(group, caseId)` identities rather than independent group and case sets. The runner can therefore select multiple identities without cross-product execution. The platform orchestrator invokes at most one unit Vitest process and one MCP Vitest process per OS/cell and collects multiple contract markers from each result.

### 6.5 Quality boundary

Prettier covers src, tools, scripts, test, and testkit. ESLint uses a separate test/testkit configuration so production restrictions and test-specific globals remain explicit. Promise-safety rules are enabled after a finite baseline migration; permanent whole-tree ignores are not acceptable.

### 6.6 Required per-PR loop

Every PR follows test-driven development:

1. Add the smallest failing regression or characterization test.
2. Run it and confirm the expected failure reason.
3. Implement the minimal behavior or refactor.
4. Run the target test and affected surface.
5. Run typecheck, lint, and format.
6. Run an independent reviewer gate before merge.

Changes to public output, process execution, snapshot behavior, release tooling, package metadata, or projection additionally run Golden, MCP, docs, package smoke, closure, audit, and SBOM checks as applicable.

## 7. Compatibility and Release Rules

1. The v2 root package API, MCP tool name, v2 input/output schema, and CLI JSON remain stable through Phases A and B.
2. Deterministic ordering remains mandatory even when health probes or test execution become concurrent.
3. The public legacy-v1 removal occurs only in the 2.0.0 cutover portion of the stack.
4. The SDK upgrade is limited to an audited compatible 1.30.x release unless a separate dependency design approves a larger change.
5. No implementation PR publishes packages or changes remote dist-tags.
6. Phase A can support a 1.x corrective release before the breaking cutover if the owner chooses, but the complete stack ending in C5 is a 2.0.0 candidate.

## 8. Acceptance Criteria

### Phase A

- CodeGraph unavailable plus complete ripgrep no-hit returns `no_result`, records both backend attempts, and reports a deterministic index observation.
- Closed stdin does not produce caller cancellation for locate or probe.
- Real-consumer E2E rejects cancelled output, `ok:false`, incorrect schema, nonzero exit, parity mismatch, and unmeasured attestations.
- Non-ENOENT spawn failure is not reported as tool unavailable.
- Same-size content mutation with restored mtime is detected and affected evidence is purged.
- Plain `npm test` passes on macOS arm64 without CodeGraph.
- An actual PR/push macOS ARM unit job exists.
- `npm audit --omit=dev` has no undisposed moderate production finding.
- Public installation instructions resolve to the version represented by package metadata, and SECURITY covers the maintained release line.

### Phase B

- Each cross-platform cell builds production output once.
- Platform contracts start no more than one unit and one MCP Vitest process per cell.
- Test/testkit is included in formatting and baseline lint gates.
- Help/version do not import the Nest/MCP application graph.
- Probe health checks execute concurrently and preserve deterministic output order.

### Phase C

- Status, coverage, and next actions have one canonical derivation point.
- The core executor no longer constructs schema 1.0 `LocateResult` as an internal authority.
- Ordinary projection data no longer requires multi-stage WeakMap recovery.
- `repo-nav/legacy-v1` is absent from the installed package and fails an explicit negative import/export check.
- The release-candidate version authorities consistently report 2.0.0.

### Phase D

- Canonical resolution, containment, stat, read, identity, and digest share one verified-open implementation.
- Final revalidation detects same-size and restored-timestamp mutations.
- Benchmark evidence documents the chosen digest revalidation policy.

### Final aggregate

- Build, typecheck, lint, format, unit, Golden, MCP, docs, platform, package smoke, closure, audit, SBOM, and real-repository benchmarks pass.
- Public v2 fixtures remain deep-exact except for specifically approved corrections to previously wrong status or coverage.
- Working tree and target repositories remain unmodified by read-only operations.

## 9. Risks and Mitigations

1. **Backend trace migration changes public status.** Preserve characterization fixtures for all existing transition families and explicitly approve only the corrected fallback cases.
2. **Snapshot digest adds I/O.** Revalidate retained files first, benchmark loaded-versus-retained counts, and retain byte limits.
3. **Test batching can accidentally select cross-product cases.** Replace independent group/case filters with exact identity tuples before batching.
4. **Promise-safety lint can create a large migration diff.** Split formatting, baseline lint, and promise-safety into separate PRs with zero permanent suppressions.
5. **Canonical facts refactor can become a rewrite.** Introduce the model behind characterization tests, migrate one fact family at a time, and delete old authority only after each replacement is active.
6. **Legacy removal breaks consumers.** Treat C4/C5 as an explicit major-version cutover, provide migration mappings, and validate the installed export map.
7. **Concurrent probe output can become nondeterministic.** Preserve array indices and assemble results in registration order after `Promise.all`.

## 10. Rollback Boundaries

Each pre-cutover PR must be independently revertible. Phase A fixes do not depend on Phase C. If canonical-facts or projection flattening fails review, the corrected Phase A behavior remains shippable. The final V2 source cutover is one atomic commit that changes all version authorities to `2.0.0` and removes only `repo-nav/legacy-v1`; reverting that commit restores both the prior version authorities and the legacy subpath together. The atomic source cutover does not include npm publication.
