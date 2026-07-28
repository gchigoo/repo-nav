import type {
  BackendExecutionTraceV2,
  CodeGraphIndexObservationV2,
} from '../../contracts/v2/backend-execution-outcome-v2.js';
import type {
  BackendFactsV2,
  LocateExecutionTokenV2,
  RequestOutcomeFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  COVERAGE_DEGRADATION_CODES_V2,
  EXCLUSION_REASON_CODES_V2,
  LIMIT_REASON_CODES_V2,
} from '../../contracts/v2/locate-result-v2.js';
import type { ResolvedLocateLimits } from '../../contracts/request.js';
import { requireBackendExecutionTraceV2 } from '../../process/backend-execution-context-v2.js';
import {
  requireFinalizedAbortDecisionV2,
  type FinalizedAbortDecisionV2,
  type LocateAbortCoordinatorV2,
  type LocateAbortSource,
} from '../abort-source.js';
import {
  readTrustedMaterializedEvidenceSummaryV2,
  type TrustedMaterializedEvidenceCoreV2,
  type PublicMaterializationContributionV2,
} from '../public-output/materialized-evidence-core-v2.js';
import {
  requireEvidenceRankingOutcomeV2,
  type EvidenceRankingOutcomeV2,
} from '../ranking/evidence-ranking-outcome-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedStableEligibleDiscoveryPoolV2,
} from '../request-snapshot/final-snapshot-check-v2.js';
import type { SnapshotOutcomeContributionV2 } from '../request-snapshot/snapshot-outcome-contribution-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { ScopeCoverageBasisV2 } from '../request-snapshot/scope-coverage-basis-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { ResolvedRepositoryScopeV1 } from '../scope/resolve-repository-scope-v1.js';
import type {
  ScopeCoverageProofV1,
  ScopeOutcomeContributionV2,
} from '../scope/scope-coverage-v1.js';
import { deriveLocateStatusFromFactsV2, type LocateStatusV2 } from './locate-status-v2.js';
import { createNextActionsV2 } from './next-action-policy-v2.js';
import { requireRequestOutcomeContributionsV2 } from './request-outcome-contribution-registry-v2.js';
import {
  requireTrustedFallbackDecisionV2,
  type TrustedFallbackDecisionV2,
} from './trusted-fallback-decision-v2.js';

declare const REQUEST_OUTCOME_AGGREGATION_PROOF_V2: unique symbol;
export type RequestOutcomeAggregationProofV2 = Readonly<object> & {
  readonly [REQUEST_OUTCOME_AGGREGATION_PROOF_V2]: never;
};

export interface RequestOutcomeAggregationInputV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly backendTrace: BackendExecutionTraceV2;
  readonly fallback: TrustedFallbackDecisionV2;
  readonly ranking: EvidenceRankingOutcomeV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly materialization: TrustedMaterializedEvidenceCoreV2;
  readonly resolvedLimits: ResolvedLocateLimits;
  readonly abortDecision: FinalizedAbortDecisionV2;
  readonly abortCoordinator: LocateAbortCoordinatorV2;
  readonly contributions: readonly [
    PublicMaterializationContributionV2,
    SnapshotOutcomeContributionV2,
    ScopeOutcomeContributionV2,
  ];
  readonly scopeProof: ScopeCoverageProofV1;
  readonly expectedEligiblePool: TrustedStableEligibleDiscoveryPoolV2;
  readonly expectedFoldProof: ScopeFoldedSafePoolProofV2;
  readonly expectedCoverageBasis: ScopeCoverageBasisV2;
  readonly expectedResolvedScope: ResolvedRepositoryScopeV1;
}

export interface TrustedRequestOutcomeAggregationV2 {
  readonly backend: Readonly<{ owner: 'backend'; value: BackendFactsV2 }>;
  readonly requestOutcome: Readonly<{
    owner: 'request-outcome';
    value: RequestOutcomeFactsV2;
  }>;
  readonly statusV2: LocateStatusV2;
  readonly proof: RequestOutcomeAggregationProofV2;
}

interface AggregationProofRecordV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly backend: BackendFactsV2;
  readonly requestOutcome: RequestOutcomeFactsV2;
  readonly statusV2: LocateStatusV2;
  readonly materialization: TrustedMaterializedEvidenceCoreV2;
  readonly input: RequestOutcomeAggregationInputV2;
}

const aggregationProofPrivate = new WeakMap<
  RequestOutcomeAggregationProofV2,
  AggregationProofRecordV2
>();

function canonicalizeCodes<const TValue extends string>(
  values: readonly TValue[],
  order: readonly TValue[],
): readonly TValue[] {
  const present = new Set(values);
  return Object.freeze(order.filter((value) => present.has(value)));
}

