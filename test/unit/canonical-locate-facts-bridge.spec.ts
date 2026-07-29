import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  LOCATE_FACT_OWNER_ORDER_V2,
  LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2,
  createLocateFactEnvelopeBuilderV2,
  inspectLocateProjectionPrerequisiteOwnersV2,
} from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import { createMaterializedLocateResultComposerV2 } from '../../src/evidence/canonical/materialized-locate-result-composer-v2.js';
import { createRequiredOwnerFinalizerV2 } from '../../src/evidence/canonical/required-owner-finalizer-v2.js';
import {
  registerTrustedLocateProjectionAggregationV2,
  registerTrustedLocateProjectionMaterializationV2,
  registerTrustedLocateProjectionSourceV2,
} from '../../src/evidence/canonical/locate-projection-stage-registrar-v2.js';
import { createV2ShadowLocateProjectorV2 } from '../../testkit/testing/v2-shadow-locate-projector-v2.js';
import { requireTrustedSerializedLocateResultV2 } from '../../src/evidence/canonical/trusted-serialized-locate-result-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  FACT_CONTRACT_OWNER_ORDER_V2,
  FACT_CONTRACT_PREREQUISITE_ORDER_V2,
  createEmptyFragmentsEnvelopeV2,
} from '../../testkit/fixtures/canonical-locate-bridge-v2/fact-contract-v2.js';
import {
  createEmptyCanonicalSuccessInputV2,
  createFourPrerequisiteCanonicalInputV2,
} from '../../testkit/fixtures/canonical-locate-bridge-v2/four-prerequisite-base-v2.js';
import {
  createSyntheticLocateProjectionPreparationPortV2,
  defaultBackend,
  defaultMaterialization,
  defaultRequestOutcome,
} from '../../testkit/testing/create-synthetic-locate-projection-preparation-port-v2.js';
import {
  assertOpaqueSnapshotProofSurfaceV2,
  assertSnapshotTrustFinalizerInvariantV2,
  createDistinctRecordEntryBrandsV2,
  createOpaqueTokenV2,
  runFinalSnapshotCheckV2,
  type SnapshotTrustProofV2,
} from '../../src/evidence/request-snapshot/index.js';
import { SNAPSHOT_TRUST_MUTATIONS_OWNED_V2 } from '../../testkit/fixtures/request-snapshot-v2/snapshot-trust-mutations-v2.js';
import {
  LocateAbortCoordinatorV2,
  requireFinalizedAbortDecisionV2,
} from '../../src/evidence/abort-source.js';
import {
  aggregateRequestOutcomeV2,
  requireRequestOutcomeAggregationProofV2,
} from '../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import { buildAggregationHarnessV2 } from '../../testkit/fixtures/request-outcome-v2/build-aggregation-harness-v2.js';
import { OUTCOME_PROOF_MUTATIONS_V2 } from '../../testkit/fixtures/request-outcome-v2/outcome-proof-mutations-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const contractSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-fact-contract',
});
const finalizerSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-required-owner-finalizer',
});
const seamSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-materialization-seam',
});
const realShadowSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-real-shadow-no-cutover',
});
const syntheticShadowSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-synthetic-shadow-serialization',
});
const snapshotTrustSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-trust-finalizer',
});

describe.runIf(contractSelected)('F1C-CONTRACT-001 fact contract', () => {
  it('freezes unique owner and prerequisite orders', () => {
    expect(FACT_CONTRACT_OWNER_ORDER_V2).toEqual([
      'snapshot',
      'ranking',
      'backend',
      'request-outcome',
      'scope',
      'capability',
    ]);
    expect(FACT_CONTRACT_PREREQUISITE_ORDER_V2).toEqual([
      'snapshot',
      'ranking',
      'scope',
      'capability',
    ]);
    expect(LOCATE_FACT_OWNER_ORDER_V2).toBe(FACT_CONTRACT_OWNER_ORDER_V2);
    expect(LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2).toBe(
      FACT_CONTRACT_PREREQUISITE_ORDER_V2,
    );
  });

  it('keeps real success fragments as a frozen empty map', () => {
    const envelope = createEmptyFragmentsEnvelopeV2();
    expect(Object.keys(envelope.fragments)).toEqual([]);
    expect(Object.isFrozen(envelope.fragments)).toBe(true);
  });

  it('rejects duplicate owner adds without last-write-wins', () => {
    const builder = createLocateFactEnvelopeBuilderV2('/tmp/x', [
      { value: 'a', caseSensitive: true },
    ]);
    const scope = Object.freeze({
      requested: Object.freeze([]),
      effective: Object.freeze([
        'client',
        'server',
        'db',
        'config',
        'unknown',
      ] as const),
      policyVersion: 'repo-scope-v1' as const,
      unmatchedLayers: Object.freeze([]),
    });
    builder.add('scope', scope);
    builder.add('scope', {
      ...scope,
      unmatchedLayers: Object.freeze(['client'] as const),
    });
    expect(builder.failed).toBe(true);
    expect(() => builder.freeze()).toThrow(/failed closed/i);
  });
});

