import { utf8ByteLengthV2 } from '../../contracts/v2/locate-result-resource-budget-contract-v2.js';
import type { SerializedLocateResultV2 } from '../../contracts/v2/canonical-locate-execution-v2.js';
import {
  CANDIDATE_REASON_CODES_V2,
  CONFIRMED_REASON_CODES_V2,
  COVERAGE_DEGRADATION_CODES_V2,
  EVIDENCE_OPERATION_CODES_V2,
  EVIDENCE_SOURCES_V2,
  EXCLUSION_REASON_CODES_V2,
  LIMIT_REASON_CODES_V2,
  LocateResultV2Schema,
  NEXT_ACTION_CODES_V2,
  PROMOTION_REQUIREMENT_CODES_V2,
  REDACTED_FIELDS_V2,
  REPO_LAYERS_V2,
  type CandidateEvidenceV2,
  type ConfirmedEvidenceV2,
  type CoverageReportV2,
  type EvidenceLocationV2,
  type LocateResultV2,
  type PublicSearchTermV2,
  type RepoNavToolErrorV2,
} from '../../contracts/v2/locate-result-v2.js';
import type {
  FinalizeLocateResultInputV2,
  LocateExecutionCandidateReasonCodeV2,
  LocateExecutionConfirmedReasonCodeV2,
  LocateExecutionEvidenceOperationV2,
  LocateExecutionEvidenceSourceV2,
  LocateExecutionFactsV2,
  LocateExecutionPromotionRequirementV2,
  LocateExecutionRawCandidateEvidenceV2,
  LocateExecutionRawConfirmedEvidenceV2,
  LocateExecutionRawEvidenceLocationV2,
  LocateExecutionResolvedLimitsV2,
} from '../../contracts/v2/locate-execution-facts-v2.js';
import {
  applyPublicFieldBudgetV2,
  guardSensitiveCorpusBudgetV2,
  guardSerializedPublicResultBudgetV2,
  preflightUnsafePublicMaterializationSourceBudgetV2,
} from '../public-output/result-resource-budget-guards-v2.js';
import {
  collectSensitiveCorpusV2,
  redactPublicFieldV2,
  type PublicFieldRedactionV2,
  type SensitiveCorpusV2,
} from '../public-output/sensitive-value-policy-v2.js';

export type PublicLocateResultTransportViewV2 = SerializedLocateResultV2;

type BackendAttemptV2 = CoverageReportV2['backends'][number];
type CoverageDegradationV2 = (typeof COVERAGE_DEGRADATION_CODES_V2)[number];
type ExclusionReasonV2 = (typeof EXCLUSION_REASON_CODES_V2)[number];
type LimitReasonV2 = (typeof LIMIT_REASON_CODES_V2)[number];
type NextActionCodeV2 = (typeof NEXT_ACTION_CODES_V2)[number];
type LocateSuccessResultV2 = Extract<LocateResultV2, Readonly<{ ok: true }>>;
type LocateStatusV2 = LocateSuccessResultV2['evidence']['status'];
type RedactedFieldNameV2 = (typeof REDACTED_FIELDS_V2)[number];
type FieldRedactionReasonV2 = PublicFieldRedactionV2['reasonCodes'][number];

const LOCATE_LIMIT_MAXIMUMS_V2 = Object.freeze({
  maxFiles: 20,
  maxConfirmed: 20,
  maxCandidates: 20,
  timeoutMs: 30_000,
} as const);
type FieldRedactionV2 = PublicFieldRedactionV2;

function deepFreezePlainV2<T>(value: T, seen = new Set<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const child of Object.values(value)) {
    deepFreezePlainV2(child, seen);
  }
  return Object.freeze(value);
}

function canonicalizeValuesV2<const TOrder extends readonly string[]>(
  values: readonly string[],
  order: TOrder,
): readonly TOrder[number][] {
  const present = new Set(values);
  return Object.freeze(order.filter((value) => present.has(value)));
}

function positiveIntegerV2(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(
      'Locate execution count must be a non-negative integer.',
    );
  }
  return value;
}

