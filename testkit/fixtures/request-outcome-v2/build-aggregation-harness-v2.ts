import type { BackendExecutionOutcomeV2 } from '../../../src/contracts/v2/backend-execution-outcome-v2.js';
import type { CodeGraphIndexObservationV2 } from '../../../src/contracts/v2/backend-execution-outcome-v2.js';
import type {
  LocateExecutionTokenV2,
  RankedEvidenceFactsV2,
} from '../../../src/contracts/v2/locate-fact-envelope-v2.js';
import type { ResolvedLocateLimits } from '../../../src/contracts/request.js';
import {
  LocateAbortCoordinatorV2,
  type FinalizedAbortDecisionV2,
} from '../../../src/evidence/abort-source.js';
import {
  materializePublicEvidenceV2,
  readTrustedMaterializedEvidenceSummaryV2,
  type UnsafePublicMaterializationSourceProofV2,
  type TrustedMaterializedEvidenceCoreV2,
} from '../../../src/evidence/public-output/materialized-evidence-core-v2.js';
import type { EvidenceBudgetFactsV2 } from '../../../src/evidence/ranking/evidence-budget-facts-v2.js';
import { issueEvidenceRankingOutcomeV2 } from '../../../src/evidence/ranking/evidence-ranking-outcome-v2.js';
import type { EvidenceRankingOutcomeV2 } from '../../../src/evidence/ranking/evidence-ranking-outcome-v2.js';
import { createOpaqueTokenV2 } from '../../../src/evidence/request-snapshot/opaque-token-v2.js';
import {
  createSnapshotOutcomeContributionV2,
  requireSnapshotOutcomeContributionV2,
  type SnapshotObservationLedgerEntryInputV2,
} from '../../../src/evidence/request-snapshot/snapshot-outcome-contribution-v2.js';
import {
  runFinalSnapshotCheckV2,
  type SnapshotTrustProofV2,
} from '../../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import { projectExpandedSafePreCapPoolV2 } from '../../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import {
  readScopeFoldedSafePoolProofV2,
  scopeFoldSafeCandidatePoolV2,
} from '../../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import { createScopeCoverageBasisV2 } from '../../../src/evidence/request-snapshot/scope-coverage-basis-v2.js';
import {
  createBackendExecutionContextV2,
  issueBackendExecutionTraceForHarnessV2,
} from '../../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../../src/process/opaque-token-v2.js';
import { NodeSafeProcessRunner } from '../../../src/repository/node-safe-process-runner.js';
import { issueTrustedFallbackDecisionV2 } from '../../../src/evidence/request-outcome/trusted-fallback-decision-v2.js';
import type { RequestOutcomeAggregationInputV2 } from '../../../src/evidence/request-outcome/request-outcome-aggregator-v2.js';
import { resolveRepositoryScopeV1 } from '../../../src/evidence/scope/resolve-repository-scope-v1.js';
import {
  buildScopeCoverageV1,
  requireScopeCoverageFactsV1,
} from '../../../src/evidence/scope/scope-coverage-v1.js';

export interface AggregationHarnessV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly input: RequestOutcomeAggregationInputV2;
  readonly core: TrustedMaterializedEvidenceCoreV2;
  readonly abortCoordinator: ReturnType<typeof LocateAbortCoordinatorV2.create>;
  readonly abortDecision: FinalizedAbortDecisionV2;
}

const DEFAULT_LIMITS: ResolvedLocateLimits = Object.freeze({
  maxFiles: 10,
  maxConfirmed: 10,
  maxCandidates: 10,
  timeoutMs: 10_000,
});

/**
 * Direct F6 harness：合法签发 F5 trace / F3 contribution / F1 core / abort latch。
 */