describe.runIf(finalizerSelected)(
  'F1C-FINALIZER-001 required-owner finalizer',
  () => {
    it('uses zero-argument factories and completion-token-only finalizer', () => {
      expect(createRequiredOwnerFinalizerV2.length).toBe(0);
      expect(createMaterializedLocateResultComposerV2.length).toBe(0);
      const finalizer = createRequiredOwnerFinalizerV2();
      const composer = createMaterializedLocateResultComposerV2();
      expect(typeof finalizer.finalize).toBe('function');
      expect(typeof composer.compose).toBe('function');
    });

    it('reports four missing prerequisites in canonical order for empty envelope', () => {
      const { input, execution } = createEmptyCanonicalSuccessInputV2();
      const presence = inspectLocateProjectionPrerequisiteOwnersV2(
        input.envelope,
        input,
        execution,
      );
      expect(presence).toEqual({
        ok: false,
        missingOwners: ['snapshot', 'ranking', 'scope', 'capability'],
        reason: 'missing-prerequisite-owner',
      });
    });

    it('completes synthetic aggregation then finalizer/composer once each', () => {
      const { input, execution } = createFourPrerequisiteCanonicalInputV2();
      const presence = inspectLocateProjectionPrerequisiteOwnersV2(
        input.envelope,
        input,
        execution,
      );
      expect(presence.ok).toBe(true);
      if (!presence.ok) throw new Error('expected prerequisites');
      const identity = Object.freeze(Object.create(null) as object);
      const source = registerTrustedLocateProjectionSourceV2(
        Object.freeze({ identity }),
        presence.prerequisites,
        input,
        execution,
      );
      expect(source.ok).toBe(true);
      if (!source.ok) throw new Error('source');
      const terms = Object.freeze(
        input.envelope.normalizedTerms.map((term) =>
          Object.freeze({
            value: term.value,
            caseSensitive: term.caseSensitive,
          }),
        ),
      );
      const materialization = registerTrustedLocateProjectionMaterializationV2(
        defaultMaterialization(identity, terms),
        source.value,
        input,
        execution,
      );
      expect(materialization.ok).toBe(true);
      if (!materialization.ok) throw new Error('materialization');
      const aggregation = registerTrustedLocateProjectionAggregationV2(
        Object.freeze({
          identity,
          statusV2: 'ok',
          backend: defaultBackend(),
          requestOutcome: defaultRequestOutcome(),
        }),
        materialization.value,
        input,
        execution,
      );
      expect(aggregation.ok).toBe(true);
      if (!aggregation.ok) throw new Error('aggregation');
      const finalized = createRequiredOwnerFinalizerV2().finalize(
        aggregation.value,
        execution,
      );
      expect(finalized.ok).toBe(true);
      if (!finalized.ok) throw new Error('finalizer');
      const composed = createMaterializedLocateResultComposerV2().compose(
        finalized.value,
      );
      expect(composed.ok).toBe(true);
    });
  },
);