function canonicalSourcesV2(
  values: readonly LocateExecutionEvidenceSourceV2[],
): readonly LocateExecutionEvidenceSourceV2[] {
  return canonicalizeValuesV2(values, EVIDENCE_SOURCES_V2);
}

function canonicalOperationsV2(
  values: readonly LocateExecutionEvidenceOperationV2[],
): readonly LocateExecutionEvidenceOperationV2[] {
  return canonicalizeValuesV2(values, EVIDENCE_OPERATION_CODES_V2);
}

function canonicalConfirmedReasonsV2(
  values: readonly LocateExecutionConfirmedReasonCodeV2[],
): readonly LocateExecutionConfirmedReasonCodeV2[] {
  return canonicalizeValuesV2(values, CONFIRMED_REASON_CODES_V2);
}

function canonicalCandidateReasonsV2(
  values: readonly LocateExecutionCandidateReasonCodeV2[],
): readonly LocateExecutionCandidateReasonCodeV2[] {
  return canonicalizeValuesV2(values, CANDIDATE_REASON_CODES_V2);
}

function canonicalPromotionRequirementsV2(
  values: readonly LocateExecutionPromotionRequirementV2[],
): readonly LocateExecutionPromotionRequirementV2[] {
  return canonicalizeValuesV2(values, PROMOTION_REQUIREMENT_CODES_V2);
}

function safeErrorV2(
  code: RepoNavToolErrorV2['code'],
  suggestedAction?: 'ADD_TERM',
): RepoNavToolErrorV2 {
  switch (code) {
    case 'INVALID_INPUT':
      return {
        code,
        message: 'Locate request does not match the required schema.',
        recoverable: true,
        ...(suggestedAction === undefined ? {} : { suggestedAction }),
      };
    case 'INVALID_REPOSITORY':
      return {
        code,
        message: 'Repository root is invalid or unavailable.',
        recoverable: true,
      };
    case 'PATH_OUTSIDE_ROOT':
      return {
        code,
        message: 'Repository path is outside the configured root.',
        recoverable: false,
      };
    case 'INTERNAL_ERROR':
      return {
        code,
        message: 'Repository evidence request failed.',
        recoverable: false,
      };
  }
}

function safeErrorCodeV2(code: unknown): RepoNavToolErrorV2['code'] {
  switch (code) {
    case 'INVALID_INPUT':
    case 'INVALID_REPOSITORY':
    case 'PATH_OUTSIDE_ROOT':
    case 'INTERNAL_ERROR':
      return code;
    default:
      return 'INTERNAL_ERROR';
  }
}

function safeErrorResultV2(
  code: RepoNavToolErrorV2['code'],
  suggestedAction?: 'ADD_TERM',
): LocateResultV2 {
  return deepFreezePlainV2({
    ok: false as const,
    error: safeErrorV2(code, suggestedAction),
  }) as LocateResultV2;
}

function createTransportViewV2(
  input: LocateResultV2,
): PublicLocateResultTransportViewV2 {
  const parsed = LocateResultV2Schema.parse(input);
  const budget = guardSerializedPublicResultBudgetV2(parsed);
  if (!budget.ok) {
    throw new Error('Serialized locate result exceeded public budget.');
  }
  const value = deepFreezePlainV2(parsed);
  const compactJson = JSON.stringify(value);
  return Object.freeze({
    value,
    compactJson,
    utf8Bytes: utf8ByteLengthV2(compactJson),
  });
}

function internalErrorTransportV2(): PublicLocateResultTransportViewV2 {
  return createTransportViewV2(safeErrorResultV2('INTERNAL_ERROR'));
}

