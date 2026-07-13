import { Inject, Injectable } from '@nestjs/common';

import {
  comparePublicEvidence,
  createDiscoveryKey,
  DEFAULT_MAX_FILE_BYTES,
  LIMIT_REASON_CODES,
  NEXT_ACTION_CODES,
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
  type LocateStatus,
  type NextActionCode,
  type NormalizedLocateAnchor,
  type NormalizedSearchTerm,
  type RepositoryEvidenceService,
  type RepositoryReader,
  type RepositorySearchBackend,
  type SearchBackendId,
} from '../contracts/index.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../runtime/tokens.js';
import {
  applyCandidatePolicy,
  createVerifiedCandidateContext,
  materializeCandidateDraft,
} from './candidate-policy.js';
import { classifyDiscoveryRecords } from './direct-mapping-classifier.js';
import { verifyAndMergeBackendHits } from './discovery-record.js';

const CLASSIFICATION_MAX_LINES = 12;
const CLASSIFICATION_MAX_BYTES = 4 * 1024;
const MAX_TIMEOUT_MS = 30_000;

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

function toolError(error: unknown): LocateResult {
  if (error instanceof RepositoryAccessError) {
    if (error.code === 'INVALID_REPOSITORY') {
      return {
        ok: false,
        error: {
          code: 'INVALID_REPOSITORY',
          message: error.message,
          recoverable: false,
        },
      };
    }
    if (
      error.code === 'PATH_OUTSIDE_ROOT' ||
      error.code === 'INVALID_RELATIVE_PATH'
    ) {
      return {
        ok: false,
        error: {
          code: 'PATH_OUTSIDE_ROOT',
          message: error.message,
          recoverable: false,
        },
      };
    }
  }
  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unexpected repository evidence failure.',
      recoverable: false,
    },
  };
}