export async function buildAggregationHarnessV2(options: {
  readonly outcomes?: readonly BackendExecutionOutcomeV2[];
  readonly observation?: CodeGraphIndexObservationV2;
  readonly fallback?: {
    readonly checked: boolean;
    readonly required: boolean;
    readonly completeEquivalentFallback: boolean;
  };
  readonly locationRedactedTerm?: string;
  readonly snapshotChangedCount?: number;
  readonly abortBeforeClose?: 'caller' | 'deadline' | 'none';
  readonly limits?: ResolvedLocateLimits;
  readonly ledger?: readonly SnapshotObservationLedgerEntryInputV2[];
  readonly budgetFacts?: Partial<EvidenceBudgetFactsV2>;
  readonly unsatisfiedAnchors?: RankedEvidenceFactsV2['unsatisfiedAnchors'];
}): Promise<AggregationHarnessV2> {
  const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
  const signal = new AbortController().signal;
  const context = createBackendExecutionContextV2(
    new NodeSafeProcessRunner(),
    undefined,
    signal,
    execution,
  );
  const outcomes = options.outcomes ?? [];
  const trace = issueBackendExecutionTraceForHarnessV2({
    execution,
    context,
    outcomes,
    codegraphIndexObservation: options.observation ?? { kind: 'not-observed' },
  });
  const fallback = issueTrustedFallbackDecisionV2({
    execution,
    backendTrace: trace,
    checked: options.fallback?.checked ?? false,
    required: options.fallback?.required ?? false,
    completeEquivalentFallback:
      options.fallback?.completeEquivalentFallback ?? false,
  });

  const registered = await runFinalSnapshotCheckV2({
    repositoryRoot: '/tmp/unused-f6',
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
  const snapshotProof = registered.proof;

  const ranking: EvidenceRankingOutcomeV2 = issueEvidenceRankingOutcomeV2({
    fragment: Object.freeze({
      confirmed: Object.freeze([]),
      candidates: Object.freeze([]),
      unsatisfiedAnchors: Object.freeze([
        ...(options.unsatisfiedAnchors ?? []),
      ]),
    }),
    budgetFacts: Object.freeze({
      maxFilesReached: options.budgetFacts?.maxFilesReached ?? false,
      maxConfirmedReached: options.budgetFacts?.maxConfirmedReached ?? false,
      maxCandidatesReached: options.budgetFacts?.maxCandidatesReached ?? false,
      preRankingPoolTruncated:
        options.budgetFacts?.preRankingPoolTruncated ?? false,
      safeSelectorCollision: options.budgetFacts?.safeSelectorCollision ?? false,
      safeOrderingCollision: options.budgetFacts?.safeOrderingCollision ?? false,
    }),
    confirmed: [],
    candidates: [],
    snapshotProof,
    execution,
    collisionAnchorKeys: new Set(),
  });

  const sourceProof =
    createOpaqueTokenV2<UnsafePublicMaterializationSourceProofV2>();
  const termValue = options.locationRedactedTerm ?? 'Foo';
  const core = materializePublicEvidenceV2(
    {
      normalizedTerms: Object.freeze([
        Object.freeze({ value: termValue, caseSensitive: true }),
      ]),
      rankedConfirmed: Object.freeze([]),
      rankedCandidates: Object.freeze([]),
      proof: sourceProof,
    },
    execution,
  );
  const summary = readTrustedMaterializedEvidenceSummaryV2(core, execution);

  const snapshotToken = createSnapshotOutcomeContributionV2({
    snapshotProof,
    execution,
    discardedEvidenceCount: options.snapshotChangedCount ?? 0,
    ledger: options.ledger ?? [],
  });
  const snapshotContribution = requireSnapshotOutcomeContributionV2(
    snapshotToken,
    snapshotProof,
    execution,
  );

  const preCap = projectExpandedSafePreCapPoolV2([], true, execution);
  const foldedView = scopeFoldSafeCandidatePoolV2(preCap, [], execution);
  const foldProof = readScopeFoldedSafePoolProofV2(foldedView, execution);
  const resolvedScope = resolveRepositoryScopeV1(undefined);
  const coverageBasis = createScopeCoverageBasisV2({
    excludedLocatorRefs: [],
    mixedIncludedLocatorRefs: [],
    stableEligiblePool: registered.eligibleDiscovery,
    snapshotProof,
    foldProof,
    execution,
  });
  const scopeFacts = buildScopeCoverageV1(
    registered.eligibleDiscovery,
    snapshotProof,
    foldProof,
    coverageBasis,
    resolvedScope,
    execution,
  );
  const scopeView = requireScopeCoverageFactsV1(
    scopeFacts,
    registered.eligibleDiscovery,
    snapshotProof,
    foldProof,
    coverageBasis,
    resolvedScope,
    execution,
  );

  const abortCoordinator = LocateAbortCoordinatorV2.create(
    new AbortController().signal,
    options.limits?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
    {
      setTimeout: ((fn: () => void, _ms?: number) => {
        if (options.abortBeforeClose === 'deadline') {
          fn();
        }
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout,
      clearTimeout: (() => undefined) as unknown as typeof clearTimeout,
    },
  );
  if (options.abortBeforeClose === 'caller') {
    abortCoordinator.abort('caller');
  }
  const abortDecision = abortCoordinator.closeFinalization();

  const input: RequestOutcomeAggregationInputV2 = Object.freeze({
    execution,
    backendTrace: trace,
    fallback,
    ranking,
    snapshotProof,
    materialization: core,
    resolvedLimits: options.limits ?? DEFAULT_LIMITS,
    abortDecision,
    abortCoordinator,
    contributions: Object.freeze([
      summary.contribution,
      snapshotContribution,
      scopeView.contribution,
    ] as const),
    scopeProof: scopeView.proof,
    expectedEligiblePool: registered.eligibleDiscovery,
    expectedFoldProof: foldProof,
    expectedCoverageBasis: coverageBasis,
    expectedResolvedScope: resolvedScope,
  });

  return Object.freeze({
    execution,
    input,
    core,
    abortCoordinator,
    abortDecision,
  });
}

export type { SnapshotTrustProofV2 };