function orderedBackendAttemptsV2(
  facts: LocateExecutionFactsV2,
): readonly BackendAttemptV2[] {
  const sequence = new Set<number>();
  const attempts = [...facts.backend.attempts].sort(
    (left, right) => left.sequence - right.sequence,
  );
  return Object.freeze(
    attempts.map((attempt): BackendAttemptV2 => {
      if (!Number.isSafeInteger(attempt.sequence) || attempt.sequence < 0) {
        throw new TypeError('Backend sequence must be a non-negative integer.');
      }
      if (sequence.has(attempt.sequence)) {
        throw new TypeError('Backend sequence must be unique.');
      }
      sequence.add(attempt.sequence);
      return {
        backend: attempt.backend,
        status: attempt.outcome,
        completion: attempt.completion,
        termination: attempt.termination,
        ...(attempt.reasonCode === undefined
          ? {}
          : { reasonCode: attempt.reasonCode }),
        hitCount: positiveIntegerV2(attempt.observedHitCount),
      };
    }),
  );
}

function deriveStrategyCompleteV2(
  attempts: readonly BackendAttemptV2[],
): boolean {
  const primary = attempts[0];
  if (primary === undefined) {
    return false;
  }
  const fallback = attempts[1];
  if (primary.backend !== 'codegraph') {
    return primary.status === 'used' && primary.completion === 'complete';
  }
  const fallbackRan = fallback?.backend === 'ripgrep';
  if (fallbackRan) {
    return fallback.status === 'used' && fallback.completion === 'complete';
  }
  return primary.status === 'used' && primary.completion === 'complete';
}

function deriveFallbackCheckedV2(
  attempts: readonly BackendAttemptV2[],
): boolean {
  return (
    attempts[0]?.backend === 'codegraph' && attempts[1]?.backend === 'ripgrep'
  );
}

function addSummaryCountV2(
  summary: Partial<Record<ExclusionReasonV2, number>>,
  code: ExclusionReasonV2,
  count: number,
): void {
  if (count === 0) {
    return;
  }
  summary[code] = (summary[code] ?? 0) + positiveIntegerV2(count);
}

function deriveLimitReasonsV2(
  facts: LocateExecutionFactsV2,
  attempts: readonly BackendAttemptV2[],
): readonly LimitReasonV2[] {
  const limits: LimitReasonV2[] = [];
  if (facts.snapshot.read.maximumFilesReached) {
    limits.push('MAX_FILES_REACHED');
  }
  if (facts.ranking.budget.maximumConfirmedReached) {
    limits.push('MAX_CONFIRMED_REACHED');
  }
  if (facts.ranking.budget.maximumCandidatesReached) {
    limits.push('MAX_CANDIDATES_REACHED');
  }
  if (facts.snapshot.read.maximumFileBytesReached) {
    limits.push('MAX_FILE_BYTES_REACHED');
  }
  if (facts.snapshot.read.maximumExcerptBytesReached) {
    limits.push('MAX_EXCERPT_BYTES_REACHED');
  }
  if (attempts.some((attempt) => attempt.termination === 'early-stop')) {
    limits.push('MAX_BACKEND_HITS_REACHED');
  }
  if (facts.abort.source === 'deadline') {
    limits.push('TIMEOUT_REACHED');
  }
  return canonicalizeValuesV2(limits, LIMIT_REASON_CODES_V2);
}

function deriveUpstreamDegradationsV2(
  facts: LocateExecutionFactsV2,
  attempts: readonly BackendAttemptV2[],
  strategyComplete: boolean,
): readonly CoverageDegradationV2[] {
  const degradations: CoverageDegradationV2[] = [];
  if (facts.snapshot.consistency === 'changed') {
    degradations.push('SNAPSHOT_CHANGED');
  }
  if (facts.capability.unsupportedLanguageHits > 0) {
    degradations.push('SEMANTIC_LANGUAGE_UNSUPPORTED');
  }
  if (
    !strategyComplete &&
    attempts.some((attempt) => attempt.termination === 'early-stop')
  ) {
    degradations.push('BACKEND_EARLY_STOPPED');
  }
  if (
    !strategyComplete &&
    attempts.some((attempt) => attempt.termination === 'output-limit')
  ) {
    degradations.push('PROCESS_OUTPUT_LIMIT_REACHED');
  }
  return degradations;
}

