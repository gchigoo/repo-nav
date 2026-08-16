import type {
  CandidateEvidence,
  ConfirmedEvidence,
  ExclusionReasonCode,
  NormalizedSearchTerm,
} from '../../contracts/index.js';
import type { BackendExecutionContextV2 } from '../../contracts/v2/backend-execution-outcome-v2.js';
import {
  createLocateExecutionFactsV2,
  type LocateExecutionBackendAttemptFactsV2,
  type LocateExecutionFactsV2,
} from '../../contracts/v2/locate-execution-facts-v2.js';
import type {
  LocateExecutionTokenV2,
  RankedEvidenceFactsV2,
  SnapshotFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  finalizeBackendExecutionTraceV2,
  requireBackendExecutionTraceV2,
} from '../../process/backend-execution-context-v2.js';
import type { ExecutionCapabilityCoverageMountV2 } from '../language/build-execution-capability-coverage-v2.js';
import {
  requireEvidenceRankingOutcomeV2,
  type EvidenceRankingOutcomeV2,
} from '../ranking/evidence-ranking-outcome-v2.js';
import type { BoundSafeDiscoverySelectionV2 } from '../request-snapshot/discovery-selection-binding-v2.js';
import {
  requireSnapshotBoundSelectedVerificationOutcomeV2,
  type SnapshotBoundSelectedVerificationOutcomeV2,
} from '../request-snapshot/selected-verification-outcome-v2.js';
import type { ExecutionScopeCoverageMountV1 } from '../scope/build-execution-scope-coverage-v1.js';

export interface LocateExecutionDraftV2 {
  readonly repositoryRoot: string;
  readonly normalizedTerms: readonly NormalizedSearchTerm[];
  readonly confirmed: readonly ConfirmedEvidence[];
  readonly candidates: readonly CandidateEvidence[];
  readonly backend: Readonly<{
    fallbackAttempts: readonly LocateExecutionBackendAttemptFactsV2[];
    index: Readonly<{
      state: 'available' | 'missing' | 'unavailable' | 'error' | 'unknown';
      freshness: 'not-applicable' | 'unknown' | 'possibly-stale';
    }>;
    codegraphInitializationSuggested: boolean;
  }>;
  readonly snapshotRead: Readonly<{
    maximumFilesReached: boolean;
    maximumFileBytesReached: boolean;
    maximumExcerptBytesReached: boolean;
  }>;
  readonly rankingBudget: Readonly<{
    maximumConfirmedReached: boolean;
    maximumCandidatesReached: boolean;
  }>;
  readonly exclusions: Readonly<Partial<Record<ExclusionReasonCode, number>>>;
  readonly abortSource: 'none' | 'caller' | 'deadline';
}

function backendIndexFromObservationV2(
  observation: ReturnType<
    typeof requireBackendExecutionTraceV2
  >['codegraphIndexObservation'],
): LocateExecutionDraftV2['backend']['index'] {
  switch (observation.kind) {
    case 'not-observed':
      return Object.freeze({ state: 'unknown', freshness: 'unknown' });
    case 'available':
      return Object.freeze({
        state: 'available',
        freshness: observation.possiblyStale ? 'possibly-stale' : 'unknown',
      });
    case 'missing-index':
      return Object.freeze({
        state: 'missing',
        freshness: 'not-applicable',
      });
    case 'tool-unavailable':
      return Object.freeze({
        state: 'unavailable',
        freshness: 'not-applicable',
      });
    case 'error':
      return Object.freeze({ state: 'error', freshness: 'unknown' });
  }
}

