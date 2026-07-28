import { Inject, Injectable } from '@nestjs/common';

import {
  createPublicErrorResult,
  createDiscoveryKey,
  DEFAULT_MAX_FILE_BYTES,
  LIMIT_REASON_CODES,
  normalizeLocateAnchors,
  normalizeSearchTerms,
  RepositoryAccessError,
  resolveLocateLimits,
  type BackendAttempt,
  type BackendHealth,
  type BackendSearchResult,
  type ExclusionReasonCode,
  type LimitReasonCode,
  type LocateExecutionContext,
  type LocateRequest,
  type LocateResult,
  type NormalizedLocateAnchor,
  type NormalizedSearchTerm,
  type RepositoryReader,
  type RepositorySearchBackend,
  type ResolvedLocateLimits,
  type SearchBackendId,
} from '../../contracts/index.js';
import type {
  CanonicalLocateExecutionV2,
  CanonicalLocateExecutorV2,
  LocateProjectionExecutionCapabilityV2,
  UnsafeToolErrorFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../runtime/tokens.js';
import {
  LocateAbortCoordinator,
  type LocateAbortSource,
} from '../abort-source.js';
import {
  applyCandidatePolicy,
  createVerifiedCandidateContext,
  materializeCandidateDraft,
} from '../candidate-policy.js';
import { classifyDiscoveryRecords } from '../direct-mapping-classifier.js';
import { verifyAndMergeBackendHits } from '../discovery-record.js';
import { redactLocateResult } from '../evidence-redactor.js';
import { evaluateLocateStatus } from '../locate-status-evaluator.js';
import { createNextActions } from '../next-action-policy.js';
import {
  selectCandidateBudget,
  selectConfirmedBudget,
} from '../result-budget-selector.js';
import {
  registerCanonicalLocateExecutionInputV2,
  requireLocateProjectionExecutionTokenV2,
} from './locate-projection-execution-capability-v2.js';

const CLASSIFICATION_MAX_LINES = 12;
const CLASSIFICATION_MAX_BYTES = 4 * 1024;

type LocateSuccessEvidence = Extract<LocateResult, { readonly ok: true }>['evidence'];

interface TimeoutResultOptions {
  readonly attempts?: readonly BackendAttempt[];
  readonly codeGraphHealth?: BackendHealth;
  readonly confirmed?: LocateSuccessEvidence['confirmed'];
  readonly candidates?: LocateSuccessEvidence['candidates'];
  readonly limitsReached?: readonly LimitReasonCode[];
  readonly exclusionSummary?: LocateSuccessEvidence['coverage']['exclusionSummary'];
  readonly fallbackChecked?: boolean;
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareBackendHit(
  left: Parameters<typeof verifyAndMergeBackendHits>[0]['hits'][number],
  right: Parameters<typeof verifyAndMergeBackendHits>[0]['hits'][number],
): number {
  return (
    compareText(left.file, right.file) ||
    (left.lines?.[0] ?? Number.MAX_SAFE_INTEGER) -
      (right.lines?.[0] ?? Number.MAX_SAFE_INTEGER) ||
    (left.lines?.[1] ?? Number.MAX_SAFE_INTEGER) -
      (right.lines?.[1] ?? Number.MAX_SAFE_INTEGER) ||
    compareText(left.symbol ?? '', right.symbol ?? '') ||
    compareText(left.matchedText ?? '', right.matchedText ?? '') ||
    compareText(left.source, right.source) ||
    compareText(left.reasonCodes.join('\u0000'), right.reasonCodes.join('\u0000'))
  );
}

function verificationTerms(
  terms: readonly NormalizedSearchTerm[],
  anchors: readonly NormalizedLocateAnchor[],
): readonly NormalizedSearchTerm[] {
  const values: NormalizedSearchTerm[] = [...terms];
  for (const anchor of anchors) {
    if (
      anchor.kind === 'term' ||
      anchor.kind === 'table' ||
      anchor.kind === 'route'
    ) {
      values.push({ value: anchor.value, caseSensitive: anchor.caseSensitive });
    }
  }
  const seen = new Set<string>();
  return Object.freeze(
    values.filter((term) => {
      const key = `${term.caseSensitive ? '1' : '0'}\u0000${
        term.caseSensitive
          ? term.value
          : term.value.toLocaleLowerCase('und')
      }`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  );
}

function uniqueSchemaOrder<T extends string>(
  values: readonly T[],
  schemaOrder: readonly T[],
): readonly T[] {
  const priorities = new Map(schemaOrder.map((value, index) => [value, index]));
  return Object.freeze(
    Array.from(new Set(values)).sort(
      (left, right) =>
        (priorities.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (priorities.get(right) ?? Number.MAX_SAFE_INTEGER),
    ),
  );
}

function attemptFor(
  backend: SearchBackendId,
  health: BackendHealth,
  hitCount: number,
): BackendAttempt {
  const status: BackendAttempt['status'] =
    health.state === 'available'
      ? 'used'
      : health.state === 'missing' || health.state === 'unavailable'
        ? 'unavailable'
        : 'failed';
  return Object.freeze({
    backend,
    status,
    hitCount,
    ...(health.reasonCode === undefined ? {} : { reasonCode: health.reasonCode }),
  });
}

function indexStateFor(
  health: BackendHealth | undefined,
): 'available' | 'missing' | 'unavailable' | 'error' | 'unknown' {
  return health?.state ?? 'unknown';
}

function indexFreshnessFor(
  health: BackendHealth | undefined,
): 'not-applicable' | 'unknown' | 'possibly-stale' {
  if (health === undefined || health.state === 'missing' || health.state === 'unavailable') {
    return 'not-applicable';
  }
  return health.possibleStaleIndex === true ? 'possibly-stale' : 'unknown';
}

function selectBackendHits(
  results: readonly BackendSearchResult[],
  maxFiles: number,
): {
  readonly hits: readonly BackendSearchResult['hits'][number][];
  readonly filesTruncated: boolean;
} {
  const hits: BackendSearchResult['hits'][number][] = [];
  const files = new Set<string>();
  let filesTruncated = false;
  for (const hit of results.flatMap((result) => result.hits).sort(compareBackendHit)) {
    if (!files.has(hit.file) && files.size >= maxFiles) {
      filesTruncated = true;
      continue;
    }
    files.add(hit.file);
    hits.push(hit);
  }
  return Object.freeze({ hits: Object.freeze(hits), filesTruncated });
}

function decideToolError(error: unknown): UnsafeToolErrorFactsV2 {
  if (error instanceof RepositoryAccessError) {
    if (error.code === 'INVALID_REPOSITORY') {
      return Object.freeze({ code: 'INVALID_REPOSITORY' as const });
    }
    if (
      error.code === 'PATH_OUTSIDE_ROOT' ||
      error.code === 'INVALID_RELATIVE_PATH'
    ) {
      return Object.freeze({ code: 'PATH_OUTSIDE_ROOT' as const });
    }
  }
  return Object.freeze({ code: 'INTERNAL_ERROR' as const });
}

@Injectable()
export class CanonicalRepositoryLocateExecutorV2
  implements CanonicalLocateExecutorV2
{
  public constructor(
    @Inject(REPOSITORY_SEARCH_BACKENDS)
    private readonly backends: readonly RepositorySearchBackend[],
    @Inject(REPOSITORY_READER)
    private readonly reader: RepositoryReader,
  ) {}

  private terminalSuccess(
    legacy: LocateResult,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): CanonicalLocateExecutionV2 {
    if (!legacy.ok) {
      return this.terminalFailure(
        Object.freeze({ code: 'INTERNAL_ERROR' as const }),
        projectionExecution,
      );
    }
    const execution = requireLocateProjectionExecutionTokenV2(projectionExecution);
    const input: CanonicalLocateExecutionV2 = Object.freeze({
      ok: true as const,
      envelope: Object.freeze({
        repositoryRoot: legacy.evidence.repositoryRoot,
        normalizedTerms: legacy.evidence.normalizedTerms,
        fragments: Object.freeze({}),
      }),
      legacyV1Projection: legacy,
    });
    registerCanonicalLocateExecutionInputV2(
      input,
      projectionExecution,
      execution,
    );
    return input;
  }

  private terminalFailure(
    error: UnsafeToolErrorFactsV2,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): CanonicalLocateExecutionV2 {
    const execution = requireLocateProjectionExecutionTokenV2(projectionExecution);
    const legacy = createPublicErrorResult(
      error.code,
      error.suggestedAction,
    ) as Extract<LocateResult, { readonly ok: false }>;
    const input: CanonicalLocateExecutionV2 = Object.freeze({
      ok: false as const,
      error,
      legacyV1Projection: legacy,
    });
    registerCanonicalLocateExecutionInputV2(
      input,
      projectionExecution,
      execution,
    );
    return input;
  }

  public async execute(
    request: LocateRequest,
    context: LocateExecutionContext,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): Promise<CanonicalLocateExecutionV2> {
    requireLocateProjectionExecutionTokenV2(projectionExecution);
    const limits = resolveLocateLimits(request.limits);
    const mode = request.termCase ?? 'smart';
    const normalizedTerms = normalizeSearchTerms(request.terms, mode);
    const anchors = normalizeLocateAnchors(request.anchors ?? [], mode);
    const termsForVerification = verificationTerms(normalizedTerms, anchors);
    const negativeTerms = normalizeSearchTerms(request.negativeTerms ?? [], mode);
    const abortCoordinator = new LocateAbortCoordinator();
    const abortFromCaller = (): void => {
      abortCoordinator.abort('caller', context.signal.reason);
    };
    if (context.signal.aborted) {
      abortFromCaller();
    } else {
      context.signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    const deadline = setTimeout(() => {
      abortCoordinator.abort(
        'deadline',
        new Error('Repository evidence deadline reached.'),
      );
    }, limits.timeoutMs);
    deadline.unref();

    let repositoryRoot = request.repoPath;
    try {
      repositoryRoot = await this.reader.resolveRoot(
        request.repoPath,
        abortCoordinator.signal,
      );
      if (abortCoordinator.signal.aborted) {
        return this.terminalSuccess(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortCoordinator.source,
            limits,
          ),
          projectionExecution,
        );
      }

      const codegraph = this.backends.find(
        (backend) => backend.id === 'codegraph',
      );
      const ripgrep = this.backends.find((backend) => backend.id === 'ripgrep');
      if (codegraph === undefined && ripgrep === undefined) {
        return this.terminalSuccess(
          this.backendUnavailableResult(repositoryRoot, normalizedTerms),
          projectionExecution,
        );
      }

      const maximumHits =
        limits.maxFiles * Math.max(1, limits.maxConfirmed + limits.maxCandidates);
      const backendRequest = Object.freeze({
        repositoryRoot,
        terms: normalizedTerms,
        anchors,
        negativeTerms,
        layers: request.layers ?? [],
        maxHits: maximumHits,
      });
      let codegraphResult: BackendSearchResult | undefined;
      let ripgrepResult: BackendSearchResult | undefined;
      let skipFallback = false;
      let fallbackChecked = false;

      if (codegraph !== undefined) {
        codegraphResult = await codegraph.search(
          backendRequest,
          abortCoordinator.signal,
        );
        if (abortCoordinator.signal.aborted) {
          return this.terminalSuccess(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortCoordinator.source,
            limits,
            {
              attempts: [
                attemptFor(
                  'codegraph',
                  codegraphResult.health,
                  codegraphResult.hits.length,
                ),
              ],
              codeGraphHealth: codegraphResult.health,
            },
          ),
          projectionExecution,
        );
        }
        if (
          codegraphResult.health.state === 'available' &&
          codegraphResult.complete &&
          codegraphResult.canSkipFallbackIfVerified === true &&
          codegraphResult.hits.length > 0
        ) {
          const primarySelection = selectBackendHits(
            [codegraphResult],
            limits.maxFiles,
          );
          const primaryMerged = await verifyAndMergeBackendHits({
            repositoryRoot,
            hits: primarySelection.hits,
            terms: termsForVerification,
            reader: this.reader,
            limits: {
              maxFileBytes: DEFAULT_MAX_FILE_BYTES,
              maxExcerptBytes: CLASSIFICATION_MAX_BYTES,
              maxExcerptLines: CLASSIFICATION_MAX_LINES,
            },
            maxMatchesPerHit: Math.max(
              1,
              limits.maxConfirmed + limits.maxCandidates,
            ),
            signal: abortCoordinator.signal,
          });
          const primaryClassified = classifyDiscoveryRecords(
            primaryMerged.records,
            {
              anchors,
              layers: request.layers ?? [],
              negativeTerms,
              primaryAttempted: true,
            },
            {
              ...(primaryMerged.duplicateLocations > 0
                ? { DUPLICATE_LOCATION: primaryMerged.duplicateLocations }
                : {}),
              ...(primaryMerged.unverifiedLocations > 0
                ? { UNVERIFIED_FILE_CONTENT: primaryMerged.unverifiedLocations }
                : {}),
            },
          );
          if (abortCoordinator.signal.aborted) {
            const primaryConfirmed = selectConfirmedBudget(
              primaryClassified.confirmed,
              limits.maxConfirmed,
            );
            const primaryCandidates = selectCandidateBudget(
              primaryClassified.candidates,
              limits.maxCandidates,
            );
            const timeoutLimits: LimitReasonCode[] = ['TIMEOUT_REACHED'];
            if (primarySelection.filesTruncated) {
              timeoutLimits.push('MAX_FILES_REACHED');
            }
            for (const failure of primaryMerged.failures) {
              if (failure.code === 'MAX_FILE_BYTES_REACHED') {
                timeoutLimits.push('MAX_FILE_BYTES_REACHED');
              }
              if (failure.code === 'MAX_EXCERPT_BYTES_REACHED') {
                timeoutLimits.push('MAX_EXCERPT_BYTES_REACHED');
              }
            }
            if (primaryConfirmed.truncated) {
              timeoutLimits.push('MAX_CONFIRMED_REACHED');
            }
            if (primaryCandidates.truncated) {
              timeoutLimits.push('MAX_CANDIDATES_REACHED');
            }
            return this.terminalSuccess(
          this.timeoutResult(
              repositoryRoot,
              normalizedTerms,
              abortCoordinator.source,
              limits,
              {
                attempts: [
                  attemptFor(
                    'codegraph',
                    codegraphResult.health,
                    codegraphResult.hits.length,
                  ),
                ],
                codeGraphHealth: codegraphResult.health,
                confirmed: primaryConfirmed.selected,
                candidates: primaryCandidates.selected,
                limitsReached: uniqueSchemaOrder(timeoutLimits, LIMIT_REASON_CODES),
                exclusionSummary: primaryClassified.exclusionSummary,
              },
            ),
          projectionExecution,
        );
          }
          skipFallback =
            !primarySelection.filesTruncated &&
            !primaryMerged.aborted &&
            primaryMerged.unverifiedLocations === 0 &&
            primaryMerged.failures.length === 0 &&
            primaryClassified.confirmed.some(
              (evidence) =>
                evidence.reasonCodes.includes('EXACT_SYMBOL_ANCHOR') &&
                (evidence.role === 'definition' ||
                  evidence.role === 'execution-site'),
            );
        }
        if (abortCoordinator.signal.aborted) {
          return this.terminalSuccess(
          this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            abortCoordinator.source,
            limits,
            {
              attempts: [
                attemptFor(
                  'codegraph',
                  codegraphResult.health,
                  codegraphResult.hits.length,
                ),
              ],
              codeGraphHealth: codegraphResult.health,
            },
          ),
          projectionExecution,
        );
        }
      }

      if (!skipFallback && ripgrep !== undefined) {
        fallbackChecked = codegraphResult !== undefined;
        ripgrepResult = await ripgrep.search(
          backendRequest,
          abortCoordinator.signal,
        );
      }

      const backendResults = [codegraphResult, ripgrepResult].filter(
        (result): result is BackendSearchResult => result !== undefined,
      );
      const selected = selectBackendHits(backendResults, limits.maxFiles);
      const filesTruncated = selected.filesTruncated;

      const merged = await verifyAndMergeBackendHits({
        repositoryRoot,
        hits: selected.hits,
        terms: termsForVerification,
        reader: this.reader,
        limits: {
          maxFileBytes: DEFAULT_MAX_FILE_BYTES,
          maxExcerptBytes: CLASSIFICATION_MAX_BYTES,
          maxExcerptLines: CLASSIFICATION_MAX_LINES,
        },
        maxMatchesPerHit: Math.max(1, limits.maxConfirmed + limits.maxCandidates),
        signal: abortCoordinator.signal,
      });
      const initialExclusions: Partial<Record<ExclusionReasonCode, number>> = {};
      if (merged.duplicateLocations > 0) {
        initialExclusions.DUPLICATE_LOCATION = merged.duplicateLocations;
      }
      if (merged.unverifiedLocations > 0) {
        initialExclusions.UNVERIFIED_FILE_CONTENT = merged.unverifiedLocations;
      }
      const classified = classifyDiscoveryRecords(
        merged.records,
        {
          anchors,
          layers: request.layers ?? [],
          negativeTerms,
          primaryAttempted: codegraphResult !== undefined,
        },
        initialExclusions,
      );
      const confirmedSelection = selectConfirmedBudget(
        classified.confirmed,
        limits.maxConfirmed,
      );
      const confirmed = confirmedSelection.selected;
      const existingCandidateSelection = selectCandidateBudget(
        classified.candidates,
        limits.maxCandidates,
      );
      const existingCandidates = existingCandidateSelection.selected;
      const retainedSeedKeys = new Set(
        [...confirmed, ...existingCandidates].map((evidence) =>
          createDiscoveryKey(evidence.location),
        ),
      );
      let candidateContextFileLimit = false;
      let candidateContextExcerptLimit = false;
      const candidateContexts: ReturnType<
        typeof createVerifiedCandidateContext
      >[] = [];
      for (const record of merged.records.filter((candidate) =>
        retainedSeedKeys.has(candidate.discoveryKey),
      )) {
        try {
          const window = await this.reader.readWindow(
            repositoryRoot,
            record.location.file,
            record.focusLines,
            {
              maxFileBytes: DEFAULT_MAX_FILE_BYTES,
              maxExcerptBytes: CLASSIFICATION_MAX_BYTES,
              maxExcerptLines: CLASSIFICATION_MAX_LINES,
            },
            abortCoordinator.signal,
          );
          candidateContexts.push(createVerifiedCandidateContext(record, window));
        } catch (error: unknown) {
          if (!(error instanceof RepositoryAccessError)) {
            throw error;
          }
          if (error.code === 'ABORTED') {
            break;
          }
          if (error.code === 'MAX_FILE_BYTES_REACHED') {
            candidateContextFileLimit = true;
            continue;
          }
          if (error.code === 'MAX_EXCERPT_BYTES_REACHED') {
            candidateContextExcerptLimit = true;
            continue;
          }
          throw error;
        }
      }
      const candidatePolicy = applyCandidatePolicy({
        records: merged.records,
        contexts: candidateContexts,
        maxCandidates: Math.max(
          0,
          limits.maxCandidates - existingCandidates.length,
        ),
        signal: abortCoordinator.signal,
      });
      const candidateSelection = selectCandidateBudget(
        [
          ...existingCandidates,
          ...candidatePolicy.candidates.map(materializeCandidateDraft),
        ],
        limits.maxCandidates,
      );
      const candidates = candidateSelection.selected;
      const confirmedKeys = new Set(
        confirmed.map((evidence) => createDiscoveryKey(evidence.location)),
      );
      if (
        candidates.some((evidence) =>
          confirmedKeys.has(createDiscoveryKey(evidence.location)),
        )
      ) {
        throw new Error(
          'Candidate policy violated discovery-key mutual exclusion.',
        );
      }
      const confirmedTruncated = confirmedSelection.truncated;
      const candidatesTruncated =
        existingCandidateSelection.truncated ||
        candidatePolicy.truncated ||
        candidateSelection.truncated;

      const strategyComplete = skipFallback
        ? codegraphResult?.health.state === 'available' &&
          codegraphResult.complete
        : ripgrepResult?.health.state === 'available' && ripgrepResult.complete;
      const finalBackendResult = ripgrepResult ?? codegraphResult;
      const limitReasons: LimitReasonCode[] = [];
      if (filesTruncated) {
        limitReasons.push('MAX_FILES_REACHED');
      }
      for (const failure of merged.failures) {
        if (failure.code === 'MAX_FILE_BYTES_REACHED') {
          limitReasons.push('MAX_FILE_BYTES_REACHED');
        }
        if (failure.code === 'MAX_EXCERPT_BYTES_REACHED') {
          limitReasons.push('MAX_EXCERPT_BYTES_REACHED');
        }
      }
      if (candidateContextFileLimit) {
        limitReasons.push('MAX_FILE_BYTES_REACHED');
      }
      if (candidateContextExcerptLimit) {
        limitReasons.push('MAX_EXCERPT_BYTES_REACHED');
      }
      if (confirmedTruncated) {
        limitReasons.push('MAX_CONFIRMED_REACHED');
      }
      if (candidatesTruncated) {
        limitReasons.push('MAX_CANDIDATES_REACHED');
      }
      if (
        abortCoordinator.source !== 'none' ||
        merged.aborted ||
        abortCoordinator.signal.aborted
      ) {
        limitReasons.push('TIMEOUT_REACHED');
      }
      const limitsReached = uniqueSchemaOrder(limitReasons, LIMIT_REASON_CODES);
      const finalHealth = finalBackendResult?.health ?? {
        state: 'unavailable' as const,
        reasonCode: 'RIPGREP_UNAVAILABLE' as const,
      };
      const status = evaluateLocateStatus({
        abortSource: abortCoordinator.source,
        finalBackendHealth: finalHealth,
        strategyComplete: strategyComplete === true,
        evidenceCount: confirmed.length + candidates.length,
        limitsReached,
      }).status;
      const nextActions = createNextActions({
        status,
        hasCandidates: candidates.length > 0,
        limitsReached,
        abortSource: abortCoordinator.source,
        limits,
        initializeCodeGraph: codegraphResult?.health.state === 'missing',
      });
      const attempts = Object.freeze([
        ...(codegraphResult === undefined
          ? []
          : [
              attemptFor(
                'codegraph',
                codegraphResult.health,
                codegraphResult.hits.length,
              ),
            ]),
        ...(ripgrepResult === undefined
          ? []
          : [
              attemptFor(
                'ripgrep',
                ripgrepResult.health,
                ripgrepResult.hits.length,
              ),
            ]),
      ]);
      return this.terminalSuccess(
          redactLocateResult({
        ok: true,
        evidence: {
          schemaVersion: '1.0',
          status,
          repositoryRoot,
          normalizedTerms,
          confirmed,
          candidates,
          coverage: {
            backends: attempts,
            fallbackChecked,
            indexState: indexStateFor(codegraphResult?.health),
            indexFreshness: indexFreshnessFor(codegraphResult?.health),
            limitsReached,
            exclusionSummary: classified.exclusionSummary,
          },
          nextActions,
        },
      }),
          projectionExecution,
        );
    } catch (error: unknown) {
      if (
        (error instanceof RepositoryAccessError && error.code === 'ABORTED') ||
        abortCoordinator.signal.aborted
      ) {
        return this.terminalSuccess(
          this.timeoutResult(
          repositoryRoot,
          normalizedTerms,
          abortCoordinator.source,
          limits,
        ),
          projectionExecution,
        );
      }
      return this.terminalFailure(decideToolError(error), projectionExecution);
    } finally {
      clearTimeout(deadline);
      context.signal.removeEventListener('abort', abortFromCaller);
    }
  }

  private timeoutResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
    abortSource: LocateAbortSource,
    limits: ResolvedLocateLimits,
    options: TimeoutResultOptions = {},
  ): LocateResult {
    const attempts = options.attempts ?? [
      {
        backend: 'ripgrep' as const,
        status: 'skipped' as const,
        reasonCode: 'BACKEND_ABORTED' as const,
        hitCount: 0,
      },
    ];
    const confirmed = options.confirmed ?? [];
    const candidates = options.candidates ?? [];
    const limitsReached = options.limitsReached ?? ['TIMEOUT_REACHED'];
    return redactLocateResult({
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'timeout',
        repositoryRoot,
        normalizedTerms,
        confirmed,
        candidates,
        coverage: {
          backends: attempts,
          fallbackChecked: options.fallbackChecked ?? false,
          indexState: indexStateFor(options.codeGraphHealth),
          indexFreshness: indexFreshnessFor(options.codeGraphHealth),
          limitsReached,
          exclusionSummary: options.exclusionSummary ?? {},
        },
        nextActions: createNextActions({
          status: 'timeout',
          hasCandidates: candidates.length > 0,
          limitsReached,
          abortSource,
          limits,
        }),
      },
    });
  }

  private backendUnavailableResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
  ): LocateResult {
    return {
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'backend_unavailable',
        repositoryRoot,
        normalizedTerms,
        confirmed: [],
        candidates: [],
        coverage: {
          backends: [
            {
              backend: 'ripgrep',
              status: 'unavailable',
              reasonCode: 'RIPGREP_UNAVAILABLE',
              hitCount: 0,
            },
          ],
          fallbackChecked: false,
          indexState: 'unknown',
          indexFreshness: 'not-applicable',
          limitsReached: [],
          exclusionSummary: {},
        },
        nextActions: [],
      },
    };
  }
}