function deriveExclusionSummaryV2(
  facts: LocateExecutionFactsV2,
): Readonly<Partial<Record<ExclusionReasonV2, number>>> {
  const summary: Partial<Record<ExclusionReasonV2, number>> = {};
  addSummaryCountV2(
    summary,
    'NEGATIVE_TERM_MATCH',
    facts.ranking.exclusions.negativeTermMatches,
  );
  addSummaryCountV2(
    summary,
    'OUTSIDE_LAYER_HINT',
    facts.scope.outsideLayerHintExclusions,
  );
  addSummaryCountV2(
    summary,
    'DUPLICATE_LOCATION',
    facts.ranking.exclusions.duplicateLocations,
  );
  addSummaryCountV2(
    summary,
    'UNVERIFIED_FILE_CONTENT',
    facts.ranking.exclusions.unverifiedFileContent,
  );
  addSummaryCountV2(
    summary,
    'SNAPSHOT_CHANGED',
    facts.snapshot.changedEvidenceExclusions,
  );
  const ordered: Partial<Record<ExclusionReasonV2, number>> = {};
  for (const code of EXCLUSION_REASON_CODES_V2) {
    const count = summary[code];
    if (count !== undefined) {
      ordered[code] = count;
    }
  }
  return Object.freeze(ordered);
}

function applyFieldBudgetV2(
  field: 'term' | 'file' | 'symbol' | 'excerpt',
  redaction: FieldRedactionV2,
): FieldRedactionV2 {
  const budgeted = applyPublicFieldBudgetV2(
    field,
    redaction as PublicFieldRedactionV2,
  );
  return Object.freeze({
    value: budgeted.value,
    reasonCodes: budgeted.reasonCodes,
  });
}

function redactedFieldMetadataV2(
  field: RedactedFieldNameV2,
  redaction: FieldRedactionV2,
):
  | {
      readonly field: RedactedFieldNameV2;
      readonly reasonCodes: readonly FieldRedactionReasonV2[];
    }
  | undefined {
  return redaction.reasonCodes.length === 0
    ? undefined
    : {
        field,
        reasonCodes: redaction.reasonCodes,
      };
}

function materializeLocationV2(
  location: LocateExecutionRawEvidenceLocationV2,
  corpus: SensitiveCorpusV2,
): {
  readonly location: EvidenceLocationV2;
  readonly locationRedacted: boolean;
} {
  const file = applyFieldBudgetV2(
    'file',
    redactPublicFieldV2(location.file, 'file', corpus),
  );
  const excerpt = applyFieldBudgetV2(
    'excerpt',
    redactPublicFieldV2(location.excerpt, 'excerpt', corpus),
  );
  const symbol =
    location.symbol === undefined
      ? undefined
      : applyFieldBudgetV2(
          'symbol',
          redactPublicFieldV2(location.symbol, 'symbol', corpus),
        );
  const metadata = [
    redactedFieldMetadataV2('file', file),
    ...(symbol === undefined
      ? []
      : [redactedFieldMetadataV2('symbol', symbol)]),
    redactedFieldMetadataV2('excerpt', excerpt),
  ].filter(
    (value): value is NonNullable<ReturnType<typeof redactedFieldMetadataV2>> =>
      value !== undefined,
  );
  const orderedMetadata = Object.freeze(
    REDACTED_FIELDS_V2.map((field) =>
      metadata.find((candidate) => candidate.field === field),
    ).filter(
      (
        value,
      ): value is NonNullable<ReturnType<typeof redactedFieldMetadataV2>> =>
        value !== undefined,
    ),
  );
  const publicLocation = {
    file: file.value,
    resolvable: file.reasonCodes.length === 0,
    ...(symbol === undefined ? {} : { symbol: symbol.value }),
    lines: location.lines,
    excerpt: excerpt.value,
    ...(orderedMetadata.length === 0
      ? {}
      : {
          redaction: {
            applied: true as const,
            fields: orderedMetadata,
          },
        }),
  };
  return Object.freeze({
    location: publicLocation as EvidenceLocationV2,
    locationRedacted: file.reasonCodes.length > 0,
  });
}

