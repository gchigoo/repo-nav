import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BackendHealth,
  BackendSearchResult,
  LocateRequest,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import { asTraceableSearchBackendsV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { V2LocateResultProjector } from '../../src/evidence/locate-execution/v2-locate-result-projector.js';
import { createAcceptedCompleteRealLocateShadowOrchestratorV2 } from '../../src/evidence/canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import { projectAndScopeFoldExpandedHitsV2 } from '../../src/evidence/request-snapshot/expanded-lane-bridge-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { createScopeCoverageBasisV2 } from '../../src/evidence/request-snapshot/scope-coverage-basis-v2.js';
import { readScopeFoldedSafePoolProofV2 } from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  buildScopeCoverageV1,
  legacyResolveRepositoryLayerV1,
  requireScopeCoverageFactsV1,
  resolveRepositoryLayerV1,
  resolveRepositoryScopeV1,
} from '../../src/evidence/scope/index.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { LARGE_SCOPE_PERMUTATION_V1 } from '../../testkit/fixtures/scope-v1/large-scope-permutation-v1.js';
import { V1_POLICY_DELTA_V1 } from '../../testkit/fixtures/scope-v1/v1-policy-delta-v1.js';
import { isSelected } from '../../testkit/testing/selection.js';

/**
 * Golden surface for F7 CMD-F7-GOLDEN group selection.
 */
function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'v1-compatibility',
  }),
)('F7-V1-001 v1-compatibility golden', () => {
  it('keeps v2 projector deep-exact and intentional policy deltas fixed', async () => {
    const resolved = resolveRepositoryScopeV1(undefined);
    expect(resolved.policyVersion).toBe('repo-scope-v1');
    expect(resolved.effective).not.toContain('test');
    expect(resolved.effective).not.toContain('docs');

    for (const row of V1_POLICY_DELTA_V1) {
      expect(legacyResolveRepositoryLayerV1(row.path)).toBe(row.legacy);
      expect(resolveRepositoryLayerV1(row.path)).toBe(row.current);
    }

    const root = mkdtempSync(join(tmpdir(), 'f7-golden-v1-'));
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
      const projector = new V2LocateResultProjector(
        createAcceptedCompleteRealLocateShadowOrchestratorV2(),
      );
      const first = projector.project(executed, capability);
      const second = projector.project(executed, capability);
      // Same capability/input → deep-equal public projection (identity not required).
      expect(second.value).toStrictEqual(first.value);
      expect(first.value).toBeDefined();
      expect(first.receipt).toBeDefined();
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
)('F7-LARGE-001 large-scope-permutation golden', () => {
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
        repositoryRoot: '/tmp/scope-large-golden',
        loadedFiles: [],
        evidencePool: {
          records: [],
          preRankingPoolTruncated: false,
          safeSelectionCollision: false,
        },
        eligiblePool: { records: [] },
        gitState: 'unknown',
        signal: new AbortController().signal,
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