function mapIndexObservation(observation: CodeGraphIndexObservationV2): {
  readonly indexState: BackendFactsV2['indexState'];
  readonly indexFreshness: BackendFactsV2['indexFreshness'];
} {
  switch (observation.kind) {
    case 'not-observed':
      return { indexState: 'unknown', indexFreshness: 'unknown' };
    case 'available':
      return {
        indexState: 'available',
        indexFreshness: observation.possiblyStale
          ? 'possibly-stale'
          : 'unknown',
      };
    case 'missing-index':
      return { indexState: 'missing', indexFreshness: 'not-applicable' };
    case 'tool-unavailable':
      return { indexState: 'unavailable', indexFreshness: 'not-applicable' };
    case 'error':
      return { indexState: 'error', indexFreshness: 'unknown' };
    default: {
      const _exhaustive: never = observation;
      void _exhaustive;
      throw new TypeError('unknown codegraph index observation');
    }
  }
}

/**
 * F6 RequestOutcomeAggregatorV2：direct harness / future F8 mount 共用算法。
 * 不导入 F2 core accessor、materialization token 或 F1C registrar。
 */
export function aggregateRequestOutcomeV2(
  input: RequestOutcomeAggregationInputV2,
): TrustedRequestOutcomeAggregationV2 {
  const traceView = requireBackendExecutionTraceV2(
    input.backendTrace,
    input.execution,
  );
  const fallback = requireTrustedFallbackDecisionV2(
    input.fallback,
    input.backendTrace,
    input.execution,
  );
  const rankingView = requireEvidenceRankingOutcomeV2(
    input.ranking,
    input.snapshotProof,
    input.execution,
  );
  const materializationSummary = readTrustedMaterializedEvidenceSummaryV2(
    input.materialization,
    input.execution,
  );
  const contributions = requireRequestOutcomeContributionsV2({
    contributions: input.contributions,
    materializationContribution: materializationSummary.contribution,
    snapshotProof: input.snapshotProof,
    execution: input.execution,
    scopeProof: input.scopeProof,
    expectedEligiblePool: input.expectedEligiblePool,
    expectedFoldProof: input.expectedFoldProof,
    expectedCoverageBasis: input.expectedCoverageBasis,
    expectedResolvedScope: input.expectedResolvedScope,
  });
  const abortSource = requireFinalizedAbortDecisionV2(
    input.abortDecision,
    input.abortCoordinator,
  );

  const attempts = Object.freeze(
    traceView.outcomes.map((outcome) => Object.freeze({ ...outcome })),
  );
  const index = mapIndexObservation(traceView.codegraphIndexObservation);

  const primaryCompleteSafe =
    attempts.length > 0 &&
    attempts[0]!.status === 'used' &&
    attempts[0]!.completion === 'complete';
  const strategyComplete =
    (primaryCompleteSafe && !fallback.required) ||
    (fallback.required && fallback.completeEquivalentFallback);

  const limitsReached: Array<(typeof LIMIT_REASON_CODES_V2)[number]> = [];
  const budget = rankingView.budgetFacts;
  if (budget.maxFilesReached) {
    limitsReached.push('MAX_FILES_REACHED');
  }
  if (budget.maxConfirmedReached) {
    limitsReached.push('MAX_CONFIRMED_REACHED');
  }
  if (budget.maxCandidatesReached) {
    limitsReached.push('MAX_CANDIDATES_REACHED');
  }
  const snapshotContribution = contributions[1];
  if (snapshotContribution.readLimits.maxFileBytesReached) {
    limitsReached.push('MAX_FILE_BYTES_REACHED');
  }
  if (snapshotContribution.readLimits.maxExcerptBytesReached) {
    limitsReached.push('MAX_EXCERPT_BYTES_REACHED');
  }
  if (attempts.some((attempt) => attempt.termination === 'early-stop')) {
    limitsReached.push('MAX_BACKEND_HITS_REACHED');
  }
  if (abortSource === 'deadline') {
    limitsReached.push('TIMEOUT_REACHED');
  }

  const degradations: Array<(typeof COVERAGE_DEGRADATION_CODES_V2)[number]> =
    [];
  if (snapshotContribution.exclusions.snapshotChangedCount > 0) {
    degradations.push('SNAPSHOT_CHANGED');
  }
  const hasEarlyStop = attempts.some(
    (attempt) => attempt.termination === 'early-stop',
  );
  const hasOutputLimit = attempts.some(
    (attempt) => attempt.termination === 'output-limit',
  );
  const omitPrimaryDegradation =
    fallback.completeEquivalentFallback && strategyComplete;
  if (hasEarlyStop && !omitPrimaryDegradation) {
    degradations.push('BACKEND_EARLY_STOPPED');
  }
  if (hasOutputLimit && !omitPrimaryDegradation) {
    degradations.push('PROCESS_OUTPUT_LIMIT_REACHED');
  }
  if (materializationSummary.locationRedacted) {
    degradations.push('LOCATION_REDACTED');
  }

  const exclusionSummary: {
    -readonly [K in keyof RequestOutcomeFactsV2['exclusionSummary']]?: number;
  } = {};
  const exclusionCounts: Record<
    (typeof EXCLUSION_REASON_CODES_V2)[number],
    number
  > = {
    NEGATIVE_TERM_MATCH:
      snapshotContribution.exclusions.negativeTermMatchCount,
    OUTSIDE_LAYER_HINT: contributions[2].outsideLayerHintCount,
    DUPLICATE_LOCATION: snapshotContribution.exclusions.duplicateLocationCount,
    UNVERIFIED_FILE_CONTENT:
      snapshotContribution.exclusions.unverifiedFileContentCount,
    SNAPSHOT_CHANGED: snapshotContribution.exclusions.snapshotChangedCount,
  };
  for (const code of EXCLUSION_REASON_CODES_V2) {
    const count = exclusionCounts[code];
    if (count > 0) {
      exclusionSummary[code] = count;
    }
  }

  const backend: BackendFactsV2 = Object.freeze({
    outcomes: attempts as BackendFactsV2['outcomes'],
    indexState: index.indexState,
    indexFreshness: index.indexFreshness,
  });

  const statusV2 = deriveLocateStatusFromFactsV2({
    abortSource,
    strategyComplete,
    degradations,
    unsatisfiedAnchors: rankingView.fragment.value.unsatisfiedAnchors,
    backends: attempts,
    retainedEvidenceCount: materializationSummary.evidenceCount,
  });

  const nextActions = createNextActionsV2({
    status: statusV2,
    hasCandidates: materializationSummary.hasCandidates,
    limitsReached,
    abortSource,
    limits: input.resolvedLimits,
    initializeCodeGraph: index.indexState === 'missing',
  });

  const requestOutcome: RequestOutcomeFactsV2 = Object.freeze({
    strategyComplete,
    fallbackChecked: fallback.checked,
    abortSource,
    limitsReached: canonicalizeCodes(limitsReached, LIMIT_REASON_CODES_V2),
    degradations: canonicalizeCodes(degradations, COVERAGE_DEGRADATION_CODES_V2),
    exclusionSummary: Object.freeze(exclusionSummary),
    nextActions,
  });

  const proof = createOpaqueTokenV2<RequestOutcomeAggregationProofV2>();
  aggregationProofPrivate.set(
    proof,
    Object.freeze({
      execution: input.execution,
      backend,
      requestOutcome,
      statusV2,
      materialization: input.materialization,
      input,
    }),
  );

  return Object.freeze({
    backend: Object.freeze({ owner: 'backend' as const, value: backend }),
    requestOutcome: Object.freeze({
      owner: 'request-outcome' as const,
      value: requestOutcome,
    }),
    statusV2,
    proof,
  });
}