function publicTermsV2(
  terms: readonly Readonly<{ value: string; caseSensitive: boolean }>[],
  corpus: SensitiveCorpusV2,
): readonly PublicSearchTermV2[] {
  return Object.freeze(
    terms.map((term) => {
      const redaction = applyFieldBudgetV2(
        'term',
        redactPublicFieldV2(term.value, 'term', corpus),
      );
      return Object.freeze({
        value: redaction.value,
        caseSensitive: term.caseSensitive,
      });
    }),
  );
}

function publicConfirmedV2(
  evidence: LocateExecutionRawConfirmedEvidenceV2,
  ordinal: number,
  corpus: SensitiveCorpusV2,
): ConfirmedEvidenceV2 {
  if (evidence.evidenceClass !== 'confirmed') {
    throw new TypeError('Confirmed evidence class mismatch.');
  }
  const materialized = materializeLocationV2(evidence.location, corpus);
  return {
    evidenceClass: 'confirmed',
    id: `evidence:v2:${String(ordinal).padStart(4, '0')}`,
    role: evidence.role,
    location: materialized.location,
    provenance: {
      discoveredBy: canonicalSourcesV2(evidence.provenance.discoveredBy),
      verifiedBy: 'filesystem',
      operations: canonicalOperationsV2(evidence.provenance.operations),
    },
    reasonCodes: canonicalConfirmedReasonsV2(evidence.reasonCodes),
  };
}

function publicCandidateV2(
  evidence: LocateExecutionRawCandidateEvidenceV2,
  ordinal: number,
  corpus: SensitiveCorpusV2,
): CandidateEvidenceV2 {
  if (evidence.evidenceClass !== 'candidate') {
    throw new TypeError('Candidate evidence class mismatch.');
  }
  const materialized = materializeLocationV2(evidence.location, corpus);
  return {
    evidenceClass: 'candidate',
    id: `evidence:v2:${String(ordinal).padStart(4, '0')}`,
    role: evidence.role,
    location: materialized.location,
    provenance: {
      discoveredBy: canonicalSourcesV2(evidence.provenance.discoveredBy),
      verifiedBy: 'filesystem',
      operations: canonicalOperationsV2(evidence.provenance.operations),
    },
    reasonCodes: canonicalCandidateReasonsV2(evidence.reasonCodes),
    promotionRequirements: canonicalPromotionRequirementsV2(
      evidence.promotionRequirements,
    ),
  };
}

function materializeEvidenceV2(
  input: Readonly<{
    repositoryRoot: string;
    normalizedTerms: readonly Readonly<{
      value: string;
      caseSensitive: boolean;
    }>[];
    facts: LocateExecutionFactsV2;
  }>,
): {
  readonly normalizedTerms: readonly PublicSearchTermV2[];
  readonly confirmed: readonly ConfirmedEvidenceV2[];
  readonly candidates: readonly CandidateEvidenceV2[];
  readonly locationRedacted: boolean;
} {
  const source = Object.freeze({
    ok: true as const,
    evidence: Object.freeze({
      normalizedTerms: input.normalizedTerms,
      confirmed: input.facts.ranking.confirmed,
      candidates: input.facts.ranking.candidates,
    }),
  });
  const preflight = preflightUnsafePublicMaterializationSourceBudgetV2(source);
  if (!preflight.ok) {
    throw new TypeError(
      'Locate execution materialization source exceeded budget.',
    );
  }
  const corpus = collectSensitiveCorpusV2(source);
  const corpusBudget = guardSensitiveCorpusBudgetV2(corpus);
  if (!corpusBudget.ok) {
    throw new TypeError('Locate execution sensitive corpus exceeded budget.');
  }
  const normalizedTerms = publicTermsV2(input.normalizedTerms, corpus);
  const confirmed = Object.freeze(
    input.facts.ranking.confirmed.map((evidence, index) =>
      Object.freeze(publicConfirmedV2(evidence, index + 1, corpus)),
    ),
  );
  const candidates = Object.freeze(
    input.facts.ranking.candidates.map((evidence, index) =>
      Object.freeze(
        publicCandidateV2(evidence, confirmed.length + index + 1, corpus),
      ),
    ),
  );
  const locationRedacted = [...confirmed, ...candidates].some(
    (evidence) => !evidence.location.resolvable,
  );
  return Object.freeze({
    normalizedTerms,
    confirmed,
    candidates,
    locationRedacted,
  });
}