describe.runIf(seamSelected)(
  'F1C-MATERIALIZATION-SEAM-001 materialization seam',
  () => {
    it('keeps F1C src free of F3/F2/F6 business owner imports', () => {
      const collect = (
        path: string,
        options?: Readonly<{ excludeFileNames?: ReadonlySet<string> }>,
      ): string[] => {
        const excluded = options?.excludeFileNames;
        if (path.endsWith('.ts')) {
          const base = path.split(/[\\/]/u).at(-1) ?? path;
          if (excluded?.has(base) === true) return [];
          return [readFileSync(path, 'utf8')];
        }
        const sources: string[] = [];
        const visit = (current: string): void => {
          for (const entry of readdirSync(current, { withFileTypes: true })) {
            const full = resolve(current, entry.name);
            if (entry.isDirectory()) visit(full);
            else if (
              entry.name.endsWith('.ts') &&
              excluded?.has(entry.name) !== true
            ) {
              sources.push(readFileSync(full, 'utf8'));
            }
          }
        };
        visit(path);
        return sources;
      };
      // canonical / envelope：仍禁止 F2/F3/F6 owner 字面量
      // F8 accepted orchestrator 是唯一允许接线 F2 stages 的 canonical 文件
      const f8AcceptedOrchestrator = new Set([
        'accepted-complete-real-locate-shadow-orchestrator-v2.ts',
      ]);
      const canonicalJoined = [
        ...collect(resolve('src/evidence/canonical'), {
          excludeFileNames: f8AcceptedOrchestrator,
        }),
        ...collect(resolve('src/contracts/v2/locate-fact-envelope-v2.ts')),
      ].join('\n');
      for (const marker of [
        'EvidenceRankingOutcomeV2',
        'SnapshotTrustProofV2',
        'TrustedMaterializedEvidenceCoreV2',
        'TrustedRequestOutcomeAggregationV2',
        'f2-locate-projection-stages-v2',
        'relevance-ranking-budget',
        'request-snapshot-cache',
      ]) {
        expect(canonicalJoined.includes(marker), marker).toBe(false);
      }
      // locate-execution：F9 可接线 SnapshotTrustProof + ranking outcome；仍禁
      // public-output stages / F6 aggregation / request-snapshot-cache 业务路径
      const locateJoined = collect(
        resolve('src/evidence/locate-execution'),
      ).join('\n');
      for (const marker of [
        'TrustedMaterializedEvidenceCoreV2',
        'TrustedRequestOutcomeAggregationV2',
        'relevance-ranking-budget',
        'request-snapshot-cache',
      ]) {
        expect(locateJoined.includes(marker), `locate:${marker}`).toBe(false);
      }
      // F9 production seams intentionally import SnapshotTrustProofV2 + F2 stages registrar
      expect(locateJoined.includes('SnapshotTrustProofV2')).toBe(true);
      expect(locateJoined.includes('f2-locate-projection-stages-v2')).toBe(true);
    });

    it('zeroes stage callbacks when any prerequisite is missing', () => {
      const { input, execution } = createEmptyCanonicalSuccessInputV2();
      const onCreateSource = vi.fn();
      const onMaterialize = vi.fn();
      const onAggregate = vi.fn();
      const port = createSyntheticLocateProjectionPreparationPortV2({
        onCreateSource,
        onMaterialize,
        onAggregate,
      });
      const presence = inspectLocateProjectionPrerequisiteOwnersV2(
        input.envelope,
        input,
        execution,
      );
      expect(presence.ok).toBe(false);
      expect(onCreateSource).toHaveBeenCalledTimes(0);
      expect(onMaterialize).toHaveBeenCalledTimes(0);
      expect(onAggregate).toHaveBeenCalledTimes(0);
      expect(port).toBeTruthy();
    });
  },
);

describe.runIf(realShadowSelected)(
  'F1C-REAL-SHADOW-001 real shadow no cutover',
  () => {
    it('returns missing-owner for empty real success without stage calls', () => {
      const { input, capability } = createEmptyCanonicalSuccessInputV2();
      const onCreateSource = vi.fn();
      const onMaterialize = vi.fn();
      const onAggregate = vi.fn();
      const preparation = createSyntheticLocateProjectionPreparationPortV2({
        onCreateSource,
        onMaterialize,
        onAggregate,
      });
      const attempt = createV2ShadowLocateProjectorV2().project(
        input,
        capability,
        preparation,
      );
      expect(attempt).toEqual({
        ok: false,
        reason: 'missing-owner',
        missingOwners: ['snapshot', 'ranking', 'scope', 'capability'],
      });
      expect(onCreateSource).toHaveBeenCalledTimes(0);
      expect(onMaterialize).toHaveBeenCalledTimes(0);
      expect(onAggregate).toHaveBeenCalledTimes(0);
      expect('serialized' in attempt).toBe(false);
    });
  },
);

