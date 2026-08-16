import {
  createLocateExecutionErrorFactsV2,
  createLocateExecutionFactsV2,
  type FinalizeLocateResultInputV2,
  type LocateExecutionErrorFactsV2,
  type LocateExecutionFactsInitV2,
  type LocateExecutionFactsV2,
  type LocateExecutionRawCandidateEvidenceV2,
  type LocateExecutionRawConfirmedEvidenceV2,
  type LocateExecutionResolvedLimitsV2,
} from '../../../src/contracts/v2/locate-execution-facts-v2.js';
import type {
  CandidateEvidenceV2,
  ConfirmedEvidenceV2,
  CoverageReportV2,
  EvidenceLocationV2,
  FinalizedUnsafeLocateResultV2,
  LocateResultV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import { LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2 } from './production-characterization-v2.js';

type LocateSuccessV2 = Extract<LocateResultV2, Readonly<{ ok: true }>>;
type LocateUnsafeSuccessV2 = Extract<
  FinalizedUnsafeLocateResultV2,
  Readonly<{ ok: true }>
>;
type LocateFailureV2 = Extract<LocateResultV2, Readonly<{ ok: false }>>;
type LocateUnsafeConfirmedV2 =
  LocateUnsafeSuccessV2['evidence']['confirmed'][number];
type LocateUnsafeCandidateV2 =
  LocateUnsafeSuccessV2['evidence']['candidates'][number];
type LocateSourceLocationV2 =
  EvidenceLocationV2 | LocateUnsafeConfirmedV2['location'];

export const LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2 = Object.freeze({
  maxFiles: 8,
  maxConfirmed: 8,
  maxCandidates: 8,
  timeoutMs: 10_000,
} satisfies LocateExecutionResolvedLimitsV2);

function requireSuccess(result: LocateResultV2): LocateSuccessV2 {
  if (!result.ok) {
    throw new TypeError('locate execution facts require a success result');
  }
  return result;
}

function requireFailure(result: LocateResultV2): LocateFailureV2 {
  if (result.ok) {
    throw new TypeError('locate error facts require an error result');
  }
  return result;
}

function rawLocationFromCharacterizedPublicV2(
  location: LocateSourceLocationV2,
) {
  if (
    'resolvable' in location &&
    (!location.resolvable || location.redaction !== undefined)
  ) {
    throw new TypeError('redacted public locations require raw fixture facts');
  }
  return {
    file: location.file,
    ...(location.symbol === undefined ? {} : { symbol: location.symbol }),
    lines: [location.lines[0], location.lines[1]] as const,
    excerpt: location.excerpt,
  };
}

function rawConfirmedFromCharacterizedPublicV2(
  evidence: ConfirmedEvidenceV2 | LocateUnsafeConfirmedV2,
): LocateExecutionRawConfirmedEvidenceV2 {
  return {
    evidenceClass: 'confirmed',
    role: evidence.role,
    location: rawLocationFromCharacterizedPublicV2(evidence.location),
    provenance: {
      discoveredBy: evidence.provenance.discoveredBy,
      operations: evidence.provenance.operations,
    },
    reasonCodes: evidence.reasonCodes,
  };
}

function rawCandidateFromCharacterizedPublicV2(
  evidence: CandidateEvidenceV2 | LocateUnsafeCandidateV2,
): LocateExecutionRawCandidateEvidenceV2 {
  return {
    evidenceClass: 'candidate',
    role: evidence.role,
    location: rawLocationFromCharacterizedPublicV2(evidence.location),
    provenance: {
      discoveredBy: evidence.provenance.discoveredBy,
      operations: evidence.provenance.operations,
    },
    reasonCodes: evidence.reasonCodes,
    promotionRequirements: evidence.promotionRequirements,
  };
}

function hasLimitV2(
  coverage: CoverageReportV2,
  code: CoverageReportV2['limitsReached'][number],
): boolean {
  return coverage.limitsReached.includes(code);
}

function exclusionCountV2(
  coverage: CoverageReportV2,
  code: keyof CoverageReportV2['exclusionSummary'],
): number {
  return coverage.exclusionSummary[code] ?? 0;
}

function canonicalAttemptFactsV2(
  attempt: CoverageReportV2['backends'][number],
  sequence: number,
): LocateExecutionFactsInitV2['backend']['attempts'][number] {
  if (attempt.status === 'unavailable') {
    const reasonCode =
      attempt.backend === 'codegraph'
        ? attempt.reasonCode === 'CODEGRAPH_INDEX_MISSING'
          ? 'CODEGRAPH_INDEX_MISSING'
          : 'CODEGRAPH_UNAVAILABLE'
        : 'RIPGREP_UNAVAILABLE';
    return {
      sequence,
      backend: attempt.backend,
      outcome: 'unavailable',
      completion: 'incomplete',
      termination: 'none',
      reasonCode,
      observedHitCount: 0,
    };
  }
  if (attempt.status === 'failed') {
    return {
      sequence,
      backend: attempt.backend,
      outcome: 'failed',
      completion: 'incomplete',
      termination:
        attempt.termination === 'timeout' ? 'timeout' : 'process-error',
      reasonCode: 'BACKEND_PROCESS_FAILED',
      observedHitCount: attempt.hitCount,
    };
  }
  if (attempt.completion === 'complete') {
    return {
      sequence,
      backend: attempt.backend,
      outcome: 'used',
      completion: 'complete',
      termination: 'none',
      ...(attempt.hitCount === 0
        ? {
            reasonCode:
              attempt.backend === 'codegraph'
                ? ('CODEGRAPH_NO_RESULT' as const)
                : ('RIPGREP_NO_RESULT' as const),
          }
        : {}),
      observedHitCount: attempt.hitCount,
    };
  }
  const termination =
    attempt.termination === 'aborted'
      ? 'aborted'
      : attempt.termination === 'output-limit' || attempt.hitCount === 0
        ? 'output-limit'
        : 'early-stop';
  return {
    sequence,
    backend: attempt.backend,
    outcome: 'used',
    completion: 'incomplete',
    termination,
    ...(termination === 'aborted'
      ? { reasonCode: 'BACKEND_ABORTED' as const }
      : {}),
    observedHitCount: attempt.hitCount,
  };
}

function factsInitFromCharacterizedSubsystemsV2(
  success: LocateSuccessV2 | LocateUnsafeSuccessV2,
): LocateExecutionFactsInitV2 {
  const coverage = success.evidence.coverage;
  const changedEvidenceExclusions = exclusionCountV2(
    coverage,
    'SNAPSHOT_CHANGED',
  );
  return {
    backend: {
      attempts: coverage.backends.map(canonicalAttemptFactsV2),
      index: {
        state: coverage.indexState,
        freshness: coverage.indexFreshness,
      },
      codegraphInitializationSuggested: success.evidence.nextActions.includes(
        'INITIALIZE_CODEGRAPH',
      ),
    },
    snapshot: {
      gitState: coverage.snapshot.gitState,
      consistency: coverage.snapshot.consistency,
      filesChecked: coverage.snapshot.filesChecked,
      discardedEvidenceCount:
        coverage.snapshot.consistency === 'changed'
          ? changedEvidenceExclusions
          : coverage.snapshot.discardedEvidenceCount,
      changedEvidenceExclusions,
      read: {
        maximumFilesReached: hasLimitV2(coverage, 'MAX_FILES_REACHED'),
        maximumFileBytesReached: hasLimitV2(coverage, 'MAX_FILE_BYTES_REACHED'),
        maximumExcerptBytesReached: hasLimitV2(
          coverage,
          'MAX_EXCERPT_BYTES_REACHED',
        ),
      },
      ...(coverage.snapshot.snapshotRef === undefined
        ? {}
        : { snapshotRef: coverage.snapshot.snapshotRef }),
    },
    ranking: {
      confirmed: success.evidence.confirmed.map(
        rawConfirmedFromCharacterizedPublicV2,
      ),
      candidates: success.evidence.candidates.map(
        rawCandidateFromCharacterizedPublicV2,
      ),
      unsatisfiedAnchors: coverage.unsatisfiedAnchors,
      budget: {
        maximumConfirmedReached: hasLimitV2(coverage, 'MAX_CONFIRMED_REACHED'),
        maximumCandidatesReached: hasLimitV2(
          coverage,
          'MAX_CANDIDATES_REACHED',
        ),
      },
      exclusions: {
        negativeTermMatches: exclusionCountV2(coverage, 'NEGATIVE_TERM_MATCH'),
        duplicateLocations: exclusionCountV2(coverage, 'DUPLICATE_LOCATION'),
        unverifiedFileContent: exclusionCountV2(
          coverage,
          'UNVERIFIED_FILE_CONTENT',
        ),
      },
    },
    scope: {
      requested: coverage.scope.requested,
      effective: coverage.scope.effective,
      unmatchedLayers: coverage.scope.unmatchedLayers,
      policy: coverage.scope.policyVersion,
      outsideLayerHintExclusions: exclusionCountV2(
        coverage,
        'OUTSIDE_LAYER_HINT',
      ),
    },
    capability: {
      semanticLanguages: coverage.capabilities.semanticClassification,
      unsupportedLanguageHits: coverage.capabilities.unsupportedLanguageHits,
    },
    abort: {
      source: coverage.abortSource,
    },
  };
}

export function locateExecutionFactsFromCharacterizedSubsystemsV2(
  result: LocateResultV2,
): LocateExecutionFactsV2 {
  return createLocateExecutionFactsV2(
    factsInitFromCharacterizedSubsystemsV2(requireSuccess(result)),
  );
}

export function locateExecutionFinalizerInputFromCharacterizedSubsystemsV2(
  result: LocateResultV2,
  limits: LocateExecutionResolvedLimitsV2 = LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
): FinalizeLocateResultInputV2 {
  const success = requireSuccess(result);
  return {
    ok: true,
    repositoryRoot: 'local-repository',
    normalizedTerms: success.evidence.normalizedTerms.map((term) => ({
      value: term.value,
      caseSensitive: term.caseSensitive,
    })),
    resolvedLimits: limits,
    facts: createLocateExecutionFactsV2(
      factsInitFromCharacterizedSubsystemsV2(success),
    ),
  };
}

export function locateExecutionFinalizerInputFromUnsafePublicSourceV2(
  result: FinalizedUnsafeLocateResultV2,
  limits: LocateExecutionResolvedLimitsV2 = LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
): FinalizeLocateResultInputV2 {
  if (!result.ok) {
    return {
      ok: false,
      error: createLocateExecutionErrorFactsV2({
        code: result.error.code,
        ...(result.error.suggestedAction === undefined
          ? {}
          : { suggestedAction: result.error.suggestedAction }),
      }),
    };
  }
  return {
    ok: true,
    repositoryRoot: 'local-repository',
    normalizedTerms: result.evidence.normalizedTerms.map((term) => ({
      value: term.value,
      caseSensitive: term.caseSensitive,
    })),
    resolvedLimits: limits,
    facts: createLocateExecutionFactsV2(
      factsInitFromCharacterizedSubsystemsV2(result),
    ),
  };
}

export function locateExecutionErrorFactsFromPublicResultV2(
  result: LocateResultV2,
): LocateExecutionErrorFactsV2 {
  const failure = requireFailure(result);
  return createLocateExecutionErrorFactsV2({
    code: failure.error.code,
    ...('suggestedAction' in failure.error &&
    failure.error.suggestedAction !== undefined
      ? { suggestedAction: failure.error.suggestedAction }
      : {}),
  });
}

const redactionCoverage =
  LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2.evidence.coverage;

export const LOCATION_REDACTION_LOCATE_EXECUTION_FACTS_V2 =
  createLocateExecutionFactsV2({
    backend: {
      attempts: redactionCoverage.backends.map(canonicalAttemptFactsV2),
      index: {
        state: redactionCoverage.indexState,
        freshness: redactionCoverage.indexFreshness,
      },
      codegraphInitializationSuggested: false,
    },
    snapshot: {
      gitState: redactionCoverage.snapshot.gitState,
      consistency: redactionCoverage.snapshot.consistency,
      filesChecked: redactionCoverage.snapshot.filesChecked,
      discardedEvidenceCount: redactionCoverage.snapshot.discardedEvidenceCount,
      changedEvidenceExclusions: 0,
      read: {
        maximumFilesReached: false,
        maximumFileBytesReached: false,
        maximumExcerptBytesReached: false,
      },
    },
    ranking: {
      confirmed: [],
      candidates: [
        {
          evidenceClass: 'candidate',
          role: 'reference',
          location: {
            file: 'src/customer-do-not-publish/config.ts',
            lines: [1, 1],
            excerpt: 'password=customer-do-not-publish',
          },
          provenance: {
            discoveredBy:
              LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2.evidence
                .candidates[0]!.provenance.discoveredBy,
            operations:
              LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2.evidence
                .candidates[0]!.provenance.operations,
          },
          reasonCodes:
            LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2.evidence
              .candidates[0]!.reasonCodes,
          promotionRequirements:
            LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2.evidence
              .candidates[0]!.promotionRequirements,
        },
      ],
      unsatisfiedAnchors: redactionCoverage.unsatisfiedAnchors,
      budget: {
        maximumConfirmedReached: false,
        maximumCandidatesReached: false,
      },
      exclusions: {
        negativeTermMatches: 0,
        duplicateLocations: 0,
        unverifiedFileContent: 0,
      },
    },
    scope: {
      requested: redactionCoverage.scope.requested,
      effective: redactionCoverage.scope.effective,
      unmatchedLayers: redactionCoverage.scope.unmatchedLayers,
      policy: redactionCoverage.scope.policyVersion,
      outsideLayerHintExclusions: 0,
    },
    capability: {
      semanticLanguages: redactionCoverage.capabilities.semanticClassification,
      unsupportedLanguageHits:
        redactionCoverage.capabilities.unsupportedLanguageHits,
    },
    abort: {
      source: redactionCoverage.abortSource,
    },
  } satisfies LocateExecutionFactsInitV2);

export const LOCATION_REDACTION_FINALIZE_INPUT_V2 = Object.freeze({
  ok: true as const,
  repositoryRoot: 'local-repository',
  normalizedTerms: Object.freeze([
    Object.freeze({
      value: 'password=customer-do-not-publish',
      caseSensitive: true,
    }),
  ]),
  resolvedLimits: LOCATE_EXECUTION_DEFAULT_RESOLVED_LIMITS_V2,
  facts: LOCATION_REDACTION_LOCATE_EXECUTION_FACTS_V2,
} satisfies FinalizeLocateResultInputV2);