function deriveCoverageV2(
  facts: LocateExecutionFactsV2,
  attempts: readonly BackendAttemptV2[],
  locationRedacted: boolean,
): CoverageReportV2 {
  const strategyComplete = deriveStrategyCompleteV2(attempts);
  const upstreamDegradations = deriveUpstreamDegradationsV2(
    facts,
    attempts,
    strategyComplete,
  );
  const degradations = canonicalizeValuesV2(
    [
      ...upstreamDegradations,
      ...(locationRedacted ? (['LOCATION_REDACTED'] as const) : []),
    ],
    COVERAGE_DEGRADATION_CODES_V2,
  );
  return {
    backends: attempts,
    strategyComplete,
    fallbackChecked: deriveFallbackCheckedV2(attempts),
    indexState: facts.backend.index.state,
    indexFreshness: facts.backend.index.freshness,
    limitsReached: deriveLimitReasonsV2(facts, attempts),
    degradations,
    exclusionSummary: deriveExclusionSummaryV2(facts),
    abortSource: facts.abort.source,
    unsatisfiedAnchors: Object.freeze(
      [...facts.ranking.unsatisfiedAnchors].sort(
        (left, right) => left.requestIndex - right.requestIndex,
      ),
    ),
    snapshot: {
      gitState: facts.snapshot.gitState,
      consistency: facts.snapshot.consistency,
      filesChecked: positiveIntegerV2(facts.snapshot.filesChecked),
      discardedEvidenceCount: positiveIntegerV2(
        facts.snapshot.discardedEvidenceCount,
      ),
      ...(facts.snapshot.snapshotRef === undefined
        ? {}
        : { snapshotRef: facts.snapshot.snapshotRef }),
    },
    scope: {
      requested: canonicalizeValuesV2(facts.scope.requested, REPO_LAYERS_V2),
      effective: canonicalizeValuesV2(facts.scope.effective, REPO_LAYERS_V2),
      policyVersion: facts.scope.policy,
      unmatchedLayers: canonicalizeValuesV2(
        facts.scope.unmatchedLayers,
        REPO_LAYERS_V2,
      ),
    },
    capabilities: {
      textSearch: 'supported-text-files',
      semanticClassification: facts.capability
        .semanticLanguages as CoverageReportV2['capabilities']['semanticClassification'],
      unsupportedLanguageHits: positiveIntegerV2(
        facts.capability.unsupportedLanguageHits,
      ),
    },
  };
}

function derivePublicStatusV2(
  coverage: CoverageReportV2,
  retainedEvidenceCount: number,
): LocateStatusV2 {
  if (coverage.abortSource === 'caller') {
    return 'cancelled' as LocateStatusV2;
  }
  if (coverage.abortSource === 'deadline') {
    return 'timeout' as LocateStatusV2;
  }
  if (
    retainedEvidenceCount === 0 &&
    !coverage.strategyComplete &&
    coverage.backends.length > 0 &&
    coverage.backends.every(
      (attempt) =>
        attempt.status === 'unavailable' || attempt.status === 'failed',
    )
  ) {
    return 'backend_unavailable' as LocateStatusV2;
  }
  if (
    !coverage.strategyComplete ||
    coverage.degradations.length > 0 ||
    coverage.backends.some(
      (attempt) =>
        attempt.status === 'used' && attempt.completion === 'incomplete',
    ) ||
    coverage.unsatisfiedAnchors.some(
      (anchor) =>
        anchor.reason === 'BUDGET_EXCEEDED' || anchor.reason === 'UNVERIFIED',
    )
  ) {
    return 'partial' as LocateStatusV2;
  }
  return (retainedEvidenceCount > 0 ? 'ok' : 'no_result') as LocateStatusV2;
}

