import { describe, expect, it } from 'vitest';

import {
  bindRawDiscoveryLocatorV2,
  projectExpandedSafePreCapPoolV2,
} from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import {
  createScopeCoverageBasisV2,
  requireScopeCoverageBasisV2,
} from '../../src/evidence/request-snapshot/scope-coverage-basis-v2.js';
import {
  readScopeFoldedSafePoolProofV2,
  readScopeFoldedSelectorFactsV2,
  scopeFoldSafeCandidatePoolV2,
} from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import {
  createTrustedRepositoryScopePolicyAdapterV1,
  observeTrustedScopeEligibilityV2,
} from '../../src/evidence/request-snapshot/trusted-scope-policy-adapter-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import type {
  EligibleDiscoveryRefV2,
  OpaqueFileBucketRefV2,
} from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { bindStableEligibleScopeDecisionsV2 } from '../../src/evidence/request-snapshot/scope-classification-views-v2.js';
import {
  buildScopeCoverageV1,
  createRepositoryScopePolicyV1,
  requireScopeCoverageFactsV1,
  resolveRepositoryScopeV1,
  unmatchedLayersFromMatchedV1,
} from '../../src/evidence/scope/index.js';
import { DISCOVERY_IDENTITIES_V1 } from '../../testkit/fixtures/scope-v1/discovery-identities-v1.js';
import { STABLE_POOL_LAYERS_V1 } from '../../testkit/fixtures/scope-v1/stable-pool-layers-v1.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'filter-counts',
  }),
)('F7-FILTER-001 filter-counts', () => {
  it('decides once per interned locator and counts unique excluded identities', () => {
    const execution = executionToken();
    const shared = DISCOVERY_IDENTITIES_V1.samePathFile;
    const refs = DISCOVERY_IDENTITIES_V1.samePathBackends.map((backend) =>
      bindRawDiscoveryLocatorV2(
        {
          source: 'backend',
          backend,
          pathFlavor: 'native',
          rawPath: shared,
        },
        execution,
      ),
    );
    expect(refs[0]).toBeDefined();
    expect(refs[0]).toBe(refs[1]);

    const excluded = bindRawDiscoveryLocatorV2(
      {
        source: 'backend',
        backend: 'ripgrep',
        pathFlavor: 'native',
        rawPath: DISCOVERY_IDENTITIES_V1.excludedFile,
      },
      execution,
    );
    expect(excluded).toBeDefined();

    const preCap = projectExpandedSafePreCapPoolV2(
      [
        {
          locatorRef: refs[0]!,
          safeFile: 'safe-shared.ts',
          safeSymbol: '',
          lineStart: 1,
          lineEnd: 1,
          source: 'ripgrep',
        },
        {
          locatorRef: refs[1]!,
          safeFile: 'safe-shared.ts',
          safeSymbol: '',
          lineStart: 1,
          lineEnd: 1,
          source: 'codegraph',
        },
        {
          locatorRef: excluded!,
          safeFile: 'docs/out.md',
          safeSymbol: '',
          lineStart: 1,
          lineEnd: 1,
          source: 'ripgrep',
        },
      ],
      true,
      execution,
    );
    const adapter = createTrustedRepositoryScopePolicyAdapterV1(
      createRepositoryScopePolicyV1(),
      execution,
    );
    const observation = observeTrustedScopeEligibilityV2({
      adapter,
      preCapPool: preCap,
      resolvedScope: resolveRepositoryScopeV1(undefined),
      execution,
    });
    const folded = scopeFoldSafeCandidatePoolV2(preCap, observation, execution);
    const facts = readScopeFoldedSelectorFactsV2(folded, execution);
    expect(facts.excludedLedger).toHaveLength(1);
    expect(facts.excludedLedger[0]?.locatorRef).toBe(excluded);
  });
});

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'unmatched-stable-pool',
  }),
)('F7-UNMATCHED-001 unmatched-stable-pool', () => {
  it('computes unmatched from post-final matched set in enum order', async () => {
    const execution = executionToken();
    const registered = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/scope-unmatched',
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
    const preCap = projectExpandedSafePreCapPoolV2([], true, execution);
    const folded = scopeFoldSafeCandidatePoolV2(preCap, [], execution);
    const foldProof = readScopeFoldedSafePoolProofV2(folded, execution);
    const basis = createScopeCoverageBasisV2({
      excludedLocatorRefs: [],
      mixedIncludedLocatorRefs: [],
      stableEligiblePool: registered.eligibleDiscovery,
      snapshotProof: registered.proof,
      foldProof,
      execution,
    });
    expect(
      requireScopeCoverageBasisV2(
        basis,
        registered.eligibleDiscovery,
        registered.proof,
        foldProof,
        execution,
      ).outsideLayerHintCount,
    ).toBe(0);

    const resolved = resolveRepositoryScopeV1(undefined);
    const matched = new Set([STABLE_POOL_LAYERS_V1.matchedServer]);
    const unmatched = unmatchedLayersFromMatchedV1(resolved.effective, matched);
    expect(unmatched).toEqual([
      ...STABLE_POOL_LAYERS_V1.unmatchedWithoutServer,
    ]);

    const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    bindStableEligibleScopeDecisionsV2({
      pool: registered.eligibleDiscovery,
      snapshotProof: registered.proof,
      foldProof,
      execution,
      records: Object.freeze([
        Object.freeze({
          eligibleRef,
          fileBucketRef: createOpaqueTokenV2<OpaqueFileBucketRefV2>(),
          decision: Object.freeze({
            layer: STABLE_POOL_LAYERS_V1.matchedServer,
            included: true,
            confirmation: 'allowed' as const,
          }),
        }),
      ]),
    });

    const facts = buildScopeCoverageV1(
      registered.eligibleDiscovery,
      registered.proof,
      foldProof,
      basis,
      resolved,
      execution,
    );
    const view = requireScopeCoverageFactsV1(
      facts,
      registered.eligibleDiscovery,
      registered.proof,
      foldProof,
      basis,
      resolved,
      execution,
    );
    expect(view.fragment.value.unmatchedLayers).toEqual([
      ...STABLE_POOL_LAYERS_V1.unmatchedWithoutServer,
    ]);
    expect(view.fragment.value.effective).toEqual([
      ...STABLE_POOL_LAYERS_V1.effective,
    ]);
  });
});
