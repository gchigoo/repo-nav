/**
 * Register F2 ranking + F8 aggregation bundle for the same execution token
 * before production V2 projection. Required after F9 cutover (F8 harness-only
 * registration is no longer sufficient).
 */

import type { BackendExecutionContextV2 } from '../../contracts/v2/backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { ResolvedLocateLimits } from '../../contracts/request.js';
import type {
  FinalizedAbortDecisionV2,
  LocateAbortCoordinatorV2,
} from '../abort-source.js';
import {
  registerAcceptedCompleteRealAggregationBundleV2,
  type AcceptedCompleteRealAggregationBundleV2,
} from '../canonical/accepted-complete-real-locate-shadow-orchestrator-v2.js';
import type { ExecutionCapabilityCoverageMountV2 } from '../language/build-execution-capability-coverage-v2.js';
import { registerF2RankingOutcomeForExecutionV2 } from '../public-output/f2-locate-projection-stages-v2.js';
import {
  issueEvidenceRankingOutcomeV2,
  type EvidenceRankingOutcomeV2,
} from '../ranking/evidence-ranking-outcome-v2.js';
import { issueTrustedFallbackDecisionV2 } from '../request-outcome/trusted-fallback-decision-v2.js';
import {
  createSnapshotOutcomeContributionV2,
  requireSnapshotOutcomeContributionV2,
} from '../request-snapshot/snapshot-outcome-contribution-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type { ScopeCoverageBasisV2 } from '../request-snapshot/scope-coverage-basis-v2.js';
import type { ResolvedRepositoryScopeV1 } from '../scope/resolve-repository-scope-v1.js';
import type { ExecutionScopeCoverageMountV1 } from '../scope/build-execution-scope-coverage-v1.js';
import {
  createBackendExecutionContextV2,
  createNotObservedCodeGraphIndexObservationV2,
  finalizeBackendExecutionTraceV2,
} from '../../process/backend-execution-context-v2.js';
import { NodeSafeProcessRunner } from '../../repository/node-safe-process-runner.js';

export interface ProductionAcceptedProjectionSeamInputV2 {
  readonly execution: LocateExecutionTokenV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly rankingOutcome: EvidenceRankingOutcomeV2 | undefined;
  readonly scopeMount: ExecutionScopeCoverageMountV1;
  readonly capabilityMount: ExecutionCapabilityCoverageMountV2;
  readonly resolvedLimits: ResolvedLocateLimits;
  readonly abortCoordinator: LocateAbortCoordinatorV2;
  readonly abortDecision: FinalizedAbortDecisionV2;
  readonly backendExecutionContext: BackendExecutionContextV2 | undefined;
  readonly fallbackChecked: boolean;
  readonly fallbackRequired: boolean;
  readonly completeEquivalentFallback: boolean;
  readonly discardedEvidenceCount: number;
}

/**
 * Issue empty ranking when the success path had no discovery selection.
 */
function ensureRankingOutcomeV2(
  rankingOutcome: EvidenceRankingOutcomeV2 | undefined,
  snapshotProof: SnapshotTrustProofV2,
  execution: LocateExecutionTokenV2,
): EvidenceRankingOutcomeV2 {
  if (rankingOutcome !== undefined) {
    return rankingOutcome;
  }
  return issueEvidenceRankingOutcomeV2({
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
    snapshotProof,
    execution,
    collisionAnchorKeys: new Set(),
  });
}

/**
 * Finalize a production backend trace for aggregation (not-observed when no
 * expanded codegraph starts were recorded).
 */
function finalizeProductionBackendTraceV2(
  backendExecutionContext: BackendExecutionContextV2 | undefined,
  execution: LocateExecutionTokenV2,
  abortCoordinator: LocateAbortCoordinatorV2,
): ReturnType<typeof finalizeBackendExecutionTraceV2> {
  const context =
    backendExecutionContext ??
    createBackendExecutionContextV2(
      new NodeSafeProcessRunner(),
      undefined,
      abortCoordinator.signal,
      execution,
    );
  const observation = createNotObservedCodeGraphIndexObservationV2(
    // Start registry is unused by the not-observed path beyond the signature.
    Object.freeze({}) as never,
    execution,
    context,
  );
  return finalizeBackendExecutionTraceV2(context, observation, execution);
}

/**
 * Register ranking outcome and accepted-complete aggregation bundle for projection.
 */
export function registerProductionAcceptedProjectionSeamsV2(
  input: ProductionAcceptedProjectionSeamInputV2,
): void {
  const ranking = ensureRankingOutcomeV2(
    input.rankingOutcome,
    input.snapshotProof,
    input.execution,
  );
  registerF2RankingOutcomeForExecutionV2(
    input.execution,
    ranking,
    input.snapshotProof,
  );

  const backendTrace = finalizeProductionBackendTraceV2(
    input.backendExecutionContext,
    input.execution,
    input.abortCoordinator,
  );
  const fallback = issueTrustedFallbackDecisionV2({
    execution: input.execution,
    backendTrace,
    checked: input.fallbackChecked,
    required: input.fallbackRequired,
    completeEquivalentFallback: input.completeEquivalentFallback,
  });

  const snapshotToken = createSnapshotOutcomeContributionV2({
    snapshotProof: input.snapshotProof,
    execution: input.execution,
    discardedEvidenceCount: input.discardedEvidenceCount,
    ledger: Object.freeze([]),
  });
  const snapshotContribution = requireSnapshotOutcomeContributionV2(
    snapshotToken,
    input.snapshotProof,
    input.execution,
  );

  const bundle: AcceptedCompleteRealAggregationBundleV2 = Object.freeze({
    execution: input.execution,
    backendTrace,
    fallback,
    ranking,
    snapshotProof: input.snapshotProof,
    resolvedLimits: input.resolvedLimits,
    abortDecision: input.abortDecision,
    abortCoordinator: input.abortCoordinator,
    contributions: Object.freeze([
      snapshotContribution,
      input.scopeMount.view.contribution,
      input.capabilityMount.contribution,
    ] as const),
    scopeProof: input.scopeMount.view.proof,
    expectedEligiblePool: input.scopeMount.eligiblePool,
    expectedFoldProof: input.scopeMount.foldProof,
    expectedCoverageBasis: input.scopeMount.coverageBasis,
    expectedResolvedScope: input.scopeMount.resolvedScope,
    expectedCapabilityFacts: input.capabilityMount.facts,
  });

  registerAcceptedCompleteRealAggregationBundleV2(input.execution, bundle);
}

export type { ScopeCoverageBasisV2, ResolvedRepositoryScopeV1 };