function hasAdjustableRequestBudgetRetryV2(
  limitsReached: readonly LimitReasonV2[],
  limits: LocateExecutionResolvedLimitsV2,
): boolean {
  return (
    (limitsReached.includes('MAX_FILES_REACHED') &&
      limits.maxFiles < LOCATE_LIMIT_MAXIMUMS_V2.maxFiles) ||
    (limitsReached.includes('MAX_CONFIRMED_REACHED') &&
      limits.maxConfirmed < LOCATE_LIMIT_MAXIMUMS_V2.maxConfirmed) ||
    (limitsReached.includes('MAX_CANDIDATES_REACHED') &&
      limits.maxCandidates < LOCATE_LIMIT_MAXIMUMS_V2.maxCandidates)
  );
}

function deriveNextActionsV2(
  input: Readonly<{
    status: LocateStatusV2;
    hasCandidates: boolean;
    limitsReached: readonly LimitReasonV2[];
    abortSource: CoverageReportV2['abortSource'];
    limits: LocateExecutionResolvedLimitsV2;
    initializeCodeGraph: boolean;
  }>,
): readonly NextActionCodeV2[] {
  const actions: NextActionCodeV2[] = [];
  if (input.status === 'cancelled') {
    if (input.hasCandidates) {
      actions.push('CONFIRM_CANDIDATE');
    }
    return canonicalizeValuesV2(actions, NEXT_ACTION_CODES_V2);
  }
  if (input.status === 'no_result') {
    actions.push('ADD_TERM', 'ADD_SYMBOL_ANCHOR');
  }
  if (input.hasCandidates) {
    actions.push('CONFIRM_CANDIDATE');
  }
  if (
    input.initializeCodeGraph &&
    (input.status === 'no_result' || input.status === 'backend_unavailable')
  ) {
    actions.push('INITIALIZE_CODEGRAPH');
  }
  if (
    (input.status === 'partial' &&
      hasAdjustableRequestBudgetRetryV2(input.limitsReached, input.limits)) ||
    (input.status === 'timeout' &&
      input.abortSource === 'deadline' &&
      input.limits.timeoutMs < LOCATE_LIMIT_MAXIMUMS_V2.timeoutMs)
  ) {
    actions.push('RETRY_WITH_HIGHER_LIMIT');
  }
  return canonicalizeValuesV2(actions, NEXT_ACTION_CODES_V2);
}

function successResultV2(
  input: Extract<FinalizeLocateResultInputV2, Readonly<{ ok: true }>>,
): LocateResultV2 {
  const attempts = orderedBackendAttemptsV2(input.facts);
  const materialized = materializeEvidenceV2({
    repositoryRoot: input.repositoryRoot,
    normalizedTerms: input.normalizedTerms,
    facts: input.facts,
  });
  const coverage = deriveCoverageV2(
    input.facts,
    attempts,
    materialized.locationRedacted,
  );
  const retainedEvidenceCount =
    materialized.confirmed.length + materialized.candidates.length;
  const status = derivePublicStatusV2(coverage, retainedEvidenceCount);
  return {
    ok: true,
    evidence: {
      schemaVersion: '2.0',
      status,
      repositoryRef: 'local-repository',
      normalizedTerms: materialized.normalizedTerms,
      confirmed: materialized.confirmed,
      candidates: materialized.candidates,
      coverage,
      nextActions: deriveNextActionsV2({
        status,
        hasCandidates: materialized.candidates.length > 0,
        limitsReached: coverage.limitsReached,
        abortSource: coverage.abortSource,
        limits: input.resolvedLimits,
        initializeCodeGraph:
          input.facts.backend.codegraphInitializationSuggested,
      }),
    },
  } as LocateResultV2;
}

export function finalizeLocateResultV2(
  input: FinalizeLocateResultInputV2,
): PublicLocateResultTransportViewV2 {
  try {
    if (!input.ok) {
      const code = safeErrorCodeV2(input.error.code);
      return createTransportViewV2(
        safeErrorResultV2(
          code,
          code === 'INVALID_INPUT' && input.error.suggestedAction === 'ADD_TERM'
            ? 'ADD_TERM'
            : undefined,
        ),
      );
    }
    return createTransportViewV2(successResultV2(input));
  } catch {
    return internalErrorTransportV2();
  }
}