describe.runIf(syntheticShadowSelected)(
  'F1C-SYNTHETIC-SHADOW-001 synthetic shadow serialization',
  () => {
    it('serializes opaque token after four-prerequisite synthetic stages', () => {
      const { input, capability } = createFourPrerequisiteCanonicalInputV2();
      const preparation = createSyntheticLocateProjectionPreparationPortV2();
      const attempt = createV2ShadowLocateProjectorV2().project(
        input,
        capability,
        preparation,
      );
      expect(attempt.ok).toBe(true);
      if (!attempt.ok) throw new Error('expected serialized shadow');
      const view = requireTrustedSerializedLocateResultV2(
        attempt.serialized,
        capability,
      );
      expect(view.value.ok).toBe(true);
      expect(view.utf8Bytes).toBeGreaterThan(0);
      const other = issueLocateProjectionExecutionCapabilityV2();
      expect(() =>
        requireTrustedSerializedLocateResultV2(attempt.serialized, other),
      ).toThrow(/capability/i);
    });
  },
);

describe.runIf(snapshotTrustSelected)(
  'F3-TRUST-001 snapshot-trust-finalizer',
  () => {
    it('keeps opaque proof and rejects pool-external drafts', async () => {
      expect(SNAPSHOT_TRUST_MUTATIONS_OWNED_V2).toBe(true);
      const brands = createDistinctRecordEntryBrandsV2();
      expect(brands.preFinalEligible).not.toBe(brands.stableEligible);
      expect(Object.keys(brands.preFinalEligible)).toEqual([]);

      const final = await runFinalSnapshotCheckV2({
        repositoryRoot: '/tmp/unused',
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
      assertOpaqueSnapshotProofSurfaceV2(final.proof);
      const execution = issueLocateProjectionExecutionCapabilityV2();
      const token = requireLocateProjectionExecutionTokenV2(execution);
      assertSnapshotTrustFinalizerInvariantV2({
        proof: final.proof,
        evidence: final.evidence,
        eligible: final.eligibleDiscovery,
        submittedDiscoveryKeys: [],
        execution: token,
      });
      expect(() =>
        assertSnapshotTrustFinalizerInvariantV2({
          proof: final.proof,
          evidence: final.evidence,
          eligible: final.eligibleDiscovery,
          submittedDiscoveryKeys: ['not-in-pool'],
          execution: token,
        }),
      ).toThrow(/invalid-facts/i);
      expect(() =>
        assertSnapshotTrustFinalizerInvariantV2({
          proof: createOpaqueTokenV2<SnapshotTrustProofV2>(),
          evidence: final.evidence,
          eligible: final.eligibleDiscovery,
          submittedDiscoveryKeys: [],
          execution: token,
        }),
      ).toThrow(/not registered|mismatch/i);
    });
  },
);

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'outcome-proof',
  }),
)('F6-TRUST-001 outcome-proof', () => {
  it('rejects forged close tokens and cross-execution proof reads', async () => {
    expect(OUTCOME_PROOF_MUTATIONS_V2).toContain('forged-close-token');
    const harness = await buildAggregationHarnessV2({});
    const forged = createOpaqueTokenV2();
    expect(() =>
      requireFinalizedAbortDecisionV2(
        forged as never,
        harness.abortCoordinator,
      ),
    ).toThrow(/not trusted/);
    const aggregated = aggregateRequestOutcomeV2(harness.input);
    expect(() =>
      requireRequestOutcomeAggregationProofV2(
        aggregated.proof,
        createOpaqueTokenV2() as never,
      ),
    ).toThrow(/not trusted/);
    void LocateAbortCoordinatorV2;
  });
});


describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'capability-proof',
  }),
)('F8-TRUST-001 capability-proof', () => {
  it('rejects retained seal when ledger entry is missing for a retained ref', async () => {
    const {
      createCapabilityPreBudgetCountV2,
      sealCapabilityRetainedDecisionsV2,
      registerCapabilityRetainedDecisionLedgerV2,
    } = await import('../../src/evidence/language/capability-coverage-v2.js');
    const { createTrustedLanguageCapabilityObservationV2 } = await import(
      '../../src/evidence/language/language-capability-observation-v2.js'
    );
    const { createTrustedPreFinalCapabilityViewForTestV2 } = await import(
      '../../src/evidence/request-snapshot/capability-classification-views-v2.js'
    );
    const { createTrustedPreFinalScopeClassificationViewForTestV2 } =
      await import(
        '../../src/evidence/request-snapshot/scope-classification-views-v2.js'
      );
    const {
      createVerifiedLanguageConsumerAdmissionV2,
      registerVerifiedLanguageConsumerV2,
    } = await import(
      '../../src/evidence/request-snapshot/verified-language-consumer-v2.js'
    );
    const { requireStableEligibleCapabilityViewV2 } = await import(
      '../../src/evidence/request-snapshot/capability-classification-views-v2.js'
    );
    const {
      bindEmptyStableEligibleScopeDecisionsV2,
      requireStableEligibleScopeViewV2,
    } = await import(
      '../../src/evidence/request-snapshot/scope-classification-views-v2.js'
    );
    const { runFinalSnapshotCheckV2 } = await import(
      '../../src/evidence/request-snapshot/final-snapshot-check-v2.js'
    );
    const { projectExpandedSafePreCapPoolV2 } = await import(
      '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js'
    );
    const {
      readScopeFoldedSafePoolProofV2,
      scopeFoldSafeCandidatePoolV2,
    } = await import(
      '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js'
    );
    const { createScopeCoverageBasisV2 } = await import(
      '../../src/evidence/request-snapshot/scope-coverage-basis-v2.js'
    );
    const { resolveRepositoryScopeV1 } = await import(
      '../../src/evidence/scope/resolve-repository-scope-v1.js'
    );
    const { buildScopeCoverageV1, requireScopeCoverageFactsV1 } = await import(
      '../../src/evidence/scope/scope-coverage-v1.js'
    );
    const { issueEvidenceRankingOutcomeV2 } = await import(
      '../../src/evidence/ranking/evidence-ranking-outcome-v2.js'
    );
    const { createOpaqueTokenV2 } = await import(
      '../../src/evidence/request-snapshot/opaque-token-v2.js'
    );
    const execution = requireLocateProjectionExecutionTokenV2(
      issueLocateProjectionExecutionCapabilityV2(),
    );
    const final = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/f8-trust',
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
    bindEmptyStableEligibleScopeDecisionsV2({
      pool: final.eligibleDiscovery,
      snapshotProof: final.proof,
      foldProof,
      execution,
    });
    const emptyPool = Object.freeze({ records: Object.freeze([]) });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool: emptyPool as never,
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
    const stableCapability = requireStableEligibleCapabilityViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
      execution,
      [],
    );
    const stableScope = requireStableEligibleScopeViewV2(
      final.eligibleDiscovery,
      final.proof,
      foldProof,
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
    const brand = createOpaqueTokenV2<
      import('../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js').TrustedStableRecordViewV2
    >();
    const retainedView = Object.freeze({
      ...brand,
      recordRef: createOpaqueTokenV2(),
      fileBucketRef: createOpaqueTokenV2(),
      draft: Object.freeze({
        evidenceClass: 'confirmed' as const,
        role: 'definition',
        location: Object.freeze({
          file: 'a.ts',
          lines: Object.freeze([1, 1] as const),
          excerpt: 'x',
        }),
        provenance: Object.freeze({
          discoveredBy: Object.freeze(['ripgrep' as const]),
          verifiedBy: 'filesystem' as const,
          operations: Object.freeze(['RIPGREP_SEARCH' as const]),
        }),
        reasonCodes: Object.freeze(['DIRECT_ALIAS_MAPPING' as const]),
      }),
      rankingSignals: Object.freeze({
        kind: 'direct' as const,
        focusLines: Object.freeze([1, 1] as const),
        focusExcerpt: 'x',
      }),
    }) as import('../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js').TrustedStableRecordViewV2;
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
      confirmed: [retainedView],
      candidates: [],
      snapshotProof: final.proof,
      execution,
      collisionAnchorKeys: new Set(),
    });
    registerCapabilityRetainedDecisionLedgerV2(execution, []);
    expect(() =>
      sealCapabilityRetainedDecisionsV2(
        preBudget,
        ranking,
        observation,
        final.eligibleDiscovery,
        final.proof,
        foldProof,
        scopeFactsView.proof,
        execution,
      ),
    ).toThrow(/ledger|retained/i);
    // empty retained + empty ledger seals cleanly
    const emptyRanking = issueEvidenceRankingOutcomeV2({
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
    expect(
      sealCapabilityRetainedDecisionsV2(
        preBudget,
        emptyRanking,
        observation,
        final.eligibleDiscovery,
        final.proof,
        foldProof,
        scopeFactsView.proof,
        execution,
      ),
    ).toBeDefined();
  });
});