/**
 * Hostile proof 读取：核对同 execution / 同 aggregation。
 */
export function requireRequestOutcomeAggregationProofV2(
  proof: RequestOutcomeAggregationProofV2,
  expectedExecution: LocateExecutionTokenV2,
): AggregationProofRecordV2 {
  const record = aggregationProofPrivate.get(proof);
  if (record === undefined || record.execution !== expectedExecution) {
    throw new TypeError('request-outcome aggregation proof is not trusted');
  }
  return record;
}

/** Future F8 mount ABI：仅类型/形状，F6 不执行 envelope insertion。 */
export interface FutureF8AggregationMountAbiV2 {
  readonly kind: 'f8-exact-aggregation-wrapper';
  readonly consumes: 'TrustedRequestOutcomeAggregationV2';
  readonly submitsTo: 'F1C-completion-bearing-aggregation-registrar';
  readonly productionCoreAccessorOwner: 'F8';
}

export function describeFutureF8AggregationMountAbiV2(): FutureF8AggregationMountAbiV2 {
  return Object.freeze({
    kind: 'f8-exact-aggregation-wrapper',
    consumes: 'TrustedRequestOutcomeAggregationV2',
    submitsTo: 'F1C-completion-bearing-aggregation-registrar',
    productionCoreAccessorOwner: 'F8',
  });
}

export type { LocateAbortSource };
