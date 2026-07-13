import { Inject, Injectable } from '@nestjs/common';

import {
  DEFAULT_MAX_FILE_BYTES,
  LIMIT_REASON_CODES,
  NEXT_ACTION_CODES,
  normalizeLocateAnchors,
  normalizeSearchTerms,
  RepositoryAccessError,
  resolveLocateLimits,
  type BackendAttempt,
  type BackendHealth,
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
} from '../contracts/index.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../runtime/tokens.js';
import { classifyDiscoveryRecords } from './direct-mapping-classifier.js';
import { verifyAndMergeBackendHits } from './discovery-record.js';

const CLASSIFICATION_MAX_LINES = 12;
const CLASSIFICATION_MAX_BYTES = 4 * 1024;
const MAX_TIMEOUT_MS = 30_000;

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
    backend: 'ripgrep',
    status,
    hitCount,
    ...(health.reasonCode === undefined ? {} : { reasonCode: health.reasonCode }),
  });
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

      const ripgrep = this.backends.find((backend) => backend.id === 'ripgrep');
      if (ripgrep === undefined) {
        return this.backendUnavailableResult(repositoryRoot, normalizedTerms);
      }
      const maximumHits =
        limits.maxFiles * Math.max(1, limits.maxConfirmed + limits.maxCandidates);
      const backendResult = await ripgrep.search(
        {
          repositoryRoot,
          terms: normalizedTerms,
          anchors,
          negativeTerms,
          maxHits: maximumHits,
        },
        controller.signal,
      );

      const selectedHits = [] as typeof backendResult.hits[number][];
      const selectedFiles = new Set<string>();
      let filesTruncated = false;
      for (const hit of backendResult.hits) {
        if (!selectedFiles.has(hit.file) && selectedFiles.size >= limits.maxFiles) {
          filesTruncated = true;
          continue;
        }
        selectedFiles.add(hit.file);
        selectedHits.push(hit);
      }

      const merged = await verifyAndMergeBackendHits({
        repositoryRoot,
        hits: selectedHits,
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
        },
        initialExclusions,
      );

      const limitReasons: LimitReasonCode[] = [];
      if (
        filesTruncated ||
        (backendResult.health.state === 'available' && !backendResult.complete)
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
      if (classified.confirmed.length > limits.maxConfirmed) {
        limitReasons.push('MAX_CONFIRMED_REACHED');
      }
      if (classified.candidates.length > limits.maxCandidates) {
        limitReasons.push('MAX_CANDIDATES_REACHED');
      }
      if (
        internalDeadlineReached ||
        merged.aborted ||
        context.signal.aborted ||
        backendResult.health.reasonCode === 'BACKEND_ABORTED'
      ) {
        limitReasons.push('TIMEOUT_REACHED');
      }
      const limitsReached = uniqueSchemaOrder(limitReasons, LIMIT_REASON_CODES);
      const confirmed = Object.freeze(
        classified.confirmed.slice(0, limits.maxConfirmed),
      );
      const candidates = Object.freeze(
        classified.candidates.slice(0, limits.maxCandidates),
      );
      const status = this.statusFor(
        backendResult.health,
        backendResult.complete,
        confirmed.length + candidates.length,
        limitsReached,
        context.signal.aborted,
      );
      const nextActions = this.nextActionsFor(
        status,
        candidates.length > 0,
        filesTruncated ||
          (backendResult.health.state === 'available' &&
            !backendResult.complete) ||
          classified.confirmed.length > limits.maxConfirmed ||
          classified.candidates.length > limits.maxCandidates,
        context.signal.aborted,
        limits.timeoutMs,
      );

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
            backends: [attemptFor(backendResult.health, backendResult.hits.length)],
            fallbackChecked: false,
            indexState: 'unknown',
            indexFreshness: 'not-applicable',
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
  ): readonly NextActionCode[] {
    const actions: NextActionCode[] = [];
    if (status === 'no_result') {
      actions.push('ADD_TERM', 'ADD_SYMBOL_ANCHOR');
    }
    if (hasCandidates) {
      actions.push('CONFIRM_CANDIDATE');
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
          backends: [
            {
              backend: 'ripgrep',
              status: 'skipped',
              reasonCode: 'BACKEND_ABORTED',
              hitCount: 0,
            },
          ],
          fallbackChecked: false,
          indexState: 'unknown',
          indexFreshness: 'not-applicable',
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