function backendFactsV2(input: {
  readonly draft: LocateExecutionDraftV2;
  readonly backendExecutionContext: BackendExecutionContextV2 | undefined;
  readonly execution: LocateExecutionTokenV2;
}): LocateExecutionFactsV2['backend'] {
  let attempts = input.draft.backend.fallbackAttempts;
  let index = input.draft.backend.index;
  if (input.backendExecutionContext !== undefined) {
    const trace = finalizeBackendExecutionTraceV2(
      input.backendExecutionContext,
      input.execution,
    );
    const view = requireBackendExecutionTraceV2(trace, input.execution);
    attempts = Object.freeze(
      view.outcomes.map((outcome, sequence) => {
        const reasonCode =
          'reasonCode' in outcome ? outcome.reasonCode : undefined;
        return Object.freeze({
          sequence,
          backend: outcome.backend,
          outcome: outcome.status,
          completion: outcome.completion,
          termination: outcome.termination,
          observedHitCount: outcome.hitCount,
          ...(reasonCode === undefined ? {} : { reasonCode }),
        });
      }),
    );
    index = backendIndexFromObservationV2(view.codegraphIndexObservation);
  }
  return {
    attempts,
    index,
    codegraphInitializationSuggested:
      input.draft.backend.codegraphInitializationSuggested ||
      index.state === 'missing',
  };
}

export function createPassthroughRankedEvidenceFactsV2(input: {
  readonly confirmed: readonly ConfirmedEvidence[];
  readonly candidates: readonly CandidateEvidence[];
}): RankedEvidenceFactsV2 {
  return Object.freeze({
    confirmed: Object.freeze(
      input.confirmed.map((evidence) =>
        Object.freeze({
          evidenceClass: 'confirmed' as const,
          role: evidence.role,
          location: Object.freeze({
            file: evidence.location.file,
            ...(evidence.location.symbol === undefined
              ? {}
              : { symbol: evidence.location.symbol }),
            lines: evidence.location.lines,
            excerpt: evidence.location.excerpt,
            resolvable: true as const,
          }),
          provenance: evidence.provenance,
          reasonCodes: evidence.reasonCodes,
        }),
      ),
    ),
    candidates: Object.freeze(
      input.candidates.map((evidence) =>
        Object.freeze({
          evidenceClass: 'candidate' as const,
          role: evidence.role,
          location: Object.freeze({
            file: evidence.location.file,
            ...(evidence.location.symbol === undefined
              ? {}
              : { symbol: evidence.location.symbol }),
            lines: evidence.location.lines,
            excerpt: evidence.location.excerpt,
            resolvable: true as const,
          }),
          provenance: evidence.provenance,
          reasonCodes: evidence.reasonCodes,
          promotionRequirements: evidence.promotionRequirements,
        }),
      ),
    ),
    unsatisfiedAnchors: Object.freeze([]),
  });
}

function rawConfirmedV2(
  evidence: RankedEvidenceFactsV2['confirmed'][number],
): LocateExecutionFactsV2['ranking']['confirmed'][number] {
  if (evidence.evidenceClass !== 'confirmed') {
    throw new TypeError('Ranked confirmed facts must be confirmed evidence.');
  }
  return {
    evidenceClass: 'confirmed',
    role: evidence.role,
    location: {
      file: evidence.location.file,
      ...(evidence.location.symbol === undefined
        ? {}
        : { symbol: evidence.location.symbol }),
      lines: [evidence.location.lines[0], evidence.location.lines[1]],
      excerpt: evidence.location.excerpt,
    },
    provenance: {
      discoveredBy: evidence.provenance.discoveredBy,
      operations: evidence.provenance.operations,
    },
    reasonCodes: evidence.reasonCodes,
  };
}

function rawCandidateV2(
  evidence: RankedEvidenceFactsV2['candidates'][number],
): LocateExecutionFactsV2['ranking']['candidates'][number] {
  if (evidence.evidenceClass !== 'candidate') {
    throw new TypeError('Ranked candidate facts must be candidates.');
  }
  return {
    evidenceClass: 'candidate',
    role: evidence.role,
    location: {
      file: evidence.location.file,
      ...(evidence.location.symbol === undefined
        ? {}
        : { symbol: evidence.location.symbol }),
      lines: [evidence.location.lines[0], evidence.location.lines[1]],
      excerpt: evidence.location.excerpt,
    },
    provenance: {
      discoveredBy: evidence.provenance.discoveredBy,
      operations: evidence.provenance.operations,
    },
    reasonCodes: evidence.reasonCodes,
    promotionRequirements: evidence.promotionRequirements,
  };
}

