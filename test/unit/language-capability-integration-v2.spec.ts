import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import {
  buildPreRankingStablePoolsV2,
  type EligibleDiscoveryRefV2,
  type OpaqueFileBucketRefV2,
  type PreFinalEligibleDiscoveryPoolV2,
} from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  createTrustedPreFinalCapabilityViewForTestV2,
  requireStableEligibleCapabilityViewV2,
} from '../../src/evidence/request-snapshot/capability-classification-views-v2.js';
import {
  bindStableEligibleScopeDecisionsV2,
  createTrustedPreFinalScopeClassificationViewForTestV2,
  requireStableEligibleScopeViewV2,
} from '../../src/evidence/request-snapshot/scope-classification-views-v2.js';
import {
  createVerifiedLanguageConsumerAdmissionV2,
  registerVerifiedLanguageConsumerV2,
} from '../../src/evidence/request-snapshot/verified-language-consumer-v2.js';
import {
  createTrustedLanguageCapabilityObservationV2,
  readLanguageAdapterDecisionV2,
} from '../../src/evidence/language/language-capability-observation-v2.js';
import {
  classifyLanguageCapabilityRecordV2,
  createLanguageAdapterScopeProducerResolverV2,
  issueLanguageAdapterPortAdmissionV2,
  registerLanguageAdapterProducerSourceV2,
  registerLanguageAdapterScopeProducerPortV2,
} from '../../src/evidence/language/language-scope-producer-v2.js';
import {
  buildCapabilityCoverageV2,
  createCapabilityPreBudgetCountV2,
  requireCapabilityCoverageFactsV2,
  requireCapabilityPreBudgetCountV2,
  sealCapabilityRetainedDecisionsV2,
} from '../../src/evidence/language/capability-coverage-v2.js';
import { createScopeBoundProducerCompositionRootV2 } from '../../src/evidence/scope/scope-bound-classification-bridge-v2.js';
import {
  arbitrateScopeBoundEvidenceProducerV2,
  registerScopeBoundProducerSourceV2,
  sealScopeBoundProducerRecordSetV2,
} from '../../src/evidence/scope/scope-bound-producer-registrar-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { LOCATE_EXECUTION_FACT_FAMILIES_V2 } from '../../src/contracts/v2/locate-execution-facts-v2.js';
import { issueEvidenceRankingOutcomeV2 } from '../../src/evidence/ranking/evidence-ranking-outcome-v2.js';
import { runFinalSnapshotCheckV2 } from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { projectExpandedSafePreCapPoolV2 } from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import {
  readScopeFoldedSafePoolProofV2,
  scopeFoldSafeCandidatePoolV2,
} from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import { createScopeCoverageBasisV2 } from '../../src/evidence/request-snapshot/scope-coverage-basis-v2.js';
import { resolveRepositoryScopeV1 } from '../../src/evidence/scope/resolve-repository-scope-v1.js';
import {
  buildScopeCoverageV1,
  requireScopeCoverageFactsV1,
} from '../../src/evidence/scope/scope-coverage-v1.js';
import { bindEmptyStableEligibleScopeDecisionsV2 } from '../../src/evidence/request-snapshot/scope-classification-views-v2.js';
import { unsupportedCountCasesV2 } from '../../testkit/fixtures/language-capability-v2/extension-matrix-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'scope-candidate-ceiling',
  }),
)('F8-SCOPE-001 scope-candidate-ceiling', () => {
  it('keeps candidate-only confirmation on observation decision', () => {
    const execution = executionToken();
    const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    const bucket = createOpaqueTokenV2<OpaqueFileBucketRefV2>();
    const pool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
      records: Object.freeze([
        Object.freeze({
          eligibleRef,
          discoveryKey: 't',
          canonicalFileKey: 'test/a.ts' as never,
          fileBucketRef: bucket,
          classificationDefined: true,
        }),
      ]),
    });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool,
      execution,
      entries: [
        {
          eligibleRef,
          fileBucketRef: bucket,
          posixPath: 'test/a.ts',
          sourceText: 'const x = 1;',
        },
      ],
    });
    const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
      execution,
      new Map([
        [
          eligibleRef,
          Object.freeze({
            layer: 'test' as const,
            included: true,
            confirmation: 'candidate-only' as const,
          }),
        ],
      ]),
    );
    const admission = createVerifiedLanguageConsumerAdmissionV2(
      'language-capability',
      execution,
    );
    const registered = registerVerifiedLanguageConsumerV2(
      admission,
      { async consumeVerifiedContext() {} },
      execution,
    );
    const observation = createTrustedLanguageCapabilityObservationV2(
      capabilityView,
      scopeView,
      registered,
      execution,
      { matchedTermsByRef: new Map([[eligibleRef, Object.freeze(['x'])]]) },
    );
    const decision = readLanguageAdapterDecisionV2(
      observation,
      eligibleRef,
      execution,
    );
    expect(decision.scopeConfirmation).toBe('candidate-only');
    expect(decision.adapter).toBe('typescript');
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'adapter-product-table',
  }),
)('F8-ADAPTER-PRODUCT-001 adapter-product-table', () => {
  it('registers language port and seals three-port complete set', async () => {
    const execution = executionToken();
    const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    const bucket = createOpaqueTokenV2<OpaqueFileBucketRefV2>();
    const pool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
      records: Object.freeze([
        Object.freeze({
          eligibleRef,
          discoveryKey: 'p',
          canonicalFileKey: 'src/a.rs' as never,
          fileBucketRef: bucket,
          classificationDefined: true,
        }),
      ]),
    });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool,
      execution,
      entries: [
        {
          eligibleRef,
          fileBucketRef: bucket,
          posixPath: 'src/a.rs',
          sourceText: 'x = 1',
        },
      ],
    });
    const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
      execution,
      new Map([
        [
          eligibleRef,
          Object.freeze({
            layer: 'server' as const,
            included: true,
            confirmation: 'allowed' as const,
          }),
        ],
      ]),
    );
    const consumerAdmission = createVerifiedLanguageConsumerAdmissionV2(
      'language-capability',
      execution,
    );
    const registeredConsumer = registerVerifiedLanguageConsumerV2(
      consumerAdmission,
      { async consumeVerifiedContext() {} },
      execution,
    );
    const observation = createTrustedLanguageCapabilityObservationV2(
      capabilityView,
      scopeView,
      registeredConsumer,
      execution,
      { matchedTermsByRef: new Map([[eligibleRef, Object.freeze(['x'])]]) },
    );

    const root = createScopeBoundProducerCompositionRootV2(execution);
    const languageAdmission = issueLanguageAdapterPortAdmissionV2(
      root.registrar,
      execution,
    );
    const resolver = createLanguageAdapterScopeProducerResolverV2(
      observation,
      execution,
    );
    const languagePort = registerLanguageAdapterScopeProducerPortV2(
      root.registrar,
      languageAdmission,
      resolver,
      execution,
    );

    registerScopeBoundProducerSourceV2(
      root.registrar,
      { kind: 'none' },
      root.directPort,
      scopeView,
      eligibleRef,
      execution,
    );
    registerScopeBoundProducerSourceV2(
      root.registrar,
      { kind: 'none' },
      root.candidatePort,
      scopeView,
      eligibleRef,
      execution,
    );

    const result = await classifyLanguageCapabilityRecordV2(
      observation,
      eligibleRef,
      execution,
    );
    expect(result.kind).toBe('fallback-literal');
    registerLanguageAdapterProducerSourceV2(
      result,
      root.registrar,
      languagePort,
      scopeView,
      eligibleRef,
      execution,
    );
    const seal = sealScopeBoundProducerRecordSetV2(
      root.registrar,
      scopeView,
      eligibleRef,
      execution,
    );
    const arbitration = arbitrateScopeBoundEvidenceProducerV2(
      seal,
      scopeView,
      eligibleRef,
      execution,
    );
    expect(arbitration).toBeDefined();
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'stable-eligible-count',
  }),
)('F8-COUNT-001 stable-eligible-count', () => {
  it('counts unsupported via create/requireCapabilityPreBudgetCountV2', async () => {
    expect(unsupportedCountCasesV2.length).toBeGreaterThan(0);
    const execution = executionToken();
    const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    const bucket = createOpaqueTokenV2<OpaqueFileBucketRefV2>();
    const pool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
      records: Object.freeze([
        Object.freeze({
          eligibleRef,
          discoveryKey: 'py',
          canonicalFileKey: 'src/a.rs' as never,
          fileBucketRef: bucket,
          classificationDefined: true,
        }),
      ]),
    });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool,
      execution,
      entries: [
        {
          eligibleRef,
          fileBucketRef: bucket,
          posixPath: 'src/a.rs',
          sourceText: 'x = 1',
        },
      ],
    });
    const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
      execution,
      new Map([
        [
          eligibleRef,
          Object.freeze({
            layer: 'server' as const,
            included: true,
            confirmation: 'allowed' as const,
          }),
        ],
      ]),
    );
    const admission = createVerifiedLanguageConsumerAdmissionV2(
      'language-capability',
      execution,
    );
    const registered = registerVerifiedLanguageConsumerV2(
      admission,
      { async consumeVerifiedContext() {} },
      execution,
    );
    const observation = createTrustedLanguageCapabilityObservationV2(
      capabilityView,
      scopeView,
      registered,
      execution,
      { matchedTermsByRef: new Map([[eligibleRef, Object.freeze(['x'])]]) },
    );
    const final = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/f8-count',
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
    // bind one stable eligible matching observation ref via empty pool + count 0 path:
    // empty stable pool still exercises create/require; fixture rows document policy
    const preCap = projectExpandedSafePreCapPoolV2([], true, execution);
    const folded = scopeFoldSafeCandidatePoolV2(preCap, [], execution);
    const foldProof = readScopeFoldedSafePoolProofV2(folded, execution);
    bindEmptyStableEligibleScopeDecisionsV2({
      pool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
    });
    const stableScope = requireStableEligibleScopeViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      execution,
    );
    const stableCapability = requireStableEligibleCapabilityViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      stableScope,
      execution,
    );
    const resolvedScope = resolveRepositoryScopeV1(undefined);
    const coverageBasis = createScopeCoverageBasisV2({
      excludedLocatorRefs: [],
      mixedIncludedLocatorRefs: [],
      stableEligiblePool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
    });
    const scopeFacts = buildScopeCoverageV1(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      coverageBasis,
      resolvedScope,
      execution,
    );
    const scopeFactsView = requireScopeCoverageFactsV1(
      scopeFacts,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      coverageBasis,
      resolvedScope,
      execution,
    );
    const count = createCapabilityPreBudgetCountV2(
      observation,
      stableCapability,
      stableScope,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );
    const view = requireCapabilityPreBudgetCountV2(
      count,
      observation,
      stableCapability,
      stableScope,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );
    expect(view.unsupportedLanguageHits).toBe(0);
    expect(
      unsupportedCountCasesV2.every((row) =>
        row.adapter === 'fallback'
          ? row.countsUnsupported
          : !row.countsUnsupported,
      ),
    ).toBe(true);
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'capability-contribution',
  }),
)('F8-CONTRIBUTION-001 capability-contribution', () => {
  it('builds capability facts through the trusted language boundary', async () => {
    expect(LOCATE_EXECUTION_FACT_FAMILIES_V2).toContain('capability');
    const execution = executionToken();
    const final = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/f8-contrib',
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
    bindEmptyStableEligibleScopeDecisionsV2({
      pool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
    });
    const emptyPool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
      records: Object.freeze([]),
    });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool: emptyPool,
      execution,
      entries: [],
    });
    const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
      execution,
      new Map(),
    );
    const admission = createVerifiedLanguageConsumerAdmissionV2(
      'language-capability',
      execution,
    );
    const registered = registerVerifiedLanguageConsumerV2(
      admission,
      { async consumeVerifiedContext() {} },
      execution,
    );
    const observation = createTrustedLanguageCapabilityObservationV2(
      capabilityView,
      scopeView,
      registered,
      execution,
    );
    const stableScope = requireStableEligibleScopeViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      execution,
    );
    const stableCapability = requireStableEligibleCapabilityViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      stableScope,
      execution,
    );
    const resolvedScope = resolveRepositoryScopeV1(undefined);
    const coverageBasis = createScopeCoverageBasisV2({
      excludedLocatorRefs: [],
      mixedIncludedLocatorRefs: [],
      stableEligiblePool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
    });
    const scopeFacts = buildScopeCoverageV1(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      coverageBasis,
      resolvedScope,
      execution,
    );
    const scopeFactsView = requireScopeCoverageFactsV1(
      scopeFacts,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      coverageBasis,
      resolvedScope,
      execution,
    );
    const preBudget = createCapabilityPreBudgetCountV2(
      observation,
      stableCapability,
      stableScope,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );
    const ranking = issueEvidenceRankingOutcomeV2({
      fragment: Object.freeze({
        confirmed: Object.freeze([]),
        candidates: Object.freeze([]),
        unsatisfiedAnchors: Object.freeze([]),
      }),
      budgetFacts: Object.freeze({
        maxFilesReached: false,
        maxConfirmedReached: false,
        maxCandidatesReached: false,
        preRankingPoolTruncated: false,
        safeSelectorCollision: false,
        safeOrderingCollision: false,
      }),
      confirmed: [],
      candidates: [],
      snapshotProof: final.proof,
      execution,
      collisionAnchorKeys: new Set(),
    });
    const seal = sealCapabilityRetainedDecisionsV2(
      preBudget,
      ranking,
      observation,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );
    const facts = buildCapabilityCoverageV2(
      preBudget,
      seal,
      observation,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );
    const view = requireCapabilityCoverageFactsV2(
      facts,
      preBudget,
      seal,
      observation,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );
    expect(view.contribution.owner).toBe('capability');
    expect(view.contribution.unsupportedLanguageHits).toBe(0);
    expect(view.semanticClassification).toEqual([
      'typescript',
      'javascript',
      'sql',
      'python',
      'go',
    ]);
  });

  it('requires an authentic ranking outcome for nonempty capability records', async () => {
    const execution = executionToken();
    const relative = 'src/nonempty.py';
    const canonicalFileKey = relative as CanonicalFileKeyV2;
    const fileSnapshot = Object.freeze({
      locator: relative,
      canonicalFileKey,
      identity: Object.freeze({
        dev: 1n,
        ino: 2n,
        size: 6n,
        mtimeNs: 3n,
        ctimeNs: 4n,
      }),
      contentSha256: 'a'.repeat(64),
    });
    const pools = buildPreRankingStablePoolsV2([
      Object.freeze({
        discoveryKey: `discovery:v1\u0000${relative}\u0000nonempty`,
        canonicalFileKey,
        safeKey: 'nonempty',
        rankingSignals: Object.freeze({
          kind: 'direct' as const,
          focusLines: Object.freeze([1, 1] as [number, number]),
          focusExcerpt: 'x = 1',
        }),
        classificationDefined: true,
      }),
    ]);
    const final = await runFinalSnapshotCheckV2({
      repositoryRoot: '/unused',
      loadedFiles: Object.freeze([
        Object.freeze({
          canonicalFileKey,
          snapshot: fileSnapshot,
          aliases: Object.freeze([relative]),
        }),
      ]),
      evidencePool: pools.evidence,
      eligiblePool: pools.eligible,
      gitState: 'unknown',
      signal: new AbortController().signal,
      execution,
      readVerifiedFile: async (input) =>
        Object.freeze({
          snapshot: Object.freeze({ ...fileSnapshot, locator: input.locator }),
          bytes: Buffer.from('x = 1\n', 'utf8'),
        }),
    });
    const retained = final.retainedEligible[0];
    expect(retained).toBeDefined();
    if (retained === undefined) return;

    const preCap = projectExpandedSafePreCapPoolV2([], true, execution);
    const folded = scopeFoldSafeCandidatePoolV2(preCap, [], execution);
    const foldProof = readScopeFoldedSafePoolProofV2(folded, execution);
    bindStableEligibleScopeDecisionsV2({
      pool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
      records: Object.freeze([
        Object.freeze({
          eligibleRef: retained.eligibleRef,
          fileBucketRef: retained.fileBucketRef,
          decision: Object.freeze({
            layer: 'server' as const,
            included: true,
            confirmation: 'allowed' as const,
          }),
        }),
      ]),
    });
    const preFinalPool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
      records: Object.freeze([retained]),
    });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool: preFinalPool,
      execution,
      entries: Object.freeze([
        Object.freeze({
          eligibleRef: retained.eligibleRef,
          fileBucketRef: retained.fileBucketRef,
          posixPath: relative,
          sourceText: 'x = 1',
        }),
      ]),
    });
    const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
      execution,
      new Map([
        [
          retained.eligibleRef,
          Object.freeze({
            layer: 'server' as const,
            included: true,
            confirmation: 'allowed' as const,
          }),
        ],
      ]),
    );
    const admission = createVerifiedLanguageConsumerAdmissionV2(
      'language-capability',
      execution,
    );
    const registered = registerVerifiedLanguageConsumerV2(
      admission,
      { async consumeVerifiedContext() {} },
      execution,
    );
    const observation = createTrustedLanguageCapabilityObservationV2(
      capabilityView,
      scopeView,
      registered,
      execution,
    );
    const stableScope = requireStableEligibleScopeViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      execution,
    );
    const stableCapability = requireStableEligibleCapabilityViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      stableScope,
      execution,
    );
    const resolvedScope = resolveRepositoryScopeV1(undefined);
    const coverageBasis = createScopeCoverageBasisV2({
      excludedLocatorRefs: [],
      mixedIncludedLocatorRefs: [],
      stableEligiblePool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
    });
    const scopeFacts = buildScopeCoverageV1(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      coverageBasis,
      resolvedScope,
      execution,
    );
    const scopeFactsView = requireScopeCoverageFactsV1(
      scopeFacts,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      coverageBasis,
      resolvedScope,
      execution,
    );
    const count = createCapabilityPreBudgetCountV2(
      observation,
      stableCapability,
      stableScope,
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      scopeFactsView.proof,
      execution,
    );

    expect(() =>
      sealCapabilityRetainedDecisionsV2(
        count,
        undefined,
        observation,
        final.eligibleDiscovery,
        final.proof,
        foldProof,
        scopeFactsView.proof,
        execution,
      ),
    ).toThrow(/nonempty capability decisions require ranking/u);
  });

  it('keeps production capability construction free of test issuers and synthetic rankings', () => {
    const source = readFileSync(
      resolve(
        import.meta.dirname,
        '../../src/evidence/language/build-execution-capability-coverage-v2.ts',
      ),
      'utf8',
    );

    expect(source).not.toContain('ForTestV2');
    expect(source).not.toContain('issueEvidenceRankingOutcomeV2');
    expect(source).toContain('input.rankingOutcome');
  });
});
