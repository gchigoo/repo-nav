import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  LocateRequest,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { asTraceableSearchBackendsV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { projectExpandedSafePreCapPoolV2 } from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import { createScopeCoverageBasisV2 } from '../../src/evidence/request-snapshot/scope-coverage-basis-v2.js';
import {
  readScopeFoldedSafePoolProofV2,
  scopeFoldSafeCandidatePoolV2,
} from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import { projectAndScopeFoldExpandedHitsV2 } from '../../src/evidence/request-snapshot/expanded-lane-bridge-v2.js';
import { LOCATE_EXECUTION_FACT_FAMILIES_V2 } from '../../src/contracts/v2/locate-execution-facts-v2.js';
import {
  buildScopeCoverageV1,
  legacyResolveRepositoryLayerV1,
  requireScopeCoverageFactsV1,
  requireScopeOutcomeContributionV2,
  resolveRepositoryLayerV1,
  resolveRepositoryScopeV1,
  ScopeCoverageInvariantError,
} from '../../src/evidence/scope/index.js';
import type { ScopeCoverageProofV1 } from '../../src/evidence/scope/scope-coverage-v1.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { LARGE_SCOPE_PERMUTATION_V1 } from '../../testkit/fixtures/scope-v1/large-scope-permutation-v1.js';
import { SCOPE_PROOF_MUTATIONS_V1 } from '../../testkit/fixtures/scope-v1/scope-proof-mutations-v1.js';
import { V1_POLICY_DELTA_V1 } from '../../testkit/fixtures/scope-v1/v1-policy-delta-v1.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'trust-proof',
  }),
)('F7-TRUST-001 trust-proof', () => {
  it('fails closed on coverage proof/pool/execution mutations', async () => {
    expect(SCOPE_PROOF_MUTATIONS_V1).toContain('cross-execution');
    const execution = executionToken();
    const other = executionToken();
    const registered = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/scope-trust',
      loadedFiles: [],
      evidencePool: {
        records: [],
        preRankingPoolTruncated: false,
        safeSelectionCollision: false,
      },
      eligiblePool: { records: [] },
      gitState: 'unknown',
      signal: new AbortController().signal,
      execution,
    });
    const preCap = projectExpandedSafePreCapPoolV2([], true, execution);
    const folded = scopeFoldSafeCandidatePoolV2(preCap, [], execution);
    const foldProof = readScopeFoldedSafePoolProofV2(folded, execution);
    const resolved = resolveRepositoryScopeV1(undefined);
    const basis = createScopeCoverageBasisV2({
      excludedLocatorRefs: [],
      mixedIncludedLocatorRefs: [],
      stableEligiblePool: registered.eligibleDiscovery,
      snapshotProof: registered.proof,
      foldProof,
      execution,
    });
    const facts = buildScopeCoverageV1(
      registered.eligibleDiscovery,
      registered.proof,
      foldProof,
      basis,
      resolved,
      execution,
    );
    expect(() =>
      requireScopeCoverageFactsV1(
        facts,
        registered.eligibleDiscovery,
        registered.proof,
        foldProof,
        basis,
        resolved,
        other,
      ),
    ).toThrow(ScopeCoverageInvariantError);

    const view = requireScopeCoverageFactsV1(
      facts,
      registered.eligibleDiscovery,
      registered.proof,
      foldProof,
      basis,
      resolved,
      execution,
    );
    expect(view.contribution.owner).toBe('scope');
    const forgedProof = createOpaqueTokenV2<ScopeCoverageProofV1>();
    expect(() =>
      requireScopeOutcomeContributionV2(
        facts,
        forgedProof,
        registered.eligibleDiscovery,
        registered.proof,
        foldProof,
        basis,
        resolved,
        execution,
      ),
    ).toThrow(ScopeCoverageInvariantError);
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'real-owner-envelope',
  }),
)('F7-ENVELOPE-001 real-owner-envelope', () => {
  it('mounts scope and capability in the six canonical fact families', async () => {
    expect(LOCATE_EXECUTION_FACT_FAMILIES_V2).toContain('scope');
    expect(LOCATE_EXECUTION_FACT_FAMILIES_V2).toContain('capability');

    const root = mkdtempSync(join(tmpdir(), 'f7-envelope-'));
    try {
      mkdirSync(join(root, 'src', 'server'), { recursive: true });
      writeFileSync(
        join(root, 'src', 'server', 'mapping.ts'),
        'export const Mapping = 1;\n',
        'utf8',
      );
      class HitBackend implements RepositorySearchBackend {
        public readonly id = 'ripgrep' as const;
        public async probe(): Promise<BackendHealth> {
          return { state: 'available' };
        }
        public async search(
          _request: BackendSearchRequest,
        ): Promise<BackendSearchResult> {
          return {
            health: { state: 'available' },
            hits: Object.freeze([
              Object.freeze({
                file: 'src/server/mapping.ts',
                lines: Object.freeze([1, 1] as [number, number]),
                matchedText: 'Mapping',
                source: 'ripgrep' as const,
                reasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
              }),
            ]),
            complete: true,
          };
        }
      }
      const executor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([new HitBackend()]),
        new NodeRepositoryReader(),
      );
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const request: LocateRequest = {
        repoPath: root,
        question: 'Where is Mapping?',
        terms: ['Mapping'],
        termCase: 'sensitive',
      };
      const executed = await executor.execute(
        request,
        { signal: new AbortController().signal },
        capability,
      );
      expect(executed.input.ok).toBe(true);
      if (!executed.input.ok) {
        throw new Error('expected success');
      }
      expect(executed.input.facts.scope.policy).toBe('repo-scope-v1');
      expect(executed.input.facts.capability.semanticLanguages).toEqual([
        'typescript',
        'javascript',
        'sql',
      ]);
      expect(Object.keys(executed.input.facts).sort()).toEqual(
        [...LOCATE_EXECUTION_FACT_FAMILIES_V2].sort(),
      );
      const projected = new V2LocateResultProjector().project(
        executed,
        capability,
      );
      expect(projected.value.ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'v1-compatibility',
  }),
)('F7-V1-001 v1-compatibility', () => {
  it('keeps v1 projector deep-exact and intentional policy deltas fixed', async () => {
    const resolved = resolveRepositoryScopeV1(undefined);
    expect(resolved.policyVersion).toBe('repo-scope-v1');
    expect(resolved.effective).not.toContain('test');
    expect(resolved.effective).not.toContain('docs');

    for (const row of V1_POLICY_DELTA_V1) {
      expect(legacyResolveRepositoryLayerV1(row.path)).toBe(row.legacy);
      expect(resolveRepositoryLayerV1(row.path)).toBe(row.current);
    }

    const root = mkdtempSync(join(tmpdir(), 'f7-v1-'));
    try {
      mkdirSync(join(root, 'server'), { recursive: true });
      writeFileSync(
        join(root, 'server', 'a.ts'),
        'export const Mapping = 1;\n',
      );
      class EmptyBackend implements RepositorySearchBackend {
        public readonly id = 'ripgrep' as const;
        public async probe(): Promise<BackendHealth> {
          return { state: 'available' };
        }
        public async search(): Promise<BackendSearchResult> {
          return { health: { state: 'available' }, hits: [], complete: true };
        }
      }
      const executor = new CanonicalRepositoryLocateExecutorV2(
        asTraceableSearchBackendsV2([new EmptyBackend()]),
        new NodeRepositoryReader(),
      );
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const request: LocateRequest = {
        repoPath: root,
        question: 'Where is Mapping?',
        terms: ['Mapping'],
      };
      const executed = await executor.execute(
        request,
        { signal: new AbortController().signal },
        capability,
      );
      const projector = new V2LocateResultProjector();
      const first = projector.project(executed, capability);
      const second = projector.project(executed, capability);
      expect(second.value).toEqual(first.value);
      expect(first.value).toBeDefined();
      expect(first.compactJson).toBe(JSON.stringify(first.value));
      expect(first.utf8Bytes).toBe(
        Buffer.byteLength(first.compactJson, 'utf8'),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'large-scope-permutation',
  }),
)('F7-LARGE-001 large-scope-permutation', () => {
  it('keeps fold membership/outside/fragment stable across five permutations', async () => {
    const hitCount = LARGE_SCOPE_PERMUTATION_V1.hitCount;
    const baseHits = Array.from({ length: hitCount }, (_, index) =>
      Object.freeze({
        file: `${LARGE_SCOPE_PERMUTATION_V1.filePrefix}${index}.ts`,
        lines: Object.freeze([1, 1] as [number, number]),
        matchedText: 'hit',
        source: index % 2 === 0 ? 'ripgrep' : 'codegraph',
        reasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
      }),
    );
    const docsHits = Object.freeze([
      Object.freeze({
        file: 'docs/outside.md',
        lines: Object.freeze([1, 1] as [number, number]),
        matchedText: 'hit',
        source: 'ripgrep' as const,
        reasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
      }),
    ]);

    const fragments = new Set<string>();
    const outsideCounts = new Set<number>();
    const selectedCounts = new Set<number>();

    for (
      let permutation = 0;
      permutation < LARGE_SCOPE_PERMUTATION_V1.permutations;
      permutation += 1
    ) {
      const execution = executionToken();
      const ordered = [...baseHits, ...docsHits].sort((left, right) => {
        const leftKey = `${left.file}:${left.source}`;
        const rightKey = `${right.file}:${right.source}`;
        const leftHash = (leftKey.length + permutation * 17) % 97;
        const rightHash = (rightKey.length + permutation * 17) % 97;
        return leftHash - rightHash || leftKey.localeCompare(rightKey);
      });
      const expanded = projectAndScopeFoldExpandedHitsV2({
        expandedResults: Object.freeze([
          Object.freeze({
            health: Object.freeze({ state: 'available' as const }),
            hits: Object.freeze(ordered),
            complete: true,
          }),
        ]),
        execution,
        layerHint: 'server',
      });
      const facts = expanded.facts;
      selectedCounts.add(facts.candidates.length);
      outsideCounts.add(facts.excludedLedger.length);

      const registered = await runFinalSnapshotCheckV2({
        repositoryRoot: '/tmp/scope-large',
        loadedFiles: [],
        evidencePool: {
          records: [],
          preRankingPoolTruncated: false,
          safeSelectionCollision: false,
        },
        eligiblePool: { records: [] },
        gitState: 'unknown',
        signal: new AbortController().signal,
        execution,
      });
      const foldProof = readScopeFoldedSafePoolProofV2(
        expanded.foldedView,
        execution,
      );
      const basis = createScopeCoverageBasisV2({
        excludedLocatorRefs: facts.excludedLedger.map(
          (entry) => entry.locatorRef,
        ),
        mixedIncludedLocatorRefs: [],
        stableEligiblePool: registered.eligibleDiscovery,
        snapshotProof: registered.proof,
        foldProof,
        execution,
      });
      const coverage = buildScopeCoverageV1(
        registered.eligibleDiscovery,
        registered.proof,
        foldProof,
        basis,
        expanded.resolvedScope,
        execution,
      );
      const view = requireScopeCoverageFactsV1(
        coverage,
        registered.eligibleDiscovery,
        registered.proof,
        foldProof,
        basis,
        expanded.resolvedScope,
        execution,
      );
      fragments.add(
        JSON.stringify({
          requested: view.fragment.value.requested,
          effective: view.fragment.value.effective,
          unmatched: view.fragment.value.unmatchedLayers,
          outside: view.contribution.outsideLayerHintCount,
          selected: facts.candidates
            .map((candidate) => candidate.safeKey.file)
            .sort(),
        }),
      );
    }

    expect(fragments.size).toBe(1);
    expect(outsideCounts.size).toBe(1);
    expect(selectedCounts.size).toBe(1);
    expect([...outsideCounts][0]).toBeGreaterThanOrEqual(1);
  });
});