export function createLocateExecutionFactsFromDraftV2(input: {
  readonly draft: LocateExecutionDraftV2;
  readonly snapshotFacts: SnapshotFactsV2;
  readonly rankingFacts: RankedEvidenceFactsV2;
  readonly rankingOutcome: EvidenceRankingOutcomeV2 | undefined;
  readonly scopeMount: ExecutionScopeCoverageMountV1;
  readonly capabilityMount: ExecutionCapabilityCoverageMountV2;
  readonly backendExecutionContext: BackendExecutionContextV2 | undefined;
  readonly execution: LocateExecutionTokenV2;
  readonly selectedVerificationOutcome?: SnapshotBoundSelectedVerificationOutcomeV2;
  readonly boundSelection?: BoundSafeDiscoverySelectionV2;
}): LocateExecutionFactsV2 {
  const rankingBudget =
    input.rankingOutcome === undefined
      ? undefined
      : requireEvidenceRankingOutcomeV2(
          input.rankingOutcome,
          input.scopeMount.snapshotProof,
          input.execution,
        ).budgetFacts;
  const snapshotCoverage = input.snapshotFacts.coverage;
  const scope = input.scopeMount.fragmentValue;
  const capability = input.capabilityMount.fragmentValue;
  if (
    (input.selectedVerificationOutcome === undefined) !==
    (input.boundSelection === undefined)
  ) {
    throw new TypeError('selected verification authorities must be complete');
  }
  const selectedVerification =
    input.selectedVerificationOutcome === undefined ||
    input.boundSelection === undefined
      ? undefined
      : requireSnapshotBoundSelectedVerificationOutcomeV2(
          input.selectedVerificationOutcome,
          input.boundSelection,
          input.scopeMount.snapshotProof,
          input.execution,
        );
  return createLocateExecutionFactsV2({
    backend: backendFactsV2(input),
    snapshot: {
      gitState: snapshotCoverage.gitState,
      consistency: snapshotCoverage.consistency,
      filesChecked: snapshotCoverage.filesChecked,
      discardedEvidenceCount: snapshotCoverage.discardedEvidenceCount,
      changedEvidenceExclusions: snapshotCoverage.discardedEvidenceCount,
      read: {
        maximumFilesReached:
          input.draft.snapshotRead.maximumFilesReached ||
          rankingBudget?.maxFilesReached === true,
        maximumFileBytesReached:
          input.draft.snapshotRead.maximumFileBytesReached ||
          selectedVerification?.readLimits.maximumFileBytesReached === true,
        maximumExcerptBytesReached:
          input.draft.snapshotRead.maximumExcerptBytesReached ||
          selectedVerification?.readLimits.maximumExcerptBytesReached === true,
      },
      ...(snapshotCoverage.snapshotRef === undefined
        ? {}
        : { snapshotRef: snapshotCoverage.snapshotRef }),
    },
    ranking: {
      confirmed: input.rankingFacts.confirmed.map(rawConfirmedV2),
      candidates: input.rankingFacts.candidates.map(rawCandidateV2),
      unsatisfiedAnchors: input.rankingFacts.unsatisfiedAnchors,
      budget: {
        maximumConfirmedReached:
          rankingBudget?.maxConfirmedReached ??
          input.draft.rankingBudget.maximumConfirmedReached,
        maximumCandidatesReached:
          rankingBudget?.maxCandidatesReached ??
          input.draft.rankingBudget.maximumCandidatesReached,
      },
      exclusions: {
        negativeTermMatches: input.draft.exclusions.NEGATIVE_TERM_MATCH ?? 0,
        duplicateLocations:
          selectedVerification?.exclusions.duplicateLocations ?? 0,
        unverifiedFileContent:
          selectedVerification?.exclusions.unverifiedFileContent ?? 0,
      },
    },
    scope: {
      requested: scope.requested,
      effective: scope.effective,
      unmatchedLayers: scope.unmatchedLayers,
      policy: scope.policyVersion,
      outsideLayerHintExclusions:
        input.scopeMount.view.contribution.outsideLayerHintCount,
    },
    capability: {
      semanticLanguages: capability.semanticClassification,
      unsupportedLanguageHits: capability.unsupportedLanguageHits,
    },
    abort: {
      source: input.draft.abortSource,
    },
  });
}