@Injectable()
export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
  public constructor(
    @Inject(REPOSITORY_SEARCH_BACKENDS)
    private readonly backends: readonly RepositorySearchBackend[],
    @Inject(REPOSITORY_READER)
    private readonly reader: RepositoryReader,
  ) {}

  public async locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult> {
    const limits = resolveLocateLimits(request.limits);
    const mode = request.termCase ?? 'smart';
    const normalizedTerms = normalizeSearchTerms(request.terms, mode);
    const anchors = normalizeLocateAnchors(request.anchors ?? [], mode);
    const termsForVerification = verificationTerms(normalizedTerms, anchors);
    const negativeTerms = normalizeSearchTerms(request.negativeTerms ?? [], mode);
    const controller = new AbortController();
    let internalDeadlineReached = false;
    const abortFromCaller = (): void => controller.abort(context.signal.reason);
    if (context.signal.aborted) {
      abortFromCaller();
    } else {
      context.signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    const deadline = setTimeout(() => {
      internalDeadlineReached = true;
      controller.abort(new Error('Repository evidence deadline reached.'));
    }, limits.timeoutMs);
    deadline.unref();

    let repositoryRoot = request.repoPath;
    try {
      repositoryRoot = await this.reader.resolveRoot(
        request.repoPath,
        controller.signal,
      );
      if (controller.signal.aborted) {
        return this.timeoutResult(
          repositoryRoot,
          normalizedTerms,
          context.signal.aborted,
          limits.timeoutMs,
        );
      }

      const codegraph = this.backends.find(
        (backend) => backend.id === 'codegraph',
      );
      const ripgrep = this.backends.find((backend) => backend.id === 'ripgrep');
      if (codegraph === undefined && ripgrep === undefined) {
        return this.backendUnavailableResult(repositoryRoot, normalizedTerms);
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
          controller.signal,
        );
        if (controller.signal.aborted) {
          return this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            context.signal.aborted,
            limits.timeoutMs,
            [attemptFor('codegraph', codegraphResult.health, codegraphResult.hits.length)],
            codegraphResult.health,
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
            signal: controller.signal,
          });
          const primaryClassified = classifyDiscoveryRecords(
            primaryMerged.records,
            {
              anchors,
              layers: request.layers ?? [],
              negativeTerms,
              primaryAttempted: true,
            },
          );
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
        if (controller.signal.aborted) {
          return this.timeoutResult(
            repositoryRoot,
            normalizedTerms,
            context.signal.aborted,
            limits.timeoutMs,
            [attemptFor('codegraph', codegraphResult.health, codegraphResult.hits.length)],
            codegraphResult.health,
          );
        }
      }

      if (!skipFallback && ripgrep !== undefined) {
        fallbackChecked = codegraphResult !== undefined;
        ripgrepResult = await ripgrep.search(
          backendRequest,
          controller.signal,
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
        signal: controller.signal,
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
      const confirmed = Object.freeze(
        classified.confirmed.slice(0, limits.maxConfirmed),
      );
      const existingCandidates = classified.candidates.slice(
        0,
        limits.maxCandidates,
      );
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
            controller.signal,
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
        signal: controller.signal,
      });
      const candidates = Object.freeze(
        [
          ...existingCandidates,
          ...candidatePolicy.candidates.map(materializeCandidateDraft),
        ].sort(comparePublicEvidence),
      );
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
      const confirmedTruncated =
        classified.confirmed.length > limits.maxConfirmed;
      const candidatesTruncated =
        classified.candidates.length > limits.maxCandidates ||
        candidatePolicy.truncated;

      const strategyComplete = skipFallback
        ? codegraphResult?.health.state === 'available' &&
          codegraphResult.complete
        : ripgrepResult?.health.state === 'available' && ripgrepResult.complete;
      const finalBackendResult = ripgrepResult ?? codegraphResult;
      const limitReasons: LimitReasonCode[] = [];
      if (
        filesTruncated ||
        (strategyComplete !== true &&
          finalBackendResult?.health.state === 'available' &&
          finalBackendResult.complete === false)
      ) {
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
        internalDeadlineReached ||
        merged.aborted ||
        context.signal.aborted ||
        (ripgrepResult?.health.reasonCode === 'BACKEND_ABORTED' &&
          strategyComplete !== true)
      ) {
        limitReasons.push('TIMEOUT_REACHED');
      }
      const limitsReached = uniqueSchemaOrder(limitReasons, LIMIT_REASON_CODES);
      const finalHealth = finalBackendResult?.health ?? {
        state: 'unavailable' as const,
        reasonCode: 'RIPGREP_UNAVAILABLE' as const,
      };
      const status = this.statusFor(
        finalHealth,
        strategyComplete === true,
        confirmed.length + candidates.length,
        limitsReached,
        context.signal.aborted,
      );
      const nextActions = this.nextActionsFor(
        status,
        candidates.length > 0,
        filesTruncated ||
          (strategyComplete !== true &&
            finalBackendResult?.health.state === 'available') ||
          confirmedTruncated ||
          candidatesTruncated,
        context.signal.aborted,
        limits.timeoutMs,
        codegraphResult?.health.state === 'missing',
      );
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

      return {
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
      };
    } catch (error: unknown) {
      if (
        (error instanceof RepositoryAccessError && error.code === 'ABORTED') ||
        controller.signal.aborted
      ) {
        return this.timeoutResult(
          repositoryRoot,
          normalizedTerms,
          context.signal.aborted,
          limits.timeoutMs,
        );
      }
      return toolError(error);
    } finally {
      clearTimeout(deadline);
      context.signal.removeEventListener('abort', abortFromCaller);
    }
  }

  private statusFor(
    health: BackendHealth,
    complete: boolean,
    evidenceCount: number,
    limitsReached: readonly LimitReasonCode[],
    callerAborted: boolean,
  ): LocateStatus {
    if (
      callerAborted ||
      health.reasonCode === 'BACKEND_ABORTED' ||
      limitsReached.includes('TIMEOUT_REACHED')
    ) {
      return 'timeout';
    }
    if (health.state !== 'available') {
      return evidenceCount > 0 ? 'partial' : 'backend_unavailable';
    }
    if (!complete || limitsReached.length > 0) {
      return 'partial';
    }
    return evidenceCount > 0 ? 'ok' : 'no_result';
  }

  private nextActionsFor(
    status: LocateStatus,
    hasCandidates: boolean,
    retryableLimitReached: boolean,
    callerAborted: boolean,
    timeoutMs: number,
    initializeCodeGraph = false,
  ): readonly NextActionCode[] {
    const actions: NextActionCode[] = [];
    if (status === 'no_result') {
      actions.push('ADD_TERM', 'ADD_SYMBOL_ANCHOR');
    }
    if (hasCandidates) {
      actions.push('CONFIRM_CANDIDATE');
    }
    if (
      initializeCodeGraph &&
      (status === 'no_result' || status === 'backend_unavailable')
    ) {
      actions.push('INITIALIZE_CODEGRAPH');
    }
    if (
      (status === 'partial' && retryableLimitReached) ||
      (status === 'timeout' && !callerAborted && timeoutMs < MAX_TIMEOUT_MS)
    ) {
      actions.push('RETRY_WITH_HIGHER_LIMIT');
    }
    return uniqueSchemaOrder(actions, NEXT_ACTION_CODES);
  }

  private timeoutResult(
    repositoryRoot: string,
    normalizedTerms: ReturnType<typeof normalizeSearchTerms>,
    callerAborted: boolean,
    timeoutMs: number,
    attempts: readonly BackendAttempt[] = [
      {
        backend: 'ripgrep',
        status: 'skipped',
        reasonCode: 'BACKEND_ABORTED',
        hitCount: 0,
      },
    ],
    codeGraphHealth?: BackendHealth,
  ): LocateResult {
    return {
      ok: true,
      evidence: {
        schemaVersion: '1.0',
        status: 'timeout',
        repositoryRoot,
        normalizedTerms,
        confirmed: [],
        candidates: [],
        coverage: {
          backends: attempts,
          fallbackChecked: false,
          indexState: indexStateFor(codeGraphHealth),
          indexFreshness: indexFreshnessFor(codeGraphHealth),
          limitsReached: ['TIMEOUT_REACHED'],
          exclusionSummary: {},
        },
        nextActions: this.nextActionsFor(
          'timeout',
          false,
          false,
          callerAborted,
          timeoutMs,
        ),
      },
    };
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
